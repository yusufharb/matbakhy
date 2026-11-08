package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/auth"
	"github.com/marketplace/core/internal/modules/catalog"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/config"
	"github.com/marketplace/core/internal/modules/inventory"
	"github.com/marketplace/core/internal/modules/invoice"
	"github.com/marketplace/core/internal/modules/kitchen"
	"github.com/marketplace/core/internal/modules/order"
	"github.com/marketplace/core/internal/modules/payment"
	"github.com/marketplace/core/internal/modules/platform"
	"github.com/marketplace/core/internal/modules/storage"
	"github.com/marketplace/core/internal/modules/wallet"
	"github.com/marketplace/core/internal/worker"
)

// wrap chains multiple middlewares onto an http.HandlerFunc
func wrap(h http.HandlerFunc, middlewares ...func(http.Handler) http.Handler) http.HandlerFunc {
	var handler http.Handler = h
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return func(w http.ResponseWriter, r *http.Request) {
		handler.ServeHTTP(w, r)
	}
}

func main() {
	// 1. Load environment files (.env)
	loadEnvFiles(".env", "backend/.env", "../.env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 2. Fail-fast validation of JWT_SECRET
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("FATAL: JWT_SECRET environment variable is missing or empty. Please set JWT_SECRET with at least 32 characters.")
	}
	if err := auth.SetJWTSecret(jwtSecret); err != nil {
		log.Fatalf("FATAL: %v", err)
	}
	log.Println("[Security] JWT secret initialized and validated successfully (>= 32 characters)")

	ctx := context.Background()

	// 3. Connect to PostgreSQL
	db, err := database.Connect(ctx)
	if err != nil {
		log.Fatalf("Fatal: Database initialization failed: %v", err)
	}
	defer db.Close()

	// 4. Initialize Repositories
	authRepo := auth.NewRepository(db.Pool)
	catalogRepo := catalog.NewRepository(db.Pool)
	commissionRepo := commission.NewRepository(db.Pool)
	inventoryRepo := inventory.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commissionRepo)
	walletRepo := wallet.NewRepository(db.Pool)
	configRepo := config.NewRepository(db.Pool)
	idemStore := platform.NewIdempotencyStore(db.Pool)
	payRepo := payment.NewRepository(db.Pool)

	var gateway payment.PaymentGateway
	if os.Getenv("STRIPE_SECRET_KEY") != "" {
		gateway = payment.NewStripeGateway(os.Getenv("STRIPE_SECRET_KEY"), os.Getenv("STRIPE_WEBHOOK_SECRET"))
	} else {
		gateway = payment.NewMockGateway(os.Getenv("GATEWAY_WEBHOOK_SECRET"), os.Getenv("APP_URL"))
	}

	storageSvc := storage.NewService(storage.Config{
		Endpoint:        os.Getenv("STORAGE_ENDPOINT"),
		Region:          os.Getenv("STORAGE_REGION"),
		AccessKeyID:     os.Getenv("STORAGE_ACCESS_KEY"),
		SecretAccessKey: os.Getenv("STORAGE_SECRET_KEY"),
		PublicBaseURL:   os.Getenv("STORAGE_PUBLIC_URL"),
	})

	invGen := invoice.NewGenerator(db.Pool)
	invHandler := invoice.NewHandler(invGen)

	// Start Background Asynchronous Outbox Worker
	outboxWorker := worker.NewOutboxWorker(db.Pool, invGen, 3*time.Second)
	outboxWorker.Start(ctx)

	// 5. Initialize HTTP Handlers
	authHandler := auth.NewHandler(authRepo)
	catalogHandler := catalog.NewHandler(catalogRepo)
	commissionHandler := commission.NewHandler(commissionRepo)
	inventoryHandler := inventory.NewHandler(inventoryRepo)
	orderHandler := order.NewHandler(orderRepo, idemStore)
	walletHandler := wallet.NewHandler(walletRepo, idemStore)
	configHandler := config.NewHandler(configRepo)
	payHandler := payment.NewHandler(payRepo, gateway)
	storageHandler := storage.NewHandler(storageSvc)
	kitchenRepo := kitchen.NewRepository(db.Pool)
	kitchenHandler := kitchen.NewHandler(kitchenRepo)

	// Middlewares
	authOnly := auth.RequireAuth
	adminOnly := auth.RequireRole("platform_admin", "super_admin", "finance_admin", "finance")
	supplierOrAdmin := auth.RequireRole("supplier_admin", "supplier", "supplier_staff", "platform_admin", "super_admin")

	mux := http.NewServeMux()

	// CORS Middleware with Production Origin Whitelisting
	allowedOriginsEnv := os.Getenv("CORS_ALLOWED_ORIGINS")
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowedOriginsEnv == "" || allowedOriginsEnv == "*" {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else {
				allowed := false
				for _, o := range strings.Split(allowedOriginsEnv, ",") {
					if strings.TrimSpace(o) == origin {
						allowed = true
						break
					}
				}
				if allowed {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				}
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Idempotency-Key")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	// --------------------------------------------------------------------------
	// Public Endpoints
	// --------------------------------------------------------------------------

	// Root Welcome Probe
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"system":    "Matbakhy - Egyptian Home Food Marketplace API (مطبخي)",
			"status":    "online",
			"currency":  "EGP",
			"database":  "PostgreSQL 16 (marketplace_matbakhy)",
			"health":    "/health",
			"api_base":  "/api/v1/",
			"endpoints": []string{
				"/api/v1/kitchens",
				"/api/v1/products",
				"/api/v1/orders",
				"/api/v1/ledger/entries",
				"/api/v1/admin/suppliers",
				"/api/v1/inventory/stock",
				"/api/v1/commission/rules",
				"/api/v1/cms/sections",
				"/api/v1/config/features",
			},
		})
	})

	// Health Probe
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":    "healthy",
			"system":    "Matbakhy Core API (مطبخي)",
			"version":   "1.0.0",
			"currency":  "EGP",
			"database":  "PostgreSQL 16 (Connected)",
			"timestamp": time.Now().UTC(),
		})
	})

	// Auth & Identity (Public)
	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/v1/auth/register-customer", authHandler.RegisterCustomer)
	mux.HandleFunc("POST /api/v1/auth/refresh", authHandler.RefreshToken)

	// Matbakhy Kitchens (Public Read)
	mux.HandleFunc("GET /api/v1/kitchens", kitchenHandler.ListKitchens)
	mux.HandleFunc("GET /api/v1/kitchens/{id}", kitchenHandler.GetKitchen)

	// Catalog (Public Read)
	mux.HandleFunc("GET /api/v1/products", catalogHandler.ListProducts)
	mux.HandleFunc("GET /api/v1/products/{id}", catalogHandler.GetProduct)
	mux.HandleFunc("GET /api/v1/products/{id}/offers", catalogHandler.ListProductOffers)

	// Commission Public Read
	mux.HandleFunc("GET /api/v1/commission/rules", commissionHandler.ListRules)
	mux.HandleFunc("GET /api/v1/commission/resolve", commissionHandler.Resolve)

	// CMS & Config Public Read
	mux.HandleFunc("GET /api/v1/cms/sections", configHandler.ListCMSSections)
	mux.HandleFunc("GET /api/v1/config/features", configHandler.GetFeatures)

	// Payments (Public Webhook)
	mux.HandleFunc("POST /api/v1/payments/webhook", payHandler.HandleWebhook)

	// --------------------------------------------------------------------------
	// Protected Endpoints
	// --------------------------------------------------------------------------

	// Authenticated User Session & Contexts
	mux.HandleFunc("GET /api/v1/auth/me", wrap(authHandler.Me, authOnly))
	mux.HandleFunc("GET /api/v1/auth/me/contexts", wrap(authHandler.GetMeContexts, authOnly))
	mux.HandleFunc("POST /api/v1/auth/switch-context", wrap(authHandler.SwitchContext, authOnly))

	// Cloud Object Storage (Presigned Uploads for Media & KYC Documents)
	mux.HandleFunc("POST /api/v1/storage/upload-url", wrap(storageHandler.RequestUploadURL, authOnly))

	// Orders & Checkout (Authenticated users / merchants / customers)
	mux.HandleFunc("POST /api/v1/checkout", wrap(orderHandler.Checkout, authOnly))
	mux.HandleFunc("GET /api/v1/orders", wrap(orderHandler.ListOrders, authOnly))
	mux.HandleFunc("GET /api/v1/payments/{order_id}", wrap(payHandler.GetPaymentStatus, authOnly))

	// Tax Invoices (B2B & B2C Compliant)
	mux.HandleFunc("GET /api/v1/invoices/order/{order_id}", wrap(invHandler.GetInvoiceByOrderID, authOnly))
	mux.HandleFunc("POST /api/v1/invoices/order/{order_id}/generate", wrap(invHandler.GenerateInvoice, authOnly))

	// Customer Personal Logistics & Wallet (B2C)
	mux.HandleFunc("GET /api/v1/customer/addresses", wrap(orderHandler.ListCustomerAddresses, authOnly))
	mux.HandleFunc("POST /api/v1/customer/addresses", wrap(orderHandler.CreateCustomerAddress, authOnly))
	mux.HandleFunc("DELETE /api/v1/customer/addresses/{id}", wrap(orderHandler.DeleteCustomerAddress, authOnly))
	mux.HandleFunc("GET /api/v1/customer/wallet", wrap(walletHandler.GetCustomerWallet, authOnly))
	mux.HandleFunc("POST /api/v1/customer/wallet/topup", wrap(walletHandler.TopUpCustomerWallet, authOnly))

	// Merchant Commercial Logistics & Wallet (B2B)
	mux.HandleFunc("GET /api/v1/merchant/warehouses", wrap(orderHandler.ListMerchantWarehouses, authOnly))
	mux.HandleFunc("POST /api/v1/merchant/warehouses", wrap(orderHandler.CreateMerchantWarehouse, authOnly))
	mux.HandleFunc("DELETE /api/v1/merchant/warehouses/{id}", wrap(orderHandler.DeleteMerchantWarehouse, authOnly))
	mux.HandleFunc("GET /api/v1/merchant/wallet", wrap(walletHandler.GetMerchantWallet, authOnly))
	mux.HandleFunc("POST /api/v1/merchant/wallet/topup", wrap(walletHandler.TopUpMerchantWallet, authOnly))
	mux.HandleFunc("GET /api/v1/merchant/kyc/documents", wrap(authHandler.ListKYCDocuments, authOnly))
	mux.HandleFunc("POST /api/v1/merchant/kyc/documents", wrap(authHandler.SubmitKYCDocument, authOnly))
	mux.HandleFunc("GET /api/v1/merchant/team", wrap(authHandler.ListTeamMembers, authOnly))
	mux.HandleFunc("POST /api/v1/merchant/team/invite", wrap(authHandler.InviteTeamMember, authOnly))

	// Platform Administration (Super Admin / Platform Admin only)
	mux.HandleFunc("GET /api/v1/admin/suppliers", wrap(authHandler.ListSuppliers, adminOnly))
	mux.HandleFunc("POST /api/v1/admin/suppliers/{id}/approve", wrap(authHandler.ApproveSupplier, adminOnly))
	mux.HandleFunc("POST /api/v1/admin/suppliers/{id}/reject", wrap(authHandler.RejectSupplier, adminOnly))
	mux.HandleFunc("POST /api/v1/admin/kyc/documents/{id}/review", wrap(authHandler.ReviewKYCDocument, adminOnly))
	mux.HandleFunc("GET /api/v1/admin/audit-logs", wrap(configHandler.ListAuditLogs, adminOnly))
	mux.HandleFunc("PUT /api/v1/cms/sections/{id}", wrap(configHandler.UpdateCMSSection, adminOnly))
	mux.HandleFunc("GET /api/v1/ledger/entries", wrap(walletHandler.ListJournalEntries, adminOnly))
	mux.HandleFunc("POST /api/v1/ledger/entries", wrap(walletHandler.PostJournalEntry, adminOnly))
	mux.HandleFunc("GET /api/v1/ledger/verify-chain", wrap(walletHandler.VerifyLedgerChain, adminOnly))
	mux.HandleFunc("POST /api/v1/admin/payouts/{id}/approve", wrap(walletHandler.ApprovePayout, adminOnly))
	mux.HandleFunc("POST /api/v1/admin/payouts/{id}/reject", wrap(walletHandler.RejectPayout, adminOnly))

	// Supplier / Cook Portal APIs (Supplier or Admin)
	mux.HandleFunc("GET /api/v1/supplier/offers", wrap(catalogHandler.ListSupplierOffers, supplierOrAdmin))
	mux.HandleFunc("POST /api/v1/supplier/offers", wrap(catalogHandler.SaveOffer, supplierOrAdmin))
	mux.HandleFunc("GET /api/v1/supplier/suborders", wrap(orderHandler.ListSupplierSuborders, supplierOrAdmin))
	mux.HandleFunc("PATCH /api/v1/supplier/suborders/{id}/status", wrap(orderHandler.UpdateSuborderStatus, supplierOrAdmin))
	mux.HandleFunc("GET /api/v1/supplier/wallet", wrap(walletHandler.GetSupplierWallet, supplierOrAdmin))
	mux.HandleFunc("POST /api/v1/supplier/payouts", wrap(walletHandler.RequestPayout, supplierOrAdmin))

	// Matbakhy Cook Kitchen Portal APIs (Cook / Supplier or Admin)
	mux.HandleFunc("POST /api/v1/cook/kitchen/status", wrap(kitchenHandler.SetKitchenStatus, supplierOrAdmin))
	mux.HandleFunc("PATCH /api/v1/cook/suborders/{id}/prep-status", wrap(kitchenHandler.UpdateSuborderPrepStatus, supplierOrAdmin))

	// Inventory & Warehouses
	mux.HandleFunc("GET /api/v1/inventory/warehouses", wrap(inventoryHandler.ListWarehouses, authOnly))
	mux.HandleFunc("GET /api/v1/inventory/stock", wrap(inventoryHandler.ListStock, supplierOrAdmin))
	mux.HandleFunc("POST /api/v1/inventory/adjust", wrap(inventoryHandler.AdjustStock, supplierOrAdmin))

	// Ledger Accounts (Platform Admin & Finance only)
	mux.HandleFunc("GET /api/v1/ledger/accounts", wrap(walletHandler.ListAccounts, adminOnly))

	// Global Handler Pipeline: CORS -> Auth Context Extraction -> Router
	handler := corsMiddleware(auth.AuthMiddleware(mux))

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 20 * time.Second,
	}

	log.Printf("NEXUS Marketplace Core API listening on http://localhost:%s\n", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server shutdown with error: %v", err)
	}
}

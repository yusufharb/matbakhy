package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/auth"
	"github.com/marketplace/core/internal/modules/catalog"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/config"
	"github.com/marketplace/core/internal/modules/inventory"
	"github.com/marketplace/core/internal/modules/order"
	"github.com/marketplace/core/internal/modules/wallet"
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

	// 5. Initialize HTTP Handlers
	authHandler := auth.NewHandler(authRepo)
	catalogHandler := catalog.NewHandler(catalogRepo)
	commissionHandler := commission.NewHandler(commissionRepo)
	inventoryHandler := inventory.NewHandler(inventoryRepo)
	orderHandler := order.NewHandler(orderRepo)
	walletHandler := wallet.NewHandler(walletRepo)
	configHandler := config.NewHandler(configRepo)

	// Middlewares
	authOnly := auth.RequireAuth
	adminOnly := auth.RequireRole("platform_admin", "super_admin", "finance_admin", "finance")
	supplierOrAdmin := auth.RequireRole("supplier_admin", "supplier", "supplier_staff", "platform_admin", "super_admin")

	mux := http.NewServeMux()

	// CORS Middleware
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
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
			"system":    "NEXUS Marketplace Core API",
			"status":    "online",
			"database":  "PostgreSQL 16 (Connected)",
			"health":    "/health",
			"api_base":  "/api/v1/",
			"endpoints": []string{
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
			"system":    "NEXUS Marketplace Core API",
			"version":   "1.0.0",
			"database":  "PostgreSQL 16 (Connected)",
			"timestamp": time.Now().UTC(),
		})
	})

	// Auth & Identity (Public)
	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/v1/auth/refresh", authHandler.RefreshToken)

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

	// --------------------------------------------------------------------------
	// Protected Endpoints
	// --------------------------------------------------------------------------

	// Authenticated User Session
	mux.HandleFunc("GET /api/v1/auth/me", wrap(authHandler.Me, authOnly))

	// Orders & Checkout (Authenticated users / merchants)
	mux.HandleFunc("POST /api/v1/checkout", wrap(orderHandler.Checkout, authOnly))
	mux.HandleFunc("GET /api/v1/orders", wrap(orderHandler.ListOrders, authOnly))

	// Platform Administration (Super Admin / Platform Admin only)
	mux.HandleFunc("GET /api/v1/admin/suppliers", wrap(authHandler.ListSuppliers, adminOnly))
	mux.HandleFunc("POST /api/v1/admin/suppliers/{id}/approve", wrap(authHandler.ApproveSupplier, adminOnly))
	mux.HandleFunc("POST /api/v1/admin/suppliers/{id}/reject", wrap(authHandler.RejectSupplier, adminOnly))
	mux.HandleFunc("GET /api/v1/admin/audit-logs", wrap(configHandler.ListAuditLogs, adminOnly))
	mux.HandleFunc("PUT /api/v1/cms/sections/{id}", wrap(configHandler.UpdateCMSSection, adminOnly))
	mux.HandleFunc("GET /api/v1/ledger/entries", wrap(walletHandler.ListJournalEntries, adminOnly))
	mux.HandleFunc("POST /api/v1/ledger/entries", wrap(walletHandler.PostJournalEntry, adminOnly))

	// Supplier Portal APIs (Supplier or Admin)
	mux.HandleFunc("GET /api/v1/supplier/offers", wrap(catalogHandler.ListSupplierOffers, supplierOrAdmin))
	mux.HandleFunc("POST /api/v1/supplier/offers", wrap(catalogHandler.SaveOffer, supplierOrAdmin))
	mux.HandleFunc("GET /api/v1/supplier/suborders", wrap(orderHandler.ListSupplierSuborders, supplierOrAdmin))
	mux.HandleFunc("PATCH /api/v1/supplier/suborders/{id}/status", wrap(orderHandler.UpdateSuborderStatus, supplierOrAdmin))
	mux.HandleFunc("GET /api/v1/supplier/wallet", wrap(walletHandler.GetSupplierWallet, supplierOrAdmin))
	mux.HandleFunc("POST /api/v1/supplier/payouts", wrap(walletHandler.RequestPayout, supplierOrAdmin))

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

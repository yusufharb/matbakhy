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

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()

	// 1. Connect to PostgreSQL
	db, err := database.Connect(ctx)
	if err != nil {
		log.Fatalf("Fatal: Database initialization failed: %v", err)
	}
	defer db.Close()

	// 2. Initialize Repositories
	authRepo := auth.NewRepository(db.Pool)
	catalogRepo := catalog.NewRepository(db.Pool)
	commissionRepo := commission.NewRepository(db.Pool)
	inventoryRepo := inventory.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commissionRepo)
	walletRepo := wallet.NewRepository(db.Pool)
	configRepo := config.NewRepository(db.Pool)

	// 3. Initialize HTTP Handlers
	authHandler := auth.NewHandler(authRepo)
	catalogHandler := catalog.NewHandler(catalogRepo)
	commissionHandler := commission.NewHandler(commissionRepo)
	inventoryHandler := inventory.NewHandler(inventoryRepo)
	orderHandler := order.NewHandler(orderRepo)
	walletHandler := wallet.NewHandler(walletRepo)
	configHandler := config.NewHandler(configRepo)

	mux := http.NewServeMux()

	// CORS Middleware
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

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

	// Auth & Identity
	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("GET /api/v1/auth/me", authHandler.Me)

	// Admin Supplier KYC
	mux.HandleFunc("GET /api/v1/admin/suppliers", authHandler.ListSuppliers)
	mux.HandleFunc("POST /api/v1/admin/suppliers/{id}/approve", authHandler.ApproveSupplier)
	mux.HandleFunc("POST /api/v1/admin/suppliers/{id}/reject", authHandler.RejectSupplier)

	// Catalog & Multi-Supplier Offers
	mux.HandleFunc("GET /api/v1/products", catalogHandler.ListProducts)
	mux.HandleFunc("GET /api/v1/products/{id}", catalogHandler.GetProduct)
	mux.HandleFunc("GET /api/v1/products/{id}/offers", catalogHandler.ListProductOffers)
	mux.HandleFunc("GET /api/v1/supplier/offers", catalogHandler.ListSupplierOffers)
	mux.HandleFunc("POST /api/v1/supplier/offers", catalogHandler.SaveOffer)

	// Inventory & Warehouses
	mux.HandleFunc("GET /api/v1/inventory/warehouses", inventoryHandler.ListWarehouses)
	mux.HandleFunc("GET /api/v1/inventory/stock", inventoryHandler.ListStock)
	mux.HandleFunc("POST /api/v1/inventory/adjust", inventoryHandler.AdjustStock)

	// Orders & Multi-Vendor Checkout
	mux.HandleFunc("POST /api/v1/checkout", orderHandler.Checkout)
	mux.HandleFunc("GET /api/v1/orders", orderHandler.ListOrders)
	mux.HandleFunc("GET /api/v1/supplier/suborders", orderHandler.ListSupplierSuborders)
	mux.HandleFunc("PATCH /api/v1/supplier/suborders/{id}/status", orderHandler.UpdateSuborderStatus)

	// Double-Entry Ledger & Wallets
	mux.HandleFunc("GET /api/v1/ledger/accounts", walletHandler.ListAccounts)
	mux.HandleFunc("GET /api/v1/ledger/entries", walletHandler.ListJournalEntries)
	mux.HandleFunc("POST /api/v1/ledger/entries", walletHandler.PostJournalEntry)
	mux.HandleFunc("GET /api/v1/supplier/wallet", walletHandler.GetSupplierWallet)
	mux.HandleFunc("POST /api/v1/supplier/payouts", walletHandler.RequestPayout)

	// Commission Policy Engine
	mux.HandleFunc("GET /api/v1/commission/rules", commissionHandler.ListRules)
	mux.HandleFunc("GET /api/v1/commission/resolve", commissionHandler.Resolve)

	// Platform & CMS
	mux.HandleFunc("GET /api/v1/cms/sections", configHandler.ListCMSSections)
	mux.HandleFunc("PUT /api/v1/cms/sections/{id}", configHandler.UpdateCMSSection)
	mux.HandleFunc("GET /api/v1/admin/audit-logs", configHandler.ListAuditLogs)
	mux.HandleFunc("GET /api/v1/config/features", configHandler.GetFeatures)

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

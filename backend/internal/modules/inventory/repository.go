package inventory

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Warehouse struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Code           string    `json:"code"`
	Name           string    `json:"name"`
	CountryCode    string    `json:"country_code"`
	City           string    `json:"city"`
	AddressLine    string    `json:"address_line"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
}

type StockItem struct {
	ID               string          `json:"id"`
	WarehouseID      string          `json:"warehouse_id"`
	WarehouseCode    string          `json:"warehouse_code"`
	WarehouseName    string          `json:"warehouse_name"`
	City             string          `json:"city"`
	OfferID          string          `json:"offer_id"`
	SupplierSKU      string          `json:"supplier_sku"`
	ProductName      json.RawMessage `json:"product_name"`
	ProductSKU       string          `json:"product_sku"`
	OnHand           int             `json:"on_hand"`
	Reserved         int             `json:"reserved"`
	Available        int             `json:"available"`
	ReorderThreshold int             `json:"reorder_threshold"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type StockAdjustmentRequest struct {
	WarehouseID string `json:"warehouse_id"`
	OfferID     string `json:"offer_id"`
	Adjustment  int    `json:"adjustment"` // positive or negative
	Reason      string `json:"reason"`     // 'shipment_received', 'order_fulfillment', 'damaged_goods', 'inventory_audit', 'return_restock'
	Notes       string `json:"notes,omitempty"`
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) ListWarehouses(ctx context.Context, orgID string) ([]Warehouse, error) {
	query := `
		SELECT id, organization_id, code, name, country_code, city, address_line, is_active, created_at
		FROM inventory.warehouses
	`
	if orgID != "" {
		query += " WHERE organization_id = $1"
	}
	query += " ORDER BY code ASC"

	rows, err := r.pool.Query(ctx, query)
	if orgID != "" {
		rows, err = r.pool.Query(ctx, query, orgID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Warehouse
	for rows.Next() {
		var w Warehouse
		if err := rows.Scan(&w.ID, &w.OrganizationID, &w.Code, &w.Name, &w.CountryCode, &w.City, &w.AddressLine, &w.IsActive, &w.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, w)
	}
	return list, nil
}

func (r *Repository) ListStock(ctx context.Context, supplierOrgID string) ([]StockItem, error) {
	query := `
		SELECT ws.id, ws.warehouse_id, w.code as warehouse_code, w.name as warehouse_name, w.city,
		       ws.offer_id, coalesce(o.supplier_sku, '') as supplier_sku,
		       p.name as product_name, p.sku as product_sku,
		       ws.on_hand, ws.reserved, (ws.on_hand - ws.reserved) as available,
		       ws.reorder_threshold, ws.updated_at
		FROM inventory.warehouse_stock ws
		JOIN inventory.warehouses w ON w.id = ws.warehouse_id
		JOIN catalog.supplier_offers o ON o.id = ws.offer_id
		JOIN catalog.products p ON p.id = o.product_id
	`
	if supplierOrgID != "" {
		query += " WHERE o.supplier_id = $1"
	}
	query += " ORDER BY p.name ASC, w.code ASC"

	rows, err := r.pool.Query(ctx, query)
	if supplierOrgID != "" {
		rows, err = r.pool.Query(ctx, query, supplierOrgID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []StockItem
	for rows.Next() {
		var item StockItem
		var prodName []byte
		if err := rows.Scan(
			&item.ID, &item.WarehouseID, &item.WarehouseCode, &item.WarehouseName, &item.City,
			&item.OfferID, &item.SupplierSKU, &prodName, &item.ProductSKU,
			&item.OnHand, &item.Reserved, &item.Available, &item.ReorderThreshold, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.ProductName = prodName
		list = append(list, item)
	}
	return list, nil
}

func (r *Repository) AdjustStock(ctx context.Context, req StockAdjustmentRequest, userID string) (*StockItem, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Fetch current stock with lock
	var currentOnHand, currentReserved int
	err = tx.QueryRow(ctx, `
		SELECT on_hand, reserved FROM inventory.warehouse_stock
		WHERE warehouse_id = $1 AND offer_id = $2
		FOR UPDATE
	`, req.WarehouseID, req.OfferID).Scan(&currentOnHand, &currentReserved)

	if err != nil {
		// Insert if not existing
		currentOnHand = 0
		currentReserved = 0
		_, err = tx.Exec(ctx, `
			INSERT INTO inventory.warehouse_stock (warehouse_id, offer_id, on_hand, reserved)
			VALUES ($1, $2, 0, 0)
			ON CONFLICT (warehouse_id, offer_id) DO NOTHING
		`, req.WarehouseID, req.OfferID)
		if err != nil {
			return nil, fmt.Errorf("failed to init stock: %w", err)
		}
	}

	newOnHand := currentOnHand + req.Adjustment
	if newOnHand < 0 {
		return nil, fmt.Errorf("insufficient stock: on hand %d, adjustment %d", currentOnHand, req.Adjustment)
	}

	// Update stock
	_, err = tx.Exec(ctx, `
		UPDATE inventory.warehouse_stock
		SET on_hand = $1, updated_at = NOW()
		WHERE warehouse_id = $2 AND offer_id = $3
	`, newOnHand, req.WarehouseID, req.OfferID)
	if err != nil {
		return nil, fmt.Errorf("failed to update stock: %w", err)
	}

	// Audit adjustment
	if req.Reason == "" {
		req.Reason = "inventory_audit"
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO inventory.stock_adjustments (
			warehouse_id, offer_id, previous_quantity, adjustment_quantity, new_quantity, reason, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, req.WarehouseID, req.OfferID, currentOnHand, req.Adjustment, newOnHand, req.Reason, req.Notes)
	if err != nil {
		return nil, fmt.Errorf("failed to audit stock adjustment: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &StockItem{
		WarehouseID: req.WarehouseID,
		OfferID:     req.OfferID,
		OnHand:      newOnHand,
		Reserved:    currentReserved,
		Available:   newOnHand - currentReserved,
	}, nil
}

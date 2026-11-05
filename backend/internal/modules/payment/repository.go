package payment

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marketplace/core/internal/modules/wallet"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// SavePaymentRecord inserts or updates a payment record with checkout session URLs
func (r *Repository) SavePaymentRecord(ctx context.Context, p PaymentRecord) error {
	query := `
		INSERT INTO commerce.payments (
			id, order_id, amount, currency, method, gateway, gateway_reference,
			status, idempotency_key, client_secret, checkout_url, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
		ON CONFLICT (idempotency_key) DO UPDATE SET
			gateway = EXCLUDED.gateway,
			gateway_reference = EXCLUDED.gateway_reference,
			status = EXCLUDED.status,
			client_secret = EXCLUDED.client_secret,
			checkout_url = EXCLUDED.checkout_url
	`
	_, err := r.pool.Exec(ctx, query,
		p.ID, p.OrderID, p.AmountCents, p.Currency, p.Method, p.Gateway, p.GatewayReference,
		p.Status, p.IdempotencyKey, p.ClientSecret, p.CheckoutURL,
	)
	return err
}

func (r *Repository) GetPaymentByOrderID(ctx context.Context, orderID string) (*PaymentRecord, error) {
	query := `
		SELECT id, order_id, amount, currency, method, coalesce(gateway, ''), coalesce(gateway_reference, ''),
		       status, idempotency_key, coalesce(client_secret, ''), coalesce(checkout_url, ''), created_at
		FROM commerce.payments
		WHERE order_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	var p PaymentRecord
	err := r.pool.QueryRow(ctx, query, orderID).Scan(
		&p.ID, &p.OrderID, &p.AmountCents, &p.Currency, &p.Method, &p.Gateway, &p.GatewayReference,
		&p.Status, &p.IdempotencyKey, &p.ClientSecret, &p.CheckoutURL, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// SettlePaymentWebhook executes 2-phase settlement: marks payment captured, confirms order,
// and posts the double-entry journal entry to the financial ledger.
func (r *Repository) SettlePaymentWebhook(ctx context.Context, evt WebhookEvent) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Fetch Order and Verify State
	var orderStatus, orderCurrency, orderNumber string
	var grandTotal, shippingTotal int64
	err = tx.QueryRow(ctx, `
		SELECT order_number, status, currency, grand_total, shipping_total
		FROM commerce.orders
		WHERE id = $1
		FOR UPDATE
	`, evt.OrderID).Scan(&orderNumber, &orderStatus, &orderCurrency, &grandTotal, &shippingTotal)
	if err != nil {
		return fmt.Errorf("order %s not found: %w", evt.OrderID, err)
	}

	// Idempotency: If order is already confirmed, return success without double-posting
	if orderStatus == "confirmed" || orderStatus == "processing" || orderStatus == "completed" {
		return nil
	}

	// 2. Update Payment Record to Captured
	res, err := tx.Exec(ctx, `
		UPDATE commerce.payments
		SET status = 'captured', gateway_reference = $1
		WHERE order_id = $2
	`, evt.GatewayReference, evt.OrderID)
	if err != nil {
		return fmt.Errorf("failed to update payment status: %w", err)
	}
	if res.RowsAffected() == 0 {
		// Insert payment record if not present
		paymentID := uuid.New().String()
		_, _ = tx.Exec(ctx, `
			INSERT INTO commerce.payments (id, order_id, amount, currency, method, gateway, gateway_reference, status, idempotency_key)
			VALUES ($1, $2, $3, $4, 'card', $5, $6, 'captured', $7)
		`, paymentID, evt.OrderID, grandTotal, orderCurrency, evt.Gateway, evt.GatewayReference, "pay-webhook-"+evt.ID)
	}

	// 3. Update Order Status to Confirmed
	_, err = tx.Exec(ctx, `
		UPDATE commerce.orders
		SET status = 'confirmed', updated_at = NOW()
		WHERE id = $1
	`, evt.OrderID)
	if err != nil {
		return fmt.Errorf("failed to confirm order: %w", err)
	}

	// 4. Fetch Suborders for Double-Entry Ledger Posting
	type suborderSlice struct {
		supplierID      string
		supplierPayable int64
		commissionTotal int64
	}
	rows, err := tx.Query(ctx, `
		SELECT supplier_id, supplier_payable, commission_amount
		FROM commerce.suborders
		WHERE order_id = $1
	`, evt.OrderID)
	if err != nil {
		return fmt.Errorf("failed to fetch suborders: %w", err)
	}
	defer rows.Close()

	var suborders []suborderSlice
	var totalCommission int64
	for rows.Next() {
		var s suborderSlice
		if err := rows.Scan(&s.supplierID, &s.supplierPayable, &s.commissionTotal); err != nil {
			return err
		}
		suborders = append(suborders, s)
		totalCommission += s.commissionTotal
	}

	// 5. Post Double-Entry Balanced Journal Entry
	// Acquire advisory lock to prevent concurrent hash chain contention
	_, _ = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(742910)")
	var prevHash string
	_ = tx.QueryRow(ctx, `SELECT hash FROM ledger.journal_entries WHERE hash IS NOT NULL ORDER BY sequence_id DESC LIMIT 1`).Scan(&prevHash)
	if prevHash == "" {
		prevHash = wallet.GenesisPrevHash
	}

	journalEntryID := uuid.New().String()
	jeNumber := fmt.Sprintf("JE-%d-%s", time.Now().Unix(), journalEntryID[:8])
	action := "order_settlement"
	idemKey := "idem-webhook-" + evt.ID
	currHash := wallet.ComputeJournalEntryHash(prevHash, jeNumber, "order", evt.OrderID, action, orderCurrency, "posted", idemKey)

	_, err = tx.Exec(ctx, `
		INSERT INTO ledger.journal_entries (
			id, entry_number, reference_type, reference_id, action, description, currency, status, idempotency_key, prev_hash, hash
		) VALUES ($1, $2, 'order', $3, $4, $5, $6, 'posted', $7, $8, $9)
	`, journalEntryID, jeNumber, evt.OrderID, action, "Card gateway settlement for order "+orderNumber, orderCurrency, idemKey, prevHash, currHash)
	if err != nil {
		return fmt.Errorf("failed to create journal entry: %w", err)
	}

	// Account 1010: Gateway Clearing (Asset)
	var clearingAccID string
	err = tx.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '1010' LIMIT 1`).Scan(&clearingAccID)
	if err != nil {
		return fmt.Errorf("clearing account 1010 not found: %w", err)
	}

	// Line 1: DEBIT Gateway Clearing (1010) for Grand Total
	_, err = tx.Exec(ctx, `
		INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
		VALUES ($1, $2, $3, 'debit', $4)
	`, uuid.New().String(), journalEntryID, clearingAccID, grandTotal)
	if err != nil {
		return fmt.Errorf("failed to insert debit line: %w", err)
	}

	// Line 2: CREDIT Each Supplier's Escrow Account 2020
	for _, so := range suborders {
		var escrowAccID string
		err = tx.QueryRow(ctx, `
			SELECT id FROM ledger.accounts 
			WHERE owner_id = $1 AND account_code = '2020'
			LIMIT 1
		`, so.supplierID).Scan(&escrowAccID)

		if err != nil {
			escrowAccID = uuid.New().String()
			_, err = tx.Exec(ctx, `
				INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
				VALUES ($1, 'supplier', $2, $3, '2020', 'Supplier Escrow Account')
			`, escrowAccID, so.supplierID, orderCurrency)
			if err != nil {
				return fmt.Errorf("failed to create supplier escrow account: %w", err)
			}
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
			VALUES ($1, $2, $3, 'credit', $4)
		`, uuid.New().String(), journalEntryID, escrowAccID, so.supplierPayable)
		if err != nil {
			return fmt.Errorf("failed to insert supplier escrow credit line: %w", err)
		}
	}

	// Line 3: CREDIT Platform Commission Revenue Account 4010
	if totalCommission > 0 {
		var commAccID string
		err = tx.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4010' LIMIT 1`).Scan(&commAccID)
		if err != nil {
			return fmt.Errorf("commission account 4010 not found: %w", err)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
			VALUES ($1, $2, $3, 'credit', $4)
		`, uuid.New().String(), journalEntryID, commAccID, totalCommission)
		if err != nil {
			return fmt.Errorf("failed to insert commission credit line: %w", err)
		}
	}

	// Line 4: CREDIT Platform Shipping Revenue Account 4020
	if shippingTotal > 0 {
		var shipAccID string
		err = tx.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4020' LIMIT 1`).Scan(&shipAccID)
		if err != nil {
			return fmt.Errorf("shipping revenue account 4020 not found: %w", err)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
			VALUES ($1, $2, $3, 'credit', $4)
		`, uuid.New().String(), journalEntryID, shipAccID, shippingTotal)
		if err != nil {
			return fmt.Errorf("failed to insert shipping credit line: %w", err)
		}
	}

	// 6. Insert Outbox Event for Asynchronous Invoice & Notification Dispatch
	outboxPayload, _ := json.Marshal(map[string]interface{}{
		"order_id":         evt.OrderID,
		"order_number":     orderNumber,
		"grand_total_cents": grandTotal,
		"currency":         orderCurrency,
		"confirmed_at":     time.Now().UTC(),
	})
	_, _ = tx.Exec(ctx, `
		INSERT INTO platform.outbox_events (id, aggregate_type, aggregate_id, event_type, payload)
		VALUES ($1, 'order', $2, 'OrderConfirmed', $3)
	`, uuid.New().String(), evt.OrderID, outboxPayload)

	return tx.Commit(ctx)
}

// FailPaymentWebhook handles payment failures: marks payment failed, cancels order,
// and safely releases reserved stock back to warehouse availability.
func (r *Repository) FailPaymentWebhook(ctx context.Context, evt WebhookEvent) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Update Payment Status to Failed
	_, _ = tx.Exec(ctx, `
		UPDATE commerce.payments
		SET status = 'failed'
		WHERE order_id = $1
	`, evt.OrderID)

	// 2. Fetch Order Items to Release Reserved Stock
	rows, err := tx.Query(ctx, `
		SELECT oi.offer_id, oi.quantity
		FROM commerce.order_items oi
		JOIN commerce.suborders so ON so.id = oi.suborder_id
		WHERE so.order_id = $1
	`, evt.OrderID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type stockRelease struct {
		offerID string
		qty     int
	}
	var releases []stockRelease
	for rows.Next() {
		var s stockRelease
		if err := rows.Scan(&s.offerID, &s.qty); err == nil {
			releases = append(releases, s)
		}
	}

	// 3. Decrement Reserved Stock in Inventory
	for _, rel := range releases {
		_, _ = tx.Exec(ctx, `
			UPDATE inventory.warehouse_stock
			SET reserved = GREATEST(0, reserved - $1), updated_at = NOW()
			WHERE offer_id = $2
		`, rel.qty, rel.offerID)
	}

	// 4. Update Order Status to Cancelled
	_, err = tx.Exec(ctx, `
		UPDATE commerce.orders
		SET status = 'cancelled', updated_at = NOW()
		WHERE id = $1
	`, evt.OrderID)
	if err != nil {
		return err
	}

	// 5. Emit Outbox Event
	failPayload, _ := json.Marshal(map[string]interface{}{
		"order_id": evt.OrderID,
		"reason":   "payment_failed",
	})
	_, _ = tx.Exec(ctx, `
		INSERT INTO platform.outbox_events (id, aggregate_type, aggregate_id, event_type, payload)
		VALUES ($1, 'order', $2, 'OrderCancelled', $3)
	`, uuid.New().String(), evt.OrderID, failPayload)

	return tx.Commit(ctx)
}

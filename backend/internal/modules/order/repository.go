package order

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/config"
	"github.com/marketplace/core/internal/modules/wallet"
)

type CheckoutItemInput struct {
	OfferID  string `json:"offer_id"`
	Quantity int    `json:"quantity"`
}

type CheckoutRequest struct {
	MerchantID      string              `json:"merchant_id"`
	Currency        string              `json:"currency,omitempty"`
	PaymentMethod   string              `json:"payment_method"`
	DeliveryAddress json.RawMessage     `json:"delivery_address"`
	Items           []CheckoutItemInput `json:"items"`
}

type Repository struct {
	pool           *pgxpool.Pool
	commissionRepo *commission.Repository
}

func NewRepository(pool *pgxpool.Pool, commissionRepo *commission.Repository) *Repository {
	return &Repository{
		pool:           pool,
		commissionRepo: commissionRepo,
	}
}

func (r *Repository) ProcessCheckout(ctx context.Context, req CheckoutRequest, userID string) (*ParentOrder, error) {
	if len(req.Items) == 0 {
		return nil, fmt.Errorf("cart is empty")
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Fallbacks for demo user & org
	if req.MerchantID == "" {
		req.MerchantID = "b0000000-0000-0000-0000-000000000004" // Meridian Labs
	}
	if userID == "" {
		userID = "a0000000-0000-0000-0000-000000000004" // Tariq Buyer
	}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "wallet"
	}
	if len(req.DeliveryAddress) == 0 {
		req.DeliveryAddress = json.RawMessage(`{"city": "Riyadh", "street": "King Fahd Rd", "building": "Suite 402"}`)
	}

	// Fetch commission rules
	rules, err := r.commissionRepo.ListRules(ctx)
	if err != nil {
		rules = []commission.CommissionRule{}
	}

	type ResolvedItem struct {
		OfferID         string
		SupplierID      string
		SupplierName    string
		CategoryID      string
		ProductTitle    string
		ProductSKU      string
		BrandName       string
		Quantity        int
		UnitPrice       int64
		TotalPrice        int64
		CommissionRateBps int64
		CommissionRate    float64
		ProductSnapshot   []byte
		OfferSnapshot     []byte
	}

	var resolvedItems []ResolvedItem

	for _, item := range req.Items {
		query := `
			SELECT o.id, o.supplier_id, coalesce(org.legal_name, org.name->>'en'),
			       p.id as product_id, p.category_id, p.name->>'en', p.sku, coalesce(b.name, ''),
			       o.price, o.moq, coalesce(o.price_tiers, '[]'::jsonb), o.supplier_sku
			FROM catalog.supplier_offers o
			JOIN iam.organizations org ON org.id = o.supplier_id
			JOIN catalog.products p ON p.id = o.product_id
			LEFT JOIN catalog.brands b ON b.id = p.brand_id
			WHERE o.id = $1 AND o.status = 'active'
		`
		var offID, supID, supName, prodID, catID, prodTitle, prodSKU, brandName, supSKU string
		var basePrice int64
		var moq int
		var tiersJSON []byte

		err := tx.QueryRow(ctx, query, item.OfferID).Scan(
			&offID, &supID, &supName, &prodID, &catID, &prodTitle, &prodSKU, &brandName,
			&basePrice, &moq, &tiersJSON, &supSKU,
		)
		if err != nil {
			return nil, fmt.Errorf("offer %s not found or inactive", item.OfferID)
		}

		if item.Quantity < moq {
			return nil, fmt.Errorf("item %s does not meet minimum order quantity (MOQ: %d, requested: %d)", prodTitle, moq, item.Quantity)
		}

		// Calculate tier pricing
		unitPrice := basePrice
		type Tier struct {
			MinQty int   `json:"minQty"`
			Price  int64 `json:"price"`
		}
		var tiers []Tier
		_ = json.Unmarshal(tiersJSON, &tiers)
		for _, t := range tiers {
			if item.Quantity >= t.MinQty && t.Price > 0 {
				unitPrice = t.Price
			}
		}

		// Calculate dynamic commission using integer basis points
		commRes := commission.ResolveEffectiveCommission(rules, supID, catID)
		commBps := commRes.EffectiveRateBps
		commRate := commRes.EffectiveRatePercent / 100.0

		prodSnap, _ := json.Marshal(map[string]interface{}{
			"id": prodID, "sku": prodSKU, "title": prodTitle, "brand": brandName,
		})
		offSnap, _ := json.Marshal(map[string]interface{}{
			"offer_id": offID, "supplier_sku": supSKU, "moq": moq, "unit_price": unitPrice,
		})

		resolvedItems = append(resolvedItems, ResolvedItem{
			OfferID:         offID,
			SupplierID:      supID,
			SupplierName:    supName,
			CategoryID:      catID,
			ProductTitle:    prodTitle,
			ProductSKU:      prodSKU,
			BrandName:       brandName,
			Quantity:          item.Quantity,
			UnitPrice:         unitPrice,
			TotalPrice:        unitPrice * int64(item.Quantity),
			CommissionRateBps: commBps,
			CommissionRate:    commRate,
			ProductSnapshot:   prodSnap,
			OfferSnapshot:     offSnap,
		})

		// Reserve stock in warehouse with atomic row guard: (on_hand - reserved) >= quantity
		tag, err := tx.Exec(ctx, `
			UPDATE inventory.warehouse_stock
			SET reserved = reserved + $1, updated_at = NOW()
			WHERE offer_id = $2 AND (on_hand - reserved) >= $1
		`, item.Quantity, offID)
		if err != nil {
			return nil, fmt.Errorf("failed to reserve inventory for item %s: %w", prodTitle, err)
		}
		if tag.RowsAffected() == 0 {
			return nil, fmt.Errorf("insufficient stock available for item %s (requested: %d)", prodTitle, item.Quantity)
		}
	}

	// Dynamic currency resolution
	orderCurrency := config.ResolveCurrency(req.Currency)

	// Partition items into supplier suborders
	type SupplierGroup struct {
		SupplierID        string
		SupplierName      string
		Items             []ResolvedItem
		Subtotal          int64
		Shipping          int64
		CommissionRateBps int64
		CommissionRate    float64
		CommissionAmt     int64
		SupplierNet       int64
	}

	groups := make(map[string]*SupplierGroup)
	for _, it := range resolvedItems {
		grp, exists := groups[it.SupplierID]
		if !exists {
			commRes := commission.ResolveEffectiveCommission(rules, it.SupplierID, it.CategoryID)
			grp = &SupplierGroup{
				SupplierID:        it.SupplierID,
				SupplierName:      it.SupplierName,
				Shipping:          1500, // flat shipping per supplier
				CommissionRateBps: commRes.EffectiveRateBps,
				CommissionRate:    it.CommissionRate,
			}
			groups[it.SupplierID] = grp
		}
		grp.Items = append(grp.Items, it)
		grp.Subtotal += it.TotalPrice
	}

	var parentSubtotal int64
	var parentShipping int64
	var parentGrandTotal int64

	for _, g := range groups {
		// Integer arithmetic commission calculation with zero floating point drift
		g.CommissionAmt = commission.CalculateCommission(g.Subtotal, g.CommissionRateBps)
		g.SupplierNet = g.Subtotal - g.CommissionAmt
		parentSubtotal += g.Subtotal
		parentShipping += g.Shipping
		parentGrandTotal += (g.Subtotal + g.Shipping)
	}

	// Insert Parent Order
	parentOrderID := uuid.New().String()
	orderNumber := fmt.Sprintf("ORD-%s-%06d-%04d", time.Now().Format("20060102"), (time.Now().UnixNano()/1000)%1000000, time.Now().UnixNano()%10000)


	orderQuery := `
		INSERT INTO commerce.orders (
			id, order_number, merchant_id, user_id, currency, subtotal, shipping_total, grand_total, status, delivery_address, payment_method
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', $9, $10)
	`
	_, err = tx.Exec(ctx, orderQuery, parentOrderID, orderNumber, req.MerchantID, userID, orderCurrency, parentSubtotal, parentShipping, parentGrandTotal, req.DeliveryAddress, req.PaymentMethod)
	if err != nil {
		return nil, fmt.Errorf("failed to create parent order: %w", err)
	}

	parentOrder := &ParentOrder{
		ID:              parentOrderID,
		OrderNumber:     orderNumber,
		MerchantID:      req.MerchantID,
		Currency:        orderCurrency,
		SubtotalCents:   parentSubtotal,
		ShippingCents:   parentShipping,
		GrandTotalCents: parentGrandTotal,
		Status:          "confirmed",
		PaymentMethod:   req.PaymentMethod,
		CreatedAt:       time.Now().UTC(),
	}

	// Insert Suborders & Items
	idx := 1
	for _, g := range groups {
		suborderID := uuid.New().String()
		soNumber := fmt.Sprintf("SO-%s-%02d", orderNumber[4:], idx)
		idx++
		soTotal := g.Subtotal + g.Shipping

		subQuery := `
			INSERT INTO commerce.suborders (
				id, suborder_number, order_id, supplier_id, subtotal, shipping_total, total, commission_rate, commission_amount, supplier_payable, status
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'new')
		`
		_, err = tx.Exec(ctx, subQuery, suborderID, soNumber, parentOrderID, g.SupplierID, g.Subtotal, g.Shipping, soTotal, g.CommissionRate, g.CommissionAmt, g.SupplierNet)
		if err != nil {
			return nil, fmt.Errorf("failed to create suborder: %w", err)
		}

		var itemsList []OrderItem
		for _, it := range g.Items {
			itemID := uuid.New().String()
			itemQuery := `
				INSERT INTO commerce.order_items (
					id, suborder_id, offer_id, product_snapshot, offer_snapshot, quantity, unit_price, total_price
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			`
			_, err = tx.Exec(ctx, itemQuery, itemID, suborderID, it.OfferID, it.ProductSnapshot, it.OfferSnapshot, it.Quantity, it.UnitPrice, it.TotalPrice)
			if err != nil {
				return nil, fmt.Errorf("failed to create order item: %w", err)
			}

			itemsList = append(itemsList, OrderItem{
				ID:              itemID,
				SuborderID:      suborderID,
				OfferID:         it.OfferID,
				Quantity:        it.Quantity,
				UnitPriceCents:  it.UnitPrice,
				TotalPriceCents: it.TotalPrice,
			})
		}

		parentOrder.Suborders = append(parentOrder.Suborders, Suborder{
			ID:              suborderID,
			SuborderNumber:  soNumber,
			ParentOrderID:   parentOrderID,
			SupplierID:      g.SupplierID,
			SupplierName:    g.SupplierName,
			SubtotalCents:   g.Subtotal,
			ShippingCents:   g.Shipping,
			CommissionRate:  g.CommissionRate,
			CommissionCents: g.CommissionAmt,
			SupplierPayable: g.SupplierNet,
			Status:          "new",
			Items:           itemsList,
		})
	}

	// Insert Payment Record
	paymentID := uuid.New().String()
	_, err = tx.Exec(ctx, `
		INSERT INTO commerce.payments (
			id, order_id, amount, currency, method, status, idempotency_key
		) VALUES ($1, $2, $3, $4, $5, 'captured', $6)
	`, paymentID, parentOrderID, parentGrandTotal, orderCurrency, req.PaymentMethod, "pay-"+orderNumber)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment record: %w", err)
	}

	// Double-Entry Ledger Posting within the same transaction:
	// Balanced Entry:
	// DEBIT: Merchant Wallet (Account 2010) if wallet checkout, or Gateway Clearing (Account 1010)
	// CREDIT: Each Supplier Escrow (Account 2020) for their SupplierNet
	// CREDIT: Platform Commission Revenue (Account 4010) for total commission + shipping
	journalEntryID := uuid.New().String()
	jeNumber := fmt.Sprintf("JE-%d-%s", time.Now().Unix(), journalEntryID[:8])

	// Fetch previous hash and compute current cryptographic entry hash
	_, _ = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(742910)")
	var prevHash string
	_ = tx.QueryRow(ctx, `SELECT hash FROM ledger.journal_entries WHERE hash IS NOT NULL ORDER BY sequence_id DESC LIMIT 1`).Scan(&prevHash)
	if prevHash == "" {
		prevHash = wallet.GenesisPrevHash
	}
	currHash := wallet.ComputeJournalEntryHash(prevHash, jeNumber, "order", parentOrderID, "order_settlement", orderCurrency, "posted", "idem-"+orderNumber)

	_, err = tx.Exec(ctx, `
		INSERT INTO ledger.journal_entries (
			id, entry_number, reference_type, reference_id, action, description, currency, status, idempotency_key, prev_hash, hash
		) VALUES ($1, $2, 'order', $3, 'order_settlement', $4, $5, 'posted', $6, $7, $8)
	`, journalEntryID, jeNumber, parentOrderID, "Settlement for order "+orderNumber, orderCurrency, "idem-"+orderNumber, prevHash, currHash)
	if err != nil {
		return nil, fmt.Errorf("failed to create journal entry: %w", err)
	}

	// 1. Determine Debit Account (Account 2010 for wallet, Account 1010 for gateway clearing)
	var debitAccID string
	if req.PaymentMethod == "wallet" {
		// Look up or create merchant wallet account 2010
		var merchantWalletID string
		err = tx.QueryRow(ctx, `
			SELECT id FROM ledger.accounts 
			WHERE owner_id = $1 AND account_code = '2010'
			LIMIT 1
		`, req.MerchantID).Scan(&merchantWalletID)

		if err != nil {
			merchantWalletID = uuid.New().String()
			_, err = tx.Exec(ctx, `
				INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
				VALUES ($1, 'merchant', $2, $3, '2010', 'Merchant Wallet Account')
			`, merchantWalletID, req.MerchantID, orderCurrency)
			if err != nil {
				return nil, fmt.Errorf("failed to create merchant wallet account 2010: %w", err)
			}
		}

		// Verify merchant has sufficient balance in Account 2010
		// For liability account 2010: balance = SUM(credit - debit)
		var merchantBal int64
		err = tx.QueryRow(ctx, `
			SELECT coalesce(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
			FROM ledger.lines
			WHERE account_id = $1
		`, merchantWalletID).Scan(&merchantBal)
		if err != nil {
			return nil, fmt.Errorf("failed to verify merchant wallet balance: %w", err)
		}

		if merchantBal < parentGrandTotal {
			return nil, fmt.Errorf("insufficient wallet balance (available: %d cents, required: %d cents)", merchantBal, parentGrandTotal)
		}

		debitAccID = merchantWalletID
	} else {
		// Find clearing account (Gateway Clearing 1010)
		err = tx.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '1010' LIMIT 1`).Scan(&debitAccID)
		if err != nil {
			return nil, fmt.Errorf("clearing account 1010 missing: %w", err)
		}
	}

	// Debit the selected account for the entire Grand Total
	_, err = tx.Exec(ctx, `
		INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
		VALUES (gen_random_uuid(), $1, $2, 'debit', $3)
	`, journalEntryID, debitAccID, parentGrandTotal)
	if err != nil {
		return nil, fmt.Errorf("failed to insert debit line: %w", err)
	}

	// Find Platform Commission Revenue Account 4010
	var platformRevAccID string
	err = tx.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4010' LIMIT 1`).Scan(&platformRevAccID)
	if err != nil {
		return nil, fmt.Errorf("platform revenue account 4010 missing: %w", err)
	}

	var totalCommissionCredit int64
	var totalShippingCredit int64

	// 2. Credit each Supplier's Escrow Account 2020
	for _, g := range groups {
		var supEscrowAccID string
		err = tx.QueryRow(ctx, `
			SELECT id FROM ledger.accounts 
			WHERE owner_id = $1 AND account_code = '2020' 
			LIMIT 1
		`, g.SupplierID).Scan(&supEscrowAccID)

		if err != nil {
			// Create escrow account if not exists
			supEscrowAccID = uuid.New().String()
			_, err = tx.Exec(ctx, `
				INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
				VALUES ($1, 'supplier', $2, $3, '2020', $4)
			`, supEscrowAccID, g.SupplierID, orderCurrency, g.SupplierName+" Escrow Account")
			if err != nil {
				return nil, fmt.Errorf("failed to create supplier escrow account: %w", err)
			}
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
			VALUES (gen_random_uuid(), $1, $2, 'credit', $3)
		`, journalEntryID, supEscrowAccID, g.SupplierNet)
		if err != nil {
			return nil, fmt.Errorf("failed to credit supplier escrow: %w", err)
		}

		totalCommissionCredit += g.CommissionAmt
		totalShippingCredit += g.Shipping
	}

	// 3. Credit Platform Commission Revenue 4010
	if totalCommissionCredit > 0 {
		_, err = tx.Exec(ctx, `
			INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
			VALUES (gen_random_uuid(), $1, $2, 'credit', $3)
		`, journalEntryID, platformRevAccID, totalCommissionCredit)
		if err != nil {
			return nil, fmt.Errorf("failed to credit platform commission revenue: %w", err)
		}
	}

	// 4. Credit Platform Shipping Revenue 4020
	if totalShippingCredit > 0 {
		var platformShipAccID string
		err = tx.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4020' LIMIT 1`).Scan(&platformShipAccID)
		if err != nil {
			var platformOrgID string
			_ = tx.QueryRow(ctx, `SELECT id FROM iam.organizations WHERE type = 'platform' LIMIT 1`).Scan(&platformOrgID)
			if platformOrgID == "" {
				platformOrgID = "b0000000-0000-0000-0000-000000000001"
			}
			platformShipAccID = uuid.New().String()
			_, err = tx.Exec(ctx, `
				INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
				VALUES ($1, 'platform', $2, $3, '4020', 'Platform Shipping Revenue')
			`, platformShipAccID, platformOrgID, orderCurrency)
			if err != nil {
				return nil, fmt.Errorf("failed to create shipping revenue account 4020: %w", err)
			}
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
			VALUES (gen_random_uuid(), $1, $2, 'credit', $3)
		`, journalEntryID, platformShipAccID, totalShippingCredit)
		if err != nil {
			return nil, fmt.Errorf("failed to credit platform shipping revenue: %w", err)
		}
	}

	// Commit will trigger trg_enforce_ledger_balance and verify Debits == Credits!
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("checkout commit error: %w", err)
	}

	return parentOrder, nil
}

func (r *Repository) ListOrders(ctx context.Context, merchantID string) ([]ParentOrder, error) {
	query := `
		SELECT o.id, o.order_number, o.merchant_id, o.currency, o.subtotal,
		       o.shipping_total, o.grand_total, o.status, o.payment_method, o.created_at
		FROM commerce.orders o
	`
	if merchantID != "" {
		query += " WHERE o.merchant_id = $1"
	}
	query += " ORDER BY o.created_at DESC LIMIT 50"

	rows, err := r.pool.Query(ctx, query)
	if merchantID != "" {
		rows, err = r.pool.Query(ctx, query, merchantID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []ParentOrder
	for rows.Next() {
		var po ParentOrder
		if err := rows.Scan(
			&po.ID, &po.OrderNumber, &po.MerchantID, &po.Currency, &po.SubtotalCents,
			&po.ShippingCents, &po.GrandTotalCents, &po.Status, &po.PaymentMethod, &po.CreatedAt,
		); err != nil {
			return nil, err
		}

		// Fetch suborders
		subRows, err := r.pool.Query(ctx, `
			SELECT s.id, s.suborder_number, s.parent_order_id, s.supplier_id,
			       coalesce(org.legal_name, org.name->>'en') as supplier_name,
			       s.subtotal, s.shipping_total, s.commission_rate, s.commission_amount,
			       s.supplier_payable, s.status
			FROM commerce.suborders s
			JOIN iam.organizations org ON org.id = s.supplier_id
			WHERE s.order_id = $1
		`, po.ID)
		if err == nil {
			for subRows.Next() {
				var so Suborder
				if err := subRows.Scan(
					&so.ID, &so.SuborderNumber, &so.ParentOrderID, &so.SupplierID, &so.SupplierName,
					&so.SubtotalCents, &so.ShippingCents, &so.CommissionRate, &so.CommissionCents,
					&so.SupplierPayable, &so.Status,
				); err == nil {
					po.Suborders = append(po.Suborders, so)
				}
			}
			subRows.Close()
		}

		orders = append(orders, po)
	}
	return orders, nil
}

func (r *Repository) ListSupplierSuborders(ctx context.Context, supplierID string) ([]Suborder, error) {
	query := `
		SELECT s.id, s.suborder_number, s.order_id, s.supplier_id,
		       coalesce(org.legal_name, org.name->>'en') as supplier_name,
		       s.subtotal, s.shipping_total, s.commission_rate, s.commission_amount,
		       s.supplier_payable, s.status
		FROM commerce.suborders s
		JOIN iam.organizations org ON org.id = s.supplier_id
		WHERE s.supplier_id = $1
		ORDER BY s.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var suborders []Suborder
	for rows.Next() {
		var so Suborder
		if err := rows.Scan(
			&so.ID, &so.SuborderNumber, &so.ParentOrderID, &so.SupplierID, &so.SupplierName,
			&so.SubtotalCents, &so.ShippingCents, &so.CommissionRate, &so.CommissionCents,
			&so.SupplierPayable, &so.Status,
		); err != nil {
			return nil, err
		}

		// Fetch items
		itemRows, err := r.pool.Query(ctx, `
			SELECT id, suborder_id, offer_id, quantity, unit_price, total_price
			FROM commerce.order_items
			WHERE suborder_id = $1
		`, so.ID)
		if err == nil {
			for itemRows.Next() {
				var item OrderItem
				if err := itemRows.Scan(&item.ID, &item.SuborderID, &item.OfferID, &item.Quantity, &item.UnitPriceCents, &item.TotalPriceCents); err == nil {
					so.Items = append(so.Items, item)
				}
			}
			itemRows.Close()
		}

		suborders = append(suborders, so)
	}
	return suborders, nil
}

func (r *Repository) UpdateSuborderStatus(ctx context.Context, suborderID, newStatus string) error {
	query := `UPDATE commerce.suborders SET status = $1, updated_at = NOW() WHERE id = $2`
	ct, err := r.pool.Exec(ctx, query, newStatus, suborderID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return fmt.Errorf("suborder not found")
	}
	return nil
}

func (r *Repository) GetSuborderByID(ctx context.Context, suborderID string) (*Suborder, error) {
	query := `
		SELECT so.id, so.suborder_number, so.order_id, so.supplier_id, coalesce(org.legal_name, org.name->>'en', 'Supplier'),
		       so.subtotal, so.shipping_total, so.commission_rate, so.commission_amount, so.supplier_payable, so.status
		FROM commerce.suborders so
		JOIN iam.organizations org ON org.id = so.supplier_id
		WHERE so.id = $1
	`
	var so Suborder
	err := r.pool.QueryRow(ctx, query, suborderID).Scan(
		&so.ID, &so.SuborderNumber, &so.ParentOrderID, &so.SupplierID, &so.SupplierName,
		&so.SubtotalCents, &so.ShippingCents, &so.CommissionRate, &so.CommissionCents,
		&so.SupplierPayable, &so.Status,
	)
	if err != nil {
		return nil, err
	}
	return &so, nil
}


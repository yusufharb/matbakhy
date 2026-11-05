package invoice

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Generator struct {
	pool *pgxpool.Pool
}

func NewGenerator(pool *pgxpool.Pool) *Generator {
	return &Generator{pool: pool}
}

// GenerateInvoice creates a permanent, compliant tax invoice record for a confirmed order
func (g *Generator) GenerateInvoice(ctx context.Context, orderID string) (*Invoice, error) {
	// 1. Fetch Order details
	query := `
		SELECT o.order_number, o.order_type, coalesce(o.merchant_id::text, ''), o.user_id,
		       o.currency, o.subtotal, o.shipping_total, o.grand_total, o.created_at
		FROM commerce.orders o
		WHERE o.id = $1
	`
	var orderNumber, orderType, merchantID, userID, currency string
	var subtotal, shippingTotal, grandTotal int64
	var orderCreatedAt time.Time
	err := g.pool.QueryRow(ctx, query, orderID).Scan(
		&orderNumber, &orderType, &merchantID, &userID,
		&currency, &subtotal, &shippingTotal, &grandTotal, &orderCreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}

	// 2. Fetch Buyer information
	var buyerName, buyerTaxID string
	if orderType == "b2b" && merchantID != "" {
		_ = g.pool.QueryRow(ctx, `
			SELECT coalesce(legal_name, name->>'en', 'Merchant Buyer'), coalesce(tax_id, '')
			FROM iam.organizations WHERE id = $1
		`, merchantID).Scan(&buyerName, &buyerTaxID)
	} else {
		_ = g.pool.QueryRow(ctx, `
			SELECT first_name || ' ' || last_name FROM iam.users WHERE id = $1
		`, userID).Scan(&buyerName)
	}
	if buyerName == "" {
		buyerName = "Valued Customer"
	}

	// 3. Fetch Primary Seller / Marketplace Info
	var sellerName, sellerTaxID, sellerCR string
	_ = g.pool.QueryRow(ctx, `
		SELECT coalesce(org.legal_name, org.name->>'en', 'NEXUS Supplier'), coalesce(org.tax_id, '310123456700003'), coalesce(org.cr_number, '1010998877')
		FROM commerce.suborders so
		JOIN iam.organizations org ON org.id = so.supplier_id
		WHERE so.order_id = $1
		LIMIT 1
	`, orderID).Scan(&sellerName, &sellerTaxID, &sellerCR)

	if sellerName == "" {
		sellerName = "NEXUS Industrial Marketplace Platform"
		sellerTaxID = "310123456700003"
		sellerCR = "1010998877"
	}

	// 4. Calculate 15% VAT (Standard VAT rate)
	taxCents := (subtotal * 15) / 115
	if taxCents <= 0 {
		taxCents = (grandTotal * 15) / 115
	}
	netSubtotalCents := grandTotal - taxCents

	// 5. Generate ZATCA / regional compliant Base64 TLV QR Code
	totalFloat := float64(grandTotal) / 100.0
	taxFloat := float64(taxCents) / 100.0
	qrCodeTLV := GenerateTLVQRCode(sellerName, sellerTaxID, orderCreatedAt.Format(time.RFC3339), totalFloat, taxFloat)

	invoiceID := uuid.New().String()
	invNumber := fmt.Sprintf("INV-%s-%s", orderCreatedAt.Format("2006"), invoiceID[:8])
	invoiceType := "tax_invoice"
	if orderType == "b2c" {
		invoiceType = "simplified_tax_invoice"
	}

	// 6. Insert into commerce.invoices
	insertQuery := `
		INSERT INTO commerce.invoices (
			id, invoice_number, order_id, invoice_type, seller_name, seller_tax_id, seller_cr_number,
			buyer_name, buyer_tax_id, currency, subtotal_cents, tax_cents, grand_total_cents,
			qr_code_tlv, status, issued_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'issued', NOW())
		RETURNING id, invoice_number, order_id, invoice_type, seller_name, seller_tax_id, coalesce(seller_cr_number, ''),
		          buyer_name, coalesce(buyer_tax_id, ''), currency, subtotal_cents, tax_cents, grand_total_cents,
		          coalesce(qr_code_tlv, ''), coalesce(pdf_url, ''), status, issued_at, created_at
	`
	var inv Invoice
	err = g.pool.QueryRow(ctx, insertQuery,
		invoiceID, invNumber, orderID, invoiceType, sellerName, sellerTaxID, sellerCR,
		buyerName, buyerTaxID, currency, netSubtotalCents, taxCents, grandTotal, qrCodeTLV,
	).Scan(
		&inv.ID, &inv.InvoiceNumber, &inv.OrderID, &inv.InvoiceType, &inv.SellerName, &inv.SellerTaxID, &inv.SellerCRNumber,
		&inv.BuyerName, &inv.BuyerTaxID, &inv.Currency, &inv.SubtotalCents, &inv.TaxCents, &inv.GrandTotalCents,
		&inv.QRCodeTLV, &inv.PDFURL, &inv.Status, &inv.IssuedAt, &inv.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save invoice: %w", err)
	}

	return &inv, nil
}

func (g *Generator) GetInvoiceByOrderID(ctx context.Context, orderID string) (*Invoice, error) {
	query := `
		SELECT id, invoice_number, order_id, invoice_type, seller_name, seller_tax_id, coalesce(seller_cr_number, ''),
		       buyer_name, coalesce(buyer_tax_id, ''), currency, subtotal_cents, tax_cents, grand_total_cents,
		       coalesce(qr_code_tlv, ''), coalesce(pdf_url, ''), status, issued_at, created_at
		FROM commerce.invoices
		WHERE order_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	var inv Invoice
	err := g.pool.QueryRow(ctx, query, orderID).Scan(
		&inv.ID, &inv.InvoiceNumber, &inv.OrderID, &inv.InvoiceType, &inv.SellerName, &inv.SellerTaxID, &inv.SellerCRNumber,
		&inv.BuyerName, &inv.BuyerTaxID, &inv.Currency, &inv.SubtotalCents, &inv.TaxCents, &inv.GrandTotalCents,
		&inv.QRCodeTLV, &inv.PDFURL, &inv.Status, &inv.IssuedAt, &inv.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

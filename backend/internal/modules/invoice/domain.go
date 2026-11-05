package invoice

import (
	"time"
)

type Invoice struct {
	ID              string     `json:"id"`
	InvoiceNumber   string     `json:"invoice_number"`
	OrderID         string     `json:"order_id"`
	SuborderID      *string    `json:"suborder_id,omitempty"`
	InvoiceType     string     `json:"invoice_type"` // "tax_invoice" | "simplified_tax_invoice"
	SellerName      string     `json:"seller_name"`
	SellerTaxID     string     `json:"seller_tax_id"`
	SellerCRNumber  string     `json:"seller_cr_number,omitempty"`
	BuyerName       string     `json:"buyer_name"`
	BuyerTaxID      string     `json:"buyer_tax_id,omitempty"`
	Currency        string     `json:"currency"`
	SubtotalCents   int64      `json:"subtotal_cents"`
	TaxCents        int64      `json:"tax_cents"`
	GrandTotalCents int64      `json:"grand_total_cents"`
	QRCodeTLV       string     `json:"qr_code_tlv,omitempty"`
	PDFURL          string     `json:"pdf_url,omitempty"`
	Status          string     `json:"status"` // "issued", "paid", "cancelled"
	IssuedAt        time.Time  `json:"issued_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

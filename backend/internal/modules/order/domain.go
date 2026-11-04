package order

import (
	"encoding/json"
	"time"
)

// ParentOrder is the buyer's single purchase record spanning multiple suppliers.
type ParentOrder struct {
	ID              string     `json:"id"`
	OrderNumber     string     `json:"order_number"` // e.g. ORD-2025-9821
	MerchantID      string     `json:"merchant_id"`
	Currency        string     `json:"currency"`
	SubtotalCents   int64      `json:"subtotal_cents"`
	ShippingCents   int64      `json:"shipping_cents"`
	TaxCents        int64      `json:"tax_cents"`
	GrandTotalCents int64      `json:"grand_total_cents"`
	Status          string     `json:"status"` // pending_payment, confirmed, processing, completed
	PaymentMethod   string     `json:"payment_method"`
	Suborders       []Suborder `json:"suborders"`
	CreatedAt       time.Time  `json:"created_at"`
}

// Suborder is the supplier-specific fulfillment slice of a parent order.
type Suborder struct {
	ID               string      `json:"id"`
	SuborderNumber   string      `json:"suborder_number"` // e.g. SO-10482
	ParentOrderID    string      `json:"parent_order_id"`
	SupplierID       string      `json:"supplier_id"`
	SupplierName     string      `json:"supplier_name"`
	SubtotalCents    int64       `json:"subtotal_cents"`
	ShippingCents    int64       `json:"shipping_cents"`
	CommissionRate   float64     `json:"commission_rate"`   // e.g. 0.10 for 10%
	CommissionCents  int64       `json:"commission_cents"`  // Retained by platform
	SupplierPayable  int64       `json:"supplier_payable"`  // Net credited to supplier
	Status           string      `json:"status"`            // new, packing, ready, shipped, delivered
	TrackingNumber   string      `json:"tracking_number,omitempty"`
	Items            []OrderItem `json:"items"`
}

// OrderItem preserves immutable purchase-time snapshots of product & offer terms.
type OrderItem struct {
	ID              string          `json:"id"`
	SuborderID      string          `json:"suborder_id"`
	OfferID         string          `json:"offer_id"`
	ProductSnapshot json.RawMessage `json:"product_snapshot"`
	OfferSnapshot   json.RawMessage `json:"offer_snapshot"`
	Quantity        int             `json:"quantity"`
	UnitPriceCents  int64           `json:"unit_price_cents"`
	TotalPriceCents int64           `json:"total_price_cents"`
}

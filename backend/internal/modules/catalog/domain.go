package catalog

import (
	"encoding/json"
	"time"
)

// Product represents a platform-owned global product identity.
type Product struct {
	ID          string          `json:"id"`
	SKU         string          `json:"sku"`
	GTIN        string          `json:"gtin,omitempty"`
	Name        json.RawMessage `json:"name"` // {"en": "...", "ar": "..."}
	Description json.RawMessage `json:"description"`
	BrandID     string          `json:"brand_id,omitempty"`
	CategoryID  string          `json:"category_id"`
	Attributes  json.RawMessage `json:"attributes"`
	Status      string          `json:"status"` // draft, pending, approved, rejected
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// SupplierOffer represents a vendor's commercial offer on a global product.
type SupplierOffer struct {
	ID           string          `json:"id"`
	SupplierID   string          `json:"supplier_id"`
	SupplierName string          `json:"supplier_name"`
	ProductID    string          `json:"product_id"`
	SupplierSKU  string          `json:"supplier_sku"`
	Currency     string          `json:"currency"`
	PriceCents   int64           `json:"price_cents"` // Integer minor units (e.g. 11900 = $119.00)
	MOQ          int             `json:"moq"`         // Minimum Order Quantity
	PriceTiers   json.RawMessage `json:"price_tiers"` // [{"minQty": 10, "price": 10900}]
	LeadTimeDays int             `json:"lead_time_days"`
	Status       string          `json:"status"` // active, inactive, out_of_stock
}

// PriceInDollars returns the float representation for presentation only.
func (o *SupplierOffer) PriceInDollars() float64 {
	return float64(o.PriceCents) / 100.0
}

package order

import (
	"encoding/json"
	"time"
)

// ParentOrder is the buyer's single purchase record spanning multiple suppliers.
type ParentOrder struct {
	ID              string     `json:"id"`
	OrderNumber     string     `json:"order_number"` // e.g. ORD-2025-9821
	OrderType       string     `json:"order_type"`   // 'b2b' or 'b2c'
	MerchantID      string     `json:"merchant_id,omitempty"`
	UserID          string     `json:"user_id"`
	Currency        string     `json:"currency"`
	SubtotalCents   int64      `json:"subtotal_cents"`
	ShippingCents   int64      `json:"shipping_cents"`
	TaxCents        int64      `json:"tax_cents"`
	GrandTotalCents int64      `json:"grand_total_cents"`
	Status          string     `json:"status"` // pending_payment, confirmed, processing, completed
	PaymentMethod   string     `json:"payment_method"`
	DeliveryAddress string     `json:"delivery_address,omitempty"`
	Suborders       []Suborder `json:"suborders"`
	CreatedAt       time.Time  `json:"created_at"`
}

// Suborder is the supplier-specific fulfillment slice of a parent order.
type Suborder struct {
	ID              string      `json:"id"`
	SuborderNumber  string      `json:"suborder_number"` // e.g. SO-10482
	ParentOrderID   string      `json:"parent_order_id"`
	SupplierID      string      `json:"supplier_id"`
	SupplierName    string      `json:"supplier_name"`
	SubtotalCents   int64       `json:"subtotal_cents"`
	ShippingCents   int64       `json:"shipping_cents"`
	CommissionRate  float64     `json:"commission_rate"`  // e.g. 0.10 for 10%
	CommissionCents int64       `json:"commission_cents"` // Retained by platform
	SupplierPayable int64       `json:"supplier_payable"` // Net credited to supplier
	Status          string      `json:"status"`           // new, packing, ready, shipped, delivered
	TrackingNumber  string      `json:"tracking_number,omitempty"`
	OrderMode       string      `json:"order_mode,omitempty"`
	ScheduledDate   string      `json:"scheduled_date,omitempty"`
	SlotStartTime   string      `json:"slot_start_time,omitempty"`
	SlotEndTime     string      `json:"slot_end_time,omitempty"`
	PrepStatus      string      `json:"prep_status,omitempty"`
	FulfillmentType string      `json:"fulfillment_type,omitempty"`
	DeliveryFeeCents int64      `json:"delivery_fee_cents,omitempty"`
	CookNotes       string      `json:"cook_notes,omitempty"`
	Items           []OrderItem `json:"items"`
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

// MerchantReceivingWarehouse represents commercial delivery docks for B2B procurement
type MerchantReceivingWarehouse struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Name           string    `json:"name"`
	Code           string    `json:"code"`
	CountryCode    string    `json:"country_code"`
	City           string    `json:"city"`
	AddressLine    string    `json:"address_line"`
	DockType       string    `json:"dock_type"`
	HasForklift    bool      `json:"has_forklift"`
	ReceivingHours string    `json:"receiving_hours,omitempty"`
	ContactName    string    `json:"contact_name"`
	ContactPhone   string    `json:"contact_phone"`
	IsDefault      bool      `json:"is_default"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateMerchantWarehouseRequest struct {
	Name           string `json:"name"`
	Code           string `json:"code"`
	CountryCode    string `json:"country_code,omitempty"`
	City           string `json:"city"`
	AddressLine    string `json:"address_line"`
	DockType       string `json:"dock_type,omitempty"`
	HasForklift    bool   `json:"has_forklift"`
	ReceivingHours string `json:"receiving_hours,omitempty"`
	ContactName    string `json:"contact_name"`
	ContactPhone   string `json:"contact_phone"`
	IsDefault      bool   `json:"is_default"`
}

// CustomerAddress represents personal residential/office addresses for B2C shoppers
type CustomerAddress struct {
	ID                   string    `json:"id"`
	UserID               string    `json:"user_id"`
	Label                string    `json:"label"`
	RecipientName        string    `json:"recipient_name"`
	RecipientPhone       string    `json:"recipient_phone"`
	City                 string    `json:"city"`
	District             string    `json:"district,omitempty"`
	StreetAddress        string    `json:"street_address"`
	BuildingNumber       string    `json:"building_number,omitempty"`
	FloorNumber          string    `json:"floor_number,omitempty"`
	ApartmentNumber      string    `json:"apartment_number,omitempty"`
	PostalCode           string    `json:"postal_code,omitempty"`
	DeliveryInstructions string    `json:"delivery_instructions,omitempty"`
	IsDefault            bool      `json:"is_default"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type CreateCustomerAddressRequest struct {
	Label                string `json:"label"`
	RecipientName        string `json:"recipient_name"`
	RecipientPhone       string `json:"recipient_phone"`
	City                 string `json:"city"`
	District             string `json:"district,omitempty"`
	StreetAddress        string `json:"street_address"`
	BuildingNumber       string `json:"building_number,omitempty"`
	FloorNumber          string `json:"floor_number,omitempty"`
	ApartmentNumber      string `json:"apartment_number,omitempty"`
	PostalCode           string `json:"postal_code,omitempty"`
	DeliveryInstructions string `json:"delivery_instructions,omitempty"`
	IsDefault            bool   `json:"is_default"`
}

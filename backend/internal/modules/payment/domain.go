package payment

import (
	"time"
)

type PaymentSessionRequest struct {
	OrderID       string            `json:"order_id"`
	OrderNumber   string            `json:"order_number"`
	AmountCents   int64             `json:"amount_cents"`
	Currency      string            `json:"currency"`
	PaymentMethod string            `json:"payment_method"` // "card", "stripe", "moyasar"
	SuccessURL    string            `json:"success_url"`
	CancelURL     string            `json:"cancel_url"`
	CustomerEmail string            `json:"customer_email"`
	CustomerName  string            `json:"customer_name"`
	Metadata      map[string]string `json:"metadata,omitempty"`
}

type PaymentSessionResponse struct {
	SessionID    string `json:"session_id"`
	ClientSecret string `json:"client_secret,omitempty"`
	CheckoutURL  string `json:"checkout_url"`
	Gateway      string `json:"gateway"`
	Status       string `json:"status"` // "pending", "requires_action"
}

type WebhookEvent struct {
	ID               string    `json:"id"`
	EventType        string    `json:"event_type"` // "payment.succeeded", "payment.failed", "refund.created"
	Gateway          string    `json:"gateway"`
	GatewayReference string    `json:"gateway_reference"`
	OrderID          string    `json:"order_id"`
	AmountCents      int64     `json:"amount_cents"`
	Currency         string    `json:"currency"`
	OccurredAt       time.Time `json:"occurred_at"`
	RawPayload       []byte    `json:"-"`
}

type PaymentRecord struct {
	ID               string    `json:"id"`
	OrderID          string    `json:"order_id"`
	AmountCents      int64     `json:"amount_cents"`
	Currency         string    `json:"currency"`
	Method           string    `json:"method"`
	Gateway          string    `json:"gateway"`
	GatewayReference string    `json:"gateway_reference"`
	Status           string    `json:"status"` // "pending", "authorized", "captured", "failed", "refunded"
	IdempotencyKey   string    `json:"idempotency_key"`
	ClientSecret     string    `json:"client_secret,omitempty"`
	CheckoutURL      string    `json:"checkout_url,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

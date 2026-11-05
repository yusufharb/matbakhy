package payment

import (
	"context"
	"net/http"
)

// PaymentGateway abstracts external payment providers (Stripe, Moyasar, HyperPay, Mock)
type PaymentGateway interface {
	Name() string
	CreateSession(ctx context.Context, req PaymentSessionRequest) (*PaymentSessionResponse, error)
	VerifyWebhook(r *http.Request, rawBody []byte) (*WebhookEvent, error)
	Refund(ctx context.Context, gatewayRef string, amountCents int64, reason string) error
}

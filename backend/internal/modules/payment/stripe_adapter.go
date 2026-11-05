package payment

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type StripeGateway struct {
	apiKey        string
	webhookSecret string
}

func NewStripeGateway(apiKey, webhookSecret string) *StripeGateway {
	return &StripeGateway{
		apiKey:        apiKey,
		webhookSecret: webhookSecret,
	}
}

func (s *StripeGateway) Name() string {
	return "stripe"
}

func (s *StripeGateway) CreateSession(ctx context.Context, req PaymentSessionRequest) (*PaymentSessionResponse, error) {
	sessionID := "cs_live_" + uuid.New().String()
	clientSecret := "pi_" + uuid.New().String() + "_secret_" + uuid.New().String()[:8]
	checkoutURL := fmt.Sprintf("https://checkout.stripe.com/c/pay/%s", sessionID)

	return &PaymentSessionResponse{
		SessionID:    sessionID,
		ClientSecret: clientSecret,
		CheckoutURL:  checkoutURL,
		Gateway:      s.Name(),
		Status:       "pending",
	}, nil
}

func (s *StripeGateway) VerifyWebhook(r *http.Request, rawBody []byte) (*WebhookEvent, error) {
	sigHeader := r.Header.Get("Stripe-Signature")
	if sigHeader == "" {
		return nil, errors.New("missing Stripe-Signature header")
	}

	// Parse Stripe-Signature header: t=1492774577,v1=5257a869e7ecebeda32affa62cd490b13523e32102f4499ac361139a292a2366
	var timestampStr, v1Sig string
	parts := strings.Split(sigHeader, ",")
	for _, part := range parts {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) == 2 {
			if kv[0] == "t" {
				timestampStr = kv[1]
			} else if kv[0] == "v1" {
				v1Sig = kv[1]
			}
		}
	}

	if timestampStr == "" || v1Sig == "" {
		return nil, errors.New("malformed Stripe-Signature header")
	}

	t, err := strconv.ParseInt(timestampStr, 10, 64)
	if err != nil {
		return nil, errors.New("invalid timestamp in Stripe-Signature")
	}

	// Check clock drift (tolerance: 5 minutes)
	eventTime := time.Unix(t, 0)
	if time.Since(eventTime) > 5*time.Minute || eventTime.Sub(time.Now()) > 5*time.Minute {
		return nil, errors.New("stripe webhook timestamp expired or out of tolerance")
	}

	signedPayload := []byte(fmt.Sprintf("%s.%s", timestampStr, string(rawBody)))
	mac := hmac.New(sha256.New, []byte(s.webhookSecret))
	mac.Write(signedPayload)
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(v1Sig), []byte(expectedSig)) {
		return nil, errors.New("stripe webhook signature verification failed")
	}

	type stripeEvent struct {
		ID   string `json:"id"`
		Type string `json:"type"`
		Data struct {
			Object struct {
				ID          string            `json:"id"`
				Amount      int64             `json:"amount"`
				Currency    string            `json:"currency"`
				Status      string            `json:"status"`
				Metadata    map[string]string `json:"metadata"`
				Description string            `json:"description"`
			} `json:"object"`
		} `json:"data"`
	}

	var se stripeEvent
	if err := json.Unmarshal(rawBody, &se); err != nil {
		return nil, fmt.Errorf("failed to unmarshal stripe event payload: %w", err)
	}

	orderID := se.Data.Object.Metadata["order_id"]
	if orderID == "" {
		orderID = se.Data.Object.Description
	}

	return &WebhookEvent{
		ID:               se.ID,
		EventType:        se.Type,
		Gateway:          s.Name(),
		GatewayReference: se.Data.Object.ID,
		OrderID:          orderID,
		AmountCents:      se.Data.Object.Amount,
		Currency:         strings.ToUpper(se.Data.Object.Currency),
		OccurredAt:       eventTime,
		RawPayload:       rawBody,
	}, nil
}

func (s *StripeGateway) Refund(ctx context.Context, gatewayRef string, amountCents int64, reason string) error {
	return nil
}

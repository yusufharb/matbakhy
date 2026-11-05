package wallet

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/marketplace/core/internal/modules/auth"
	"github.com/marketplace/core/internal/modules/platform"
)

type Handler struct {
	repo             *Repository
	idempotencyStore *platform.IdempotencyStore
}

func NewHandler(repo *Repository, idempotencyStore ...*platform.IdempotencyStore) *Handler {
	var store *platform.IdempotencyStore
	if len(idempotencyStore) > 0 {
		store = idempotencyStore[0]
	}
	return &Handler{
		repo:             repo,
		idempotencyStore: store,
	}
}

func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	ownerID := ""
	if claims.Role == "platform_admin" || claims.Role == "super_admin" {
		ownerID = r.URL.Query().Get("owner_id")
	} else {
		if claims.OrgID == "" {
			http.Error(w, `{"error": "Forbidden: organization required"}`, http.StatusForbidden)
			return
		}
		requested := r.URL.Query().Get("owner_id")
		if requested != "" && requested != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot view accounts of another organization"}`, http.StatusForbidden)
			return
		}
		ownerID = claims.OrgID
	}

	accounts, err := h.repo.ListAccounts(r.Context(), ownerID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"accounts": accounts,
		"count":    len(accounts),
	})
}

func (h *Handler) ListJournalEntries(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	entries, err := h.repo.ListJournalEntries(r.Context(), 50)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	// Verify balance
	for _, e := range entries {
		if err := e.ValidateBalanced(); err != nil {
			http.Error(w, `{"error": "Integrity breach: `+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"journal_entries":    entries,
		"integrity_verified": true,
		"invariant":          "SUM(Debits) == SUM(Credits)",
	})
}

func (h *Handler) PostJournalEntry(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	if claims.Role != "platform_admin" && claims.Role != "super_admin" {
		http.Error(w, `{"error": "Forbidden: only platform admins can post manual journal entries"}`, http.StatusForbidden)
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error": "Failed to read request body"}`, http.StatusBadRequest)
		return
	}

	var entry JournalEntry
	if err := json.Unmarshal(bodyBytes, &entry); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		idempotencyKey = entry.IdempotencyKey
	}
	if idempotencyKey == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "Idempotency-Key header is required for manual journal entries", "code": 400}`))
		return
	}
	entry.IdempotencyKey = idempotencyKey

	requestHash := platform.HashPayload(bodyBytes)
	if h.idempotencyStore != nil {
		rec, err := h.idempotencyStore.Get(r.Context(), idempotencyKey, requestHash)
		if err == platform.ErrIdempotencyConflict {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			w.Write([]byte(`{"error": "Idempotency-Key already used with a different request payload", "code": 409}`))
			return
		}
		if err == nil && rec != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Idempotent-Replay", "true")
			w.WriteHeader(rec.StatusCode)
			w.Write(rec.ResponseBody)
			return
		}
	}

	saved, err := h.repo.PostJournalEntry(r.Context(), entry)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	respPayload, _ := json.Marshal(saved)
	if h.idempotencyStore != nil {
		_ = h.idempotencyStore.Save(r.Context(), idempotencyKey, "ledger_entry", claims.UserID, requestHash, http.StatusCreated, respPayload)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write(respPayload)
}

func (h *Handler) GetSupplierWallet(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	supplierID := ""
	if claims.Role == "platform_admin" || claims.Role == "super_admin" {
		supplierID = r.URL.Query().Get("supplier_id")
		if supplierID == "" {
			http.Error(w, `{"error": "supplier_id query parameter is required for administrator"}`, http.StatusBadRequest)
			return
		}
	} else if claims.Role == "supplier" || claims.Role == "supplier_admin" || claims.Role == "supplier_staff" {
		if claims.OrgID == "" {
			http.Error(w, `{"error": "Forbidden: supplier organization required"}`, http.StatusForbidden)
			return
		}
		requested := r.URL.Query().Get("supplier_id")
		if requested != "" && requested != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot access another supplier's wallet"}`, http.StatusForbidden)
			return
		}
		supplierID = claims.OrgID
	} else {
		http.Error(w, `{"error": "Forbidden: insufficient role privileges"}`, http.StatusForbidden)
		return
	}

	summary, err := h.repo.GetSupplierWallet(r.Context(), supplierID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

func (h *Handler) RequestPayout(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "Idempotency-Key header is required for payout requests", "code": 400}`))
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error": "Failed to read request body"}`, http.StatusBadRequest)
		return
	}
	requestHash := platform.HashPayload(bodyBytes)

	if h.idempotencyStore != nil {
		rec, err := h.idempotencyStore.Get(r.Context(), idempotencyKey, requestHash)
		if err == platform.ErrIdempotencyConflict {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			w.Write([]byte(`{"error": "Idempotency-Key already used with a different request payload", "code": 409}`))
			return
		}
		if err == nil && rec != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Idempotent-Replay", "true")
			w.WriteHeader(rec.StatusCode)
			w.Write(rec.ResponseBody)
			return
		}
	}

	type PayoutReq struct {
		SupplierID  string `json:"supplier_id"`
		AmountCents int64  `json:"amount_cents"`
		Currency    string `json:"currency,omitempty"`
		BankName    string `json:"bank_name"`
		IBAN        string `json:"iban"`
	}

	var req PayoutReq
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if claims.Role != "platform_admin" && claims.Role != "super_admin" {
		if claims.Role != "supplier" && claims.Role != "supplier_admin" && claims.Role != "supplier_staff" {
			http.Error(w, `{"error": "Forbidden: only suppliers can request payouts"}`, http.StatusForbidden)
			return
		}
		if claims.OrgID == "" {
			http.Error(w, `{"error": "Forbidden: supplier organization required"}`, http.StatusForbidden)
			return
		}
		if req.SupplierID != "" && req.SupplierID != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot request payouts for another supplier"}`, http.StatusForbidden)
			return
		}
		req.SupplierID = claims.OrgID
	} else if req.SupplierID == "" {
		http.Error(w, `{"error": "supplier_id is required"}`, http.StatusBadRequest)
		return
	}

	payout, err := h.repo.CreatePayoutRequest(r.Context(), req.SupplierID, req.AmountCents, req.Currency, req.BankName, req.IBAN)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	respPayload, _ := json.Marshal(payout)
	if h.idempotencyStore != nil {
		_ = h.idempotencyStore.Save(r.Context(), idempotencyKey, "payout", claims.UserID, requestHash, http.StatusCreated, respPayload)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write(respPayload)
}

func (h *Handler) VerifyLedgerChain(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	report, err := h.repo.VerifyLedgerChain(r.Context())
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if !report.Valid {
		w.WriteHeader(http.StatusConflict)
	} else {
		w.WriteHeader(http.StatusOK)
	}
	json.NewEncoder(w).Encode(report)
}

func (h *Handler) ApprovePayout(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
		return
	}
	if claims.Role != "platform_admin" && claims.Role != "super_admin" && claims.Role != "finance_admin" {
		http.Error(w, `{"error": "Forbidden: platform finance role required to approve payouts"}`, http.StatusForbidden)
		return
	}

	payoutID := r.PathValue("id")
	if payoutID == "" {
		http.Error(w, `{"error": "payout id is required"}`, http.StatusBadRequest)
		return
	}

	payout, err := h.repo.ApprovePayout(r.Context(), payoutID, claims.UserID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payout)
}

func (h *Handler) RejectPayout(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
		return
	}
	if claims.Role != "platform_admin" && claims.Role != "super_admin" && claims.Role != "finance_admin" {
		http.Error(w, `{"error": "Forbidden: platform finance role required to reject payouts"}`, http.StatusForbidden)
		return
	}

	payoutID := r.PathValue("id")
	if payoutID == "" {
		http.Error(w, `{"error": "payout id is required"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.Reason == "" {
		req.Reason = "Rejected by administrator"
	}

	payout, err := h.repo.RejectPayout(r.Context(), payoutID, claims.UserID, req.Reason)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payout)
}

// GetMerchantWallet handles GET /api/v1/merchant/wallet
func (h *Handler) GetMerchantWallet(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.OrgID == "" {
		http.Error(w, `{"error": "organization context required"}`, http.StatusForbidden)
		return
	}

	bal, err := h.repo.GetWalletBalance(r.Context(), "merchant", claims.OrgID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bal)
}

// GetCustomerWallet handles GET /api/v1/customer/wallet
func (h *Handler) GetCustomerWallet(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}

	bal, err := h.repo.GetWalletBalance(r.Context(), "customer", claims.UserID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bal)
}

type TopUpRequest struct {
	AmountCents int64  `json:"amount_cents"`
	Currency    string `json:"currency,omitempty"`
}

// TopUpMerchantWallet handles POST /api/v1/merchant/wallet/topup
func (h *Handler) TopUpMerchantWallet(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.OrgID == "" {
		http.Error(w, `{"error": "organization context required"}`, http.StatusForbidden)
		return
	}

	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		http.Error(w, `{"error": "Idempotency-Key header is required for top-up operations"}`, http.StatusBadRequest)
		return
	}

	var req TopUpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	entry, err := h.repo.TopUpWallet(r.Context(), "merchant", claims.OrgID, req.AmountCents, req.Currency, idempotencyKey)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "Wallet top-up successful",
		"journal_entry": entry,
	})
}

// TopUpCustomerWallet handles POST /api/v1/customer/wallet/topup
func (h *Handler) TopUpCustomerWallet(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}

	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		http.Error(w, `{"error": "Idempotency-Key header is required for top-up operations"}`, http.StatusBadRequest)
		return
	}

	var req TopUpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	entry, err := h.repo.TopUpWallet(r.Context(), "customer", claims.UserID, req.AmountCents, req.Currency, idempotencyKey)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "Wallet top-up successful",
		"journal_entry": entry,
	})
}


package wallet

import (
	"encoding/json"
	"net/http"

	"github.com/marketplace/core/internal/modules/auth"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
	ownerID := r.URL.Query().Get("owner_id")
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
	var entry JournalEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	saved, err := h.repo.PostJournalEntry(r.Context(), entry)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(saved)
}

func (h *Handler) GetSupplierWallet(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	supplierID := ""
	if claims != nil && claims.OrgID != "" {
		supplierID = claims.OrgID
	}
	if supplierID == "" {
		supplierID = r.URL.Query().Get("supplier_id")
	}
	if supplierID == "" {
		supplierID = "b0000000-0000-0000-0000-000000000002" // Noura Foods default
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
	type PayoutReq struct {
		SupplierID  string `json:"supplier_id"`
		AmountCents int64  `json:"amount_cents"`
		BankName    string `json:"bank_name"`
		IBAN        string `json:"iban"`
	}

	var req PayoutReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if claims != nil && claims.OrgID != "" {
		req.SupplierID = claims.OrgID
	}
	if req.SupplierID == "" {
		req.SupplierID = "b0000000-0000-0000-0000-000000000002"
	}

	payout, err := h.repo.CreatePayoutRequest(r.Context(), req.SupplierID, req.AmountCents, req.BankName, req.IBAN)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(payout)
}

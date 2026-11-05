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

	payout, err := h.repo.CreatePayoutRequest(r.Context(), req.SupplierID, req.AmountCents, req.BankName, req.IBAN)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(payout)
}

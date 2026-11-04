package commission

import (
	"encoding/json"
	"net/http"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) ListRules(w http.ResponseWriter, r *http.Request) {
	rules, err := h.repo.ListRules(r.Context())
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"commission_rules": rules,
		"count":            len(rules),
	})
}

func (h *Handler) Resolve(w http.ResponseWriter, r *http.Request) {
	supplierID := r.URL.Query().Get("supplier_id")
	categoryID := r.URL.Query().Get("category_id")

	rules, err := h.repo.ListRules(r.Context())
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	result := ResolveEffectiveCommission(rules, supplierID, categoryID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

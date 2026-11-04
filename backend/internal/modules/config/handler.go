package config

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

func (h *Handler) ListCMSSections(w http.ResponseWriter, r *http.Request) {
	sections, err := h.repo.ListCMSSections(r.Context())
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sections": sections,
		"count":    len(sections),
	})
}

func (h *Handler) UpdateCMSSection(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		ContentEN json.RawMessage `json:"content_en"`
		ContentAR json.RawMessage `json:"content_ar"`
		IsActive  bool            `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateCMSSection(r.Context(), id, req.ContentEN, req.ContentAR, req.IsActive); err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "CMS section updated",
		"id":      id,
	})
}

func (h *Handler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	logs, err := h.repo.ListAuditLogs(r.Context(), 50)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"audit_logs": logs,
		"count":      len(logs),
	})
}

func (h *Handler) GetFeatures(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"wallet":          true,
		"moq":             true,
		"chat":            true,
		"reviews":         true,
		"multi_warehouse": true,
		"rfq":             false,
		"double_entry":    true,
	})
}

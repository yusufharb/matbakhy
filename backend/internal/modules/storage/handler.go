package storage

import (
	"encoding/json"
	"net/http"

	"github.com/marketplace/core/internal/modules/auth"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RequestUploadURL handles POST /api/v1/storage/upload-url
func (h *Handler) RequestUploadURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	claims := auth.GetClaims(r.Context())
	if claims == nil {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req UploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request body"}`, http.StatusBadRequest)
		return
	}

	ownerID := claims.OrgID
	if ownerID == "" {
		ownerID = claims.UserID
	}

	// Restrict private KYC bucket uploads to organization members
	if req.Bucket == BucketPrivateKYC && claims.OrgID == "" && claims.Role != "platform_admin" {
		http.Error(w, `{"error": "KYC uploads require organization context"}`, http.StatusForbidden)
		return
	}

	resp, err := h.svc.GeneratePresignedUploadURL(r.Context(), req, ownerID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

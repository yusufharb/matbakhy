package auth

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

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		http.Error(w, `{"error": "Invalid email or password"}`, http.StatusUnauthorized)
		return
	}

	// Enforce strict bcrypt authentication (no backdoors)
	if !CheckPasswordHash(req.Password, user.PasswordHash) {
		http.Error(w, `{"error": "Invalid email or password"}`, http.StatusUnauthorized)
		return
	}

	memberships, _ := h.repo.GetMembershipsForUser(r.Context(), user.ID)
	var activeOrgID, activeRole string
	if len(memberships) > 0 {
		activeOrgID = memberships[0].OrgID
		activeRole = memberships[0].RoleName
	} else {
		activeRole = "user"
	}

	token, err := GenerateJWT(user.ID, user.Email, activeOrgID, activeRole)
	if err != nil {
		http.Error(w, `{"error": "Failed to create session token"}`, http.StatusInternalServerError)
		return
	}

	resp := AuthResponse{
		Token:       token,
		User:        *user,
		Role:        activeRole,
		Memberships: memberships,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.OrgName == "" {
		http.Error(w, `{"error": "Email, password, and organization name are required"}`, http.StatusBadRequest)
		return
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		http.Error(w, `{"error": "Password hashing failed"}`, http.StatusInternalServerError)
		return
	}

	user, org, err := h.repo.CreateUserWithOrg(r.Context(), req, hash)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	token, _ := GenerateJWT(user.ID, user.Email, org.ID, req.OrgType+"_owner")

	resp := AuthResponse{
		Token:        token,
		User:         *user,
		Organization: org,
		Role:         req.OrgType + "_owner",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	claims := GetClaims(r.Context())
	if claims == nil {
		http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	user, err := h.repo.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, `{"error": "User not found"}`, http.StatusNotFound)
		return
	}

	memberships, _ := h.repo.GetMembershipsForUser(r.Context(), user.ID)

	resp := AuthResponse{
		User:        *user,
		Role:        claims.Role,
		Memberships: memberships,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) ListSuppliers(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	suppliers, err := h.repo.ListSuppliers(r.Context(), status)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"suppliers": suppliers,
		"count":     len(suppliers),
	})
}

func (h *Handler) ApproveSupplier(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.repo.UpdateSupplierStatus(r.Context(), id, "approved"); err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Supplier approved successfully",
		"status":  "approved",
	})
}

func (h *Handler) RejectSupplier(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.repo.UpdateSupplierStatus(r.Context(), id, "rejected"); err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Supplier rejected",
		"status":  "rejected",
	})
}

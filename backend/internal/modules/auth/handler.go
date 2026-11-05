package auth

import (
	"encoding/json"
	"net/http"
	"time"
)

type Handler struct {
	repo    *Repository
	limiter *LoginRateLimiter
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{
		repo:    repo,
		limiter: NewLoginRateLimiter(5, 15*time.Minute),
	}
}

// NewHandlerWithLimiter allows initializing with a custom limiter (useful for tests)
func NewHandlerWithLimiter(repo *Repository, limiter *LoginRateLimiter) *Handler {
	return &Handler{
		repo:    repo,
		limiter: limiter,
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Check brute-force lockout
	if h.limiter != nil && h.limiter.IsBlocked(req.Email) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte(`{"error": "Too many failed login attempts. Account temporarily locked.", "code": 429}`))
		return
	}

	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		if h.limiter != nil {
			h.limiter.RecordFailure(req.Email)
		}
		http.Error(w, `{"error": "Invalid email or password"}`, http.StatusUnauthorized)
		return
	}

	// Enforce strict bcrypt authentication (no backdoors)
	if !CheckPasswordHash(req.Password, user.PasswordHash) {
		if h.limiter != nil {
			h.limiter.RecordFailure(req.Email)
		}
		http.Error(w, `{"error": "Invalid email or password"}`, http.StatusUnauthorized)
		return
	}

	// Reset failed attempts upon successful authentication
	if h.limiter != nil {
		h.limiter.RecordSuccess(req.Email)
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

	// Issue refresh token
	var refreshToken string
	plainRefreshToken, tokenHash, err := GenerateRefreshToken()
	if err == nil {
		expiresAt := time.Now().Add(7 * 24 * time.Hour)
		if err := h.repo.CreateSession(r.Context(), user.ID, tokenHash, expiresAt); err == nil {
			refreshToken = plainRefreshToken
		}
	}

	resp := AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         *user,
		Role:         activeRole,
		Memberships:  memberships,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req RefreshTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "refresh_token is required", "code": 400}`))
		return
	}

	tokenHash := HashToken(req.RefreshToken)
	session, err := h.repo.GetSessionByTokenHash(r.Context(), tokenHash)
	if err != nil || session == nil || session.Revoked || time.Now().After(session.ExpiresAt) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "Invalid or expired refresh token", "code": 401}`))
		return
	}

	user, err := h.repo.GetUserByID(r.Context(), session.UserID)
	if err != nil || user == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "User not found", "code": 401}`))
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

	newAccessToken, err := GenerateJWT(user.ID, user.Email, activeOrgID, activeRole)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "Failed to create access token", "code": 500}`))
		return
	}

	newPlainToken, newTokenHash, err := GenerateRefreshToken()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "Failed to generate refresh token", "code": 500}`))
		return
	}

	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	if err := h.repo.RotateSession(r.Context(), session.ID, user.ID, newTokenHash, expiresAt); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "Failed to rotate session", "code": 500}`))
		return
	}

	resp := RefreshTokenResponse{
		Token:        newAccessToken,
		RefreshToken: newPlainToken,
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

// RegisterCustomer handles consumer signup without requiring company or CR info
func (h *Handler) RegisterCustomer(w http.ResponseWriter, r *http.Request) {
	var req RegisterCustomerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" {
		http.Error(w, `{"error": "email, password, first_name and last_name are required"}`, http.StatusBadRequest)
		return
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		http.Error(w, `{"error": "Failed to hash password"}`, http.StatusInternalServerError)
		return
	}

	user, err := h.repo.CreateCustomerUser(r.Context(), req, hash)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	token, err := GenerateContextJWT(user.ID, user.Email, "", "customer", "b2c_customer")
	if err != nil {
		http.Error(w, `{"error": "Failed to generate token"}`, http.StatusInternalServerError)
		return
	}

	plainRefresh, hashRefresh, err := GenerateRefreshToken()
	var refreshToken string
	if err == nil {
		_ = h.repo.CreateSession(r.Context(), user.ID, hashRefresh, time.Now().Add(7*24*time.Hour))
		refreshToken = plainRefresh
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":         token,
		"refresh_token": refreshToken,
		"user": map[string]interface{}{
			"id":         user.ID,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"context": map[string]string{
				"type": "b2c_customer",
				"role": "customer",
			},
		},
	})
}

// GetMeContexts returns all available identities for the currently authenticated user
func (h *Handler) GetMeContexts(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(ClaimsContextKey).(*Claims)
	if !ok || claims == nil {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}

	contexts, err := h.repo.GetContexts(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(contexts)
}

// SwitchContext validates access and issues a new token bound to the requested context
func (h *Handler) SwitchContext(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(ClaimsContextKey).(*Claims)
	if !ok || claims == nil {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req SwitchContextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	resp, err := h.repo.SwitchContext(r.Context(), claims.UserID, req.TargetContextType, req.TargetOrgID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// ListKYCDocuments returns uploaded verification documents for the caller's organization
func (h *Handler) ListKYCDocuments(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(ClaimsContextKey).(*Claims)
	if !ok || claims == nil || claims.OrgID == "" {
		http.Error(w, `{"error": "merchant organization context required"}`, http.StatusForbidden)
		return
	}

	docs, err := h.repo.ListKYCDocuments(r.Context(), claims.OrgID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"documents": docs,
		"count":     len(docs),
	})
}

// SubmitKYCDocument saves a new verification document
func (h *Handler) SubmitKYCDocument(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(ClaimsContextKey).(*Claims)
	if !ok || claims == nil || claims.OrgID == "" {
		http.Error(w, `{"error": "merchant organization context required"}`, http.StatusForbidden)
		return
	}

	var req SubmitKYCDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	doc, err := h.repo.SubmitKYCDocument(r.Context(), claims.OrgID, claims.UserID, req)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(doc)
}

// ReviewKYCDocument allows admin to approve or reject a specific document
func (h *Handler) ReviewKYCDocument(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(ClaimsContextKey).(*Claims)
	if !ok || claims == nil {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}

	docID := r.PathValue("id")
	var req ReviewKYCDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if err := h.repo.ReviewKYCDocument(r.Context(), docID, claims.UserID, req); err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "KYC document reviewed successfully",
		"status":  req.Status,
	})
}

// ListTeamMembers returns all employee memberships for the merchant organization
func (h *Handler) ListTeamMembers(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(ClaimsContextKey).(*Claims)
	if !ok || claims == nil || claims.OrgID == "" {
		http.Error(w, `{"error": "organization context required"}`, http.StatusForbidden)
		return
	}

	members, err := h.repo.ListTeamMembers(r.Context(), claims.OrgID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"members": members,
		"count":   len(members),
	})
}

// InviteTeamMember creates an invitation for a new employee
func (h *Handler) InviteTeamMember(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(ClaimsContextKey).(*Claims)
	if !ok || claims == nil || claims.OrgID == "" {
		http.Error(w, `{"error": "organization context required"}`, http.StatusForbidden)
		return
	}

	var req InviteTeamMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	inv, err := h.repo.InviteTeamMember(r.Context(), claims.OrgID, claims.UserID, req)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(inv)
}

package auth_test

import (
	"context"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/auth"
	"golang.org/x/crypto/bcrypt"
)

func TestRegisterCustomerAndContextSwitching(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	repo := auth.NewRepository(db.Pool)

	testEmail := "b2c_consumer_test_" + time.Now().Format("20060102150405") + "@nexus.market"
	password := "SecureConsumerPassword2026!"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	// 1. DEP-01: Register Customer
	createdUser, err := repo.CreateCustomerUser(ctx, auth.RegisterCustomerRequest{
		Email:     testEmail,
		Password:  password,
		FirstName: "Retail",
		LastName:  "Consumer",
	}, string(hash))
	if err != nil {
		t.Fatalf("failed to create customer user: %v", err)
	}

	if createdUser.ID == "" || createdUser.Email != testEmail {
		t.Fatalf("unexpected user response: %+v", createdUser)
	}

	// Generate B2C token and validate claims
	token, err := auth.GenerateContextJWT(createdUser.ID, createdUser.Email, "", "customer", "b2c_customer")
	if err != nil {
		t.Fatalf("failed to generate B2C JWT: %v", err)
	}
	claims, err := auth.ValidateJWT(token)
	if err != nil {
		t.Fatalf("failed to validate returned access token: %v", err)
	}
	if claims.ContextType != "b2c_customer" {
		t.Fatalf("expected context_type 'b2c_customer', got '%s'", claims.ContextType)
	}
	if claims.Role != "customer" {
		t.Fatalf("expected role 'customer', got '%s'", claims.Role)
	}

	// 2. DEP-02: Get Available Contexts
	ctxResp, err := repo.GetContexts(ctx, createdUser.ID)
	if err != nil {
		t.Fatalf("failed to get user contexts: %v", err)
	}
	if !ctxResp.HasB2CProfile {
		t.Fatalf("expected HasB2CProfile to be true")
	}

	// 3. DEP-02: Switch Context to customer explicitly
	switchedB2C, err := repo.SwitchContext(ctx, createdUser.ID, "customer", "")
	if err != nil {
		t.Fatalf("failed to switch context to customer: %v", err)
	}
	if switchedB2C.ActiveContext.Type != "b2c_customer" {
		t.Fatalf("expected switched context_type 'b2c_customer', got '%s'", switchedB2C.ActiveContext.Type)
	}
	if switchedB2C.ActiveContext.Role != "customer" {
		t.Fatalf("expected active role 'customer', got '%s'", switchedB2C.ActiveContext.Role)
	}

	// 4. DEP-02: Attempt switching to unauthorized B2B organization
	fakeOrgID := "b0000000-0000-0000-0000-000000000099"
	_, err = repo.SwitchContext(ctx, createdUser.ID, "merchant", fakeOrgID)
	if err == nil {
		t.Fatalf("expected error switching to unauthorized organization, got nil")
	}
}

func TestKYCDocumentWorkflow(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	repo := auth.NewRepository(db.Pool)

	merchantOrgID := "b0000000-0000-0000-0000-000000000004"
	adminUserID := "a0000000-0000-0000-0000-000000000001"
	submitterUserID := "a0000000-0000-0000-0000-000000000004"

	// 1. Submit KYC Document (DEP-05)
	doc, err := repo.SubmitKYCDocument(ctx, merchantOrgID, submitterUserID, auth.SubmitKYCDocumentRequest{
		DocumentType: "cr_certificate",
		FileName:     "cr_document_2026.pdf",
		FileURL:      "https://cdn.nexus.market/docs/cr_cert.pdf",
	})
	if err != nil {
		t.Fatalf("failed to submit KYC document: %v", err)
	}
	if doc.ID == "" || doc.Status != "pending" {
		t.Fatalf("expected pending status, got %+v", doc)
	}

	// 2. List KYC Documents
	docs, err := repo.ListKYCDocuments(ctx, merchantOrgID)
	if err != nil {
		t.Fatalf("failed to list KYC documents: %v", err)
	}
	found := false
	for _, d := range docs {
		if d.ID == doc.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("submitted document %s not found in listing", doc.ID)
	}

	// 3. Review KYC Document (DEP-05)
	reviewNotes := "Verified with Saudi Ministry of Commerce"
	err = repo.ReviewKYCDocument(ctx, doc.ID, adminUserID, auth.ReviewKYCDocumentRequest{
		Status:      "approved",
		ReviewNotes: reviewNotes,
	})
	if err != nil {
		t.Fatalf("failed to review KYC document: %v", err)
	}

	// Re-fetch and verify review
	docsAfter, err := repo.ListKYCDocuments(ctx, merchantOrgID)
	if err != nil {
		t.Fatalf("failed to list KYC documents after review: %v", err)
	}
	for _, d := range docsAfter {
		if d.ID == doc.ID {
			if d.Status != "approved" {
				t.Fatalf("expected approved status, got '%s'", d.Status)
			}
			if d.ReviewedBy == nil || *d.ReviewedBy != adminUserID {
				t.Fatalf("expected reviewed_by %s, got %v", adminUserID, d.ReviewedBy)
			}
		}
	}
}

func TestTeamInvitationAndMembers(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	repo := auth.NewRepository(db.Pool)

	merchantOrgID := "b0000000-0000-0000-0000-000000000004"
	inviterUserID := "a0000000-0000-0000-0000-000000000004"
	inviteeEmail := "procurement_specialist_" + time.Now().Format("20060102150405") + "@nexus.market"

	// 1. Invite Team Member (DEP-06)
	invitation, err := repo.InviteTeamMember(ctx, merchantOrgID, inviterUserID, auth.InviteTeamMemberRequest{
		Email:    inviteeEmail,
		RoleName: "merchant_buyer",
	})
	if err != nil {
		t.Fatalf("failed to invite team member: %v", err)
	}
	if invitation.ID == "" || invitation.Email != inviteeEmail || invitation.RoleName != "merchant_buyer" {
		t.Fatalf("unexpected invitation: %+v", invitation)
	}
	if invitation.Token == "" {
		t.Fatalf("expected secure invitation token")
	}

	// 2. List Team Members
	members, err := repo.ListTeamMembers(ctx, merchantOrgID)
	if err != nil {
		t.Fatalf("failed to list team members: %v", err)
	}
	if len(members) == 0 {
		t.Fatalf("expected at least 1 member (the owner/existing member)")
	}
}

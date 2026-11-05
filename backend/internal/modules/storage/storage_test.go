package storage_test

import (
	"context"
	"strings"
	"testing"

	"github.com/marketplace/core/internal/modules/storage"
)

func TestStorageUploadValidation(t *testing.T) {
	svc := storage.NewService(storage.Config{
		Endpoint:        "https://r2.cloudflarestorage.com/nexus",
		Region:          "auto",
		AccessKeyID:     "test_access_key",
		SecretAccessKey: "test_secret_key_12345",
		PublicBaseURL:   "https://cdn.nexus.market",
	})

	ctx := context.Background()

	// 1. Valid Image Upload URL
	imgReq := storage.UploadURLRequest{
		FileName:    "drill_bosch_pro.jpg",
		ContentType: "image/jpeg",
		SizeBytes:   1024 * 500, // 500KB
	}
	resp, err := svc.GeneratePresignedUploadURL(ctx, imgReq, "org-supplier-1")
	if err != nil {
		t.Fatalf("expected successful upload URL, got: %v", err)
	}

	if !strings.Contains(resp.UploadURL, "AWS4-HMAC-SHA256") {
		t.Fatalf("expected S3 v4 signature in upload URL")
	}
	if !strings.HasPrefix(resp.PublicURL, "https://cdn.nexus.market") {
		t.Fatalf("expected public CDN prefix in public URL: %s", resp.PublicURL)
	}
	if !strings.Contains(resp.FileKey, "nexus-public-media/org-supplier-1/drill_bosch_pro") {
		t.Fatalf("unexpected file key structure: %s", resp.FileKey)
	}

	// 2. Valid KYC PDF Upload URL
	pdfReq := storage.UploadURLRequest{
		FileName:    "saudi_cr_certificate.pdf",
		ContentType: "application/pdf",
		SizeBytes:   1024 * 1024 * 5, // 5MB
	}
	pdfResp, err := svc.GeneratePresignedUploadURL(ctx, pdfReq, "org-merchant-4")
	if err != nil {
		t.Fatalf("expected successful PDF upload URL, got: %v", err)
	}
	if !strings.Contains(pdfResp.FileKey, "nexus-private-kyc") {
		t.Fatalf("expected private bucket for PDF, got: %s", pdfResp.FileKey)
	}

	// 3. Reject Unsupported Executable / MIME type
	badReq := storage.UploadURLRequest{
		FileName:    "malicious_script.exe",
		ContentType: "application/x-msdownload",
		SizeBytes:   5000,
	}
	_, err = svc.GeneratePresignedUploadURL(ctx, badReq, "org-1")
	if err == nil {
		t.Fatalf("expected error for unsupported MIME type, got nil")
	}

	// 4. Reject Oversized Image (Exceeds 10MB)
	hugeImg := storage.UploadURLRequest{
		FileName:    "massive_photo.png",
		ContentType: "image/png",
		SizeBytes:   1024 * 1024 * 15, // 15MB
	}
	_, err = svc.GeneratePresignedUploadURL(ctx, hugeImg, "org-1")
	if err == nil {
		t.Fatalf("expected error for oversized image, got nil")
	}
}

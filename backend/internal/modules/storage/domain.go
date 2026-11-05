package storage

import (
	"errors"
	"fmt"
	"strings"
)

const (
	BucketPublicMedia = "nexus-public-media"
	BucketPrivateKYC  = "nexus-private-kyc"

	MaxImageSizeBytes = 10 * 1024 * 1024 // 10MB
	MaxPDFSizeBytes   = 25 * 1024 * 1024 // 25MB
)

var allowedMIMETypes = map[string]bool{
	"image/jpeg":        true,
	"image/jpg":         true,
	"image/png":         true,
	"image/webp":        true,
	"application/pdf":   true,
}

type UploadURLRequest struct {
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
	Bucket      string `json:"bucket"` // "nexus-public-media" | "nexus-private-kyc"
	SizeBytes   int64  `json:"size_bytes"`
}

func (r *UploadURLRequest) Validate() error {
	r.FileName = strings.TrimSpace(r.FileName)
	if r.FileName == "" {
		return errors.New("file_name is required")
	}

	r.ContentType = strings.ToLower(strings.TrimSpace(r.ContentType))
	if !allowedMIMETypes[r.ContentType] {
		return fmt.Errorf("unsupported content_type '%s', allowed: jpg, png, webp, pdf", r.ContentType)
	}

	if r.Bucket == "" {
		if r.ContentType == "application/pdf" {
			r.Bucket = BucketPrivateKYC
		} else {
			r.Bucket = BucketPublicMedia
		}
	}

	if r.Bucket != BucketPublicMedia && r.Bucket != BucketPrivateKYC {
		return fmt.Errorf("invalid bucket '%s', must be '%s' or '%s'", r.Bucket, BucketPublicMedia, BucketPrivateKYC)
	}

	if r.ContentType == "application/pdf" && r.SizeBytes > MaxPDFSizeBytes {
		return fmt.Errorf("PDF exceeds maximum allowed size of %d bytes", MaxPDFSizeBytes)
	}
	if strings.HasPrefix(r.ContentType, "image/") && r.SizeBytes > MaxImageSizeBytes {
		return fmt.Errorf("image exceeds maximum allowed size of %d bytes", MaxImageSizeBytes)
	}

	return nil
}

type UploadURLResponse struct {
	UploadURL string `json:"upload_url"`
	PublicURL string `json:"public_url"`
	FileKey   string `json:"file_key"`
	ExpiresIn int    `json:"expires_in_seconds"`
}

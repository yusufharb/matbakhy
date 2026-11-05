package storage

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Config struct {
	Endpoint        string // e.g. "https://<account_id>.r2.cloudflarestorage.com" or "http://localhost:9000"
	Region          string // e.g. "auto" or "us-east-1"
	AccessKeyID     string
	SecretAccessKey string
	PublicBaseURL   string // e.g. "https://cdn.nexus.market"
	UsePathStyle    bool
}

type Service struct {
	cfg Config
}

func NewService(cfg Config) *Service {
	if cfg.Region == "" {
		cfg.Region = "us-east-1"
	}
	if cfg.PublicBaseURL == "" {
		cfg.PublicBaseURL = cfg.Endpoint
	}
	return &Service{cfg: cfg}
}

// GeneratePresignedUploadURL creates an authorized, time-limited S3-compatible PUT URL
func (s *Service) GeneratePresignedUploadURL(ctx context.Context, req UploadURLRequest, ownerID string) (*UploadURLResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	ext := filepath.Ext(req.FileName)
	cleanName := strings.TrimSuffix(filepath.Base(req.FileName), ext)
	cleanName = strings.ReplaceAll(cleanName, " ", "_")
	fileKey := fmt.Sprintf("%s/%s_%s%s", req.Bucket, cleanName, uuid.New().String()[:8], ext)
	if ownerID != "" {
		fileKey = fmt.Sprintf("%s/%s/%s_%s%s", req.Bucket, ownerID, cleanName, uuid.New().String()[:8], ext)
	}

	expiresIn := 900 // 15 minutes
	now := time.Now().UTC()
	dateStamp := now.Format("20060102")
	amzDate := now.Format("20060102T150405Z")

	credential := fmt.Sprintf("%s/%s/%s/s3/aws4_request", s.cfg.AccessKeyID, dateStamp, s.cfg.Region)
	query := fmt.Sprintf("X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=%s&X-Amz-Date=%s&X-Amz-Expires=%d&X-Amz-SignedHeaders=content-type;host",
		credential, amzDate, expiresIn)

	host := strings.TrimPrefix(s.cfg.Endpoint, "https://")
	host = strings.TrimPrefix(host, "http://")

	canonicalURI := "/" + fileKey
	canonicalHeaders := fmt.Sprintf("content-type:%s\nhost:%s\n", req.ContentType, host)
	canonicalRequest := fmt.Sprintf("PUT\n%s\n%s\n%s\ncontent-type;host\nUNSIGNED-PAYLOAD",
		canonicalURI, query, canonicalHeaders)

	h := sha256.New()
	h.Write([]byte(canonicalRequest))
	canonHash := hex.EncodeToString(h.Sum(nil))

	stringToSign := fmt.Sprintf("AWS4-HMAC-SHA256\n%s\n%s/%s/s3/aws4_request\n%s",
		amzDate, dateStamp, s.cfg.Region, canonHash)

	kDate := hmacSHA256([]byte("AWS4"+s.cfg.SecretAccessKey), []byte(dateStamp))
	kRegion := hmacSHA256(kDate, []byte(s.cfg.Region))
	kService := hmacSHA256(kRegion, []byte("s3"))
	kSigning := hmacSHA256(kService, []byte("aws4_request"))
	signature := hex.EncodeToString(hmacSHA256(kSigning, []byte(stringToSign)))

	uploadURL := fmt.Sprintf("%s/%s?%s&X-Amz-Signature=%s", s.cfg.Endpoint, fileKey, query, signature)
	publicURL := fmt.Sprintf("%s/%s", s.cfg.PublicBaseURL, fileKey)

	return &UploadURLResponse{
		UploadURL: uploadURL,
		PublicURL: publicURL,
		FileKey:   fileKey,
		ExpiresIn: expiresIn,
	}, nil
}

func hmacSHA256(key, data []byte) []byte {
	m := hmac.New(sha256.New, key)
	m.Write(data)
	return m.Sum(nil)
}

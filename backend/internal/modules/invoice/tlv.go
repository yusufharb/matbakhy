package invoice

import (
	"bytes"
	"encoding/base64"
	"fmt"
)

// GenerateTLVQRCode builds a standard ZATCA / regional compliant Base64 TLV string
func GenerateTLVQRCode(sellerName, sellerVAT, timestamp string, totalAmount, vatAmount float64) string {
	var buf bytes.Buffer

	writeTLV(&buf, 1, sellerName)
	writeTLV(&buf, 2, sellerVAT)
	writeTLV(&buf, 3, timestamp)
	writeTLV(&buf, 4, fmt.Sprintf("%.2f", totalAmount))
	writeTLV(&buf, 5, fmt.Sprintf("%.2f", vatAmount))

	return base64.StdEncoding.EncodeToString(buf.Bytes())
}

func writeTLV(buf *bytes.Buffer, tag byte, value string) {
	valBytes := []byte(value)
	buf.WriteByte(tag)
	buf.WriteByte(byte(len(valBytes)))
	buf.Write(valBytes)
}

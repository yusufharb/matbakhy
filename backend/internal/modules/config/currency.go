package config

import "os"

// DefaultCurrency returns the configured marketplace currency or falls back to "USD".
func DefaultCurrency() string {
	curr := os.Getenv("MARKETPLACE_CURRENCY")
	if curr == "" {
		curr = os.Getenv("DEFAULT_CURRENCY")
	}
	if curr == "" {
		curr = "USD"
	}
	return curr
}

// ResolveCurrency returns the requested currency if valid, or falls back to DefaultCurrency().
func ResolveCurrency(requested string) string {
	if requested != "" {
		return requested
	}
	return DefaultCurrency()
}

package commission

type CommissionRule struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	ScopeType   string  `json:"scope_type"` // 'supplier', 'category', 'global'
	ScopeID     string  `json:"scope_id,omitempty"`
	RateBps     int64   `json:"rate_bps"`     // Integer basis points (e.g. 1000 = 10.00%)
	RatePercent float64 `json:"rate_percent"` // Percentage for display (e.g. 10.0)
	Priority    int     `json:"priority"`
}

type ResolutionResult struct {
	EffectiveRateBps     int64   `json:"effective_rate_bps"`
	EffectiveRatePercent float64 `json:"effective_rate_percent"`
	AppliedRuleName      string  `json:"applied_rule_name"`
	AppliedScope         string  `json:"applied_scope"`
	Reason               string  `json:"reason"`
}

// CalculateCommission computes commission using integer basis points with standard round-half-up:
// commission = (subtotal * rateBps + 5000) / 10000
func CalculateCommission(subtotal int64, rateBps int64) int64 {
	if subtotal <= 0 || rateBps <= 0 {
		return 0
	}
	return (subtotal*rateBps + 5000) / 10000
}

func ruleRateBps(r CommissionRule) int64 {
	if r.RateBps > 0 {
		return r.RateBps
	}
	if r.RatePercent > 0 {
		return int64(r.RatePercent*100 + 0.5)
	}
	return 0
}

func ruleRatePercent(r CommissionRule) float64 {
	if r.RatePercent > 0 {
		return r.RatePercent
	}
	if r.RateBps > 0 {
		return float64(r.RateBps) / 100.0
	}
	return 0.0
}

// ResolveEffectiveCommission determines the exact take rate by checking priority order:
// 1. Supplier custom agreement (highest priority)
// 2. Category override
// 3. Global platform default
func ResolveEffectiveCommission(rules []CommissionRule, supplierID, categoryID string) ResolutionResult {
	// 1. Check Supplier custom rule
	for _, r := range rules {
		if r.ScopeType == "supplier" && r.ScopeID == supplierID {
			bps := ruleRateBps(r)
			return ResolutionResult{
				EffectiveRateBps:     bps,
				EffectiveRatePercent: ruleRatePercent(r),
				AppliedRuleName:      r.Name,
				AppliedScope:         "supplier",
				Reason:               "Direct contractual supplier agreement overrides category and global rates",
			}
		}
	}

	// 2. Check Category rule
	for _, r := range rules {
		if r.ScopeType == "category" && r.ScopeID == categoryID {
			bps := ruleRateBps(r)
			return ResolutionResult{
				EffectiveRateBps:     bps,
				EffectiveRatePercent: ruleRatePercent(r),
				AppliedRuleName:      r.Name,
				AppliedScope:         "category",
				Reason:               "Category-level take rate overrides global default",
			}
		}
	}

	// 3. Fallback to Global default
	for _, r := range rules {
		if r.ScopeType == "global" {
			bps := ruleRateBps(r)
			return ResolutionResult{
				EffectiveRateBps:     bps,
				EffectiveRatePercent: ruleRatePercent(r),
				AppliedRuleName:      r.Name,
				AppliedScope:         "global",
				Reason:               "Standard global platform commission rate applied",
			}
		}
	}

	return ResolutionResult{
		EffectiveRateBps:     1000,
		EffectiveRatePercent: 10.0,
		AppliedRuleName:      "System Fallback Default",
		AppliedScope:         "system",
		Reason:               "Fallback 10.0% rate applied",
	}
}


package commission

type CommissionRule struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	ScopeType   string  `json:"scope_type"` // 'supplier', 'category', 'global'
	ScopeID     string  `json:"scope_id,omitempty"`
	RatePercent float64 `json:"rate_percent"`
	Priority    int     `json:"priority"`
}

type ResolutionResult struct {
	EffectiveRatePercent float64 `json:"effective_rate_percent"`
	AppliedRuleName      string  `json:"applied_rule_name"`
	AppliedScope         string  `json:"applied_scope"`
	Reason               string  `json:"reason"`
}

// ResolveEffectiveCommission determines the exact take rate by checking priority order:
// 1. Supplier custom agreement (highest priority)
// 2. Category override
// 3. Global platform default
func ResolveEffectiveCommission(rules []CommissionRule, supplierID, categoryID string) ResolutionResult {
	// 1. Check Supplier custom rule
	for _, r := range rules {
		if r.ScopeType == "supplier" && r.ScopeID == supplierID {
			return ResolutionResult{
				EffectiveRatePercent: r.RatePercent,
				AppliedRuleName:      r.Name,
				AppliedScope:         "supplier",
				Reason:               "Direct contractual supplier agreement overrides category and global rates",
			}
		}
	}

	// 2. Check Category rule
	for _, r := range rules {
		if r.ScopeType == "category" && r.ScopeID == categoryID {
			return ResolutionResult{
				EffectiveRatePercent: r.RatePercent,
				AppliedRuleName:      r.Name,
				AppliedScope:         "category",
				Reason:               "Category-level take rate overrides global default",
			}
		}
	}

	// 3. Fallback to Global default
	for _, r := range rules {
		if r.ScopeType == "global" {
			return ResolutionResult{
				EffectiveRatePercent: r.RatePercent,
				AppliedRuleName:      r.Name,
				AppliedScope:         "global",
				Reason:               "Standard global platform commission rate applied",
			}
		}
	}

	return ResolutionResult{
		EffectiveRatePercent: 10.0,
		AppliedRuleName:      "System Fallback Default",
		AppliedScope:         "system",
		Reason:               "Fallback 10.0% rate applied",
	}
}

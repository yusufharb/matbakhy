import { ShieldCheck, Store, ShoppingBag, Globe, Activity } from "lucide-react"
import type { PortalMode, Locale } from "../types"

interface Props {
  portal: PortalMode
  setPortal: (p: PortalMode) => void
  locale: Locale
  setLocale: (l: Locale) => void
}

export function PortalSwitcher({
  portal,
  setPortal,
  locale,
  setLocale,
}: Props) {
  const isRtl = locale === "ar"

  return (
    <div
      style={{
        height: 52,
        background: "#090d16",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        fontFamily: "'Cairo', sans-serif",
        borderBottom: "1px solid #1e293b",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Brand & System Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "grid",
              placeItems: "center",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 14,
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
            }}
          >
            N
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: isRtl ? "0" : "0.04em",
              color: "#ffffff",
            }}
          >
            {isRtl ? "نظام نكسوس الموحد" : "NEXUS CORE"}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 12,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            {isRtl ? "مباشر 8080" : "LIVE 8080"}
          </span>
        </div>
      </div>

      {/* Switcher Pills (Centered) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "#111827",
          padding: "4px 6px",
          borderRadius: 10,
          border: "1px solid #1f2937",
        }}
      >
        <button
          onClick={() => setPortal("admin")}
          style={{
            border: 0,
            background:
              portal === "admin"
                ? "linear-gradient(135deg, #059669, #047857)"
                : "transparent",
            color: portal === "admin" ? "#ffffff" : "#94a3b8",
            padding: "6px 14px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow:
              portal === "admin"
                ? "0 2px 6px rgba(5, 150, 105, 0.35)"
                : "none",
          }}
        >
          <ShieldCheck size={16} />
          <span>{isRtl ? "لوحة الإدارة المركزية" : "Super Admin"}</span>
        </button>

        <button
          onClick={() => setPortal("supplier")}
          style={{
            border: 0,
            background:
              portal === "supplier"
                ? "linear-gradient(135deg, #059669, #047857)"
                : "transparent",
            color: portal === "supplier" ? "#ffffff" : "#94a3b8",
            padding: "6px 14px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow:
              portal === "supplier"
                ? "0 2px 6px rgba(5, 150, 105, 0.35)"
                : "none",
          }}
        >
          <Store size={16} />
          <span>{isRtl ? "بوابة الموردين والتجار" : "Supplier Portal"}</span>
        </button>

        <button
          onClick={() => setPortal("merchant")}
          style={{
            border: 0,
            background:
              portal === "merchant"
                ? "linear-gradient(135deg, #059669, #047857)"
                : "transparent",
            color: portal === "merchant" ? "#ffffff" : "#94a3b8",
            padding: "6px 14px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow:
              portal === "merchant"
                ? "0 2px 6px rgba(5, 150, 105, 0.35)"
                : "none",
          }}
        >
          <ShoppingBag size={16} />
          <span>{isRtl ? "واجهة المتجر التجاري" : "Storefront"}</span>
        </button>
      </div>

      {/* Right Controls: Database status + Language Switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#94a3b8",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Activity size={14} color="#34d399" />
          <span style={{ fontWeight: 600 }}>PostgreSQL 16</span>
        </div>

        {/* Language Toggle Button */}
        <button
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          style={{
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#f8fafc",
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          title={isRtl ? "Switch to English" : "التبديل إلى اللغة العربية"}
        >
          <Globe size={15} color="#38bdf8" />
          <span>{locale === "en" ? "🇸🇦 العربية (Cairo)" : "🇺🇸 English"}</span>
        </button>
      </div>
    </div>
  )
}

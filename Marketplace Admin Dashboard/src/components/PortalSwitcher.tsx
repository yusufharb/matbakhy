import { ShieldCheck, Store, ShoppingBag, Languages, Globe } from "lucide-react"
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
        height: 38,
        background: "#0c1511",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        fontSize: 11,
        borderBottom: "1px solid #1c2b24",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Switcher pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            color: "#6dd3ab",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.1em",
            marginRight: isRtl ? 0 : 8,
            marginLeft: isRtl ? 8 : 0,
          }}
        >
          {isRtl ? "تبديل البوابة:" : "PORTAL SWITCHER:"}
        </span>

        <button
          onClick={() => setPortal("admin")}
          style={{
            border: 0,
            background: portal === "admin" ? "var(--green)" : "transparent",
            color: portal === "admin" ? "#fff" : "#9eb5aa",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
          }}
        >
          <ShieldCheck size={13} />
          {isRtl
            ? "لوحة الإدارة المركزية (Super Admin)"
            : "Super Admin Dashboard"}
        </button>

        <button
          onClick={() => setPortal("supplier")}
          style={{
            border: 0,
            background: portal === "supplier" ? "var(--green)" : "transparent",
            color: portal === "supplier" ? "#fff" : "#9eb5aa",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
          }}
        >
          <Store size={13} />
          {isRtl ? "لوحة الموردين (Seller Portal)" : "Seller / Supplier Portal"}
        </button>

        <button
          onClick={() => setPortal("merchant")}
          style={{
            border: 0,
            background: portal === "merchant" ? "var(--green)" : "transparent",
            color: portal === "merchant" ? "#fff" : "#9eb5aa",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
          }}
        >
          <ShoppingBag size={13} />
          {isRtl
            ? "موقع المتجر التجاري (Storefront)"
            : "Merchant Storefront (Website)"}
        </button>
      </div>

      {/* Language Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          style={{
            border: "1px solid #284437",
            background: "#12251e",
            color: "#6dd3ab",
            padding: "3px 10px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <Languages size={13} />
          <span>{locale === "en" ? "عربي (RTL)" : "English (LTR)"}</span>
        </button>
      </div>
    </div>
  )
}

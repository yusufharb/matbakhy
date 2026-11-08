import { useState, useEffect, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Bell,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Command,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Flag,
  FolderTree,
  GripVertical,
  Headphones,
  Languages,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Minus,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Truck,
  Upload,
  Users,
  Warehouse,
  WalletCards,
  X,
} from "lucide-react"
import { PortalSwitcher } from "./components/PortalSwitcher"
import { MerchantStorefront } from "./components/MerchantStorefront"
import { B2BPortal } from "./components/b2b/B2BPortal"
import { B2CPortal } from "./components/b2c/B2CPortal"
import { CookPortal } from "./components/cook/CookPortal"
import {
  TeamRolesScreen,
  AuditLogScreen,
  PlatformSettingsScreen,
} from "./components/AdminExtras"
import { api } from "./services/api"
import { translations } from "./data/i18n"
import type { PortalMode, Locale } from "./types"

type Page = "overview" | "kyc" | "catalog" | "finance" | "cms" | "supplier" | "team" | "audit" | "settings"

const nav: {
  id: Page
  label: string
  icon: typeof LayoutDashboard
  badge?: string
}[] = [
  { id: "overview", label: "Command Center", icon: LayoutDashboard },
  { id: "kyc", label: "Supplier KYC", icon: ShieldCheck, badge: "12" },
  { id: "catalog", label: "Catalog Governance", icon: Box, badge: "35" },
  { id: "finance", label: "Finance & Ledger", icon: ReceiptText, badge: "3" },
  { id: "cms", label: "Storefront CMS", icon: Languages },
  { id: "supplier", label: "Supplier Portal", icon: Store },
]

const pageMeta: Record<Page, {
  eyebrow: string
  title: string
  description: string
}> = {
  overview: {
    eyebrow: "LIVE PLATFORM CONTROL",
    title: "Executive overview",
    description:
      "Platform health, revenue flow, and operational risk at a glance.",
  },
  kyc: {
    eyebrow: "TRUST & COMPLIANCE",
    title: "Supplier applications",
    description:
      "Review identity, registration, banking, and risk verification.",
  },
  catalog: {
    eyebrow: "CATALOG OPERATIONS",
    title: "Catalog governance",
    description:
      "Control taxonomy, schemas, and supplier-submitted product quality.",
  },
  finance: {
    eyebrow: "FINANCIAL CONTROL",
    title: "Ledger & commission engine",
    description:
      "Audit journal activity, configure take rates, and approve payouts.",
  },
  cms: {
    eyebrow: "STORE EXPERIENCE",
    title: "Multilingual storefront",
    description:
      "Curate homepage merchandising and localized customer content.",
  },
  supplier: {
    eyebrow: "VENDOR OPERATIONS",
    title: "Supplier portal",
    description:
      "Manage offers, inventory, fulfillment, and marketplace earnings.",
  },
  team: {
    eyebrow: "ACCESS & GOVERNANCE",
    title: "Team & roles",
    description:
      "Manage marketplace administrators and fine-grained RBAC permissions.",
  },
  audit: {
    eyebrow: "SECURITY & COMPLIANCE",
    title: "Audit trail",
    description: "Immutable cryptographically verifiable activity log.",
  },
  settings: {
    eyebrow: "PLATFORM CONFIGURATION",
    title: "Platform settings",
    description:
      "Multi-currency, localization, tax, and modular feature flags.",
  },
}

const suppliers = [
  {
    name: "Noura Foods Trading",
    reg: "SA-1010847291",
    country: "Saudi Arabia",
    flag: "SA",
    date: "18 Jun 2025",
    status: "Review required",
    risk: "Low",
  },
  {
    name: "Atlas Industrial GmbH",
    reg: "HRB 918245",
    country: "Germany",
    flag: "DE",
    date: "18 Jun 2025",
    status: "Documents pending",
    risk: "Low",
  },
  {
    name: "Apex Digital Supplies",
    reg: "AE-7791032",
    country: "UAE",
    flag: "AE",
    date: "17 Jun 2025",
    status: "Review required",
    risk: "Medium",
  },
  {
    name: "Maison & Marché SAS",
    reg: "RCS 892 310",
    country: "France",
    flag: "FR",
    date: "16 Jun 2025",
    status: "Verified",
    risk: "Low",
  },
  {
    name: "Cedar Medical Co.",
    reg: "JO-20041935",
    country: "Jordan",
    flag: "JO",
    date: "16 Jun 2025",
    status: "Escalated",
    risk: "High",
  },
  {
    name: "Eastbridge Textiles",
    reg: "GB-14810293",
    country: "United Kingdom",
    flag: "GB",
    date: "15 Jun 2025",
    status: "Verified",
    risk: "Low",
  },
]

interface LogoProps {
  collapsed: boolean
  locale: Locale
}

function Logo({ collapsed, locale }: LogoProps) {
  const isRtl = locale === "ar"
  const t = translations[locale].brand
  return (
    <div className="brand">
      <div className="brand-mark">
        <Command size={18} strokeWidth={2.4} />
      </div>
      {!collapsed && (
        <div>
          <b>{t.name}</b>
          <span>{t.sub}</span>
        </div>
      )}
    </div>
  )
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "green" | "amber" | "red" | "blue" | "neutral"
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  )
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`card ${className}`}>{children}</section>
}

function CardTitle({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="card-title">
      <div>
        <h3>{title}</h3>
        {hint && <p>{hint}</p>}
      </div>
      {action}
    </div>
  )
}

type HeaderProps = {
  page: Page
  onMenu: () => void
  locale: Locale
}

function Header({ page, onMenu, locale }: HeaderProps) {
  const isRtl = locale === "ar"
  const meta = translations[locale].pages[page] || pageMeta[page]
  return (
    <header className="topbar">
      <div className="page-heading">
        <button
          className="mobile-menu icon-btn"
          onClick={onMenu}
          aria-label={isRtl ? "فتح القائمة" : "Open navigation"}
        >
          <Menu size={18} />
        </button>
        <div>
          <span>{meta.eyebrow}</span>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
      </div>
      <div className="header-actions">
        <label className="global-search">
          <Search size={16} />
          <input
            aria-label={isRtl ? "بحث في المنصة" : "Search platform"}
            placeholder={
              isRtl
                ? "ابحث في الطلبات، الموردين، القيود..."
                : "Search orders, suppliers, entries…"
            }
          />
          <kbd>⌘ K</kbd>
        </label>
        <button
          className="icon-btn has-indicator"
          aria-label={isRtl ? "التنبيهات" : "Notifications"}
        >
          <Bell size={18} />
        </button>
        <button className="profile">
          <span className="avatar">AM</span>
          <span>
            <b>{isRtl ? "أمل منصور" : "Amal Mansour"}</b>
            <small>{isRtl ? "مدير عام المنصة" : "Super administrator"}</small>
          </span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  )
}

function Stat({
  label,
  value,
  note,
  up,
  icon: Icon,
  tone = "emerald",
}: {
  label: string
  value: string
  note: string
  up?: boolean
  icon: any
  tone?: "emerald" | "blue" | "purple" | "amber" | "rose"
}) {
  return (
    <Card className="stat-card">
      <div className="stat-top">
        <span className={`stat-icon ${tone}`}>
          <Icon size={20} strokeWidth={2.2} />
        </span>
        <span className={up === false ? "trend down" : "trend"}>
          {up === false ? (
            <ArrowDownRight size={13} className="rtl-flip" />
          ) : (
            <ArrowUpRight size={13} className="rtl-flip" />
          )}
          {note}
        </span>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </Card>
  )
}

function Overview({
  navigate,
  locale,
}: {
  navigate: (page: Page) => void
  locale: Locale
}) {
  const isRtl = locale === "ar"
  const t = translations[locale].overview

  return (
    <div className="page-grid">
      <div className="kpi-ribbon">
        <Stat
          label={t.gmv}
          value="$12.48M"
          note="+18.4%"
          icon={CircleDollarSign}
          tone="emerald"
        />
        <Stat
          label={t.commission}
          value="$1.06M"
          note="+12.2%"
          icon={Banknote}
          tone="blue"
        />
        <Stat
          label={t.activeSuppliers}
          value="842 / 3,194"
          note="+6.8%"
          icon={Users}
          tone="purple"
        />
        <Stat
          label={t.disputeRate}
          value="0.42%"
          note="-0.08%"
          up={false}
          icon={Flag}
          tone="rose"
        />
        <Stat
          label={t.totalOrders}
          value="48,920"
          note="+14.6%"
          icon={PackageCheck}
          tone="amber"
        />
      </div>

      <div className="overview-main">
        <Card className="gmv-card">
          <CardTitle
            title={t.gmvChartTitle}
            hint={t.gmvChartHint}
            action={
              <div className="segmented">
                <button>{isRtl ? "7 أيام" : "7D"}</button>
                <button>{isRtl ? "30 يوماً" : "30D"}</button>
                <button className="active">{isRtl ? "12 شهراً" : "12M"}</button>
              </div>
            }
          />
          <div className="chart-summary">
            <strong>$12.48M</strong>
            <Badge tone="green">{isRtl ? "+18.4% سنوياً" : "+18.4% YoY"}</Badge>
          </div>
          <div className="line-chart" aria-label="GMV line chart">
            <div className="axis-labels">
              <span>$1.2M</span>
              <span>$800K</span>
              <span>$400K</span>
              <span>$0</span>
            </div>
            <svg viewBox="0 0 760 230" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity=".24" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="grid-lines">
                <line x1="0" y1="20" x2="760" y2="20" />
                <line x1="0" y1="80" x2="760" y2="80" />
                <line x1="0" y1="140" x2="760" y2="140" />
                <line x1="0" y1="200" x2="760" y2="200" />
              </g>
              <path
                className="area"
                d="M0 176 C45 162 70 170 112 145 S180 118 228 132 S305 155 344 114 S415 86 456 102 S525 122 565 72 S646 55 680 72 S725 45 760 30 L760 220 L0 220Z"
              />
              <path
                className="line"
                d="M0 176 C45 162 70 170 112 145 S180 118 228 132 S305 155 344 114 S415 86 456 102 S525 122 565 72 S646 55 680 72 S725 45 760 30"
              />
              <circle cx="565" cy="72" r="5" />
              <line className="marker" x1="565" y1="72" x2="565" y2="215" />
            </svg>
            <div className="chart-tooltip">
              <span>{isRtl ? "أبريل 2025" : "APR 2025"}</span>
              <b>$1.08M</b>
              <small>{isRtl ? "+22.1% عن مارس" : "+22.1% from Mar"}</small>
            </div>
            <div className="month-row">
              {(isRtl
                ? [
                    "يوليو",
                    "أغسطس",
                    "سبتمبر",
                    "أكتوبر",
                    "نوفمبر",
                    "ديسمبر",
                    "يناير",
                    "فبراير",
                    "مارس",
                    "أبريل",
                    "مايو",
                    "يونيو",
                  ]
                : [
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                  ]
              ).map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </Card>

        <Card className="flow-card">
          <CardTitle
            title={isRtl ? "التدفقات المالية والسيولة" : "Financial flow"}
            hint={isRtl ? "دورة التسوية الحالية" : "Current settlement cycle"}
            action={
              <Badge tone="blue">{isRtl ? "دورة T+2" : "T+2 cycle"}</Badge>
            }
          />
          <div className="flow-total">
            <span>
              {isRtl ? "إجمالي المدفوعات المستلمة" : "Gross payments"}
            </span>
            <strong>$2,840,620</strong>
            <small>
              {isRtl ? "01 يونيو – 18 يونيو 2025" : "June 01–18, 2025"}
            </small>
          </div>
          <div className="flow-bar">
            <span style={{ width: "82%" }} />
            <span style={{ width: "13%" }} />
            <span style={{ width: "5%" }} />
          </div>
          <div className="flow-list">
            <div>
              <i className="green" />
              <span>
                <b>{isRtl ? "أموال الضمان للموردين" : "Supplier escrow"}</b>
                <small>{isRtl ? "82.0% من الإجمالي" : "82.0% of gross"}</small>
              </span>
              <strong>$2,329,308</strong>
            </div>
            <div>
              <i className="blue" />
              <span>
                <b>{isRtl ? "عمولة المنصة المحققة" : "Platform commission"}</b>
                <small>
                  {isRtl ? "13.0% متوسط النسبة" : "13.0% blended take"}
                </small>
              </span>
              <strong>$369,281</strong>
            </div>
            <div>
              <i className="amber" />
              <span>
                <b>{isRtl ? "رسوم بوابات الدفع" : "Gateway fees"}</b>
                <small>
                  {isRtl ? "5.0% معالجة العمليات" : "5.0% processing"}
                </small>
              </span>
              <strong>$142,031</strong>
            </div>
          </div>
          <button className="text-button" onClick={() => navigate("finance")}>
            {isRtl ? "عرض تفاصيل القيود والتسوية" : "Open settlement details"}{" "}
            <ArrowRight size={14} className="rtl-flip" />
          </button>
        </Card>
      </div>

      <div className="overview-bottom">
        <Card className="queue-card">
          <CardTitle
            title={isRtl ? "قائمة الإجراءات العاجلة" : "Action queue"}
            hint={
              isRtl
                ? "مهام تتطلب اتخاذ قرار من الفريق"
                : "Priority items needing your team"
            }
            action={
              <button className="icon-btn">
                <SlidersHorizontal size={16} />
              </button>
            }
          />
          <div className="queue-list">
            <button onClick={() => navigate("kyc")}>
              <span className="queue-icon amber">
                <ShieldCheck size={18} />
              </span>
              <span>
                <b>
                  {isRtl
                    ? "طلبات اعتماد الموردين الجديدة"
                    : "Supplier KYC submissions"}
                </b>
                <small>
                  {isRtl
                    ? "5 طلبات قاربت المهلة · الأقدم منذ 19 ساعة"
                    : "5 nearing SLA · oldest 19h"}
                </small>
              </span>
              <strong>12</strong>
              <ChevronRight size={16} className="rtl-flip" />
            </button>
            <button onClick={() => navigate("catalog")}>
              <span className="queue-icon blue">
                <PackageCheck size={18} />
              </span>
              <span>
                <b>
                  {isRtl
                    ? "منتجات بانتظار الموافقة في الكتالوج"
                    : "Product approvals waiting"}
                </b>
                <small>
                  {isRtl ? "8 منتجات عالية القيمة" : "8 high-value listings"}
                </small>
              </span>
              <strong>35</strong>
              <ChevronRight size={16} className="rtl-flip" />
            </button>
            <button onClick={() => navigate("finance")}>
              <span className="queue-icon red">
                <AlertTriangle size={18} />
              </span>
              <span>
                <b>{isRtl ? "نزاعات تجارية مفتوحة" : "Active disputes"}</b>
                <small>
                  {isRtl
                    ? "18,420$ قيمة تحت المراجعة"
                    : "$18,420 value at risk"}
                </small>
              </span>
              <strong>3</strong>
              <ChevronRight size={16} className="rtl-flip" />
            </button>
          </div>
        </Card>

        <Card className="category-card">
          <CardTitle
            title={
              isRtl ? "توزيع المبيعات حسب الفئات" : "Category distribution"
            }
            hint={
              isRtl
                ? "مساهمة كل تصنيف في مبيعات الشهر"
                : "GMV contribution this month"
            }
            action={
              <button className="text-button">
                {isRtl ? "التقرير الكامل" : "Full report"}{" "}
                <ArrowRight size={13} className="rtl-flip" />
              </button>
            }
          />
          <div className="donut-wrap">
            <div className="donut">
              <div>
                <b>$2.84M</b>
                <span>{isRtl ? "المبيعات" : "MONTHLY GMV"}</span>
              </div>
            </div>
            <div className="legend">
              {[
                [
                  isRtl ? "الإلكترونيات والتقنية" : "Electronics",
                  "32%",
                  "$908.9K",
                  "green",
                ],
                [
                  isRtl ? "المنزل والمفروشات" : "Home & living",
                  "24%",
                  "$681.7K",
                  "blue",
                ],
                [
                  isRtl ? "المستلزمات التجارية" : "Business supplies",
                  "19%",
                  "$539.7K",
                  "purple",
                ],
                [
                  isRtl ? "الأغذية والمشروبات" : "Food & beverage",
                  "15%",
                  "$426.1K",
                  "amber",
                ],
                [
                  isRtl ? "فئات أخرى متنوعة" : "Other",
                  "10%",
                  "$284.0K",
                  "slate",
                ],
              ].map((x) => (
                <div key={x[0]}>
                  <i className={x[3]} />
                  <span>
                    {x[0]}
                    <small>{x[2]}</small>
                  </span>
                  <b>{x[1]}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="health-card">
          <CardTitle
            title={isRtl ? "كفاءة وصحة الأنظمة" : "Platform health"}
            hint={
              isRtl ? "مؤشرات التوفر ومستوى الخدمة SLA" : "Systems & SLA status"
            }
          />
          <div className="health-score">
            <div>
              <strong>98.7%</strong>
              <span>{isRtl ? "مؤشر الكفاءة العام" : "HEALTH SCORE"}</span>
            </div>
            <Badge tone="green">
              {isRtl ? "جميع الأنظمة تعمل بكفاءة" : "All systems operational"}
            </Badge>
          </div>
          <div className="health-metrics">
            <div>
              <span>
                <i className="green" />
                {isRtl ? "نجاح عمليات الدفع" : "Payment success"}
              </span>
              <b>99.82%</b>
            </div>
            <div>
              <span>
                <i className="green" />
                {isRtl ? "توفر خوادم الـ API" : "API uptime"}
              </span>
              <b>99.99%</b>
            </div>
            <div>
              <span>
                <i className="amber" />
                {isRtl ? "التزام سرعة التحقق KYC" : "KYC SLA"}
              </span>
              <b>94.2%</b>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function KycScreen({ locale = "en" }: { locale?: Locale }) {
  const isRtl = locale === "ar"
  const t = translations[locale].kyc
  const [selected, setSelected] = useState<any | null>(null)
  const [filter, setFilter] = useState("All statuses")
  const [message, setMessage] = useState("")
  const [supplierList, setSupplierList] = useState<any[]>(suppliers)

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const orgs = await api.getAdminSuppliers()
        if (orgs && orgs.length > 0) {
          const mapped = orgs.map((o) => ({
            id: o.id,
            name: o.legal_name || o.name?.en || "Supplier Co.",
            reg: o.commercial_reg_no || "CR-102948",
            country:
              o.country_code === "SA"
                ? isRtl
                  ? "المملكة العربية السعودية"
                  : "Saudi Arabia"
                : o.country_code === "DE"
                  ? isRtl
                    ? "ألمانيا"
                    : "Germany"
                  : isRtl
                    ? "الإمارات العربية المتحدة"
                    : "United Arab Emirates",
            flag: o.country_code || "SA",
            date: new Date(o.created_at).toLocaleDateString(),
            status:
              o.status === "approved"
                ? "Verified"
                : o.status === "submitted"
                  ? "Review required"
                  : "Documents pending",
            risk: "Low",
          }))
          setSupplierList(mapped)
        }
      } catch (e) {
        console.warn("Using sample suppliers:", e)
      }
    }
    loadSuppliers()
  }, [locale, isRtl])

  const filtered = supplierList.filter(
    (s) => filter === "All statuses" || s.status === filter,
  )

  const act = async (text: string, actionType?: "approve" | "reject") => {
    setMessage(text)
    if (selected && selected.id && actionType) {
      try {
        if (actionType === "approve") {
          await api.approveSupplier(selected.id)
        } else if (actionType === "reject") {
          await api.rejectSupplier(selected.id)
        }
        setSupplierList((prev) =>
          prev.map((s) =>
            s.id === selected.id
              ? {
                  ...s,
                  status: actionType === "approve" ? "Verified" : "Escalated",
                }
              : s,
          ),
        )
      } catch (e) {
        console.warn("Supplier action failed:", e)
      }
    }
    window.setTimeout(() => {
      setSelected(null)
      setMessage("")
    }, 1200)
  }
  return (
    <>
      <div className="toolbar">
        <label className="table-search">
          <Search size={15} />
          <input placeholder={t.searchPlaceholder} />
        </label>
        <div className="toolbar-right">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="All statuses">{t.allStatuses}</option>
            <option value="Review required">
              {isRtl ? "مراجعة مطلوبة" : "Review required"}
            </option>
            <option value="Documents pending">
              {isRtl ? "بانتظار المستندات" : "Documents pending"}
            </option>
            <option value="Verified">
              {isRtl ? "معتمد ونشط" : "Verified"}
            </option>
            <option value="Escalated">
              {isRtl ? "مرفوع للإدارة" : "Escalated"}
            </option>
          </select>
          <button className="secondary-btn">
            <Filter size={15} /> {t.filterBtn}
          </button>
          <button className="primary-btn">
            <Plus size={15} /> {isRtl ? "دعوة مورد جديد" : "Invite supplier"}
          </button>
        </div>
      </div>
      <div className="mini-stats">
        <div>
          <span>{t.statPending}</span>
          <b>12</b>
          <small>{isRtl ? "5 مستحقة اليوم" : "5 due today"}</small>
        </div>
        <div>
          <span>{isRtl ? "متوسط سرعة المراجعة" : "Average review time"}</span>
          <b>6h 24m</b>
          <small className="positive">
            ↓ {isRtl ? "18% تحسن هذا الشهر" : "18% this month"}
          </small>
        </div>
        <div>
          <span>{isRtl ? "نسبة القبول والاعتماد" : "Approval rate"}</span>
          <b>84.6%</b>
          <small>{isRtl ? "خلال آخر 30 يوماً" : "Last 30 days"}</small>
        </div>
        <div>
          <span>{isRtl ? "حالات عالية المخاطر" : "High-risk escalations"}</span>
          <b>3</b>
          <small className="negative">
            {isRtl ? "تحتاج اهتماماً عاجلاً" : "Needs attention"}
          </small>
        </div>
      </div>
      <Card className="table-card">
        <CardTitle
          title={isRtl ? "طلبات تسجيل الموردين" : "Applications"}
          hint={
            isRtl
              ? "126 طلباً مسجلاً · تحديث فوري مباشر"
              : "126 supplier applications · updated just now"
          }
          action={
            <button className="secondary-btn">
              <ArrowDownRight size={14} className="rtl-flip" /> {t.exportBtn}
            </button>
          }
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" />
                </th>
                <th>{t.colCompany}</th>
                <th>{t.colCrNumber}</th>
                <th>{isRtl ? "الدولة والرمز" : "Country"}</th>
                <th>{t.colSubmitted}</th>
                <th>{t.colStatus}</th>
                <th>{t.colRisk}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.reg} onClick={() => setSelected(s)}>
                  <td>
                    <input
                      type="checkbox"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <div className="company-cell">
                      <span>{s.name.slice(0, 2).toUpperCase()}</span>
                      <b>{s.name}</b>
                    </div>
                  </td>
                  <td className="mono">{s.reg}</td>
                  <td>
                    <span className="flag-code">{s.flag}</span>
                    {s.country}
                  </td>
                  <td>{s.date}</td>
                  <td>
                    <Badge
                      tone={
                        s.status === "Verified"
                          ? "green"
                          : s.status === "Escalated"
                            ? "red"
                            : s.status === "Documents pending"
                              ? "amber"
                              : "blue"
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td>
                    <span className={`risk ${s.risk.toLowerCase()}`}>
                      {s.risk}
                    </span>
                  </td>
                  <td>
                    <button className="icon-btn">
                      <MoreHorizontal size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Showing 1–6 of 126</span>
          <div>
            <button>Previous</button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <button>Next</button>
          </div>
        </div>
      </Card>
      {selected && (
        <div className="drawer-layer">
          <div className="scrim" onClick={() => setSelected(null)} />
          <aside className="drawer">
            <div className="drawer-header">
              <div>
                <span>{t.drawerTitle}</span>
                <h2>{selected.name}</h2>
                <p>
                  {selected.reg} · {isRtl ? "تاريخ التقديم" : "Submitted"}{" "}
                  {selected.date}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}>
                <X size={19} />
              </button>
            </div>
            {message && (
              <div className="success-toast">
                <CheckCircle2 size={17} />
                {message}
              </div>
            )}
            <div className="review-progress">
              <div className="done">
                <span>
                  <Check size={12} />
                </span>
                <b>{isRtl ? "بيانات المنشأة" : "Company"}</b>
              </div>
              <i />
              <div className="done">
                <span>
                  <Check size={12} />
                </span>
                <b>{isRtl ? "المستندات" : "Documents"}</b>
              </div>
              <i />
              <div className="current">
                <span>3</span>
                <b>{isRtl ? "القرار النهائي" : "Decision"}</b>
              </div>
            </div>
            <div className="drawer-body">
              <div className="review-section">
                <div className="section-heading">
                  <div>
                    <h4>
                      {isRtl
                        ? "وثائق السجل والترخيص"
                        : "Registration documents"}
                    </h4>
                    <p>
                      {isRtl
                        ? "وثيقتان رسميتان · تم التحقق رقمياً"
                        : "2 documents · digitally verified"}
                    </p>
                  </div>
                  <Badge tone="green">
                    {isRtl ? "مطابق للشروط" : "Checks passed"}
                  </Badge>
                </div>
                <div className="doc-tabs">
                  <button className="active">
                    {isRtl ? "شهادة السجل التجاري" : "Commercial registration"}
                  </button>
                  <button>
                    {isRtl ? "الشهادة الضريبية" : "Tax certificate"}
                  </button>
                </div>
                <div className="pdf-preview">
                  <div className="pdf-toolbar">
                    <span>
                      <FileText size={14} /> CR_Noura_Foods.pdf
                    </span>
                    <span>
                      1 / 2 <Eye size={14} />
                    </span>
                  </div>
                  <div className="paper">
                    <div className="doc-seal">KSA</div>
                    <h5>{isRtl ? "وزارة التجارة" : "MINISTRY OF COMMERCE"}</h5>
                    <p>
                      {isRtl
                        ? "شهادة قيد السجل التجاري المعتمدة"
                        : "COMMERCIAL REGISTRATION CERTIFICATE"}
                    </p>
                    <hr />
                    <div className="doc-lines">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="verified-stamp">
                      {isRtl ? "تم التحقق الرقمي" : "DIGITALLY VERIFIED"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="review-section">
                <div className="section-heading">
                  <div>
                    <h4>
                      {isRtl
                        ? "التحقق من الحساب البنكي"
                        : "Bank account verification"}
                    </h4>
                    <p>
                      {isRtl
                        ? "مطابقة اسم المستفيد ورقم الآيبان IBAN"
                        : "Beneficiary ownership and IBAN validation"}
                    </p>
                  </div>
                  <Badge tone="green">{isRtl ? "مطابق 100%" : "Matched"}</Badge>
                </div>
                <div className="detail-grid">
                  <span>
                    {isRtl ? "اسم صاحب الحساب:" : "Account holder:"}
                    <b>Noura Foods Trading Co.</b>
                  </span>
                  <span>
                    {isRtl ? "البنك المعتمد:" : "Bank:"}
                    <b>
                      {isRtl
                        ? "البنك السعودي الأول (SABB)"
                        : "Saudi Awwal Bank"}
                    </b>
                  </span>
                  <span className="wide">
                    {isRtl ? "رقم الآيبان (IBAN):" : "IBAN:"}
                    <b className="mono">SA03 8000 0000 6080 1016 7519</b>
                  </span>
                </div>
              </div>
              <div className="review-section">
                <h4>{isRtl ? "ملاحظات فريق الامتثال" : "Compliance note"}</h4>
                <textarea
                  placeholder={
                    isRtl
                      ? "أضف ملاحظة داخلية لتدقيق ومتابعة القرار المحاسبي..."
                      : "Add an internal note for the audit trail…"
                  }
                />
              </div>
            </div>
            <div className="drawer-actions">
              <button
                className="secondary-btn danger"
                onClick={() =>
                  act(isRtl ? "تم رفض الطلب" : "Application rejected", "reject")
                }
              >
                {t.btnReject}
              </button>
              <button
                className="secondary-btn"
                onClick={() =>
                  act(
                    isRtl
                      ? "تم إرسال طلب استكمال الوثائق"
                      : "Document request sent",
                  )
                }
              >
                {isRtl ? "طلب استكمال وثائق" : "Request documents"}
              </button>
              <button
                className="primary-btn"
                onClick={() =>
                  act(
                    isRtl
                      ? "تم اعتماد المورد وتفعيله بنجاح"
                      : "Supplier approved successfully",
                    "approve",
                  )
                }
              >
                <Check size={15} /> {t.btnApprove}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function CatalogScreen({ locale = "en" }: { locale?: Locale }) {
  const isRtl = locale === "ar"
  const [category, setCategory] = useState(isRtl ? "إلكترونيات" : "Electronics")
  const [attributes, setAttributes] = useState(
    isRtl
      ? ["العلامة التجارية", "رقم الموديل", "فترة الضمان", "بلد المنشأ"]
      : ["Brand", "Model number", "Warranty period", "Country of origin"],
  )
  const [approved, setApproved] = useState(false)

  const categories = [
    { name: isRtl ? "إلكترونيات" : "Electronics", count: "42", top: true },
    {
      name: isRtl ? "كمبيوتر وأجهزة لوحية" : "Computers & tablets",
      count: "14",
      top: false,
    },
    {
      name: isRtl ? "أجهزة وهواتف ذكية" : "Mobile devices",
      count: "11",
      top: false,
    },
    {
      name: isRtl ? "صوتيات ومرئيات" : "Audio & video",
      count: "17",
      top: false,
    },
    {
      name: isRtl ? "مستلزمات المنزل" : "Home & living",
      count: "36",
      top: true,
    },
    {
      name: isRtl ? "مستلزمات الأعمال والشركات" : "Business supplies",
      count: "28",
      top: true,
    },
    {
      name: isRtl ? "أغذية ومشروبات" : "Food & beverage",
      count: "19",
      top: true,
    },
    {
      name: isRtl ? "صحة وعناية شخصية" : "Health & beauty",
      count: "24",
      top: true,
    },
  ]

  return (
    <div className="catalog-layout">
      <Card className="tree-panel">
        <CardTitle
          title={isRtl ? "شجرة الفئات والتصنيفات" : "Category tree"}
          hint={isRtl ? "248 فئة نشطة" : "248 active categories"}
          action={
            <button className="icon-btn">
              <Plus size={16} />
            </button>
          }
        />
        <label className="table-search compact">
          <Search size={14} />
          <input placeholder={isRtl ? "ابحث عن فئة…" : "Find category…"} />
        </label>
        <div className="category-tree">
          {categories.map(({ name, count, top }) => (
            <button
              key={name}
              className={`${name === category ? "selected" : ""} ${
                !top ? "nested" : ""
              }`}
              onClick={() => setCategory(name)}
            >
              {top ? <ChevronRight size={14} className="rtl-flip" /> : <span />}
              <FolderTree size={15} />
              <b>{name}</b>
              <em>{count}</em>
              {name === category && <MoreHorizontal size={14} />}
            </button>
          ))}
        </div>
        <div className="tree-footer">
          <Settings size={15} />
          <span>
            <b>{isRtl ? "صحة شجرة التصنيفات" : "Taxonomy health"}</b>
            <small>{isRtl ? "تغطية 96% للمخطط" : "96% schema coverage"}</small>
          </span>
        </div>
      </Card>

      <div className="catalog-main">
        <Card className="schema-card">
          <CardTitle
            title={
              isRtl ? `مخطط خصائص ${category}` : `${category} attribute schema`
            }
            hint={
              isRtl
                ? "تحديد البيانات الإلزامية لقوائم الموردين"
                : "Define required data for supplier listings"
            }
            action={
              <div className="header-inline">
                <Badge tone="green">
                  {isRtl ? "منشور الإصدار 3.4" : "Published v3.4"}
                </Badge>
                <button className="secondary-btn">
                  {isRtl ? "عرض السجل" : "View history"}
                </button>
              </div>
            }
          />
          <div className="schema-row header">
            <span>{isRtl ? "اسم الخاصية" : "Attribute name"}</span>
            <span>{isRtl ? "النوع" : "Type"}</span>
            <span>{isRtl ? "درجة الإلزام" : "Requirement"}</span>
            <span>{isRtl ? "الخيارات" : "Options"}</span>
          </div>
          {attributes.map((a, i) => (
            <div className="schema-row" key={a}>
              <span>
                <GripVertical size={14} />
                <b>{a}</b>
                {i === 2 && <Badge tone="blue">{isRtl ? "جديد" : "New"}</Badge>}
              </span>
              <span>
                {i === 2
                  ? isRtl
                    ? "رقم + وحدة قياس"
                    : "Number + unit"
                  : i === 3
                    ? isRtl
                      ? "اختيار فردي"
                      : "Single select"
                    : isRtl
                      ? "نص"
                      : "Text"}
              </span>
              <span>
                <Badge tone={i < 3 ? "amber" : "neutral"}>
                  {i < 3
                    ? isRtl
                      ? "إلزامي"
                      : "Required"
                    : isRtl
                      ? "اختياري"
                      : "Optional"}
                </Badge>
              </span>
              <span>
                <button className="icon-btn">
                  <MoreHorizontal size={15} />
                </button>
              </span>
            </div>
          ))}
          <button
            className="add-attribute"
            onClick={() =>
              setAttributes([
                ...attributes,
                isRtl
                  ? `خاصية مخصصة ${attributes.length + 1}`
                  : `Custom attribute ${attributes.length + 1}`,
              ])
            }
          >
            <Plus size={15} />{" "}
            {isRtl ? "إضافة خاصية مخصصة" : "Add custom attribute"}
          </button>
        </Card>

        <Card className="moderation-card">
          <CardTitle
            title={isRtl ? "تدقيق واعتماد المنتجات" : "Product moderation"}
            hint={
              isRtl
                ? "35 بانتظار المراجعة · التالي: E-12882"
                : "35 pending · next: E-12882"
            }
            action={
              <div className="header-inline">
                <button className="secondary-btn">
                  <ArrowRight size={14} className="rotate-180 rtl-flip" />{" "}
                  {isRtl ? "السابق" : "Previous"}
                </button>
                <button className="secondary-btn">
                  {isRtl ? "التالي" : "Next"}{" "}
                  <ArrowRight size={14} className="rtl-flip" />
                </button>
              </div>
            }
          />
          {approved ? (
            <div className="approval-state">
              <div>
                <CheckCircle2 size={28} />
              </div>
              <h3>{isRtl ? "تم اعتماد المنتج بنجاح" : "Product approved"}</h3>
              <p>
                {isRtl
                  ? "«سماعات نوفا إكس 1 العازلة للضوضاء» أصبحت الآن متاحة رسمياً في الكتالوج الموحد."
                  : "“Nova X1 Noise-Cancelling Headphones” is now in the global catalog."}
              </p>
              <button
                className="primary-btn"
                onClick={() => setApproved(false)}
              >
                {isRtl ? "مراجعة المنتج التالي" : "Review next product"}{" "}
                <ArrowRight size={14} className="rtl-flip" />
              </button>
            </div>
          ) : (
            <>
              <div className="product-summary">
                <div className="product-visual">
                  <Headphones size={52} />
                  <span>{isRtl ? "4 صور" : "4 IMAGES"}</span>
                </div>
                <div>
                  <Badge tone="amber">
                    {isRtl ? "بانتظار المراجعة" : "Awaiting review"}
                  </Badge>
                  <h3>
                    {isRtl
                      ? "سماعات نوفا إكس 1 اللاسلكية العازلة للضوضاء"
                      : "Nova X1 Noise-Cancelling Headphones"}
                  </h3>
                  <p>
                    {isRtl
                      ? "مقدم من شركة أطلس للتوزيع الرقمي · قبل 42 دقيقة"
                      : "Submitted by Atlas Digital Distribution · 42 minutes ago"}
                  </p>
                  <div className="product-codes">
                    <span>
                      SKU <b>NV-X1-BLK</b>
                    </span>
                    <span>
                      GTIN <b>6291108472219</b>
                    </span>
                  </div>
                </div>
                <div className="ai-score">
                  <Sparkles size={15} />
                  <span>
                    <b>92%</b> {isRtl ? "درجة الجودة" : "quality score"}
                  </span>
                </div>
              </div>
              <div className="diff-labels">
                <span>
                  {isRtl ? "بيانات المورد المقدمة" : "SUPPLIER SUBMISSION"}
                </span>
                <span>
                  {isRtl ? "معيار الكتالوج الموحد" : "GLOBAL CATALOG STANDARD"}
                </span>
              </div>
              <div className="diff-grid">
                <div className="diff-cell changed">
                  <span>{isRtl ? "عنوان المنتج" : "Product title"}</span>
                  <p>
                    {isRtl
                      ? "سماعة نوفا إكس 1 بلوتوث عازلة أسود"
                      : "Nova X1 Headphone Wireless Bluetooth ANC Black"}
                  </p>
                </div>
                <div className="diff-cell good">
                  <span>
                    {isRtl ? "العنوان المعتمد والموصى به" : "Recommended title"}
                  </span>
                  <p>
                    {isRtl
                      ? "سماعات نوفا إكس 1 اللاسلكية العازلة للضوضاء — أسود"
                      : "Nova X1 Wireless Noise-Cancelling Headphones — Black"}
                  </p>
                </div>
                <div className="diff-cell">
                  <span>{isRtl ? "مدة الضمان" : "Warranty period"}</span>
                  <p>{isRtl ? "12 شهراً" : "12 months"}</p>
                </div>
                <div className="diff-cell good">
                  <span>
                    {isRtl ? "التحقق من صحة المخطط" : "Schema validation"}
                  </span>
                  <p>
                    <CheckCircle2 size={14} />{" "}
                    {isRtl
                      ? "12 شهراً · تنسيق رقمي صحيح"
                      : "12 months · format valid"}
                  </p>
                </div>
                <div className="diff-cell warning">
                  <span>{isRtl ? "الميزات الرئيسية" : "Key features"}</span>
                  <p>
                    {isRtl
                      ? "عزل ضوضاء، بلوتوث، بطارية تدوم طويلاً، شحن سريع"
                      : "ANC, Bluetooth, long battery, fast charge"}
                  </p>
                </div>
                <div className="diff-cell good">
                  <span>
                    {isRtl
                      ? "الخصائص المعيارية الموحدة"
                      : "Normalized attributes"}
                  </span>
                  <p>
                    {isRtl
                      ? "عزل ANC نشط · بلوتوث 5.3 · بطارية 40 ساعة · منفذ Type-C سريع"
                      : "ANC · Bluetooth 5.3 · 40h battery · USB-C fast charge"}
                  </p>
                </div>
              </div>
              <div className="moderation-actions">
                <button className="secondary-btn">
                  <Eye size={15} /> {isRtl ? "معاينة العرض" : "Preview listing"}
                </button>
                <span />
                <button className="secondary-btn">
                  {isRtl ? "طلب مراجعة وتعديل" : "Request revision"}
                </button>
                <button
                  className="primary-btn"
                  onClick={() => setApproved(true)}
                >
                  <Check size={15} />{" "}
                  {isRtl
                    ? "اعتماد في الكتالوج الموحد"
                    : "Approve to global catalog"}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function FinanceScreen({ locale = "en" }: { locale?: Locale }) {
  const isRtl = locale === "ar"
  const t = translations[locale].finance
  const [globalRate, setGlobalRate] = useState(10)
  const [tab, setTab] = useState<"ledger" | "commission" | "payouts">("ledger")
  const [approved, setApproved] = useState<string[]>([])
  const entries = [
    [
      "JE-884291",
      "Order #OR-48291",
      "Gateway clearing",
      "Supplier escrow",
      "$8,420.00",
      "18 Jun · 14:32",
      "Posted",
    ],
    [
      "JE-884290",
      "Order #OR-48290",
      "Gateway clearing",
      "Commission revenue",
      "$842.00",
      "18 Jun · 14:31",
      "Posted",
    ],
    [
      "JE-884289",
      "Refund #RF-01982",
      "Refund liability",
      "Customer wallet",
      "$129.50",
      "18 Jun · 14:27",
      "Posted",
    ],
    [
      "JE-884288",
      "Payout #PO-06218",
      "Supplier escrow",
      "Bank settlement",
      "$24,810.00",
      "18 Jun · 13:58",
      "Posted",
    ],
    [
      "JE-884287",
      "Order #OR-48287",
      "Gateway clearing",
      "Tax payable",
      "$611.40",
      "18 Jun · 13:44",
      "Posted",
    ],
  ]

  const [liveEntries, setLiveEntries] = useState(entries)
  useEffect(() => {
    async function loadLedger() {
      try {
        const res = await api.getLedgerEntries()
        if (res && res.journal_entries && res.journal_entries.length > 0) {
          const mapped = res.journal_entries.map((je) => [
            je.entry_number,
            je.action || (isRtl ? "تسوية طلب شراء" : "Order settlement"),
            isRtl ? "حساب تسوية البوابة (1010)" : "Gateway Clearing (1010)",
            isRtl ? "حساب ضمان الموردين (2020)" : "Supplier Escrow (2020)",
            `$${((je.lines?.[0]?.amount || 0) / 100).toFixed(2)}`,
            new Date(je.posted_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isRtl ? "مقيد" : "Posted",
          ])
          setLiveEntries(mapped)
        }
      } catch (e) {
        console.warn("Could not load ledger from API:", e)
      }
    }
    loadLedger()
  }, [locale, isRtl])

  return (
    <>
      <div className="finance-hero">
        <div>
          <span>{isRtl ? "المبالغ المسواة للموردين" : "SETTLED BALANCE"}</span>
          <strong>$8,294,120.82</strong>
          <small>
            <ArrowUpRight size={13} className="rtl-flip" />{" "}
            {isRtl ? "تمت تسوية 184,290$ اليوم" : "$184,290 settled today"}
          </small>
        </div>
        <div>
          <span>{isRtl ? "أموال الضمان المعلقة" : "ESCROW LIABILITY"}</span>
          <strong>$2,329,308.00</strong>
          <small>
            {isRtl
              ? "تغطي 1,284 طلباً قيد الشحن والتسليم"
              : "Across 1,284 open orders"}
          </small>
        </div>
        <div>
          <span>{isRtl ? "صافي عمولات المنصة" : "COMMISSION MTD"}</span>
          <strong>$369,281.42</strong>
          <small className="positive">
            +12.2% {isRtl ? "نمو عن الشهر السابق" : "vs last month"}
          </small>
        </div>
        <div>
          <span>
            {isRtl ? "طلبات صرف بانتظار الاعتماد" : "PAYOUTS PENDING"}
          </span>
          <strong>$418,920.00</strong>
          <small className="negative">
            {isRtl ? "7 طلبات تحتاج مراجعة" : "7 flagged for review"}
          </small>
        </div>
      </div>
      <div className="page-tabs">
        <button
          className={tab === "ledger" ? "active" : ""}
          onClick={() => setTab("ledger")}
        >
          <BookOpen size={15} /> {t.tabLedger}
        </button>
        <button
          className={tab === "commission" ? "active" : ""}
          onClick={() => setTab("commission")}
        >
          <SlidersHorizontal size={15} /> {t.tabCommission}
        </button>
        <button
          className={tab === "payouts" ? "active" : ""}
          onClick={() => setTab("payouts")}
        >
          <WalletCards size={15} /> {t.tabPayouts} <b>18</b>
        </button>
      </div>
      {tab === "ledger" && (
        <Card className="table-card">
          <CardTitle
            title={
              isRtl
                ? "سجل القيود المحاسبية المزدوجة"
                : "Immutable journal entries"
            }
            hint={
              isRtl
                ? "دفتر الأستاذ العام · جميع المبالغ متوازنة بدقة (Debit = Credit)"
                : "Double-entry ledger · all amounts balanced"
            }
            action={
              <div className="header-inline">
                <Badge tone="green">
                  <LockKeyhole size={11} />{" "}
                  {isRtl ? "النزاهة موثقة 100%" : "Integrity verified"}
                </Badge>
                <button className="secondary-btn">
                  <Filter size={14} /> {isRtl ? "تصفية" : "Filter"}
                </button>
                <button className="secondary-btn">
                  {isRtl ? "تصدير CSV" : "Export CSV"}
                </button>
              </div>
            }
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.colEntryId}</th>
                  <th>{t.colReference}</th>
                  <th>{t.colDebit}</th>
                  <th>{t.colCredit}</th>
                  <th>{t.colAmount}</th>
                  <th>{t.colTimestamp}</th>
                  <th>{t.colStatus}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {liveEntries.map((e) => (
                  <tr key={e[0]}>
                    <td className="mono link">{e[0]}</td>
                    <td>
                      <b>{e[1]}</b>
                    </td>
                    <td>
                      <span className="account-mark debit">DR</span>
                      {e[2]}
                    </td>
                    <td>
                      <span className="account-mark credit">CR</span>
                      {e[3]}
                    </td>
                    <td className="mono amount">{e[4]}</td>
                    <td>{e[5]}</td>
                    <td>
                      <Badge tone="green">{e[6]}</Badge>
                    </td>
                    <td>
                      <Eye size={15} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ledger-proof">
            <ShieldCheck size={16} />
            <span>
              <b>
                {isRtl
                  ? "نزاهة الدفتر المالي مؤكدة"
                  : "Ledger integrity confirmed"}
              </b>{" "}
              · {isRtl ? "إجمالي المدين = إجمالي الدائن" : "Debits = Credits"} ·{" "}
              {isRtl ? "بصمة التجزئة:" : "Last audit hash:"}{" "}
              <code>0x8f24…e91c</code>
            </span>
            <small>
              {isRtl ? "تم الفحص قبل دقيقتين" : "Verified 2 min ago"}
            </small>
          </div>
        </Card>
      )}
      {tab === "commission" && (
        <div className="rule-layout">
          <Card>
            <CardTitle
              title="Commission rule builder"
              hint="Rates resolve from most-specific to global"
              action={
                <button className="primary-btn">
                  <Plus size={14} /> Add override
                </button>
              }
            />
            <div className="global-rule">
              <div>
                <span>GLOBAL DEFAULT</span>
                <h3>Marketplace commission</h3>
                <p>Applies when no category or supplier agreement exists.</p>
              </div>
              <label>
                <input
                  type="number"
                  value={globalRate}
                  onChange={(e) => setGlobalRate(Number(e.target.value))}
                />
                <b>%</b>
              </label>
            </div>
            <div className="rule-table">
              <div className="rule-head">
                <span>Rule</span>
                <span>Scope</span>
                <span>Rate</span>
                <span>Effective</span>
                <span />
              </div>
              {[
                [
                  "Electronics override",
                  "All electronics",
                  "7.0%",
                  "01 Jan 2025",
                ],
                ["Enterprise Gold tier", "18 suppliers", "6.5%", "01 Apr 2025"],
                [
                  "Fresh food category",
                  "Food & beverage",
                  "8.0%",
                  "15 May 2025",
                ],
                [
                  "Atlas custom agreement",
                  "Atlas Industrial GmbH",
                  "5.5%",
                  "01 Jun 2025",
                ],
              ].map((r, i) => (
                <div className="rule-row" key={r[0]}>
                  <span>
                    <i
                      className={
                        i === 3 ? "purple" : i === 1 ? "amber" : "green"
                      }
                    />
                    <b>{r[0]}</b>
                  </span>
                  <span>{r[1]}</span>
                  <span>
                    <b>{r[2]}</b>
                  </span>
                  <span>{r[3]}</span>
                  <span>
                    <MoreHorizontal size={15} />
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="rate-preview">
            <CardTitle
              title="Rate resolution preview"
              hint="Test the effective commission"
            />
            <label>
              Supplier
              <select>
                <option>Atlas Industrial GmbH</option>
                <option>Noura Foods Trading</option>
              </select>
            </label>
            <label>
              Category
              <select>
                <option>Electronics</option>
                <option>Business supplies</option>
              </select>
            </label>
            <div className="resolved-rate">
              <span>EFFECTIVE RATE</span>
              <strong>5.5%</strong>
              <p>
                Supplier agreement overrides Electronics rate (7%) and global
                rate ({globalRate}%).
              </p>
            </div>
            <button className="secondary-btn full">
              View resolution audit
            </button>
          </Card>
        </div>
      )}
      {tab === "payouts" && (
        <Card className="table-card">
          <CardTitle
            title="Supplier payout queue"
            hint="18 payouts · $418,920 total"
            action={
              <button
                className="primary-btn"
                onClick={() => setApproved(["PO-6218", "PO-6217", "PO-6216"])}
              >
                <Check size={14} /> Approve selected
              </button>
            }
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" />
                  </th>
                  <th>Payout ID</th>
                  <th>Supplier</th>
                  <th>Orders</th>
                  <th>Amount</th>
                  <th>Risk signal</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "PO-6218",
                    "Noura Foods Trading",
                    "82",
                    "$24,810.00",
                    "Clear",
                    "20 Jun",
                  ],
                  [
                    "PO-6217",
                    "Atlas Industrial GmbH",
                    "41",
                    "$18,492.00",
                    "Velocity spike",
                    "20 Jun",
                  ],
                  [
                    "PO-6216",
                    "Maison & Marché SAS",
                    "106",
                    "$32,110.00",
                    "Clear",
                    "20 Jun",
                  ],
                  [
                    "PO-6215",
                    "Cedar Medical Co.",
                    "19",
                    "$8,920.00",
                    "Bank changed",
                    "21 Jun",
                  ],
                ].map((r) => (
                  <tr key={r[0]}>
                    <td>
                      <input type="checkbox" />
                    </td>
                    <td className="mono link">{r[0]}</td>
                    <td>
                      <b>{r[1]}</b>
                    </td>
                    <td>{r[2]}</td>
                    <td className="amount">{r[3]}</td>
                    <td>
                      {r[4] === "Clear" ? (
                        <Badge tone="green">Clear</Badge>
                      ) : (
                        <Badge tone="red">
                          <Flag size={11} />
                          {r[4]}
                        </Badge>
                      )}
                    </td>
                    <td>{r[5]}</td>
                    <td>
                      {approved.includes(r[0]) ? (
                        <Badge tone="green">Approved</Badge>
                      ) : (
                        <Badge tone="amber">Pending</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}

function CmsScreen({ locale = "en" }: { locale?: Locale }) {
  const isRtl = locale === "ar"
  const [sections, setSections] = useState([
    {
      name: isRtl ? "سلايدر العروض الترويجية" : "Hero carousel",
      type: isRtl ? "3 شرائح · تدوير تلقائي" : "3 slides · Auto-rotate",
      active: true,
    },
    {
      name: isRtl ? "شبكة الفئات المميزة" : "Category grid",
      type: isRtl ? "8 فئات رئيسية" : "8 featured categories",
      active: true,
    },
    {
      name: isRtl ? "المنتجات المختارة للتوريد" : "Featured products",
      type: isRtl ? "مجموعة مخصصة للمشتري" : "Personalized collection",
      active: true,
    },
    {
      name: isRtl ? "موردون معتمدون ومميزون" : "Supplier spotlight",
      type: isRtl ? "4 موردين مختارين" : "4 curated suppliers",
      active: false,
    },
  ])
  const [saved, setSaved] = useState(false)
  const move = (i: number, dir: number) => {
    const next = [...sections]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setSections(next)
  }
  return (
    <div className="cms-layout">
      <div>
        <div className="cms-toolbar">
          <div>
            <Badge tone="green">{isRtl ? "منشور ومفعّل" : "Published"}</Badge>
            <span>
              {isRtl ? "آخر تحديث قبل 14 دقيقة" : "Last updated 14 minutes ago"}
            </span>
          </div>
          <div>
            <button className="secondary-btn">
              <Eye size={14} />{" "}
              {isRtl ? "معاينة واجهة المتجر" : "Preview storefront"}
            </button>
            <button
              className="primary-btn"
              onClick={() => {
                setSaved(true)
                setTimeout(() => setSaved(false), 1500)
              }}
            >
              {saved ? <CheckCircle2 size={14} /> : null}
              {saved
                ? isRtl
                  ? "تم نشر التعديلات"
                  : "Changes published"
                : isRtl
                  ? "نشر التعديلات"
                  : "Publish changes"}
            </button>
          </div>
        </div>
        <Card className="section-builder">
          <CardTitle
            title={isRtl ? "أقسام الصفحة الرئيسية" : "Homepage sections"}
            hint={
              isRtl
                ? "إعادة ترتيب وتخصيص وحدات المتجر"
                : "Reorder and configure storefront modules"
            }
            action={
              <button className="secondary-btn">
                <Plus size={14} /> {isRtl ? "إضافة قسم" : "Add section"}
              </button>
            }
          />
          <div className="section-list">
            {sections.map((s, i) => (
              <div className={!s.active ? "disabled" : ""} key={s.name}>
                <GripVertical size={17} />
                <span className="section-num">0{i + 1}</span>
                <span className="section-icon">
                  {i === 0 ? (
                    <LayoutDashboard size={17} />
                  ) : i === 1 ? (
                    <FolderTree size={17} />
                  ) : i === 2 ? (
                    <PackageCheck size={17} />
                  ) : (
                    <Store size={17} />
                  )}
                </span>
                <span>
                  <b>{s.name}</b>
                  <small>{s.type}</small>
                </span>
                <Badge tone={s.active ? "green" : "neutral"}>
                  {s.active
                    ? isRtl
                      ? "مرئي"
                      : "Visible"
                    : isRtl
                      ? "مخفي"
                      : "Hidden"}
                </Badge>
                <div className="reorder">
                  <button onClick={() => move(i, -1)}>↑</button>
                  <button onClick={() => move(i, 1)}>↓</button>
                </div>
                <button className="icon-btn">
                  <Settings size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
        <Card className="localization-card">
          <CardTitle
            title={
              isRtl ? "شريط الترويج الإعلاني الرئيسي" : "Hero marketing banner"
            }
            hint={
              isRtl
                ? "تحرير المحتوى المترجم جنباً إلى جنب"
                : "Edit localized content side by side"
            }
            action={
              <div className="header-inline">
                <Badge tone="green">
                  {isRtl ? "اكتمل الإنجليزي" : "EN complete"}
                </Badge>
                <Badge tone="amber">
                  {isRtl ? "مراجعة العربي" : "AR review"}
                </Badge>
              </div>
            }
          />
          <div className="language-head">
            <div>
              <span>EN</span>
              <b>English</b>
              <small>Left-to-right</small>
            </div>
            <div>
              <span>ع</span>
              <b>العربية</b>
              <small>{isRtl ? "من اليمين إلى اليسار" : "Right-to-left"}</small>
            </div>
          </div>
          <div className="locale-row">
            <label>
              <span>Eyebrow</span>
              <input defaultValue="BUILT FOR MODERN BUSINESS" />
            </label>
            <label dir="rtl">
              <span>النص العلوي</span>
              <input defaultValue="مصمم للأعمال الحديثة" />
            </label>
          </div>
          <div className="locale-row">
            <label>
              <span>Headline</span>
              <textarea defaultValue="Everything your business needs, in one marketplace." />
            </label>
            <label dir="rtl">
              <span>العنوان الرئيسي</span>
              <textarea defaultValue="كل ما يحتاجه عملك، في سوق واحد." />
            </label>
          </div>
          <div className="locale-row">
            <label>
              <span>Call to action</span>
              <input defaultValue="Explore marketplace" />
            </label>
            <label dir="rtl">
              <span>زر الإجراء</span>
              <input defaultValue="استكشف السوق" />
            </label>
          </div>
          <div className="translation-status">
            <Languages size={16} />
            <span>
              <b>{isRtl ? "تطابق المحتوى: 96%" : "Content parity: 96%"}</b>
              <small>
                {isRtl
                  ? "تم تحديث العنوان العربي منذ آخر مراجعة"
                  : "Arabic headline updated since last review"}
              </small>
            </span>
            <button className="text-button">
              {isRtl ? "تأكيد المراجعة" : "Mark reviewed"} <Check size={13} />
            </button>
          </div>
        </Card>
      </div>
      <aside className="preview-panel">
        <div className="preview-head">
          <span>LIVE PREVIEW</span>
          <div>
            <button className="active">EN</button>
            <button>AR</button>
          </div>
        </div>
        <div className="browser-frame">
          <div className="browser-top">
            <i />
            <i />
            <i />
            <span>market.nexus.com</span>
          </div>
          <div className="store-nav">
            <b>NEXUS</b>
            <span>
              Categories&nbsp;&nbsp;&nbsp; Deals&nbsp;&nbsp;&nbsp; Suppliers
            </span>
            <button>Sign in</button>
          </div>
          <div className="hero-preview">
            <span>BUILT FOR MODERN BUSINESS</span>
            <h2>Everything your business needs, in one marketplace.</h2>
            <p>Source verified products from trusted global suppliers.</p>
            <button>
              Explore marketplace <ArrowRight size={12} />
            </button>
            <div className="hero-graphic">
              <Box size={58} />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="mini-categories">
            <b>Browse top categories</b>
            <div>
              {["Electronics", "Office", "Industrial"].map((x) => (
                <span key={x}>
                  <Box size={15} />
                  {x}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="preview-note">
          <Eye size={14} /> Preview updates as you edit
        </div>
      </aside>
    </div>
  )
}

type SupplierTab = "home" | "offers" | "inventory" | "orders" | "wallet"
type SupplierModal = null | "sell" | "request" | "adjust" | "dispatch" | "payout"

const supplierOffers = [
  [
    "NF-ANC-X1",
    "Nova X1 Noise-Cancelling Headphones",
    "$149.00",
    "3 tiers",
    "128",
    "12",
    "116",
  ],
  [
    "NF-DOCK-8",
    "Orbit 8-in-1 USB-C Docking Station",
    "$84.50",
    "—",
    "42",
    "8",
    "34",
  ],
  [
    "NF-KEY-M2",
    "Motion M2 Mechanical Keyboard",
    "$119.00",
    "2 tiers",
    "18",
    "4",
    "14",
  ],
  [
    "NF-CAM-4K",
    "Vista Pro 4K Conference Camera",
    "$229.00",
    "3 tiers",
    "7",
    "3",
    "4",
  ],
  ["NF-HUB-12", "Twelve-Port Industrial USB Hub", "$96.00", "—", "0", "0", "0"],
]

const supplierOrders = [
  {
    id: "SO-10482",
    buyer: "Meridian Labs",
    items: "3 items · 14 units",
    value: "$1,284.00",
    time: "18 min ago",
    stage: "New",
  },
  {
    id: "SO-10479",
    buyer: "Acme Retail Group",
    items: "1 item · 8 units",
    value: "$676.00",
    time: "42 min ago",
    stage: "New",
  },
  {
    id: "SO-10461",
    buyer: "Northstar Office",
    items: "4 items · 22 units",
    value: "$2,418.50",
    time: "Today, 09:14",
    stage: "Packing",
  },
  {
    id: "SO-10444",
    buyer: "Sable Hospitality",
    items: "2 items · 10 units",
    value: "$1,091.00",
    time: "Yesterday",
    stage: "Ready",
  },
  {
    id: "SO-10431",
    buyer: "Verto Systems",
    items: "1 item · 30 units",
    value: "$3,570.00",
    time: "Yesterday",
    stage: "Shipped",
  },
]

function SupplierKpi({
  label,
  value,
  detail,
  icon: Icon,
  featured,
  tone = "emerald",
}: {
  label: string
  value: string
  detail: string
  icon: any
  featured?: boolean
  tone?: "emerald" | "blue" | "purple" | "amber" | "rose"
}) {
  return (
    <Card className={`supplier-kpi ${featured ? "featured" : ""}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <span className={`kpi-icon-badge ${featured ? "featured-badge" : tone}`}>
        <Icon size={20} strokeWidth={2.2} />
      </span>
    </Card>
  )
}

function SupplierOverview({
  openOrders,
  setOpenOrders,
  openOrder,
  locale = "en",
}: {
  openOrders: string[]
  setOpenOrders: (orders: string[]) => void
  openOrder: (id: string) => void
  locale?: Locale
}) {
  const isRtl = locale === "ar"
  return (
    <>
      <div className="supplier-kpis">
        <SupplierKpi
          label={isRtl ? "صافي المبيعات" : "Net sales"}
          value="$48,290"
          detail={
            isRtl ? "+12.8% مقارنة بالشهر السابق" : "+12.8% from last month"
          }
          icon={ArrowUpRight}
          tone="emerald"
        />
        <SupplierKpi
          label={
            isRtl ? "طلبات بانتظار اتخاذ إجراء" : "Suborders needing action"
          }
          value={`${openOrders.length}`}
          detail={
            isRtl
              ? "الأقدم قيد الانتظار منذ 42 دقيقة"
              : "Oldest waiting 42 minutes"
          }
          icon={Clock3}
          tone="amber"
        />
        <SupplierKpi
          label={isRtl ? "الرصيد المتاح للسحب" : "Available for payout"}
          value="$18,642.50"
          detail={
            isRtl ? "جاهز للتحويل الفوري إلى حسابك" : "Ready to withdraw now"
          }
          icon={WalletCards}
          featured
        />
        <SupplierKpi
          label={isRtl ? "تنبيهات انخفاض المخزون" : "Low-stock items"}
          value="4"
          detail={
            isRtl ? "أقل من 5 وحدات بالمستودع" : "Below 5 available units"
          }
          icon={AlertTriangle}
          tone="rose"
        />
      </div>
      <div className="supplier-overview-grid">
        <Card className="supplier-actions">
          <CardTitle
            title={isRtl ? "قائمة المهام اليومية" : "Daily action queue"}
            hint={isRtl ? "الخميس، 19 يونيو" : "Thursday, 19 June"}
            action={<Badge tone="amber">{isRtl ? "8 مفتوحة" : "8 open"}</Badge>}
          />
          <div className="daily-actions">
            <button>
              <span className="queue-icon amber">
                <PackageCheck size={18} />
              </span>
              <span>
                <b>
                  {isRtl ? "5 طلبات للتجهيز اليوم" : "5 orders to pack today"}
                </b>
                <small>
                  {isRtl
                    ? "2 يجب تجهيزها قبل 14:00"
                    : "2 must be ready before 14:00"}
                </small>
              </span>
              <strong>5</strong>
              <ArrowRight size={15} className="rtl-flip" />
            </button>
            <button>
              <span className="queue-icon red">
                <AlertTriangle size={18} />
              </span>
              <span>
                <b>{isRtl ? "تنبيهان لنقص المخزون" : "2 stock alerts"}</b>
                <small>
                  {isRtl
                    ? "كاميرا Vista Pro أقل من حد الأمان"
                    : "Vista Pro camera is below safety stock"}
                </small>
              </span>
              <strong>2</strong>
              <ArrowRight size={15} className="rtl-flip" />
            </button>
            <button>
              <span className="queue-icon blue">
                <RefreshCcw size={18} />
              </span>
              <span>
                <b>{isRtl ? "طلب استرجاع بانتظار الرد" : "1 refund request"}</b>
                <small>
                  {isRtl
                    ? "مطلوب الرد خلال 18 ساعة"
                    : "Response due in 18 hours"}
                </small>
              </span>
              <strong>1</strong>
              <ArrowRight size={15} className="rtl-flip" />
            </button>
          </div>
        </Card>
        <Card className="supplier-revenue">
          <CardTitle
            title={isRtl ? "عوائد المبيعات وصافي الأرباح" : "Sales revenue"}
            hint={
              isRtl
                ? "إجمالي المبيعات وخصومات عمولة المنصة الشفافة"
                : "Gross sales and transparent deductions"
            }
            action={
              <select>
                <option>{isRtl ? "آخر 30 يوماً" : "Last 30 days"}</option>
                <option>{isRtl ? "آخر 90 يوماً" : "Last 90 days"}</option>
              </select>
            }
          />
          <div className="revenue-totals">
            <div>
              <span>{isRtl ? "إجمالي المبيعات" : "Gross sales"}</span>
              <b>$53,655.56</b>
            </div>
            <div className="deduction">
              <span>{isRtl ? "عمولة المنصة" : "Platform commission"}</span>
              <b>− $5,365.56</b>
              <small>10.0%</small>
            </div>
            <div>
              <span>{isRtl ? "صافي الأرباح" : "Net sales"}</span>
              <b>$48,290.00</b>
            </div>
          </div>
          <div className="supplier-chart">
            <svg viewBox="0 0 720 190" preserveAspectRatio="none">
              <g>
                <line x1="0" y1="25" x2="720" y2="25" />
                <line x1="0" y1="80" x2="720" y2="80" />
                <line x1="0" y1="135" x2="720" y2="135" />
              </g>
              <path d="M0 145 C45 128 78 138 115 110 S180 92 220 112 S290 128 330 83 S398 62 440 75 S510 105 550 58 S625 45 670 58 S700 38 720 30" />
              <path
                className="commission-line"
                d="M0 162 C55 155 90 157 130 150 S210 145 260 151 S345 138 405 140 S510 137 565 128 S650 123 720 119"
              />
            </svg>
            <div className="supplier-chart-legend">
              <span>
                <i className="green" />
                Gross sales
              </span>
              <span>
                <i className="amber" />
                Commission deducted
              </span>
              <b>Jun 01 — Jun 19</b>
            </div>
          </div>
        </Card>
      </div>
      <Card className="table-card incoming-orders">
        <CardTitle
          title="Recent incoming suborders"
          hint="Orders placed against your active marketplace offers"
          action={
            <button className="text-button">
              View fulfillment <ArrowRight size={13} />
            </button>
          }
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Suborder</th>
                <th>Buyer</th>
                <th>Items</th>
                <th>Order value</th>
                <th>Placed</th>
                <th>Payment</th>
                <th>Quick action</th>
              </tr>
            </thead>
            <tbody>
              {supplierOrders.slice(0, 4).map((order) => (
                <tr key={order.id} onClick={() => openOrder(order.id)}>
                  <td className="mono link">{order.id}</td>
                  <td>
                    <b>{order.buyer}</b>
                  </td>
                  <td>{order.items}</td>
                  <td className="amount">{order.value}</td>
                  <td>{order.time}</td>
                  <td>
                    <Badge tone="green">Secured</Badge>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {openOrders.includes(order.id) ? (
                      <div className="row-actions">
                        <button
                          className="reject-mini"
                          onClick={() =>
                            setOpenOrders(
                              openOrders.filter((id) => id !== order.id),
                            )
                          }
                        >
                          Reject
                        </button>
                        <button
                          className="accept-mini"
                          onClick={() =>
                            setOpenOrders(
                              openOrders.filter((id) => id !== order.id),
                            )
                          }
                        >
                          Accept
                        </button>
                      </div>
                    ) : (
                      <Badge tone="green">Accepted</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function SupplierOffers({
  setModal,
}: {
  setModal: (modal: SupplierModal) => void
}) {
  const [active, setActive] = useState([true, true, true, true, false])
  return (
    <>
      <div className="supplier-toolbar">
        <div className="supplier-title-block">
          <h2>My active offers</h2>
          <p>
            Your price and stock attached to products in the shared global
            catalog.
          </p>
        </div>
        <div>
          <button className="secondary-btn" onClick={() => setModal("request")}>
            <Plus size={14} /> Request new product
          </button>
          <button className="primary-btn" onClick={() => setModal("sell")}>
            <Search size={14} /> Sell existing product
          </button>
        </div>
      </div>
      <div className="offer-summary">
        <span>
          <b>148</b> Total offers
        </span>
        <span>
          <b>132</b> Active
        </span>
        <span>
          <b>4</b> Low stock
        </span>
        <span>
          <b>12</b> Paused
        </span>
        <i />
        <Badge tone="green">Catalog sync healthy</Badge>
      </div>
      <Card className="table-card offer-table">
        <div className="offer-filters">
          <label className="table-search">
            <Search size={14} />
            <input placeholder="Search SKU or product…" />
          </label>
          <select>
            <option>All categories</option>
            <option>Electronics</option>
          </select>
          <select>
            <option>All stock states</option>
            <option>Low stock</option>
          </select>
          <button className="secondary-btn">
            <Filter size={14} /> Filters
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Supplier SKU</th>
                <th>Global product name</th>
                <th>Current price</th>
                <th>Tiered pricing</th>
                <th>On-hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {supplierOffers.map((offer, i) => (
                <tr key={offer[0]}>
                  <td className="mono">{offer[0]}</td>
                  <td>
                    <div className="offer-product">
                      <span>
                        <Box size={15} />
                      </span>
                      <b>{offer[1]}</b>
                    </div>
                  </td>
                  <td className="amount">{offer[2]}</td>
                  <td>
                    {offer[3] === "—" ? (
                      "—"
                    ) : (
                      <Badge tone="blue">{offer[3]}</Badge>
                    )}
                  </td>
                  <td>{offer[4]}</td>
                  <td>{offer[5]}</td>
                  <td className={Number(offer[6]) < 5 ? "stock-low" : "amount"}>
                    {offer[6]}
                  </td>
                  <td>
                    <button
                      className={`toggle ${active[i] ? "on" : ""}`}
                      onClick={() =>
                        setActive(active.map((v, j) => (j === i ? !v : v)))
                      }
                    >
                      <i />
                    </button>
                  </td>
                  <td>
                    <button className="icon-btn">
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Showing 5 of 148 offers</span>
          <div>
            <button>Previous</button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <button>Next</button>
          </div>
        </div>
      </Card>
    </>
  )
}

function PricingInventory({
  setModal,
}: {
  setModal: (modal: SupplierModal) => void
}) {
  const [tiers, setTiers] = useState([
    ["1", "9", "15.00"],
    ["10", "49", "13.00"],
    ["50", "+", "11.00"],
  ])
  return (
    <>
      <div className="supplier-toolbar">
        <div className="supplier-title-block">
          <span className="back-link">OFFERS / NF-ANC-X1</span>
          <h2>Nova X1 Noise-Cancelling Headphones</h2>
          <p>Edit commercial terms and allocate sellable stock by location.</p>
        </div>
        <div>
          <button className="secondary-btn">Discard</button>
          <button className="primary-btn">
            <Check size={14} /> Save changes
          </button>
        </div>
      </div>
      <div className="pricing-layout">
        <div>
          <Card className="pricing-card">
            <CardTitle
              title="Base offer terms"
              hint="Your default unit price and minimum order"
              action={<Badge tone="green">Offer active</Badge>}
            />
            <div className="offer-input-grid">
              <label>
                <span>Unit selling price</span>
                <div>
                  <b>$</b>
                  <input defaultValue="15.00" />
                </div>
                <small>Buyer-facing price before tax</small>
              </label>
              <label>
                <span>Minimum order quantity</span>
                <div>
                  <input defaultValue="1" />
                  <b>units</b>
                </div>
                <small>Lowest quantity a buyer can order</small>
              </label>
            </div>
          </Card>
          <Card className="tier-card">
            <CardTitle
              title="Tiered quantity discounts"
              hint="Lower unit prices at higher order volumes"
              action={
                <button
                  className="secondary-btn"
                  onClick={() => setTiers([...tiers, ["", "", ""]])}
                >
                  <Plus size={14} /> Add tier
                </button>
              }
            />
            <div className="tier-head">
              <span>Minimum qty</span>
              <span>Maximum qty</span>
              <span>Unit price</span>
              <span>Buyer saves</span>
              <span />
            </div>
            {tiers.map((tier, i) => (
              <div className="tier-edit" key={i}>
                <label>
                  <input
                    value={tier[0]}
                    onChange={(e) =>
                      setTiers(
                        tiers.map((t, j) =>
                          j === i ? [e.target.value, t[1], t[2]] : t,
                        ),
                      )
                    }
                  />
                  <b>units</b>
                </label>
                <label>
                  <input
                    value={tier[1]}
                    onChange={(e) =>
                      setTiers(
                        tiers.map((t, j) =>
                          j === i ? [t[0], e.target.value, t[2]] : t,
                        ),
                      )
                    }
                  />
                  <b>units</b>
                </label>
                <label>
                  <b>$</b>
                  <input
                    value={tier[2]}
                    onChange={(e) =>
                      setTiers(
                        tiers.map((t, j) =>
                          j === i ? [t[0], t[1], e.target.value] : t,
                        ),
                      )
                    }
                  />
                </label>
                <Badge tone={i === 0 ? "neutral" : "green"}>
                  {i === 0
                    ? "Base price"
                    : `${Math.round(((15 - Number(tier[2])) / 15) * 100)}% off`}
                </Badge>
                <button
                  className="icon-btn"
                  onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="tier-note">
              <CircleDollarSign size={15} />
              <span>
                <b>Buyer preview</b>
                <small>50 units × $11.00 = $550.00 · saves $200.00</small>
              </span>
            </div>
          </Card>
        </div>
        <Card className="warehouse-card">
          <CardTitle
            title="Warehouse inventory"
            hint="Stock availability across locations"
            action={
              <button
                className="primary-btn"
                onClick={() => setModal("adjust")}
              >
                <Plus size={14} /> Adjust stock
              </button>
            }
          />
          <div className="inventory-total">
            <span>
              <b>177</b> On-hand
            </span>
            <span>
              <b>23</b> Reserved
            </span>
            <span>
              <b>154</b> Available
            </span>
          </div>
          {[
            ["Riyadh Central", "RUH-01", "128", "12", "116"],
            ["Jeddah West", "JED-02", "42", "8", "34"],
            ["Dammam Hub", "DMM-01", "7", "3", "4"],
          ].map((w, i) => (
            <div className="warehouse-row" key={w[0]}>
              <span className="warehouse-icon">
                <Warehouse size={17} />
              </span>
              <span>
                <b>{w[0]}</b>
                <small>
                  {w[1]} · {i === 2 ? "Low stock" : "Stocked"}
                </small>
              </span>
              <div>
                <span>
                  ON-HAND<b>{w[2]}</b>
                </span>
                <span>
                  RESERVED<b>{w[3]}</b>
                </span>
                <span>
                  AVAILABLE<b className={i === 2 ? "negative" : ""}>{w[4]}</b>
                </span>
              </div>
              <button className="icon-btn" onClick={() => setModal("adjust")}>
                <MoreHorizontal size={15} />
              </button>
            </div>
          ))}
          <div className="stock-history">
            <h4>Recent adjustments</h4>
            {[
              ["Received shipment", "+50", "18 Jun · RK"],
              ["Order reservation", "−8", "18 Jun · System"],
              ["Inventory audit", "−2", "17 Jun · LM"],
            ].map((x) => (
              <div key={x[0]}>
                <span>
                  <RefreshCcw size={13} />
                  {x[0]}
                </span>
                <b className={x[1].startsWith("+") ? "positive" : "negative"}>
                  {x[1]}
                </b>
                <small>{x[2]}</small>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

function SupplierOrders({
  openOrder,
  setModal,
}: {
  openOrder: (id: string) => void
  setModal: (modal: SupplierModal) => void
}) {
  const columns = [
    ["New suborders", "New", "2"],
    ["Packing & processing", "Packing", "1"],
    ["Ready for pickup", "Ready", "1"],
    ["Shipped", "Shipped", "1"],
    ["Delivered", "Delivered", "12"],
  ]
  return (
    <>
      <div className="supplier-toolbar">
        <div className="supplier-title-block">
          <h2>Fulfillment pipeline</h2>
          <p>Move each suborder through packing, handoff, and delivery.</p>
        </div>
        <div>
          <button className="secondary-btn">
            <Printer size={14} /> Batch packing slips
          </button>
          <button className="primary-btn">
            <Truck size={14} /> Create shipment
          </button>
        </div>
      </div>
      <div className="fulfillment-summary">
        <span>
          <i className="green" />
          96.8% on-time dispatch
        </span>
        <span>
          Avg. handling <b>8h 14m</b>
        </span>
        <span>
          Orders due today <b>5</b>
        </span>
        <span>
          At-risk SLA <b className="negative">1</b>
        </span>
      </div>
      <div className="kanban-board">
        {columns.map((col) => (
          <div className="kanban-column" key={col[1]}>
            <div className="kanban-head">
              <span>{col[0]}</span>
              <b>{col[2]}</b>
              <MoreHorizontal size={14} />
            </div>
            {supplierOrders
              .filter((o) => o.stage === col[1])
              .map((order) => (
                <button
                  className="order-card"
                  key={order.id}
                  onClick={() => openOrder(order.id)}
                >
                  <div>
                    <span className="mono">{order.id}</span>
                    <Badge
                      tone={
                        order.stage === "New"
                          ? "amber"
                          : order.stage === "Shipped"
                            ? "blue"
                            : "green"
                      }
                    >
                      {order.stage}
                    </Badge>
                  </div>
                  <h4>{order.buyer}</h4>
                  <p>{order.items}</p>
                  <strong>{order.value}</strong>
                  <footer>
                    <Clock3 size={12} />
                    {order.time}
                    <ArrowRight size={13} />
                  </footer>
                </button>
              ))}
            {col[1] === "Ready" && (
              <button
                className="dispatch-card"
                onClick={() => setModal("dispatch")}
              >
                <Truck size={16} />
                <span>Dispatch ready order</span>
                <ArrowRight size={13} />
              </button>
            )}
            {col[1] === "Delivered" && (
              <div className="delivered-note">
                <CheckCircle2 size={17} />
                <span>
                  <b>12 delivered</b>
                  <small>This week · 0 issues</small>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function SupplierWallet({
  setModal,
}: {
  setModal: (modal: SupplierModal) => void
}) {
  const ledger = [
    [
      "19 Jun 2025",
      "SO-10482",
      "$1,284.00",
      "−$128.40",
      "$1,155.60",
      "$18,642.50",
    ],
    [
      "18 Jun 2025",
      "SO-10461",
      "$2,418.50",
      "−$241.85",
      "$2,176.65",
      "$17,486.90",
    ],
    [
      "18 Jun 2025",
      "SO-10444",
      "$1,091.00",
      "−$109.10",
      "$981.90",
      "$15,310.25",
    ],
    ["17 Jun 2025", "PO-00982", "—", "—", "−$8,000.00", "$14,328.35"],
    [
      "16 Jun 2025",
      "SO-10412",
      "$3,570.00",
      "−$357.00",
      "$3,213.00",
      "$22,328.35",
    ],
  ]
  return (
    <>
      <div className="wallet-kpis">
        <Card className="wallet-primary">
          <span>AVAILABLE FOR WITHDRAWAL</span>
          <strong>$18,642.50</strong>
          <p>Cleared and ready to transfer</p>
          <button onClick={() => setModal("payout")}>
            Request payout <ArrowRight size={14} />
          </button>
        </Card>
        <Card>
          <span>ESCROW / PENDING</span>
          <strong>$8,294.20</strong>
          <p>Clears after confirmed delivery</p>
          <Badge tone="blue">
            <Clock3 size={11} /> 14 settlements
          </Badge>
        </Card>
        <Card>
          <span>HELD FUNDS</span>
          <strong>$892.00</strong>
          <p>Related to active disputes</p>
          <Badge tone="red">
            <LockKeyhole size={11} /> 1 hold
          </Badge>
        </Card>
        <Card>
          <span>LIFETIME EARNINGS</span>
          <strong>$482,920.60</strong>
          <p>Net after platform commission</p>
          <Badge tone="green">+18.6% YoY</Badge>
        </Card>
      </div>
      <Card className="settlement-forecast">
        <div>
          <span className="wallet-round">
            <CircleDollarSign size={20} />
          </span>
          <span>
            <b>Next settlement forecast</b>
            <small>$5,842.20 expected to clear by 22 June</small>
          </span>
        </div>
        <div className="forecast-bar">
          <i style={{ width: "72%" }} />
        </div>
        <div>
          <span>
            <b>$8,294.20</b>
            <small>Pending total</small>
          </span>
          <span>
            <b>$5,842.20</b>
            <small>Within 3 days</small>
          </span>
        </div>
      </Card>
      <Card className="table-card">
        <CardTitle
          title="Earnings ledger"
          hint="Sales, commission deductions, payouts, and running balance"
          action={
            <div className="header-inline">
              <button className="secondary-btn">
                <Filter size={14} /> Filter
              </button>
              <button className="secondary-btn">Export statement</button>
            </div>
          }
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction reference</th>
                <th>Gross sale</th>
                <th>Platform commission (10%)</th>
                <th>Net credited</th>
                <th>Running balance</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row[1]}>
                  <td>{row[0]}</td>
                  <td className="mono link">{row[1]}</td>
                  <td>{row[2]}</td>
                  <td className="negative">{row[3]}</td>
                  <td
                    className={row[4].startsWith("−") ? "negative" : "positive"}
                  >
                    <b>{row[4]}</b>
                  </td>
                  <td className="amount">{row[5]}</td>
                  <td>
                    <Eye size={14} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ledger-disclosure">
          <ShieldCheck size={15} />
          <span>
            All commission deductions use your contracted 10% rate and are
            traceable to their source suborder.
          </span>
          <button className="text-button">
            View commission agreement <ArrowRight size={12} />
          </button>
        </div>
      </Card>
    </>
  )
}

function SupplierDialog({
  modal,
  close,
}: {
  modal: Exclude<SupplierModal, null>
  close: () => void
}) {
  const [step, setStep] = useState(1)
  const [confirmed, setConfirmed] = useState(false)
  const titles = {
    sell: "Sell an existing product",
    request: "Request a new global product",
    adjust: "Adjust warehouse stock",
    dispatch: "Dispatch shipment",
    payout: "Request a payout",
  }
  return (
    <div className="supplier-dialog-layer">
      <div className="scrim" onClick={close} />
      <div className={`supplier-dialog ${modal === "request" ? "wide" : ""}`}>
        <div className="supplier-dialog-head">
          <div>
            <span>SUPPLIER OPERATIONS</span>
            <h2>{titles[modal]}</h2>
          </div>
          <button className="icon-btn" onClick={close}>
            <X size={18} />
          </button>
        </div>
        {modal === "sell" && (
          <>
            <div className="dialog-body">
              <label className="catalog-search">
                <Search size={16} />
                <input placeholder="Search by product name, GTIN, brand, or model…" />
              </label>
              <p className="result-count">
                3 products found in the shared catalog
              </p>
              {[
                [
                  "Nova X2 Wireless Headphones",
                  "Nova Audio · GTIN 6291108472295",
                  "Electronics",
                ],
                [
                  "Orbit Pro USB-C Dock",
                  "Orbit · GTIN 6291182159333",
                  "Computers",
                ],
                [
                  "Vista 2K Conference Camera",
                  "Vista · GTIN 6291847201032",
                  "Electronics",
                ],
              ].map((p, i) => (
                <div className="catalog-result" key={p[0]}>
                  <span>
                    <Box size={22} />
                  </span>
                  <div>
                    <h4>{p[0]}</h4>
                    <p>{p[1]}</p>
                    <Badge tone="neutral">{p[2]}</Badge>
                  </div>
                  <button className="secondary-btn">View</button>
                  <button className="primary-btn" onClick={() => setStep(2)}>
                    Sell this item
                  </button>
                </div>
              ))}
              {step === 2 && (
                <div className="inline-offer-form">
                  <h4>Create your offer</h4>
                  <label>
                    Unit price
                    <input defaultValue="129.00" />
                  </label>
                  <label>
                    MOQ
                    <input defaultValue="1" />
                  </label>
                  <label>
                    Warehouse
                    <select>
                      <option>Riyadh Central</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
            <div className="dialog-actions">
              <button className="secondary-btn" onClick={close}>
                Cancel
              </button>
              {step === 2 && (
                <button className="primary-btn" onClick={close}>
                  <Check size={14} /> Create offer
                </button>
              )}
            </div>
          </>
        )}
        {modal === "request" && (
          <>
            <div className="wizard-steps">
              {[
                "Basic info",
                "Category",
                "Variants",
                "Images",
                "Technical specs",
              ].map((x, i) => (
                <div
                  className={
                    step === i + 1 ? "active" : step > i + 1 ? "done" : ""
                  }
                  key={x}
                >
                  <span>{step > i + 1 ? <Check size={11} /> : i + 1}</span>
                  <b>{x}</b>
                </div>
              ))}
            </div>
            <div className="dialog-body wizard-body">
              {step === 1 && (
                <div className="wizard-grid">
                  <label className="wide">
                    Product name
                    <input placeholder="e.g. Atlas Industrial Label Printer" />
                  </label>
                  <label>
                    Brand
                    <input placeholder="Brand name" />
                  </label>
                  <label>
                    Manufacturer model
                    <input placeholder="Model or MPN" />
                  </label>
                  <label className="wide">
                    Short product summary
                    <textarea placeholder="Describe what this product is and its primary use…" />
                  </label>
                </div>
              )}
              {step === 2 && (
                <div className="category-picker">
                  <h4>Select the most specific category</h4>
                  <label className="catalog-search">
                    <Search size={15} />
                    <input placeholder="Search categories…" />
                  </label>
                  <div>
                    {[
                      "Electronics",
                      "Computers & accessories",
                      "Printers & scanners",
                      "Label printers",
                    ].map((x, i) => (
                      <button className={i === 3 ? "selected" : ""} key={x}>
                        {x}
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                  <p>
                    Electronics / Computers & accessories / Printers & scanners
                    / <b>Label printers</b>
                  </p>
                </div>
              )}
              {step === 3 && (
                <div className="variant-builder">
                  <h4>Generate product variants</h4>
                  <p>Combine options to create catalog-level variants.</p>
                  <div>
                    <label>
                      Size / capacity
                      <input defaultValue="Standard, Large" />
                    </label>
                    <b>×</b>
                    <label>
                      Color
                      <input defaultValue="Black, White, Silver" />
                    </label>
                  </div>
                  <div className="variant-output">
                    <span>6 variants generated</span>
                    {[
                      "Standard / Black",
                      "Standard / White",
                      "Standard / Silver",
                      "Large / Black",
                      "Large / White",
                      "Large / Silver",
                    ].map((x) => (
                      <Badge key={x}>{x}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="upload-zone">
                  <Upload size={28} />
                  <h4>Upload product images</h4>
                  <p>PNG, JPG, or WebP · minimum 1200 × 1200 px</p>
                  <button className="secondary-btn">Choose files</button>
                  <small>
                    Include front, back, side, packaging, and detail views.
                  </small>
                </div>
              )}
              {step === 5 && (
                <div className="wizard-grid">
                  <label>
                    Print technology
                    <select>
                      <option>Thermal transfer</option>
                    </select>
                  </label>
                  <label>
                    Connectivity
                    <select>
                      <option>USB + Bluetooth</option>
                    </select>
                  </label>
                  <label>
                    Max label width
                    <input defaultValue="108 mm" />
                  </label>
                  <label>
                    Warranty period
                    <input defaultValue="24 months" />
                  </label>
                  <label className="wide">
                    Additional specification
                    <input placeholder="Add specification name" />
                    <button className="secondary-btn">
                      <Plus size={13} /> Add field
                    </button>
                  </label>
                </div>
              )}
            </div>
            <div className="dialog-actions">
              <button
                className="secondary-btn"
                onClick={step === 1 ? close : () => setStep(step - 1)}
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>
              <span />
              <Badge tone="blue">Draft autosaved</Badge>
              <button
                className="primary-btn"
                onClick={step === 5 ? close : () => setStep(step + 1)}
              >
                {step === 5 ? "Submit product request" : "Continue"}
                <ArrowRight size={13} />
              </button>
            </div>
          </>
        )}
        {modal === "adjust" && (
          <>
            <div className="dialog-body adjustment-form">
              <label>
                Warehouse
                <select>
                  <option>Riyadh Central · RUH-01</option>
                  <option>Jeddah West · JED-02</option>
                </select>
              </label>
              <label>
                Adjustment reason
                <select>
                  <option>Received shipment</option>
                  <option>Damaged goods</option>
                  <option>Inventory audit</option>
                </select>
              </label>
              <div className="adjust-quantity">
                <span>Quantity adjustment</span>
                <button>
                  <Minus size={14} />
                </button>
                <input defaultValue="50" />
                <button>
                  <Plus size={14} />
                </button>
                <b>units</b>
              </div>
              <label>
                Internal note
                <textarea placeholder="Add shipment reference or audit note…" />
              </label>
              <div className="adjust-preview">
                <span>
                  Current on-hand<b>128</b>
                </span>
                <ArrowRight size={16} />
                <span>
                  New on-hand<b>178</b>
                </span>
              </div>
            </div>
            <div className="dialog-actions">
              <button className="secondary-btn" onClick={close}>
                Cancel
              </button>
              <button className="primary-btn" onClick={close}>
                Confirm adjustment
              </button>
            </div>
          </>
        )}
        {modal === "dispatch" && (
          <>
            <div className="dialog-body dispatch-form">
              <div className="dispatch-order">
                <Truck size={20} />
                <span>
                  <b>SO-10444 · Sable Hospitality</b>
                  <small>2 items · 10 units · $1,091.00</small>
                </span>
              </div>
              <label>
                Courier
                <select>
                  <option>DHL Express</option>
                  <option>Aramex</option>
                  <option>SMSA Express</option>
                </select>
              </label>
              <label>
                Tracking number
                <input placeholder="Enter courier tracking number" />
              </label>
              <label>
                Pickup date
                <input type="date" defaultValue="2025-06-20" />
              </label>
              <div className="dispatch-note">
                <CheckCircle2 size={15} /> Buyer will receive tracking details
                automatically.
              </div>
            </div>
            <div className="dialog-actions">
              <button className="secondary-btn" onClick={close}>
                Cancel
              </button>
              <button className="primary-btn" onClick={close}>
                <Truck size={14} /> Dispatch shipment
              </button>
            </div>
          </>
        )}
        {modal === "payout" && (
          <>
            <div className="dialog-body payout-form">
              {confirmed ? (
                <div className="payout-success">
                  <CheckCircle2 size={32} />
                  <h3>Payout requested</h3>
                  <p>
                    $10,000.00 will arrive in your bank account within 1–2
                    business days.
                  </p>
                </div>
              ) : (
                <>
                  <div className="payout-available">
                    <span>Available balance</span>
                    <strong>$18,642.50</strong>
                  </div>
                  <label>
                    Payout amount
                    <div>
                      <b>$</b>
                      <input defaultValue="10,000.00" />
                    </div>
                  </label>
                  <label>
                    Transfer to
                    <div className="bank-option">
                      <ShieldCheck size={18} />
                      <span>
                        <b>Saudi Awwal Bank</b>
                        <small>IBAN ending in •••• 7519</small>
                      </span>
                      <CheckCircle2 size={17} />
                    </div>
                  </label>
                  <label>
                    One-time password
                    <span className="otp-inputs">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <input
                          key={i}
                          maxLength={1}
                          defaultValue={i < 4 ? "•" : ""}
                        />
                      ))}
                    </span>
                    <small>Sent to your verified mobile ending in 4821</small>
                  </label>
                </>
              )}
            </div>
            <div className="dialog-actions">
              <button className="secondary-btn" onClick={close}>
                {confirmed ? "Close" : "Cancel"}
              </button>
              {!confirmed && (
                <button
                  className="primary-btn"
                  onClick={() => setConfirmed(true)}
                >
                  <LockKeyhole size={14} /> Confirm payout
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SupplierPortal({ locale = "en" }: { locale?: Locale }) {
  const isRtl = locale === "ar"
  const t = translations[locale].supplierPortal
  const [tab, setTab] = useState<SupplierTab>("home")
  const [modal, setModal] = useState<SupplierModal>(null)
  const [openOrders, setOpenOrders] = useState(["SO-10482", "SO-10479"])
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const tabs: {
    id: SupplierTab
    label: string
    icon: typeof Store
    badge?: string
  }[] = [
    {
      id: "home",
      label: isRtl ? "نظرة عامة على العمليات" : "Operations overview",
      icon: LayoutDashboard,
    },
    {
      id: "offers",
      label: isRtl ? "الكتالوج والعروض" : "Catalog & offers",
      icon: Box,
    },
    {
      id: "inventory",
      label: isRtl ? "التسعير والمخزون" : "Pricing & inventory",
      icon: Warehouse,
    },
    {
      id: "orders",
      label: isRtl ? "تجهيز وشحن الطلبات" : "Fulfillment",
      icon: Truck,
      badge: "5",
    },
    {
      id: "wallet",
      label: isRtl ? "المحفظة والأرباح" : "Wallet & earnings",
      icon: WalletCards,
    },
  ]
  return (
    <div className="supplier-portal">
      <div className="supplier-context">
        <div>
          <span className="supplier-logo">NF</span>
          <span>
            <b>
              {isRtl
                ? "مؤسسة نورة للمنتجات والأغذية"
                : "Noura Foods & Technology"}
            </b>
            <small>
              {isRtl ? "مورد ذهبي معتمد" : "Verified Gold supplier"} · ID
              SUP-01942
            </small>
          </span>
        </div>
        <div>
          <span>{isRtl ? "مؤشر الالتزام SLA" : "Fulfillment SLA"}</span>
          <b>96.8%</b>
          <Badge tone="green">{isRtl ? "ممتاز 96.8%" : "Healthy"}</Badge>
        </div>
      </div>
      <div className="supplier-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={15} />
            {item.label}
            {item.badge && <b>{item.badge}</b>}
          </button>
        ))}
      </div>
      <div className="supplier-tab-content">
        {tab === "home" && (
          <SupplierOverview
            openOrders={openOrders}
            setOpenOrders={setOpenOrders}
            openOrder={setSelectedOrder}
            locale={locale}
          />
        )}
        {tab === "offers" && <SupplierOffers setModal={setModal} />}
        {tab === "inventory" && <PricingInventory setModal={setModal} />}
        {tab === "orders" && (
          <SupplierOrders openOrder={setSelectedOrder} setModal={setModal} />
        )}
        {tab === "wallet" && <SupplierWallet setModal={setModal} />}
      </div>
      {selectedOrder && (
        <div className="drawer-layer">
          <div className="scrim" onClick={() => setSelectedOrder(null)} />
          <aside className="drawer supplier-order-drawer">
            <div className="drawer-header">
              <div>
                <span>SUBORDER DETAIL</span>
                <h2>{selectedOrder}</h2>
                <p>Placed 18 June 2025 · 14:32 GMT+3</p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="order-lock-banner">
              <LockKeyhole size={15} />
              <span>
                <b>Purchase-time pricing locked</b>
                <small>
                  Prices and commission cannot change after checkout.
                </small>
              </span>
            </div>
            <div className="drawer-body">
              <div className="order-buyer">
                <span className="company-cell">
                  <span>ML</span>
                </span>
                <span>
                  <b>Meridian Labs</b>
                  <small>Business buyer · Payment secured</small>
                </span>
                <Badge tone="green">Paid</Badge>
              </div>
              <div className="review-section">
                <div className="section-heading">
                  <div>
                    <h4>Items to fulfill</h4>
                    <p>3 items · 14 total units</p>
                  </div>
                  <strong>$1,284.00</strong>
                </div>
                {[
                  ["Nova X1 Headphones", "8 × $119.00", "$952.00"],
                  ["Orbit USB-C Dock", "2 × $84.50", "$169.00"],
                  ["USB-C Cable 2m", "4 × $40.75", "$163.00"],
                ].map((x) => (
                  <div className="order-line" key={x[0]}>
                    <span>
                      <Box size={16} />
                    </span>
                    <b>{x[0]}</b>
                    <small>{x[1]}</small>
                    <strong>{x[2]}</strong>
                  </div>
                ))}
              </div>
              <div className="review-section">
                <h4>Customer shipping address</h4>
                <div className="address-block">
                  <MapPin size={17} />
                  <span>
                    <b>Meridian Labs — Receiving Dock 4</b>
                    <small>
                      King Fahd Road, Al Olaya District
                      <br />
                      Riyadh 12214, Saudi Arabia
                      <br />
                      Contact: +966 55 401 8821
                    </small>
                  </span>
                </div>
              </div>
              <div className="review-section order-financials">
                <h4>Order financials</h4>
                <div>
                  <span>
                    Gross order value<b>$1,284.00</b>
                  </span>
                  <span>
                    Platform commission (10%)
                    <b className="negative">−$128.40</b>
                  </span>
                  <span>
                    Net settlement<b className="positive">$1,155.60</b>
                  </span>
                </div>
              </div>
            </div>
            <div className="drawer-actions">
              <button className="secondary-btn">
                <Printer size={14} /> Print packing slip (PDF)
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  setSelectedOrder(null)
                  setModal("dispatch")
                }}
              >
                <Truck size={14} /> Dispatch shipment
              </button>
            </div>
          </aside>
        </div>
      )}
      {modal && (
        <SupplierDialog
          key={modal}
          modal={modal}
          close={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  const [portal, setPortal] = useState<PortalMode>(
    localStorage.getItem("nexus_active_portal") as PortalMode || "b2c",
  )
  const [locale, setLocale] = useState<Locale>(
    localStorage.getItem("nexus_locale") as Locale || "ar",
  )
  const [page, setPage] = useState<Page>("overview")
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    api.setPortal(portal)
    localStorage.setItem("nexus_active_portal", portal)
  }, [portal])

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = locale
    localStorage.setItem("nexus_locale", locale)
  }, [locale])

  const handleLocaleChange = (l: Locale) => {
    setLocale(l)
  }

  const handlePortalChange = (p: PortalMode) => {
    setPortal(p)
    api.setPortal(p)
    localStorage.setItem("nexus_active_portal", p)
    if (p === "supplier") {
      setPage("supplier")
    } else if (p === "admin" && page === "supplier") {
      setPage("overview")
    }
  }

  const navigate = (id: Page) => {
    setPage(id)
    if (id === "supplier") {
      setPortal("supplier")
    } else {
      setPortal("admin")
    }
    setMobileOpen(false)
  }

  if (portal === "b2b" || portal === "merchant") {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0f19" }}>
        <PortalSwitcher
          portal={portal}
          setPortal={handlePortalChange}
          locale={locale}
          setLocale={handleLocaleChange}
        />
        <B2BPortal
          locale={locale}
          setLocale={handleLocaleChange}
          onSwitchPortal={(p) => handlePortalChange(p)}
        />
      </div>
    )
  }

  if (portal === "b2c") {
    return (
      <div style={{ minHeight: "100vh", background: "#090d16" }}>
        <PortalSwitcher
          portal={portal}
          setPortal={handlePortalChange}
          locale={locale}
          setLocale={handleLocaleChange}
        />
        <B2CPortal
          locale={locale}
          setLocale={handleLocaleChange}
          onSwitchPortal={(p) => handlePortalChange(p)}
        />
      </div>
    )
  }

  if (portal === "supplier") {
    return (
      <div style={{ minHeight: "100vh", background: "#0c0a09" }}>
        <PortalSwitcher
          portal={portal}
          setPortal={handlePortalChange}
          locale={locale}
          setLocale={handleLocaleChange}
        />
        <CookPortal
          locale={locale}
          setLocale={handleLocaleChange}
          onSwitchPortal={(p) => handlePortalChange(p)}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <PortalSwitcher
        portal={portal}
        setPortal={handlePortalChange}
        locale={locale}
        setLocale={handleLocaleChange}
      />
      <div className="app-shell">
        <aside
          className={`sidebar ${collapsed ? "collapsed" : ""} ${
            mobileOpen ? "mobile-open" : ""
          }`}
        >
          <Logo collapsed={collapsed} locale={locale} />
          <nav>
            <span className="nav-label">
              {!collapsed ? translations[locale].nav.workspaces : "•••"}
            </span>
            {[
              {
                id: "overview" as Page,
                label: translations[locale].nav.overview,
                icon: LayoutDashboard,
              },
              {
                id: "kyc" as Page,
                label: translations[locale].nav.kyc,
                icon: ShieldCheck,
                badge: "12",
              },
              {
                id: "catalog" as Page,
                label: translations[locale].nav.catalog,
                icon: Box,
                badge: "35",
              },
              {
                id: "finance" as Page,
                label: translations[locale].nav.finance,
                icon: ReceiptText,
                badge: "3",
              },
              {
                id: "cms" as Page,
                label: translations[locale].nav.cms,
                icon: Store,
              },
              {
                id: "supplier" as Page,
                label: translations[locale].nav.supplier,
                icon: Store,
              },
            ].map((item) => (
              <button
                key={item.id}
                title={collapsed ? item.label : undefined}
                className={page === item.id ? "active" : ""}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.badge && <b>{item.badge}</b>}
              </button>
            ))}
            <span className="nav-label nav-secondary">
              {!collapsed ? translations[locale].nav.administration : "•••"}
            </span>
            <button
              className={page === "team" ? "active" : ""}
              onClick={() => navigate("team")}
            >
              <Users size={18} />
              <span>{translations[locale].nav.team}</span>
            </button>
            <button
              className={page === "audit" ? "active" : ""}
              onClick={() => navigate("audit")}
            >
              <ClipboardCheck size={18} />
              <span>{translations[locale].nav.audit}</span>
            </button>
            <button
              className={page === "settings" ? "active" : ""}
              onClick={() => navigate("settings")}
            >
              <Settings size={18} />
              <span>{translations[locale].nav.settings}</span>
            </button>
          </nav>
          <div className="sidebar-footer">
            {!collapsed && (
              <div className="support-card">
                <Headphones size={18} />
                <span>
                  <b>{translations[locale].nav.support}</b>
                  <small>{translations[locale].nav.supportTime}</small>
                </span>
                <ChevronRight size={14} className="rtl-flip" />
              </div>
            )}
            <button
              className="collapse-btn"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={17} className="rtl-flip" />
              ) : (
                <>
                  <PanelLeftClose size={17} className="rtl-flip" />
                  <span>{translations[locale].nav.collapse}</span>
                  <kbd>⌥ S</kbd>
                </>
              )}
            </button>
          </div>
        </aside>
        {mobileOpen && (
          <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />
        )}
        <main className="workspace">
          <Header
            page={page}
            onMenu={() => setMobileOpen(true)}
            locale={locale}
          />
          <div className="content">
            {page === "overview" && (
              <Overview navigate={navigate} locale={locale} />
            )}
            {page === "kyc" && <KycScreen locale={locale} />}
            {page === "catalog" && <CatalogScreen locale={locale} />}
            {page === "finance" && <FinanceScreen locale={locale} />}
            {page === "cms" && <CmsScreen locale={locale} />}
            {page === "supplier" && <SupplierPortal locale={locale} />}
            {page === "team" && <TeamRolesScreen locale={locale} />}
            {page === "audit" && <AuditLogScreen locale={locale} />}
            {page === "settings" && <PlatformSettingsScreen locale={locale} />}
          </div>
        </main>
      </div>
    </div>
  )
}

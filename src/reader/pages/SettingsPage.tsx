import { useState } from "react";
import {
  User,
  Globe,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  LogOut,
  Smartphone,
  Eye,
  BookOpen,
  Trash2,
  Info,
  Sparkles,
  Palette,
} from "lucide-react";

/* ───── Toggle ───── */
function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ${
        enabled
          ? "bg-primary shadow-[0_0_12px_hsl(153_60%_53%/0.35)]"
          : "bg-muted"
      }`}
    >
      <span
        className="pointer-events-none inline-block rounded-full bg-white shadow-md transition-all duration-300"
        style={{
          height: 20,
          width: 20,
          transform: enabled ? "translateX(26px)" : "translateX(4px)",
        }}
      />
    </button>
  );
}

/* ───── Segmented Control ───── */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-background p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ───── Setting Item ───── */
interface SettingItemProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  subtitle?: string;
  value?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  last?: boolean;
}

function SettingItem({
  icon,
  iconBg = "bg-primary/10 text-primary",
  label,
  subtitle,
  value,
  onClick,
  showChevron,
  destructive,
  last,
}: SettingItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-white/[0.03] active:bg-white/[0.05] ${
        !last ? "border-b border-white/[0.04]" : ""
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          destructive ? "bg-destructive/10 text-destructive" : iconBg
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={`block text-sm font-medium ${
            destructive ? "text-destructive" : "text-foreground"
          }`}
        >
          {label}
        </span>
        {subtitle && (
          <span className="block text-[11px] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
      {value && (
        <span className="shrink-0 text-sm text-muted-foreground">{value}</span>
      )}
      {showChevron && (
        <ChevronRight size={16} className="shrink-0 text-muted-foreground/50" />
      )}
    </button>
  );
}

/* ───── Section Title ───── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 mt-7 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </h3>
  );
}

/* ═══════ Main ═══════ */
export default function SettingsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [readingDirection, setReadingDirection] = useState<"rtl" | "ltr">(
    "rtl",
  );
  const [readingMode, setReadingMode] = useState<"webtoon" | "paged">(
    "webtoon",
  );
  const [brightness, setBrightness] = useState(80);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-2.5 bg-background/90 px-4 py-3 backdrop-blur-lg">
        <Sparkles size={20} className="text-primary" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Sozlamalar
        </h1>
      </header>

      <div className="space-y-1 px-4">
        {/* ── Profile Section ── */}
        {!isLoggedIn ? (
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-primary/[0.08] via-card to-card">
            <div className="p-5">
              <div className="mb-4 flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                  <User size={26} className="text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Kirish
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hisobingiz bilan sinxronlang
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLoggedIn(true)}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-lg shadow-white/5 transition-all duration-200 hover:shadow-xl hover:shadow-white/10 active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google bilan kirish
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-primary/[0.08] via-card to-card">
            <div className="flex items-center gap-3.5 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-sm font-bold text-primary">
                FO
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-foreground">
                  Foydalanuvchi
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  user@gmail.com
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLoggedIn(false)}
                className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive transition-all duration-200 hover:bg-destructive/20 active:scale-95"
              >
                <LogOut size={14} />
                Chiqish
              </button>
            </div>
          </div>
        )}

        {/* ── Reading Settings ── */}
        <SectionTitle>O'qish sozlamalari</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
          <SettingItem
            icon={<BookOpen size={18} />}
            label="O'qish yo'nalishi"
            subtitle="Sahifalar tartibi"
            value={
              <SegmentedControl
                options={[
                  { label: "RTL", value: "rtl" as const },
                  { label: "LTR", value: "ltr" as const },
                ]}
                value={readingDirection}
                onChange={setReadingDirection}
              />
            }
          />
          <SettingItem
            icon={<Smartphone size={18} />}
            iconBg="bg-blue-500/10 text-blue-400"
            label="O'qish rejimi"
            subtitle="Scroll yoki sahifali"
            value={
              <SegmentedControl
                options={[
                  { label: "Webtoon", value: "webtoon" as const },
                  { label: "Sahifali", value: "paged" as const },
                ]}
                value={readingMode}
                onChange={setReadingMode}
              />
            }
          />
          {/* Brightness slider */}
          <div className="border-b-0 px-4 py-4">
            <div className="mb-3 flex items-center gap-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Eye size={18} />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">
                Yorqinlik
              </span>
              <span className="min-w-[3ch] text-right text-sm font-semibold text-primary">
                {brightness}%
              </span>
            </div>
            <div className="px-1">
              <input
                type="range"
                min={10}
                max={100}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>
          </div>
        </div>

        {/* ── App Settings ── */}
        <SectionTitle>Ilova sozlamalari</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
          <SettingItem
            icon={<Globe size={18} />}
            iconBg="bg-indigo-500/10 text-indigo-400"
            label="Til"
            subtitle="Interfeys tili"
            value="O'zbekcha"
            showChevron
          />
          <SettingItem
            icon={<Bell size={18} />}
            iconBg="bg-rose-500/10 text-rose-400"
            label="Bildirishnomalar"
            subtitle="Yangi boblar haqida"
            value={
              <Toggle
                enabled={notifications}
                onToggle={() => setNotifications(!notifications)}
              />
            }
          />
          <SettingItem
            icon={<Palette size={18} />}
            iconBg="bg-purple-500/10 text-purple-400"
            label="Mavzu"
            subtitle="Ilova ko'rinishi"
            value="Qorong'u"
            showChevron
            last
          />
        </div>

        {/* ── Information ── */}
        <SectionTitle>Ma'lumot</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
          <SettingItem
            icon={<HelpCircle size={18} />}
            iconBg="bg-cyan-500/10 text-cyan-400"
            label="Yordam"
            subtitle="Ko'p so'raladigan savollar"
            showChevron
          />
          <SettingItem
            icon={<Shield size={18} />}
            iconBg="bg-emerald-500/10 text-emerald-400"
            label="Maxfiylik siyosati"
            showChevron
          />
          <SettingItem
            icon={<Info size={18} />}
            iconBg="bg-sky-500/10 text-sky-400"
            label="Ilova haqida"
            value={
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                v1.0.0
              </span>
            }
            last
          />
        </div>

        {/* ── Danger Zone ── */}
        <SectionTitle>Xavfli zona</SectionTitle>
        <div className="mb-8 overflow-hidden rounded-2xl border border-destructive/10 bg-card">
          <SettingItem
            icon={<Trash2 size={18} />}
            iconBg="bg-orange-500/10 text-orange-400"
            label="Keshni tozalash"
            subtitle="Vaqtinchalik fayllarni o'chirish"
            showChevron
          />
          <SettingItem
            icon={<Trash2 size={18} />}
            label="Hisobni o'chirish"
            subtitle="Bu amalni qaytarib bo'lmaydi"
            destructive
            last
          />
        </div>
      </div>
    </div>
  );
}

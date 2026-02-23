import { useState } from "react";
import {
  User,
  Moon,
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
} from "lucide-react";

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
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
        enabled ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className="pointer-events-none inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{
          height: 18,
          width: 18,
          transform: enabled ? "translateX(22px)" : "translateX(4px)",
        }}
      />
    </button>
  );
}

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  last?: boolean;
}

function SettingItem({
  icon,
  label,
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
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 ${
        !last ? "border-b border-border" : ""
      }`}
    >
      <span
        className={destructive ? "text-destructive" : "text-muted-foreground"}
      >
        {icon}
      </span>
      <span
        className={`flex-1 text-sm font-medium ${
          destructive ? "text-destructive" : "text-foreground"
        }`}
      >
        {label}
      </span>
      {value && (
        <span className="text-sm text-muted-foreground">{value}</span>
      )}
      {showChevron && (
        <ChevronRight size={16} className="text-muted-foreground" />
      )}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-6 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 px-4 py-3 backdrop-blur-lg">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Sozlamalar
        </h1>
      </header>

      <div className="px-4">
        {/* Profile Section */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {!isLoggedIn ? (
            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <User size={24} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
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
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50/10"
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
          ) : (
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                FO
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  Foydalanuvchi
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  user@gmail.com
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLoggedIn(false)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut size={14} />
                Chiqish
              </button>
            </div>
          )}
        </div>

        {/* Reading Settings */}
        <SectionTitle>O'qish sozlamalari</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <SettingItem
            icon={<BookOpen size={20} />}
            label="O'qish yo'nalishi"
            value={
              <div className="flex items-center gap-1 overflow-hidden rounded-lg border border-border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setReadingDirection("rtl")}
                  className={`px-3 py-1.5 transition-colors ${
                    readingDirection === "rtl"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  RTL
                </button>
                <button
                  type="button"
                  onClick={() => setReadingDirection("ltr")}
                  className={`px-3 py-1.5 transition-colors ${
                    readingDirection === "ltr"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  LTR
                </button>
              </div>
            }
          />
          <SettingItem
            icon={<Smartphone size={20} />}
            label="O'qish rejimi"
            value={
              <div className="flex items-center gap-1 overflow-hidden rounded-lg border border-border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setReadingMode("webtoon")}
                  className={`px-3 py-1.5 transition-colors ${
                    readingMode === "webtoon"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Webtoon
                </button>
                <button
                  type="button"
                  onClick={() => setReadingMode("paged")}
                  className={`px-3 py-1.5 transition-colors ${
                    readingMode === "paged"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sahifali
                </button>
              </div>
            }
          />
          <div className="px-4 py-3.5">
            <div className="mb-2 flex items-center gap-3">
              <span className="text-muted-foreground">
                <Eye size={20} />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">
                Yorqinlik
              </span>
              <span className="text-sm text-muted-foreground">
                {brightness}%
              </span>
            </div>
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

        {/* App Settings */}
        <SectionTitle>Ilovalar sozlamalari</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <SettingItem
            icon={<Globe size={20} />}
            label="Til"
            value="O'zbekcha"
            showChevron
          />
          <SettingItem
            icon={<Bell size={20} />}
            label="Bildirishnomalar"
            value={
              <Toggle
                enabled={notifications}
                onToggle={() => setNotifications(!notifications)}
              />
            }
          />
          <SettingItem
            icon={<Moon size={20} />}
            label="Mavzu"
            value="Qorong'u"
            showChevron
            last
          />
        </div>

        {/* Information */}
        <SectionTitle>Ma'lumot</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <SettingItem
            icon={<HelpCircle size={20} />}
            label="Yordam"
            showChevron
          />
          <SettingItem
            icon={<Shield size={20} />}
            label="Maxfiylik"
            showChevron
          />
          <SettingItem
            icon={<Info size={20} />}
            label="Ilova haqida"
            value="1.0.0"
            last
          />
        </div>

        {/* Danger Zone */}
        <SectionTitle>Xavfli zona</SectionTitle>
        <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card">
          <SettingItem
            icon={<Trash2 size={20} />}
            label="Keshni tozalash"
            showChevron
          />
          <SettingItem
            icon={<Trash2 size={20} />}
            label="Hisobni o'chirish"
            destructive
            last
          />
        </div>
      </div>
    </div>
  );
}

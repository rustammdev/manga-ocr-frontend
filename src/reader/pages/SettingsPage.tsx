import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
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
  AlertTriangle,
  Check,
  X,
  Database,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/** Trigger haptic feedback if available */
function haptic(ms = 15) {
  try {
    navigator?.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

/** localStorage wrapper */
function loadSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`settings:${key}`);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveSetting<T>(key: string, value: T) {
  try {
    localStorage.setItem(`settings:${key}`, JSON.stringify(value));
  } catch {
    /* quota exceeded etc */
  }
}

/* ─────────────────────────────────────────────
   Confirm Bottom-Sheet Modal (drag-to-dismiss)
   ───────────────────────────────────────────── */
function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [closing, setClosing] = useState(false);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  function handleClose() {
    haptic(10);
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setDragOffset(0);
      onCancel();
    }, 200);
  }

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragOffset(dy);
  }
  function onTouchEnd() {
    if (dragOffset > 100) {
      handleClose();
    } else {
      setDragOffset(0);
    }
  }

  if (!open && !closing) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center ${
        closing ? "animate-[settings-overlay-in_0.2s_ease-in_reverse_forwards]" : "settings-overlay"
      }`}
      style={{ backgroundColor: `rgba(0,0,0,${closing ? 0 : 0.6})` }}
      onClick={handleClose}
    >
      <div
        ref={sheetRef}
        className={`w-full max-w-sm overflow-hidden rounded-t-2xl border border-white/[0.08] bg-card sm:mb-0 sm:rounded-2xl ${
          closing
            ? "animate-[settings-modal-in_0.2s_ease-in_reverse_forwards]"
            : "settings-modal"
        }`}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? "none" : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle size={24} className="text-destructive" />
          </div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex border-t border-white/[0.06]">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.03] active:bg-white/[0.06]"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={() => {
              haptic(25);
              onConfirm();
            }}
            className="flex-1 border-l border-white/[0.06] px-4 py-3.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/15"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toast (with icon + enter/exit animation)
   ───────────────────────────────────────────── */
function Toast({
  message,
  type = "success",
  visible,
  onDone,
}: {
  message: string;
  type?: "success" | "error" | "info";
  visible: boolean;
  onDone: () => void;
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setExiting(false);
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, 200);
    }, 2000);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible && !exiting) return null;

  const icon =
    type === "success" ? (
      <Check size={16} className="text-primary" />
    ) : type === "error" ? (
      <X size={16} className="text-destructive" />
    ) : (
      <Info size={16} className="text-blue-400" />
    );

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-50 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-card px-4 py-3 text-sm font-medium text-foreground shadow-xl ${
        exiting ? "toast-exit" : "toast-enter"
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06]">
        {icon}
      </span>
      {message}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Auto-save indicator
   ───────────────────────────────────────────── */
function SavedIndicator({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="saved-indicator ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
      <Check size={12} />
      Saqlandi
    </span>
  );
}

/* ─────────────────────────────────────────────
   Toggle (with state label for accessibility)
   ───────────────────────────────────────────── */
function Toggle({
  enabled,
  onToggle,
  showLabel = false,
}: {
  enabled: boolean;
  onToggle: () => void;
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span
          className={`text-[11px] font-medium transition-colors duration-200 ${
            enabled ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {enabled ? "Yoqilgan" : "O'chirilgan"}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? "Yoqilgan" : "O'chirilgan"}
        onClick={() => {
          haptic();
          onToggle();
        }}
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
    </div>
  );
}

/* ─────────────────────────────────────────────
   Segmented Control (sliding indicator)
   ───────────────────────────────────────────── */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const activeIndex = options.findIndex((o) => o.value === value);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      "[data-seg-btn]",
    );
    const btn = buttons[activeIndex];
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center rounded-lg bg-background p-1"
    >
      <div
        className="absolute top-1 h-[calc(100%-8px)] rounded-md bg-primary shadow-sm shadow-primary/25 transition-all duration-250 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          data-seg-btn
          type="button"
          onClick={() => {
            haptic();
            onChange(opt.value);
          }}
          className={`relative z-10 rounded-md px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
            value === opt.value
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Setting Item
   ───────────────────────────────────────────── */
interface SettingItemProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: React.ReactNode;
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
      className={`group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-white/[0.03] active:bg-white/[0.05] ${
        !last ? "border-b border-white/[0.04]" : ""
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-active:scale-90 ${
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
        <ChevronRight
          size={16}
          className="shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5 group-active:translate-x-1"
        />
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Section Title
   ───────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 px-1 pt-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </h3>
  );
}

/* ─────────────────────────────────────────────
   Animated Section wrapper
   ───────────────────────────────────────────── */
function AnimatedSection({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className="settings-animate-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Skeleton for profile loading
   ───────────────────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-3.5 p-5">
      <div className="skeleton h-14 w-14 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2.5">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-3 w-48 rounded" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main SettingsPage
   ═══════════════════════════════════════════════ */
export default function SettingsPage() {
  /* ── State with localStorage persistence ── */
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    loadSetting("isLoggedIn", false),
  );
  const [loginLoading, setLoginLoading] = useState(false);
  const [readingDirection, setReadingDirection] = useState<"rtl" | "ltr">(() =>
    loadSetting("readingDirection", "rtl"),
  );
  const [readingMode, setReadingMode] = useState<"webtoon" | "paged">(() =>
    loadSetting("readingMode", "webtoon"),
  );
  const [brightness, setBrightness] = useState(() =>
    loadSetting("brightness", 80),
  );
  const [notifications, setNotifications] = useState(() =>
    loadSetting("notifications", true),
  );

  // Scroll state for header shadow
  const [scrolled, setScrolled] = useState(false);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "",
    onConfirm: () => {},
  });

  // Toast
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error" | "info",
  });

  // Auto-save indicator
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Fake cache size
  const [cacheSize] = useState(() => {
    return (Math.random() * 40 + 8).toFixed(1);
  });

  // Profile loading skeleton
  const [profileLoading, setProfileLoading] = useState(false);

  /* ── Persist settings ── */
  useEffect(() => {
    saveSetting("readingDirection", readingDirection);
  }, [readingDirection]);
  useEffect(() => {
    saveSetting("readingMode", readingMode);
  }, [readingMode]);
  useEffect(() => {
    saveSetting("brightness", brightness);
  }, [brightness]);
  useEffect(() => {
    saveSetting("notifications", notifications);
  }, [notifications]);
  useEffect(() => {
    saveSetting("isLoggedIn", isLoggedIn);
  }, [isLoggedIn]);

  /* ── Scroll listener for header shadow ── */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Auto-save flash ── */
  function flashSaved(key: string) {
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1200);
  }

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ visible: true, message, type });
    },
    [],
  );

  /* ── Setting change handlers with auto-save ── */
  function changeDirection(v: "rtl" | "ltr") {
    setReadingDirection(v);
    flashSaved("direction");
  }
  function changeMode(v: "webtoon" | "paged") {
    setReadingMode(v);
    flashSaved("mode");
  }
  function changeBrightness(v: number) {
    setBrightness(v);
  }
  function toggleNotifications() {
    setNotifications((prev) => !prev);
    flashSaved("notifications");
  }

  /* ── Auth handlers ── */
  function handleLogin() {
    setLoginLoading(true);
    setProfileLoading(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      setLoginLoading(false);
      setTimeout(() => setProfileLoading(false), 800);
    }, 1200);
  }

  function handleLogout() {
    haptic(20);
    setConfirmModal({
      open: true,
      title: "Chiqishni tasdiqlang",
      description: "Hisobingizdan chiqmoqchimisiz?",
      confirmLabel: "Chiqish",
      onConfirm: () => {
        setIsLoggedIn(false);
        setConfirmModal((m) => ({ ...m, open: false }));
        showToast("Hisobdan chiqdingiz");
      },
    });
  }

  function handleClearCache() {
    haptic(20);
    setConfirmModal({
      open: true,
      title: "Keshni tozalash",
      description: `${cacheSize} MB vaqtinchalik fayllar o'chiriladi. Davom etasizmi?`,
      confirmLabel: "Tozalash",
      onConfirm: () => {
        setConfirmModal((m) => ({ ...m, open: false }));
        showToast("Kesh tozalandi");
      },
    });
  }

  function handleDeleteAccount() {
    haptic(30);
    setConfirmModal({
      open: true,
      title: "Hisobni o'chirish",
      description:
        "Bu amalni qaytarib bo'lmaydi. Barcha ma'lumotlaringiz o'chib ketadi.",
      confirmLabel: "O'chirish",
      onConfirm: () => {
        setIsLoggedIn(false);
        setConfirmModal((m) => ({ ...m, open: false }));
        showToast("Hisob o'chirildi");
      },
    });
  }

  /* ── Slider filled track percentage ── */
  const sliderPercent = ((brightness - 10) / 90) * 100;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── Sticky Header with scroll shadow ── */}
      <header
        className={`sticky top-0 z-40 flex items-center gap-2.5 px-4 py-3 backdrop-blur-lg transition-all duration-300 ${
          scrolled
            ? "bg-background/95 shadow-[0_1px_12px_rgba(0,0,0,0.4)]"
            : "bg-background/90"
        }`}
      >
        <Sparkles size={20} className="text-primary" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Sozlamalar
        </h1>
      </header>

      <div className="px-4">
        {/* ── Profile Section ── */}
        <AnimatedSection delay={0}>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-primary/[0.08] via-card to-card">
            {!isLoggedIn && !profileLoading ? (
              /* Logged out */
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
                  onClick={handleLogin}
                  disabled={loginLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-60"
                >
                  {loginLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
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
                  )}
                  {loginLoading ? "Kirish..." : "Google bilan kirish"}
                </button>
              </div>
            ) : profileLoading ? (
              /* Skeleton loading */
              <ProfileSkeleton />
            ) : (
              /* Logged in with gradient ring avatar */
              <div className="flex items-center gap-3.5 p-4">
                <div className="avatar-gradient-ring">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-sm font-bold text-primary">
                    FO
                  </div>
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
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive transition-all duration-200 hover:bg-destructive/20 active:scale-95"
                >
                  <LogOut size={14} />
                  Chiqish
                </button>
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* ── Reading Settings ── */}
        <AnimatedSection delay={60}>
          <SectionTitle>O'qish sozlamalari</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
            <SettingItem
              icon={<BookOpen size={18} />}
              label={
                <>
                  O'qish yo'nalishi
                  <SavedIndicator show={savedKey === "direction"} />
                </>
              }
              subtitle="Sahifalar tartibi"
              value={
                <SegmentedControl
                  options={[
                    { label: "RTL", value: "rtl" as const },
                    { label: "LTR", value: "ltr" as const },
                  ]}
                  value={readingDirection}
                  onChange={changeDirection}
                />
              }
            />
            <SettingItem
              icon={<Smartphone size={18} />}
              iconBg="bg-blue-500/10 text-blue-400"
              label={
                <>
                  O'qish rejimi
                  <SavedIndicator show={savedKey === "mode"} />
                </>
              }
              subtitle="Scroll yoki sahifali"
              value={
                <SegmentedControl
                  options={[
                    { label: "Webtoon", value: "webtoon" as const },
                    { label: "Sahifali", value: "paged" as const },
                  ]}
                  value={readingMode}
                  onChange={changeMode}
                />
              }
            />
            {/* Brightness slider with filled track */}
            <div className="px-4 py-4">
              <div className="mb-3 flex items-center gap-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Eye size={18} />
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  Yorqinlik
                </span>
                <span className="min-w-[3ch] text-right text-sm font-semibold tabular-nums text-primary transition-all duration-150">
                  {brightness}%
                </span>
              </div>
              <div className="px-1">
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={brightness}
                  onChange={(e) => changeBrightness(Number(e.target.value))}
                  className="settings-slider"
                  style={{
                    background: `linear-gradient(to right, hsl(153 60% 53%) 0%, hsl(153 60% 53%) ${sliderPercent}%, hsl(var(--muted)) ${sliderPercent}%, hsl(var(--muted)) 100%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ── App Settings ── */}
        <AnimatedSection delay={120}>
          <SectionTitle>Ilova sozlamalari</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
            <SettingItem
              icon={<Globe size={18} />}
              iconBg="bg-indigo-500/10 text-indigo-400"
              label="Til"
              subtitle="Interfeys tili"
              value="O'zbekcha"
              onClick={() => showToast("Til sozlamalari tez kunda", "info")}
              showChevron
            />
            <SettingItem
              icon={<Bell size={18} />}
              iconBg="bg-rose-500/10 text-rose-400"
              label={
                <>
                  Bildirishnomalar
                  <SavedIndicator show={savedKey === "notifications"} />
                </>
              }
              subtitle="Yangi boblar haqida"
              value={
                <Toggle
                  enabled={notifications}
                  onToggle={toggleNotifications}
                  showLabel
                />
              }
            />
            <SettingItem
              icon={<Palette size={18} />}
              iconBg="bg-purple-500/10 text-purple-400"
              label="Mavzu"
              subtitle="Ilova ko'rinishi"
              value="Qorong'u"
              onClick={() => showToast("Mavzu sozlamalari tez kunda", "info")}
              showChevron
              last
            />
          </div>
        </AnimatedSection>

        {/* ── Information ── */}
        <AnimatedSection delay={180}>
          <SectionTitle>Ma'lumot</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
            <SettingItem
              icon={<HelpCircle size={18} />}
              iconBg="bg-cyan-500/10 text-cyan-400"
              label="Yordam"
              subtitle="Ko'p so'raladigan savollar"
              onClick={() => showToast("Yordam sahifasi tez kunda", "info")}
              showChevron
            />
            <SettingItem
              icon={<Shield size={18} />}
              iconBg="bg-emerald-500/10 text-emerald-400"
              label="Maxfiylik siyosati"
              onClick={() =>
                showToast("Maxfiylik siyosati tez kunda", "info")
              }
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
              onClick={() => showToast("MangaReader v1.0.0", "info")}
              last
            />
          </div>
        </AnimatedSection>

        {/* ── Danger Zone (with glow) ── */}
        <AnimatedSection delay={240}>
          <SectionTitle>Xavfli zona</SectionTitle>
          <div className="danger-glow mb-8 overflow-hidden rounded-2xl border border-destructive/10 bg-card">
            <SettingItem
              icon={<Database size={18} />}
              iconBg="bg-orange-500/10 text-orange-400"
              label="Keshni tozalash"
              subtitle="Vaqtinchalik fayllarni o'chirish"
              value={
                <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-400">
                  {cacheSize} MB
                </span>
              }
              onClick={handleClearCache}
              showChevron
            />
            <SettingItem
              icon={<Trash2 size={18} />}
              label="Hisobni o'chirish"
              subtitle="Bu amalni qaytarib bo'lmaydi"
              onClick={handleDeleteAccount}
              destructive
              last
            />
          </div>
        </AnimatedSection>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, open: false }))}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDone={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  );
}

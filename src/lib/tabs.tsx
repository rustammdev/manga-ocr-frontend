// Brauzerdagi kabi ichki "tab"larni boshqaradi. Har bir tab o'zining
// alohida (MemoryRouter) navigatsiyasiga ega bo'ladi va barcha tablar
// mount holatida saqlanadi (faolmaslari faqat yashiriladi). Shu sababli
// bir tabda boshlangan tarjima yoki OCR boshqa tabga o'tilganda ham
// fonda davom etaveradi — qaytib kelganda hammasi joyida turadi.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { NavigateFunction } from "react-router-dom";

import { chapterLabel } from "./utils";

export type TabItem = {
  id: string;
  path: string;
  title: string;
};

type TabsContextValue = {
  tabs: TabItem[];
  activeId: string;
  addTab: (path?: string) => void;
  closeTab: (id: string) => void;
  selectTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Omit<TabItem, "id">>) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  // Har bir tab o'z navigate funksiyasini ro'yxatdan o'tkazadi. Yon menyu
  // (sidebar) routerlardan tashqarida bo'lgani uchun shu orqali faol tab
  // ichida navigatsiya qiladi.
  registerNavigator: (id: string, navigate: NavigateFunction) => void;
  navigateActive: (path: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

const STORAGE_KEY = "appTabs";
const COLLAPSE_KEY = "sidebarCollapsed";

type PersistShape = { tabs: TabItem[]; activeId: string };

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Tab sarlavhasini joriy yo'ldan hosil qiladi. */
export function titleForPath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  if (seg.length === 0) return "Dashboard";
  const [a, b, c] = seg;
  switch (a) {
    case "new":
      return "Yangi manga";
    case "upload":
      return b ? `Yuklash: ${safeDecode(b)}` : "Yuklash";
    case "mangadex":
      return b ? "MangaDex" : "Search Manga";
    case "jobs":
      return "Joblar";
    case "job":
      return "Job";
    case "project":
      return b ? safeDecode(b) : "Loyiha";
    case "results":
      return b && c ? `${safeDecode(b)} · ${chapterLabel(c)}` : "Natijalar";
    case "edit":
      return c ? `Edit · ${chapterLabel(c)}` : "Edit";
    case "crop":
      return c ? `Crop · ${chapterLabel(c)}` : "Crop";
    case "reorder":
      return c ? `Tartib · ${chapterLabel(c)}` : "Tartib";
    default:
      return safeDecode(a);
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function loadInitial(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistShape;
      if (parsed.tabs?.length) {
        const activeId = parsed.tabs.some((t) => t.id === parsed.activeId)
          ? parsed.activeId
          : parsed.tabs[0].id;
        return { tabs: parsed.tabs, activeId };
      }
    }
  } catch {
    /* ignore */
  }
  const id = newId();
  return { tabs: [{ id, path: "/", title: "Dashboard" }], activeId: id };
}

export function TabsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistShape>(loadInitial);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(COLLAPSE_KEY);
    if (saved === null) return true;
    return saved === "true";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const addTab = useCallback((path: string = "/") => {
    const id = newId();
    setState((prev) => ({
      tabs: [...prev.tabs, { id, path, title: titleForPath(path) }],
      activeId: id,
    }));
  }, []);

  const selectTab = useCallback((id: string) => {
    setState((prev) =>
      prev.activeId === id ? prev : { ...prev, activeId: id },
    );
  }, []);

  const closeTab = useCallback((id: string) => {
    setState((prev) => {
      if (prev.tabs.length <= 1) return prev; // kamida bitta tab qoladi
      const idx = prev.tabs.findIndex((t) => t.id === id);
      const tabs = prev.tabs.filter((t) => t.id !== id);
      let activeId = prev.activeId;
      if (prev.activeId === id) {
        const neighbor = tabs[idx] ?? tabs[idx - 1] ?? tabs[0];
        activeId = neighbor.id;
      }
      return { tabs, activeId };
    });
  }, []);

  const updateTab = useCallback(
    (id: string, patch: Partial<Omit<TabItem, "id">>) => {
      setState((prev) => {
        const tab = prev.tabs.find((t) => t.id === id);
        if (!tab) return prev;
        const changed = (Object.keys(patch) as (keyof typeof patch)[]).some(
          (k) => patch[k] !== undefined && patch[k] !== tab[k],
        );
        if (!changed) return prev;
        return {
          ...prev,
          tabs: prev.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        };
      });
    },
    [],
  );

  const navigatorsRef = useRef<Map<string, NavigateFunction>>(new Map());
  const activeIdRef = useRef(state.activeId);
  activeIdRef.current = state.activeId;

  const registerNavigator = useCallback(
    (id: string, navigate: NavigateFunction) => {
      navigatorsRef.current.set(id, navigate);
    },
    [],
  );

  const navigateActive = useCallback((path: string) => {
    const navigate = navigatorsRef.current.get(activeIdRef.current);
    if (navigate) navigate(path);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<TabsContextValue>(
    () => ({
      tabs: state.tabs,
      activeId: state.activeId,
      addTab,
      closeTab,
      selectTab,
      updateTab,
      collapsed,
      toggleCollapsed,
      registerNavigator,
      navigateActive,
    }),
    [
      state,
      addTab,
      closeTab,
      selectTab,
      updateTab,
      collapsed,
      toggleCollapsed,
      registerNavigator,
      navigateActive,
    ],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useTabs must be used within a TabsProvider");
  return ctx;
}

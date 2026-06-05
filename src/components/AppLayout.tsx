import {
  LayoutDashboard,
  Upload,
  Activity,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Search,
} from "lucide-react";

import { cn } from "../lib/utils";
import { useTabs } from "../lib/tabs";
import TabBar from "./TabBar";
import TabView from "./TabView";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/new", label: "Yangi manga", icon: Plus },
  { to: "/upload", label: "Yuklash", icon: Upload },
  { to: "/mangadex", label: "Search Manga", icon: Search },
  { to: "/jobs", label: "Joblar", icon: Activity },
];

export default function AppLayout() {
  const {
    tabs,
    activeId,
    collapsed,
    toggleCollapsed,
    navigateActive,
  } = useTabs();

  const activeTab = tabs.find((t) => t.id === activeId);
  const activePath = activeTab?.path ?? "/";

  function isActiveRoute(to: string) {
    const path = activePath.split("?")[0];
    if (to === "/") return path === "/";
    return path.startsWith(to);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            M
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-semibold text-sidebar-foreground">
              Manga Pipeline
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.to);
            return (
              <button
                key={item.to}
                onClick={() => navigateActive(item.to)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border px-2 py-2">
          <button
            onClick={toggleCollapsed}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="truncate">Yig'ish</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TabBar />
        <main className="relative flex-1 overflow-hidden">
          {tabs.map((tab) => (
            <TabView key={tab.id} tab={tab} active={tab.id === activeId} />
          ))}
        </main>
      </div>
    </div>
  );
}

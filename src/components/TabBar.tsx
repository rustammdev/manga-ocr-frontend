import { Plus, X } from "lucide-react";

import { cn } from "../lib/utils";
import { useTabs } from "../lib/tabs";

/** Brauzerdagi kabi yuqori tab paneli: tablar + yangi tab ("+") tugmasi. */
export default function TabBar() {
  const { tabs, activeId, addTab, closeTab, selectTab } = useTabs();

  return (
    <div className="flex h-10 shrink-0 items-stretch gap-1 border-b border-sidebar-border bg-sidebar px-2">
      <div className="flex flex-1 items-stretch gap-1 overflow-x-auto py-1.5">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              onMouseDown={(e) => {
                // O'rta tugma bilan yopish (brauzer odati).
                if (e.button === 1) {
                  e.preventDefault();
                  closeTab(tab.id);
                }
              }}
              role="tab"
              aria-selected={active}
              title={tab.title}
              className={cn(
                "group flex max-w-[200px] cursor-pointer items-center gap-2 rounded-md border px-3 text-[13px] transition-colors",
                active
                  ? "border-sidebar-border bg-background text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span className="truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-foreground/15",
                    active ? "opacity-70" : "opacity-0 group-hover:opacity-70",
                  )}
                  aria-label="Tabni yopish"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => addTab("/")}
        className="my-1.5 flex w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Yangi tab"
        title="Yangi tab"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

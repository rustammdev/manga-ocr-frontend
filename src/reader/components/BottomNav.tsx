import { NavLink } from "react-router-dom";
import { Home, Search, Library, Clock, Settings } from "lucide-react";

const navItems = [
  { to: "/reader", icon: Home, label: "Bosh sahifa" },
  { to: "/reader/browse", icon: Search, label: "Qidirish" },
  { to: "/reader/library", icon: Library, label: "Kutubxona" },
  { to: "/reader/updates", icon: Clock, label: "Yangiliklar" },
  { to: "/reader/settings", icon: Settings, label: "Sozlamalar" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/reader"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    isActive ? "bg-primary/15 scale-105" : ""
                  }`}
                >
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

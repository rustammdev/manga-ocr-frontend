import { NavLink, Outlet } from "react-router-dom";

import { cn } from "../lib/utils";

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="container-page flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              ◈
            </div>
            <div>
              <div className="text-lg font-semibold">Manga Pipeline</div>
              <div className="text-xs text-muted-foreground">Editorial Workspace</div>
            </div>
          </NavLink>
          <nav className="flex items-center gap-2 text-sm">
            {[
              { to: "/", label: "Dashboard" },
              { to: "/upload", label: "Yuklash" },
              { to: "/jobs", label: "Joblar" },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3 py-1.5 transition",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container-page">
        <Outlet />
      </main>
    </div>
  );
}

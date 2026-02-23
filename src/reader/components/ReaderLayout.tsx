import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function ReaderLayout() {
  const location = useLocation();
  // Hide bottom nav in chapter reader for immersive reading
  const isReading = location.pathname.includes("/reader/read/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={isReading ? "" : "pb-20"}>
        <Outlet />
      </main>
      {!isReading && <BottomNav />}
    </div>
  );
}

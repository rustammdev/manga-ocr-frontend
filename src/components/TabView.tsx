import { useEffect } from "react";
import {
  MemoryRouter,
  useLocation,
  useNavigate,
} from "react-router-dom";

import AppRoutes from "../AppRoutes";
import { titleForPath, useTabs, type TabItem } from "../lib/tabs";

/**
 * Tab ichidagi router holatini (yo'l + sarlavha) global tab do'koniga
 * sinxronlaydi va tab navigatsiya funksiyasini ro'yxatdan o'tkazadi.
 */
function TabSync({ id }: { id: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateTab, registerNavigator } = useTabs();

  useEffect(() => {
    registerNavigator(id, navigate);
  }, [id, navigate, registerNavigator]);

  useEffect(() => {
    const path = location.pathname + location.search;
    updateTab(id, { path, title: titleForPath(location.pathname) });
  }, [id, location.pathname, location.search, updateTab]);

  return null;
}

/**
 * Har bir tab o'zining MemoryRouter'iga ega. Tablar doim mount holatida
 * qoladi (faolmaslari yashiriladi), shu sababli ulardagi WebSocket'lar,
 * timerlar va davom etayotgan tarjima/OCR jarayonlari uzilmaydi.
 */
export default function TabView({
  tab,
  active,
}: {
  tab: TabItem;
  active: boolean;
}) {
  return (
    <div
      className="h-full w-full overflow-auto"
      style={{ display: active ? "block" : "none" }}
      aria-hidden={!active}
    >
      <MemoryRouter initialEntries={[tab.path]}>
        <TabSync id={tab.id} />
        <div className="page-container">
          <AppRoutes />
        </div>
      </MemoryRouter>
    </div>
  );
}

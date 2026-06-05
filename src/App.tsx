import AppLayout from "./components/AppLayout";
import { TabsProvider } from "./lib/tabs";

export default function App() {
  return (
    <TabsProvider>
      <AppLayout />
    </TabsProvider>
  );
}

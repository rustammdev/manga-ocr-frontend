import { Routes, Route } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import ProjectPage from "./pages/ProjectPage";
import ResultsPage from "./pages/ResultsPage";
import EditorPage from "./pages/EditorPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/upload/:manga" element={<UploadPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/job/:jobId" element={<JobDetailPage />} />
        <Route path="/project/:manga" element={<ProjectPage />} />
        <Route path="/results/:manga/:chapter" element={<ResultsPage />} />
        <Route path="/edit/:manga/:chapter" element={<EditorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

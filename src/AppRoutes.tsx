import { Routes, Route } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import ProjectPage from "./pages/ProjectPage";
import ResultsPage from "./pages/ResultsPage";
import EditorPage from "./pages/EditorPage";
import CropPreviewPage from "./pages/CropPreviewPage";
import ReorderPage from "./pages/ReorderPage";
import NewProjectPage from "./pages/NewProjectPage";
import MangaDexSearchPage from "./pages/MangaDexSearchPage";
import MangaDexDetailPage from "./pages/MangaDexDetailPage";
import NotFoundPage from "./pages/NotFoundPage";

/** Bitta tab ichidagi sahifa marshrutlari. */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/new" element={<NewProjectPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/upload/:manga" element={<UploadPage />} />
      <Route path="/mangadex" element={<MangaDexSearchPage />} />
      <Route path="/mangadex/:mangaId" element={<MangaDexDetailPage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/job/:jobId" element={<JobDetailPage />} />
      <Route path="/project/:manga" element={<ProjectPage />} />
      <Route path="/results/:manga/:chapter" element={<ResultsPage />} />
      <Route path="/edit/:manga/:chapter" element={<EditorPage />} />
      <Route path="/crop/:manga/:chapter" element={<CropPreviewPage />} />
      <Route path="/reorder/:manga/:chapter" element={<ReorderPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

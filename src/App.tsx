import { Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import ProjectPage from "./pages/ProjectPage";
import ResultsPage from "./pages/ResultsPage";
import EditorPage from "./pages/EditorPage";
import NewProjectPage from "./pages/NewProjectPage";
import NotFoundPage from "./pages/NotFoundPage";

// Reader pages
import ReaderLayout from "./reader/components/ReaderLayout";
import HomePage from "./reader/pages/HomePage";
import BrowsePage from "./reader/pages/BrowsePage";
import LibraryPage from "./reader/pages/LibraryPage";
import UpdatesPage from "./reader/pages/UpdatesPage";
import SettingsPage from "./reader/pages/SettingsPage";
import MangaDetailPage from "./reader/pages/MangaDetailPage";
import ChapterReaderPage from "./reader/pages/ChapterReaderPage";

export default function App() {
  return (
    <Routes>
      {/* Mobile Manga Reader */}
      <Route element={<ReaderLayout />}>
        <Route path="/reader" element={<HomePage />} />
        <Route path="/reader/browse" element={<BrowsePage />} />
        <Route path="/reader/library" element={<LibraryPage />} />
        <Route path="/reader/updates" element={<UpdatesPage />} />
        <Route path="/reader/settings" element={<SettingsPage />} />
        <Route path="/reader/manga/:slug" element={<MangaDetailPage />} />
        <Route path="/reader/read/:slug/:chapter" element={<ChapterReaderPage />} />
      </Route>

      {/* Editor / Dashboard */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/reader" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/new" element={<NewProjectPage />} />
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

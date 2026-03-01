import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../lib/api";
import type { GenreOption, Project, ProjectMetadata, ProjectSettings, WsMessage } from "../lib/types";
import { useActiveJobsWatcher, usePublishWebSocket, type JobFinishInfo } from "../lib/ws";
import ProjectHeader from "../components/project/ProjectHeader";
import ChapterList from "../components/project/ChapterList";
import MetadataSidebar from "../components/project/MetadataSidebar";
import EditMetadataModal from "../components/project/EditMetadataModal";
import SettingsModal from "../components/project/SettingsModal";
import CoverCropModal from "../components/project/CoverCropModal";
import ChapterThumbnailModal from "../components/project/ChapterThumbnailModal";
import { Progress } from "../components/ui/progress";

export default function ProjectPage() {
  const { manga } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<ProjectSettings>({
    language: "en",
    backend: "gemini",
    ocr_backend: "yolo_florence",
    cleaner_backend: "lama",
    translator_model: "",
    limit: 0,
    detect_dark_bubbles: false,
  });
  const [saving, setSaving] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState<ProjectMetadata>({
    description: "",
    title_uz: "",
    title_ru: "",
    title_en: "",
    title_ja: "",
    title_ko: "",
    tags: [],
  });
  const [allGenres, setAllGenres] = useState<GenreOption[]>([]);
  const [savingMeta, setSavingMeta] = useState(false);

  useEffect(() => {
    if (!manga) return;
    api
      .getProject(manga)
      .then((data) => {
        setProject(data);
        if (data.settings) {
          setSettings({
            language: data.settings.language,
            backend: data.settings.backend,
            ocr_backend: data.settings.ocr_backend,
            cleaner_backend: data.settings.cleaner_backend || "lama",
            translator_model: data.settings.translator_model || "",
            limit: data.settings.limit || 0,
            detect_dark_bubbles: data.settings.detect_dark_bubbles ?? false,
          });
        }
        if (data.metadata) {
          setMetaDraft({ ...data.metadata });
        }
      })
      .catch(() => setProject(null));
    api.getGenres().then(setAllGenres).catch(() => {});
  }, [manga]);

  // Publish state
  const [publishId, setPublishId] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishUploadedMb, setPublishUploadedMb] = useState(0);
  const [publishingTarget, setPublishingTarget] = useState<"manga" | string | null>(null);

  const chapters = project?.chapters || [];
  const hasOcrDone = chapters.some((ch) => ch.status === "ocr_done");
  const hasTranslating = chapters.some((ch) => ch.status === "translating");
  const publishedChapters = project?.published_chapters || [];
  const hasPublishableChapters = chapters.some(
    (ch) => ch.status === "done" && ch.is_validated && !publishedChapters.includes(ch.name)
  );

  // Active job WebSocket watcher — job tugaganda toast + refresh
  const handleJobFinished = useCallback((info: JobFinishInfo) => {
    if (info.type === "done") {
      if (info.oldStatus === "translating") {
        toast.success(`${info.chapterName}-bob tarjima tugadi`);
      } else if (info.oldStatus === "processing") {
        toast.success(`${info.chapterName}-bob OCR tugadi`);
      }
    } else if (info.type === "error") {
      toast.error(`${info.chapterName}-bob: ${info.message}`);
    } else if (info.type === "cancelled") {
      toast.info(`${info.chapterName}-bob bekor qilindi`);
    }
    // Project refresh
    if (manga) {
      api.getProject(manga).then(setProject).catch(() => {});
    }
  }, [manga]);

  useActiveJobsWatcher(chapters, handleJobFinished);

  async function handleSave() {
    if (!manga) return;
    setSaving(true);
    try {
      await api.saveProjectSettings(manga, settings);
      setEditingSettings(false);
    } finally {
      setTimeout(() => setSaving(false), 600);
    }
  }

  async function handleSaveMeta() {
    if (!manga) return;
    setSavingMeta(true);
    try {
      await api.updateProjectMetadata(manga, {
        description: metaDraft.description,
        title_uz: metaDraft.title_uz,
        title_ru: metaDraft.title_ru,
        title_en: metaDraft.title_en,
        title_ja: metaDraft.title_ja,
        title_ko: metaDraft.title_ko,
        tags: metaDraft.tags,
      });
      setEditingMeta(false);
      const updated = await api.getProject(manga);
      setProject(updated);
      if (updated.metadata) setMetaDraft({ ...updated.metadata });
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleDeleteProject() {
    if (!manga) return;
    const displayName = project?.display_name || manga;
    if (!confirm(`"${displayName}" ni o'chirmoqchimisiz? Barcha fayllar o'chadi!`)) return;
    await api.deleteProject(manga);
    navigate("/");
  }

  const [forceOcr, setForceOcr] = useState(false);
  const [forceClean, setForceClean] = useState(false);

  // Thumbnail modal state
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [thumbnailModalChapter, setThumbnailModalChapter] = useState<string | null>(null);

  const [translatingManga, setTranslatingManga] = useState(false);

  async function handleTranslateManga() {
    if (!manga) return;
    const displayName = project?.display_name || manga;
    if (!confirm(`Butun "${displayName}" mangasini tarjima qilmoqchimisiz?`)) return;
    setTranslatingManga(true);
    try {
      await api.translateManga({
        manga,
        language: settings.language,
        backend: settings.backend,
        translator_model: settings.translator_model || undefined,
      });
      toast.success("Tarjima boshlandi");
      const updated = await api.getProject(manga);
      setProject(updated);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTranslatingManga(false);
    }
  }

  // Publish WS message handler
  const handlePublishMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "log") {
      setPublishProgress(msg.progress);
      setPublishMessage(msg.message);
      if (msg.uploaded_mb != null) setPublishUploadedMb(msg.uploaded_mb);
    } else if (msg.type === "done") {
      const parts: string[] = [];
      if (msg.published_chapters) parts.push(`${msg.published_chapters} bob`);
      if (msg.total_pages) parts.push(`${msg.total_pages} sahifa`);
      if (msg.total_mb) parts.push(`${msg.total_mb} MB`);
      toast.success(parts.length > 0 ? `Publish: ${parts.join(", ")}` : msg.message);
      // Reset state
      setPublishId(null);
      setPublishProgress(0);
      setPublishMessage("");
      setPublishUploadedMb(0);
      setPublishingTarget(null);
      // Refresh project
      if (manga) {
        api.getProject(manga).then(setProject).catch(() => {});
      }
    } else if (msg.type === "error") {
      toast.error(msg.message);
      setPublishId(null);
      setPublishProgress(0);
      setPublishMessage("");
      setPublishUploadedMb(0);
      setPublishingTarget(null);
    }
  }, [manga]);

  const handlePublishClose = useCallback(() => {
    // WS closed unexpectedly while still publishing
    if (publishingTarget) {
      setPublishId(null);
      setPublishProgress(0);
      setPublishMessage("");
      setPublishUploadedMb(0);
      setPublishingTarget(null);
    }
  }, [publishingTarget]);

  usePublishWebSocket(publishId, handlePublishMessage, handlePublishClose);

  async function handlePublishManga() {
    if (!manga) return;
    const displayName = project?.display_name || manga;
    if (!confirm(`"${displayName}" mangasini publish qilmoqchimisiz?`)) return;
    try {
      const res = await api.publishManga(manga);
      setPublishId(res.publish_id);
      setPublishingTarget("manga");
      setPublishProgress(0);
      setPublishMessage("Publish boshlanmoqda...");
      setPublishUploadedMb(0);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handlePublishChapter(chapter: string) {
    if (!manga) return;
    try {
      const res = await api.publishChapter(manga, chapter);
      setPublishId(res.publish_id);
      setPublishingTarget(chapter);
      setPublishProgress(0);
      setPublishMessage(`${chapter}-bob publish boshlanmoqda...`);
      setPublishUploadedMb(0);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const isPublishing = publishingTarget !== null;

  return (
    <div className="animate-fade-in space-y-6">
      <ProjectHeader
        manga={manga!}
        displayName={project?.display_name || manga!}
        hasOcrDone={hasOcrDone}
        hasTranslating={hasTranslating || translatingManga}
        hasPublishableChapters={hasPublishableChapters}
        isPublishing={isPublishing}
        onTranslate={handleTranslateManga}
        onPublish={handlePublishManga}
        onDelete={handleDeleteProject}
      />

      {/* Publish progress bar */}
      {isPublishing && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {publishingTarget === "manga" ? "Manga publish qilinmoqda..." : `${publishingTarget}-bob publish qilinmoqda...`}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {publishUploadedMb > 0 ? `${publishUploadedMb} MB` : ""}
            </span>
          </div>
          <Progress value={publishProgress} className="h-2 mb-1.5" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{publishMessage}</span>
            <span className="text-xs font-medium tabular-nums">{publishProgress}%</span>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-6 xl:flex-row xl:items-start">
        <ChapterList
          chapters={chapters}
          projectName={manga!}
          settings={settings}
          forceOcr={forceOcr}
          forceClean={forceClean}
          publishedChapters={publishedChapters}
          publishingTarget={publishingTarget}
          onProjectUpdate={setProject}
          onPublishChapter={handlePublishChapter}
          onSetThumbnail={(ch) => setThumbnailModalChapter(ch)}
        />

        {project && (
          <MetadataSidebar
            project={project}
            allGenres={allGenres}
            onEditMeta={() => {
              if (project.metadata) setMetaDraft({ ...project.metadata });
              setEditingMeta(true);
            }}
            onEditSettings={() => setEditingSettings(true)}
            onEditCover={() => setCoverModalOpen(true)}
            onDeleteCover={async () => {
              if (!manga) return;
              if (!confirm("Muqovani o'chirmoqchimisiz?")) return;
              try {
                await api.deleteCover(manga);
                const updated = await api.getProject(manga);
                setProject(updated);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          />
        )}
      </div>

      <EditMetadataModal
        open={editingMeta}
        metaDraft={metaDraft}
        setMetaDraft={setMetaDraft}
        saving={savingMeta}
        onSave={handleSaveMeta}
        onClose={() => setEditingMeta(false)}
      />

      <SettingsModal
        open={editingSettings}
        settings={settings}
        setSettings={setSettings}
        saving={saving}
        forceOcr={forceOcr}
        setForceOcr={setForceOcr}
        forceClean={forceClean}
        setForceClean={setForceClean}
        onSave={() => {
          handleSave();
          setForceOcr(false);
          setForceClean(false);
        }}
        onClose={() => {
          setEditingSettings(false);
          setForceOcr(false);
          setForceClean(false);
        }}
      />

      {project && (
        <CoverCropModal
          open={coverModalOpen}
          manga={manga!}
          chapters={chapters}
          onClose={() => setCoverModalOpen(false)}
          onSaved={() => {
            setCoverModalOpen(false);
            if (manga) api.getProject(manga).then(setProject).catch(() => {});
          }}
        />
      )}

      {thumbnailModalChapter && (
        <ChapterThumbnailModal
          open={!!thumbnailModalChapter}
          manga={manga!}
          chapter={thumbnailModalChapter}
          onClose={() => setThumbnailModalChapter(null)}
          onSaved={() => {
            setThumbnailModalChapter(null);
            if (manga) api.getProject(manga).then(setProject).catch(() => {});
          }}
        />
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../lib/api";
import type { GenreOption, Project, ProjectMetadata, ProjectSettings, WsMessage, AutoPilotConfig } from "../lib/types";
import { useActiveJobsWatcher, useAutoPilotWebSocket, useDownloadJobsWatcher, useJobWebSocket, usePublishWebSocket, type DownloadJobsState, type JobFinishInfo } from "../lib/ws";
import { clearProgress, loadProgress, setProgress } from "../lib/progressStore";
import ProjectHeader from "../components/project/ProjectHeader";
import ChapterList from "../components/project/ChapterList";
import MetadataSidebar from "../components/project/MetadataSidebar";
import EditMetadataModal from "../components/project/EditMetadataModal";
import SettingsModal from "../components/project/SettingsModal";
import CoverCropModal from "../components/project/CoverCropModal";
import ChapterThumbnailModal from "../components/project/ChapterThumbnailModal";
import AutoPilotModal from "../components/project/AutoPilotModal";
import AutoPilotProgress from "../components/project/AutoPilotProgress";
import MangaLibAttachModal from "../components/project/MangaLibAttachModal";
import MangaLibChaptersModal from "../components/project/MangaLibChaptersModal";
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
    inpaint_backend: "migan",
    translator_model: "",
    limit: 0,
    detect_dark_bubbles: false,
    crop_ads_top_px: 0,
    crop_ads_bottom_px: 0,
    drop_first_if_w: 0,
    drop_first_if_h: 0,
    drop_last_if_w: 0,
    drop_last_if_h: 0,
    font_dialogue: "Anime Ace",
    font_sfx: "Bangers",
    font_narration: "Manga Temple",
    font_clean: "Nunito",
    bubble_fit_manga: false,
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
            inpaint_backend: data.settings.inpaint_backend || "migan",
            translator_model: data.settings.translator_model || "",
            limit: data.settings.limit || 0,
            detect_dark_bubbles: data.settings.detect_dark_bubbles ?? false,
            crop_ads_top_px: data.settings.crop_ads_top_px ?? 0,
            crop_ads_bottom_px: data.settings.crop_ads_bottom_px ?? 0,
            drop_first_if_w: data.settings.drop_first_if_w ?? 0,
            drop_first_if_h: data.settings.drop_first_if_h ?? 0,
            drop_last_if_w: data.settings.drop_last_if_w ?? 0,
            drop_last_if_h: data.settings.drop_last_if_h ?? 0,
            font_dialogue: data.settings.font_dialogue || "Anime Ace",
            font_sfx: data.settings.font_sfx || "Bangers",
            font_narration: data.settings.font_narration || "Manga Temple",
            font_clean: data.settings.font_clean || "Nunito",
            bubble_fit_manga: data.settings.bubble_fit_manga ?? false,
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

  // Auto Pilot state
  const [autoPilotModalOpen, setAutoPilotModalOpen] = useState(false);
  const [autoPilotStarting, setAutoPilotStarting] = useState(false);
  const [autoPilotId, setAutoPilotId] = useState<string | null>(null);
  const [autoPilotStage, setAutoPilotStage] = useState<string | null>(null);
  const [autoPilotMessage, setAutoPilotMessage] = useState("");
  const [autoPilotProgress, setAutoPilotProgress] = useState(0);
  const [autoPilotChapter, setAutoPilotChapter] = useState<string | null>(null);
  const [autoPilotFailed, setAutoPilotFailed] = useState<string[]>([]);
  const [autoPilotStopping, setAutoPilotStopping] = useState(false);

  // MangaLib state
  const [mangaLibAttachOpen, setMangaLibAttachOpen] = useState(false);
  const [mangaLibChaptersOpen, setMangaLibChaptersOpen] = useState(false);
  // Faol download joblar — tugaganda toast + refresh uchun kuzatiladi.
  const [mangaLibJobs, setMangaLibJobs] = useState<string[]>([]);
  const [mangaLibDownload, setMangaLibDownload] = useState<DownloadJobsState | null>(null);
  const mangaLibSlug = project?.metadata?.mangalib_slug ?? null;

  const chapters = project?.chapters || [];
  // OCR natijasi bor (ocr_done) yoki tarjima qilingan (done) — ikkala holatda
  // ham qayta tarjima qilish mumkin.
  const hasTranslatable = chapters.some(
    (ch) => ch.status === "ocr_done" || ch.status === "done",
  );
  const hasTranslating = chapters.some((ch) => ch.status === "translating");
  // Auto-merge ishlatilmaydigan mangalarda yangi yuklangan boblarni qo'lda
  // 'Tartiblangan' deb belgilash mumkin (auto_merged flag'ini True qiladi).
  const hasOrganizable = chapters.some(
    (ch) =>
      ch.status === "uploaded" &&
      !ch.auto_merged &&
      !ch.remote &&
      ch.source !== "r2"
  );
  const publishedChapters = project?.published_chapters || [];
  const hasPublishableChapters = chapters.some(
    (ch) =>
      ch.status === "done" &&
      ch.is_validated &&
      !ch.remote &&
      ch.source !== "r2" &&
      !publishedChapters.includes(ch.name)
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

  // ====== MangaLib download joblarini kuzatish ======
  const handleMangaLibUpdate = useCallback((state: DownloadJobsState) => {
    setMangaLibDownload(state);
  }, []);

  const handleMangaLibAllFinished = useCallback(
    (failed: number) => {
      if (failed > 0) {
        toast.warning(`MangaLib yuklash tugadi: ${failed} bobda xatolik`);
      } else {
        toast.success("MangaLib yuklash tugadi");
      }
      setMangaLibJobs([]);
      setMangaLibDownload(null);
      if (manga) {
        api.getProject(manga).then(setProject).catch(() => {});
      }
    },
    [manga],
  );

  useDownloadJobsWatcher(mangaLibJobs, handleMangaLibUpdate, handleMangaLibAllFinished);

  function handleMangaLibDownloadStarted(jobIds: string[]) {
    setMangaLibChaptersOpen(false);
    if (jobIds.length === 0) {
      toast.info("Yuklab olinadigan yangi bob topilmadi");
      return;
    }
    setMangaLibJobs(jobIds);
    setMangaLibDownload({
      total: jobIds.length,
      finished: 0,
      failed: 0,
      progress: 0,
      lastMessage: "Yuklash boshlandi...",
      active: true,
    });
  }

  async function handleDetachMangaLib() {
    if (!manga) return;
    if (!confirm("MangaLib linkini uzmoqchimisiz? Saqlangan bob ro'yxati tozalanadi.")) {
      return;
    }
    try {
      await api.detachMangaLib(manga);
      toast.success("MangaLib link uzildi");
      setMangaLibChaptersOpen(false);
      const updated = await api.getProject(manga);
      setProject(updated);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleMangaLibAttached() {
    setMangaLibAttachOpen(false);
    if (!manga) return;
    try {
      const updated = await api.getProject(manga);
      setProject(updated);
      if (updated.metadata) setMetaDraft({ ...updated.metadata });
      if (updated.settings) {
        setSettings((prev) => ({ ...prev, language: updated.settings!.language }));
      }
    } catch {
      // ignore
    }
  }


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
        status: metaDraft.status,
        age_rating: metaDraft.age_rating,
        year: metaDraft.year ?? null,
        rating: metaDraft.rating ?? null,
        schedule_days: metaDraft.schedule_days ?? [],
        authors: (metaDraft.authors ?? []).filter((a) => a.name.trim().length > 0),
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
  const [translateJobId, setTranslateJobId] = useState<string | null>(null);
  const [translateProgress, setTranslateProgress] = useState(0);
  const [translateMessage, setTranslateMessage] = useState("");

  const [organizing, setOrganizing] = useState(false);

  async function handleMarkOrganized() {
    if (!manga || organizing) return;
    setOrganizing(true);
    try {
      const res = await api.markOrganized(manga);
      if (res.marked === 0) {
        toast.info("Tartiblanadigan bob topilmadi");
      } else {
        toast.success(`${res.marked} ta bob 'Tartiblangan' deb belgilandi`);
      }
      const updated = await api.getProject(manga);
      setProject(updated);
    } catch (e) {
      toast.error(`Tartiblash xatosi: ${(e as Error).message}`);
    } finally {
      setOrganizing(false);
    }
  }

  async function handleTranslateManga() {
    if (!manga) return;
    if (translatingManga || translateJobId) {
      toast.info("Tarjima allaqachon ishlamoqda");
      return;
    }
    setTranslatingManga(true);
    try {
      const res = await api.translateManga({
        manga,
        language: settings.language,
        backend: settings.backend,
        translator_model: settings.translator_model || undefined,
      });
      // translateManga endpoint job_id qaytaradi — uni saqlaymiz va WS ulaymiz
      if (res?.job_id) {
        setTranslateJobId(res.job_id);
        setTranslateMessage("Tarjima boshlandi...");
        setTranslateProgress(0);
        setProgress(manga, "translate", {
          jobId: res.job_id,
          progress: 0,
          message: "Tarjima boshlandi...",
        });
      }
      toast.success("Tarjima boshlandi");
      const updated = await api.getProject(manga);
      setProject(updated);
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(`Tarjima boshlanmadi: ${msg}`);
      console.error("translateManga xato:", e);
    } finally {
      setTranslatingManga(false);
    }
  }

  // Tarjima job'i progress'i — chapter'lar parallel tarjima qilinadi.
  const handleTranslateMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "log") {
      if (typeof msg.progress === "number") setTranslateProgress(msg.progress);
      if (msg.message) setTranslateMessage(msg.message);
      if (manga) {
        setTranslateJobId((id) => {
          if (id) {
            setProgress(manga, "translate", {
              jobId: id,
              progress: typeof msg.progress === "number" ? msg.progress : 0,
              message: msg.message || "",
            });
          }
          return id;
        });
      }
    } else if (msg.type === "done") {
      const chapters = (msg as { chapters?: number }).chapters;
      const cost = (msg as { cost_usd?: number }).cost_usd;
      let txt = "Tarjima tugadi";
      if (chapters) txt += `: ${chapters} bob`;
      if (cost) txt += ` ($${cost.toFixed(4)})`;
      toast.success(txt);
      setTranslateJobId(null);
      setTranslateProgress(0);
      setTranslateMessage("");
      if (manga) {
        clearProgress(manga, "translate");
        api.getProject(manga).then(setProject).catch(() => {});
      }
    } else if (msg.type === "error") {
      toast.error(`Tarjima xato: ${msg.message}`);
      setTranslateJobId(null);
      setTranslateProgress(0);
      setTranslateMessage("");
      if (manga) {
        clearProgress(manga, "translate");
        api.getProject(manga).then(setProject).catch(() => {});
      }
    } else if (msg.type === "cancelled") {
      toast.info("Tarjima bekor qilindi");
      setTranslateJobId(null);
      setTranslateProgress(0);
      setTranslateMessage("");
      if (manga) {
        clearProgress(manga, "translate");
        api.getProject(manga).then(setProject).catch(() => {});
      }
    }
  }, [manga]);

  const handleTranslateClose = useCallback(() => {
    // WS uzilsa state tozalash. localStorage snapshot saqlanadi — job hali
    // ishlayotgan bo'lishi mumkin, qayta mount/refreshda tiklanadi.
    setTranslateJobId(null);
    setTranslateProgress(0);
    setTranslateMessage("");
  }, []);

  useJobWebSocket(translateJobId, handleTranslateMessage, handleTranslateClose);

  // Publish WS message handler
  const handlePublishMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "log") {
      setPublishProgress(msg.progress);
      setPublishMessage(msg.message);
      if (msg.uploaded_mb != null) setPublishUploadedMb(msg.uploaded_mb);
      if (manga) {
        setPublishId((id) => {
          setPublishingTarget((target) => {
            if (id && target) {
              setProgress(manga, "publish", {
                publishId: id,
                target,
                progress: msg.progress,
                message: msg.message,
                uploadedMb: msg.uploaded_mb ?? 0,
              });
            }
            return target;
          });
          return id;
        });
      }
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
        clearProgress(manga, "publish");
        api.getProject(manga).then(setProject).catch(() => {});
      }
    } else if (msg.type === "error") {
      toast.error(msg.message);
      setPublishId(null);
      setPublishProgress(0);
      setPublishMessage("");
      setPublishUploadedMb(0);
      setPublishingTarget(null);
      if (manga) clearProgress(manga, "publish");
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

  // Sahifa yuklanganda (refresh / boshqa page'dan qaytish) saqlangan
  // progressni tiklaymiz. Tarjima uchun job hali tirikligini tekshiramiz;
  // publish uchun snapshot tiklanib, WS qayta ulanadi.
  useEffect(() => {
    if (!manga) return;
    const snap = loadProgress(manga);
    if (!snap) return;

    if (snap.translate) {
      const { jobId, progress, message } = snap.translate;
      api
        .getJob(jobId)
        .then((job) => {
          if (job.status === "running") {
            setTranslateJobId(jobId);
            setTranslateProgress(progress);
            setTranslateMessage(message);
          } else {
            clearProgress(manga, "translate");
          }
        })
        .catch(() => clearProgress(manga, "translate"));
    }

    if (snap.publish) {
      const { publishId: pid, target, progress, message, uploadedMb } = snap.publish;
      setPublishingTarget(target);
      setPublishProgress(progress);
      setPublishMessage(message);
      setPublishUploadedMb(uploadedMb);
      setPublishId(pid); // WS qayta ulanadi
    }
  }, [manga]);

  // ====== Auto Pilot ======
  // Sahifa yuklanganda joriy AP'ni qayta ulash (reload-safe)
  useEffect(() => {
    if (!manga) return;
    api.getActiveAutoPilot(manga).then((res) => {
      if (res.active && res.auto_pilot_id) {
        setAutoPilotId(res.auto_pilot_id);
        const snap = loadProgress(manga)?.autoPilot;
        if (res.state) {
          setAutoPilotStage(res.state.current_stage);
          setAutoPilotProgress(res.state.stage_progress);
          setAutoPilotFailed(res.state.failed_chapters);
          // Backend'da xabar matni saqlanmaydi — oxirgi snapshot'dan tiklaymiz.
          if (snap) {
            setAutoPilotMessage(snap.message);
            setAutoPilotChapter(snap.chapter);
          }
        }
      } else {
        // Faol emas — eski snapshot'ni tozalaymiz.
        clearProgress(manga, "autoPilot");
      }
    }).catch(() => {});
  }, [manga]);

  const handleAutoPilotMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "log" || msg.type === "stage_started" || msg.type === "stage_done") {
      const stageMsg = msg as WsMessage & { stage?: string; chapter?: string; message: string; progress: number };
      if (stageMsg.stage) setAutoPilotStage(stageMsg.stage);
      if (typeof stageMsg.progress === "number") setAutoPilotProgress(stageMsg.progress);
      if (stageMsg.message) setAutoPilotMessage(stageMsg.message);
      const ch = (msg as { chapter?: string }).chapter;
      if (ch) setAutoPilotChapter(ch);
      else if (msg.type === "stage_started") setAutoPilotChapter(null);
      if (manga) {
        setAutoPilotId((id) => {
          if (id) {
            setAutoPilotChapter((curChapter) => {
              setProgress(manga, "autoPilot", {
                autoPilotId: id,
                stage: stageMsg.stage ?? null,
                progress: typeof stageMsg.progress === "number" ? stageMsg.progress : 0,
                message: stageMsg.message || "",
                chapter: curChapter,
              });
              return curChapter;
            });
          }
          return id;
        });
      }
    } else if (msg.type === "done") {
      const failed = (msg as { failed_chapters?: string[] }).failed_chapters || [];
      const stages = (msg as { stages_completed?: string[] }).stages_completed || [];
      if (failed.length > 0) {
        toast.warning(`Auto Pilot: ${failed.length} bobda xatolik`);
        setAutoPilotFailed(failed);
      } else {
        toast.success(`Auto Pilot tugadi (${stages.length} bosqich)`);
      }
      setAutoPilotId(null);
      setAutoPilotStage(null);
      setAutoPilotProgress(0);
      setAutoPilotMessage("");
      setAutoPilotChapter(null);
      if (manga) {
        clearProgress(manga, "autoPilot");
        api.getProject(manga).then(setProject).catch(() => {});
      }
    } else if (msg.type === "cancelled") {
      toast.info("Auto Pilot to'xtatildi");
      setAutoPilotId(null);
      setAutoPilotStage(null);
      setAutoPilotProgress(0);
      setAutoPilotMessage("");
      setAutoPilotChapter(null);
      setAutoPilotStopping(false);
      if (manga) {
        clearProgress(manga, "autoPilot");
        api.getProject(manga).then(setProject).catch(() => {});
      }
    } else if (msg.type === "error") {
      toast.error(`Auto Pilot xato: ${msg.message}`);
      setAutoPilotId(null);
      setAutoPilotStage(null);
      setAutoPilotProgress(0);
      setAutoPilotMessage("");
      setAutoPilotChapter(null);
      if (manga) {
        clearProgress(manga, "autoPilot");
        api.getProject(manga).then(setProject).catch(() => {});
      }
    }
  }, [manga]);

  const handleAutoPilotClose = useCallback(() => {
    // WS yopildi — final xabar kelmagan bo'lishi mumkin, holatni tozalash
    setAutoPilotId(null);
    setAutoPilotStage(null);
    setAutoPilotProgress(0);
    setAutoPilotMessage("");
    setAutoPilotChapter(null);
    setAutoPilotStopping(false);
  }, []);

  useAutoPilotWebSocket(autoPilotId, handleAutoPilotMessage, handleAutoPilotClose);

  async function handleStartAutoPilot(config: AutoPilotConfig) {
    if (!manga) return;
    setAutoPilotStarting(true);
    try {
      const res = await api.startAutoPilot(manga, config);
      setAutoPilotId(res.auto_pilot_id);
      setAutoPilotStage(null);
      setAutoPilotProgress(0);
      setAutoPilotMessage("Auto Pilot boshlandi");
      setAutoPilotChapter(null);
      setAutoPilotFailed([]);
      setAutoPilotModalOpen(false);
      setProgress(manga, "autoPilot", {
        autoPilotId: res.auto_pilot_id,
        stage: null,
        progress: 0,
        message: "Auto Pilot boshlandi",
        chapter: null,
      });
      toast.success("Auto Pilot boshlandi");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAutoPilotStarting(false);
    }
  }

  async function handleStopAutoPilot() {
    if (!autoPilotId) return;
    setAutoPilotStopping(true);
    try {
      await api.stopAutoPilot(autoPilotId);
      toast.info("Auto Pilot to'xtatilmoqda...");
    } catch (e) {
      toast.error((e as Error).message);
      setAutoPilotStopping(false);
    }
  }

  async function handlePublishManga() {
    if (!manga) return;
    if (publishId) {
      toast.info("Publish allaqachon ishlamoqda");
      return;
    }
    try {
      const res = await api.publishManga(manga);
      setPublishId(res.publish_id);
      setPublishingTarget("manga");
      setPublishProgress(0);
      const count = res.chapters_to_publish ?? 0;
      const pages = res.pages_to_publish ?? 0;
      const startMsg =
        count > 0
          ? `Publish boshlanmoqda... (${count} bob, ${pages} sahifa)`
          : "Publish boshlanmoqda...";
      setPublishMessage(startMsg);
      setPublishUploadedMb(0);
      setProgress(manga, "publish", {
        publishId: res.publish_id,
        target: "manga",
        progress: 0,
        message: startMsg,
        uploadedMb: 0,
      });
      toast.success(
        count > 0
          ? `Publish boshlandi: ${count} bob`
          : "Publish boshlandi"
      );
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(`Publish boshlanmadi: ${msg}`);
      console.error("publishManga xato:", e);
    }
  }

  async function handlePublishChapter(chapter: string) {
    if (!manga) return;
    if (publishId) {
      toast.info("Publish allaqachon ishlamoqda");
      return;
    }
    try {
      const res = await api.publishChapter(manga, chapter);
      setPublishId(res.publish_id);
      setPublishingTarget(chapter);
      setPublishProgress(0);
      setPublishMessage(`${chapter}-bob publish boshlanmoqda...`);
      setPublishUploadedMb(0);
      setProgress(manga, "publish", {
        publishId: res.publish_id,
        target: chapter,
        progress: 0,
        message: `${chapter}-bob publish boshlanmoqda...`,
        uploadedMb: 0,
      });
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(`${chapter}-bob publish: ${msg}`);
      console.error("publishChapter xato:", e);
    }
  }

  const isPublishing = publishingTarget !== null;

  return (
    <div className="animate-fade-in space-y-6">
      <ProjectHeader
        manga={manga!}
        displayName={project?.display_name || manga!}
        hasOcrDone={hasTranslatable}
        hasTranslating={hasTranslating || translatingManga || translateJobId !== null}
        hasPublishableChapters={hasPublishableChapters}
        hasOrganizable={hasOrganizable}
        isOrganizing={organizing}
        isPublishing={isPublishing}
        isAutoPiloting={autoPilotId !== null}
        mangaLibSlug={mangaLibSlug}
        onAttachMangaLib={() => setMangaLibAttachOpen(true)}
        onOpenMangaLibChapters={() => setMangaLibChaptersOpen(true)}
        onMarkOrganized={handleMarkOrganized}
        onTranslate={handleTranslateManga}
        onPublish={handlePublishManga}
        onAutoPilot={() => setAutoPilotModalOpen(true)}
        onDelete={handleDeleteProject}
      />

      {/* Translate progress (manga-level) */}
      {translateJobId && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tarjima jarayonda...</span>
          </div>
          <Progress value={translateProgress} className="h-2 mb-1.5" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground line-clamp-1">{translateMessage || "Boshlanmoqda..."}</span>
            <span className="text-xs font-medium tabular-nums">{translateProgress}%</span>
          </div>
        </div>
      )}

      {/* Auto Pilot progress */}
      {autoPilotId && (
        <AutoPilotProgress
          stage={autoPilotStage}
          message={autoPilotMessage}
          progress={autoPilotProgress}
          currentChapter={autoPilotChapter}
          failedChapters={autoPilotFailed}
          onStop={handleStopAutoPilot}
          stopping={autoPilotStopping}
        />
      )}

      {/* MangaLib download progress */}
      {mangaLibDownload && mangaLibDownload.active && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              ⬇️ MangaLib yuklash ({mangaLibDownload.finished}/{mangaLibDownload.total} bob)
            </span>
            <span className="text-xs font-medium tabular-nums">
              {mangaLibDownload.progress}%
            </span>
          </div>
          <Progress value={mangaLibDownload.progress} className="h-2 mb-1.5" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground line-clamp-1">
              {mangaLibDownload.lastMessage || "Boshlanmoqda..."}
            </span>
            {mangaLibDownload.failed > 0 && (
              <span className="text-xs text-destructive">
                {mangaLibDownload.failed} xato
              </span>
            )}
          </div>
        </div>
      )}

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
          project={project}
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

      <AutoPilotModal
        open={autoPilotModalOpen}
        starting={autoPilotStarting}
        manga={manga!}
        hasMangaLib={Boolean(mangaLibSlug)}
        onClose={() => setAutoPilotModalOpen(false)}
        onStart={handleStartAutoPilot}
      />

      <MangaLibAttachModal
        open={mangaLibAttachOpen}
        manga={manga!}
        onClose={() => setMangaLibAttachOpen(false)}
        onAttached={handleMangaLibAttached}
      />

      <MangaLibChaptersModal
        open={mangaLibChaptersOpen}
        manga={manga!}
        publishedChapters={publishedChapters}
        onClose={() => setMangaLibChaptersOpen(false)}
        onDownloadStarted={handleMangaLibDownloadStarted}
        onDetach={handleDetachMangaLib}
      />
    </div>
  );
}

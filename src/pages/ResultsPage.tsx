import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../lib/api";
import { drawTranslatedTexts, renderPageForExport } from "../lib/canvas";
import type { Page, ProjectSettings, Region, ResultsData } from "../lib/types";
import ResultsToolbar from "../components/results/ResultsToolbar";
import { useRunInfo, RunInfoModal } from "../components/results/RunInfoPanel";
import ImagePanel from "../components/results/ImagePanel";
import RegionPanel from "../components/results/RegionPanel";
import type { RegionDraft } from "../components/results/RegionPanel";
import TranslationTextsView from "../components/results/TranslationTextsView";
import ActionSidebar from "../components/results/ActionSidebar";
import RerunOcrModal from "../components/results/RerunOcrModal";

import { useDrawingMode } from "../hooks/useDrawingMode";
import { useOcrMode } from "../hooks/useOcrMode";
import { useLineCleanMode } from "../hooks/useLineCleanMode";
import { useBubbleMode } from "../hooks/useBubbleMode";
import { useCleanMode } from "../hooks/useCleanMode";
import { usePenMode } from "../hooks/usePenMode";
import { useEyeDropperMode } from "../hooks/useEyeDropperMode";
import { useResizeMode } from "../hooks/useResizeMode";
import { useScrollSync } from "../hooks/useScrollSync";

function collectTexts(pages: Page[]) {
  const texts: { pageIdx: number; regionIdx: number; original_text: string; uz_text: string }[] = [];
  pages.forEach((page, pageIdx) => {
    (page.regions || []).forEach((r, regionIdx) => {
      if (r.original_text && r.original_text.trim()) {
        texts.push({ pageIdx, regionIdx, original_text: r.original_text, uz_text: r.uz_text || "" });
      }
    });
  });
  return texts;
}

const DEFAULT_SETTINGS: ProjectSettings = {
  language: "ja",
  backend: "openai",
  ocr_backend: "auto",
  cleaner_backend: "pcleaner",
  translator_model: "",
  limit: 0,
  detect_dark_bubbles: false,
};

export default function ResultsPage() {
  const { manga, chapter } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<ResultsData | null>(null);
  const [currentPage, setCurrentPageRaw] = useState(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return Number.isNaN(p) || p < 1 ? 0 : p - 1;
  });

  const setCurrentPage = useCallback(
    (page: number) => {
      setCurrentPageRaw(page);
      setSearchParams({ page: String(page + 1) }, { replace: true });
    },
    [setSearchParams],
  );
  const [drawingMode, setDrawingMode] = useState(false);
  const [cleanMode, setCleanMode] = useState(false);
  const [lineCleanMode, setLineCleanMode] = useState(false);
  const [ocrMode, setOcrMode] = useState(false);
  const [bubbleMode, setBubbleMode] = useState<"rect" | "oval" | null>(null);
  const [penMode, setPenMode] = useState(false);
  const [eyeDropperMode, setEyeDropperMode] = useState(false);
  const [pageHasClean, setPageHasClean] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [status, setStatus] = useState<string>("Yuklanmoqda...");
  const [readingOpen, setReadingOpen] = useState(false);
  const [runInfoOpen, setRunInfoOpen] = useState(false);
  const runInfo = useRunInfo(manga || "", chapter || "");
  const [regionDrafts, setRegionDrafts] = useState<Record<string, RegionDraft>>({});
  const [translating, setTranslating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmTranslate, setConfirmTranslate] = useState(false);
  const [rerunModalOpen, setRerunModalOpen] = useState(false);
  const [rerunSettings, setRerunSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [rerunSkipConfirm, setRerunSkipConfirm] = useState(false);
  const [rerunSkipClean, setRerunSkipClean] = useState(false);

  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ocrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cleanImgRef = useRef<HTMLImageElement | null>(null);
  const cleanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalWrapRef = useRef<HTMLDivElement | null>(null);
  const cleanWrapRef = useRef<HTMLDivElement | null>(null);

  // Reading mode refs
  const pageImgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const pageTextCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pageDrawCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const readingScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTriggeredRef = useRef(false);

  useEffect(() => {
    if (!manga || !chapter) return;
    api
      .getResults(manga, chapter)
      .then((res) => {
        setData(res);
        setStatus("");
        const drafts: Record<string, RegionDraft> = {};
        const page = res.pages[currentPage];
        if (page) {
          page.regions.forEach((r, idx) => {
            drafts[`${currentPage}-${idx}`] = {
              original: r.original_text || "",
              translation: r.uz_text || "",
              fontSize: r.font_size || 0,
              rotation: r.rotation || 0,
              fontWeight: r.font_weight || "bold",
              fontStyle: r.font_style || "normal",
              fontColor: r.font_color || "#111827",
              fontFamily: r.font_family || "Comic Neue",
              fontStrokeColor: r.font_stroke_color || "",
              fontStrokeWidth: r.font_stroke_width || 0,
            };
          });
        }
        setRegionDrafts(drafts);
      })
      .catch((err) => setStatus(`Xatolik: ${err.message}`));
  }, [manga, chapter]);

  const pages = data?.pages || [];
  const totalPages = pages.length + 1;
  const texts = useMemo(() => collectTexts(pages), [pages]);

  const renderBboxes = useCallback(
    (img: HTMLImageElement, canvas: HTMLCanvasElement, regions: Region[]) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.style.width = `${img.clientWidth}px`;
      canvas.style.height = `${img.clientHeight}px`;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      regions.forEach((r) => {
        ctx.strokeStyle = "rgba(62, 207, 142, 0.7)";
        ctx.lineWidth = 3;
        ctx.strokeRect(r.bbox.x, r.bbox.y, r.bbox.w, r.bbox.h);
      });
    },
    []
  );

  const renderTextOverlay = useCallback(
    async (img: HTMLImageElement, canvas: HTMLCanvasElement, regions: Region[]) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.style.width = `${img.clientWidth}px`;
      canvas.style.height = `${img.clientHeight}px`;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await document.fonts.ready;
      drawTranslatedTexts(ctx, regions);
    },
    []
  );

  const regionsWithDraftFontSize = useMemo(() => {
    if (!data) return [];
    const page = data.pages[currentPage];
    if (!page) return [];
    return (page.regions || []).map((r, idx) => {
      const draft = regionDrafts[`${currentPage}-${idx}`];
      if (!draft) return r;
      const patched = { ...r };
      if (draft.fontSize) patched.font_size = draft.fontSize;
      if (draft.rotation !== undefined) patched.rotation = draft.rotation;
      if (draft.fontWeight !== undefined) patched.font_weight = draft.fontWeight;
      if (draft.fontStyle !== undefined) patched.font_style = draft.fontStyle;
      if (draft.fontColor !== undefined) patched.font_color = draft.fontColor;
      if (draft.fontFamily !== undefined) patched.font_family = draft.fontFamily;
      if (draft.fontStrokeColor !== undefined) patched.font_stroke_color = draft.fontStrokeColor;
      if (draft.fontStrokeWidth !== undefined) patched.font_stroke_width = draft.fontStrokeWidth;
      return patched;
    });
  }, [data, currentPage, regionDrafts]);

  useEffect(() => {
    if (!data) return;
    const page = pages[currentPage];
    if (!page) return;
    const img = originalImgRef.current;
    const canvas = originalCanvasRef.current;
    if (img && canvas) {
      const handler = () => renderBboxes(img, canvas, page.regions || []);
      if (img.complete && img.naturalWidth > 0) handler();
      else img.onload = handler;
    }
    const cleanImg = cleanImgRef.current;
    const cleanCanvas = cleanCanvasRef.current;
    if (cleanImg && cleanCanvas) {
      const handler = () => renderTextOverlay(cleanImg, cleanCanvas, regionsWithDraftFontSize);
      if (cleanImg.complete && cleanImg.naturalWidth > 0) handler();
      else cleanImg.onload = handler;
    }
  }, [data, currentPage, pages, regionsWithDraftFontSize, renderBboxes, renderTextOverlay]);

  // Reading mode: faqat ko'rinadigan sahifalarda matn overlay render qilish (lazy)
  useEffect(() => {
    if (!readingOpen || !data) return;
    const container = readingScrollRef.current;
    if (!container) return;

    function renderPage(idx: number) {
      const page = pages[idx];
      if (!page) return;
      const canvas = pageTextCanvasRefs.current[idx];
      const img = pageImgRefs.current[idx];
      if (!canvas || !img || !img.complete || !img.naturalWidth) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.style.width = `${img.clientWidth}px`;
      canvas.style.height = `${img.clientHeight}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTranslatedTexts(ctx, page.regions || []);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-page-idx"));
            if (!Number.isNaN(idx)) {
              document.fonts.ready.then(() => renderPage(idx));
            }
          }
        }
      },
      { root: container, rootMargin: "200px 0px" },
    );

    pageImgRefs.current.forEach((img, idx) => {
      const el = img?.parentElement;
      if (el) {
        el.setAttribute("data-page-idx", String(idx));
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [readingOpen, data, pages]);

  // Reading mode: aktiv sahifadagi draft o'zgarishlarni render qilish
  useEffect(() => {
    if (!readingOpen || !data) return;
    const canvas = pageTextCanvasRefs.current[currentPage];
    const img = pageImgRefs.current[currentPage];
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.width = `${img.clientWidth}px`;
    canvas.style.height = `${img.clientHeight}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTranslatedTexts(ctx, regionsWithDraftFontSize);
  }, [readingOpen, data, currentPage, regionsWithDraftFontSize]);

  useEffect(() => {
    if (!data) return;
    const page = data.pages[currentPage];
    if (!page) {
      setRegionDrafts({});
      setConfirmingDelete(null);
      return;
    }
    setRegionDrafts((prev) => {
      const next: Record<string, RegionDraft> = {};
      page.regions.forEach((r, idx) => {
        const key = `${currentPage}-${idx}`;
        const existing = prev[key];
        const serverOriginal = r.original_text || "";
        const serverTranslation = r.uz_text || "";
        const serverFontSize = r.font_size || 0;
        const serverRotation = r.rotation || 0;
        const serverFontWeight = r.font_weight || "bold";
        const serverFontStyle = r.font_style || "normal";
        const serverFontColor = r.font_color || "#111827";
        const serverFontFamily = r.font_family || "Comic Neue";
        const serverStrokeColor = r.font_stroke_color || "";
        const serverStrokeWidth = r.font_stroke_width || 0;
        if (
          existing &&
          (existing.original !== serverOriginal ||
            existing.translation !== serverTranslation ||
            (existing.fontSize ?? serverFontSize) !== serverFontSize ||
            (existing.rotation ?? serverRotation) !== serverRotation ||
            (existing.fontWeight ?? serverFontWeight) !== serverFontWeight ||
            (existing.fontStyle ?? serverFontStyle) !== serverFontStyle ||
            (existing.fontColor ?? serverFontColor) !== serverFontColor ||
            (existing.fontFamily ?? serverFontFamily) !== serverFontFamily ||
            (existing.fontStrokeColor ?? serverStrokeColor) !== serverStrokeColor ||
            (existing.fontStrokeWidth ?? serverStrokeWidth) !== serverStrokeWidth) &&
          !existing.status
        ) {
          next[key] = existing;
        } else {
          next[key] = {
            original: serverOriginal,
            translation: serverTranslation,
            fontSize: serverFontSize,
            rotation: serverRotation,
            fontWeight: serverFontWeight,
            fontStyle: serverFontStyle,
            fontColor: serverFontColor,
            fontFamily: serverFontFamily,
            fontStrokeColor: serverStrokeColor,
            fontStrokeWidth: serverStrokeWidth,
          };
        }
      });
      return next;
    });
    setConfirmingDelete(null);
  }, [data, currentPage]);

  // Sahifa almashganda clean state reset (faqat sahifa o'zgarganda)
  useEffect(() => {
    setPageHasClean(false);
  }, [currentPage]);

  // Reading mode: main reflarni aktiv sahifa elementlariga bog'lash
  useEffect(() => {
    if (!readingOpen) return;
    cleanImgRef.current = pageImgRefs.current[currentPage] || null;
    cleanCanvasRef.current = pageTextCanvasRefs.current[currentPage] || null;
    drawCanvasRef.current = pageDrawCanvasRefs.current[currentPage] || null;
    // Aktiv sahifaga scroll qilish (faqat tugma/klaviatura orqali, scroll orqali emas)
    if (scrollTriggeredRef.current) {
      scrollTriggeredRef.current = false;
    } else {
      const container = readingScrollRef.current;
      const pageEl = pageImgRefs.current[currentPage]?.parentElement;
      if (container && pageEl) {
        const containerRect = container.getBoundingClientRect();
        const pageRect = pageEl.getBoundingClientRect();
        if (pageRect.top < containerRect.top || pageRect.bottom > containerRect.bottom) {
          pageEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }
  }, [readingOpen, currentPage]);

  // Reading mode: scroll bo'lganda avtomatik sahifa almashish
  useEffect(() => {
    if (!readingOpen) return;
    const container = readingScrollRef.current;
    if (!container) return;

    const ratios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number(entry.target.getAttribute("data-page-idx"));
          if (!Number.isNaN(idx)) {
            ratios.set(idx, entry.intersectionRatio);
          }
        }
        let bestIdx = -1;
        let bestRatio = 0;
        ratios.forEach((ratio, idx) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        });
        if (bestIdx >= 0 && bestRatio > 0.1) {
          scrollTriggeredRef.current = true;
          setCurrentPage(bestIdx);
        }
      },
      { root: container, threshold: [0, 0.1, 0.3, 0.5, 0.7, 1] },
    );

    pageImgRefs.current.forEach((img, idx) => {
      const el = img?.parentElement;
      if (el) {
        el.setAttribute("data-page-idx", String(idx));
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [readingOpen, pages.length, setCurrentPage]);

  /* ── Canvas mode hooks ── */
  useDrawingMode({
    enabled: drawingMode,
    imgRef: cleanImgRef,
    canvasRef: drawCanvasRef,
    manga, chapter, currentPage,
    setData,
    setEnabled: setDrawingMode,
  });

  useOcrMode({
    enabled: ocrMode,
    imgRef: originalImgRef,
    canvasRef: ocrCanvasRef,
    manga, chapter, currentPage,
    setData,
    setEnabled: setOcrMode,
  });

  useLineCleanMode({
    enabled: lineCleanMode,
    imgRef: cleanImgRef,
    canvasRef: drawCanvasRef,
    manga, chapter, currentPage,
    setData, setStatus, setPageHasClean,
    setEnabled: setLineCleanMode,
  });

  useBubbleMode({
    bubbleMode,
    imgRef: cleanImgRef,
    canvasRef: drawCanvasRef,
    manga, chapter, currentPage,
    setData, setStatus, setPageHasClean,
    setBubbleMode,
    brushColor,
  });

  useCleanMode({
    enabled: cleanMode,
    imgRef: cleanImgRef,
    canvasRef: drawCanvasRef,
    manga, chapter, currentPage,
    brushSize,
    setData, setStatus, setPageHasClean,
    setEnabled: setCleanMode,
  });

  usePenMode({
    enabled: penMode,
    imgRef: cleanImgRef,
    canvasRef: drawCanvasRef,
    manga, chapter, currentPage,
    brushSize,
    brushColor,
    setData, setStatus, setPageHasClean,
    setEnabled: setPenMode,
  });

  useEyeDropperMode({
    enabled: eyeDropperMode,
    imgRef: cleanImgRef,
    canvasRef: drawCanvasRef,
    setBrushColor,
    setEnabled: setEyeDropperMode,
  });

  useResizeMode({
    anyModeActive: !!(drawingMode || cleanMode || lineCleanMode || ocrMode || bubbleMode || penMode || eyeDropperMode),
    imgRef: cleanImgRef,
    canvasRef: drawCanvasRef,
    manga, chapter, currentPage,
    pages,
    setRegionDrafts, setStatus, setData,
  });

  useScrollSync(originalWrapRef, cleanWrapRef, currentPage);

  const handleUndoClean = useCallback(async () => {
    if (!manga || !chapter) return;
    try {
      setStatus("Qaytarilmoqda...");
      const res = await api.undoClean(manga, chapter, currentPage);
      if (res.image_url) {
        setData((prev) => {
          if (!prev) return prev;
          const newPages = [...prev.pages];
          newPages[currentPage] = { ...newPages[currentPage], cleaned_image_url: res.image_url };
          return { ...prev, pages: newPages };
        });
        setPageHasClean(false);
      }
      setStatus("");
    } catch (err) {
      setStatus(`Qaytarish xatolik: ${(err as Error).message}`);
    }
  }, [manga, chapter, currentPage]);

  /* ── Keyboard shortcuts ── */
  const clearAllModes = useCallback(() => {
    setDrawingMode(false);
    setCleanMode(false);
    setLineCleanMode(false);
    setOcrMode(false);
    setBubbleMode(null);
    setPenMode(false);
    setEyeDropperMode(false);
  }, []);

  const handleToggleReading = useCallback(() => {
    clearAllModes();
    setReadingOpen((prev) => !prev);
  }, [clearAllModes]);

  const handleReadingPageClick = useCallback((idx: number) => {
    if (currentPage !== idx) {
      setCurrentPage(idx);
    }
  }, [currentPage, setCurrentPage]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (pageHasClean) handleUndoClean();
        return;
      }

      // Modifier bilan boshqa tugmalar — skip
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        // Tool shortcuts
        case "b": // Brush (pen)
          e.preventDefault();
          clearAllModes();
          setPenMode((p) => !p);
          break;
        case "e": // Eraser (clean)
          e.preventDefault();
          clearAllModes();
          setCleanMode((p) => !p);
          break;
        case "r": // Rectangle clean
          e.preventDefault();
          clearAllModes();
          setLineCleanMode((p) => !p);
          break;
        case "n": // New region
          e.preventDefault();
          clearAllModes();
          setDrawingMode((p) => !p);
          break;
        case "o": // OCR
          e.preventDefault();
          clearAllModes();
          setOcrMode((p) => !p);
          break;
        case "u": // Rectangle bubble
          e.preventDefault();
          clearAllModes();
          setBubbleMode(bubbleMode === "rect" ? null : "rect");
          break;
        case "j": // Oval bubble
          e.preventDefault();
          clearAllModes();
          setBubbleMode(bubbleMode === "oval" ? null : "oval");
          break;
        case "i": // Eyedropper
          e.preventDefault();
          clearAllModes();
          setEyeDropperMode((p) => !p);
          break;
        case "z": // Undo (Ctrl yo'q)
          e.preventDefault();
          if (pageHasClean) handleUndoClean();
          break;

        // Brush size
        case "[":
          e.preventDefault();
          setBrushSize(Math.max(1, brushSize - 5));
          break;
        case "]":
          e.preventDefault();
          setBrushSize(Math.min(100, brushSize + 5));
          break;

        // Sahifa navigatsiya
        case "ArrowLeft":
          e.preventDefault();
          setCurrentPage(Math.max(0, currentPage - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setCurrentPage(Math.min(pages.length, currentPage + 1));
          break;

        // Escape — barcha modlarni o'chirish
        case "Escape":
          clearAllModes();
          break;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [currentPage, pages.length, bubbleMode, brushSize, pageHasClean, clearAllModes, handleUndoClean, setCurrentPage]);

  const pollJobRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollJobRef.current) clearInterval(pollJobRef.current);
    };
  }, []);

  const executeRerunOcr = useCallback(async (settings: ProjectSettings) => {
    if (!manga || !chapter) return;
    setRerunLoading(true);
    try {
      await api.saveProjectSettings(manga, settings);
      const result = await api.startJob({
        manga,
        chapter,
        language: settings.language,
        backend: settings.backend,
        ocr_backend: settings.ocr_backend,
        cleaner_backend: settings.cleaner_backend,
        translator_model: settings.translator_model || undefined,
        skip_clean: rerunSkipClean,
        limit: settings.limit,
      });
      if (rerunSkipConfirm) {
        localStorage.setItem(`ocr-rerun-skip-confirm:${manga}`, "true");
      }
      setRerunModalOpen(false);
      toast.loading("Qayta OCR jarayonda...", { id: "rerun-ocr" });

      // Poll job status
      if (pollJobRef.current) clearInterval(pollJobRef.current);
      pollJobRef.current = setInterval(async () => {
        try {
          const job = await api.getJob(result.job_id);
          if (job.status === "done") {
            if (pollJobRef.current) clearInterval(pollJobRef.current);
            pollJobRef.current = null;
            setRerunLoading(false);
            const updated = await api.getResults(manga, chapter);
            setRegionDrafts({});
            setData(updated);
            toast.success("Qayta OCR muvaffaqiyatli tugadi", { id: "rerun-ocr" });
          } else if (job.status === "failed" || job.status === "cancelled") {
            if (pollJobRef.current) clearInterval(pollJobRef.current);
            pollJobRef.current = null;
            setRerunLoading(false);
            toast.error(job.status === "failed" ? "OCR xatolik bilan tugadi" : "OCR bekor qilindi", { id: "rerun-ocr" });
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);
    } catch (e) {
      const err = e as Error;
      setStatus(`Xatolik: ${err.message}`);
      setRerunLoading(false);
    }
  }, [manga, chapter, rerunSkipConfirm, rerunSkipClean]);

  const handleRerunOcr = useCallback(async () => {
    if (!manga || !chapter) return;
    try {
      const project = await api.getProject(manga);
      const settings = project.settings ?? DEFAULT_SETTINGS;
      setRerunSettings(settings);
      setRerunSkipConfirm(false);

      const skip = localStorage.getItem(`ocr-rerun-skip-confirm:${manga}`) === "true";
      if (skip) {
        await executeRerunOcr(settings);
      } else {
        setRerunModalOpen(true);
      }
    } catch (e) {
      const err = e as Error;
      setStatus(`Xatolik: ${err.message}`);
    }
  }, [manga, chapter, executeRerunOcr]);

  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!data || !manga || !chapter) return;
    const exportPages = data.pages.filter((p) => p.cleaned_image_url);
    if (exportPages.length === 0) {
      toast.error("Export uchun tozalangan sahifalar yo'q");
      return;
    }
    setExporting(true);
    try {
      for (let i = 0; i < exportPages.length; i++) {
        const page = exportPages[i];
        toast.loading(`Export: ${i + 1}/${exportPages.length}...`, { id: "export-progress" });
        const canvas = await renderPageForExport(page.cleaned_image_url!, page.regions || []);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Blob yaratib bo'lmadi"))),
            "image/png",
          );
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const pageNum = String(data.pages.indexOf(page) + 1).padStart(3, "0");
        a.download = `${manga}_${chapter}_${pageNum}.png`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 300));
      }
      toast.success(`${exportPages.length} sahifa export qilindi`, { id: "export-progress" });
    } catch (e) {
      const err = e as Error;
      toast.error(`Export xatolik: ${err.message}`, { id: "export-progress" });
    } finally {
      setExporting(false);
    }
  }, [data, manga, chapter]);

  const handleExportCurrentPage = useCallback(async () => {
    if (!data || !manga || !chapter) return;
    const page = data.pages[currentPage];
    if (!page?.cleaned_image_url) {
      toast.error("Bu sahifada tozalangan rasm yo'q");
      return;
    }
    setExporting(true);
    try {
      toast.loading("Export qilinmoqda...", { id: "export-progress" });
      const canvas = await renderPageForExport(page.cleaned_image_url, page.regions || []);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Blob yaratib bo'lmadi"))),
          "image/png",
        );
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const pageNum = String(currentPage + 1).padStart(3, "0");
      a.download = `${manga}_${chapter}_${pageNum}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Sahifa export qilindi", { id: "export-progress" });
    } catch (e) {
      const err = e as Error;
      toast.error(`Export xatolik: ${err.message}`, { id: "export-progress" });
    } finally {
      setExporting(false);
    }
  }, [data, manga, chapter, currentPage]);

  const handleTranslateConfirm = useCallback(async () => {
    if (!manga || !chapter) return;
    setConfirmTranslate(false);
    setTranslating(true);
    try {
      await api.retranslateRegions(manga, chapter, { all: true });
      const updated = await api.getResults(manga, chapter);
      setRegionDrafts({});
      setData(updated);
      toast.success("Tarjima muvaffaqiyatli tugadi");
    } catch (e) {
      const err = e as Error;
      toast.error(err.message);
    } finally {
      setTranslating(false);
    }
  }, [manga, chapter]);

  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">{status}</div>;
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">Natijalar topilmadi</p>
      </div>
    );
  }

  if (currentPage === pages.length) {
    return (
      <TranslationTextsView
        texts={texts}
        onBack={() => setCurrentPage(pages.length - 1)}
      />
    );
  }

  const page = pages[currentPage];
  const regions = page.regions || [];

  return (
    <div className="animate-fade-in flex h-[calc(100vh-48px)] flex-col gap-3">
      <ResultsToolbar
        manga={manga!}
        chapter={chapter!}
        data={data}
        currentPage={currentPage}
        totalPages={totalPages}
        translating={translating}
        confirmTranslate={confirmTranslate}
        runInfo={runInfo}
        setCurrentPage={setCurrentPage}
        setTranslating={setTranslating}
        setConfirmTranslate={setConfirmTranslate}
        readingOpen={readingOpen}
        onToggleReading={handleToggleReading}
        onTranslateConfirm={handleTranslateConfirm}
        onRerunOcr={handleRerunOcr}
        onExport={handleExport}
        onExportPage={handleExportCurrentPage}
        onRunInfoOpen={() => setRunInfoOpen(true)}
        exporting={exporting}
        rerunLoading={rerunLoading}
        pagesCount={pages.length}
      />

      {/* Sidebar + panels layout */}
      <div className={`grid min-h-0 flex-1 gap-2 ${readingOpen ? "lg:grid-cols-[40px_1fr_340px]" : "lg:grid-cols-[40px_1fr_1fr_340px]"}`}>
        <ActionSidebar
          drawingMode={drawingMode}
          cleanMode={cleanMode}
          lineCleanMode={lineCleanMode}
          ocrMode={ocrMode}
          penMode={penMode}
          eyeDropperMode={eyeDropperMode}
          bubbleMode={bubbleMode}
          pageHasClean={pageHasClean}
          brushSize={brushSize}
          brushColor={brushColor}
          setDrawingMode={(v) => {
            const next = typeof v === "function" ? v(drawingMode) : v;
            setDrawingMode(next);
            if (next) { setCleanMode(false); setLineCleanMode(false); setOcrMode(false); setBubbleMode(null); setPenMode(false); setEyeDropperMode(false); }
          }}
          setCleanMode={(v) => {
            const next = typeof v === "function" ? v(cleanMode) : v;
            setCleanMode(next);
            if (next) { setDrawingMode(false); setLineCleanMode(false); setOcrMode(false); setBubbleMode(null); setPenMode(false); setEyeDropperMode(false); }
          }}
          setLineCleanMode={(v) => {
            const next = typeof v === "function" ? v(lineCleanMode) : v;
            setLineCleanMode(next);
            if (next) { setDrawingMode(false); setCleanMode(false); setOcrMode(false); setBubbleMode(null); setPenMode(false); setEyeDropperMode(false); }
          }}
          setOcrMode={(v) => {
            const next = typeof v === "function" ? v(ocrMode) : v;
            setOcrMode(next);
            if (next) { setDrawingMode(false); setCleanMode(false); setLineCleanMode(false); setBubbleMode(null); setPenMode(false); setEyeDropperMode(false); }
          }}
          setPenMode={(v) => {
            const next = typeof v === "function" ? v(penMode) : v;
            setPenMode(next);
            if (next) { setDrawingMode(false); setCleanMode(false); setLineCleanMode(false); setOcrMode(false); setBubbleMode(null); setEyeDropperMode(false); }
          }}
          setEyeDropperMode={(v) => {
            const next = typeof v === "function" ? v(eyeDropperMode) : v;
            setEyeDropperMode(next);
            if (next) { setDrawingMode(false); setCleanMode(false); setLineCleanMode(false); setOcrMode(false); setBubbleMode(null); setPenMode(false); }
          }}
          setBubbleMode={(v) => {
            setBubbleMode(v);
            if (v) { setDrawingMode(false); setCleanMode(false); setLineCleanMode(false); setOcrMode(false); setPenMode(false); setEyeDropperMode(false); }
          }}
          setBrushSize={setBrushSize}
          setBrushColor={setBrushColor}
          onUndoClean={handleUndoClean}
        />

        {readingOpen ? (
          /* ── Reading mode: continuous scroll ── */
          <div ref={readingScrollRef} className="min-h-0 overflow-auto rounded-lg bg-black">
            <div className="mx-auto max-w-3xl">
              {pages.map((page, idx) => {
                const isActive = idx === currentPage;
                return (
                  <div
                    key={`rp-${idx}`}
                    className={`relative leading-[0] ${isActive ? "ring-2 ring-primary ring-inset z-10" : "cursor-pointer"}`}
                    onClick={() => handleReadingPageClick(idx)}
                  >
                    <img
                      ref={(el) => { pageImgRefs.current[idx] = el; }}
                      src={page.cleaned_image_url || page.image_url}
                      alt={`Page ${idx + 1}`}
                      loading="lazy"
                      className="block w-full"
                      onLoad={() => {
                        const canvas = pageTextCanvasRefs.current[idx];
                        const img = pageImgRefs.current[idx];
                        if (!canvas || !img) return;
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        canvas.style.width = `${img.clientWidth}px`;
                        canvas.style.height = `${img.clientHeight}px`;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        drawTranslatedTexts(ctx, page.regions || []);
                      }}
                    />
                    <canvas
                      ref={(el) => { pageTextCanvasRefs.current[idx] = el; }}
                      className="pointer-events-none absolute inset-0"
                    />
                    <canvas
                      ref={(el) => { pageDrawCanvasRefs.current[idx] = el; }}
                      className={`absolute inset-0 ${
                        isActive
                          ? (cleanMode || penMode ? "cursor-none" : eyeDropperMode ? "cursor-none" : drawingMode || lineCleanMode || bubbleMode ? "cursor-crosshair" : "")
                          : "pointer-events-none"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Normal mode: original + clean side by side ── */
          <>
            <ImagePanel
              label="Original"
              imgRef={originalImgRef}
              canvasRef={originalCanvasRef}
              wrapRef={originalWrapRef}
              imgSrc={page.image_url}
              imgAlt="Original"
            >
              <canvas
                ref={ocrCanvasRef}
                className={`absolute inset-0 ${ocrMode ? "cursor-crosshair" : "pointer-events-none"}`}
              />
            </ImagePanel>

            <ImagePanel
              label="Tarjima"
              imgRef={cleanImgRef}
              canvasRef={cleanCanvasRef}
              wrapRef={cleanWrapRef}
              imgSrc={page.cleaned_image_url}
              imgAlt="Cleaned"
            >
              <canvas
                ref={drawCanvasRef}
                className={`absolute inset-0 ${cleanMode || penMode ? "cursor-none" : eyeDropperMode ? "cursor-none" : drawingMode || lineCleanMode || bubbleMode ? "cursor-crosshair" : ""}`}
              />
            </ImagePanel>
          </>
        )}

        <RegionPanel
          regions={regions}
          currentPage={currentPage}
          regionDrafts={regionDrafts}
          setRegionDrafts={setRegionDrafts}
          confirmingDelete={confirmingDelete}
          setConfirmingDelete={setConfirmingDelete}
          manga={manga!}
          chapter={chapter!}
          onDataUpdate={setData}
          compact={readingOpen}
        />
      </div>
      {runInfoOpen && runInfo && (runInfo.ocr_run || runInfo.translate_run) && (
        <RunInfoModal info={runInfo} onClose={() => setRunInfoOpen(false)} />
      )}
      <RerunOcrModal
        open={rerunModalOpen}
        settings={rerunSettings}
        setSettings={setRerunSettings}
        skipConfirm={rerunSkipConfirm}
        setSkipConfirm={setRerunSkipConfirm}
        skipClean={rerunSkipClean}
        setSkipClean={setRerunSkipClean}
        loading={rerunLoading}
        onRun={() => executeRerunOcr(rerunSettings)}
        onClose={() => setRerunModalOpen(false)}
      />
    </div>
  );
}

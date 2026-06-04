import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Eye, Pencil, Loader2, Trash2, Scissors, ArrowUpDown, CheckCircle2, Circle, Upload, Cloud, CloudUpload, CloudOff, ImageIcon, Wand2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../lib/api";
import type { Chapter, Project, ProjectSettings } from "../../lib/types";
import { chapterLabel } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const statusVariant: Record<string, "success" | "info" | "warning" | "danger"> = {
  done: "success",
  ocr_done: "info",
  translating: "warning",
  processing: "warning",
  uploaded: "info",
  failed: "danger",
};

const statusLabel: Record<string, string> = {
  done: "Tayyor",
  ocr_done: "OCR tayyor",
  translating: "Tarjima...",
  processing: "Jarayonda",
  uploaded: "Yuklangan",
  failed: "Xatolik",
};

function chapterBadgeVariant(chapter: Chapter): "success" | "info" | "warning" | "danger" {
  if (chapter.status === "uploaded" && chapter.auto_merged) return "success";
  return statusVariant[chapter.status] || "info";
}

function chapterBadgeLabel(chapter: Chapter): string {
  if (chapter.status === "uploaded" && chapter.auto_merged) return "Tartiblangan";
  return statusLabel[chapter.status] || chapter.status;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm > 0 ? `${h}h ${mm}m` : `${h}h`;
}

const TIMING_LABELS: Record<string, string> = {
  auto_merge: "Auto merge",
  ocr: "OCR",
  clean: "Clean",
  translate: "Tarjima",
};

function timingTooltip(timings: Record<string, number>): string {
  const order = ["auto_merge", "ocr", "clean", "translate"];
  const lines: string[] = [];
  for (const key of order) {
    const sec = timings[key];
    if (sec && sec > 0) {
      lines.push(`${TIMING_LABELS[key] || key}: ${formatDuration(sec)}`);
    }
  }
  // Boshqa nomdagi timinglar bo'lsa
  for (const [key, sec] of Object.entries(timings)) {
    if (!order.includes(key) && sec > 0) {
      lines.push(`${TIMING_LABELS[key] || key}: ${formatDuration(sec)}`);
    }
  }
  return lines.join("\n");
}

function totalTimingSec(timings: Record<string, number> | undefined): number {
  if (!timings) return 0;
  return Object.values(timings).reduce((a, b) => a + (b > 0 ? b : 0), 0);
}

function isRemoteR2Chapter(chapter: Chapter) {
  return chapter.remote || chapter.source === "r2";
}

/**
 * Bob "tarjima qilingan" deb belgilangan, lekin uz_text bo'lmagan regionlar borligini aniqlaydi.
 * Backend bobni `done` deb yozadi agarda hech bo'lmasa bitta region tarjima qilingan bo'lsa,
 * shuning uchun bu yerda total/translated farqi orqali yarim tarjimani topamiz.
 */
function translationGap(chapter: Chapter): { missing: number; total: number } | null {
  const total = chapter.total_regions ?? 0;
  const translated = chapter.translated_regions ?? 0;
  if (total <= 0) return null;
  const missing = total - translated;
  if (missing <= 0) return null;
  // Faqat tarjima bosqichi ishlagan boblarda warning ko'rsatamiz.
  // OCR tugagan, tarjima hech boshlanmagan boblarda — bu normal holat, warning shart emas.
  if (translated === 0) return null;
  return { missing, total };
}

/**
 * Boblar raqamlari ketma-ketligida tushib qolgan butun sonlarni topadi.
 * Masalan boblar [1, 2, 4, 5] bo'lsa — 3-bob yo'q.
 * Barcha boblar (lokal + R2 + published) hisobga olinadi, chunki ular ham "mavjud" bob.
 * Kasrli (bonus) boblar (masalan 5.5) butun slotni qoplaydi — 5 mavjud deb hisoblanadi.
 */
function findMissingChapterNumbers(chapters: Chapter[]): number[] {
  const present = new Set<number>();
  for (const ch of chapters) {
    const n = parseFloat(ch.name.replace("_", "."));
    if (Number.isNaN(n)) continue;
    present.add(Math.floor(n));
  }
  if (present.size < 2) return [];
  const nums = Array.from(present).sort((a, b) => a - b);
  const min = nums[0];
  const max = nums[nums.length - 1];
  const missing: number[] = [];
  for (let i = min; i <= max; i++) {
    if (!present.has(i)) missing.push(i);
  }
  return missing;
}

interface ChapterListProps {
  chapters: Chapter[];
  projectName: string;
  settings: ProjectSettings;
  forceOcr: boolean;
  forceClean: boolean;
  publishedChapters: string[];
  publishingTarget: "manga" | string | null;
  project: Project | null;
  onProjectUpdate: (project: Project) => void;
  onPublishChapter: (chapter: string) => void;
  onSetThumbnail: (chapter: string) => void;
}

export default function ChapterList({
  chapters,
  projectName,
  settings,
  forceOcr,
  forceClean,
  publishedChapters,
  publishingTarget,
  project,
  onProjectUpdate,
  onPublishChapter,
  onSetThumbnail,
}: ChapterListProps) {
  const navigate = useNavigate();
  const [startingChapter, setStartingChapter] = useState<string | null>(null);
  const [selectedPublished, setSelectedPublished] = useState<Set<string>>(new Set());
  const [unpublishing, setUnpublishing] = useState(false);
  const [autoMergingChapters, setAutoMergingChapters] = useState<Set<string>>(new Set());
  const [publishedExpanded, setPublishedExpanded] = useState(false);
  const [bulkValidating, setBulkValidating] = useState(false);

  async function handleAutoMerge(chapter: Chapter) {
    setAutoMergingChapters((prev) => {
      const next = new Set(prev);
      next.add(chapter.name);
      return next;
    });
    try {
      const res = await api.autoMerge(projectName, chapter.name);
      if (res.merge_groups === 0) {
        toast.info(`${chapter.name}-bob: birlashtirish kerak emas`);
      } else {
        toast.success(
          `${chapter.name}-bob: ${res.total_merged} rasm ${res.merge_groups} guruhga birlashtirildi`
        );
      }
      const updated = await api.getProject(projectName);
      onProjectUpdate(updated);
    } catch (e) {
      toast.error(`${chapter.name}-bob: ${(e as Error).message}`);
    } finally {
      setAutoMergingChapters((prev) => {
        const next = new Set(prev);
        next.delete(chapter.name);
        return next;
      });
    }
  }

  async function handleStartJob(chapter: Chapter) {
    setStartingChapter(chapter.name);
    try {
      await api.startJob({
        manga: projectName,
        chapter: chapter.name,
        language: settings.language,
        backend: settings.backend,
        ocr_backend: settings.ocr_backend,
        inpaint_backend: settings.inpaint_backend,
        translator_model: settings.translator_model || undefined,
        limit: settings.limit,
        force_ocr: forceOcr || undefined,
        force_clean: forceClean || undefined,
      });
      toast.success(`${chapter.name}-bob OCR boshlandi`);
      const updated = await api.getProject(projectName);
      onProjectUpdate(updated);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStartingChapter(null);
    }
  }

  function toggleSelect(chapterName: string) {
    setSelectedPublished((prev) => {
      const next = new Set(prev);
      if (next.has(chapterName)) {
        next.delete(chapterName);
      } else {
        next.add(chapterName);
      }
      return next;
    });
  }

  async function handleUnpublish() {
    const selected = Array.from(selectedPublished);
    if (!selected.length) return;
    if (!confirm(`${selected.length} bob unpublish qilinadi. CDN dan o'chiriladi. Davom etsinmi?`)) return;
    setUnpublishing(true);
    try {
      const res = await api.unpublishChapters(projectName, selected);
      toast.success(res.message);
      setSelectedPublished(new Set());
      const updated = await api.getProject(projectName);
      onProjectUpdate(updated);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUnpublishing(false);
    }
  }

  async function handleBulkToggleValidated() {
    // Faqat tarjimasi tugagan (status === "done"), publish qilinmagan lokal boblarda ishlaymiz.
    // OCR qilinmagan / hali jarayondagi boblar publish'ga yaroqli emas, shularni tegmaymiz.
    const eligible = chapters.filter(
      (ch) =>
        !isRemoteR2Chapter(ch) &&
        !publishedChapters.includes(ch.name) &&
        ch.status === "done"
    );
    if (eligible.length === 0) {
      toast.info("Tasdiqlash uchun bob yo'q");
      return;
    }
    // Agar barcha tegishli boblar allaqachon tasdiqlangan bo'lsa — barchasini olib tashlaymiz,
    // aks holda tasdiqlanmaganlarni belgilaymiz.
    const allValidated = eligible.every((ch) => ch.is_validated);
    const targetVal = !allValidated;
    const toUpdate = eligible.filter((ch) => Boolean(ch.is_validated) !== targetVal);
    if (toUpdate.length === 0) {
      toast.info("Yangilanish kerak emas");
      return;
    }

    setBulkValidating(true);
    // Optimistic update — to'liq project obyektini saqlaymiz (published_chapters
    // va boshqa maydonlar yo'qolmasligi uchun), faqat chapters'ni yangilaymiz.
    const optimistic = chapters.map((ch) =>
      toUpdate.some((u) => u.name === ch.name) ? { ...ch, is_validated: targetVal } : ch
    );
    onProjectUpdate({
      ...(project as Project),
      slug: project?.slug ?? projectName,
      display_name: project?.display_name ?? projectName,
      chapters: optimistic,
      chapter_count: optimistic.length,
    });

    try {
      await Promise.all(
        toUpdate.map((ch) => api.updateChapterValidated(projectName, ch.name, targetVal))
      );
      toast.success(
        targetVal
          ? `${toUpdate.length} bob tasdiqlandi`
          : `${toUpdate.length} bob tasdiqdan olindi`
      );
      const updated = await api.getProject(projectName);
      onProjectUpdate(updated);
    } catch (e) {
      toast.error((e as Error).message);
      const reverted = await api.getProject(projectName);
      onProjectUpdate(reverted);
    } finally {
      setBulkValidating(false);
    }
  }

  const remoteChapters = chapters.filter(isRemoteR2Chapter);
  const localChapters = chapters.filter((chapter) => !isRemoteR2Chapter(chapter));
  const unpublishablePublished = localChapters
    .filter((chapter) => publishedChapters.includes(chapter.name))
    .map((chapter) => chapter.name);
  const hasPublished = unpublishablePublished.length > 0;

  // Lokal chapterlarni publish qilingan/qilinmaganga ajratamiz —
  // publish qilinganlar ixchamroq strip-da, qolganlari ro'yxatda.
  const publishedLocalChapters = localChapters.filter((chapter) =>
    publishedChapters.includes(chapter.name)
  );
  const activeLocalChapters = localChapters.filter(
    (chapter) => !publishedChapters.includes(chapter.name)
  );

  // Bulk validate uchun: faqat tarjimasi tugagan ("done"), publish qilinmagan lokal boblar.
  // OCR qilinmagan yoki tarjima jarayonidagilar publish qilinishi mumkin emas — shularni hisobga olmaymiz.
  const bulkEligible = activeLocalChapters.filter((ch) => ch.status === "done");
  const bulkValidatedCount = bulkEligible.filter((ch) => ch.is_validated).length;
  const bulkAllValidated = bulkEligible.length > 0 && bulkValidatedCount === bulkEligible.length;
  const bulkSomeValidated = bulkValidatedCount > 0 && bulkValidatedCount < bulkEligible.length;

  // Yarim tarjima bo'lgan (uz_text bo'sh regionlari bor) lokal boblar — diqqatga olish.
  const incompleteChapters = localChapters
    .map((ch) => ({ chapter: ch, gap: translationGap(ch) }))
    .filter((x): x is { chapter: Chapter; gap: { missing: number; total: number } } => x.gap !== null);
  const incompleteMissingTotal = incompleteChapters.reduce((acc, x) => acc + x.gap.missing, 0);

  // Boblar raqamlari orasida tushib qolgan boblar (masalan 1, 2, 4 — 3 yo'q).
  // Barcha boblarni (lokal + R2 + published) hisobga olamiz.
  const missingChapterNumbers = findMissingChapterNumbers(chapters);

  return (
    <div className="min-w-0 xl:flex-1">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-3">
            {bulkEligible.length > 0 && (
              <button
                type="button"
                disabled={bulkValidating}
                onClick={handleBulkToggleValidated}
                title={
                  bulkAllValidated
                    ? "Barcha tasdiqlarni olib tashlash"
                    : `Tasdiqlanmagan ${bulkEligible.length - bulkValidatedCount} bobni tasdiqlash`
                }
                className="flex items-center justify-center"
              >
                {bulkValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : bulkAllValidated ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : bulkSomeValidated ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500/50" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground" />
                )}
              </button>
            )}
            <span className="text-sm font-medium">Chapterlar</span>
            <span className="text-xs text-muted-foreground">
              {chapters.length} ta
              {remoteChapters.length > 0 ? `, ${remoteChapters.length} R2` : ""}
              {bulkEligible.length > 0 && bulkValidatedCount > 0 && (
                <span className="ml-1 text-emerald-500/80">
                  · {bulkValidatedCount}/{bulkEligible.length} tasdiqlangan
                </span>
              )}
            </span>
          </div>
          {selectedPublished.size > 0 ? (
            <Button
              size="sm"
              variant="outline"
              disabled={unpublishing}
              onClick={handleUnpublish}
              className="h-7 gap-1.5 text-xs text-orange-500 hover:text-orange-600 border-orange-300"
            >
              {unpublishing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CloudOff className="h-3 w-3" />
              )}
              Unpublish ({selectedPublished.size})
            </Button>
          ) : hasPublished ? (
            <button
              type="button"
              onClick={() =>
                setSelectedPublished(new Set(unpublishablePublished))
              }
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              title="Barcha publish qilinganlarni tanlash"
            >
              {unpublishablePublished.length} publish
            </button>
          ) : null}
        </div>

        {incompleteChapters.length > 0 && (
          <div className="flex items-start gap-2 border-b border-red-500/20 bg-red-500/[0.05] px-5 py-2.5 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-red-300">
                {incompleteChapters.length} bobda tarjima yarim qolgan
              </div>
              <div className="mt-0.5 text-red-300/70">
                Jami {incompleteMissingTotal} ta region tarjimasiz: {" "}
                {incompleteChapters
                  .slice(0, 8)
                  .map((x) => `${x.chapter.name} (${x.gap.missing})`)
                  .join(", ")}
                {incompleteChapters.length > 8 ? ` va yana ${incompleteChapters.length - 8} ta` : ""}
              </div>
            </div>
          </div>
        )}

        {missingChapterNumbers.length > 0 && (
          <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/[0.05] px-5 py-2.5 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-amber-300">
                {missingChapterNumbers.length} ta bob tushib qolgan
              </div>
              <div className="mt-0.5 text-amber-300/70">
                Boblar ketma-ketligida yo'q: {" "}
                {missingChapterNumbers.slice(0, 15).join(", ")}
                {missingChapterNumbers.length > 15
                  ? ` va yana ${missingChapterNumbers.length - 15} ta`
                  : ""}
              </div>
            </div>
          </div>
        )}

        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-sm text-muted-foreground">Chapter topilmadi</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Yuklash sahifasidan rasm qo'shing.
            </p>
          </div>
        ) : (
          <div>
            {remoteChapters.length > 0 && (
              <div className="border-b bg-sky-500/[0.03] px-5 py-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-sky-300">
                  <Cloud className="h-3.5 w-3.5" />
                  R2 synced
                  <span className="text-muted-foreground">
                    {remoteChapters.length} bob, klik va actionlar o'chirilgan
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {remoteChapters.map((chapter) => (
                    <span
                      key={chapter.name}
                      className="inline-flex h-7 items-center gap-1 rounded border border-sky-400/20 bg-sky-400/10 px-2 text-[11px] text-sky-200"
                      title={`${chapter.r2_chapter_key || chapter.name}: ${chapter.published_page_count || chapter.image_count} sahifa`}
                    >
                      {chapterLabel(chapter.name)}
                      <span className="text-sky-100/60">
                        {chapter.published_page_count || chapter.image_count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {publishedLocalChapters.length > 0 && (
              <div className="border-b bg-emerald-500/[0.03] px-5 py-3">
                <button
                  className="flex w-full items-center gap-2 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-colors"
                  onClick={() => setPublishedExpanded((v) => !v)}
                >
                  {publishedExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <CloudUpload className="h-3.5 w-3.5" />
                  Published
                  <span className="text-muted-foreground font-normal">
                    {publishedLocalChapters.length} bob
                  </span>
                  {selectedPublished.size > 0 && (
                    <span className="ml-auto text-orange-400">
                      {selectedPublished.size} tanlangan
                    </span>
                  )}
                </button>
                {!publishedExpanded ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {publishedLocalChapters.map((chapter) => {
                      const selected = selectedPublished.has(chapter.name);
                      const chipGap = translationGap(chapter);
                      return (
                        <button
                          key={chapter.name}
                          className={`inline-flex h-7 items-center gap-1 rounded border px-2 text-[11px] transition-colors ${
                            selected
                              ? "border-orange-400/60 bg-orange-400/15 text-orange-200"
                              : chipGap
                                ? "border-red-400/40 bg-red-400/10 text-red-200 hover:border-red-400/60"
                                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:border-emerald-400/40"
                          }`}
                          title={
                            chipGap
                              ? `${chapter.name}-bob: ${chipGap.missing} region tarjimasiz (${chapter.image_count} rasm)`
                              : `${chapter.name}-bob: ${chapter.image_count} rasm — klik: tanlash, dbl: ochish`
                          }
                          onClick={(e) => {
                            if (e.shiftKey || e.metaKey || e.ctrlKey) {
                              toggleSelect(chapter.name);
                            } else {
                              toggleSelect(chapter.name);
                            }
                          }}
                          onDoubleClick={() => navigate(`/results/${projectName}/${chapter.name}`)}
                        >
                          {chipGap && <AlertTriangle className="h-3 w-3 text-red-300" />}
                          {chapterLabel(chapter.name)}
                          <span className={chipGap ? "text-red-100/60" : "text-emerald-100/50"}>
                            {chipGap ? chipGap.missing : chapter.image_count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-2 divide-y rounded border border-emerald-400/10">
                    {publishedLocalChapters.map((chapter) => (
                      <PublishedChapterRow
                        key={chapter.name}
                        chapter={chapter}
                        projectName={projectName}
                        selected={selectedPublished.has(chapter.name)}
                        onToggleSelect={() => toggleSelect(chapter.name)}
                        onOpen={() => navigate(`/results/${projectName}/${chapter.name}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeLocalChapters.length === 0 && publishedLocalChapters.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Lokal OCR/tarjima chapterlari yo'q.
              </div>
            ) : activeLocalChapters.length === 0 ? null : (
              <div className="divide-y">
                {activeLocalChapters.map((chapter) => {
              const isClickable = chapter.status === "done" || chapter.status === "ocr_done";
              const isPublished = publishedChapters.includes(chapter.name);
              const gap = translationGap(chapter);
              return (
                <div
                  key={chapter.name}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${
                    gap ? "bg-red-500/[0.04] border-l-2 border-red-500/60" : ""
                  } ${
                    isClickable ? "cursor-pointer transition-colors hover:bg-muted/50" : ""
                  }`}
                  onClick={() => {
                    if (!isClickable) return;
                    navigate(`/results/${projectName}/${chapter.name}`);
                  }}
                >
                  <div className="flex items-center gap-4">
                    {isPublished ? (
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 flex-shrink-0 rounded border-muted-foreground/40 accent-orange-500 cursor-pointer"
                        checked={selectedPublished.has(chapter.name)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(chapter.name);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button
                        className="flex-shrink-0 transition-colors"
                        title={chapter.is_validated ? "Tekshirilgan" : "Tekshirilmagan"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newVal = !chapter.is_validated;
                          // Optimistic update — to'liq project obyektini saqlaymiz,
                          // aks holda published_chapters yo'qolib, Published bo'limi yopilib qoladi.
                          const updatedChapters = chapters.map((ch) =>
                            ch.name === chapter.name ? { ...ch, is_validated: newVal } : ch
                          );
                          onProjectUpdate({
                            ...(project as Project),
                            slug: project?.slug ?? projectName,
                            display_name: project?.display_name ?? projectName,
                            chapters: updatedChapters,
                            chapter_count: updatedChapters.length,
                          });
                          try {
                            await api.updateChapterValidated(projectName, chapter.name, newVal);
                          } catch (err) {
                            toast.error((err as Error).message);
                            const reverted = await api.getProject(projectName);
                            onProjectUpdate(reverted);
                          }
                        }}
                      >
                        {chapter.is_validated ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
                        )}
                      </button>
                    )}
                    {/* Thumbnail */}
                    <button
                      className="flex-shrink-0 rounded overflow-hidden border border-muted-foreground/20 hover:border-primary/50 transition-colors"
                      title="Thumbnail o'rnatish"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetThumbnail(chapter.name);
                      }}
                    >
                      {chapter.thumbnail_url ? (
                        <img
                          src={chapter.thumbnail_url}
                          alt=""
                          className="h-[62px] w-[105px] object-cover"
                        />
                      ) : (
                        <div className="flex h-[62px] w-[105px] items-center justify-center bg-muted/50">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </button>
                    <div>
                      <div className="text-sm font-medium">{chapterLabel(chapter.name)}-bob</div>
                      <div className="text-xs text-muted-foreground">{chapter.image_count} rasm</div>
                    </div>
                    <Badge variant={chapterBadgeVariant(chapter)}>
                      {chapterBadgeLabel(chapter)}
                    </Badge>
                    {gap && (
                      <span
                        className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-300"
                        title={`Tarjima yarim: ${gap.total - gap.missing}/${gap.total} region tarjima qilingan, ${gap.missing} ta uz_text yo'q`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {gap.missing} tarjima yo'q
                      </span>
                    )}
                    {isPublished && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-sky-400" title="Published">
                        <CloudUpload className="h-3 w-3" />
                      </span>
                    )}
                    {chapter.automation_score != null && chapter.automation_score > 0 && (
                      <span
                        className={`text-[11px] font-medium tabular-nums ${
                          chapter.automation_score >= 80
                            ? "text-emerald-400"
                            : chapter.automation_score >= 40
                              ? "text-amber-400"
                              : "text-zinc-400"
                        }`}
                        title="Avtomatlashtirish foizi"
                      >
                        {chapter.automation_score.toFixed(0)}% auto
                      </span>
                    )}
                    {totalTimingSec(chapter.timings) > 0 && (
                      <span
                        className="text-[11px] font-medium tabular-nums text-sky-400"
                        title={timingTooltip(chapter.timings || {})}
                      >
                        ⏱ {formatDuration(totalTimingSec(chapter.timings))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(chapter.status === "done" || chapter.status === "ocr_done") && (
                      <>
                        <Link
                          to={`/results/${projectName}/${chapter.name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                            <Eye className="h-3.5 w-3.5" />
                            Ko'rish
                          </Button>
                        </Link>
                        <Link
                          to={`/edit/${projectName}/${chapter.name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                            <Pencil className="h-3.5 w-3.5" />
                            Tahrir
                          </Button>
                        </Link>
                        {chapter.status === "done" && chapter.is_validated && !isPublished && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-xs"
                            disabled={publishingTarget !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPublishChapter(chapter.name);
                            }}
                          >
                            {publishingTarget === chapter.name ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            Publish
                          </Button>
                        )}
                      </>
                    )}
                    {(chapter.status === "processing" || chapter.status === "translating") &&
                      chapter.job_id && (
                        <Link
                          to={`/job/${chapter.job_id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Progress
                          </Button>
                        </Link>
                      )}
                    {(chapter.status === "uploaded" || chapter.status === "failed") && !chapter.auto_merged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        disabled={autoMergingChapters.has(chapter.name)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutoMerge(chapter);
                        }}
                        title="Qisqa rasmlarni avtomatik birlashtirish"
                      >
                        {autoMergingChapters.has(chapter.name) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="h-3.5 w-3.5" />
                        )}
                        Auto tartib
                      </Button>
                    )}
                    <Link
                      to={`/reorder/${projectName}/${chapter.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        Tartib
                      </Button>
                    </Link>
                    {(chapter.status === "uploaded" || chapter.status === "failed") && (
                      <>
                        {chapter.has_tall_images && (
                          <Link
                            to={`/crop/${projectName}/${chapter.name}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant={chapter.crop_status === "done" ? "ghost" : "outline"}
                              className="h-8 gap-1 text-xs"
                            >
                              <Scissors className="h-3.5 w-3.5" />
                              Qirqish
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          disabled={startingChapter === chapter.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartJob(chapter);
                          }}
                        >
                          {startingChapter === chapter.name ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          OCR
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`${chapter.name}-bobni o'chirmoqchimisiz?`)) return;
                        await api.deleteChapter(projectName, chapter.name);
                        const updated = await api.getProject(projectName);
                        onProjectUpdate(updated);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface PublishedChapterRowProps {
  chapter: Chapter;
  projectName: string;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
}

function PublishedChapterRow({
  chapter,
  projectName,
  selected,
  onToggleSelect,
  onOpen,
}: PublishedChapterRowProps) {
  const gap = translationGap(chapter);
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
        gap ? "bg-red-500/[0.05] hover:bg-red-500/[0.08]" : "hover:bg-emerald-500/[0.04]"
      }`}
      onClick={onOpen}
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 flex-shrink-0 rounded border-muted-foreground/40 accent-orange-500 cursor-pointer"
        checked={selected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
      />
      <span className="text-sm font-medium text-emerald-200">{chapterLabel(chapter.name)}-bob</span>
      <span className="text-xs text-muted-foreground">{chapter.image_count} rasm</span>
      <CloudUpload className="h-3 w-3 text-sky-400" />
      {gap && (
        <span
          className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-300"
          title={`Tarjima yarim: ${gap.total - gap.missing}/${gap.total}, ${gap.missing} ta uz_text yo'q`}
        >
          <AlertTriangle className="h-3 w-3" />
          {gap.missing}
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Link to={`/results/${projectName}/${chapter.name}`} onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
            <Eye className="h-3 w-3" />
          </Button>
        </Link>
        <Link to={`/edit/${projectName}/${chapter.name}`} onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
            <Pencil className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

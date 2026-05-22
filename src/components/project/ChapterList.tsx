import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Eye, Pencil, Loader2, Trash2, Scissors, ArrowUpDown, CheckCircle2, Circle, Upload, Cloud, CloudUpload, CloudOff, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../lib/api";
import type { Chapter, Project, ProjectSettings } from "../../lib/types";
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

function isRemoteR2Chapter(chapter: Chapter) {
  return chapter.remote || chapter.source === "r2";
}

interface ChapterListProps {
  chapters: Chapter[];
  projectName: string;
  settings: ProjectSettings;
  forceOcr: boolean;
  forceClean: boolean;
  publishedChapters: string[];
  publishingTarget: "manga" | string | null;
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
  onProjectUpdate,
  onPublishChapter,
  onSetThumbnail,
}: ChapterListProps) {
  const navigate = useNavigate();
  const [startingChapter, setStartingChapter] = useState<string | null>(null);
  const [selectedPublished, setSelectedPublished] = useState<Set<string>>(new Set());
  const [unpublishing, setUnpublishing] = useState(false);

  async function handleStartJob(chapter: Chapter) {
    setStartingChapter(chapter.name);
    try {
      await api.startJob({
        manga: projectName,
        chapter: chapter.name,
        language: settings.language,
        backend: settings.backend,
        ocr_backend: settings.ocr_backend,
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

  function toggleSelectAll() {
    const unpublishablePublished = chapters
      .filter((chapter) => publishedChapters.includes(chapter.name) && !isRemoteR2Chapter(chapter))
      .map((chapter) => chapter.name);

    if (selectedPublished.size === unpublishablePublished.length) {
      setSelectedPublished(new Set());
    } else {
      setSelectedPublished(new Set(unpublishablePublished));
    }
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

  const remoteChapters = chapters.filter(isRemoteR2Chapter);
  const localChapters = chapters.filter((chapter) => !isRemoteR2Chapter(chapter));
  const unpublishablePublished = localChapters
    .filter((chapter) => publishedChapters.includes(chapter.name))
    .map((chapter) => chapter.name);
  const hasPublished = unpublishablePublished.length > 0;

  return (
    <div className="min-w-0 xl:flex-1">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-3">
            {hasPublished && (
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-muted-foreground/40 accent-orange-500 cursor-pointer"
                checked={selectedPublished.size === unpublishablePublished.length && unpublishablePublished.length > 0}
                onChange={toggleSelectAll}
                title="Barchasini tanlash"
              />
            )}
            <span className="text-sm font-medium">Chapterlar</span>
            <span className="text-xs text-muted-foreground">
              {chapters.length} ta
              {remoteChapters.length > 0 ? `, ${remoteChapters.length} R2` : ""}
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
          ) : null}
        </div>

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
                      {chapter.name}
                      <span className="text-sky-100/60">
                        {chapter.published_page_count || chapter.image_count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {localChapters.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Lokal OCR/tarjima chapterlari yo'q.
              </div>
            ) : (
              <div className="divide-y">
                {localChapters.map((chapter) => {
              const isClickable = chapter.status === "done" || chapter.status === "ocr_done";
              const isPublished = publishedChapters.includes(chapter.name);
              return (
                <div
                  key={chapter.name}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${
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
                          // Optimistic update
                          const updatedChapters = chapters.map((ch) =>
                            ch.name === chapter.name ? { ...ch, is_validated: newVal } : ch
                          );
                          onProjectUpdate({
                            ...({ slug: projectName, display_name: projectName, chapters: updatedChapters, chapter_count: updatedChapters.length } as Project),
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
                      <div className="text-sm font-medium">{chapter.name}-bob</div>
                      <div className="text-xs text-muted-foreground">{chapter.image_count} rasm</div>
                    </div>
                    <Badge variant={statusVariant[chapter.status] || "info"}>
                      {statusLabel[chapter.status] || chapter.status}
                    </Badge>
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

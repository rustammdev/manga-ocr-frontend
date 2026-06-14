import { useCallback, useEffect, useMemo, useState } from "react";
import { X, BookDown, Loader2, RefreshCw, Download, Sparkles, AlertCircle, ChevronDown, ChevronRight, Unlink } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../lib/api";
import type {
  MangaLibChapterEntry,
  MangaLibChaptersResponse,
  MangaLibDownloadRequest,
} from "../../lib/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

interface MangaLibChaptersModalProps {
  open: boolean;
  manga: string;
  /** Lokal loyiha boblari — "push qilinmagan" holatni aniqlash uchun. */
  publishedChapters: string[];
  onClose: () => void;
  onDownloadStarted: (jobIds: string[]) => void;
  /** MangaLib linkini uzish. */
  onDetach: () => void;
}

/** Bob raqamini lokal nom uslubida ko'rsatish: 5 → "5", 5.5 → "5.5". */
function formatChapter(n: number): string {
  return String(n);
}

/** Lokal bob nomidan ("005", "010_1") raqamli qiymat. Kasr ajratuvchi '_'. */
function chapterNameToNumber(name: string): number {
  return parseFloat(name.replace("_", "."));
}

type RowStatus = "published" | "uploaded" | "new" | "none";

export default function MangaLibChaptersModal({
  open,
  manga,
  publishedChapters,
  onClose,
  onDownloadStarted,
  onDetach,
}: MangaLibChaptersModalProps) {
  const [data, setData] = useState<MangaLibChaptersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tanlash uzluksiz `seq` bo'yicha — MangaLib har tomda bob raqamini
  // takrorlaydi, shuning uchun `number` yagona kalit emas.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [fromChapter, setFromChapter] = useState("");
  const [toChapter, setToChapter] = useState("");
  // Eski (yuklab olingan) boblar scrollni kamaytirish uchun standart yashirin.
  const [showImported, setShowImported] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMangaLibChapters(manga);
      setData(res);
      setSelected(new Set());
    } catch (e) {
      setError((e as Error).message || "Bob ro'yxati yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [manga]);

  useEffect(() => {
    if (open) {
      setFromChapter("");
      setToChapter("");
      setShowImported(false);
      load();
    }
  }, [open, load]);

  const results = data?.results ?? [];

  // Push (publish) qilingan bob raqamlari (lokal nom = seq) — "yuklangan,
  // lekin push qilinmagan" holatini ajratish uchun.
  const publishedSeqs = useMemo(() => {
    const set = new Set<number>();
    for (const name of publishedChapters) {
      const n = chapterNameToNumber(name);
      if (!Number.isNaN(n)) set.add(n);
    }
    return set;
  }, [publishedChapters]);

  const rowStatus = useCallback(
    (ch: MangaLibChapterEntry): RowStatus => {
      if (ch.imported) {
        return publishedSeqs.has(ch.seq) ? "published" : "uploaded";
      }
      return ch.is_new ? "new" : "none";
    },
    [publishedSeqs],
  );

  const newChapters = useMemo(
    () => results.filter((c) => c.is_new && !c.imported),
    [results],
  );
  const downloadableCount = useMemo(
    () => results.filter((c) => !c.imported).length,
    [results],
  );
  const uploadedNotPublishedCount = useMemo(
    () => results.filter((c) => c.imported && !publishedSeqs.has(c.seq)).length,
    [results, publishedSeqs],
  );

  // Faqat allaqachon push qilingan boblar yashiriladi. Yangi va yuklab olingan
  // (lekin hali push qilinmagan) boblar doim ko'rinadi.
  const availableChapters = useMemo(
    () => results.filter((c) => !(c.imported && publishedSeqs.has(c.seq))),
    [results, publishedSeqs],
  );
  const importedChapters = useMemo(
    () => results.filter((c) => c.imported && publishedSeqs.has(c.seq)),
    [results, publishedSeqs],
  );

  if (!open) return null;

  function toggle(seq: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seq)) next.delete(seq);
      else next.add(seq);
      return next;
    });
  }

  function selectNew() {
    setSelected(new Set(newChapters.map((c) => c.seq)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await api.syncMangaLib(manga);
      toast.success(`Yangilandi: ${res.chapter_count} bob`);
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Yangilab bo'lmadi");
    } finally {
      setSyncing(false);
    }
  }

  function buildPayload(): MangaLibDownloadRequest | null {
    // Aniq tanlangan boblar ustun (seq bo'yicha).
    if (selected.size > 0) {
      return { chapter_seqs: [...selected].sort((a, b) => a - b) };
    }
    // Diapazon (seq bo'yicha).
    const from = fromChapter.trim() ? Number(fromChapter) : null;
    const to = toChapter.trim() ? Number(toChapter) : null;
    if (from != null || to != null) {
      if (from != null && Number.isNaN(from)) return null;
      if (to != null && Number.isNaN(to)) return null;
      return { from_seq: from, to_seq: to };
    }
    return null;
  }

  async function handleDownload(payload?: MangaLibDownloadRequest) {
    const body = payload ?? buildPayload();
    if (!body) {
      toast.error("Bob tanlang yoki diapazon kiriting");
      return;
    }
    setDownloading(true);
    setError(null);
    try {
      const res = await api.downloadMangaLib(manga, body);
      toast.success(`Yuklash boshlandi: ${res.total} bob`);
      onDownloadStarted(res.job_ids);
    } catch (e) {
      const msg = (e as Error).message || "Yuklab bo'lmadi";
      setError(msg);
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  }

  const hasSelection = selected.size > 0;
  const hasRange = fromChapter.trim() !== "" || toChapter.trim() !== "";
  const canDownload = !downloading && (hasSelection || hasRange);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <BookDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">MangaLib boblari</span>
            {data && (
              <Badge variant="secondary">{data.total} bob</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onDetach}
              className="gap-1.5"
              title="MangaLib linkini uzish"
            >
              <Unlink className="h-3.5 w-3.5" />
              Linkni uzish
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={selectNew}
            disabled={loading || newChapters.length === 0}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Yangi boblarni tanlash ({newChapters.length})
          </Button>
          {hasSelection && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Tanlovni tozalash ({selected.size})
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Diapazon:</span>
            <Input
              value={fromChapter}
              onChange={(e) => setFromChapter(e.target.value)}
              placeholder="dan"
              inputMode="decimal"
              className="h-8 w-16"
              disabled={hasSelection}
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              value={toChapter}
              onChange={(e) => setToChapter(e.target.value)}
              placeholder="gacha"
              inputMode="decimal"
              className="h-8 w-16"
              disabled={hasSelection}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loading}
            className="gap-1.5"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Yangilash
          </Button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Yuklanmoqda...
            </div>
          ) : error && results.length === 0 ? (
            <div className="m-5 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{error}</div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Bob topilmadi. "Yangilash" tugmasini bosing.
            </div>
          ) : (
            <div>
              {availableChapters.length > 0 ? (
                <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                  {availableChapters.map((ch) => (
                    <ChapterRow
                      key={`${ch.volume}-${ch.number}-${ch.chapter_id}`}
                      chapter={ch}
                      status={rowStatus(ch)}
                      checked={selected.has(ch.seq)}
                      onToggle={() => toggle(ch.seq)}
                      disabled={hasRange}
                    />
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Hamma boblar yuklab olingan 🎉
                </div>
              )}

              {importedChapters.length > 0 && (
                <div className="border-t bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setShowImported((v) => !v)}
                    className="flex w-full items-center gap-2 px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showImported ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    Push qilingan boblar ({importedChapters.length})
                    <span className="font-normal text-muted-foreground/60">
                      {showImported ? "yashirish" : "ko'rsatish"}
                    </span>
                  </button>
                  {showImported && (
                    <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                      {importedChapters.map((ch) => (
                        <ChapterRow
                          key={`${ch.volume}-${ch.number}-${ch.chapter_id}`}
                          chapter={ch}
                          status={rowStatus(ch)}
                          checked={selected.has(ch.seq)}
                          onToggle={() => toggle(ch.seq)}
                          disabled={hasRange}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {data?.max_local_chapter != null
              ? `Oxirgi lokal bob: ${formatChapter(data.max_local_chapter)}`
              : "Lokal bob yo'q"}
            {" · "}
            {downloadableCount} yuklab olinmagan
            {uploadedNotPublishedCount > 0
              ? ` · ${uploadedNotPublishedCount} push qilinmagan`
              : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload({ only_new: true })}
              disabled={downloading || newChapters.length === 0}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Faqat yangilar
            </Button>
            <Button
              size="sm"
              onClick={() => handleDownload()}
              disabled={!canDownload}
              className="gap-1.5"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Yuklash
              {hasSelection ? ` (${selected.size})` : ""}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChapterRowProps {
  chapter: MangaLibChapterEntry;
  status: RowStatus;
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}

function ChapterRow({ chapter, status, checked, onToggle, disabled }: ChapterRowProps) {
  // Imported boblar ham QAYTA tanlanishi mumkin — yuklash yarim qolsa yoki
  // xato bo'lsa qayta yuklab olish kerak. Checkbox faqat diapazon rejimida
  // (`disabled`) o'chiriladi, "imported" bo'lgani uchun emas.
  const isDisabled = disabled;
  return (
    <li
      className={`flex items-center gap-3 border-b px-5 py-2 text-sm ${
        chapter.imported ? "opacity-70" : ""
      }`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 rounded border-input"
        checked={checked}
        disabled={isDisabled}
        onChange={onToggle}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">Bob {formatChapter(chapter.seq)}</span>
          <span className="text-xs text-muted-foreground">
            {chapter.volume ? `Том ${chapter.volume} · ` : ""}
            asl #{formatChapter(chapter.number)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <StatusBadge status={status} />
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  if (status === "published") {
    return (
      <Badge variant="success" className="text-[10px]">
        ✓ Push qilingan
      </Badge>
    );
  }
  if (status === "uploaded") {
    return (
      <Badge variant="warning" className="text-[10px]">
        ⬆️ Push qilinmagan
      </Badge>
    );
  }
  if (status === "new") {
    return (
      <Badge variant="info" className="text-[10px]">
        🆕 Yangi
      </Badge>
    );
  }
  return null;
}

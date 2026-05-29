import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ExternalLink, Eye, Save, Trash2 } from "lucide-react";

import { api } from "../lib/api";
import type { ResultsData } from "../lib/types";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

type Draft = { original: string; translation: string; status?: string };

function buildDrafts(res: ResultsData) {
  const nextDrafts: Record<string, Draft> = {};
  res.pages.forEach((page, pageIdx) => {
    page.regions.forEach((region, regionIdx) => {
      nextDrafts[`${pageIdx}-${regionIdx}`] = {
        original: region.original_text || "",
        translation: region.uz_text || "",
      };
    });
  });
  return nextDrafts;
}

function isUntranslated(translation: string): boolean {
  return !translation || !translation.trim();
}

export default function EditorPage() {
  const { manga, chapter } = useParams();
  const [data, setData] = useState<ResultsData | null>(null);
  const [status, setStatus] = useState("Yuklanmoqda...");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [onlyUntranslated, setOnlyUntranslated] = useState(false);
  // Filter yoqilganda "tarjimasiz" deb belgilangan regionlar ro'yxatini muzlatamiz —
  // foydalanuvchi paste/yozayotganda yoki saqlaganda region ekrandan yo'qolib ketmasligi uchun.
  // Bu set faqat filter qayta yoqilganda yoki ma'lumot qayta yuklanganda yangilanadi.
  const [frozenMissingKeys, setFrozenMissingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!manga || !chapter) return;
    api
      .getResults(manga, chapter)
      .then((res) => {
        setData(res);
        setStatus("");
        setDrafts(buildDrafts(res));
      })
      .catch((err) => setStatus(`Xatolik: ${err.message}`));
  }, [manga, chapter]);

  // Live counter — drafts asosida hisoblanadi, saqlamasdan ham raqam darhol kamayadi.
  const { totalRegions, missingCount } = useMemo(() => {
    if (!data) return { totalRegions: 0, missingCount: 0 };
    let total = 0;
    let missing = 0;
    data.pages.forEach((page, pageIdx) => {
      page.regions.forEach((region, regionIdx) => {
        const key = `${pageIdx}-${regionIdx}`;
        const draft = drafts[key];
        const translation = draft ? draft.translation : region.uz_text || "";
        const original = draft ? draft.original : region.original_text || "";
        if (!original.trim()) return;
        total += 1;
        if (isUntranslated(translation)) missing += 1;
      });
    });
    return { totalRegions: total, missingCount: missing };
  }, [data, drafts]);

  function toggleOnlyUntranslated() {
    setOnlyUntranslated((prev) => {
      const next = !prev;
      if (next && data) {
        // Filter yoqilayotgan vaqtida tarjimasiz regionlar ro'yxatini muzlatamiz.
        const keys = new Set<string>();
        data.pages.forEach((page, pageIdx) => {
          page.regions.forEach((region, regionIdx) => {
            const key = `${pageIdx}-${regionIdx}`;
            const draft = drafts[key];
            const translation = draft ? draft.translation : region.uz_text || "";
            const original = draft ? draft.original : region.original_text || "";
            if (original.trim() && isUntranslated(translation)) keys.add(key);
          });
        });
        setFrozenMissingKeys(keys);
      }
      return next;
    });
  }

  if (!data) {
    return <div className="p-8 text-sm text-muted-foreground">{status}</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={`/results/${manga}/${chapter}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {manga} / {chapter}-bob
          </Link>
          <h1 className="page-title">OCR va tarjima tahrirlash</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={onlyUntranslated ? "default" : "outline"}
            size="sm"
            className={`gap-1.5 ${
              onlyUntranslated
                ? "bg-red-500/90 text-white hover:bg-red-500"
                : missingCount > 0
                  ? "border-red-500/40 text-red-300 hover:bg-red-500/10"
                  : ""
            }`}
            onClick={toggleOnlyUntranslated}
            disabled={missingCount === 0 && !onlyUntranslated}
            title={
              missingCount > 0
                ? `${missingCount} ta region tarjimasiz`
                : "Hammasi tarjima qilingan"
            }
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {onlyUntranslated ? "Filterni olib tashlash" : "Faqat tarjimasizlar"}
            <span
              className={`ml-1 rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                onlyUntranslated
                  ? "bg-white/20"
                  : missingCount > 0
                    ? "bg-red-500/20"
                    : "bg-muted"
              }`}
            >
              {missingCount}/{totalRegions}
            </span>
          </Button>
          <Link to={`/results/${manga}/${chapter}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Natijalar
            </Button>
          </Link>
        </div>
      </div>

      {onlyUntranslated && missingCount === 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          Hamma regionlar tarjima qilingan. Filterni olib tashlashingiz mumkin.
        </div>
      )}

      {/* Pages */}
      <div className="space-y-4">
        {data.pages.map((page, pageIdx) => {
          // Filter rejimida — faqat boshlang'ichda muzlatilgan "tarjimasiz" regionlarni ko'rsatamiz.
          // Foydalanuvchi yozayotgan/paste qilayotgan paytda region yo'qolib ketmaydi.
          const visibleRegions = page.regions
            .map((region, regionIdx) => ({ region, regionIdx }))
            .filter(({ regionIdx }) => {
              if (!onlyUntranslated) return true;
              return frozenMissingKeys.has(`${pageIdx}-${regionIdx}`);
            });

          if (onlyUntranslated && visibleRegions.length === 0) return null;

          return (
            <div key={`page-${pageIdx}`} className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <div>
                  <span className="text-sm font-medium">Sahifa {pageIdx + 1}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {onlyUntranslated
                      ? `${visibleRegions.length} ta tarjimasiz region (jami ${page.regions.length})`
                      : `${page.regions.length} region`}
                  </span>
                </div>
                <Link
                  to={`/results/${manga}/${chapter}?page=${pageIdx + 1}`}
                  title="Bu sahifani natijalar sahifasida ochish"
                >
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    Rasmni ko'rish
                  </Button>
                </Link>
              </div>
              {visibleRegions.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Bu sahifada matn regionlari topilmadi.
                </div>
              ) : (
                <div className="divide-y">
                  {visibleRegions.map(({ region, regionIdx }) => {
                    const key = `${pageIdx}-${regionIdx}`;
                    const draft = drafts[key] || { original: "", translation: "" };
                    const missing =
                      Boolean(draft.original.trim()) && isUntranslated(draft.translation);
                    return (
                      <div
                        key={key}
                        className={`px-5 py-4 ${missing ? "border-l-2 border-red-500/60 bg-red-500/[0.03]" : ""}`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            Region {regionIdx + 1}
                            <span className="mono">
                              [{region.bbox.x}, {region.bbox.y}, {region.bbox.w}, {region.bbox.h}]
                            </span>
                            {missing && (
                              <span className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
                                <AlertTriangle className="h-3 w-3" />
                                Tarjimasiz
                              </span>
                            )}
                            {!missing && onlyUntranslated && frozenMissingKeys.has(key) && (
                              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                                Tarjima yozildi
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1">
                            <Link
                              to={`/results/${manga}/${chapter}?page=${pageIdx + 1}`}
                              title="Asosiy sahifada bu rasmni ko'rish"
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Rasmga o'tish
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={async () => {
                                if (!manga || !chapter) return;
                                if (!confirm("Bu regionni o'chirmoqchimisiz?")) return;
                                await api.deleteRegion(manga, chapter, pageIdx, regionIdx);
                                const updated = await api.getResults(manga, chapter);
                                setData(updated);
                                setDrafts(buildDrafts(updated));
                              }}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              O'chirish
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                              OCR matn (original)
                            </label>
                            <Textarea
                              value={draft.original}
                              className="min-h-[80px] text-sm"
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [key]: { ...draft, original: e.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                              Tarjima (uz)
                            </label>
                            <Textarea
                              value={draft.translation}
                              className={`min-h-[80px] text-sm ${
                                missing ? "border-red-500/40 focus-visible:ring-red-500/40" : ""
                              }`}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [key]: { ...draft, translation: e.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={async () => {
                              if (!manga || !chapter) return;
                              setDrafts((prev) => ({
                                ...prev,
                                [key]: { ...draft, status: "Saqlanmoqda..." },
                              }));
                              try {
                                await api.updateRegion(manga, chapter, pageIdx, regionIdx, {
                                  original_text: draft.original,
                                  uz_text: draft.translation,
                                });
                                setDrafts((prev) => ({
                                  ...prev,
                                  [key]: { ...draft, status: "Saqlandi!" },
                                }));
                              } catch (e) {
                                const err = e as Error;
                                setDrafts((prev) => ({
                                  ...prev,
                                  [key]: { ...draft, status: `Xatolik: ${err.message}` },
                                }));
                              }
                            }}
                          >
                            <Save className="h-3.5 w-3.5" />
                            Saqlash
                          </Button>
                          {draft.status && (
                            <span className="text-xs text-muted-foreground">{draft.status}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

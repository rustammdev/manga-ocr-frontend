import { memo, useState, useCallback } from "react";
import { X, Save, Minus, Plus, RotateCcw, RotateCw, Languages, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../lib/api";
import type { Region, ResultsData } from "../../lib/types";
import { getFontsByCategory, getFontEntry } from "../../lib/fonts";

export type RegionDraft = {
  original: string;
  translation: string;
  fontSize?: number;
  rotation?: number;
  fontWeight?: string;
  fontStyle?: string;
  fontColor?: string;
  fontFamily?: string;
  fontStrokeColor?: string;
  fontStrokeWidth?: number;
  status?: string;
};

interface RegionPanelProps {
  regions: Region[];
  currentPage: number;
  regionDrafts: Record<string, RegionDraft>;
  setRegionDrafts: React.Dispatch<React.SetStateAction<Record<string, RegionDraft>>>;
  confirmingDelete: string | null;
  setConfirmingDelete: (v: string | null) => void;
  manga: string;
  chapter: string;
  onDataUpdate: React.Dispatch<React.SetStateAction<ResultsData | null>>;
  compact?: boolean;
}

interface RegionItemProps {
  region: Region;
  index: number;
  currentPage: number;
  draft: RegionDraft;
  confirmingDelete: boolean;
  compact?: boolean;
  reocrLoading: boolean;
  retranslateLoading: boolean;
  manga: string;
  chapter: string;
  setRegionDrafts: React.Dispatch<React.SetStateAction<Record<string, RegionDraft>>>;
  setConfirmingDelete: (v: string | null) => void;
  onDataUpdate: React.Dispatch<React.SetStateAction<ResultsData | null>>;
  onReocrRegion: (idx: number) => void;
  onRetranslateRegion: (idx: number) => void;
}

const fontsByCategory = getFontsByCategory();

const RegionItem = memo(function RegionItem({
  region: r,
  index: i,
  currentPage,
  draft,
  confirmingDelete,
  compact,
  reocrLoading,
  retranslateLoading,
  manga,
  chapter,
  setRegionDrafts,
  setConfirmingDelete,
  onDataUpdate,
  onReocrRegion,
  onRetranslateRegion,
}: RegionItemProps) {
  const key = `${currentPage}-${i}`;
  const serverFontSize = r.font_size || 0;
  const draftFontSize = draft.fontSize ?? serverFontSize;
  const serverRotation = r.rotation || 0;
  const draftRotation = draft.rotation ?? serverRotation;
  const serverFontWeight = r.font_weight || "bold";
  const draftFontWeight = draft.fontWeight ?? serverFontWeight;
  const serverFontStyle = r.font_style || "normal";
  const draftFontStyle = draft.fontStyle ?? serverFontStyle;
  const serverFontColor = r.font_color || "#111827";
  const draftFontColor = draft.fontColor ?? serverFontColor;
  const serverFontFamily = r.font_family || "Comic Neue";
  const draftFontFamily = draft.fontFamily ?? serverFontFamily;
  const serverStrokeColor = r.font_stroke_color || "";
  const draftStrokeColor = draft.fontStrokeColor ?? serverStrokeColor;
  const serverStrokeWidth = r.font_stroke_width || 0;
  const draftStrokeWidth = draft.fontStrokeWidth ?? serverStrokeWidth;
  const fontInfo = getFontEntry(draftFontFamily);
  const isDirty =
    draft.original !== (r.original_text || "") ||
    draft.translation !== (r.uz_text || "") ||
    draftFontSize !== serverFontSize ||
    draftRotation !== serverRotation ||
    draftFontWeight !== serverFontWeight ||
    draftFontStyle !== serverFontStyle ||
    draftFontColor !== serverFontColor ||
    draftFontFamily !== serverFontFamily ||
    draftStrokeColor !== serverStrokeColor ||
    draftStrokeWidth !== serverStrokeWidth;

  return (
    <div className="group rounded-lg border bg-card">
      {/* Header: number + delete */}
      <div className="flex items-center justify-between px-2.5 pt-2">
        <span className="text-[11px] font-medium text-muted-foreground">{i + 1}</span>
        {confirmingDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">O'chirish?</span>
            <button
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/15"
              onClick={async () => {
                setConfirmingDelete(null);
                const delRes = await api.deleteRegion(manga, chapter, currentPage, i) as { image_url?: string };
                const updated = await api.getResults(manga, chapter);
                // Backend qaytargan image_url bilan clean rasmni yangilash
                if (delRes.image_url && updated.pages[currentPage]) {
                  updated.pages[currentPage].cleaned_image_url = delRes.image_url;
                }
                setRegionDrafts((prev) => {
                  const next: Record<string, RegionDraft> = {};
                  const page = updated.pages[currentPage];
                  if (page) {
                    page.regions.forEach((reg: Region, idx: number) => {
                      next[`${currentPage}-${idx}`] = {
                        original: reg.original_text || "",
                        translation: reg.uz_text || "",
                        fontSize: reg.font_size || 0,
                        rotation: reg.rotation || 0,
                        fontWeight: reg.font_weight || "bold",
                        fontStyle: reg.font_style || "normal",
                        fontColor: reg.font_color || "#111827",
                        fontFamily: reg.font_family || "Comic Neue",
                        fontStrokeColor: reg.font_stroke_color || "",
                        fontStrokeWidth: reg.font_stroke_width || 0,
                      };
                    });
                  }
                  for (const [k, v] of Object.entries(prev)) {
                    if (!k.startsWith(`${currentPage}-`)) {
                      next[k] = v;
                    }
                  }
                  return next;
                });
                onDataUpdate(() => updated);
              }}
            >
              Ha
            </button>
            <button
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent"
              onClick={() => setConfirmingDelete(null)}
            >
              Yo'q
            </button>
          </div>
        ) : (
          <div className={`flex items-center gap-0.5 transition-opacity ${reocrLoading || retranslateLoading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            <button
              className="text-muted-foreground hover:text-blue-400 transition-colors disabled:opacity-50"
              title="Qayta OCR"
              disabled={reocrLoading}
              onClick={() => onReocrRegion(i)}
            >
              {reocrLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
            </button>
            <button
              className="text-muted-foreground hover:text-amber-400 transition-colors disabled:opacity-50"
              title="Qayta tarjima"
              disabled={retranslateLoading}
              onClick={() => onRetranslateRegion(i)}
            >
              {retranslateLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
            </button>
            <button
              className="text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => setConfirmingDelete(key)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {/* Textareas */}
      <div className="space-y-1 px-2.5 pb-2.5 pt-1">
        {!compact && (
          <textarea
            placeholder="Original"
            className="min-h-[28px] w-full resize-none rounded-md border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={draft.original}
            onChange={(e) =>
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, original: e.target.value, status: undefined },
              }))
            }
          />
        )}
        <textarea
          placeholder="Tarjima"
          className="min-h-[28px] w-full resize-none rounded-md border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={draft.translation}
          onChange={(e) =>
            setRegionDrafts((prev) => ({
              ...prev,
              [key]: { ...draft, translation: e.target.value, status: undefined },
            }))
          }
        />
        {/* Font size + Rotation — bitta qatorda */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground w-4">Aa</span>
          <button
            className="flex h-5 w-5 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:text-foreground"
            onClick={() =>
              setRegionDrafts((prev) => {
                const cur = prev[key]?.fontSize ?? draftFontSize;
                const base = cur || Math.floor(Math.min(36, Math.max(8, r.bbox.h * 0.45)));
                return { ...prev, [key]: { ...draft, fontSize: Math.max(6, base - 1), status: undefined } };
              })
            }
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <span className="min-w-[24px] text-center text-[10px] tabular-nums">
            {draftFontSize || "auto"}
          </span>
          <button
            className="flex h-5 w-5 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:text-foreground"
            onClick={() =>
              setRegionDrafts((prev) => {
                const cur = prev[key]?.fontSize ?? draftFontSize;
                const base = cur || Math.floor(Math.min(36, Math.max(8, r.bbox.h * 0.45)));
                return { ...prev, [key]: { ...draft, fontSize: Math.min(120, base + 1), status: undefined } };
              })
            }
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
          {draftFontSize > 0 && (
            <button
              className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              title="Auto"
              onClick={() =>
                setRegionDrafts((prev) => ({
                  ...prev,
                  [key]: { ...draft, fontSize: 0, status: undefined },
                }))
              }
            >
              <RotateCcw className="h-2 w-2" />
            </button>
          )}

          <div className="mx-0.5 h-3 w-px bg-border" />

          <RotateCw className="h-2.5 w-2.5 text-muted-foreground" />
          <button
            className="flex h-5 w-5 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:text-foreground"
            onClick={() =>
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, rotation: draftRotation - 15, status: undefined },
              }))
            }
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <span className="min-w-[22px] text-center text-[10px] tabular-nums">
            {draftRotation}°
          </span>
          <button
            className="flex h-5 w-5 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:text-foreground"
            onClick={() =>
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, rotation: draftRotation + 15, status: undefined },
              }))
            }
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
          {draftRotation !== 0 && (
            <button
              className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              title="0°"
              onClick={() =>
                setRegionDrafts((prev) => ({
                  ...prev,
                  [key]: { ...draft, rotation: 0, status: undefined },
                }))
              }
            >
              <RotateCcw className="h-2 w-2" />
            </button>
          )}
        </div>
        {/* Font formatting controls */}
        <div className="flex items-center gap-1.5">
          <button
            className={`h-5 rounded border px-1.5 text-[10px] font-bold transition-colors ${draftFontWeight === "bold" ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}
            title={draftFontWeight === "bold" ? "Oddiy qilish" : "Qalin qilish"}
            onClick={() =>
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, fontWeight: draftFontWeight === "bold" ? "normal" : "bold", status: undefined },
              }))
            }
          >
            B
          </button>
          <button
            className={`h-5 rounded border px-1.5 text-[10px] transition-colors ${draftFontStyle === "italic" ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"} ${fontInfo && !fontInfo.hasItalic ? "opacity-40 cursor-not-allowed" : ""}`}
            title={fontInfo && !fontInfo.hasItalic ? "Bu font italic qo'llab-quvvatlamaydi" : draftFontStyle === "italic" ? "Oddiy qilish" : "Kursiv qilish"}
            style={{ fontStyle: "italic" }}
            onClick={() => {
              if (fontInfo && !fontInfo.hasItalic) return;
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, fontStyle: draftFontStyle === "italic" ? "normal" : "italic", status: undefined },
              }));
            }}
          >
            I
          </button>
          <input
            type="color"
            title="Matn rangi"
            className="h-5 w-5 cursor-pointer rounded border bg-background p-0"
            value={draftFontColor}
            onChange={(e) =>
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, fontColor: e.target.value, status: undefined },
              }))
            }
          />
          <select
            className="h-5 max-w-[120px] flex-1 rounded border bg-background px-1 text-[10px] text-foreground"
            value={draftFontFamily}
            onChange={(e) =>
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, fontFamily: e.target.value, status: undefined },
              }))
            }
          >
            {Object.entries(fontsByCategory).map(([category, fonts]) => (
              <optgroup key={category} label={category}>
                {fonts.map((f) => (
                  <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
                    {f.family}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {/* Stroke (hoshiya) controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground w-6">Chekka</span>
          <input
            type="color"
            title="Chekka rangi"
            className="h-5 w-5 cursor-pointer rounded border bg-background p-0"
            value={draftStrokeColor || "#000000"}
            onChange={(e) =>
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, fontStrokeColor: e.target.value, fontStrokeWidth: draftStrokeWidth || 2, status: undefined },
              }))
            }
          />
          <button
            className="flex h-5 w-5 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:text-foreground"
            onClick={() =>
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, fontStrokeWidth: Math.max(0, draftStrokeWidth - 1), status: undefined },
              }))
            }
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <span className="min-w-[16px] text-center text-[10px] tabular-nums">
            {draftStrokeWidth}
          </span>
          <button
            className="flex h-5 w-5 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:text-foreground"
            onClick={() =>
              setRegionDrafts((prev) => ({
                ...prev,
                [key]: { ...draft, fontStrokeWidth: Math.min(20, draftStrokeWidth + 1), fontStrokeColor: draftStrokeColor || "#000000", status: undefined },
              }))
            }
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
          {draftStrokeWidth > 0 && (
            <button
              className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              title="Chekkani o'chirish"
              onClick={() =>
                setRegionDrafts((prev) => ({
                  ...prev,
                  [key]: { ...draft, fontStrokeColor: "", fontStrokeWidth: 0, status: undefined },
                }))
              }
            >
              <RotateCcw className="h-2 w-2" />
            </button>
          )}
        </div>
        {/* Save — only visible when dirty */}
        {(isDirty || draft.status) && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {isDirty && (
              <button
                className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/25"
                onClick={async () => {
                  setRegionDrafts((prev) => ({
                    ...prev,
                    [key]: { ...draft, status: "..." },
                  }));
                  try {
                    const payload: Record<string, unknown> = {
                      original_text: draft.original,
                      uz_text: draft.translation,
                    };
                    if (draftFontSize !== serverFontSize) {
                      payload.font_size = draftFontSize || 0;
                    }
                    if (draftRotation !== serverRotation) {
                      payload.rotation = draftRotation;
                    }
                    if (draftFontWeight !== serverFontWeight) {
                      payload.font_weight = draftFontWeight;
                    }
                    if (draftFontStyle !== serverFontStyle) {
                      payload.font_style = draftFontStyle;
                    }
                    if (draftFontColor !== serverFontColor) {
                      payload.font_color = draftFontColor;
                    }
                    if (draftFontFamily !== serverFontFamily) {
                      payload.font_family = draftFontFamily;
                    }
                    if (draftStrokeColor !== serverStrokeColor) {
                      payload.font_stroke_color = draftStrokeColor;
                    }
                    if (draftStrokeWidth !== serverStrokeWidth) {
                      payload.font_stroke_width = draftStrokeWidth;
                    }
                    await api.updateRegion(manga, chapter, currentPage, i, payload);
                    onDataUpdate((prev) => {
                      if (!prev) return prev;
                      const newPages = [...prev.pages];
                      const page = { ...newPages[currentPage] };
                      const newRegions = [...page.regions];
                      newRegions[i] = {
                        ...newRegions[i],
                        original_text: draft.original,
                        uz_text: draft.translation,
                        ...(draftFontSize !== serverFontSize && { font_size: draftFontSize }),
                        ...(draftRotation !== serverRotation && { rotation: draftRotation }),
                        ...(draftFontWeight !== serverFontWeight && { font_weight: draftFontWeight }),
                        ...(draftFontStyle !== serverFontStyle && { font_style: draftFontStyle }),
                        ...(draftFontColor !== serverFontColor && { font_color: draftFontColor }),
                        ...(draftFontFamily !== serverFontFamily && { font_family: draftFontFamily }),
                        ...(draftStrokeColor !== serverStrokeColor && { font_stroke_color: draftStrokeColor }),
                        ...(draftStrokeWidth !== serverStrokeWidth && { font_stroke_width: draftStrokeWidth }),
                      };
                      page.regions = newRegions;
                      newPages[currentPage] = page;
                      return { ...prev, pages: newPages };
                    });
                    setRegionDrafts((prev) => ({
                      ...prev,
                      [key]: { ...draft, status: undefined },
                    }));
                  } catch (e) {
                    const err = e as Error;
                    setRegionDrafts((prev) => ({
                      ...prev,
                      [key]: { ...draft, status: err.message },
                    }));
                  }
                }}
              >
                <Save className="h-2.5 w-2.5" />
                Saqlash
              </button>
            )}
            {draft.status && (
              <span className="text-[10px] text-muted-foreground">{draft.status}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default function RegionPanel({
  regions,
  currentPage,
  regionDrafts,
  setRegionDrafts,
  confirmingDelete,
  setConfirmingDelete,
  manga,
  chapter,
  onDataUpdate,
  compact,
}: RegionPanelProps) {
  const [retranslatingPage, setRetranslatingPage] = useState(false);
  const [retranslatingRegion, setRetranslatingRegion] = useState<number | null>(null);
  const [reocrPage, setReocrPage] = useState(false);
  const [reocrRegionIdx, setReocrRegionIdx] = useState<number | null>(null);

  const handleReocrPage = useCallback(async () => {
    setReocrPage(true);
    try {
      await api.reocrPage(manga, chapter, currentPage);
      const updated = await api.getResults(manga, chapter);
      setRegionDrafts({});
      onDataUpdate(() => updated);
    } catch (e) {
      const err = e as Error;
      toast.error(err.message);
    } finally {
      setReocrPage(false);
    }
  }, [manga, chapter, currentPage, setRegionDrafts, onDataUpdate]);

  const handleReocrRegion = useCallback(async (regionIdx: number) => {
    setReocrRegionIdx(regionIdx);
    try {
      const res = await api.reocrRegion(manga, chapter, currentPage, regionIdx);
      const key = `${currentPage}-${regionIdx}`;
      const newText = res.text || "";
      onDataUpdate((prev) => {
        if (!prev) return prev;
        const newPages = [...prev.pages];
        const page = { ...newPages[currentPage] };
        const newRegions = [...page.regions];
        newRegions[regionIdx] = { ...newRegions[regionIdx], original_text: newText };
        page.regions = newRegions;
        newPages[currentPage] = page;
        return { ...prev, pages: newPages };
      });
      setRegionDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (e) {
      const err = e as Error;
      toast.error(err.message);
    } finally {
      setReocrRegionIdx(null);
    }
  }, [manga, chapter, currentPage, setRegionDrafts, onDataUpdate]);

  const handleRetranslatePage = useCallback(async () => {
    setRetranslatingPage(true);
    try {
      const pageRegions = regions
        .map((r, i) => ({ page_idx: currentPage, region_idx: i, has_text: !!r.original_text?.trim() }))
        .filter((r) => r.has_text);
      if (pageRegions.length === 0) return;
      await api.retranslateRegions(manga, chapter, {
        regions: pageRegions.map(({ page_idx, region_idx }) => ({ page_idx, region_idx })),
      });
      const updated = await api.getResults(manga, chapter);
      setRegionDrafts({});
      onDataUpdate(() => updated);
    } catch (e) {
      const err = e as Error;
      toast.error(err.message);
    } finally {
      setRetranslatingPage(false);
    }
  }, [manga, chapter, currentPage, regions, setRegionDrafts, onDataUpdate]);

  const handleRetranslateRegion = useCallback(async (regionIdx: number) => {
    setRetranslatingRegion(regionIdx);
    try {
      await api.retranslateRegions(manga, chapter, {
        regions: [{ page_idx: currentPage, region_idx: regionIdx }],
      });
      const updated = await api.getResults(manga, chapter);
      const key = `${currentPage}-${regionIdx}`;
      setRegionDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      onDataUpdate(() => updated);
    } catch (e) {
      const err = e as Error;
      toast.error(err.message);
    } finally {
      setRetranslatingRegion(null);
    }
  }, [manga, chapter, currentPage, setRegionDrafts, onDataUpdate]);

  return (
    <div className="flex min-h-0 flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Matnlar ({regions.length})
        </div>
        {regions.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-blue-400 transition-colors hover:bg-blue-500/10 disabled:opacity-50"
              disabled={reocrPage}
              onClick={handleReocrPage}
              title="Sahifadagi barcha regionlarni qayta OCR qilish"
            >
              {reocrPage ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Eye className="h-2.5 w-2.5" />}
              OCR
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-amber-400 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
              disabled={retranslatingPage}
              onClick={handleRetranslatePage}
              title="Sahifadagi barcha matnlarni qayta tarjima qilish"
            >
              {retranslatingPage ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Languages className="h-2.5 w-2.5" />}
              Tarjima
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {regions.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-4 text-center text-xs text-muted-foreground">
            Matn topilmadi
          </div>
        ) : (
          regions.map((r, i) => {
            const key = `${currentPage}-${i}`;
            const draft = regionDrafts[key] || { original: "", translation: "" };
            return (
              <RegionItem
                key={key}
                region={r}
                index={i}
                currentPage={currentPage}
                draft={draft}
                confirmingDelete={confirmingDelete === key}
                compact={compact}
                reocrLoading={reocrRegionIdx === i}
                retranslateLoading={retranslatingRegion === i}
                manga={manga}
                chapter={chapter}
                setRegionDrafts={setRegionDrafts}
                setConfirmingDelete={setConfirmingDelete}
                onDataUpdate={onDataUpdate}
                onReocrRegion={handleReocrRegion}
                onRetranslateRegion={handleRetranslateRegion}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

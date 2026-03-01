import { useState } from "react";
import { X, Check, Loader2, ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../lib/api";
import type { Chapter, PageInfo } from "../../lib/types";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import ImagePositioner from "./ImagePositioner";

interface CoverCropModalProps {
  open: boolean;
  manga: string;
  chapters: Chapter[];
  onClose: () => void;
  onSaved: (coverUrl: string) => void;
}

type Step = "select-chapter" | "select-page" | "position";

export default function CoverCropModal({
  open,
  manga,
  chapters,
  onClose,
  onSaved,
}: CoverCropModalProps) {
  const [tab, setTab] = useState<"page" | "upload">("page");

  const [step, setStep] = useState<Step>("select-chapter");
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPageIdx, setSelectedPageIdx] = useState<number | null>(null);
  const [selectedPageUrl, setSelectedPageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSelectChapter(chapterName: string) {
    setSelectedChapter(chapterName);
    setLoadingPages(true);
    try {
      const res = await api.getChapterPages(manga, chapterName);
      setPages(res.images);
      setStep("select-page");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingPages(false);
    }
  }

  function handleSelectPage(idx: number, page: PageInfo) {
    setSelectedPageIdx(idx);
    setSelectedPageUrl(page.image_url);
    setStep("position");
  }

  async function handleSaveFromPage() {
    if (selectedChapter == null || selectedPageIdx == null) return;
    setSaving(true);
    try {
      const res = await api.setCoverFromPage(manga, selectedChapter, selectedPageIdx, crop);
      onSaved(res.cover_url);
      toast.success("Muqova saqlandi");
      resetAndClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const res = await api.uploadCover(manga, file);
      onSaved(res.cover_url);
      toast.success("Muqova saqlandi");
      resetAndClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function resetAndClose() {
    setStep("select-chapter");
    setSelectedChapter(null);
    setPages([]);
    setSelectedPageIdx(null);
    setSelectedPageUrl(null);
    onClose();
  }

  function goBack() {
    if (step === "position") {
      setStep("select-page");
      setSelectedPageIdx(null);
      setSelectedPageUrl(null);
    } else if (step === "select-page") {
      setStep("select-chapter");
      setSelectedChapter(null);
      setPages([]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={resetAndClose}>
      <div
        className="mx-4 w-full max-w-2xl rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Muqova o'rnatish</span>
          </div>
          <button onClick={resetAndClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "page" | "upload")}>
            <TabsList className="w-full">
              <TabsTrigger value="page" className="flex-1">Sahifadan tanlash</TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">Fayl yuklash</TabsTrigger>
            </TabsList>

            {/* ── Tab: Sahifadan tanlash ── */}
            <TabsContent value="page">
              {step === "select-chapter" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Bobni tanlang:</p>
                  {loadingPages && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
                  <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-auto sm:grid-cols-4">
                    {chapters.map((ch) => (
                      <button
                        key={ch.name}
                        className="rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                        onClick={() => handleSelectChapter(ch.name)}
                      >
                        {ch.name}-bob
                        <span className="block text-[11px] text-muted-foreground">{ch.image_count} rasm</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === "select-page" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <button className="text-xs text-primary hover:underline" onClick={goBack}>
                      Orqaga
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {selectedChapter}-bob — sahifa tanlang:
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-auto sm:grid-cols-5">
                    {pages.map((page, idx) => (
                      <button
                        key={page.filename}
                        className="rounded-md border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => handleSelectPage(idx, page)}
                      >
                        <img
                          src={page.image_url}
                          alt={page.filename}
                          className="w-full h-auto object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === "position" && selectedPageUrl && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-primary hover:underline" onClick={goBack}>
                      Orqaga
                    </button>
                    <span className="text-xs text-muted-foreground">
                      Rasmni surib joylashtiring
                    </span>
                  </div>

                  <div className="flex justify-center">
                    <ImagePositioner
                      src={selectedPageUrl}
                      aspectRatio={3 / 5}
                      previewWidth={240}
                      onCropChange={setCrop}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={saving}
                      onClick={handleSaveFromPage}
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Saqlash
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Tab: Fayl yuklash ── */}
            <TabsContent value="upload">
              {saving ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-12 hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <span className="text-sm text-muted-foreground">Rasm tanlash</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

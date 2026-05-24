import { useEffect, useState } from "react";
import { X, Check, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../lib/api";
import type { PageInfo } from "../../lib/types";
import { Button } from "../ui/button";
import ImagePositioner from "./ImagePositioner";

interface ChapterThumbnailModalProps {
  open: boolean;
  manga: string;
  chapter: string;
  onClose: () => void;
  onSaved: (thumbnailUrl: string) => void;
}

export default function ChapterThumbnailModal({
  open,
  manga,
  chapter,
  onClose,
  onSaved,
}: ChapterThumbnailModalProps) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedIdx(null);
    setSelectedUrl(null);
    setLoading(true);
    api
      .getChapterPages(manga, chapter)
      .then((res) => setPages(res.images))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [open, manga, chapter]);

  if (!open) return null;

  async function handleSave() {
    if (selectedIdx == null) return;
    setSaving(true);
    try {
      const res = await api.setChapterThumbnail(manga, chapter, selectedIdx, crop);
      onSaved(res.thumbnail_url);
      toast.success("Thumbnail saqlandi");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-2xl rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{chapter}-bob thumbnail</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Sahifa tanlash */}
          {!loading && selectedUrl == null && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Thumbnail uchun sahifa tanlang:</p>
              <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-auto sm:grid-cols-5">
                {pages.map((page, idx) => (
                  <button
                    key={page.filename}
                    className="rounded-md border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => {
                      setSelectedIdx(idx);
                      setSelectedUrl(page.image_url);
                    }}
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

          {/* Pozitsiya sozlash */}
          {!loading && selectedUrl != null && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setSelectedIdx(null);
                    setSelectedUrl(null);
                  }}
                >
                  Orqaga
                </button>
                <span className="text-xs text-muted-foreground">
                  Scroll yoki surib joylashtiring
                </span>
              </div>

              <div className="flex justify-center">
                <ImagePositioner
                  src={selectedUrl}
                  aspectRatio={105 / 62}
                  previewWidth={420}
                  onCropChange={setCrop}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Saqlash
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

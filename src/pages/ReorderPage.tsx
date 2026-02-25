import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, RotateCcw, Loader2, Trash2, Merge } from "lucide-react";
import { toast } from "sonner";

import { api } from "../lib/api";
import type { PageInfo } from "../lib/types";
import { Button } from "../components/ui/button";

export default function ReorderPage() {
  const { manga, chapter } = useParams<{ manga: string; chapter: string }>();
  const navigate = useNavigate();

  const [pages, setPages] = useState<PageInfo[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!manga || !chapter) return;
    setLoading(true);
    api
      .getChapterPages(manga, chapter)
      .then((data) => {
        setPages(data.images);
        setOrder([]);
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [manga, chapter]);

  function handleImageClick(filename: string) {
    setOrder((prev) => {
      const idx = prev.indexOf(filename);
      if (idx >= 0) {
        return prev.filter((f) => f !== filename);
      }
      return [...prev, filename];
    });
  }

  function handleReset() {
    setOrder([]);
  }

  async function handleSave() {
    if (!manga || !chapter) return;
    setSaving(true);
    try {
      // order da bo'lmagan fayllarni oxiriga qo'shish (asl tartibda)
      const remaining = pages
        .map((p) => p.filename)
        .filter((f) => !order.includes(f));
      const fullOrder = [...order, ...remaining];

      await api.reorderPages(manga, chapter, fullOrder);
      toast.success("Sahifalar tartibga solindi");
      navigate(`/project/${manga}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!manga || !chapter || order.length === 0) return;
    if (
      !confirm(
        `${order.length} ta rasmni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`
      )
    )
      return;

    setDeleting(true);
    try {
      const res = await api.deletePages(manga, chapter, order);
      if (res.chapter_deleted) {
        toast.success("Barcha rasmlar o'chirildi, chapter ham o'chirildi");
        navigate(`/project/${manga}`);
        return;
      }
      toast.success(`${res.deleted} ta rasm o'chirildi, ${res.remaining} ta qoldi`);
      // Sahifani qayta yuklash
      const data = await api.getChapterPages(manga, chapter);
      setPages(data.images);
      setOrder([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleMergeImages() {
    if (!manga || !chapter || order.length < 2) return;
    if (
      !confirm(
        `${order.length} ta rasmni bitta rasmga birlashtirilsinmi? (tanlangan tartibda vertikal qo'shiladi)`
      )
    )
      return;

    setMerging(true);
    try {
      const res = await api.mergeImages(manga, chapter, order);
      toast.success(
        `${res.merged_count} ta rasm birlashtirildi → ${res.merged_into}`
      );
      const data = await api.getChapterPages(manga, chapter);
      setPages(data.images);
      setOrder([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMerging(false);
    }
  }

  function getOrderIndex(filename: string): number {
    return order.indexOf(filename);
  }

  if (!manga || !chapter) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Sahifa topilmadi</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/project/${manga}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            Tartib — {chapter}-bob
          </h1>
          <span className="text-xs text-muted-foreground">
            {pages.length} rasm
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={order.length === 0}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
          {order.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMergeImages}
              disabled={merging}
            >
              {merging ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Merge className="mr-1.5 h-3.5 w-3.5" />
              )}
              Birlashtirish ({order.length})
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || order.length === 0}
          >
            {deleting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            O'chirish ({order.length})
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || order.length === 0}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Rasmlarni kerakli tartibda bosing. Tartib raqami ko'rinadi. Belgilanmagan rasmlar oxiriga qo'shiladi.
      </p>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {pages.map((page) => {
          const idx = getOrderIndex(page.filename);
          const isSelected = idx >= 0;

          return (
            <button
              key={page.filename}
              type="button"
              className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-muted-foreground/30"
              }`}
              onClick={() => handleImageClick(page.filename)}
            >
              <img
                src={page.image_url}
                alt={page.filename}
                className="aspect-[3/4] w-full object-cover object-top"
                draggable={false}
              />

              {/* Tartib raqami badge */}
              {isSelected && (
                <div className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow">
                  {idx + 1}
                </div>
              )}

              {/* Fayl nomi */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                <span className="text-[10px] font-medium text-white">
                  {page.filename}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

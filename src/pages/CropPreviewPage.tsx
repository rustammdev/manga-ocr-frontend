import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { api } from "../lib/api";
import type { CropImageInfo } from "../lib/types";
import { Button } from "../components/ui/button";

type ImageCropState = CropImageInfo & {
  cropLines: number[];
};

/** Chiziq atrofida ko'rinadigan maydon (ekran px, har tomonga) */
const STRIP_HEIGHT_PX = 120;

export default function CropPreviewPage() {
  const { manga, chapter } = useParams<{ manga: string; chapter: string }>();
  const navigate = useNavigate();

  const [images, setImages] = useState<ImageCropState[]>([]);
  const [autoLines, setAutoLines] = useState<Map<string, number[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!manga || !chapter) return;
    setLoading(true);
    api
      .getCropPreview(manga, chapter)
      .then((data) => {
        const autoMap = new Map<string, number[]>();
        const states: ImageCropState[] = data.images.map((img) => {
          autoMap.set(img.filename, [...img.crop_lines]);
          // Agar saqlangan config bo'lsa, uni ishlatish
          const savedImg = data.saved_config?.images.find(
            (s) => s.filename === img.filename
          );
          return {
            ...img,
            cropLines: savedImg ? [...savedImg.crop_lines] : [...img.crop_lines],
          };
        });
        setAutoLines(autoMap);
        setImages(states);
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [manga, chapter]);

  const handleSave = async () => {
    if (!manga || !chapter) return;
    setSaving(true);
    try {
      await api.saveCropConfig(
        manga,
        chapter,
        images.map((img) => ({
          filename: img.filename,
          crop_lines: img.cropLines,
        }))
      );
      toast.success("Crop konfiguratsiya saqlandi");
      navigate(`/project/${manga}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        cropLines: [...(autoLines.get(img.filename) || [])],
      }))
    );
  };

  const updateCropLine = useCallback(
    (imageIdx: number, lineIdx: number, newY: number) => {
      setImages((prev) => {
        const next = [...prev];
        const img = { ...next[imageIdx] };
        const lines = [...img.cropLines];

        // Constraint: min 500px between lines and image boundaries
        const minGap = 500;
        const minY = lineIdx === 0 ? minGap : lines[lineIdx - 1] + minGap;
        const maxY =
          lineIdx === lines.length - 1
            ? img.height - minGap
            : lines[lineIdx + 1] - minGap;

        lines[lineIdx] = Math.round(Math.max(minY, Math.min(maxY, newY)));
        img.cropLines = lines;
        next[imageIdx] = img;
        return next;
      });
    },
    []
  );

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
    <div className="mx-auto max-w-4xl space-y-4 p-4">
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
            Crop Preview — {chapter}-bob
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Auto
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Har bir chiziq atrofida faqat yaqin joy ko'rsatilgan. Chiziqlarni yuqoriga/pastga suring.
      </p>

      <div className="space-y-6">
        {images.map((img, imgIdx) => (
          <CropImageCard
            key={img.filename}
            image={img}
            imageIdx={imgIdx}
            onUpdateLine={updateCropLine}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rasm kartasi: chiziqlar bo'lsa strip'lar, bo'lmasa oddiy header    */
/* ------------------------------------------------------------------ */

function CropImageCard({
  image,
  imageIdx,
  onUpdateLine,
}: {
  image: ImageCropState;
  imageIdx: number;
  onUpdateLine: (imageIdx: number, lineIdx: number, newY: number) => void;
}) {
  const hasCropLines = image.cropLines.length > 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">{image.filename}</span>
        <span className="text-xs text-muted-foreground">
          {image.width}&times;{image.height}px
          {hasCropLines && ` — ${image.cropLines.length} chiziq`}
        </span>
      </div>

      {hasCropLines ? (
        <div className="space-y-2 p-3">
          {image.cropLines.map((y, lineIdx) => (
            <CropLineStrip
              key={lineIdx}
              image={image}
              imageIdx={imageIdx}
              lineIdx={lineIdx}
              cropY={y}
              onUpdateLine={onUpdateLine}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Qirqish chizig'i yo'q (rasm yetarlicha past)
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bitta chiziq uchun strip: rasm faqat chiziq atrofida ko'rinadi     */
/* ------------------------------------------------------------------ */

function CropLineStrip({
  image,
  imageIdx,
  lineIdx,
  cropY,
  onUpdateLine,
}: {
  image: ImageCropState;
  imageIdx: number;
  lineIdx: number;
  cropY: number;
  onUpdateLine: (imageIdx: number, lineIdx: number, newY: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragInfo, setDragInfo] = useState<{
    startY: number;
    startValue: number;
  } | null>(null);

  /* Container kengligini kuzatish (responsive) */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = containerWidth > 0 ? containerWidth / image.width : 0;

  /* --- Drag handlerlari --- */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragInfo({ startY: e.clientY, startValue: cropY });
    },
    [cropY]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragInfo) return;
      const s = containerWidth > 0 ? containerWidth / image.width : 1;
      const deltaY = (e.clientY - dragInfo.startY) / s;
      onUpdateLine(imageIdx, lineIdx, dragInfo.startValue + deltaY);
    },
    [dragInfo, containerWidth, image.width, imageIdx, lineIdx, onUpdateLine]
  );

  const handlePointerUp = useCallback(() => {
    setDragInfo(null);
  }, []);

  /* --- Rasm pozitsiyalash --- */
  // Chiziq strip markazida turadi, rasm shunga mos suriladi
  const lineScreenY = cropY * scale;
  const halfStrip = STRIP_HEIGHT_PX / 2;
  const imgTop = halfStrip - lineScreenY;

  return (
    <div
      className="flex items-center gap-3"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Chap: label */}
      <div className="shrink-0 w-20 text-right">
        <div className="text-xs font-mono font-semibold text-red-500">
          #{lineIdx + 1}
        </div>
        <div className="text-[11px] font-mono text-muted-foreground">
          {Math.round(cropY)}px
        </div>
      </div>

      {/* O'ng: strip — rasm faqat chiziq atrofida ko'rinadi */}
      <div
        ref={containerRef}
        className="relative flex-1 select-none overflow-hidden rounded border"
        style={{ height: `${STRIP_HEIGHT_PX}px` }}
      >
        {scale > 0 && (
          <>
            <img
              src={image.image_url}
              alt={image.filename}
              className="pointer-events-none w-full absolute left-0"
              style={{ top: `${imgTop}px` }}
              draggable={false}
            />
            {/* Chiziq — strip markazida */}
            <div
              className="absolute left-0 right-0"
              style={{ top: `${halfStrip}px` }}
            >
              {/* Kengaytirilgan hit area */}
              <div
                className="absolute left-0 right-0 -top-4 h-8 cursor-row-resize z-10"
                onPointerDown={handlePointerDown}
              />
              {/* Ko'rinadigan chiziq */}
              <div
                className="absolute left-0 right-0 h-0 border-t-2 border-dashed border-red-500 pointer-events-none"
                style={{ opacity: dragInfo ? 1 : 0.7 }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

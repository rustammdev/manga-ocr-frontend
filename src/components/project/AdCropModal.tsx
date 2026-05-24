import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../lib/api";
import type {
  AdCropPreviewImage,
  AdCropPreviewResponse,
  ProjectSettings,
} from "../../lib/types";
import { Button } from "../ui/button";

export type AdCropDecision = {
  crop_ads_top_px: number;
  crop_ads_bottom_px: number;
  drop_first_if_w: number;
  drop_first_if_h: number;
  drop_last_if_w: number;
  drop_last_if_h: number;
};

interface AdCropModalProps {
  open: boolean;
  manga: string;
  /** Tarjima tugmasi nomi — Saqlash, Davom etish va h.k. */
  confirmLabel?: string;
  onClose: () => void;
  /** Foydalanuvchi qiymatlarni saqlagandan keyin chaqiriladi.
   * Komponent saqlashni o'zi qiladi (project settings). callback onClose
   * qilishni boshqarish uchun. */
  onConfirm?: (decision: AdCropDecision) => void;
}

type Mode = "keep" | "crop" | "drop";

interface SideState {
  mode: Mode;
  crop_px: number;
}

function makeDefault(): { top: SideState; bottom: SideState } {
  return {
    top: { mode: "keep", crop_px: 0 },
    bottom: { mode: "keep", crop_px: 0 },
  };
}

export default function AdCropModal({
  open,
  manga,
  confirmLabel = "Saqlash",
  onClose,
  onConfirm,
}: AdCropModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<AdCropPreviewResponse | null>(null);
  const [state, setState] = useState(makeDefault);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    api
      .getAdCropPreview(manga)
      .then((res) => {
        if (cancel) return;
        setData(res);
        // Hozirgi sozlamalarni state'ga ko'chirish
        const cur = res.current;
        setState({
          top: deriveSide(
            cur.crop_ads_top_px,
            cur.drop_first_if_w,
            cur.drop_first_if_h,
            res.first,
          ),
          bottom: deriveSide(
            cur.crop_ads_bottom_px,
            cur.drop_last_if_w,
            cur.drop_last_if_h,
            res.last,
          ),
        });
      })
      .catch((e: Error) => {
        toast.error(e.message);
        if (!cancel) setData(null);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [open, manga]);

  if (!open) return null;

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const decision = buildDecision(state, data);
      // Project settingsiga saqlash uchun barcha sozlamalarni yangilaymiz
      const proj = await api.getProject(manga);
      const merged: Partial<ProjectSettings> = {
        ...proj.settings,
        ...decision,
      };
      await api.saveProjectSettings(manga, merged);
      onConfirm?.(decision);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-sm font-medium">Reklama bannerlarini sozlash</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Auto-merge har bobning birinchi va oxirgi rasmida shu sozlamani qo'llaydi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || (!data.first && !data.last) ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {data?.eligible_count === 0
              ? "Auto-merge uchun mos boblar yo'q. Sozlash hozircha kerak emas."
              : "Preview rasmlari topilmadi."}
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-5">
            <div className="mb-3 rounded-md border bg-muted/40 p-3 text-[11px] text-muted-foreground">
              Quyida{" "}
              <strong className="text-foreground">{data.chapter}-bob</strong>
              ning birinchi va oxirgi rasmlari ko'rsatilgan. Sozlama barcha
              eligible boblarga (
              <strong className="text-foreground">{data.eligible_count}</strong>
              ) avtomatik qo'llanadi. Sahifa o'lchami{" "}
              {data.common_size
                ? <strong className="text-foreground">{data.common_size.width}×{data.common_size.height}</strong>
                : <strong className="text-foreground">noma'lum</strong>}
              .
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SidePanel
                title="Birinchi rasm (yuqori reklama)"
                image={data.first}
                commonSize={data.common_size}
                value={state.top}
                onChange={(v) => setState((s) => ({ ...s, top: v }))}
                cropEdge="top"
              />
              <SidePanel
                title="Oxirgi rasm (pastki reklama)"
                image={data.last}
                commonSize={data.common_size}
                value={state.bottom}
                onChange={(v) => setState((s) => ({ ...s, bottom: v }))}
                cropEdge="bottom"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Bekor
          </Button>
          <Button
            size="sm"
            className="gap-1"
            disabled={saving || loading || !data}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SidePanelProps {
  title: string;
  image: AdCropPreviewImage | null;
  commonSize: { width: number; height: number } | null;
  value: SideState;
  onChange: (v: SideState) => void;
  cropEdge: "top" | "bottom";
}

function SidePanel({
  title,
  image,
  commonSize,
  value,
  onChange,
  cropEdge,
}: SidePanelProps) {
  if (!image) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground">
        {title}: rasm topilmadi
      </div>
    );
  }

  const sizeMatchesCommon =
    commonSize !== null &&
    image.width === commonSize.width &&
    image.height === commonSize.height;

  const dropDisabled = sizeMatchesCommon;

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium">{title}</h3>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {image.width}×{image.height}
        </span>
      </div>

      <div className="flex gap-1 rounded-md border p-0.5 text-xs">
        <ModeButton
          active={value.mode === "keep"}
          onClick={() => onChange({ mode: "keep", crop_px: 0 })}
        >
          Saqlash
        </ModeButton>
        <ModeButton
          active={value.mode === "crop"}
          onClick={() =>
            onChange({
              mode: "crop",
              crop_px: value.crop_px || guessCropPx(image, commonSize, cropEdge),
            })
          }
        >
          Crop (px)
        </ModeButton>
        <ModeButton
          active={value.mode === "drop"}
          disabled={dropDisabled}
          title={
            dropDisabled
              ? "Asosiy sahifa o'lchamida bo'lgani uchun butunlay tashlash mumkin emas"
              : undefined
          }
          onClick={() => onChange({ mode: "drop", crop_px: 0 })}
        >
          Butunlay tashlash
        </ModeButton>
      </div>

      {value.mode === "crop" ? (
        <CropPreview
          image={image}
          cropPx={value.crop_px}
          edge={cropEdge}
          onChange={(px) => onChange({ mode: "crop", crop_px: px })}
        />
      ) : (
        <div className="overflow-hidden rounded border">
          <img
            src={image.image_url}
            alt={image.filename}
            className={`block w-full ${
              value.mode === "drop" ? "opacity-30 grayscale" : ""
            }`}
            draggable={false}
          />
        </div>
      )}

      {value.mode === "drop" && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-600 dark:text-amber-300">
          Bu rasm aynan{" "}
          <strong>
            {image.width}×{image.height}
          </strong>{" "}
          o'lchamida bo'lgan boblarda butunlay o'chiriladi. Boshqa o'lchamdagi
          rasmlar saqlab qolinadi.
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 rounded px-2 py-1 transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

interface CropPreviewProps {
  image: AdCropPreviewImage;
  cropPx: number;
  edge: "top" | "bottom";
  onChange: (px: number) => void;
}

function CropPreview({ image, cropPx, edge, onChange }: CropPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [renderHeight, setRenderHeight] = useState(0);

  const updateHeight = useCallback(() => {
    if (imgRef.current) setRenderHeight(imgRef.current.clientHeight);
  }, []);

  useEffect(() => {
    if (!imgLoaded) return;
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    if (imgRef.current) ro.observe(imgRef.current);
    return () => ro.disconnect();
  }, [imgLoaded, updateHeight]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const cont = containerRef.current;
      const img = imgRef.current;
      if (!cont || !img || image.height === 0) return;

      const rect = img.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const scale = image.height / rect.height;
      const realY = Math.round(clickY * scale);

      let px: number;
      if (edge === "top") {
        px = Math.max(0, Math.min(image.height - 10, realY));
      } else {
        px = Math.max(0, Math.min(image.height - 10, image.height - realY));
      }
      onChange(px);
    },
    [image.height, edge, onChange],
  );

  const overlayStyle = useMemo<React.CSSProperties>(() => {
    if (!imgLoaded || renderHeight === 0 || cropPx <= 0)
      return { display: "none" };
    const ratio = cropPx / image.height;
    const overlayPx = ratio * renderHeight;
    return edge === "top"
      ? { top: 0, height: `${overlayPx}px` }
      : { bottom: 0, height: `${overlayPx}px` };
  }, [imgLoaded, renderHeight, cropPx, image.height, edge]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded border"
      >
        <img
          ref={imgRef}
          src={image.image_url}
          alt={image.filename}
          className="block w-full cursor-crosshair select-none"
          draggable={false}
          onLoad={() => {
            setImgLoaded(true);
            updateHeight();
          }}
          onClick={handleClick}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bg-red-500/30 backdrop-blur-[1px]"
          style={overlayStyle}
        />
        {cropPx > 0 && (
          <div
            className={`pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-red-500`}
            style={
              edge === "top"
                ? {
                    top: `${(cropPx / image.height) * 100}%`,
                  }
                : {
                    bottom: `${(cropPx / image.height) * 100}%`,
                  }
            }
          />
        )}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <label className="text-muted-foreground">Kesiladi (px):</label>
        <input
          type="number"
          min={0}
          max={image.height - 10}
          value={cropPx}
          onChange={(e) =>
            onChange(Math.max(0, Number.parseInt(e.target.value || "0", 10)))
          }
          className="w-20 rounded border bg-background px-2 py-1 tabular-nums"
        />
        <button
          type="button"
          onClick={() => onChange(0)}
          className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Tozalash"
        >
          <Trash2 className="h-3 w-3" />
          0
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Rasmga bosing yoki maydonga raqam yozing. Qizil zona kesiladi.
      </p>
    </div>
  );
}

// ── helperlar ──

function deriveSide(
  cropPx: number,
  dropW: number,
  dropH: number,
  image: AdCropPreviewImage | null,
): SideState {
  if (cropPx > 0) return { mode: "crop", crop_px: cropPx };
  if (
    dropW > 0 &&
    dropH > 0 &&
    image !== null &&
    image.width === dropW &&
    image.height === dropH
  ) {
    return { mode: "drop", crop_px: 0 };
  }
  return { mode: "keep", crop_px: 0 };
}

function guessCropPx(
  image: AdCropPreviewImage,
  common: { width: number; height: number } | null,
  _edge: "top" | "bottom",
): number {
  // Agar joriy rasm common'dan baland bo'lsa, farqni boshlang'ich qiymat sifatida
  // taklif qilamiz. Bu user uchun yaxshi default.
  if (common && image.height > common.height) {
    const diff = image.height - common.height;
    return Math.min(diff, image.height - 10);
  }
  // Aks holda — 30 px (eng kichik foydali qiymat).
  return Math.min(30, image.height - 10);
}

function buildDecision(
  state: { top: SideState; bottom: SideState },
  data: AdCropPreviewResponse,
): AdCropDecision {
  const decision: AdCropDecision = {
    crop_ads_top_px: 0,
    crop_ads_bottom_px: 0,
    drop_first_if_w: 0,
    drop_first_if_h: 0,
    drop_last_if_w: 0,
    drop_last_if_h: 0,
  };

  if (state.top.mode === "crop" && state.top.crop_px > 0) {
    decision.crop_ads_top_px = state.top.crop_px;
  } else if (state.top.mode === "drop" && data.first) {
    decision.drop_first_if_w = data.first.width;
    decision.drop_first_if_h = data.first.height;
  }

  if (state.bottom.mode === "crop" && state.bottom.crop_px > 0) {
    decision.crop_ads_bottom_px = state.bottom.crop_px;
  } else if (state.bottom.mode === "drop" && data.last) {
    decision.drop_last_if_w = data.last.width;
    decision.drop_last_if_h = data.last.height;
  }

  return decision;
}

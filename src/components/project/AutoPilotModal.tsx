import { useState, useEffect } from "react";
import { X, Rocket, Loader2 } from "lucide-react";

import type { AutoPilotConfig } from "../../lib/types";
import { Button } from "../ui/button";

interface AutoPilotModalProps {
  open: boolean;
  starting: boolean;
  onClose: () => void;
  onStart: (config: AutoPilotConfig) => void;
}

const STORAGE_KEY = "autoPilotConfig";

function loadConfig(): AutoPilotConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AutoPilotConfig>;
      return {
        enable_auto_merge: parsed.enable_auto_merge ?? true,
        enable_ocr: parsed.enable_ocr ?? true,
        enable_translate: parsed.enable_translate ?? false,
        enable_publish: parsed.enable_publish ?? false,
        force_ocr: parsed.force_ocr ?? false,
        force_clean: parsed.force_clean ?? false,
      };
    }
  } catch {
    // ignore
  }
  return {
    enable_auto_merge: true,
    enable_ocr: true,
    enable_translate: false,
    enable_publish: false,
    force_ocr: false,
    force_clean: false,
  };
}

export default function AutoPilotModal({
  open,
  starting,
  onClose,
  onStart,
}: AutoPilotModalProps) {
  const [config, setConfig] = useState<AutoPilotConfig>(loadConfig);

  useEffect(() => {
    if (open) {
      setConfig(loadConfig());
    }
  }, [open]);

  if (!open) return null;

  const update = <K extends keyof AutoPilotConfig>(key: K, value: AutoPilotConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      // Bog'liqliklar:
      // - publish faqat translate yoqilsa mumkin
      if (key === "enable_translate" && !value) {
        next.enable_publish = false;
      }
      // - boshqa stage'lar yoqilgan bo'lsa OCR doim majburiy
      if (next.enable_auto_merge || next.enable_translate || next.enable_publish) {
        next.enable_ocr = true;
      }
      return next;
    });
  };

  const handleStart = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
    onStart(config);
  };

  const noStageEnabled =
    !config.enable_auto_merge &&
    !config.enable_ocr &&
    !config.enable_translate &&
    !config.enable_publish;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Auto Pilot sozlamalari</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            disabled={starting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs text-muted-foreground">
            Tanlangan bosqichlarni barcha mos boblarda avtomatik bajaradi. Sozlash
            keyingi safar uchun saqlanadi.
          </p>

          <div className="space-y-3 rounded-md border bg-muted/40 p-3">
            <StageRow
              label="Auto Merge"
              description="Yuklangan boblarni avtomatik tartiblash"
              checked={config.enable_auto_merge}
              onChange={(v) => update("enable_auto_merge", v)}
            />
            <StageRow
              label="OCR"
              description="Matn aniqlash + tozalash"
              checked={config.enable_ocr}
              onChange={(v) => update("enable_ocr", v)}
              disabled={
                config.enable_auto_merge ||
                config.enable_translate ||
                config.enable_publish
              }
              disabledHint="Boshqa bosqich yoqilgan"
            />
            <StageRow
              label="Tarjima"
              description="OCR natijalarini tarjima qilish"
              checked={config.enable_translate}
              onChange={(v) => update("enable_translate", v)}
            />
            <StageRow
              label="Publish"
              description="R2 CDN ga publish qilish"
              checked={config.enable_publish}
              onChange={(v) => update("enable_publish", v)}
              disabled={!config.enable_translate}
              disabledHint="Avval tarjimani yoqing"
            />
          </div>

          {(config.enable_ocr || config.enable_auto_merge) && (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={config.force_ocr ?? false}
                  onChange={(e) => update("force_ocr", e.target.checked)}
                />
                <span>OCR ni majburiy qayta ishga tushirish (mavjud natijalarni o'chiradi)</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={config.force_clean ?? false}
                  onChange={(e) => update("force_clean", e.target.checked)}
                />
                <span>Tozalashni majburiy qayta ishga tushirish</span>
              </label>
            </div>
          )}

          <div className="rounded-md bg-blue-500/10 border border-blue-500/30 p-3 text-xs text-blue-700 dark:text-blue-300">
            <p>
              <strong>Eslatma:</strong> Tarjima xato bersa (AI busy va h.k.)
              publish avtomatik to'xtaydi. Bitta bob xato qilsa, boshqalari
              davom etadi.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={starting}>
            Bekor qilish
          </Button>
          <Button
            size="sm"
            onClick={handleStart}
            disabled={starting || noStageEnabled}
            className="gap-1.5"
          >
            {starting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            Boshlash
          </Button>
        </div>
      </div>
    </div>
  );
}

interface StageRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  disabledHint?: string;
}

function StageRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  disabledHint,
}: StageRowProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => !disabled && onChange(e.target.checked)}
      />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">
          {disabled && disabledHint ? disabledHint : description}
        </div>
      </div>
    </label>
  );
}

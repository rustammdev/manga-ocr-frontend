import { useEffect, useState } from "react";
import { X, Save, Loader2, Settings2 } from "lucide-react";

import { api } from "../../lib/api";
import type { ProjectSettings, TranslatorModelInfo, TranslatorModelsMap } from "../../lib/types";
import { MANGA_FONTS, ROLE_DEFAULTS } from "../../lib/fonts";
import OcrBackendSelect from "../OcrBackendSelect";
import InpaintBackendSelect from "../InpaintBackendSelect";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface SettingsModalProps {
  open: boolean;
  settings: ProjectSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProjectSettings>>;
  saving: boolean;
  forceOcr: boolean;
  setForceOcr: (v: boolean) => void;
  forceClean: boolean;
  setForceClean: (v: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

const FONT_CATEGORY_LABELS: Record<string, string> = {
  comic: "Dialog",
  sfx: "SFX / FX",
  narration: "Narration",
  clean: "Oddiy",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300"
      />
      <span className="text-muted-foreground">{children}</span>
    </label>
  );
}

function FontRoleSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {MANGA_FONTS.map((f) => (
            <SelectItem key={f.family} value={f.family}>
              <span style={{ fontFamily: f.family }}>{f.family}</span>
              <span className="ml-2 text-[10px] text-muted-foreground">
                {FONT_CATEGORY_LABELS[f.category] || f.category}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * Rang tanlash — "Auto" (rasmdan aniqlanadi), ixtiyoriy "Yo'q" (faqat stroke),
 * yoki aniq hex rang. Manga kesimida belgilansa auto-aniqlash o'chadi.
 */
function ColorField({
  label,
  value,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowNone?: boolean;
}) {
  const isAuto = !value || value === "auto";
  const isNone = value === "none";
  const isHex = value.startsWith("#");
  const swatch = isHex ? value : "#111827";

  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange("auto")}
          className={`rounded-md border px-2 py-1 text-[11px] ${
            isAuto ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
          }`}
        >
          Auto
        </button>
        {allowNone && (
          <button
            type="button"
            onClick={() => onChange("none")}
            className={`rounded-md border px-2 py-1 text-[11px] ${
              isNone ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            Yo'q
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange(swatch)}
          className={`rounded-md border px-2 py-1 text-[11px] ${
            isHex ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
          }`}
        >
          Rang
        </button>
        <input
          type="color"
          value={swatch}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-7 w-9 cursor-pointer rounded border bg-transparent p-0.5"
        />
      </div>
    </Field>
  );
}

export default function SettingsModal({
  open,
  settings,
  setSettings,
  saving,
  forceOcr,
  setForceOcr,
  forceClean,
  setForceClean,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [modelsMap, setModelsMap] = useState<TranslatorModelsMap>({});

  useEffect(() => {
    if (open) {
      api.getTranslatorModels().then(setModelsMap).catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const currentModels: TranslatorModelInfo[] = modelsMap[settings.backend] || [];
  const defaultModel = currentModels.find((m) => m.default)?.value || "";
  const set = <K extends keyof ProjectSettings>(key: K, val: ProjectSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-card px-5 py-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Pipeline sozlamalari</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Manba tili">
              <Select
                value={settings.language}
                onValueChange={(v) => set("language", v as ProjectSettings["language"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Til" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">Yaponcha (JA)</SelectItem>
                  <SelectItem value="ko">Koreyscha (KO)</SelectItem>
                  <SelectItem value="ru">Ruscha (RU)</SelectItem>
                  <SelectItem value="en">Inglizcha (EN)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tarjima backend">
              <Select
                value={settings.backend}
                onValueChange={(v) =>
                  setSettings((prev) => ({
                    ...prev,
                    backend: v as ProjectSettings["backend"],
                    translator_model: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Backend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="kiro">Kiro (Amazon Q)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tarjima modeli">
              <Select
                value={settings.translator_model || defaultModel}
                onValueChange={(v) => set("translator_model", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {currentModels.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}{m.default ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="OCR backend">
              <OcrBackendSelect
                value={settings.ocr_backend}
                onValueChange={(v) => set("ocr_backend", v)}
              />
            </Field>
            <Field label="Cleaner backend">
              <InpaintBackendSelect
                value={settings.inpaint_backend ?? "migan"}
                onValueChange={(v) => set("inpaint_backend", v)}
              />
            </Field>
            <Field label="Rasm limiti">
              <Input
                type="number"
                min={0}
                value={settings.limit}
                onChange={(e) => set("limit", Number.parseInt(e.target.value || "0", 10))}
              />
            </Field>
          </div>

          <Check
            checked={settings.detect_dark_bubbles ?? false}
            onChange={(v) => set("detect_dark_bubbles", v)}
          >
            Qora bubble aniqlash
          </Check>

          <Check
            checked={settings.bubble_fit_manga ?? false}
            onChange={(v) => set("bubble_fit_manga", v)}
          >
            Manga rejimi — matnni pufak shakliga moslab kattalashtirish (webtoon uchun yoqmang)
          </Check>

          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-medium">Matn rangi</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField
                label="Font rangi"
                value={settings.font_color || "auto"}
                onChange={(v) => set("font_color", v)}
              />
              <ColorField
                label="Hoshiya (stroke)"
                value={settings.stroke_color || "auto"}
                onChange={(v) => set("stroke_color", v)}
                allowNone
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Auto — rang rasmdan aniqlanadi. Aniq rang belgilansa butun manga shu rangda chiziladi.
            </p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-medium">Fontlar (rol bo'yicha)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <FontRoleSelect
                label="Dialog"
                value={settings.font_dialogue || ROLE_DEFAULTS.dialogue}
                onChange={(v) => set("font_dialogue", v)}
              />
              <FontRoleSelect
                label="SFX / FX"
                value={settings.font_sfx || ROLE_DEFAULTS.sfx}
                onChange={(v) => set("font_sfx", v)}
              />
              <FontRoleSelect
                label="Narration"
                value={settings.font_narration || ROLE_DEFAULTS.narration}
                onChange={(v) => set("font_narration", v)}
              />
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium">Qayta ishlash</p>
            <Check checked={forceOcr} onChange={setForceOcr}>
              Qayta OCR (mavjud natijalarni o'chirib boshidan)
            </Check>
            <Check checked={forceClean} onChange={setForceClean}>
              Qayta Clean (tozalangan rasmlarni qayta tozalash)
            </Check>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-card px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Bekor
          </Button>
          <Button size="sm" className="gap-1" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Saqlash
          </Button>
        </div>
      </div>
    </div>
  );
}

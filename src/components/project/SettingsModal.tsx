import { useEffect, useState } from "react";
import { X, Save, Loader2, Settings2 } from "lucide-react";

import { api } from "../../lib/api";
import type { ProjectSettings, TranslatorModelInfo, TranslatorModelsMap } from "../../lib/types";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-2xl rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Pipeline sozlamalari</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Manba tili</label>
              <Select
                value={settings.language}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, language: value as ProjectSettings["language"] }))
                }
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
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tarjima backend</label>
              <Select
                value={settings.backend}
                onValueChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    backend: value as ProjectSettings["backend"],
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
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tarjima modeli</label>
              <Select
                value={settings.translator_model || defaultModel}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, translator_model: value }))
                }
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
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">OCR backend</label>
              <OcrBackendSelect
                value={settings.ocr_backend}
                onValueChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    ocr_backend: value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cleaner (inpaint) backend</label>
              <InpaintBackendSelect
                value={settings.inpaint_backend ?? "migan"}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, inpaint_backend: value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rasm limiti</label>
              <Input
                type="number"
                min={0}
                value={settings.limit}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    limit: Number.parseInt(e.target.value || "0", 10),
                  }))
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={settings.detect_dark_bubbles ?? false}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, detect_dark_bubbles: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            <span className="text-muted-foreground">Qora bubble aniqlash (dark bubble detection)</span>
          </label>
          <div className="space-y-1.5 rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-[11px] font-medium text-amber-500/80">Qayta ishlash</p>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={forceOcr}
                onChange={(e) => setForceOcr(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-muted-foreground">Qayta OCR (mavjud natijalarni o'chirib boshidan)</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={forceClean}
                onChange={(e) => setForceClean(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-muted-foreground">Qayta Clean (tozalangan rasmlarni qayta tozalash)</span>
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
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

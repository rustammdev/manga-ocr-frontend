import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { OcrBackendInfo, OcrBackendValue } from "../lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface OcrBackendSelectProps {
  value: OcrBackendValue;
  onValueChange: (value: OcrBackendValue) => void;
}

export default function OcrBackendSelect({ value, onValueChange }: OcrBackendSelectProps) {
  const [backends, setBackends] = useState<OcrBackendInfo[]>([]);

  useEffect(() => {
    api.getOcrBackends().then(setBackends).catch(() => {});
  }, []);

  function formatLabel(b: OcrBackendInfo): string {
    if (b.monthly_limit && b.remaining !== undefined) {
      return `${b.label} (${b.remaining}/${b.monthly_limit})`;
    }
    return b.label;
  }

  if (backends.length === 0) {
    return (
      <Select value={value} onValueChange={(v) => onValueChange(v as OcrBackendValue)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Local (Auto)</SelectItem>
          <SelectItem value="paddle">PaddleOCR</SelectItem>
          <SelectItem value="yolo_florence">YOLO + Florence-2</SelectItem>
          <SelectItem value="yolo_gemini">YOLO + Gemini Vision</SelectItem>
          <SelectItem value="openai">OpenAI Vision</SelectItem>
          <SelectItem value="ollama">Ollama Vision</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as OcrBackendValue)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {backends.map((b) => (
          <SelectItem key={b.value} value={b.value}>
            {formatLabel(b)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

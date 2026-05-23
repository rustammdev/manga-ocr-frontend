import { Loader2, Rocket, X } from "lucide-react";

import { Progress } from "../ui/progress";
import { Button } from "../ui/button";

interface AutoPilotProgressProps {
  stage: string | null;
  message: string;
  progress: number;
  currentChapter: string | null;
  failedChapters: string[];
  onStop: () => void;
  stopping: boolean;
}

const STAGE_LABEL: Record<string, string> = {
  auto_merge: "Auto Merge",
  ocr: "OCR",
  translate: "Tarjima",
  publish: "Publish",
  init: "Boshlanmoqda",
};

export default function AutoPilotProgress({
  stage,
  message,
  progress,
  currentChapter,
  failedChapters,
  onStop,
  stopping,
}: AutoPilotProgressProps) {
  const stageLabel = stage ? STAGE_LABEL[stage] || stage : "Tayyorlanmoqda";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-sm font-medium">
            Auto Pilot: {stageLabel}
            {currentChapter ? ` — ${currentChapter}-bob` : ""}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onStop}
          disabled={stopping}
          className="gap-1.5"
        >
          {stopping ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
          To'xtatish
        </Button>
      </div>
      <Progress value={progress} className="h-2 mb-1.5" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground line-clamp-1">{message}</span>
        <span className="text-xs font-medium tabular-nums">{progress}%</span>
      </div>
      {failedChapters.length > 0 && (
        <div className="mt-2 text-xs text-destructive">
          Xatolik: {failedChapters.join(", ")}
        </div>
      )}
    </div>
  );
}

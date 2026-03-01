import { useCallback, useRef, useState } from "react";
import { Loader2, Trash2, Scissors } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";

interface SplitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  filename: string;
  onConfirm: (cutLines: number[]) => Promise<void>;
}

export default function SplitModal({
  open,
  onOpenChange,
  imageUrl,
  filename,
  onConfirm,
}: SplitModalProps) {
  const [cutLines, setCutLines] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalHeight, setNaturalHeight] = useState(0);

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      setNaturalHeight(imgRef.current.naturalHeight);
    }
  }, []);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      const img = imgRef.current;
      if (!img || naturalHeight === 0) return;

      const rect = img.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const scale = naturalHeight / rect.height;
      const realY = Math.round(clickY * scale);

      if (realY > 0 && realY < naturalHeight) {
        setCutLines((prev) => [...prev, realY].sort((a, b) => a - b));
      }
    },
    [naturalHeight]
  );

  const removeLine = useCallback((y: number) => {
    setCutLines((prev) => prev.filter((v) => v !== y));
  }, []);

  async function handleConfirm() {
    if (cutLines.length === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(cutLines);
      setCutLines([]);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) setCutLines([]);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle>Qirqish — {filename}</DialogTitle>
          <DialogDescription>
            Rasmga bosib qirqish chizig'ini qo'ying. Bir nechta chiziq qo'shish
            mumkin.
          </DialogDescription>
        </DialogHeader>

        {/* Image container */}
        <div className="relative flex-1 overflow-auto rounded border bg-muted/30">
          <div className="relative inline-block w-full">
            <img
              ref={imgRef}
              src={imageUrl}
              alt={filename}
              className="block w-full cursor-crosshair"
              draggable={false}
              onLoad={handleImageLoad}
              onClick={handleImageClick}
            />
            {/* Cut lines overlay */}
            {imgRef.current &&
              naturalHeight > 0 &&
              cutLines.map((y) => {
                const pct = (y / naturalHeight) * 100;
                return (
                  <div
                    key={y}
                    className="absolute left-0 right-0 flex items-center"
                    style={{ top: `${pct}%` }}
                  >
                    <div className="absolute inset-x-0 border-t-2 border-dashed border-red-500" />
                    <button
                      className="absolute -top-3 left-2 flex items-center gap-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow hover:bg-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLine(y);
                      }}
                    >
                      {y}px
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2">
          <span className="mr-auto text-xs text-muted-foreground">
            {cutLines.length === 0
              ? "Rasmga bosib chiziq qo'ying"
              : `${cutLines.length} ta chiziq → ${cutLines.length + 1} qismga bo'linadi`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCutLines([])}
            disabled={cutLines.length === 0}
          >
            Tozalash
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={cutLines.length === 0 || submitting}
          >
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Scissors className="mr-1.5 h-3.5 w-3.5" />
            )}
            {submitting ? "Qirqilmoqda..." : "Qirqish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

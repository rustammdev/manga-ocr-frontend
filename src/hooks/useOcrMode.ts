import { useEffect } from "react";
import type { RefObject } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { ResultsData } from "../lib/types";
import { setupCanvas, getCanvasCoords } from "./canvasUtils";

interface Params {
  enabled: boolean;
  imgRef: RefObject<HTMLImageElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  manga: string | undefined;
  chapter: string | undefined;
  currentPage: number;
  setData: React.Dispatch<React.SetStateAction<ResultsData | null>>;
  setEnabled: (v: boolean) => void;
}

export function useOcrMode({ enabled, imgRef, canvasRef, manga, chapter, currentPage, setData, setEnabled }: Params) {
  useEffect(() => {
    if (!enabled) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    setupCanvas(canvas, img);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let startX = 0;
    let startY = 0;
    let isDrawing = false;

    function onDown(e: MouseEvent) {
      e.preventDefault();
      const coords = getCanvasCoords(canvas!, e);
      startX = coords.x;
      startY = coords.y;
      isDrawing = true;
    }

    function onMove(e: MouseEvent) {
      if (!isDrawing) return;
      const drawCtx = canvas!.getContext("2d");
      if (!drawCtx) return;
      const coords = getCanvasCoords(canvas!, e);
      drawCtx.clearRect(0, 0, canvas!.width, canvas!.height);
      const x = Math.min(startX, coords.x);
      const y = Math.min(startY, coords.y);
      const w = Math.abs(coords.x - startX);
      const h = Math.abs(coords.y - startY);
      drawCtx.strokeStyle = "rgba(245, 158, 11, 0.8)";
      drawCtx.lineWidth = 3;
      drawCtx.setLineDash([8, 4]);
      drawCtx.strokeRect(x, y, w, h);
      drawCtx.fillStyle = "rgba(245, 158, 11, 0.1)";
      drawCtx.fillRect(x, y, w, h);
      drawCtx.setLineDash([]);
    }

    async function onUp(e: MouseEvent) {
      if (!isDrawing) return;
      isDrawing = false;
      const coords = getCanvasCoords(canvas!, e);
      const x = Math.round(Math.min(startX, coords.x));
      const y = Math.round(Math.min(startY, coords.y));
      const w = Math.round(Math.abs(coords.x - startX));
      const h = Math.round(Math.abs(coords.y - startY));
      const drawCtx = canvas!.getContext("2d");
      if (drawCtx) drawCtx.clearRect(0, 0, canvas!.width, canvas!.height);
      if (w < 10 || h < 10) return;
      if (!manga || !chapter) return;
      const toastId = toast.loading("Matn ajratilmoqda...");
      try {
        const res = await api.ocrBbox(manga, chapter, currentPage, { x, y, w, h });
        const msg = res.text ? `OCR: "${res.text.slice(0, 60)}"` : "Matn topilmadi";
        toast.success(msg, { id: toastId });
        const updated = await api.getResults(manga, chapter);
        setData(updated);
      } catch (err) {
        toast.error(`OCR xatolik: ${(err as Error).message}`, { id: toastId });
      }
      setEnabled(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEnabled(false);
    }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    document.addEventListener("keydown", onKey);
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      document.removeEventListener("keydown", onKey);
    };
  }, [enabled, manga, chapter, currentPage]);
}

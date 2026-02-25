import { useEffect } from "react";
import type { RefObject } from "react";
import { api } from "../lib/api";
import type { Page, ResultsData } from "../lib/types";
import type { RegionDraft } from "../components/results/RegionPanel";
import { getCanvasCoords } from "./canvasUtils";

interface Params {
  anyModeActive: boolean;
  imgRef: RefObject<HTMLImageElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  manga: string | undefined;
  chapter: string | undefined;
  currentPage: number;
  pages: Page[];
  setRegionDrafts: React.Dispatch<React.SetStateAction<Record<string, RegionDraft>>>;
  setStatus: (s: string) => void;
  setData: React.Dispatch<React.SetStateAction<ResultsData | null>>;
}

export function useResizeMode({ anyModeActive, imgRef, canvasRef, manga, chapter, currentPage, pages, setRegionDrafts, setStatus, setData }: Params) {
  useEffect(() => {
    if (anyModeActive) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    function syncSize() {
      canvas!.width = img!.naturalWidth;
      canvas!.height = img!.naturalHeight;
      canvas!.style.width = `${img!.clientWidth}px`;
      canvas!.style.height = `${img!.clientHeight}px`;
    }
    if (img.complete && img.naturalWidth > 0) syncSize();
    img.addEventListener("load", syncSize);

    const THRESHOLD = 10;
    const HANDLE_OFFSET = 25;
    let hoveredIdx = -1;
    let hoveredEdge = "";
    let isDragging = false;
    let startMouse = { x: 0, y: 0 };
    let origBbox = { x: 0, y: 0, w: 0, h: 0 };
    let curBbox = { x: 0, y: 0, w: 0, h: 0 };
    let isRotating = false;
    let rotatingIdx = -1;
    let startAngle = 0;
    let curRotation = 0;
    let origRotation = 0;

    function scaledThreshold() {
      const rect = canvas!.getBoundingClientRect();
      return rect.width > 0 ? THRESHOLD * (canvas!.width / rect.width) : THRESHOLD;
    }

    function hitTest(mx: number, my: number) {
      const regs = pages[currentPage]?.regions || [];
      const t = scaledThreshold();
      for (let i = regs.length - 1; i >= 0; i--) {
        const { x, y, w, h } = regs[i].bbox;
        const r = x + w, b = y + h;
        const near = (px: number, py: number) => Math.abs(mx - px) < t && Math.abs(my - py) < t;
        if (near(x + w / 2, y - HANDLE_OFFSET)) return { idx: i, edge: "rotate" };
        if (near(x, y)) return { idx: i, edge: "nw" };
        if (near(r, y)) return { idx: i, edge: "ne" };
        if (near(x, b)) return { idx: i, edge: "sw" };
        if (near(r, b)) return { idx: i, edge: "se" };
        const onX = mx >= x - t && mx <= r + t;
        const onY = my >= y - t && my <= b + t;
        if (onX && Math.abs(my - y) < t) return { idx: i, edge: "n" };
        if (onX && Math.abs(my - b) < t) return { idx: i, edge: "s" };
        if (onY && Math.abs(mx - x) < t) return { idx: i, edge: "w" };
        if (onY && Math.abs(mx - r) < t) return { idx: i, edge: "e" };
      }
      return null;
    }

    function edgeCursor(edge: string) {
      if (edge === "rotate") return "grab";
      if (edge === "n" || edge === "s") return "ns-resize";
      if (edge === "e" || edge === "w") return "ew-resize";
      if (edge === "nw" || edge === "se") return "nwse-resize";
      if (edge === "ne" || edge === "sw") return "nesw-resize";
      return "";
    }

    function drawOutline(bbox: typeof curBbox) {
      const ctx = canvas!.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
      const hs = 6;
      for (const [hx, hy] of [
        [bbox.x, bbox.y], [bbox.x + bbox.w, bbox.y],
        [bbox.x, bbox.y + bbox.h], [bbox.x + bbox.w, bbox.y + bbox.h],
      ]) {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      }
      const rcx = bbox.x + bbox.w / 2;
      const rhy = bbox.y - HANDLE_OFFSET;
      ctx.beginPath();
      ctx.moveTo(rcx, bbox.y);
      ctx.lineTo(rcx, rhy);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rcx, rhy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
      ctx.fill();
    }

    function onMove(e: MouseEvent) {
      if (isRotating) {
        const coords = getCanvasCoords(canvas!, e);
        const regs = pages[currentPage]?.regions || [];
        const bbox = regs[rotatingIdx].bbox;
        const cx = bbox.x + bbox.w / 2;
        const cy = bbox.y + bbox.h / 2;
        const angle = Math.atan2(coords.x - cx, -(coords.y - cy)) * 180 / Math.PI;
        curRotation = Math.round((origRotation + (angle - startAngle)) / 2) * 2;
        const ctx = canvas!.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas!.width, canvas!.height);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(curRotation * Math.PI / 180);
          ctx.translate(-cx, -cy);
          ctx.strokeStyle = "rgba(168, 85, 247, 0.8)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);
          ctx.setLineDash([]);
          ctx.restore();
          ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${curRotation}°`, cx, bbox.y - 40);
        }
        return;
      }
      if (isDragging) {
        const coords = getCanvasCoords(canvas!, e);
        const dx = coords.x - startMouse.x;
        const dy = coords.y - startMouse.y;
        let { x, y, w, h } = { ...origBbox };
        if (hoveredEdge.includes("n")) { y += dy; h -= dy; }
        if (hoveredEdge.includes("s")) { h += dy; }
        if (hoveredEdge.includes("w")) { x += dx; w -= dx; }
        if (hoveredEdge.includes("e")) { w += dx; }
        if (w < 10) { if (hoveredEdge.includes("w")) x = origBbox.x + origBbox.w - 10; w = 10; }
        if (h < 10) { if (hoveredEdge.includes("n")) y = origBbox.y + origBbox.h - 10; h = 10; }
        curBbox = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
        drawOutline(curBbox);
        return;
      }
      const coords = getCanvasCoords(canvas!, e);
      const hit = hitTest(coords.x, coords.y);
      if (hit) {
        hoveredIdx = hit.idx;
        hoveredEdge = hit.edge;
        canvas!.style.cursor = edgeCursor(hit.edge);
        const regs = pages[currentPage]?.regions || [];
        drawOutline(regs[hit.idx].bbox);
      } else {
        hoveredIdx = -1;
        hoveredEdge = "";
        canvas!.style.cursor = "";
        const ctx = canvas!.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      }
    }

    function onDown(e: MouseEvent) {
      if (hoveredIdx < 0) return;
      e.preventDefault();
      if (hoveredEdge === "rotate") {
        isRotating = true;
        rotatingIdx = hoveredIdx;
        const coords = getCanvasCoords(canvas!, e);
        const regs = pages[currentPage]?.regions || [];
        const bbox = regs[hoveredIdx].bbox;
        const cx = bbox.x + bbox.w / 2;
        const cy = bbox.y + bbox.h / 2;
        startAngle = Math.atan2(coords.x - cx, -(coords.y - cy)) * 180 / Math.PI;
        origRotation = regs[hoveredIdx].rotation || 0;
        curRotation = origRotation;
        canvas!.style.cursor = "grabbing";
        return;
      }
      isDragging = true;
      startMouse = getCanvasCoords(canvas!, e);
      const regs = pages[currentPage]?.regions || [];
      origBbox = { ...regs[hoveredIdx].bbox };
      curBbox = { ...origBbox };
    }

    async function onUp() {
      if (isRotating) {
        isRotating = false;
        const ctx = canvas!.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas!.width, canvas!.height);
        canvas!.style.cursor = "";
        if (curRotation === origRotation) return;
        const key = `${currentPage}-${rotatingIdx}`;
        setRegionDrafts((prev) => ({
          ...prev,
          [key]: { ...prev[key], rotation: curRotation, status: undefined },
        }));
        if (!manga || !chapter) return;
        try {
          await api.updateRegion(manga, chapter, currentPage, rotatingIdx, { rotation: curRotation });
          // Optimistic update — faqat rotation field yangilash
          setData((prev) => {
            if (!prev) return prev;
            const newPages = [...prev.pages];
            const page = { ...newPages[currentPage] };
            const newRegions = [...page.regions];
            newRegions[rotatingIdx] = { ...newRegions[rotatingIdx], rotation: curRotation };
            page.regions = newRegions;
            newPages[currentPage] = page;
            return { ...prev, pages: newPages };
          });
        } catch (err) {
          setStatus(`Rotation xatolik: ${(err as Error).message}`);
        }
        return;
      }
      if (!isDragging) return;
      isDragging = false;
      const ctx = canvas!.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      canvas!.style.cursor = "";
      if (
        curBbox.x === origBbox.x && curBbox.y === origBbox.y &&
        curBbox.w === origBbox.w && curBbox.h === origBbox.h
      ) return;
      if (!manga || !chapter) return;
      try {
        const resizedIdx = hoveredIdx;
        await api.updateRegion(manga, chapter, currentPage, resizedIdx, { bbox: curBbox });
        // Optimistic update — faqat bbox field yangilash
        const newBbox = { ...curBbox };
        setData((prev) => {
          if (!prev) return prev;
          const newPages = [...prev.pages];
          const page = { ...newPages[currentPage] };
          const newRegions = [...page.regions];
          newRegions[resizedIdx] = { ...newRegions[resizedIdx], bbox: newBbox };
          page.regions = newRegions;
          newPages[currentPage] = page;
          return { ...prev, pages: newPages };
        });
      } catch (err) {
        setStatus(`Resize xatolik: ${(err as Error).message}`);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isRotating) {
          isRotating = false;
          const ctx = canvas!.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas!.width, canvas!.height);
          canvas!.style.cursor = "";
        }
        if (isDragging) {
          isDragging = false;
          const ctx = canvas!.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas!.width, canvas!.height);
          canvas!.style.cursor = "";
        }
      }
    }

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);
    document.addEventListener("keydown", onKey);
    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mouseup", onUp);
      document.removeEventListener("keydown", onKey);
      img.removeEventListener("load", syncSize);
      canvas.style.cursor = "";
    };
  }, [anyModeActive, manga, chapter, currentPage, pages, setRegionDrafts]);
}

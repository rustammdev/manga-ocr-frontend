import { useCallback, useEffect, useRef, useState } from "react";

interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImagePositionerProps {
  src: string;
  /** Target aspect ratio: width / height (e.g. 3/5 for cover, 105/62 for thumb) */
  aspectRatio: number;
  /** Preview container width in px */
  previewWidth: number;
  onCropChange: (crop: Crop) => void;
}

/**
 * Rasmni drag qilib pozitsiyasini sozlash.
 * Rasm "cover" rejimida ko'rsatiladi — konteynerga to'liq sig'adi,
 * ortiqcha qismini drag bilan siljitish mumkin.
 */
export default function ImagePositioner({
  src,
  aspectRatio,
  previewWidth,
  onCropChange,
}: ImagePositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [maxOffsetX, setMaxOffsetX] = useState(0);
  const [maxOffsetY, setMaxOffsetY] = useState(0);

  const dragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });

  // Wheel handler eng so'nggi offset/limit'larni o'qishi uchun ref orqali sinxron tutamiz.
  const offsetRef = useRef({ x: 0, y: 0 });
  const limitsRef = useRef({ mx: 0, my: 0 });

  const previewHeight = Math.round(previewWidth / aspectRatio);

  const computeLayout = useCallback(
    (nw: number, nh: number) => {
      // "Cover" — konteynerga to'liq sig'adigan scale
      const scaleX = previewWidth / nw;
      const scaleY = previewHeight / nh;
      const s = Math.max(scaleX, scaleY);

      const scaledW = nw * s;
      const scaledH = nh * s;
      const mox = Math.max(0, scaledW - previewWidth);
      const moy = Math.max(0, scaledH - previewHeight);

      setScale(s);
      setMaxOffsetX(mox);
      setMaxOffsetY(moy);
      limitsRef.current = { mx: mox, my: moy };

      // Markazga o'rnatish
      const ox = mox / 2;
      const oy = moy / 2;
      setOffsetX(ox);
      setOffsetY(oy);
      offsetRef.current = { x: ox, y: oy };

      // Initial crop
      emitCrop(ox, oy, s, nw, nh);
    },
    [previewWidth, previewHeight],
  );

  function emitCrop(ox: number, oy: number, s: number, nw: number, nh: number) {
    const cropX = Math.round(ox / s);
    const cropY = Math.round(oy / s);
    const cropW = Math.round(previewWidth / s);
    const cropH = Math.round(previewHeight / s);
    onCropChange({
      x: Math.min(cropX, nw - cropW),
      y: Math.min(cropY, nh - cropH),
      w: Math.min(cropW, nw),
      h: Math.min(cropH, nh),
    });
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNaturalW(img.naturalWidth);
    setNaturalH(img.naturalHeight);
    computeLayout(img.naturalWidth, img.naturalHeight);
  }

  // Reset on src change
  useEffect(() => {
    setOffsetX(0);
    setOffsetY(0);
  }, [src]);

  function handleMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartOffset.current = { x: offsetX, y: offsetY };
    e.preventDefault();
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = dragStartPos.current.x - e.clientX;
      const dy = dragStartPos.current.y - e.clientY;

      const newOx = Math.max(0, Math.min(maxOffsetX, dragStartOffset.current.x + dx));
      const newOy = Math.max(0, Math.min(maxOffsetY, dragStartOffset.current.y + dy));

      setOffsetX(newOx);
      setOffsetY(newOy);
      offsetRef.current = { x: newOx, y: newOy };
    },
    [maxOffsetX, maxOffsetY],
  );

  const handleMouseUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    // offsetX/offsetY stale bo'lishi mumkin, ref orqali olish kerak emas —
    // state ni useEffect bilan kuzatamiz
  }, []);

  // offsetX/offsetY o'zgarganda crop ni yuborish
  useEffect(() => {
    if (naturalW === 0 || naturalH === 0) return;
    emitCrop(offsetX, offsetY, scale, naturalW, naturalH);
  }, [offsetX, offsetY, scale, naturalW, naturalH]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Wheel/trackpad bilan oddiy scroll kabi siljitish.
  // passive:false kerak — shunda preventDefault sahifa skrollini to'xtatadi.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const { mx, my } = limitsRef.current;
      if (mx <= 0 && my <= 0) return; // siljitishga joy yo'q

      // deltaMode: 0 = pixel, 1 = line (~16px), 2 = page
      const lineHeight = 16;
      const factor = e.deltaMode === 1 ? lineHeight : e.deltaMode === 2 ? previewHeight : 1;
      let dx = e.deltaX * factor;
      let dy = e.deltaY * factor;

      // Agar gorizontal o'q yo'q va shift bosilgan bo'lsa, vertikalni gorizontalga o'tkazamiz.
      if (e.shiftKey && my <= 0) {
        dx += dy;
        dy = 0;
      }
      // Agar faqat vertikal limit bor bo'lsa — vertikal scroll vertikal siljitadi (allaqachon shunday).
      // Agar faqat gorizontal limit bor bo'lsa — vertikal wheel'ni gorizontalga aylantiramiz.
      if (mx > 0 && my <= 0 && dx === 0 && dy !== 0) {
        dx = dy;
        dy = 0;
      }

      const cur = offsetRef.current;
      const newOx = Math.max(0, Math.min(mx, cur.x + dx));
      const newOy = Math.max(0, Math.min(my, cur.y + dy));

      // Faqat haqiqatan o'zgarish bo'lsa preventDefault qilamiz —
      // chetga yetganda sahifa scroll'iga ruxsat beramiz.
      if (newOx !== cur.x || newOy !== cur.y) {
        e.preventDefault();
        offsetRef.current = { x: newOx, y: newOy };
        setOffsetX(newOx);
        setOffsetY(newOy);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [previewHeight]);

  const canDrag = maxOffsetX > 0 || maxOffsetY > 0;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-md border bg-black"
      style={{
        width: previewWidth,
        height: previewHeight,
        cursor: canDrag ? "grab" : "default",
      }}
      onMouseDown={canDrag ? handleMouseDown : undefined}
    >
      <img
        ref={imgRef}
        src={src}
        draggable={false}
        className="absolute select-none"
        style={{
          width: naturalW * scale,
          height: naturalH * scale,
          left: -offsetX,
          top: -offsetY,
        }}
        onLoad={handleImageLoad}
      />
      {canDrag && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-1.5">
          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/70">
            Scroll yoki surib joylashtiring
          </span>
        </div>
      )}
    </div>
  );
}

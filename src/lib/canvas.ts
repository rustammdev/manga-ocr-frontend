import type { Region } from "./types";

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
      continue;
    }
    if (current) lines.push(current);
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
    } else {
      let chunk = "";
      for (const ch of word) {
        const chunkTest = chunk + ch;
        if (ctx.measureText(chunkTest).width <= maxWidth) {
          chunk = chunkTest;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildFontString(
  fontStyle: string,
  fontWeight: string,
  fontSize: number,
  fontFamily: string,
): string {
  // CSS font shorthand: [style] [weight] size family
  const style = fontStyle === "italic" ? "italic" : "normal";
  const weight = fontWeight === "normal" ? "400" : "bold";
  return `${style} ${weight} ${fontSize}px '${fontFamily}', 'Comic Neue', sans-serif`;
}

/**
 * OCR bbox asosida rendering box hisoblaydi.
 * Agar bubble_bbox bor va OCR box ancha kichik bo'lsa,
 * OCR box ni bubble yo'nalishida biroz kattalashtiradi.
 */
function computeRenderBox(
  bbox: { x: number; y: number; w: number; h: number },
  bubbleBbox?: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  if (!bubbleBbox) return bbox;

  const areaRatio = (bbox.w * bbox.h) / Math.max(1, bubbleBbox.w * bubbleBbox.h);

  // OCR box bubble ning 40% dan kam bo'lsa — biroz kattalashtirish
  if (areaRatio >= 0.4) return bbox;

  const expandFactor = 0.3;
  const dw = (bubbleBbox.w - bbox.w) * expandFactor;
  const dh = (bubbleBbox.h - bbox.h) * expandFactor;

  let x = Math.round(bbox.x - dw / 2);
  let y = Math.round(bbox.y - dh / 2);
  let w = Math.round(bbox.w + dw);
  let h = Math.round(bbox.h + dh);

  // bubble chegarasidan chiqmasin
  x = Math.max(bubbleBbox.x, x);
  y = Math.max(bubbleBbox.y, y);
  w = Math.min(bubbleBbox.x + bubbleBbox.w - x, w);
  h = Math.min(bubbleBbox.y + bubbleBbox.h - y, h);

  return { x, y, w, h };
}

export function drawTranslatedTexts(ctx: CanvasRenderingContext2D, regions: Region[]) {
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  regions.forEach((r) => {
    if (!r.uz_text) return;
    const text = r.uz_text.toUpperCase().trim();
    if (!text) return;

    // OCR bbox asosiy rendering box, zarur bo'lsa biroz kattalashtiriladi
    const box = computeRenderBox(r.bbox, r.bubble_bbox);
    const padding = 4;
    const boxWidth = Math.max(10, box.w);
    const boxHeight = Math.max(10, box.h);
    const maxWidth = Math.max(10, boxWidth - padding * 2);
    const maxHeight = Math.max(10, boxHeight - padding * 2);

    const fontWeight = r.font_weight || "bold";
    const fontStyle = r.font_style || "normal";
    const fontFamily = r.font_family || "Comic Neue";

    // So'z soniga qarab max font chegarasi
    const wordCount = text.split(/\s+/).length;
    const maxFontByWords = wordCount <= 2 ? 48 : wordCount === 3 ? 42 : 36;
    const MIN_FONT = 20;

    let fontSize: number;
    if (r.font_size) {
      fontSize = r.font_size;
    } else {
      fontSize = Math.floor(Math.min(maxFontByWords, Math.max(MIN_FONT, boxHeight * 0.45)));
    }
    ctx.font = buildFontString(fontStyle, fontWeight, fontSize, fontFamily);
    let lines = wrapText(ctx, text, maxWidth);
    let lineHeight = Math.floor(fontSize * 1.2);

    // Matn sig'maguncha font kichraytiriladi, lekin 20px dan pastga tushmaydi
    while (fontSize > MIN_FONT && lines.length * lineHeight > maxHeight) {
      fontSize -= 1;
      lineHeight = Math.floor(fontSize * 1.2);
      ctx.font = buildFontString(fontStyle, fontWeight, fontSize, fontFamily);
      lines = wrapText(ctx, text, maxWidth);
    }

    const totalTextHeight = lines.length * lineHeight;
    const startY = box.y + padding + Math.max(0, (maxHeight - totalTextHeight) / 2);

    ctx.save();
    const rot = r.rotation || 0;
    if (rot) {
      const cx = box.x + boxWidth / 2;
      const cy = box.y + boxHeight / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rot * Math.PI / 180);
      ctx.translate(-cx, -cy);
    }
    ctx.beginPath();
    ctx.rect(box.x, box.y, boxWidth, boxHeight);
    ctx.clip();
    const fontColor = r.font_color || "#111827";
    const strokeColor = r.font_stroke_color || "";
    const strokeWidth = r.font_stroke_width || 0;
    const centerX = box.x + boxWidth / 2;

    // Stroke (hoshiya) — matn chekkasi
    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth * 2;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      lines.forEach((line, idx) => {
        ctx.strokeText(line, centerX, startY + idx * lineHeight);
      });
    }

    // Fill — asosiy matn rangi
    ctx.fillStyle = fontColor.startsWith("#") ? fontColor : `rgba(17, 24, 39, 0.92)`;
    lines.forEach((line, idx) => {
      ctx.fillText(line, centerX, startY + idx * lineHeight);
    });
    ctx.restore();
  });
}

/**
 * Sahifani yuqori sifatda export qilish uchun — rasm + matn overlay
 * Fontlar yuklangandan keyin chaqirilishi kerak
 */
export async function renderPageForExport(
  imageUrl: string,
  regions: Region[],
): Promise<HTMLCanvasElement> {
  // Fontlar tayyor bo'lishini kutish
  await document.fonts.ready;

  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  drawTranslatedTexts(ctx, regions);
  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

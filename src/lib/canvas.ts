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
 * OCR bbox asosida rendering box hisoblaydi (smart-expand).
 *
 * Strategiya backend `compute_render_bbox` bilan mos:
 * 1. OCR box bubble area'ning yarmidan kam bo'lsa — kattalashtiriladi.
 * 2. Default 50% nisbatida kengaytiriladi.
 * 3. Matn berilgan bo'lsa, `preferredMinFont` (18px) da sig'maguncha
 *    bubble yo'nalishida progressiv kengaytiriladi.
 */
const PREFERRED_MIN_FONT = 18;
const FILL_RATIO = 0.92;

function expandBoxWithinBubble(
  ocr: { x: number; y: number; w: number; h: number },
  bubble: { x: number; y: number; w: number; h: number },
  factor: number,
): { x: number; y: number; w: number; h: number } {
  const f = Math.max(0, Math.min(1, factor));
  const dw = (bubble.w - ocr.w) * f;
  const dh = (bubble.h - ocr.h) * f;
  let x = Math.round(ocr.x - dw / 2);
  let y = Math.round(ocr.y - dh / 2);
  let w = Math.round(ocr.w + dw);
  let h = Math.round(ocr.h + dh);
  x = Math.max(bubble.x, x);
  y = Math.max(bubble.y, y);
  w = Math.min(bubble.x + bubble.w - x, w);
  h = Math.min(bubble.y + bubble.h - y, h);
  return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

function textFitsInBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  fontStyle: string,
  boxW: number,
  boxH: number,
): boolean {
  const usableW = Math.floor(boxW * FILL_RATIO);
  const usableH = Math.floor(boxH * FILL_RATIO);
  if (usableW <= 0 || usableH <= 0) return false;
  ctx.save();
  ctx.font = buildFontString(fontStyle, fontWeight, fontSize, fontFamily);
  const lines = wrapText(ctx, text, usableW);
  const lineHeight = Math.floor(fontSize * 1.2);
  let fits = lines.length * lineHeight <= usableH;
  if (fits) {
    for (const line of lines) {
      if (ctx.measureText(line).width > usableW) {
        fits = false;
        break;
      }
    }
  }
  ctx.restore();
  return fits;
}

function computeRenderBox(
  ctx: CanvasRenderingContext2D,
  bbox: { x: number; y: number; w: number; h: number },
  bubbleBbox?: { x: number; y: number; w: number; h: number },
  text?: string,
  fontFamily: string = "Comic Neue",
  fontWeight: string = "bold",
  fontStyle: string = "normal",
): { x: number; y: number; w: number; h: number } {
  if (!bubbleBbox || bubbleBbox.w <= 0 || bubbleBbox.h <= 0) return bbox;

  const areaRatio = (bbox.w * bbox.h) / Math.max(1, bubbleBbox.w * bubbleBbox.h);
  const needsExpand = areaRatio < 0.5;

  let box = needsExpand ? expandBoxWithinBubble(bbox, bubbleBbox, 0.5) : bbox;

  const measureText = (text || "").trim();
  if (!measureText) return box;

  // Matn `preferredMinFont` da sig'sa — shu bilan tugatiladi
  if (textFitsInBox(ctx, measureText, PREFERRED_MIN_FONT, fontFamily, fontWeight, fontStyle, box.w, box.h)) {
    return box;
  }

  // Sig'masa — bubble yo'nalishida binary search bilan kengaytirish
  if (bubbleBbox.w <= bbox.w && bubbleBbox.h <= bbox.h) {
    return box;
  }
  let lo = 0;
  let hi = 1;
  // hozirgi factor ni baholash
  if (bubbleBbox.w > bbox.w) {
    lo = Math.max(0, (box.w - bbox.w) / (bubbleBbox.w - bbox.w));
  } else if (bubbleBbox.h > bbox.h) {
    lo = Math.max(0, (box.h - bbox.h) / (bubbleBbox.h - bbox.h));
  }
  let best = expandBoxWithinBubble(bbox, bubbleBbox, hi);
  if (!textFitsInBox(ctx, measureText, PREFERRED_MIN_FONT, fontFamily, fontWeight, fontStyle, best.w, best.h)) {
    return best;
  }
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const candidate = expandBoxWithinBubble(bbox, bubbleBbox, mid);
    if (textFitsInBox(ctx, measureText, PREFERRED_MIN_FONT, fontFamily, fontWeight, fontStyle, candidate.w, candidate.h)) {
      best = candidate;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

export function drawTranslatedTexts(ctx: CanvasRenderingContext2D, regions: Region[]) {
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  regions.forEach((r) => {
    if (!r.uz_text) return;
    const text = r.uz_text.toUpperCase().trim();
    if (!text) return;

    const fontWeight = r.font_weight || "bold";
    const fontStyle = r.font_style || "normal";
    const fontFamily = r.font_family || "Comic Neue";

    // OCR bbox asosiy rendering box, matnga moslab smart-expand qilinadi
    const box = computeRenderBox(ctx, r.bbox, r.bubble_bbox, text, fontFamily, fontWeight, fontStyle);
    const padding = 4;
    const boxWidth = Math.max(10, box.w);
    const boxHeight = Math.max(10, box.h);
    const maxWidth = Math.max(10, boxWidth - padding * 2);
    const maxHeight = Math.max(10, boxHeight - padding * 2);

    // So'z soniga qarab max font chegarasi
    const wordCount = text.split(/\s+/).length;
    const maxFontByWords = wordCount <= 2 ? 48 : wordCount === 3 ? 42 : 36;
    const MIN_FONT = 10;
    const PREFERRED_MIN = PREFERRED_MIN_FONT;

    let fontSize: number;
    if (r.font_size) {
      fontSize = r.font_size;
    } else {
      fontSize = Math.floor(Math.min(maxFontByWords, Math.max(PREFERRED_MIN, boxHeight * 0.45)));
    }
    ctx.font = buildFontString(fontStyle, fontWeight, fontSize, fontFamily);
    let lines = wrapText(ctx, text, maxWidth);
    let lineHeight = Math.floor(fontSize * 1.2);

    // Vertikal yoki gorizontal sig'magunicha font kichraytiriladi.
    // Smart-expand bilan box matnga moslangan, shuning uchun PREFERRED_MIN
    // gacha tushish kerak emas, lekin uzun matn (7+ so'z) uchun absolyut
    // minimum gacha tushish ruxsat etiladi.
    const overflows = () => {
      if (lines.length * lineHeight > maxHeight) return true;
      for (const line of lines) {
        if (ctx.measureText(line).width > maxWidth) return true;
      }
      return false;
    };
    const minAllowed = wordCount <= 6 ? PREFERRED_MIN : MIN_FONT;
    while (fontSize > minAllowed && overflows()) {
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
    // Faqat burchaksiz matnda clip qilamiz — backend renderer burilgan matnni
    // alohida layer'da expand=True bilan chizadi (kesmaydi). Editor preview va
    // publish natijasi bir xil bo'lishi uchun burchakli regionда clip o'chiriladi.
    if (!rot) {
      ctx.beginPath();
      ctx.rect(box.x, box.y, boxWidth, boxHeight);
      ctx.clip();
    }
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

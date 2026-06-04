import type { Region } from "./types";

/**
 * Matnni qatorlarga ajratadi. Avval ANIQ yangi qatorlar (\n) bo'yicha
 * bo'linadi (status/info panellardagi maʼnoli qator tuzilishini saqlaydi),
 * so'ng har segment box kengligiga sig'maguncha word-wrap qilinadi.
 * Backend `typesetter._wrap_text` bilan mos.
 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const segment of text.split("\n")) {
    if (!segment.trim()) {
      lines.push("");
      continue;
    }
    for (const ln of wrapSegment(ctx, segment, maxWidth)) lines.push(ln);
  }
  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function wrapSegment(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
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
  return `${style} ${weight} ${fontSize}px '${fontFamily}', 'Anime Ace', sans-serif`;
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

// Bubble ICHIDAGI xavfsiz matn zonasi (ellipsga ichki to'rtburchak). Backend
// `typesetter.bubble_text_zone` bilan mos: nutq pufagi ELLIPS, matn
// to'rtburchak chetigacha to'ldirilsa burchaklarda kontur ustiga chiqib
// ketadi. Shuning uchun matn bubble markazidagi shu nisbatdagi to'rtburchakka
// joylanadi.
const BUBBLE_TEXT_ZONE = 0.82;

// Avto font sizing chegaralari. Matn bubble bo'sh joyini TO'LDIRISHI uchun
// font yuqoriga ham o'sadi (faqat kichraymaydi). Bu chegaralar matn bubble'ni
// to'ldirib, lekin SFX kabi ulkan bo'lib ketmasligi uchun.
const AUTO_MIN_FONT = 14;
const AUTO_MAX_FONT = 72;

type Align = "left" | "center" | "right";

/**
 * Region uchun matn tekislashini aniqlaydi (backend `_resolve_align` bilan mos).
 *
 * `text_align` faqat ISHONCHLI manbalardan keladi: foydalanuvchi qo'lda
 * o'rnatgan yoki OCR qator geometriyasidan aniqlangan (backend save bosqichida
 * `detect_text_align_from_lines`). Bu yerda hech qanday taxmin qilinmaydi —
 * `text_align` yo'q bo'lsa markaz (oddiy dialog bubble'lar uchun to'g'ri).
 */
function resolveAlign(r: Region): Align {
  if (r.text_align === "left" || r.text_align === "center" || r.text_align === "right") {
    return r.text_align;
  }
  return "center";
}

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
  fontFamily: string = "Anime Ace",
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

/**
 * Bubble ICHIDAGI xavfsiz matn zonasi (ellipsga ichki to'rtburchak).
 * Backend `typesetter.bubble_text_zone` bilan mos.
 */
function bubbleTextZone(
  bubble: { x: number; y: number; w: number; h: number },
  ocr: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const cx = bubble.x + bubble.w / 2;
  const cy = bubble.y + bubble.h / 2;
  let zw = bubble.w * BUBBLE_TEXT_ZONE;
  let zh = bubble.h * BUBBLE_TEXT_ZONE;
  // Asl matn (OCR) zonadan kattaroq bo'lsa — zonani kengaytamiz (matn sig'sin),
  // lekin bubble'dan oshmasin.
  zw = Math.min(Math.max(zw, ocr.w), bubble.w);
  zh = Math.min(Math.max(zh, ocr.h), bubble.h);
  const x = Math.max(bubble.x, Math.round(cx - zw / 2));
  const y = Math.max(bubble.y, Math.round(cy - zh / 2));
  const w = Math.min(bubble.x + bubble.w - x, Math.round(zw));
  const h = Math.min(bubble.y + bubble.h - y, Math.round(zh));
  return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

/**
 * Berilgan box ichiga (fill_ratio bilan) SIG'ADIGAN ENG KATTA font hajmini
 * binary-search bilan topadi. Matn box'ni TO'LDIRADI — kichik OCR/bubble'da
 * kichrayadi, katta bubble'da kattalashadi. Backend `calculate_font_size`
 * mantiqiga mos (lekin manba-balandlik cheklovisiz: matn doim bubble'ni
 * to'ldiradi).
 */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  boxW: number,
  boxH: number,
  fontFamily: string,
  fontWeight: string,
  fontStyle: string,
  minFont: number,
  maxFont: number,
): number {
  const usableW = Math.floor(boxW * FILL_RATIO);
  const usableH = Math.floor(boxH * FILL_RATIO);
  if (usableW <= 0 || usableH <= 0) return minFont;

  const fits = (size: number): boolean => {
    ctx.font = buildFontString(fontStyle, fontWeight, size, fontFamily);
    const lines = wrapText(ctx, text, usableW);
    if (!lines.length) return true;
    const lineHeight = Math.floor(size * 1.2);
    if (lines.length * lineHeight > usableH) return false;
    for (const line of lines) {
      if (ctx.measureText(line).width > usableW) return false;
    }
    return true;
  };

  let lo = minFont;
  let hi = maxFont;
  let best = minFont;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export function drawTranslatedTexts(ctx: CanvasRenderingContext2D, regions: Region[]) {
  ctx.textBaseline = "top";

  regions.forEach((r) => {
    if (!r.uz_text) return;
    const text = r.uz_text.toUpperCase().trim();
    if (!text) return;

    const fontWeight = r.font_weight || "bold";
    const fontStyle = r.font_style || "normal";
    const fontFamily = r.font_family || "Anime Ace";
    const align = resolveAlign(r);

    // Layout box'ni tanlash:
    //  - Foydalanuvchi box'ni QO'LDA resize qilgan bo'lsa (`bbox_manual`) —
    //    AYNAN o'sha `r.bbox` ishlatiladi va `fitFontSize` uni to'ldiradi
    //    (box kattalashsa matn kattalashadi, kichraysa kichrayadi).
    //  - Aks holda, haqiqiy bubble bor bo'lsa — matn bubble ichidagi xavfsiz
    //    zonaga avto-fill qilinadi (bubble bo'sh joyini to'ldiradi).
    //  - Bubble yo'q (Apple Vision) bo'lsa — OCR bbox matnga moslab kengayadi.
    const hasRealBubble =
      !!r.bubble_bbox &&
      r.bubble_bbox.w > 0 &&
      r.bubble_bbox.h > 0 &&
      !(r.bubble_bbox.w === r.bbox.w && r.bbox.h === r.bubble_bbox.h);

    let box: { x: number; y: number; w: number; h: number };
    if (r.bbox_manual) {
      box = r.bbox;
    } else if (hasRealBubble) {
      box = bubbleTextZone(r.bubble_bbox!, r.bbox);
    } else {
      box = computeRenderBox(ctx, r.bbox, r.bubble_bbox, text, fontFamily, fontWeight, fontStyle);
    }

    const padding = 4;
    const boxWidth = Math.max(10, box.w);
    const boxHeight = Math.max(10, box.h);
    const maxWidth = Math.max(10, boxWidth - padding * 2);
    const maxHeight = Math.max(10, boxHeight - padding * 2);

    const MIN_FONT = 8;

    // Font hajmi:
    //  - Foydalanuvchi QO'LDA o'rnatgan bo'lsa (font_size_manual) — o'shani
    //    ishlatamiz (faqat sig'maguncha kichraytiriladi).
    //  - Aks holda — matn box'ni TO'LDIRADIGAN eng katta font AVTO tanlanadi
    //    (bubble katta bo'lsa katta, kichik bo'lsa kichik). Saqlangan avto
    //    `font_size` e'tiborga olinmaydi — har doim qaytadan hisoblanadi,
    //    shunda bubble bo'sh joyi to'ladi va o'lcham izchil bo'ladi.
    let fontSize: number;
    if (r.font_size && r.font_size_manual) {
      fontSize = r.font_size;
    } else {
      fontSize = fitFontSize(
        ctx,
        text,
        boxWidth,
        boxHeight,
        fontFamily,
        fontWeight,
        fontStyle,
        AUTO_MIN_FONT,
        AUTO_MAX_FONT,
      );
    }
    ctx.font = buildFontString(fontStyle, fontWeight, fontSize, fontFamily);
    let lines = wrapText(ctx, text, maxWidth);
    let lineHeight = Math.floor(fontSize * 1.2);

    // Vertikal yoki gorizontal sig'magunicha font kichraytiriladi (xavfsizlik
    // chegarasi — manual qiymat juda katta bo'lsa ham box'dan chiqmaydi).
    const overflows = () => {
      if (lines.length * lineHeight > maxHeight) return true;
      for (const line of lines) {
        if (ctx.measureText(line).width > maxWidth) return true;
      }
      return false;
    };
    const minAllowed = MIN_FONT;
    while (fontSize > minAllowed && overflows()) {
      fontSize -= 1;
      lineHeight = Math.floor(fontSize * 1.2);
      ctx.font = buildFontString(fontStyle, fontWeight, fontSize, fontFamily);
      lines = wrapText(ctx, text, maxWidth);
    }

    const totalTextHeight = lines.length * lineHeight;
    const startY = box.y + padding + Math.max(0, (maxHeight - totalTextHeight) / 2);

    // Tekislash bo'yicha x-anchor + textAlign
    let anchorX: number;
    if (align === "left") {
      anchorX = box.x + padding;
      ctx.textAlign = "left";
    } else if (align === "right") {
      anchorX = box.x + boxWidth - padding;
      ctx.textAlign = "right";
    } else {
      anchorX = box.x + boxWidth / 2;
      ctx.textAlign = "center";
    }

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
    // alohida layer'da expand=True bilan chizadi (kesmaydi).
    if (!rot) {
      ctx.beginPath();
      ctx.rect(box.x, box.y, boxWidth, boxHeight);
      ctx.clip();
    }
    const fontColor = r.font_color || "#111827";
    const strokeColor = r.font_stroke_color || "";
    const strokeWidth = r.font_stroke_width || 0;

    // Stroke (hoshiya) — matn chekkasi
    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth * 2;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      lines.forEach((line, idx) => {
        ctx.strokeText(line, anchorX, startY + idx * lineHeight);
      });
    }

    // Fill — asosiy matn rangi
    ctx.fillStyle = fontColor.startsWith("#") ? fontColor : `rgba(17, 24, 39, 0.92)`;
    lines.forEach((line, idx) => {
      ctx.fillText(line, anchorX, startY + idx * lineHeight);
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

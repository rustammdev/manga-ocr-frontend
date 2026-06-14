import type { Region } from "./types";

// ── O'zbekcha bo'g'in-asosli so'z ko'chirish (hyphenation) ──────────────────
// Backend `uz_hyphen.py` bilan AYNAN bir xil mantiq. Uzun so'z qatorga
// sig'masa harf bo'yicha keskin bo'lish o'rniga o'zbek bo'g'in qoidasi bilan
// ("-" bo'g'in chegarasida) ko'chiriladi.
const UZ_VOWELS = new Set("aeiouAEIOU".split(""));
const UZ_APOSTROPHES = ["'", "\u2019", "\u02bc", "`"];
const UZ_CONS_DIGRAPHS = ["ch", "sh"];

function uzTokenize(word: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const n = word.length;
  while (i < n) {
    const lower = word[i].toLowerCase();
    if (i + 1 < n && (lower === "o" || lower === "g") && UZ_APOSTROPHES.includes(word[i + 1])) {
      tokens.push(word.slice(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 1 < n && UZ_CONS_DIGRAPHS.includes(word.slice(i, i + 2).toLowerCase())) {
      tokens.push(word.slice(i, i + 2));
      i += 2;
      continue;
    }
    tokens.push(word[i]);
    i += 1;
  }
  return tokens;
}

function uzIsVowel(token: string): boolean {
  if (token.length === 1) return UZ_VOWELS.has(token);
  return token.toLowerCase().startsWith("o");
}

function uzbekSyllabify(word: string): string[] {
  const tokens = uzTokenize(word);
  const n = tokens.length;
  if (n === 0) return [];

  const vowelPos: number[] = [];
  tokens.forEach((t, idx) => {
    if (uzIsVowel(t)) vowelPos.push(idx);
  });
  if (vowelPos.length === 0) return [word];

  const cuts = [0];
  for (let k = 0; k < vowelPos.length - 1; k++) {
    const v1 = vowelPos[k];
    const v2 = vowelPos[k + 1];
    const gap = v2 - v1 - 1; // orasidagi undosh TOKENLAR soni
    cuts.push(gap <= 1 ? v1 + 1 : v1 + 2);
  }
  cuts.push(n);
  const uniqueCuts = Array.from(new Set(cuts)).sort((a, b) => a - b);
  const syllables: string[] = [];
  for (let i = 0; i < uniqueCuts.length - 1; i++) {
    syllables.push(tokens.slice(uniqueCuts[i], uniqueCuts[i + 1]).join(""));
  }
  return syllables;
}

/**
 * Uzun so'zni bo'g'inlar bo'yicha bo'laklarga ajratadi (ko'chirish).
 * `fits` — matn qatorga sig'adimi. Ko'chirilgan bo'lakka "-" qo'shiladi.
 * Bo'g'in bilan sig'dirib bo'lmasa [] (chaqiruvchi harf-fallbackka tushadi).
 * Backend `uz_hyphen.break_word_uzbek` bilan mos.
 */
function breakWordUzbek(word: string, fits: (t: string) => boolean): string[] {
  const syllables = uzbekSyllabify(word);
  if (syllables.length < 2) return [];

  const pieces: string[] = [];
  let idx = 0;
  const n = syllables.length;
  let guard = 0;
  while (idx < n && guard < 60) {
    guard += 1;
    let bestJ: number | null = null;
    for (let j = n; j > idx; j--) {
      const chunk = syllables.slice(idx, j).join("");
      const isLast = j === n;
      const test = isLast ? chunk : chunk + "-";
      if (fits(test)) {
        bestJ = j;
        break;
      }
    }
    if (bestJ === null) return [];
    const isLast = bestJ === n;
    const chunk = syllables.slice(idx, bestJ).join("");
    pieces.push(isLast ? chunk : chunk + "-");
    idx = bestJ;
  }
  return pieces;
}

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
      // Uzun so'z — avval O'ZBEKCHA bo'g'in-ko'chirish, bo'lmasa harflar
      // bo'yicha bo'laklash (backend `typesetter._wrap_segment` bilan mos).
      let chunks = breakWordUzbek(word, (t) => ctx.measureText(t).width <= maxWidth);
      if (!chunks.length) {
        chunks = [];
        let chunk = "";
        for (const ch of word) {
          const chunkTest = chunk + ch;
          if (ctx.measureText(chunkTest).width <= maxWidth || !chunk) {
            chunk = chunkTest;
          } else {
            chunks.push(chunk);
            chunk = ch;
          }
        }
        if (chunk) chunks.push(chunk);
      }
      for (const piece of chunks.slice(0, -1)) lines.push(piece);
      current = chunks.length ? chunks[chunks.length - 1] : "";
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

// Apple Vision (built-in) detektori `bubble_bbox`ni OCR bbox'ga TENG qilib
// beradi — haqiqiy pufak yo'q. Bunday holda OCR box atrofida "virtual pufak"
// yaratamiz, shunda matn o'qishga qulay hajmga kengayadi.
//
// MUHIM: kengaytirish VERTIKAL (tepa-past) ustun bo'lishi kerak. Nutq pufagi
// odatda yumaloq/baland — OCR box eni ≈ pufakdagi matn ustuni eni. Eni KO'P
// kengaytirilsa, matn pufak chetidan YONGA chiqib ketadi. Tepa-pastda esa joy
// ko'p. Shuning uchun enini kam (×1.3), bo'yini ko'p (×2.8) kengaytiramiz:
// uzunroq o'zbekcha tarjima ko'proq QATORGA bo'linadi va vertikal joyni
// to'ldiradi, font kattalashadi, lekin yon tomonga chiqmaydi.
const SYNTH_EXPAND_W = 1.2; // eni eng ko'pi bilan +20% (yonga chiqmaslik uchun)
const SYNTH_EXPAND_H = 2.2; // bo'yi eng ko'pi bilan +120% (tepa-past bo'sh joy)

// Bubble ICHIDAGI xavfsiz matn zonasi (ellipsga ichki to'rtburchak). Backend
// `typesetter.bubble_text_zone` bilan mos: nutq pufagi ELLIPS, matn
// to'rtburchak chetigacha to'ldirilsa burchaklarda kontur ustiga chiqib
// ketadi. Shuning uchun matn bubble markazidagi shu nisbatdagi to'rtburchakka
// joylanadi.
const BUBBLE_TEXT_ZONE = 0.82;

// Avto font sizing chegaralari. Matn bubble bo'sh joyini TO'LDIRISHI uchun
// font yuqoriga ham o'sadi (faqat kichraymaydi).
//
// `AUTO_MAX_FONT` — qatʼiy yuqori chegara EMAS. Asl cheklov box balandligi:
// bitta qator `1.2 * size` balandlikni egallaydi, shuning uchun font box
// balandligidan oshib keta olmaydi. Avval bu 72px qatʼiy edi — natijada KATTA
// bubble'larda matn 72px da to'xtab, pufak ichida juda kichik ko'rinardi.
// Endi haqiqiy chegara box o'lchamidan kelib chiqib hisoblanadi (`maxFontForBox`).
const AUTO_MIN_FONT = 14;
const AUTO_MAX_FONT = 72;
// Yuqori xavfsizlik tomi (SFX kabi ulkan bo'lib ketmasligi uchun).
const AUTO_FONT_HARD_CAP = 240;

/**
 * Box uchun mantiqiy maksimal font: bitta qator box balandligiga sig'ishi
 * kerak (`1.2 * size <= FILL_RATIO * h`), shuning uchun font box balandligidan
 * oshib ketolmaydi. Bu KATTA bubble'larda matnning to'liq o'sishiga imkon
 * beradi (oldingi 72px qatʼiy cheklov olib tashlandi).
 */
function maxFontForBox(boxW: number, boxH: number): number {
  void boxW;
  const byHeight = Math.floor((boxH * FILL_RATIO) / 1.2);
  return Math.max(AUTO_MIN_FONT, Math.min(AUTO_FONT_HARD_CAP, Math.max(AUTO_MAX_FONT, byHeight)));
}

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

/**
 * OCR bbox atrofida sintetik "virtual bubble" — backend `_synthetic_bubble`
 * bilan mos. Markaz saqlanadi (matn original joyida qoladi), `imageSize`
 * berilsa rasm chegarasiga moslanadi.
 */
function syntheticBubble(
  ocr: { x: number; y: number; w: number; h: number },
  imageSize?: { w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  let newW = Math.max(ocr.w, Math.round(ocr.w * SYNTH_EXPAND_W));
  let newH = Math.max(ocr.h, Math.round(ocr.h * SYNTH_EXPAND_H));
  let x = Math.round(ocr.x - (newW - ocr.w) / 2);
  let y = Math.round(ocr.y - (newH - ocr.h) / 2);
  if (imageSize) {
    x = Math.max(0, Math.min(x, Math.max(0, imageSize.w - 1)));
    y = Math.max(0, Math.min(y, Math.max(0, imageSize.h - 1)));
    newW = Math.min(newW, imageSize.w - x);
    newH = Math.min(newH, imageSize.h - y);
  } else {
    x = Math.max(0, x);
    y = Math.max(0, y);
  }
  return { x, y, w: Math.max(1, newW), h: Math.max(1, newH) };
}

function computeRenderBox(
  ctx: CanvasRenderingContext2D,
  bbox: { x: number; y: number; w: number; h: number },
  bubbleBbox?: { x: number; y: number; w: number; h: number },
  text?: string,
  fontFamily: string = "Anime Ace",
  fontWeight: string = "bold",
  fontStyle: string = "normal",
  imageSize?: { w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const measureText = (text || "").trim();

  const realBubble =
    !!bubbleBbox &&
    bubbleBbox.w > 0 &&
    bubbleBbox.h > 0 &&
    !(bubbleBbox.w === bbox.w && bubbleBbox.h === bbox.h);

  // "Ish pufagi"ni tanlash (backend `compute_render_bbox` bilan mos):
  //  - Haqiqiy, OCR'dan kattaroq pufak — o'shani ishlatamiz (eski xulq:
  //    OCR juda kichik bo'lsa darhol 50% sakraymiz).
  //  - Aks holda (pufak yo'q yoki OCR'ga teng — Apple Vision) va matn bor —
  //    OCR atrofida SINTETIK virtual pufak yaratamiz (sakrashsiz).
  //  - Matn ham, kengaytiradigan pufak ham yo'q — OCR bbox o'zgarmaydi.
  let workBubble: { x: number; y: number; w: number; h: number };
  let isSynthetic: boolean;
  if (realBubble) {
    workBubble = bubbleBbox!;
    isSynthetic = false;
  } else if (measureText) {
    workBubble = syntheticBubble(bbox, imageSize);
    isSynthetic = true;
  } else {
    return bbox;
  }

  let box: { x: number; y: number; w: number; h: number };
  if (!isSynthetic) {
    const areaRatio = (bbox.w * bbox.h) / Math.max(1, workBubble.w * workBubble.h);
    box = areaRatio < 0.5 ? expandBoxWithinBubble(bbox, workBubble, 0.5) : bbox;
  } else {
    box = bbox;
  }

  if (!measureText) return box;

  // Matn `preferredMinFont` da sig'sa — shu bilan tugatiladi
  if (textFitsInBox(ctx, measureText, PREFERRED_MIN_FONT, fontFamily, fontWeight, fontStyle, box.w, box.h)) {
    return box;
  }

  // Sig'masa — pufak yo'nalishida binary search bilan kengaytirish
  if (workBubble.w <= bbox.w && workBubble.h <= bbox.h) {
    return box;
  }
  let lo = 0;
  let hi = 1;
  // hozirgi factor ni baholash
  if (workBubble.w > bbox.w) {
    lo = Math.max(0, (box.w - bbox.w) / (workBubble.w - bbox.w));
  } else if (workBubble.h > bbox.h) {
    lo = Math.max(0, (box.h - bbox.h) / (workBubble.h - bbox.h));
  }
  let best = expandBoxWithinBubble(bbox, workBubble, hi);
  if (!textFitsInBox(ctx, measureText, PREFERRED_MIN_FONT, fontFamily, fontWeight, fontStyle, best.w, best.h)) {
    return best;
  }
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const candidate = expandBoxWithinBubble(bbox, workBubble, mid);
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

type LayoutBox = { x: number; y: number; w: number; h: number };

/**
 * QO'SHNI / BIRIKKAN bubble'lar matn-zonalari bir-biriga kirib ketgan bo'lsa,
 * ularni o'zaro KESADI. Ikki bubble bir tomoni bilan tutashgan (yoki backend
 * ularni biroz kengroq to'rtburchak bilan bergan) holatda matn-zonalar
 * ustma-ust tushib, matn bir-birining ustiga chiqib ketardi. Bu funksiya har
 * juft kesishuvchi box uchun kesishuv to'rtburchagini topib, KICHIKROQ
 * o'qicha (gorizontal yoki vertikal) ikkala box chekkasini kesishuv o'rta
 * chizig'igacha qisqartiradi — natijada box'lar tegib turadi, lekin ustma-ust
 * tushmaydi.
 *
 * Faqat AVTO box'larga taʼsir qiladi; foydalanuvchi qo'lda qo'ygan box
 * (`manualBox`) o'zgarmaydi (lekin qo'shnisini undan uzoqlashtirishi mumkin).
 */
function resolveBoxOverlaps(
  laid: Array<{ box: LayoutBox; manualBox: boolean }>,
): void {
  const MIN_DIM = 12; // box bundan kichrayib ketmasin
  for (let i = 0; i < laid.length; i++) {
    for (let j = i + 1; j < laid.length; j++) {
      const a = laid[i];
      const b = laid[j];
      const A = a.box;
      const B = b.box;

      const ix = Math.max(A.x, B.x);
      const iy = Math.max(A.y, B.y);
      const ir = Math.min(A.x + A.w, B.x + B.w);
      const ib = Math.min(A.y + A.h, B.y + B.h);
      const ow = ir - ix; // kesishuv kengligi
      const oh = ib - iy; // kesishuv balandligi
      if (ow <= 0 || oh <= 0) continue; // kesishmaydi

      // Ikkala box ham qo'lda — tegmaymiz.
      if (a.manualBox && b.manualBox) continue;

      const aCx = A.x + A.w / 2;
      const bCx = B.x + B.w / 2;
      const aCy = A.y + A.h / 2;
      const bCy = B.y + B.h / 2;

      if (ow <= oh) {
        // Gorizontal kesishuv kichikroq — chap/o'ng bo'yicha ajratamiz.
        const mid = (Math.max(A.x, B.x) + Math.min(A.x + A.w, B.x + B.w)) / 2;
        const [left, right] = aCx <= bCx ? [a, b] : [b, a];
        trimRight(left.box, mid, left.manualBox, MIN_DIM);
        trimLeft(right.box, mid, right.manualBox, MIN_DIM);
      } else {
        // Vertikal kesishuv kichikroq — yuqori/past bo'yicha ajratamiz.
        const mid = (Math.max(A.y, B.y) + Math.min(A.y + A.h, B.y + B.h)) / 2;
        const [top, bottom] = aCy <= bCy ? [a, b] : [b, a];
        trimBottom(top.box, mid, top.manualBox, MIN_DIM);
        trimTop(bottom.box, mid, bottom.manualBox, MIN_DIM);
      }
    }
  }
}

function trimRight(box: LayoutBox, edge: number, manual: boolean, minDim: number): void {
  if (manual) return;
  const newRight = Math.min(box.x + box.w, edge);
  const newW = Math.max(minDim, newRight - box.x);
  box.w = newW;
}
function trimLeft(box: LayoutBox, edge: number, manual: boolean, minDim: number): void {
  if (manual) return;
  const right = box.x + box.w;
  const newX = Math.max(box.x, edge);
  box.x = Math.min(newX, right - minDim);
  box.w = Math.max(minDim, right - box.x);
}
function trimBottom(box: LayoutBox, edge: number, manual: boolean, minDim: number): void {
  if (manual) return;
  const newBottom = Math.min(box.y + box.h, edge);
  box.h = Math.max(minDim, newBottom - box.y);
}
function trimTop(box: LayoutBox, edge: number, manual: boolean, minDim: number): void {
  if (manual) return;
  const bottom = box.y + box.h;
  const newY = Math.max(box.y, edge);
  box.y = Math.min(newY, bottom - minDim);
  box.h = Math.max(minDim, bottom - box.y);
}

export function drawTranslatedTexts(ctx: CanvasRenderingContext2D, regions: Region[]) {
  ctx.textBaseline = "top";

  const imageSize = { w: ctx.canvas.width, h: ctx.canvas.height };

  // ── 1-bosqich: har bir region uchun layout box'ni hisoblash ────────────
  // Avval barcha box'lar hisoblanadi, so'ng QO'SHNI (birikkan/yondosh)
  // bubble'lar box'lari bir-biriga kirib ketgan bo'lsa, ular o'zaro
  // KESILADI (resolveBoxOverlaps). Shunda bir tomoni birikkan ikki bubble'da
  // matn ustma-ust tushmaydi.
  type LaidRegion = {
    r: Region;
    text: string;
    box: { x: number; y: number; w: number; h: number };
    manualBox: boolean;
  };

  const laid: LaidRegion[] = [];

  regions.forEach((r) => {
    if (!r.uz_text) return;
    const text = r.uz_text.toUpperCase().trim();
    if (!text) return;

    const fontWeight = r.font_weight || "bold";
    const fontStyle = r.font_style || "normal";
    const fontFamily = r.font_family || "Anime Ace";

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
      // Pufak yo'q yoki OCR'ga teng (Apple Vision) — sintetik pufak bilan
      // matnga moslab kengaytiriladi (tor OCR box'da matn kichrayib qolmaydi).
      box = computeRenderBox(ctx, r.bbox, r.bubble_bbox, text, fontFamily, fontWeight, fontStyle, imageSize);
    }

    laid.push({ r, text, box, manualBox: !!r.bbox_manual });
  });

  // QO'SHNI bubble'lar box'larini o'zaro kesish (faqat avto box'lar uchun;
  // foydalanuvchi qo'lda qo'ygan box'larga tegmaymiz).
  resolveBoxOverlaps(laid);

  // ── 2-bosqich: har bir region matnini chizish ──────────────────────────
  laid.forEach(({ r, text, box }) => {
    const fontWeight = r.font_weight || "bold";
    const fontStyle = r.font_style || "normal";
    const fontFamily = r.font_family || "Anime Ace";
    const align = resolveAlign(r);

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
        maxFontForBox(boxWidth, boxHeight),
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

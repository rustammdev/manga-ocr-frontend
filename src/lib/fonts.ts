// Font registry — backend `manga_pipeline/fonts.py` katalogi bilan SINXRON.
// Barcha fontlar SELF-HOSTED (public/fonts/ + globals.css @font-face), shuning
// uchun editor preview = publish (Pillow renderer) natijasi.
//
// Kategoriyalar:
//   comic     — dialog (nutq pufagi, asosiy ~90%)
//   sfx       — onomatopoeia / FX
//   narration — narration / fikr / caption
//   clean     — oddiy / universal (system panel, info)

export type FontEntry = {
  family: string;
  category: "comic" | "sfx" | "narration" | "clean";
  hasBold: boolean;
  hasItalic: boolean;
};

export const MANGA_FONTS: FontEntry[] = [
  // Dialog (bubble)
  { family: "Anime Ace", category: "comic", hasBold: true, hasItalic: true },
  { family: "Komika Text", category: "comic", hasBold: true, hasItalic: true },

  // Narration / fikr
  { family: "Agency Gothic", category: "narration", hasBold: false, hasItalic: false },

  // SFX / FX
  { family: "Bangers", category: "sfx", hasBold: false, hasItalic: false },
  { family: "Who Dares", category: "sfx", hasBold: false, hasItalic: true },
  { family: "Road Rage", category: "sfx", hasBold: false, hasItalic: false },
  { family: "Magma Break", category: "sfx", hasBold: false, hasItalic: true },
  { family: "Outrun Future", category: "sfx", hasBold: true, hasItalic: true },
  { family: "Stupid Cupid", category: "sfx", hasBold: false, hasItalic: false },

  // Oddiy / universal
  { family: "Nunito", category: "clean", hasBold: true, hasItalic: true },
];

// Har rol uchun default font — backend `ROLE_DEFAULTS` bilan mos.
export const ROLE_DEFAULTS = {
  dialogue: "Anime Ace",
  sfx: "Komika Text",
  narration: "Agency Gothic",
  clean: "Nunito",
} as const;

const CATEGORY_LABELS: Record<FontEntry["category"], string> = {
  comic: "Dialog",
  sfx: "SFX / FX",
  narration: "Narration",
  clean: "Oddiy",
};

export function getFontsByCategory() {
  const grouped: Record<string, FontEntry[]> = {};
  for (const font of MANGA_FONTS) {
    const label = CATEGORY_LABELS[font.category];
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(font);
  }
  return grouped;
}

export function getFontEntry(family: string): FontEntry | undefined {
  return MANGA_FONTS.find((f) => f.family === family);
}

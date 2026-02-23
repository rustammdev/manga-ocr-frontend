// ============================================================
// Mock Data for Mobile Manga Reader
// ============================================================

export interface MangaCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  date: string;
  pages: number;
  isRead?: boolean;
}

export interface Manga {
  id: string;
  slug: string;
  title: string;
  titleOriginal?: string;
  cover: string;
  banner?: string;
  author: string;
  artist?: string;
  status: "ongoing" | "completed" | "hiatus";
  rating: number;
  ratingCount: number;
  views: number;
  bookmarks: number;
  description: string;
  genres: string[];
  chapters: Chapter[];
  lastUpdated: string;
  year: number;
  type: "manga" | "manhwa" | "manhua";
}

// Placeholder cover images using gradient placeholders
const covers = {
  naruto: "https://picsum.photos/seed/naruto/300/420",
  onepiece: "https://picsum.photos/seed/onepiece/300/420",
  aot: "https://picsum.photos/seed/aot/300/420",
  jjk: "https://picsum.photos/seed/jjk/300/420",
  demonslayer: "https://picsum.photos/seed/demonslayer/300/420",
  spy: "https://picsum.photos/seed/spyfamily/300/420",
  chainsaw: "https://picsum.photos/seed/chainsaw/300/420",
  solo: "https://picsum.photos/seed/sololevel/300/420",
  mha: "https://picsum.photos/seed/mha/300/420",
  opm: "https://picsum.photos/seed/opm/300/420",
  hxh: "https://picsum.photos/seed/hxh/300/420",
  tokyo: "https://picsum.photos/seed/tokyorev/300/420",
  blueLock: "https://picsum.photos/seed/bluelock/300/420",
  kagurabachi: "https://picsum.photos/seed/kagurabachi/300/420",
  dandadan: "https://picsum.photos/seed/dandadan/300/420",
  kaiju: "https://picsum.photos/seed/kaiju8/300/420",
};

const banners = {
  naruto: "https://picsum.photos/seed/naruto-b/800/400",
  onepiece: "https://picsum.photos/seed/onepiece-b/800/400",
  jjk: "https://picsum.photos/seed/jjk-b/800/400",
  solo: "https://picsum.photos/seed/solo-b/800/400",
  chainsaw: "https://picsum.photos/seed/chainsaw-b/800/400",
};

function generateChapters(count: number, readUpTo: number = 0): Chapter[] {
  const chapters: Chapter[] = [];
  for (let i = count; i >= 1; i--) {
    const daysAgo = (count - i) * 7;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    chapters.push({
      id: `ch-${i}`,
      number: i,
      title: i === count ? "So'nggi bob" : `${i}-bob`,
      date: date.toISOString().split("T")[0],
      pages: Math.floor(Math.random() * 20) + 15,
      isRead: i <= readUpTo,
    });
  }
  return chapters;
}

export const categories: MangaCategory[] = [
  { id: "action", name: "Action", icon: "⚔️", count: 1240 },
  { id: "romance", name: "Romantika", icon: "💕", count: 890 },
  { id: "comedy", name: "Komediya", icon: "😄", count: 760 },
  { id: "fantasy", name: "Fantaziya", icon: "🔮", count: 980 },
  { id: "horror", name: "Qo'rqinchli", icon: "👻", count: 340 },
  { id: "drama", name: "Drama", icon: "🎭", count: 670 },
  { id: "sci-fi", name: "Ilmiy-fantastik", icon: "🚀", count: 430 },
  { id: "slice-of-life", name: "Hayot", icon: "🌸", count: 560 },
  { id: "mystery", name: "Sirli", icon: "🔍", count: 290 },
  { id: "sports", name: "Sport", icon: "⚽", count: 210 },
  { id: "adventure", name: "Sarguzasht", icon: "🗺️", count: 850 },
  { id: "isekai", name: "Isekai", icon: "🌀", count: 720 },
];

export const mangaList: Manga[] = [
  {
    id: "1",
    slug: "naruto",
    title: "Naruto",
    titleOriginal: "ナルト",
    cover: covers.naruto,
    banner: banners.naruto,
    author: "Masashi Kishimoto",
    artist: "Masashi Kishimoto",
    status: "completed",
    rating: 4.8,
    ratingCount: 12500,
    views: 2500000,
    bookmarks: 85000,
    description:
      "Naruto Uzumaki — Konoha qishlog'ining eng shovqinli va o'jar ninjasi. U ichida kuchli domonni saqlaydigan bola bo'lib, ninja yo'lida Hokage bo'lish orzusini amalga oshirishga harakat qiladi. Do'stlik, fidokorlik va hech qachon taslim bo'lmaslik haqidagi ajoyib hikoya.",
    genres: ["Action", "Sarguzasht", "Komediya", "Drama", "Fantaziya"],
    chapters: generateChapters(72, 45),
    lastUpdated: "2024-12-15",
    year: 1999,
    type: "manga",
  },
  {
    id: "2",
    slug: "one-piece",
    title: "One Piece",
    titleOriginal: "ワンピース",
    cover: covers.onepiece,
    banner: banners.onepiece,
    author: "Eiichiro Oda",
    artist: "Eiichiro Oda",
    status: "ongoing",
    rating: 4.9,
    ratingCount: 18000,
    views: 3200000,
    bookmarks: 120000,
    description:
      "Monkey D. Luffy — dengiz qaroqchilari qiroli bo'lishni orzu qiladigan yigit. Rezina mevani yegan Luffy o'z jamoasini yig'ib, Grand Line bo'ylab sarguzashtga otlanadi. Dunyodagi eng mashhur manga seriyasi!",
    genres: ["Action", "Sarguzasht", "Komediya", "Drama", "Fantaziya"],
    chapters: generateChapters(120, 80),
    lastUpdated: "2025-02-20",
    year: 1997,
    type: "manga",
  },
  {
    id: "3",
    slug: "jujutsu-kaisen",
    title: "Jujutsu Kaisen",
    titleOriginal: "呪術廻戦",
    cover: covers.jjk,
    banner: banners.jjk,
    author: "Gege Akutami",
    artist: "Gege Akutami",
    status: "completed",
    rating: 4.7,
    ratingCount: 9800,
    views: 1800000,
    bookmarks: 67000,
    description:
      "Yuji Itadori — la'natlarni yo'q qilishga ixtisoslashgan jujutsu sehrgarlarining olamiga kirgan oddiy o'quvchi. Sukuna barmoqlarini yutganidan keyin, uning hayoti tubdan o'zgaradi va u la'natlar bilan kurashish yo'liga qadam qo'yadi.",
    genres: ["Action", "Fantaziya", "Drama", "Qo'rqinchli"],
    chapters: generateChapters(85, 60),
    lastUpdated: "2024-11-30",
    year: 2018,
    type: "manga",
  },
  {
    id: "4",
    slug: "attack-on-titan",
    title: "Attack on Titan",
    titleOriginal: "進撃の巨人",
    cover: covers.aot,
    author: "Hajime Isayama",
    artist: "Hajime Isayama",
    status: "completed",
    rating: 4.9,
    ratingCount: 15000,
    views: 2800000,
    bookmarks: 95000,
    description:
      "Insoniyat ulkan devorlar ortida yashaydi, chunki tashqarida gigant titanlar hukm suradi. Eren Yeager onasining o'limidan keyin titanlarni yo'q qilishga qasam ichadi. Ammo devorlar ortidagi sir uni va butun dunyoni o'zgartirib yuboradi.",
    genres: ["Action", "Drama", "Fantaziya", "Qo'rqinchli", "Sirli"],
    chapters: generateChapters(68, 68),
    lastUpdated: "2024-06-10",
    year: 2009,
    type: "manga",
  },
  {
    id: "5",
    slug: "demon-slayer",
    title: "Demon Slayer",
    titleOriginal: "鬼滅の刃",
    cover: covers.demonslayer,
    author: "Koyoharu Gotouge",
    artist: "Koyoharu Gotouge",
    status: "completed",
    rating: 4.7,
    ratingCount: 11000,
    views: 2100000,
    bookmarks: 78000,
    description:
      "Tanjiro Kamado oilasi jinlar tomonidan qatl qilinganidan keyin, jin ovchisiga aylanadi. Uning singlisi Nezuko jinga aylangan bo'lsa-da, Tanjiro uni davolash va oilasining qasos olish uchun kurashadi.",
    genres: ["Action", "Fantaziya", "Drama", "Tarixiy"],
    chapters: generateChapters(55, 30),
    lastUpdated: "2024-08-20",
    year: 2016,
    type: "manga",
  },
  {
    id: "6",
    slug: "spy-x-family",
    title: "Spy x Family",
    titleOriginal: "スパイファミリー",
    cover: covers.spy,
    author: "Tatsuya Endo",
    artist: "Tatsuya Endo",
    status: "ongoing",
    rating: 4.8,
    ratingCount: 8500,
    views: 1500000,
    bookmarks: 56000,
    description:
      "Josus Loid Forger tinchlikni saqlash uchun soxta oila tuzishi kerak. U bir-birining sirlari haqida bexabar bo'lgan telepat qiz va qotil ayol bilan birgalikda eng g'alati, lekin eng mehribon oilani tashkil etadi.",
    genres: ["Action", "Komediya", "Hayot"],
    chapters: generateChapters(45, 20),
    lastUpdated: "2025-02-18",
    year: 2019,
    type: "manga",
  },
  {
    id: "7",
    slug: "chainsaw-man",
    title: "Chainsaw Man",
    titleOriginal: "チェンソーマン",
    cover: covers.chainsaw,
    banner: banners.chainsaw,
    author: "Tatsuki Fujimoto",
    artist: "Tatsuki Fujimoto",
    status: "ongoing",
    rating: 4.6,
    ratingCount: 9200,
    views: 1900000,
    bookmarks: 71000,
    description:
      "Denji — qashshoq yigit bo'lib, o'z it-devili Pochita bilan jinlar ovchisi sifatida ishlaydi. Bir kun u o'ldiriladi, lekin Pochita uning yuragi bo'lib, uni Chainsaw Man — yarim odam, yarim jin holatiga keltiradi.",
    genres: ["Action", "Drama", "Qo'rqinchli", "Fantaziya"],
    chapters: generateChapters(78, 50),
    lastUpdated: "2025-02-15",
    year: 2018,
    type: "manga",
  },
  {
    id: "8",
    slug: "solo-leveling",
    title: "Solo Leveling",
    titleOriginal: "나 혼자만 레벨업",
    cover: covers.solo,
    banner: banners.solo,
    author: "Chugong",
    artist: "Dubu (Redice Studio)",
    status: "completed",
    rating: 4.8,
    ratingCount: 14000,
    views: 2600000,
    bookmarks: 98000,
    description:
      "Sung Jin-Woo — dunyodagi eng zaif ovchi. Ammo maxfiy zindondan omon chiqqanidan keyin, u yagona o'yinchi sifatida kuchayish tizimini oladi. Endi u cheksiz kuchayishi mumkin va dunyodagi eng kuchli ovchiga aylanadi.",
    genres: ["Action", "Fantaziya", "Sarguzasht"],
    chapters: generateChapters(110, 90),
    lastUpdated: "2024-10-05",
    year: 2018,
    type: "manhwa",
  },
  {
    id: "9",
    slug: "my-hero-academia",
    title: "My Hero Academia",
    titleOriginal: "僕のヒーローアカデミア",
    cover: covers.mha,
    author: "Kohei Horikoshi",
    artist: "Kohei Horikoshi",
    status: "completed",
    rating: 4.5,
    ratingCount: 10500,
    views: 1700000,
    bookmarks: 62000,
    description:
      "Dunyoda odamlarning 80% super kuchga ega. Izuku Midoriya esa kuchsiz tug'ilgan. Ammo eng katta qahramon All Might uni tanlaydi va o'z kuchini beradi. Endi Izuku qahramon akademiyasida eng zo'r qahramon bo'lishga harakat qiladi.",
    genres: ["Action", "Komediya", "Fantaziya", "Drama"],
    chapters: generateChapters(95, 70),
    lastUpdated: "2024-09-15",
    year: 2014,
    type: "manga",
  },
  {
    id: "10",
    slug: "one-punch-man",
    title: "One Punch Man",
    titleOriginal: "ワンパンマン",
    cover: covers.opm,
    author: "ONE",
    artist: "Yusuke Murata",
    status: "ongoing",
    rating: 4.7,
    ratingCount: 11200,
    views: 2000000,
    bookmarks: 73000,
    description:
      "Saitama — bitta musht bilan har qanday dushmanni yengadigan qahramon. Ammo bu uni zeriktirib qo'ygan! U haqiqiy raqib izlaydi. Eng kuchli va eng kulgili qahramon hikoyasi.",
    genres: ["Action", "Komediya", "Fantaziya"],
    chapters: generateChapters(60, 40),
    lastUpdated: "2025-01-25",
    year: 2012,
    type: "manga",
  },
  {
    id: "11",
    slug: "hunter-x-hunter",
    title: "Hunter x Hunter",
    titleOriginal: "ハンター×ハンター",
    cover: covers.hxh,
    author: "Yoshihiro Togashi",
    artist: "Yoshihiro Togashi",
    status: "hiatus",
    rating: 4.9,
    ratingCount: 13000,
    views: 2200000,
    bookmarks: 82000,
    description:
      "Gon Freecss otasini izlash uchun Hunter bo'lishga qaror qiladi. U Hunter imtihonida do'stlar orttirib, xavfli sarguzashtlarga bosh qo'yadi. Nen kuchi va murakkab strategiyalar bilan to'la dunyoda omon qolish oson emas.",
    genres: ["Action", "Sarguzasht", "Fantaziya", "Drama"],
    chapters: generateChapters(50, 35),
    lastUpdated: "2024-07-20",
    year: 1998,
    type: "manga",
  },
  {
    id: "12",
    slug: "tokyo-revengers",
    title: "Tokyo Revengers",
    titleOriginal: "東京卍リベンジャーズ",
    cover: covers.tokyo,
    author: "Ken Wakui",
    artist: "Ken Wakui",
    status: "completed",
    rating: 4.4,
    ratingCount: 7800,
    views: 1300000,
    bookmarks: 48000,
    description:
      "Takemichi Hanagaki o'tmishga qaytish kuchiga ega bo'lib, sevgilisini va do'stlarini qutqarish uchun Tokyo Manji Gang tarixini o'zgartirishga harakat qiladi. Vaqt sayohati va gang dramasining ajoyib aralashmasi.",
    genres: ["Action", "Drama", "Ilmiy-fantastik"],
    chapters: generateChapters(65, 65),
    lastUpdated: "2024-04-10",
    year: 2017,
    type: "manga",
  },
  {
    id: "13",
    slug: "blue-lock",
    title: "Blue Lock",
    titleOriginal: "ブルーロック",
    cover: covers.blueLock,
    author: "Muneyuki Kaneshiro",
    artist: "Yusuke Nomura",
    status: "ongoing",
    rating: 4.6,
    ratingCount: 8900,
    views: 1600000,
    bookmarks: 59000,
    description:
      "Yaponiya futbol terma jamoasi uchun eng zo'r hujumchini topish maqsadida 300 yosh futbolchi Blue Lock dasturiga taklif qilinadi. Bu yerda faqat g'olib qoladi — eng egoistik, eng kuchli striker!",
    genres: ["Sport", "Drama", "Action"],
    chapters: generateChapters(70, 55),
    lastUpdated: "2025-02-10",
    year: 2018,
    type: "manga",
  },
  {
    id: "14",
    slug: "kagurabachi",
    title: "Kagurabachi",
    titleOriginal: "カグラバチ",
    cover: covers.kagurabachi,
    author: "Takeru Hokazono",
    artist: "Takeru Hokazono",
    status: "ongoing",
    rating: 4.5,
    ratingCount: 5200,
    views: 900000,
    bookmarks: 34000,
    description:
      "Chihiro Rokuhira — mashhur qilichsozning o'g'li. Otasi o'ldirilganidan keyin, u sehrli qilichlar bilan qurollangan dushmanlarga qarshi qasos olish yo'liga chiqadi. Yangi avlod samurai manga!",
    genres: ["Action", "Fantaziya", "Drama"],
    chapters: generateChapters(40, 25),
    lastUpdated: "2025-02-22",
    year: 2023,
    type: "manga",
  },
  {
    id: "15",
    slug: "dandadan",
    title: "Dandadan",
    titleOriginal: "ダンダダン",
    cover: covers.dandadan,
    author: "Yukinobu Tatsu",
    artist: "Yukinobu Tatsu",
    status: "ongoing",
    rating: 4.7,
    ratingCount: 6100,
    views: 1100000,
    bookmarks: 41000,
    description:
      "Momo va Okarun — g'aybona hodisalar va kosmik mavjudotlar bilan kurashishga majbur bo'lgan ikki o'quvchi. Bir-biriga o'xshamaydigan bu ikkisi birgalikda eng g'alati sarguzashtlarni boshdan kechiradi.",
    genres: ["Action", "Komediya", "Fantaziya", "Ilmiy-fantastik"],
    chapters: generateChapters(55, 30),
    lastUpdated: "2025-02-21",
    year: 2021,
    type: "manga",
  },
  {
    id: "16",
    slug: "kaiju-no-8",
    title: "Kaiju No. 8",
    titleOriginal: "怪獣8号",
    cover: covers.kaiju,
    author: "Naoya Matsumoto",
    artist: "Naoya Matsumoto",
    status: "ongoing",
    rating: 4.5,
    ratingCount: 7200,
    views: 1400000,
    bookmarks: 52000,
    description:
      "Kafka Hibino — kaiju (monster) tozalash xizmatchisi bo'lib, mudofaa kuchlariga qo'shilishni orzu qiladi. Bir kun u o'zi kaijuga aylanib qoladi va endi ikki hayot — odam va monster — orasida muvozanat saqlashi kerak.",
    genres: ["Action", "Ilmiy-fantastik", "Komediya", "Drama"],
    chapters: generateChapters(48, 20),
    lastUpdated: "2025-02-19",
    year: 2020,
    type: "manga",
  },
];

// Helper functions
export function getMangaBySlug(slug: string): Manga | undefined {
  return mangaList.find((m) => m.slug === slug);
}

export function getFeaturedManga(): Manga[] {
  return mangaList.filter((m) => m.rating >= 4.7).slice(0, 5);
}

export function getLatestUpdates(): Manga[] {
  return [...mangaList]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 10);
}

export function getPopularManga(): Manga[] {
  return [...mangaList].sort((a, b) => b.views - a.views).slice(0, 10);
}

export function getRecommended(): Manga[] {
  return [...mangaList].sort((a, b) => b.rating - a.rating).slice(0, 8);
}

export function getMangaByCategory(categoryId: string): Manga[] {
  const categoryNameMap: Record<string, string> = {
    action: "Action",
    romance: "Romantika",
    comedy: "Komediya",
    fantasy: "Fantaziya",
    horror: "Qo'rqinchli",
    drama: "Drama",
    "sci-fi": "Ilmiy-fantastik",
    "slice-of-life": "Hayot",
    mystery: "Sirli",
    sports: "Sport",
    adventure: "Sarguzasht",
    isekai: "Isekai",
  };
  const name = categoryNameMap[categoryId] || categoryId;
  return mangaList.filter((m) => m.genres.includes(name) || m.genres.includes(categoryId));
}

export function searchManga(query: string): Manga[] {
  const q = query.toLowerCase();
  return mangaList.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.author.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.genres.some((g) => g.toLowerCase().includes(q))
  );
}

export function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Bugun";
  if (days === 1) return "Kecha";
  if (days < 7) return `${days} kun oldin`;
  if (days < 30) return `${Math.floor(days / 7)} hafta oldin`;
  if (days < 365) return `${Math.floor(days / 30)} oy oldin`;
  return `${Math.floor(days / 365)} yil oldin`;
}

// Chapter page images (mock)
export function getChapterPages(mangaSlug: string, chapterNumber: number): string[] {
  const pageCount = Math.floor(Math.random() * 10) + 15;
  return Array.from(
    { length: pageCount },
    (_, i) => `https://picsum.photos/seed/${mangaSlug}-ch${chapterNumber}-p${i}/800/1200`
  );
}

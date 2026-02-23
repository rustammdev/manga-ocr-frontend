import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  List,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { getMangaBySlug, getChapterPages } from "../data/mock";

export default function ChapterReaderPage() {
  const { slug, chapter } = useParams<{ slug: string; chapter: string }>();
  const navigate = useNavigate();

  const [toolbarsVisible, setToolbarsVisible] = useState(true);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLImageElement | null)[]>([]);

  const chapterNumber = Number(chapter);
  const manga = slug ? getMangaBySlug(slug) : undefined;

  // Find sorted chapter numbers (ascending) for navigation
  const sortedChapterNumbers = manga
    ? [...manga.chapters].map((ch) => ch.number).sort((a, b) => a - b)
    : [];

  const currentChapterIndex = sortedChapterNumbers.indexOf(chapterNumber);
  const prevChapterNumber =
    currentChapterIndex > 0
      ? sortedChapterNumbers[currentChapterIndex - 1]
      : null;
  const nextChapterNumber =
    currentChapterIndex < sortedChapterNumbers.length - 1
      ? sortedChapterNumbers[currentChapterIndex + 1]
      : null;

  const currentChapter = manga?.chapters.find(
    (ch) => ch.number === chapterNumber
  );

  // Load chapter pages
  useEffect(() => {
    if (slug && chapterNumber) {
      const chapterPages = getChapterPages(slug, chapterNumber);
      setPages(chapterPages);
      setCurrentPage(1);
      // Scroll to top when chapter changes
      scrollContainerRef.current?.scrollTo({ top: 0 });
    }
  }, [slug, chapterNumber]);

  // Track current page based on scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || pages.length === 0) return;

    function handleScroll() {
      const containerRect = container!.getBoundingClientRect();
      const viewportMiddle = containerRect.top + containerRect.height / 2;

      for (let i = pageRefs.current.length - 1; i >= 0; i--) {
        const img = pageRefs.current[i];
        if (img) {
          const rect = img.getBoundingClientRect();
          if (rect.top <= viewportMiddle) {
            setCurrentPage(i + 1);
            break;
          }
        }
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [pages]);

  // Toggle toolbars on center tap
  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Ignore if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("a") || target.closest("select")) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      // Center 60% of screen
      const topBound = height * 0.2;
      const bottomBound = height * 0.8;

      if (y >= topBound && y <= bottomBound) {
        setToolbarsVisible((prev) => !prev);
      }
    },
    []
  );

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported or denied
    }
  }, []);

  // Listen for fullscreen changes (e.g. user presses Escape)
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Navigate to a different chapter
  const goToChapter = useCallback(
    (chNum: number) => {
      navigate(`/reader/read/${slug}/${chNum}`, { replace: true });
    },
    [navigate, slug]
  );

  // Error state: manga or chapter not found
  if (!manga || !currentChapter) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
        <div className="rounded-2xl bg-zinc-900 p-8">
          <h2 className="text-xl font-bold text-white">Topilmadi</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {!manga
              ? "Manga topilmadi. Slug noto'g'ri bo'lishi mumkin."
              : `${chapterNumber}-bob topilmadi.`}
          </p>
          <Link
            to={manga ? `/reader/manga/${slug}` : "/reader"}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 active:scale-95"
          >
            <ArrowLeft size={16} />
            {manga ? "Manga sahifasiga" : "Bosh sahifaga"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full bg-black" onClick={handleTap}>
      {/* ============ TOP TOOLBAR ============ */}
      <div
        className={`fixed inset-x-0 top-0 z-50 bg-black/80 backdrop-blur-md transition-transform duration-300 ease-in-out ${
          toolbarsVisible
            ? "translate-y-0"
            : "-translate-y-full"
        }`}
      >
        <div className="flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {/* Back button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/reader/manga/${slug}`);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95"
            aria-label="Orqaga"
          >
            <ArrowLeft size={22} />
          </button>

          {/* Title and chapter */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold leading-tight text-white">
              {manga.title}
            </h1>
            <p className="truncate text-xs text-zinc-400">
              {chapterNumber}-bob
              {currentChapter.title &&
              currentChapter.title !== `${chapterNumber}-bob`
                ? ` — ${currentChapter.title}`
                : ""}
            </p>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95"
            aria-label={isFullscreen ? "Kichraytirish" : "Kattalashtirish"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* Chapter list */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/reader/manga/${slug}`);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95"
            aria-label="Boblar ro'yxati"
          >
            <List size={18} />
          </button>

          {/* Settings */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Settings action placeholder
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95"
            aria-label="Sozlamalar"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ============ SCROLL CONTAINER (Webtoon-style vertical reader) ============ */}
      <div
        ref={scrollContainerRef}
        className="h-full w-full overflow-y-auto overscroll-contain"
      >
        {/* Top spacing for first page visibility */}
        <div className="h-1" />

        {pages.map((src, index) => (
          <img
            key={`${slug}-${chapterNumber}-${index}`}
            ref={(el) => {
              pageRefs.current[index] = el;
            }}
            src={src}
            alt={`Sahifa ${index + 1}`}
            className="w-full select-none"
            loading={index < 3 ? "eager" : "lazy"}
            draggable={false}
          />
        ))}

        {/* End-of-chapter card */}
        <div className="flex flex-col items-center gap-4 bg-zinc-950 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-400">
            {chapterNumber}-bob tugadi
          </p>

          {nextChapterNumber ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToChapter(nextChapterNumber);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80 active:scale-95"
            >
              Keyingi bob: {nextChapterNumber}-bob
              <ChevronRight size={16} />
            </button>
          ) : (
            <p className="text-xs text-zinc-500">
              Bu oxirgi bob. Yangi bob qo'shilishini kuting.
            </p>
          )}

          <Link
            to={`/reader/manga/${slug}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-300"
          >
            Manga sahifasiga qaytish
          </Link>
        </div>
      </div>

      {/* ============ BOTTOM TOOLBAR ============ */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-black/80 backdrop-blur-md transition-transform duration-300 ease-in-out ${
          toolbarsVisible
            ? "translate-y-0"
            : "translate-y-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {/* Page indicator */}
          <span className="shrink-0 text-xs font-medium text-zinc-300">
            Sahifa {currentPage} / {pages.length}
          </span>

          <div className="flex-1" />

          {/* Previous chapter */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (prevChapterNumber) goToChapter(prevChapterNumber);
            }}
            disabled={prevChapterNumber === null}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
            aria-label="Oldingi bob"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Chapter selector dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <select
              value={chapterNumber}
              onChange={(e) => goToChapter(Number(e.target.value))}
              className="h-9 cursor-pointer appearance-none rounded-lg bg-white/10 px-3 pr-7 text-center text-sm font-medium text-white outline-none transition-colors hover:bg-white/20 focus:ring-2 focus:ring-white/30"
            >
              {sortedChapterNumbers.map((num) => (
                <option
                  key={num}
                  value={num}
                  className="bg-zinc-900 text-white"
                >
                  {num}-bob
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <ChevronRight
              size={14}
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 rotate-90 text-zinc-400"
            />
          </div>

          {/* Next chapter */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (nextChapterNumber) goToChapter(nextChapterNumber);
            }}
            disabled={nextChapterNumber === null}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
            aria-label="Keyingi bob"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

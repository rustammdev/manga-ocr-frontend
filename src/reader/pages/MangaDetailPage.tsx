import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  Eye,
  Bookmark,
  BookOpen,
  Share2,
  Clock,
  ChevronDown,
  ChevronUp,
  Heart,
} from "lucide-react";
import { getMangaBySlug, formatViews, formatDate } from "../data/mock";

const statusConfig = {
  ongoing: {
    label: "Davom etmoqda",
    className: "bg-emerald-500/90 text-white",
  },
  completed: {
    label: "Tugallangan",
    className: "bg-blue-500/90 text-white",
  },
  hiatus: {
    label: "To'xtatilgan",
    className: "bg-yellow-500/90 text-white",
  },
} as const;

const typeLabels: Record<string, string> = {
  manga: "Manga",
  manhwa: "Manhwa",
  manhua: "Manhua",
};

export default function MangaDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [sortAscending, setSortAscending] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const manga = slug ? getMangaBySlug(slug) : undefined;

  if (!manga) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-card">
          <BookOpen size={32} className="text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Manga topilmadi</h2>
        <p className="text-center text-sm text-muted-foreground">
          Siz qidirayotgan manga mavjud emas yoki o'chirilgan.
        </p>
        <Link
          to="/reader"
          className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
        >
          Bosh sahifaga qaytish
        </Link>
      </div>
    );
  }

  const status = statusConfig[manga.status];
  const bannerImage = manga.banner || manga.cover;

  // Find the first unread chapter (ascending order)
  const sortedByNumber = [...manga.chapters].sort(
    (a, b) => a.number - b.number
  );
  const firstUnread = sortedByNumber.find((ch) => !ch.isRead);
  const readChapterLink = firstUnread
    ? `/reader/read/${manga.slug}/${firstUnread.number}`
    : `/reader/read/${manga.slug}/${sortedByNumber[0]?.number ?? 1}`;

  // Chapters sorted for display
  const displayChapters = sortAscending
    ? [...manga.chapters].sort((a, b) => a.number - b.number)
    : [...manga.chapters].sort((a, b) => b.number - a.number);

  return (
    <div className="min-h-screen">
      {/* ============================================ */}
      {/* Cover Banner Area                            */}
      {/* ============================================ */}
      <div className="relative h-64 w-full overflow-hidden">
        {/* Blurred background banner */}
        <img
          src={bannerImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm brightness-50"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

        {/* Top navigation bar */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60 active:scale-95"
            aria-label="Orqaga"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: manga.title,
                  url: window.location.href,
                });
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60 active:scale-95"
            aria-label="Ulashish"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Cover image + info overlay */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 px-4 pb-4">
          {/* Cover image */}
          <img
            src={manga.cover}
            alt={manga.title}
            className="h-40 w-28 flex-shrink-0 rounded-xl object-cover shadow-lg shadow-black/40 ring-1 ring-white/10"
          />

          {/* Title and meta */}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-1">
            <h1 className="line-clamp-2 text-xl font-bold leading-tight text-white drop-shadow-md">
              {manga.title}
            </h1>
            {manga.titleOriginal && (
              <p className="truncate text-xs text-white/60">
                {manga.titleOriginal}
              </p>
            )}
            <p className="truncate text-sm text-white/70">{manga.author}</p>

            {/* Rating */}
            <div className="flex items-center gap-1.5">
              <Star
                size={14}
                className="fill-yellow-400 text-yellow-400"
              />
              <span className="text-sm font-semibold text-white">
                {manga.rating.toFixed(1)}
              </span>
              <span className="text-xs text-white/50">
                ({formatViews(manga.ratingCount)})
              </span>
            </div>

            {/* Status + Type + Year */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}
              >
                {status.label}
              </span>
              <span className="text-xs text-white/60">
                {typeLabels[manga.type] || manga.type} &middot; {manga.year}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Stats Row                                    */}
      {/* ============================================ */}
      <div className="flex items-center justify-around border-b border-border px-4 py-3">
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <Eye size={14} className="text-muted-foreground" />
            {formatViews(manga.views)}
          </div>
          <span className="text-[10px] text-muted-foreground">Ko'rishlar</span>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <Bookmark size={14} className="text-muted-foreground" />
            {formatViews(manga.bookmarks)}
          </div>
          <span className="text-[10px] text-muted-foreground">Saqlangan</span>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <BookOpen size={14} className="text-muted-foreground" />
            {manga.chapters.length}
          </div>
          <span className="text-[10px] text-muted-foreground">Boblar</span>
        </div>
      </div>

      {/* ============================================ */}
      {/* Action Buttons                               */}
      {/* ============================================ */}
      <div className="flex items-center gap-3 px-4 py-4">
        <Link
          to={readChapterLink}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.97]"
        >
          <BookOpen size={18} />
          O'qish
        </Link>
        <button
          onClick={() => setIsBookmarked((prev) => !prev)}
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all active:scale-95 ${
            isBookmarked
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Saqlash"
        >
          <Bookmark
            size={20}
            className={isBookmarked ? "fill-primary" : ""}
          />
        </button>
        <button
          onClick={() => setIsLiked((prev) => !prev)}
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all active:scale-95 ${
            isLiked
              ? "border-red-500 bg-red-500/15 text-red-500"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Yuklash"
        >
          <Heart size={20} className={isLiked ? "fill-red-500" : ""} />
        </button>
      </div>

      {/* ============================================ */}
      {/* Description + Genres                         */}
      {/* ============================================ */}
      <div className="px-4 pb-4">
        <div className="relative">
          <p
            className={`text-sm leading-relaxed text-muted-foreground transition-all ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {manga.description}
          </p>
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            {expanded ? (
              <>
                Yopish <ChevronUp size={14} />
              </>
            ) : (
              <>
                Ko'proq <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>

        {/* Genres */}
        <div className="mt-3 flex flex-wrap gap-2">
          {manga.genres.map((genre) => (
            <span
              key={genre}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* Chapters Section                             */}
      {/* ============================================ */}
      <div className="border-t border-border">
        {/* Chapters header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Boblar</h2>
            <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {manga.chapters.length}
            </span>
          </div>
          <button
            onClick={() => setSortAscending((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:scale-95"
            aria-label={sortAscending ? "Kamayish tartibida" : "O'sish tartibida"}
          >
            <Clock size={14} />
            {sortAscending ? "Eskidan" : "Yangidan"}
            {sortAscending ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
        </div>

        {/* Chapters list */}
        <div className="px-4 pb-6">
          {displayChapters.map((chapter) => (
            <Link
              key={chapter.id}
              to={`/reader/read/${manga.slug}/${chapter.number}`}
              className={`flex items-center gap-3 border-b border-border py-3 transition-all last:border-b-0 hover:bg-card/50 ${
                chapter.isRead ? "opacity-60" : ""
              }`}
            >
              {/* Chapter number indicator */}
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  chapter.isRead
                    ? "bg-card text-muted-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {chapter.number}
              </div>

              {/* Chapter info */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={`truncate text-sm font-medium ${
                    chapter.isRead
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {chapter.number}-bob
                  {chapter.title !== `${chapter.number}-bob`
                    ? `: ${chapter.title}`
                    : ""}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(chapter.date)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    &middot;
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {chapter.pages} sahifa
                  </span>
                </div>
              </div>

              {/* Read status */}
              {chapter.isRead && (
                <div className="flex-shrink-0">
                  <Eye size={14} className="text-muted-foreground/50" />
                </div>
              )}
              {!chapter.isRead && (
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

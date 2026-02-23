import { Link } from "react-router-dom";
import { Star, Eye } from "lucide-react";
import { type Manga, formatViews, formatDate } from "../data/mock";

interface MangaCardProps {
  manga: Manga;
  variant?: "default" | "compact" | "wide";
}

const statusConfig = {
  ongoing: {
    label: "Ongoing",
    className: "bg-emerald-500/90 text-white",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-500/90 text-white",
  },
  hiatus: {
    label: "Hiatus",
    className: "bg-yellow-500/90 text-white",
  },
} as const;

function DefaultCard({ manga }: { manga: Manga }) {
  const status = statusConfig[manga.status];

  return (
    <Link
      to={`/reader/manga/${manga.slug}`}
      className="group flex w-[140px] flex-shrink-0 flex-col gap-2 sm:w-[160px]"
    >
      {/* Cover image */}
      <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-lg transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10">
        <img
          src={manga.cover}
          alt={manga.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Status badge */}
        <span
          className={`absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${status.className}`}
        >
          {status.label}
        </span>

        {/* Bottom overlay info */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-2 pb-2">
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-white/90">
            <Eye size={12} strokeWidth={2} />
            {formatViews(manga.views)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
        {manga.title}
      </h3>

      {/* Rating */}
      <div className="flex items-center gap-1">
        <Star size={12} className="fill-yellow-400 text-yellow-400" />
        <span className="text-xs font-medium text-muted-foreground">
          {manga.rating.toFixed(1)}
        </span>
      </div>
    </Link>
  );
}

function CompactCard({ manga }: { manga: Manga }) {
  return (
    <Link
      to={`/reader/manga/${manga.slug}`}
      className="group flex h-20 items-center gap-3 rounded-lg px-1 transition-all duration-200 hover:bg-card"
    >
      {/* Thumbnail */}
      <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-md">
        <img
          src={manga.cover}
          alt={manga.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {manga.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {manga.author}
        </p>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Star size={11} className="fill-yellow-400 text-yellow-400" />
            {manga.rating.toFixed(1)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {manga.chapters.length} bob
          </span>
        </div>
      </div>
    </Link>
  );
}

function WideCard({ manga }: { manga: Manga }) {
  const latestChapter = manga.chapters[0];

  return (
    <Link
      to={`/reader/manga/${manga.slug}`}
      className="group flex gap-3 border-b border-border py-3 transition-all duration-200 last:border-b-0 hover:bg-card/50"
    >
      {/* Cover */}
      <div className="relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg">
        <img
          src={manga.cover}
          alt={manga.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <h3 className="line-clamp-1 text-base font-medium text-foreground transition-colors group-hover:text-primary">
          {manga.title}
        </h3>
        <p className="truncate text-sm text-muted-foreground">
          {manga.author}
        </p>

        {latestChapter && (
          <div className="mt-1 flex flex-col gap-0.5">
            <span className="text-sm text-foreground/80">
              {latestChapter.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(manga.lastUpdated)}
            </span>
          </div>
        )}

        <div className="mt-1 flex items-center gap-3">
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            {manga.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Eye size={12} strokeWidth={2} />
            {formatViews(manga.views)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function MangaCard({ manga, variant = "default" }: MangaCardProps) {
  switch (variant) {
    case "compact":
      return <CompactCard manga={manga} />;
    case "wide":
      return <WideCard manga={manga} />;
    default:
      return <DefaultCard manga={manga} />;
  }
}

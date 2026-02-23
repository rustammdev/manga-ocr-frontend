import { useState } from "react";
import {
  Library,
  Grid3X3,
  List,
  BookOpen,
  Clock,
  CheckCircle2,
} from "lucide-react";
import MangaCard from "../components/MangaCard";
import { mangaList } from "../data/mock";
import type { Manga } from "../data/mock";

type ReadingStatus = "reading" | "planned" | "completed";

interface BookmarkedManga extends Manga {
  readingStatus: ReadingStatus;
}

type FilterTab = "all" | ReadingStatus;

interface Tab {
  key: FilterTab;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { key: "all", label: "Hammasi", icon: <Library size={14} /> },
  { key: "reading", label: "O'qilmoqda", icon: <BookOpen size={14} /> },
  { key: "planned", label: "Rejada", icon: <Clock size={14} /> },
  { key: "completed", label: "Tugallangan", icon: <CheckCircle2 size={14} /> },
];

// Mock bookmarked manga: take first 8 from mangaList and assign reading statuses
const bookmarkedManga: BookmarkedManga[] = mangaList.slice(0, 8).map((manga, i) => {
  let readingStatus: ReadingStatus;
  if (i < 3) {
    readingStatus = "reading";
  } else if (i < 5) {
    readingStatus = "planned";
  } else {
    readingStatus = "completed";
  }
  return { ...manga, readingStatus };
});

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered =
    activeTab === "all"
      ? bookmarkedManga
      : bookmarkedManga.filter((m) => m.readingStatus === activeTab);

  function getCount(tab: FilterTab): number {
    if (tab === "all") return bookmarkedManga.length;
    return bookmarkedManga.filter((m) => m.readingStatus === tab).length;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/90 px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2.5">
          <Library size={22} className="text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Kutubxona
          </h1>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${
              viewMode === "grid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Grid ko'rinishi"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Ro'yxat ko'rinishi"
          >
            <List size={16} />
          </button>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-4 pt-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = getCount(tab.key);

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                isActive
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              <span
                className={`ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/15 text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {filtered.length > 0 ? (
        viewMode === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-3 gap-3 px-4 sm:grid-cols-4 md:grid-cols-5">
            {filtered.map((manga) => (
              <div key={manga.id} className="w-full">
                <MangaCard manga={manga} />
              </div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="space-y-1 px-4">
            {filtered.map((manga) => (
              <MangaCard key={manga.id} manga={manga} variant="compact" />
            ))}
          </div>
        )
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <BookOpen size={48} className="mb-4 text-muted-foreground/30" />
          <p className="text-base font-semibold text-foreground">
            Bu yerda hali manga yo'q
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manga sahifasidan saqlang va bu yerda ko'ring
          </p>
        </div>
      )}
    </div>
  );
}

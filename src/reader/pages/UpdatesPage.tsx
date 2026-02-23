import { useState } from "react";
import { Clock, Bell, Filter } from "lucide-react";
import MangaCard from "../components/MangaCard";
import { getLatestUpdates, formatDate } from "../data/mock";
import type { Manga } from "../data/mock";

type Tab = "updates" | "history";

interface DateGroup {
  label: string;
  manga: Manga[];
}

function getRelativeDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Bugun";
  if (days === 1) return "Kecha";
  if (days < 7) return "Shu hafta";
  return formatDate(dateStr);
}

function groupByDate(mangaList: Manga[]): DateGroup[] {
  const groupMap = new Map<string, Manga[]>();
  const groupOrder: string[] = [];

  for (const manga of mangaList) {
    const label = getRelativeDateLabel(manga.lastUpdated);
    if (!groupMap.has(label)) {
      groupMap.set(label, []);
      groupOrder.push(label);
    }
    groupMap.get(label)!.push(manga);
  }

  return groupOrder.map((label) => ({
    label,
    manga: groupMap.get(label)!,
  }));
}

/** Mock reading history: take a subset of manga and annotate with last-read info */
function getReadingHistory(): Array<{ manga: Manga; lastReadChapter: number; lastReadDate: string }> {
  const updates = getLatestUpdates();
  return updates.slice(0, 6).map((manga, i) => {
    const readUpTo = Math.max(1, manga.chapters.length - Math.floor(Math.random() * 10) - 1);
    const daysAgo = i * 2 + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      manga,
      lastReadChapter: readUpTo,
      lastReadDate: date.toISOString().split("T")[0],
    };
  });
}

export default function UpdatesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("updates");

  const latestUpdates = getLatestUpdates();
  const dateGroups = groupByDate(latestUpdates);
  const readingHistory = getReadingHistory();

  const tabs: { key: Tab; label: string }[] = [
    { key: "updates", label: "Yangilanishlar" },
    { key: "history", label: "Tarix" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Yangiliklar
            </h1>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Filter"
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Tab content */}
      {activeTab === "updates" ? (
        <div>
          {dateGroups.length > 0 ? (
            dateGroups.map((group) => (
              <div key={group.label}>
                {/* Sticky date group header */}
                <div className="sticky top-[105px] z-30 bg-background/90 px-4 py-2 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                  </div>
                </div>

                {/* Manga list */}
                <div className="px-4">
                  {group.manga.map((manga) => (
                    <MangaCard key={manga.id} manga={manga} variant="wide" />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <Bell size={48} className="mb-4 text-muted-foreground/40" />
              <p className="text-lg font-semibold text-foreground">
                Hozircha yangilanishlar yo'q
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Manga kuzatishni boshlang va yangilanishlar bu yerda ko'rinadi
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {readingHistory.length > 0 ? (
            <div className="px-4 pt-2">
              {readingHistory.map(({ manga, lastReadChapter, lastReadDate }) => (
                <div key={manga.id} className="relative">
                  <MangaCard manga={manga} variant="wide" />
                  {/* Last read overlay info */}
                  <div className="pointer-events-none absolute bottom-4 right-0 flex flex-col items-end gap-0.5">
                    <span className="rounded-l-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {lastReadChapter}-bob o'qilgan
                    </span>
                    <span className="pr-2 text-[10px] text-muted-foreground">
                      {formatDate(lastReadDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <Clock size={48} className="mb-4 text-muted-foreground/40" />
              <p className="text-lg font-semibold text-foreground">
                O'qish tarixi bo'sh
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Manga o'qishni boshlang va tarix bu yerda saqlanadi
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

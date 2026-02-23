import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, SlidersHorizontal } from "lucide-react";
import MangaCard from "../components/MangaCard";
import { mangaList, categories, searchManga, getMangaByCategory } from "../data/mock";
import type { Manga } from "../data/mock";

type SortOption = "popular" | "new" | "rating" | "a-z";

const sortOptions: { key: SortOption; label: string }[] = [
  { key: "popular", label: "Mashhur" },
  { key: "new", label: "Yangi" },
  { key: "rating", label: "Reyting" },
  { key: "a-z", label: "A-Z" },
];

function sortManga(list: Manga[], sort: SortOption): Manga[] {
  const sorted = [...list];
  switch (sort) {
    case "popular":
      return sorted.sort((a, b) => b.views - a.views);
    case "new":
      return sorted.sort(
        (a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "a-z":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState("");

  const selectedCategory = searchParams.get("category") || "";
  const selectedSort = (searchParams.get("sort") as SortOption) || "popular";

  function setCategory(categoryId: string) {
    const next = new URLSearchParams(searchParams);
    if (categoryId) {
      next.set("category", categoryId);
    } else {
      next.delete("category");
    }
    setSearchParams(next, { replace: true });
  }

  function setSort(sort: SortOption) {
    const next = new URLSearchParams(searchParams);
    next.set("sort", sort);
    setSearchParams(next, { replace: true });
  }

  const results = useMemo(() => {
    let list: Manga[];

    // Search takes priority
    if (searchText.trim()) {
      list = searchManga(searchText.trim());
    } else if (selectedCategory) {
      list = getMangaByCategory(selectedCategory);
    } else {
      list = [...mangaList];
    }

    return sortManga(list, selectedSort);
  }, [searchText, selectedCategory, selectedSort]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-40 bg-background/95 px-4 pb-3 pt-4 backdrop-blur-lg">
        <div className="relative flex items-center">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 text-muted-foreground"
          />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Manga qidirish..."
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground transition-colors hover:bg-muted-foreground/30 hover:text-foreground"
              aria-label="Tozalash"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category filter chips */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-3">
        <button
          onClick={() => setCategory("")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
            !selectedCategory
              ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/10"
          }`}
        >
          <SlidersHorizontal size={14} />
          Hammasi
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
              selectedCategory === cat.id
                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/10"
            }`}
          >
            <span className="text-base leading-none">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Sort options */}
      <div className="flex gap-1.5 px-4 pb-4">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
              selectedSort === opt.key
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Result count */}
      <div className="px-4 pb-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{results.length}</span>{" "}
          ta manga topildi
        </p>
      </div>

      {/* Results grid */}
      {results.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 px-4">
          {results.map((manga) => (
            <div key={manga.id} className="w-full">
              <MangaCard manga={manga} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Search size={48} className="mb-4 text-muted-foreground/40" />
          <p className="text-lg font-semibold text-foreground">
            Hech narsa topilmadi
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Boshqa kalit so'z bilan qidirib ko'ring
          </p>
        </div>
      )}
    </div>
  );
}

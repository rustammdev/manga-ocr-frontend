import { Link } from "react-router-dom";
import { Sparkles, Flame } from "lucide-react";
import HeroCarousel from "../components/HeroCarousel";
import MangaCard from "../components/MangaCard";
import SectionHeader from "../components/SectionHeader";
import {
  getFeaturedManga,
  getLatestUpdates,
  getPopularManga,
  getRecommended,
  categories,
} from "../data/mock";

export default function HomePage() {
  const featured = getFeaturedManga();
  const latest = getLatestUpdates();
  const popular = getPopularManga();
  const recommended = getRecommended();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/90 px-4 py-3 backdrop-blur-lg">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Manga<span className="text-primary">Reader</span>
          </h1>
        </div>
        <Link
          to="/reader/browse"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <Sparkles size={18} />
        </Link>
      </header>

      {/* Hero Carousel */}
      <HeroCarousel manga={featured} />

      {/* Categories Quick Access */}
      <section className="mt-5">
        <SectionHeader
          title="Kategoriyalar"
          actionText="Hammasi"
          actionLink="/reader/browse"
        />
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-2">
          {categories.slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              to={`/reader/browse?category=${cat.id}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/10 active:scale-95"
            >
              <span className="text-base">{cat.icon}</span>
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending / Popular */}
      <section className="mt-6">
        <SectionHeader
          title="Trendda"
          actionText="Hammasi"
          actionLink="/reader/browse?sort=popular"
        />
        <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-2">
          {popular.slice(0, 8).map((manga, i) => (
            <div key={manga.id} className="relative shrink-0">
              {i < 3 && (
                <div className="absolute -left-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">
                  {i + 1}
                </div>
              )}
              <MangaCard manga={manga} />
            </div>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      <section className="mt-6">
        <SectionHeader title="Siz uchun tavsiya" />
        <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-2">
          {recommended.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      </section>

      {/* Continue Reading (mock) */}
      <section className="mt-6">
        <SectionHeader title="Davom ettirish" />
        <div className="space-y-1 px-4">
          {popular.slice(0, 3).map((manga) => (
            <Link
              key={manga.id}
              to={`/reader/manga/${manga.slug}`}
              className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-card"
            >
              <img
                src={manga.cover}
                alt={manga.title}
                className="h-16 w-12 rounded-lg object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {manga.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {manga.chapters[0]
                    ? `${manga.chapters[0].number}-bob`
                    : "Boshlanmagan"}
                </p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.floor(Math.random() * 60 + 20)}%`,
                    }}
                  />
                </div>
              </div>
              <Flame size={16} className="shrink-0 text-primary" />
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Updates */}
      <section className="mt-6 mb-4">
        <SectionHeader
          title="Yangi yangilanishlar"
          actionText="Hammasi"
          actionLink="/reader/updates"
        />
        <div className="px-4">
          {latest.slice(0, 6).map((manga) => (
            <MangaCard key={manga.id} manga={manga} variant="wide" />
          ))}
        </div>
      </section>
    </div>
  );
}

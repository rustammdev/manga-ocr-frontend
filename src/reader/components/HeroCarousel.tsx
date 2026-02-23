import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Star, ChevronRight } from "lucide-react";
import type { Manga } from "../data/mock";

interface HeroCarouselProps {
  manga: Manga[];
}

export default function HeroCarousel({ manga }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slideCount = manga.length;

  // Minimum swipe distance in px to trigger a slide change
  const minSwipeDistance = 50;

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex(index);
      setTimeout(() => setIsTransitioning(false), 500);
    },
    [isTransitioning]
  );

  const goToNext = useCallback(() => {
    goToSlide((currentIndex + 1) % slideCount);
  }, [currentIndex, slideCount, goToSlide]);

  const goToPrev = useCallback(() => {
    goToSlide((currentIndex - 1 + slideCount) % slideCount);
  }, [currentIndex, slideCount, goToSlide]);

  // Auto-slide every 5 seconds
  const resetAutoSlide = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(goToNext, 5000);
  }, [goToNext]);

  useEffect(() => {
    resetAutoSlide();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [resetAutoSlide]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
    setTouchDelta(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    setTouchDelta(currentTouch - touchStart);
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    setTouchDelta(0);

    if (touchStart === null || touchEnd === null) {
      resetAutoSlide();
      return;
    }

    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > minSwipeDistance;

    if (isSwipe) {
      if (distance > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
    resetAutoSlide();
  };

  if (slideCount === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none"
      style={{ height: "clamp(220px, 56vw, 320px)" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      {manga.map((item, index) => {
        const isActive = index === currentIndex;
        const imageUrl = item.banner || item.cover;
        const displayGenres = item.genres.slice(0, 3);

        return (
          <div
            key={item.id}
            className="absolute inset-0 h-full w-full"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive
                ? `translateX(${isDragging ? touchDelta * 0.4 : 0}px)`
                : `translateX(${isDragging ? touchDelta * 0.4 : 0}px)`,
              transition: isDragging
                ? "none"
                : "opacity 500ms ease-in-out, transform 500ms ease-in-out",
              zIndex: isActive ? 10 : 0,
              pointerEvents: isActive ? "auto" : "none",
            }}
          >
            {/* Background image */}
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt={item.title}
                className="h-full w-full object-cover"
                loading={index <= 1 ? "eager" : "lazy"}
              />
            </div>

            {/* Gradient overlays */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, hsl(var(--background) / 0.15) 0%, hsl(var(--background) / 0.4) 40%, hsl(var(--background) / 0.85) 75%, hsl(var(--background)) 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, hsl(var(--background) / 0.6) 0%, transparent 60%)",
              }}
            />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 pb-10">
              {/* Genre badges */}
              <div className="mb-2 flex flex-wrap gap-1.5">
                {displayGenres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: "hsl(var(--primary) / 0.15)",
                      color: "hsl(var(--primary))",
                      border: "1px solid hsl(var(--primary) / 0.25)",
                    }}
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h2
                className="mb-1.5 text-xl font-bold leading-tight tracking-tight sm:text-2xl"
                style={{
                  color: "hsl(var(--foreground))",
                  textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
              >
                {item.title}
              </h2>

              {/* Rating & meta */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star
                    size={14}
                    className="fill-amber-400 text-amber-400"
                  />
                  <span className="text-sm font-semibold text-amber-400">
                    {item.rating.toFixed(1)}
                  </span>
                </div>
                <span
                  className="text-xs"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {item.chapters.length} bob
                </span>
              </div>

              {/* Read button */}
              <Link
                to={`/reader/manga/${item.slug}`}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200 active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                  color: "hsl(var(--primary-foreground))",
                  boxShadow: "0 4px 14px hsl(var(--primary) / 0.3)",
                }}
              >
                O'qish
                <ChevronRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        );
      })}

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
        {manga.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`${index + 1}-slaydga o'tish`}
            onClick={() => {
              goToSlide(index);
              resetAutoSlide();
            }}
            className="transition-all duration-300"
            style={{
              width: index === currentIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                index === currentIndex
                  ? "hsl(var(--primary))"
                  : "hsl(var(--foreground) / 0.3)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

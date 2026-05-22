import { useCallback, useEffect, useRef, useState } from "react";
import { X, Search, ChevronDown } from "lucide-react";

import { api } from "../lib/api";
import type { GenreOption } from "../lib/types";

type Props = {
  value: string[];
  onChange: (genres: string[]) => void;
  max?: number;
};

export default function GenrePicker({ value, onChange, max = 10 }: Props) {
  const [allGenres, setAllGenres] = useState<GenreOption[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getGenres().then(setAllGenres).catch(() => {});
  }, []);

  function normalizeTag(tag: string) {
    return tag.trim().replace(/\s+/g, " ").toLowerCase();
  }

  const labelMap = useCallback(
    (val: string) => allGenres.find((g) => g.value === val)?.label ?? val,
    [allGenres],
  );

  const normalizedSearch = normalizeTag(search);
  const filtered = allGenres.filter(
    (g) =>
      !value.includes(g.value) &&
      (g.label.toLowerCase().includes(search.toLowerCase()) ||
        g.value.includes(search.toLowerCase())),
  );
  const canCreate =
    normalizedSearch.length > 0 &&
    value.length < max &&
    !value.includes(normalizedSearch) &&
    !allGenres.some((g) => g.value === normalizedSearch);

  function toggle(genre: string) {
    const normalized = normalizeTag(genre);
    if (!normalized) return;
    if (value.includes(normalized)) {
      onChange(value.filter((v) => v !== normalized));
    } else if (value.length < max) {
      onChange([...value, normalized]);
      setSearch("");
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:border-primary/50"
        onClick={() => setOpen(!open)}
      >
        <span className="text-muted-foreground">
          {value.length === 0
            ? "Janr yoki tag tanlang..."
            : `${value.length} ta tanlandi`}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
            >
              {labelMap(v)}
              <button
                type="button"
                onClick={() => toggle(v)}
                className="text-primary/60 hover:text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border bg-card shadow-lg">
          {/* Search */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish yoki yangi tag yozish..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          {/* Options */}
          <div className="max-h-48 overflow-auto py-1">
            {canCreate && (
              <button
                type="button"
                className="flex w-full items-center px-3 py-1.5 text-sm hover:bg-muted/50"
                onClick={() => toggle(normalizedSearch)}
              >
                Qo'shish: {normalizedSearch}
              </button>
            )}
            {filtered.length === 0 && !canCreate ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Topilmadi
              </div>
            ) : (
              filtered.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  className="flex w-full items-center px-3 py-1.5 text-sm hover:bg-muted/50"
                  onClick={() => toggle(g.value)}
                >
                  {g.label}
                </button>
              ))
            )}
          </div>
          {/* Footer hint */}
          <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            {value.length}/{max} tanlandi
          </div>
        </div>
      )}
    </div>
  );
}

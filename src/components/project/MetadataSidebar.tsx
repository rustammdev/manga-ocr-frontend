import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, ImageIcon, Pencil, Settings2, Trash2 } from "lucide-react";

import type { GenreOption, Project } from "../../lib/types";
import { Button } from "../ui/button";

function genreLabel(val: string, allGenres: GenreOption[]) {
  return allGenres.find((g) => g.value === val)?.label ?? val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface MetadataSidebarProps {
  project: Project;
  allGenres: GenreOption[];
  onEditMeta: () => void;
  onEditSettings: () => void;
  onEditCover: () => void;
  onDeleteCover: () => void;
}

export default function MetadataSidebar({
  project,
  allGenres,
  onEditMeta,
  onEditSettings,
  onEditCover,
  onDeleteCover,
}: MetadataSidebarProps) {
  const coverUrl = project.metadata?.cover_url;
  const [showDetails, setShowDetails] = useState(false);

  const meta = project.metadata;
  const hasAnyMeta =
    meta && (meta.description || (meta.tags && meta.tags.length > 0));

  // Sidebar va metadata kartochka eni — cover bilan bir xil (180px).
  return (
    <div className="w-full shrink-0 xl:w-[200px]">
      {/* Cover */}
      <div className="mb-3 group relative">
        {coverUrl ? (
          <div className="flex justify-center">
            <div className="relative w-[180px] h-[300px] rounded-lg overflow-hidden border">
              <img
                src={coverUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs" onClick={onEditCover}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={onDeleteCover}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              className="flex w-[180px] h-[300px] items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 text-sm text-muted-foreground/60 hover:border-primary/40 hover:text-muted-foreground transition-colors"
              onClick={onEditCover}
            >
              <ImageIcon className="h-5 w-5" />
              Muqova
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto w-[180px] rounded-lg border bg-card">
        <button
          className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
          onClick={() => setShowDetails((v) => !v)}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {showDetails ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium truncate">Ma'lumotlar</span>
          </div>
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onEditMeta}
              title="Ma'lumotlarni tahrirlash"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onEditSettings}
              title="Sozlamalar"
            >
              <Settings2 className="h-3 w-3" />
            </Button>
          </div>
        </button>
        {showDetails && (
          <div className="border-t p-3">
            <div className="space-y-2">
              {meta?.description ? (
                <p className="text-xs text-muted-foreground break-words">{meta.description}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground/60 italic">Tavsif yo'q</p>
              )}
              {meta?.tags && meta.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {meta.tags.map((tag) => (
                    <span key={tag} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                      {genreLabel(tag, allGenres)}
                    </span>
                  ))}
                </div>
              )}
              {!hasAnyMeta && (
                <p className="text-[11px] text-muted-foreground/60 italic">Ma'lumot yo'q</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

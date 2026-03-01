import { FileText, ImageIcon, Pencil, Settings2, Trash2 } from "lucide-react";

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
  return (
    <div className="w-full shrink-0 xl:w-[420px]">
      {/* Cover */}
      <div className="mb-4 group relative">
        {coverUrl ? (
          <div className="flex justify-center">
            <div className="relative w-[210px] h-[350px] rounded-lg overflow-hidden border">
              <img
                src={coverUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs" onClick={onEditCover}>
                  <Pencil className="h-3 w-3" />
                  O'zgartirish
                </Button>
                <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={onDeleteCover}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 py-8 text-sm text-muted-foreground/60 hover:border-primary/40 hover:text-muted-foreground transition-colors"
            onClick={onEditCover}
          >
            <ImageIcon className="h-5 w-5" />
            Muqova qo'shish
          </button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ma'lumotlar</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={onEditMeta}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={onEditSettings}
            >
              <Settings2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {project.metadata?.description ? (
              <p className="text-sm text-muted-foreground">{project.metadata.description}</p>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">Tavsif yo'q</p>
            )}
            {project.metadata && (
              <div className="space-y-1">
                {project.metadata.title_uz && (
                  <div className="text-xs"><span className="text-muted-foreground">UZ:</span> {project.metadata.title_uz}</div>
                )}
                {project.metadata.title_ru && (
                  <div className="text-xs"><span className="text-muted-foreground">RU:</span> {project.metadata.title_ru}</div>
                )}
                {project.metadata.title_en && (
                  <div className="text-xs"><span className="text-muted-foreground">EN:</span> {project.metadata.title_en}</div>
                )}
                {project.metadata.title_ja && (
                  <div className="text-xs"><span className="text-muted-foreground">JA:</span> {project.metadata.title_ja}</div>
                )}
                {project.metadata.title_ko && (
                  <div className="text-xs"><span className="text-muted-foreground">KO:</span> {project.metadata.title_ko}</div>
                )}
              </div>
            )}
            {project.metadata?.tags && project.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {project.metadata.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {genreLabel(tag, allGenres)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

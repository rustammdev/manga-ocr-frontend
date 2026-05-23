import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Languages, Trash2, Loader2, Upload, Rocket } from "lucide-react";

import { Button } from "../ui/button";

interface ProjectHeaderProps {
  manga: string;
  displayName: string;
  hasOcrDone: boolean;
  hasTranslating: boolean;
  hasPublishableChapters: boolean;
  isPublishing: boolean;
  isAutoPiloting: boolean;
  onTranslate: () => void;
  onPublish: () => void;
  onAutoPilot: () => void;
  onDelete: () => void;
}

export default function ProjectHeader({
  manga,
  displayName,
  hasOcrDone,
  hasTranslating,
  hasPublishableChapters,
  isPublishing,
  isAutoPiloting,
  onTranslate,
  onPublish,
  onAutoPilot,
  onDelete,
}: ProjectHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link
          to="/"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <h1 className="page-title">{displayName}</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/upload/${manga}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Bob qo'shish
          </Button>
        </Link>

        {/* Auto Pilot — barcha bosqichlarni ketma-ket avtomatik bajarish */}
        <Button
          size="sm"
          variant="default"
          onClick={onAutoPilot}
          disabled={isAutoPiloting}
          className="gap-1.5 bg-blue-600 hover:bg-blue-700"
        >
          {isAutoPiloting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Rocket className="h-3.5 w-3.5" />
          )}
          Auto Pilot
        </Button>

        {hasTranslating ? (
          <Button variant="secondary" size="sm" disabled className="gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Tarjima jarayonda
          </Button>
        ) : hasOcrDone ? (
          <Button size="sm" variant="outline" onClick={onTranslate} className="gap-1.5">
            <Languages className="h-3.5 w-3.5" />
            Tarjima qilish
          </Button>
        ) : null}
        {hasPublishableChapters && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPublishing}
            onClick={onPublish}
            className="gap-1.5"
          >
            {isPublishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Publish
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1.5">
          <Trash2 className="h-3.5 w-3.5" />
          O'chirish
        </Button>
      </div>
    </div>
  );
}

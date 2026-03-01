import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ArrowRight,
  Upload,
  ScanText,
  Languages,
  Send,
  CheckCircle2,
} from "lucide-react";

import type { Project } from "../../lib/types";
import { Badge } from "../ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";

// --- helpers ---

type ProjectStage = "uploaded" | "ocr" | "translate" | "publish" | "done";

function getProjectStage(project: Project): ProjectStage {
  const statuses = project.chapters.map((ch) => ch.status);
  if (statuses.length === 0) return "uploaded";

  const allDone = statuses.every((s) => s === "done");
  if (allDone) {
    return project.published_at ? "done" : "publish";
  }

  // All chapters past OCR (ocr_done / translating / done)
  const allPastOcr = statuses.every(
    (s) => s === "ocr_done" || s === "translating" || s === "done"
  );
  if (allPastOcr) return "translate";

  // At least one chapter started or completed OCR
  const hasOcrActivity = statuses.some(
    (s) =>
      s === "processing" ||
      s === "ocr_done" ||
      s === "translating" ||
      s === "done"
  );
  if (hasOcrActivity) return "ocr";

  return "uploaded";
}

const stageTabs: {
  id: ProjectStage | "all";
  label: string;
  icon: typeof BookOpen;
}[] = [
  { id: "all", label: "Barchasi", icon: BookOpen },
  { id: "uploaded", label: "Yuklangan", icon: Upload },
  { id: "ocr", label: "OCR & Tozalash", icon: ScanText },
  { id: "translate", label: "Tarjima", icon: Languages },
  { id: "publish", label: "Nashr", icon: Send },
  { id: "done", label: "Tayyor", icon: CheckCircle2 },
];

function statusForProject(project: Project) {
  const statuses = project.chapters.map((ch) => ch.status);
  const doneCount = statuses.filter((s) => s === "done").length;
  const hasDone = statuses.includes("done");
  const hasProcessing =
    statuses.includes("processing") || statuses.includes("translating");
  const mainStatus = hasProcessing
    ? "processing"
    : hasDone
      ? "done"
      : "uploaded";
  return { doneCount, mainStatus };
}

const statusVariant: Record<
  string,
  "success" | "info" | "warning" | "danger"
> = {
  done: "success",
  processing: "warning",
  translating: "warning",
  uploaded: "info",
  failed: "danger",
};

function genreLabel(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- Manga Card ---

function MangaCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { doneCount, mainStatus } = statusForProject(project);
  const progress =
    project.chapter_count > 0
      ? Math.round((doneCount / project.chapter_count) * 100)
      : 0;

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/30 hover:shadow-md"
      onClick={() => navigate(`/project/${project.slug}`)}
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {project.metadata?.cover_url ? (
          <img
            src={project.metadata.cover_url}
            alt={project.display_name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute right-2 top-2">
          <Badge variant={statusVariant[mainStatus] || "info"}>
            {mainStatus}
          </Badge>
        </div>

        {/* Hover arrow */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <ArrowRight className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2 space-y-1.5">
        <h3 className="text-sm font-medium truncate">
          {project.display_name}
        </h3>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {doneCount}/{project.chapter_count}
          </span>
        </div>

        {/* Tags */}
        {project.metadata?.tags && project.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.metadata.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary"
              >
                {genreLabel(tag)}
              </span>
            ))}
            {project.metadata.tags.length > 2 && (
              <span className="text-[11px] text-muted-foreground">
                +{project.metadata.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main FolderView ---

interface FolderViewProps {
  projects: Project[];
  error: string | null;
}

export default function FolderView({ projects, error }: FolderViewProps) {
  // Group projects by pipeline stage
  const grouped = useMemo(() => {
    const map: Record<string, Project[]> = {
      all: projects,
      uploaded: [],
      ocr: [],
      translate: [],
      publish: [],
      done: [],
    };
    for (const p of projects) {
      const stage = getProjectStage(p);
      map[stage].push(p);
    }
    return map;
  }, [projects]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
        Xatolik: {error}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-14 text-center">
        <BookOpen className="mb-2 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Hali manga yo'q</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          "Yangi manga" tugmasini bosib boshlang
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Mangalar</h2>
        <span className="text-xs text-muted-foreground">
          {projects.length} ta loyiha
        </span>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto gap-1">
          {stageTabs.map((tab) => {
            const Icon = tab.icon;
            const count = grouped[tab.id]?.length ?? 0;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {stageTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            {(grouped[tab.id]?.length ?? 0) > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {grouped[tab.id].map((project) => (
                  <MangaCard key={project.slug} project={project} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                <tab.icon className="mb-2 h-6 w-6 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground/50">
                  Bu bosqichda manga yo'q
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cloud, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { api } from "../lib/api";
import type { Project, Stats } from "../lib/types";
import { Button } from "../components/ui/button";
import StatsCards from "../components/dashboard/StatsCards";
import FolderView from "../components/dashboard/FolderView";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncingR2, setSyncingR2] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.getStats(), api.getProjects()])
      .then(([statsData, projectsData]) => {
        if (!active) return;
        setStats(statsData);
        setProjects(projectsData);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Xatolik");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleR2Sync() {
    setSyncingR2(true);
    try {
      const preview = await api.syncR2({
        mode: "all",
        dry_run: true,
        overwrite_local: false,
      });
      const skipped = preview.skipped_local_chapters.length;
      const warnings = preview.warnings.slice(0, 3).join("\n");
      const ok = confirm(
        [
          `R2 preview: ${preview.scanned_projects} manga, ${preview.created_projects} yangi project, ${preview.created_chapters} yangi chapter.`,
          `${preview.updated_chapters} chapter yangilanadi, ${skipped} local chapter saqlab qolinadi.`,
          warnings ? `\nOgohlantirishlar:\n${warnings}` : "",
          "\nReal sync boshlansinmi?",
        ].join("\n")
      );
      if (!ok) return;

      const result = await api.syncR2({
        mode: "all",
        dry_run: false,
        overwrite_local: false,
      });
      const [statsData, projectsData] = await Promise.all([
        api.getStats(),
        api.getProjects(),
      ]);
      setStats(statsData);
      setProjects(projectsData);
      toast.success(
        `R2 sync: ${result.created_projects} project, ${result.created_chapters} chapter qo'shildi`
      );
      if (result.warnings.length > 0) {
        toast.info(`${result.warnings.length} ta ogohlantirish bor`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSyncingR2(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Pipeline holati va loyihalar statistikasi.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={syncingR2}
            onClick={handleR2Sync}
          >
            {syncingR2 ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cloud className="h-3.5 w-3.5" />
            )}
            Sync R2
          </Button>
          <Link to="/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Yangi manga
            </Button>
          </Link>
        </div>
      </div>

      <StatsCards stats={stats} />
      <FolderView projects={projects} error={error} />
    </div>
  );
}

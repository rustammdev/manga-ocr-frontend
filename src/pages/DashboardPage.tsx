import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { api } from "../lib/api";
import type { Project, Stats } from "../lib/types";
import { Button } from "../components/ui/button";
import StatsCards from "../components/dashboard/StatsCards";
import FolderView from "../components/dashboard/FolderView";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Pipeline holati va loyihalar statistikasi.</p>
        </div>
        <Link to="/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Yangi manga
          </Button>
        </Link>
      </div>

      <StatsCards stats={stats} />
      <FolderView projects={projects} error={error} />
    </div>
  );
}

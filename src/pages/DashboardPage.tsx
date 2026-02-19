import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../lib/api";
import type { Project, Stats } from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

function statusForProject(project: Project) {
  const statuses = project.chapters.map((ch) => ch.status);
  const doneCount = statuses.filter((s) => s === "done").length;
  const hasDone = statuses.includes("done");
  const hasProcessing = statuses.includes("processing") || statuses.includes("translating");
  const mainStatus = hasProcessing ? "processing" : hasDone ? "done" : "uploaded";
  return { doneCount, mainStatus };
}

const statusVariant: Record<string, "success" | "info" | "warning" | "danger"> = {
  done: "success",
  processing: "warning",
  translating: "warning",
  uploaded: "info",
  failed: "danger",
};

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
    <div className="space-y-10">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Manga pipeline holati va loyihalar statistikasi.
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-soft"
        >
          + Yangi yuklash
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats ? (
          [
            { label: "Jami manga", value: stats.total_projects },
            { label: "Jami chapter", value: stats.total_chapters },
            { label: "Tayyor", value: stats.done_chapters },
            { label: "Jarayonda", value: stats.processing_chapters },
            {
              label: "API xarajat",
              value: stats.total_cost_usd > 0 ? `$${stats.total_cost_usd.toFixed(4)}` : "$0",
              mono: true,
            },
          ].map((item) => (
            <Card key={item.label} className="bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={item.mono ? "text-2xl font-semibold mono" : "text-2xl font-semibold"}>
                  {item.value}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-6 text-sm text-muted-foreground">
              Statistikalar yuklanmoqda...
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Mangalar</h2>
          <span className="text-sm text-muted-foreground">
            {projects.length} ta loyiha
          </span>
        </div>

        {error ? (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">Xatolik: {error}</CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Hali manga yo'q. "Yangi yuklash" orqali boshlang.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const { doneCount, mainStatus } = statusForProject(project);
              return (
                <Link key={project.name} to={`/project/${project.name}`} className="group">
                  <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
                    <CardContent className="space-y-3 p-6">
                      <div className="text-lg font-semibold">{project.name}</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{project.chapter_count} chapter</span>
                        <span>•</span>
                        <span>
                          {doneCount}/{project.chapter_count} tayyor
                        </span>
                      </div>
                      <Badge variant={statusVariant[mainStatus] || "info"}>
                        {mainStatus}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

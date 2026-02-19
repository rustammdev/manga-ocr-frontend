import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../lib/api";
import type { JobInfo, WsMessage } from "../lib/types";
import { useJobWebSocket } from "../lib/ws";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";

function phaseForProgress(progress: number) {
  if (progress <= 8) return "Tayyorgarlik...";
  if (progress <= 25) return "Mask generation...";
  if (progress <= 65) return "OCR — matn tanib olish...";
  if (progress <= 78) return "Tarjima qilish...";
  if (progress <= 92) return "Rasmlarni tozalash...";
  return "Yakunlanmoqda...";
}

export default function JobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<JobInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("Kutilmoqda...");
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"running" | "done" | "failed" | "cancelled" | "idle">(
    "idle"
  );
  const [costUsd, setCostUsd] = useState<number | null>(null);
  const [meta, setMeta] = useState<string>("");

  useEffect(() => {
    if (!jobId) return;
    api
      .getJob(jobId)
      .then((data) => {
        setJob(data);
        setStatus(data.status === "running" ? "running" : data.status);
        if (data.cost_usd) setCostUsd(parseFloat(data.cost_usd));
        if (data.status === "done") {
          setProgress(100);
          setPhase("Tayyor!");
        } else if (data.status === "cancelled") {
          setProgress(0);
          setPhase("Bekor qilindi");
        } else if (data.status === "failed") {
          setProgress(0);
          setPhase("Xatolik!");
        }
      })
      .catch(() => {
        setStatus("failed");
      });
  }, [jobId]);

  const handleMessage = useCallback(
    (data: WsMessage) => {
      if (data.type === "log") {
        const clean = data.message.replace(/\[PROGRESS:\d+]\s*/g, "");
        if (clean.trim()) {
          setLogs((prev) => [...prev, clean]);
        }
        if (typeof data.progress === "number") {
          setProgress((prev) => Math.max(prev, data.progress));
          setPhase(phaseForProgress(data.progress));
        }
      }
      if (data.type === "done") {
        setProgress(100);
        setPhase("Tayyor!");
        setStatus("done");
        if (data.cost_usd) setCostUsd(data.cost_usd);
        if (data.pages || data.regions || data.chapters) {
          const stats: string[] = [];
          if (data.pages) stats.push(`${data.pages} sahifa`);
          if (data.regions) stats.push(`${data.regions} region`);
          if (data.chapters) stats.push(`${data.chapters} chapter`);
          setMeta(stats.join(", "));
        }
      }
      if (data.type === "cancelled") {
        setStatus("cancelled");
        setPhase("Bekor qilindi");
      }
      if (data.type === "error") {
        setStatus("failed");
        setPhase("Xatolik!");
      }
    },
    []
  );

  const handleClose = useCallback(() => {
    if (!jobId) return;
    api.getJob(jobId).then((data) => {
      if (data.status !== "running") {
        setJob(data);
        setStatus(data.status);
      }
    });
  }, [jobId]);

  useJobWebSocket(job && job.status === "running" ? job.id : null, handleMessage, handleClose);

  const statusBadge = useMemo(() => {
    if (status === "running") return <Badge variant="warning">Ishlayapti</Badge>;
    if (status === "done") return <Badge variant="success">Tayyor</Badge>;
    if (status === "cancelled") return <Badge variant="info">Bekor qilindi</Badge>;
    if (status === "failed") return <Badge variant="danger">Xatolik</Badge>;
    return <Badge variant="outline">Kutilmoqda</Badge>;
  }, [status]);

  async function handleCancel() {
    if (!jobId) return;
    if (!confirm("Jobni to'xtatmoqchimisiz?")) return;
    await api.cancelJob(jobId);
  }

  async function handleRestart() {
    if (!jobId) return;
    const res = await api.restartJob(jobId);
    window.location.href = `/job/${res.job_id}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Job: {jobId}</h1>
          {job ? (
            <p className="mt-2 text-muted-foreground">
              {job.manga} / {job.chapter || "—"} • {job.language?.toUpperCase()} • {job.backend}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/jobs">
            <Button variant="outline">Orqaga</Button>
          </Link>
          {status === "running" ? (
            <Button variant="destructive" onClick={handleCancel}>
              To'xtatish
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            {statusBadge}
            {meta ? <span className="text-sm text-muted-foreground">{meta}</span> : null}
          </div>
          <Progress value={progress} className={status === "failed" ? "bg-red-100" : undefined} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{phase}</span>
            <span>{progress}%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-3 text-sm font-medium">Loglar</div>
          <div className="max-h-72 overflow-auto rounded-lg border bg-white/70 p-3 text-xs text-muted-foreground">
            {logs.length === 0 ? (
              <div>Ulanmoqda...</div>
            ) : (
              logs.map((log, idx) => <div key={`${log}-${idx}`}>{log}</div>)
            )}
          </div>
        </CardContent>
      </Card>

      {typeof costUsd === "number" ? (
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <div className="text-sm text-muted-foreground">API xarajat</div>
              <div className="text-2xl font-semibold mono">${costUsd.toFixed(6)}</div>
            </div>
            <Badge variant="warning">Hisob</Badge>
          </CardContent>
        </Card>
      ) : null}

      {(status === "failed" || status === "cancelled") && job ? (
        <div className="flex items-center gap-2">
          <Link to={`/project/${job.manga}`}>
            <Button variant="outline">Manga</Button>
          </Link>
          <Button onClick={handleRestart}>Qayta ishga tushirish</Button>
        </div>
      ) : null}

      {status === "done" && job?.chapter ? (
        <div className="flex items-center gap-2">
          <Link to={`/project/${job.manga}`}>
            <Button variant="outline">Manga</Button>
          </Link>
          <Link to={`/results/${job.manga}/${job.chapter}`}>
            <Button>Natijalarni ko'rish</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

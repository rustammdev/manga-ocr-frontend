import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, Square, Eye, DollarSign } from "lucide-react";
import { toast } from "sonner";

import { api } from "../lib/api";
import type { JobInfo, WsMessage } from "../lib/types";
import { useJobWebSocket } from "../lib/ws";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import JobProgressCard from "../components/job/JobProgressCard";
import JobLogs from "../components/job/JobLogs";

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
  const navigate = useNavigate();
  const [job, setJob] = useState<JobInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("Kutilmoqda...");
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"running" | "done" | "failed" | "cancelled" | "idle">("idle");
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
      .catch(() => setStatus("failed"));
  }, [jobId]);

  const handleMessage = useCallback((data: WsMessage) => {
    if (data.type === "log") {
      const clean = data.message.replace(/\[PROGRESS:\d+]\s*/g, "");
      if (clean.trim()) setLogs((prev) => [...prev, clean]);
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
      toast.error(data.message || "Job xatolik bilan tugadi");
    }
  }, []);

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
    navigate(`/job/${res.job_id}`);
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/jobs"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Joblar
          </Link>
          <h1 className="page-title flex items-center gap-3">
            Job
            <span className="mono text-lg font-normal text-muted-foreground">{jobId}</span>
          </h1>
          {job && (
            <p className="page-description">
              {job.manga} / {job.chapter ? `${job.chapter}-bob` : "—"} · {job.language?.toUpperCase()} · {job.backend}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === "running" && (
            <Button variant="destructive" size="sm" onClick={handleCancel} className="gap-1.5">
              <Square className="h-3.5 w-3.5" />
              To'xtatish
            </Button>
          )}
        </div>
      </div>

      <JobProgressCard
        status={status}
        progress={progress}
        phase={phase}
        meta={meta}
        statusBadge={statusBadge}
      />

      <JobLogs logs={logs} />

      {/* Cost */}
      {typeof costUsd === "number" && (
        <div className="flex items-center gap-4 rounded-lg border bg-card p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">API xarajat</div>
            <div className="text-xl font-semibold mono">${costUsd.toFixed(6)}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      {(status === "failed" || status === "cancelled") && job && (
        <div className="flex items-center gap-2">
          <Link to={`/project/${job.manga}`}>
            <Button variant="outline">Manga</Button>
          </Link>
          <Button onClick={handleRestart} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Qayta ishga tushirish
          </Button>
        </div>
      )}

      {status === "done" && job?.chapter && (
        <div className="flex items-center gap-2">
          <Link to={`/project/${job.manga}`}>
            <Button variant="outline">Manga</Button>
          </Link>
          <Link to={`/results/${job.manga}/${job.chapter}`}>
            <Button className="gap-1.5">
              <Eye className="h-4 w-4" />
              Natijalarni ko'rish
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

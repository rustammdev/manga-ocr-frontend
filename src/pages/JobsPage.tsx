import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../lib/api";
import type { JobInfo } from "../lib/types";
import { formatTime } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

const statusVariant: Record<string, "success" | "info" | "warning" | "danger"> = {
  done: "success",
  running: "warning",
  failed: "danger",
  cancelled: "info",
};

export default function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getJobs()
      .then((data) => setJobs(data.reverse()))
      .catch((err) => setError(err.message || "Xatolik"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Job tarixi</h1>
        <p className="mt-2 text-muted-foreground">Pipeline ishga tushgan barcha jarayonlar.</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">Xatolik: {error}</CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Hali job yo'q. Pipeline ishga tushirganingizda bu yerda ko'rinadi.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Manga / Chapter</TableHead>
                  <TableHead>Sozlamalar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Xarajat</TableHead>
                  <TableHead>Vaqt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/job/${job.id}`)}
                  >
                    <TableCell className="mono text-xs">{job.id}</TableCell>
                    <TableCell>
                      {job.manga} / {job.chapter || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.language?.toUpperCase()} • {job.backend}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[job.status] || "info"}>{job.status}</Badge>
                    </TableCell>
                    <TableCell className="mono text-xs">
                      {job.cost_usd ? `$${parseFloat(job.cost_usd).toFixed(4)}` : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(job.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import type {
  JobInfo,
  JobStartResponse,
  Project,
  RestartResponse,
  ResultsData,
  Stats,
  TranslateResponse,
  UploadResponse,
} from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return (await res.json()) as T;
}

export const api = {
  getProjects(): Promise<Project[]> {
    return fetch("/api/projects").then(handle<Project[]>);
  },
  getProject(name: string): Promise<Project> {
    return fetch(`/api/projects/${encodeURIComponent(name)}`).then(handle<Project>);
  },
  saveProjectSettings(name: string, settings: Record<string, unknown>) {
    return fetch(`/api/projects/${encodeURIComponent(name)}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }).then(handle);
  },
  deleteProject(name: string) {
    return fetch(`/api/projects/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }).then(handle);
  },
  deleteChapter(manga: string, chapter: string) {
    return fetch(`/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}`, {
      method: "DELETE",
    }).then(handle);
  },
  getStats(): Promise<Stats> {
    return fetch("/api/stats").then(handle<Stats>);
  },
  uploadFiles(manga: string, chapter: string, files: File[]): Promise<UploadResponse> {
    const form = new FormData();
    form.append("manga_name", manga);
    form.append("chapter_name", chapter);
    for (const f of files) {
      form.append("files", f);
    }
    return fetch(
      `/api/upload?manga_name=${encodeURIComponent(manga)}&chapter_name=${encodeURIComponent(chapter)}`,
      { method: "POST", body: form }
    ).then(handle<UploadResponse>);
  },
  startJob(payload: Record<string, unknown>): Promise<JobStartResponse> {
    return fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle<JobStartResponse>);
  },
  getJobs(): Promise<JobInfo[]> {
    return fetch("/api/jobs").then(handle<JobInfo[]>);
  },
  getJob(jobId: string): Promise<JobInfo> {
    return fetch(`/api/jobs/${encodeURIComponent(jobId)}`).then(handle<JobInfo>);
  },
  cancelJob(jobId: string) {
    return fetch(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    }).then(handle);
  },
  restartJob(jobId: string): Promise<RestartResponse> {
    return fetch(`/api/jobs/${encodeURIComponent(jobId)}/restart`, {
      method: "POST",
    }).then(handle<RestartResponse>);
  },
  translateManga(payload: Record<string, unknown>): Promise<TranslateResponse> {
    return fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle<TranslateResponse>);
  },
  translateChapter(payload: Record<string, unknown>): Promise<TranslateResponse> {
    return fetch("/api/translate-chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle<TranslateResponse>);
  },
  getResults(manga: string, chapter: string): Promise<ResultsData> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}`).then(
      handle<ResultsData>
    );
  },
  addRegion(manga: string, chapter: string, pageIdx: number, payload: Record<string, unknown>) {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/regions/${pageIdx}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle);
  },
  deleteRegion(manga: string, chapter: string, pageIdx: number, regionIdx: number) {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/regions/${pageIdx}/${regionIdx}`, {
      method: "DELETE",
    }).then(handle);
  },
  updateRegion(manga: string, chapter: string, pageIdx: number, regionIdx: number, payload: Record<string, unknown>) {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/regions/${pageIdx}/${regionIdx}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle);
  },
};

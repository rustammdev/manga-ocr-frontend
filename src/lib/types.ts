export type ChapterStatus =
  | "uploaded"
  | "processing"
  | "ocr_done"
  | "translating"
  | "done"
  | "failed";

export type Chapter = {
  name: string;
  image_count: number;
  status: ChapterStatus;
  job_id?: string | null;
};

export type Project = {
  name: string;
  chapters: Chapter[];
  chapter_count: number;
  created_at?: string;
  settings?: ProjectSettings;
};

export type ProjectSettings = {
  language: "ja" | "ko" | "ru" | "en";
  backend: "openai" | "ollama" | "gemini";
  ocr_backend: "auto" | "openai" | "ollama";
  limit: number;
};

export type JobStatus = "running" | "done" | "failed" | "cancelled";

export type JobInfo = {
  id: string;
  manga: string;
  chapter: string;
  language: string;
  backend: string;
  ocr_backend: string;
  status: JobStatus;
  created_at?: string;
  finished_at?: string;
  cost_usd?: string;
  error?: string;
};

export type Stats = {
  total_projects: number;
  total_chapters: number;
  done_chapters: number;
  processing_chapters: number;
  total_cost_usd: number;
};

export type Region = {
  bbox: { x: number; y: number; w: number; h: number };
  original_text?: string;
  uz_text?: string;
  manual?: boolean;
};

export type Page = {
  image_url?: string;
  cleaned_image_url?: string;
  regions: Region[];
};

export type UsageInfo = {
  model?: string;
  ocr_backend?: string;
  translator_backend?: string;
  estimated_cost_usd?: number;
  total_tokens?: number;
  requests?: number;
};

export type ResultsData = {
  pages: Page[];
  translated?: boolean;
  ocr_usage?: UsageInfo;
  translator_usage?: UsageInfo;
};

export type WsMessage =
  | { type: "log"; message: string; level: string; progress: number }
  | { type: "done"; message: string; progress: number; pages?: number; regions?: number; chapters?: number; cost_usd?: number }
  | { type: "error"; message: string; progress: number }
  | { type: "cancelled"; message: string; progress: number }
  | { type: "ping"; message: string };

export type UploadResponse = { manga: string; chapter: string; saved: number };
export type JobStartResponse = { job_id: string };
export type TranslateResponse = { job_id: string; type?: string };
export type RestartResponse = { job_id: string; old_job_id?: string };

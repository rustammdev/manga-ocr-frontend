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
  source?: string;
  automation_score?: number;
  has_tall_images?: boolean;
  crop_status?: string | null;
  is_validated?: boolean;
  thumbnail_url?: string;
  remote?: boolean;
  r2_chapter_key?: string;
  published_page_count?: number;
};

export type ProjectMetadata = {
  description: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  title_ja: string;
  title_ko: string;
  tags: string[];
  cover_url?: string;
};

export type Project = {
  slug: string;
  display_name: string;
  chapters: Chapter[];
  chapter_count: number;
  created_at?: string;
  settings?: ProjectSettings;
  metadata?: ProjectMetadata;
  automation_avg?: number;
  folder?: string;
  published_at?: string;
  published_chapters?: string[];
};

export type ProjectCreateRequest = {
  name: string;
  description?: string;
  title_uz?: string;
  title_ru?: string;
  title_en?: string;
  title_ja?: string;
  title_ko?: string;
  tags?: string[];
  language?: "ja" | "ko" | "ru" | "en";
  backend?: "openai" | "ollama" | "gemini";
  ocr_backend?: "auto" | "openai" | "ollama" | "paddle" | "yolo_florence";
  cleaner_backend?: CleanerBackendValue;
  translator_model?: string;
  limit?: number;
  folder?: string;
};

export type MangaAutofillRequest = {
  raw_text: string;
};

export type MangaAutofillResponse = {
  name: string;
  description: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  title_ja: string;
  title_ko: string;
  tags: string[];
};

export type ProjectMetadataUpdate = {
  description?: string;
  title_uz?: string;
  title_ru?: string;
  title_en?: string;
  title_ja?: string;
  title_ko?: string;
  tags?: string[];
};

export type Tag = {
  id: number;
  name: string;
  project_count: number;
};

export type Folder = {
  name: string;
  created_at: string;
  project_count: number;
};

export type GenreOption = {
  value: string;
  label: string;
};

export type CleanerBackendValue = "pcleaner" | "lama";

export type ProjectSettings = {
  language: "ja" | "ko" | "ru" | "en";
  backend: "openai" | "ollama" | "gemini";
  ocr_backend: "auto" | "openai" | "ollama" | "paddle" | "yolo_florence";
  cleaner_backend: CleanerBackendValue;
  translator_model: string;
  limit: number;
  detect_dark_bubbles: boolean;
};

export type TranslatorModelInfo = {
  value: string;
  label: string;
  default?: boolean;
};

export type TranslatorModelsMap = Record<string, TranslatorModelInfo[]>;

export type OcrBackendValue = ProjectSettings["ocr_backend"];

export type OcrBackendInfo = {
  value: OcrBackendValue;
  label: string;
  type: "local" | "api";
  monthly_limit?: number;
  used?: number;
  remaining?: number;
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
  bubble_bbox?: { x: number; y: number; w: number; h: number };
  original_text?: string;
  uz_text?: string;
  manual?: boolean;
  is_dark_bubble?: boolean;
  font_size?: number;
  rotation?: number;
  font_weight?: string;
  font_style?: string;
  font_color?: string;
  font_family?: string;
  font_stroke_color?: string;
  font_stroke_width?: number;
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

export type AutomationInfo = {
  score: number;
  has_batch_ocr: boolean;
  has_batch_translate: boolean;
  manual_action_count: number;
  total_regions: number;
};

export type MangaAutomation = {
  average_score: number;
  chapters: Record<string, number>;
};

export type ResultsData = {
  pages: Page[];
  translated?: boolean;
  ocr_usage?: UsageInfo;
  translator_usage?: UsageInfo;
  automation?: AutomationInfo;
};

export type StepTiming = {
  elapsed_sec: number;
  segments?: number;
  masks?: number;
  regions?: number;
  texts?: number;
  skipped?: boolean;
};

export type RunConfig = {
  language?: string;
  ocr_backend?: string;
  cleaner_backend?: string;
  translator_backend?: string;
  translator_model?: string;
  skip_clean?: boolean;
};

export type RunEntry = {
  job_id: string;
  started_at: string;
  finished_at: string;
  total_sec: number;
  config: RunConfig;
  steps: Record<string, StepTiming>;
  pages?: number;
  regions?: number;
};

export type RunInfo = {
  version: number;
  ocr_run?: RunEntry;
  translate_run?: RunEntry;
};

export type WsMessage =
  | { type: "log"; message: string; level: string; progress: number; chapter?: string; page?: number; total_pages?: number; uploaded_mb?: number }
  | { type: "done"; message: string; progress: number; pages?: number; regions?: number; chapters?: number; cost_usd?: number; published_chapters?: number; total_pages?: number; total_mb?: number; cdn_base_url?: string }
  | { type: "error"; message: string; progress: number }
  | { type: "cancelled"; message: string; progress: number }
  | { type: "ping"; message: string };

export type CropImageInfo = {
  filename: string;
  width: number;
  height: number;
  image_url: string;
  crop_lines: number[];
};

export type CropPreviewResponse = {
  images: CropImageInfo[];
  saved_config: { version: number; images: { filename: string; crop_lines: number[] }[] } | null;
  has_tall_images: boolean;
};

export type PageInfo = {
  filename: string;
  image_url: string;
  width: number;
  height: number;
};

export type UploadResponse = { manga: string; chapter: string; saved: number };
export type JobStartResponse = { job_id: string };
export type TranslateResponse = { job_id: string; type?: string };
export type RestartResponse = { job_id: string; old_job_id?: string };
export type RetranslateResponse = { ok: boolean; retranslated: number };

export type RetranslateRequest = {
  regions?: { page_idx: number; region_idx: number }[];
  all?: boolean;
  backend?: string;
};

export type PublishStartResponse = {
  publish_id: string;
  chapters_to_publish?: number;
  pages_to_publish?: number;
};

export type R2SyncRequest = {
  mode?: "all" | "manga";
  manga?: string | null;
  dry_run?: boolean;
  overwrite_local?: boolean;
};

export type R2SyncProjectSummary = {
  slug: string;
  title: string;
  chapters: number;
  created_chapters: number;
  updated_chapters: number;
  skipped_local_chapters: number;
};

export type R2SyncResponse = {
  dry_run: boolean;
  overwrite_local: boolean;
  scanned_projects: number;
  created_projects: number;
  updated_projects: number;
  created_chapters: number;
  updated_chapters: number;
  skipped_local_chapters: { manga: string; chapter: string; source: string }[];
  warnings: string[];
  projects: R2SyncProjectSummary[];
};

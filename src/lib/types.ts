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
  auto_merged?: boolean;
  timings?: Record<string, number>;
  // Tarjima statistikasi — yarim tarjima qilingan boblarni aniqlash uchun.
  total_regions?: number;
  translated_regions?: number;
};

export type AuthorRole = "story" | "art" | "original" | "story_art";

export type AuthorEntry = {
  name: string;
  role: AuthorRole;
};

export type AgeRating = "all_ages" | "10+" | "13+" | "16+" | "18+";

export type ScheduleDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type MangaStatus = "ongoing" | "completed" | "hiatus";

export type ProjectMetadata = {
  description: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  title_ja: string;
  title_ko: string;
  tags: string[];
  cover_url?: string;
  age_rating?: AgeRating;
  rating?: number | null;
  authors?: AuthorEntry[];
  status?: MangaStatus;
  year?: number | null;
  alt_titles?: string[];
  schedule_days?: ScheduleDay[];
  mangadex_id?: string | null;
  mangalib_slug?: string | null;
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
  age_rating?: AgeRating;
  rating?: number | null;
  authors?: AuthorEntry[];
  status?: MangaStatus;
  year?: number | null;
  alt_titles?: string[];
  schedule_days?: ScheduleDay[];
  language?: "ja" | "ko" | "ru" | "en";
  backend?: "openai" | "ollama" | "gemini" | "anthropic" | "kiro";
  ocr_backend?: "auto" | "openai" | "ollama" | "paddle" | "yolo_florence" | "yolo_gemini" | "apple_vision";
  cleaner_backend?: CleanerBackendValue;
  inpaint_backend?: InpaintBackendValue;
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

export type MangaLibCreateRequest = {
  url_or_slug: string;
  folder?: string;
};

export type MangaLibCreateResponse = {
  ok: boolean;
  slug: string;
  title: string;
  mangalib_slug: string;
  cover_url: string;
  chapter_count: number;
};

export type ProjectMetadataUpdate = {
  description?: string;
  title_uz?: string;
  title_ru?: string;
  title_en?: string;
  title_ja?: string;
  title_ko?: string;
  tags?: string[];
  age_rating?: AgeRating;
  rating?: number | null;
  authors?: AuthorEntry[];
  status?: MangaStatus;
  year?: number | null;
  alt_titles?: string[];
  schedule_days?: ScheduleDay[];
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

export type InpaintBackendValue = "opencv" | "migan" | "lama";

export type ProjectSettings = {
  language: "ja" | "ko" | "ru" | "en";
  backend: "openai" | "ollama" | "gemini" | "anthropic" | "kiro";
  ocr_backend: "auto" | "openai" | "ollama" | "paddle" | "yolo_florence" | "yolo_gemini" | "apple_vision";
  cleaner_backend: CleanerBackendValue;
  inpaint_backend: InpaintBackendValue;
  translator_model: string;
  limit: number;
  detect_dark_bubbles: boolean;
  // Auto-merge'dan oldin reklamalarni kesish (px). 0 — kesilmaydi.
  crop_ads_top_px: number;
  crop_ads_bottom_px: number;
  // Reklama bazida alohida rasm sifatida bo'lishi mumkin. Agar birinchi/oxirgi
  // rasm aynan shu o'lchamda bo'lsa — butunlay tashlanadi. 0 — ishlamaydi.
  drop_first_if_w: number;
  drop_first_if_h: number;
  drop_last_if_w: number;
  drop_last_if_h: number;
  // Manga-darajasidagi font tanlovi (rol bo'yicha). Bo'sh bo'lsa backend
  // default ishlatadi. Editor'da har region alohida o'zgartirilishi mumkin.
  font_dialogue?: string;
  font_sfx?: string;
  font_narration?: string;
  font_clean?: string;
  // Manga rejimi — matnni nutq-pufagi shakliga moslab kattalashtirish.
  // Default false (webtoonlar uchun hozirgi xulq saqlanadi). Faqat MANGA
  // (titanlar kabi) loyihalar uchun yoqiladi.
  bubble_fit_manga?: boolean;
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
  type: "local" | "api" | "hybrid";
  monthly_limit?: number;
  used?: number;
  remaining?: number;
};

export type InpaintBackendInfo = {
  value: InpaintBackendValue;
  label: string;
  type: "local";
  size_mb?: number;
  default?: boolean;
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
  bbox_manual?: boolean;
  bubble_bbox?: { x: number; y: number; w: number; h: number };
  original_text?: string;
  uz_text?: string;
  manual?: boolean;
  is_dark_bubble?: boolean;
  font_size?: number;
  font_size_manual?: boolean;
  rotation?: number;
  font_weight?: string;
  font_style?: string;
  font_color?: string;
  font_family?: string;
  font_stroke_color?: string;
  font_stroke_width?: number;
  text_align?: "left" | "center" | "right";
  tone?: string;
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
  inpaint_backend?: string;
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
  | { type: "log"; message: string; level?: string; progress: number; chapter?: string; page?: number; total_pages?: number; uploaded_mb?: number; stage?: string; status?: string }
  | { type: "stage_started"; stage: string; message: string; total: number; progress: number }
  | { type: "stage_done"; stage: string; message: string; progress: number }
  | { type: "done"; message: string; progress: number; pages?: number; regions?: number; chapters?: number; cost_usd?: number; published_chapters?: number; total_pages?: number; total_mb?: number; cdn_base_url?: string; stages_completed?: string[]; failed_chapters?: string[] }
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

export type AdCropPreviewImage = {
  filename: string;
  image_url: string;
  width: number;
  height: number;
};

export type AdCropPreviewResponse = {
  chapter: string | null;
  first: AdCropPreviewImage | null;
  last: AdCropPreviewImage | null;
  common_size: { width: number; height: number } | null;
  eligible_count: number;
  current: {
    crop_ads_top_px: number;
    crop_ads_bottom_px: number;
    drop_first_if_w: number;
    drop_first_if_h: number;
    drop_last_if_w: number;
    drop_last_if_h: number;
  };
};

export type UploadResponse = { manga: string; chapter: string; saved: number };

export type BulkUploadFolderResult = {
  folder: string;
  chapter: string;
  saved: number;
  skipped: boolean;
};
export type BulkUploadResponse = {
  manga: string;
  chapters: BulkUploadFolderResult[];
  total_saved: number;
  chapters_created: number;
};
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

export type AutoPilotConfig = {
  enable_mangalib_download?: boolean;
  enable_auto_merge: boolean;
  enable_ocr: boolean;
  enable_translate: boolean;
  enable_publish: boolean;
  force_ocr?: boolean;
  force_clean?: boolean;
};

export type AutoPilotStartResponse = {
  auto_pilot_id: string;
  manga: string;
  config: {
    enable_mangalib_download?: boolean;
    enable_auto_merge: boolean;
    enable_ocr: boolean;
    enable_translate: boolean;
    enable_publish: boolean;
  };
};

export type AutoPilotState = {
  id: string;
  manga: string;
  status: "running" | "done" | "done_with_errors" | "failed" | "cancelled";
  current_stage: "mangalib_download" | "auto_merge" | "ocr" | "translate" | "publish" | null;
  stages_completed: string[];
  total_chapters: number;
  completed_chapters: number;
  failed_chapters: string[];
  started_at: string;
  finished_at: string | null;
  error: string | null;
  stage_progress: number;
  config: AutoPilotConfig;
};

export type AutoPilotActiveResponse = {
  auto_pilot_id: string | null;
  active: boolean;
  state?: AutoPilotState | null;
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


// ── MangaDex import ────────────────────────────────────────────────────

export type MangaDexTag = {
  id: string;
  name: string;
  group: string;
};

export type MangaDexManga = {
  id: string;
  title_en: string;
  description_en: string;
  original_language: string;
  alt_titles: string[];
  status: string;
  year: number | null;
  content_rating: string;
  publication_demographic: string;
  tags: MangaDexTag[];
  authors: string[];
  artists: string[];
  cover_file_name: string;
  cover_thumb_url: string;
  cover_url: string;
  english_available: boolean;
  local_match_slug?: string | null;
};

export type MangaDexChapter = {
  id: string;
  chapter: string;
  title: string;
  pages: number;
  publish_at: string;
  external_url: string;
  scanlation_group: string;
  translated_language: string;
  kind: "available" | "external" | "empty";
  imported?: boolean;
  local_chapter?: { manga_slug: string; chapter: string; status: string } | null;
};

export type MangaDexSearchResponse = {
  results: MangaDexManga[];
  limit: number;
  offset: number;
  total: number;
};

export type MangaDexFeedResponse = {
  results: MangaDexChapter[];
  limit: number;
  offset: number;
  total: number;
};

export type MangaDexSearchParams = {
  title?: string;
  tag_ids?: string[];
  excluded_tag_ids?: string[];
  included_tags_mode?: "AND" | "OR";
  status?: string[];
  demographic?: string[];
  content_rating?: string[];
  year?: number | null;
  order?: string | null;
  limit?: number;
  offset?: number;
};

export type MangaDexImportRequest = {
  mangadex_manga_id: string;
  mangadex_chapter_id: string;
  target_slug?: string | null;
};

export type MangaDexImportResponse = {
  status: "started" | "exists";
  job_id?: string;
  manga_slug?: string | null;
  detail?: string;
};

export type MangaDexImportMangaResponse = {
  status: "started";
  job_ids: string[];
  total: number;
};


// ── MangaLib ───────────────────────────────────────────────────────────

export type MangaLibSeries = {
  slug: string;
  title: string;
  name: string;
  rus_name: string;
  eng_name: string;
  summary: string;
  cover_url: string;
  genres: string[];
  tags: string[];
  authors: string[];
  artists: string[];
  type_label: string;
  status: string;
  age_rating: string;
  year: number | null;
  chapter_count: number;
  first_chapter: number | null;
  last_chapter: number | null;
};

export type MangaLibChapterEntry = {
  number: number;
  volume: number;
  name: string;
  chapter_id: string;
  imported: boolean;
  is_new: boolean;
};

export type MangaLibChaptersResponse = {
  mangalib_slug: string;
  synced_at: string;
  max_local_chapter: number | null;
  total: number;
  results: MangaLibChapterEntry[];
};

export type MangaLibAttachResponse = {
  ok: boolean;
  mangalib_slug: string;
  cover_url: string;
  title: string;
  chapter_count: number;
  chapters: Array<{
    number: number;
    volume: number;
    name: string;
    chapter_id: string;
  }>;
};

export type MangaLibDownloadRequest = {
  only_new?: boolean;
  from_chapter?: number | null;
  to_chapter?: number | null;
  chapter_numbers?: number[];
};

export type MangaLibDownloadResponse = {
  status: "started";
  job_ids: string[];
  total: number;
};

// Global 18+ auth token (DB da `_id="global"` saqlanadi). API hech qachon
// to'liq tokenni qaytarmaydi — faqat `token_hint`.
export type MangaLibTokenStatus =
  | {
      connected: true;
      expires_at: string | null;
      updated_at: string;
      user_label: string;
      token_hint: string;
    }
  | { connected: false };

export type MangaLibTokenSaveRequest = {
  token: string;
  user_label?: string;
};

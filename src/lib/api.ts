import type {
  AutomationInfo,
  AutoPilotActiveResponse,
  AutoPilotConfig,
  AutoPilotStartResponse,
  AutoPilotState,
  CropPreviewResponse,
  Folder,
  GenreOption,
  JobInfo,
  JobStartResponse,
  MangaAutomation,
  MangaAutofillRequest,
  MangaAutofillResponse,
  MangaDexFeedResponse,
  MangaDexImportMangaResponse,
  MangaDexImportRequest,
  MangaDexImportResponse,
  MangaDexManga,
  MangaDexSearchParams,
  MangaDexSearchResponse,
  MangaDexTag,
  OcrBackendInfo,
  PageInfo,
  Project,
  ProjectCreateRequest,
  ProjectMetadataUpdate,
  PublishStartResponse,
  R2SyncRequest,
  R2SyncResponse,
  RestartResponse,
  ResultsData,
  RetranslateRequest,
  RetranslateResponse,
  RunInfo,
  Stats,
  Tag,
  TranslateResponse,
  TranslatorModelsMap,
  UploadResponse,
  BulkUploadResponse,
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
  getProject(slug: string): Promise<Project> {
    return fetch(`/api/projects/${encodeURIComponent(slug)}`).then(handle<Project>);
  },
  saveProjectSettings(slug: string, settings: Record<string, unknown>) {
    return fetch(`/api/projects/${encodeURIComponent(slug)}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }).then(handle);
  },
  createProject(payload: ProjectCreateRequest): Promise<Project> {
    return fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle<Project>);
  },
  autofillProject(payload: MangaAutofillRequest): Promise<MangaAutofillResponse> {
    return fetch("/api/projects/autofill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle<MangaAutofillResponse>);
  },
  updateProjectMetadata(slug: string, metadata: ProjectMetadataUpdate) {
    return fetch(`/api/projects/${encodeURIComponent(slug)}/metadata`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    }).then(handle);
  },
  getTags(): Promise<Tag[]> {
    return fetch("/api/tags").then(handle<Tag[]>);
  },
  getGenres(search = ""): Promise<GenreOption[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return fetch(`/api/options/genres${q}`).then(handle<GenreOption[]>);
  },
  deleteProject(slug: string) {
    return fetch(`/api/projects/${encodeURIComponent(slug)}`, {
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
  getOcrBackends(): Promise<OcrBackendInfo[]> {
    return fetch("/api/ocr-backends").then(handle<OcrBackendInfo[]>);
  },
  getTranslatorModels(): Promise<TranslatorModelsMap> {
    return fetch("/api/translator-models").then(handle<TranslatorModelsMap>);
  },
  uploadFiles(slug: string, files: File[]): Promise<UploadResponse> {
    const form = new FormData();
    for (const f of files) {
      form.append("files", f);
    }
    return fetch(
      `/api/upload?manga_slug=${encodeURIComponent(slug)}`,
      { method: "POST", body: form }
    ).then(handle<UploadResponse>);
  },
  uploadBulkFolders(
    slug: string,
    items: { folder: string; file: File }[],
  ): Promise<BulkUploadResponse> {
    const form = new FormData();
    const folders: string[] = [];
    for (const it of items) {
      form.append("files", it.file);
      folders.push(it.folder);
    }
    form.append("folders", JSON.stringify(folders));
    return fetch(
      `/api/upload/bulk?manga_slug=${encodeURIComponent(slug)}`,
      { method: "POST", body: form }
    ).then(handle<BulkUploadResponse>);
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
  getRunInfo(manga: string, chapter: string): Promise<RunInfo | null> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/run-info`).then(
      (res) => (res.ok ? (res.json() as Promise<RunInfo>) : null)
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
  inpaintArea(manga: string, chapter: string, pageIdx: number, bbox: { x: number; y: number; w: number; h: number }): Promise<{ ok: boolean; image_url: string }> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/clean/${pageIdx}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bbox }),
    }).then(handle<{ ok: boolean; image_url: string }>);
  },
  inpaintMask(manga: string, chapter: string, pageIdx: number, maskBase64: string): Promise<{ ok: boolean; image_url: string }> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/clean-mask/${pageIdx}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mask: maskBase64 }),
    }).then(handle<{ ok: boolean; image_url: string }>);
  },
  drawBubble(manga: string, chapter: string, pageIdx: number, bbox: { x: number; y: number; w: number; h: number }, shape: "rect" | "oval", color?: string): Promise<{ ok: boolean; image_url: string }> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/draw-bubble/${pageIdx}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bbox, shape, color }),
    }).then(handle<{ ok: boolean; image_url: string }>);
  },
  paintOverlay(manga: string, chapter: string, pageIdx: number, imageBase64: string): Promise<{ ok: boolean; image_url: string }> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/paint/${pageIdx}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    }).then(handle<{ ok: boolean; image_url: string }>);
  },
  pickColor(manga: string, chapter: string, pageIdx: number, x: number, y: number): Promise<{ ok: boolean; color: string; rgb: number[] }> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/pick-color/${pageIdx}?x=${Math.round(x)}&y=${Math.round(y)}`).then(
      handle<{ ok: boolean; color: string; rgb: number[] }>
    );
  },
  undoClean(manga: string, chapter: string, pageIdx: number): Promise<{ ok: boolean; image_url: string }> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/clean-undo/${pageIdx}`, {
      method: "POST",
    }).then(handle<{ ok: boolean; image_url: string }>);
  },
  reocrPage(manga: string, chapter: string, pageIdx: number): Promise<{ ok: boolean; updated: number }> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/reocr-page/${pageIdx}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backend: "openai" }),
    }).then(handle<{ ok: boolean; updated: number }>);
  },
  reocrRegion(manga: string, chapter: string, pageIdx: number, regionIdx: number): Promise<{ ok: boolean; text: string }> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/reocr-region`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_idx: pageIdx, region_idx: regionIdx, backend: "openai" }),
    }).then(handle<{ ok: boolean; text: string }>);
  },
  ocrBbox(manga: string, chapter: string, pageIdx: number, bbox: { x: number; y: number; w: number; h: number }): Promise<{ ok: boolean; region_idx: number; text: string; uz_text?: string }> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/ocr-bbox/${pageIdx}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bbox }),
    }).then(handle<{ ok: boolean; region_idx: number; text: string; uz_text?: string }>);
  },
  retranslateRegions(manga: string, chapter: string, payload: RetranslateRequest): Promise<RetranslateResponse> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/retranslate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle<RetranslateResponse>);
  },
  getChapterAutomation(manga: string, chapter: string): Promise<AutomationInfo> {
    return fetch(`/api/results/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/automation`).then(
      handle<AutomationInfo>
    );
  },
  getMangaAutomation(manga: string): Promise<MangaAutomation> {
    return fetch(`/api/projects/${encodeURIComponent(manga)}/automation`).then(
      handle<MangaAutomation>
    );
  },
  getCropPreview(manga: string, chapter: string): Promise<CropPreviewResponse> {
    return fetch(
      `/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/crop-preview`
    ).then(handle<CropPreviewResponse>);
  },
  saveCropConfig(
    manga: string,
    chapter: string,
    images: { filename: string; crop_lines: number[] }[]
  ): Promise<{ ok: boolean }> {
    return fetch(
      `/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/crop-save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      }
    ).then(handle<{ ok: boolean }>);
  },
  getChapterPages(manga: string, chapter: string): Promise<{ images: PageInfo[] }> {
    return fetch(
      `/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/pages`
    ).then(handle<{ images: PageInfo[] }>);
  },
  reorderPages(manga: string, chapter: string, order: string[]): Promise<{ ok: boolean; renamed: number }> {
    return fetch(
      `/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      }
    ).then(handle<{ ok: boolean; renamed: number }>);
  },
  mergeImages(manga: string, chapter: string, filenames: string[]): Promise<{ ok: boolean; merged_into: string; merged_count: number; remaining: number }> {
    return fetch(
      `/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/merge-images`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames }),
      }
    ).then(handle<{ ok: boolean; merged_into: string; merged_count: number; remaining: number }>);
  },
  deletePages(manga: string, chapter: string, filenames: string[]): Promise<{ ok: boolean; deleted: number; remaining: number; chapter_deleted: boolean }> {
    return fetch(
      `/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/delete-pages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames }),
      }
    ).then(handle<{ ok: boolean; deleted: number; remaining: number; chapter_deleted: boolean }>);
  },
  mergeChapters(manga: string, source: string, target: string): Promise<{ ok: boolean; target: string; deleted: string; total_images: number }> {
    return fetch(
      `/api/projects/${encodeURIComponent(manga)}/merge-chapters`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, target }),
      }
    ).then(handle<{ ok: boolean; target: string; deleted: string; total_images: number }>);
  },
  splitImage(manga: string, chapter: string, filename: string, cutLines: number[]): Promise<{ ok: boolean; split: boolean; parts?: number; remaining?: number }> {
    return fetch(
      `/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/split-image`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, cut_lines: cutLines }),
      }
    ).then(handle<{ ok: boolean; split: boolean; parts?: number; remaining?: number }>);
  },
  autoMerge(manga: string, chapter: string): Promise<{ ok: boolean; merge_groups: number; total_merged: number; remaining: number }> {
    return fetch(
      `/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/auto-merge`,
      { method: "POST" }
    ).then(handle<{ ok: boolean; merge_groups: number; total_merged: number; remaining: number }>);
  },
  updateProjectFolder(slug: string, folder: string): Promise<{ slug: string; folder: string }> {
    return fetch(`/api/projects/${encodeURIComponent(slug)}/folder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    }).then(handle<{ slug: string; folder: string }>);
  },
  updateChapterValidated(manga: string, chapter: string, isValidated: boolean): Promise<{ manga: string; chapter: string; is_validated: boolean }> {
    return fetch(`/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/validated`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_validated: isValidated }),
    }).then(handle<{ manga: string; chapter: string; is_validated: boolean }>);
  },
  getFolders(): Promise<Folder[]> {
    return fetch("/api/folders").then(handle<Folder[]>);
  },
  createFolder(name: string): Promise<Folder> {
    return fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(handle<Folder>);
  },
  deleteFolder(name: string): Promise<{ deleted: string }> {
    return fetch(`/api/folders/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }).then(handle<{ deleted: string }>);
  },
  publishManga(manga: string): Promise<PublishStartResponse> {
    return fetch(`/api/publish/${encodeURIComponent(manga)}`, {
      method: "POST",
    }).then(handle<PublishStartResponse>);
  },
  publishChapter(manga: string, chapter: string): Promise<PublishStartResponse> {
    return fetch(`/api/publish/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}`, {
      method: "POST",
    }).then(handle<PublishStartResponse>);
  },
  republishPage(manga: string, chapter: string, pageIdx: number): Promise<{ message: string; page_idx: number; r2_key: string; url: string }> {
    return fetch(`/api/publish/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/page/${pageIdx}`, {
      method: "POST",
    }).then(handle<{ message: string; page_idx: number; r2_key: string; url: string }>);
  },
  unpublishChapters(manga: string, chapters: string[]): Promise<{ message: string; chapters: string[]; deleted_files: number }> {
    return fetch(`/api/unpublish/${encodeURIComponent(manga)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapters }),
    }).then(handle<{ message: string; chapters: string[]; deleted_files: number }>);
  },
  syncR2(payload: R2SyncRequest): Promise<R2SyncResponse> {
    return fetch("/api/r2/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle<R2SyncResponse>);
  },

  // ── Thumbnails ──────────────────────────────────────────────────────

  setCoverFromPage(manga: string, chapter: string, pageIdx: number, crop: { x: number; y: number; w: number; h: number }): Promise<{ ok: boolean; cover_url: string }> {
    return fetch(`/api/projects/${encodeURIComponent(manga)}/cover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapter, page_idx: pageIdx, ...crop }),
    }).then(handle<{ ok: boolean; cover_url: string }>);
  },
  uploadCover(manga: string, file: File): Promise<{ ok: boolean; cover_url: string }> {
    const form = new FormData();
    form.append("file", file);
    return fetch(`/api/projects/${encodeURIComponent(manga)}/cover/upload`, {
      method: "POST",
      body: form,
    }).then(handle<{ ok: boolean; cover_url: string }>);
  },
  deleteCover(manga: string): Promise<{ ok: boolean }> {
    return fetch(`/api/projects/${encodeURIComponent(manga)}/cover`, {
      method: "DELETE",
    }).then(handle<{ ok: boolean }>);
  },
  setChapterThumbnail(manga: string, chapter: string, pageIdx: number, crop: { x: number; y: number; w: number; h: number }): Promise<{ ok: boolean; thumbnail_url: string }> {
    return fetch(`/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/thumbnail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_idx: pageIdx, ...crop }),
    }).then(handle<{ ok: boolean; thumbnail_url: string }>);
  },
  deleteChapterThumbnail(manga: string, chapter: string): Promise<{ ok: boolean }> {
    return fetch(`/api/projects/${encodeURIComponent(manga)}/${encodeURIComponent(chapter)}/thumbnail`, {
      method: "DELETE",
    }).then(handle<{ ok: boolean }>);
  },

  // ── MangaDex ────────────────────────────────────────────────────────

  getMangaDexTags(): Promise<{ tags: MangaDexTag[] }> {
    return fetch("/api/mangadex/tags").then(handle<{ tags: MangaDexTag[] }>);
  },
  searchMangaDex(params: MangaDexSearchParams): Promise<MangaDexSearchResponse> {
    const qs = new URLSearchParams();
    if (params.title) qs.set("title", params.title);
    for (const t of params.tag_ids ?? []) qs.append("tag_ids[]", t);
    for (const t of params.excluded_tag_ids ?? []) qs.append("excluded_tag_ids[]", t);
    if (params.included_tags_mode) qs.set("included_tags_mode", params.included_tags_mode);
    for (const s of params.status ?? []) qs.append("status[]", s);
    for (const d of params.demographic ?? []) qs.append("demographic[]", d);
    for (const c of params.content_rating ?? []) qs.append("content_rating[]", c);
    if (params.year != null) qs.set("year", String(params.year));
    if (params.order) qs.set("order", params.order);
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.offset != null) qs.set("offset", String(params.offset));
    return fetch(`/api/mangadex/search?${qs.toString()}`).then(handle<MangaDexSearchResponse>);
  },
  getMangaDexManga(mangaId: string): Promise<MangaDexManga> {
    return fetch(`/api/mangadex/manga/${encodeURIComponent(mangaId)}`).then(handle<MangaDexManga>);
  },
  getMangaDexFeed(mangaId: string, offset = 0, limit = 100): Promise<MangaDexFeedResponse> {
    const qs = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    return fetch(
      `/api/mangadex/manga/${encodeURIComponent(mangaId)}/feed?${qs.toString()}`,
    ).then(handle<MangaDexFeedResponse>);
  },
  importMangaDexChapter(payload: MangaDexImportRequest): Promise<MangaDexImportResponse> {
    return fetch("/api/mangadex/import/chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle<MangaDexImportResponse>);
  },
  importMangaDexManga(
    mangaId: string,
    targetSlug: string | null = null,
  ): Promise<MangaDexImportMangaResponse> {
    return fetch("/api/mangadex/import/manga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mangadex_manga_id: mangaId,
        target_slug: targetSlug,
      }),
    }).then(handle<MangaDexImportMangaResponse>);
  },
  startAutoPilot(manga: string, config: AutoPilotConfig): Promise<AutoPilotStartResponse> {
    return fetch(`/api/auto-pilot/${encodeURIComponent(manga)}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }).then(handle<AutoPilotStartResponse>);
  },
  getAutoPilot(autopilotId: string): Promise<AutoPilotState> {
    return fetch(`/api/auto-pilot/${encodeURIComponent(autopilotId)}`).then(
      handle<AutoPilotState>
    );
  },
  getActiveAutoPilot(manga: string): Promise<AutoPilotActiveResponse> {
    return fetch(`/api/auto-pilot/active/${encodeURIComponent(manga)}`).then(
      handle<AutoPilotActiveResponse>
    );
  },
  stopAutoPilot(autopilotId: string): Promise<{ status: string; auto_pilot_id: string }> {
    return fetch(`/api/auto-pilot/${encodeURIComponent(autopilotId)}/stop`, {
      method: "POST",
    }).then(handle<{ status: string; auto_pilot_id: string }>);
  },
};

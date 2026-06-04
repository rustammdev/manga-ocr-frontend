import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Sparkles, Link2, Search } from "lucide-react";
import { toast } from "sonner";

import { api } from "../lib/api";
import type { AgeRating, AuthorEntry, Folder, InpaintBackendValue, MangaLibSeries, MangaStatus, OcrBackendValue, ScheduleDay, TranslatorModelInfo, TranslatorModelsMap } from "../lib/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import GenrePicker from "../components/GenrePicker";
import OcrBackendSelect from "../components/OcrBackendSelect";
import InpaintBackendSelect from "../components/InpaintBackendSelect";
import MetadataExtraFields from "../components/MetadataExtraFields";

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"manual" | "autofill">("autofill");

  // MangaLib auto fill state
  const [mangalibUrl, setMangalibUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<MangaLibSeries | null>(null);
  const [autoFillError, setAutoFillError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [titleUz, setTitleUz] = useState("");
  const [titleRu, setTitleRu] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<MangaStatus>("ongoing");
  const [ageRating, setAgeRating] = useState<AgeRating>("13+");
  const [year, setYear] = useState<string>("");
  const [rating, setRating] = useState<string>("");
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([]);
  const [authors, setAuthors] = useState<AuthorEntry[]>([]);
  const [language, setLanguage] = useState<"ja" | "ko" | "ru" | "en">("en");
  const [backend, setBackend] = useState<"openai" | "ollama" | "gemini" | "anthropic" | "kiro">("gemini");
  const [ocrBackend, setOcrBackend] = useState<OcrBackendValue>("apple_vision");
  const [inpaintBackend, setInpaintBackend] = useState<InpaintBackendValue>("opencv");
  const [translatorModel, setTranslatorModel] = useState("");
  const [modelsMap, setModelsMap] = useState<TranslatorModelsMap>({});
  const [folder, setFolder] = useState("");
  const [existingFolders, setExistingFolders] = useState<Folder[]>([]);

  useEffect(() => {
    api.getTranslatorModels().then(setModelsMap).catch(() => {});
    api.getFolders().then(setExistingFolders).catch(() => {});
  }, []);

  const currentModels: TranslatorModelInfo[] = modelsMap[backend] || [];
  const defaultModel = currentModels.find((m) => m.default)?.value || "";

  async function handleResolve() {
    const value = mangalibUrl.trim();
    if (!value) {
      setAutoFillError("MangaLib link yoki slug kiriting");
      return;
    }
    setResolving(true);
    setAutoFillError("");
    setPreview(null);
    try {
      const series = await api.resolveMangaLib(value);
      setPreview(series);
    } catch (e) {
      setAutoFillError((e as Error).message || "Tekshirib bo'lmadi");
    } finally {
      setResolving(false);
    }
  }

  async function handleCreateFromLink() {
    const value = mangalibUrl.trim();
    if (!value) {
      setAutoFillError("MangaLib link yoki slug kiriting");
      return;
    }
    setCreating(true);
    setAutoFillError("");
    setError("");
    try {
      const result = await api.createMangaLibProject({
        url_or_slug: value,
        folder: folder.trim() || undefined,
      });
      toast.success(`"${result.title}" yaratildi — ${result.chapter_count} bob`);
      navigate(`/project/${result.slug}`);
    } catch (e) {
      const msg = (e as Error).message || "Yaratib bo'lmadi";
      if (/already|409|biriktirilgan|attached/i.test(msg)) {
        setAutoFillError("Bu MangaLib slug allaqachon boshqa loyihaga biriktirilgan");
      } else {
        setAutoFillError(msg);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Manga nomini kiriting");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const yearNum = year.trim() ? parseInt(year.trim(), 10) : null;
      const ratingNum = rating.trim() ? parseFloat(rating.trim()) : null;
      const cleanedAuthors = authors
        .map((a) => ({ name: a.name.trim(), role: a.role }))
        .filter((a) => a.name.length > 0);
      const result = await api.createProject({
        name: name.trim(),
        description: description.trim(),
        title_uz: titleUz.trim(),
        title_ru: titleRu.trim(),
        title_en: titleEn.trim(),
        title_ja: titleJa.trim(),
        title_ko: titleKo.trim(),
        tags,
        status,
        age_rating: ageRating,
        year: yearNum && !Number.isNaN(yearNum) ? yearNum : null,
        rating: ratingNum != null && !Number.isNaN(ratingNum) ? ratingNum : null,
        schedule_days: scheduleDays,
        authors: cleanedAuthors,
        language,
        backend,
        ocr_backend: ocrBackend,
        inpaint_backend: inpaintBackend,
        translator_model: translatorModel || undefined,
        folder: folder.trim() || undefined,
      });
      navigate(`/project/${result.slug}`);
    } catch (e) {
      const err = e as Error;
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Yangi manga</h1>
        <p className="page-description">Manga loyihasini yarating va sozlamalarni belgilang.</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "autofill")}>
          <TabsList className="w-full">
            <TabsTrigger value="autofill" className="flex-1 gap-2">
              <Sparkles className="h-4 w-4" />
              Auto fill (MangaLib)
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Qo'lda</TabsTrigger>
          </TabsList>

          <TabsContent value="autofill" className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">MangaLib link yoki slug</label>
              <div className="flex gap-2">
                <Input
                  value={mangalibUrl}
                  onChange={(e) => setMangalibUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleResolve();
                  }}
                  placeholder="https://mangalib.me/ru/manga/114307--..."
                  disabled={creating}
                />
                <Button
                  variant="outline"
                  onClick={handleResolve}
                  disabled={resolving || creating || !mangalibUrl.trim()}
                  className="shrink-0 gap-1.5"
                >
                  {resolving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Tekshir
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link kiritsangiz orqa fonda seriya ma'lumotlari ajratiladi, nom o'zbek
                tilida grammatik to'g'ri tarjima qilinadi, cover va boblar ro'yxati
                avtomatik to'ldiriladi.
              </p>
            </div>

            {autoFillError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                {autoFillError}
              </div>
            )}

            {preview && (
              <div className="grid grid-cols-[100px_1fr] gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
                  {preview.cover_url && (
                    <img
                      src={preview.cover_url}
                      alt={preview.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <h3 className="text-sm font-semibold leading-tight">
                    {preview.title || preview.rus_name || preview.eng_name || preview.slug}
                  </h3>
                  {preview.eng_name && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {preview.eng_name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="info">{preview.chapter_count} bob</Badge>
                    {preview.status && <Badge variant="secondary">{preview.status}</Badge>}
                    {preview.year != null && (
                      <Badge variant="secondary">{preview.year}</Badge>
                    )}
                    {preview.age_rating && (
                      <Badge variant="warning">{preview.age_rating}</Badge>
                    )}
                  </div>
                  {preview.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {preview.summary}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleCreateFromLink}
              disabled={creating || resolving || !mangalibUrl.trim()}
              className="gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {creating ? "Yaratilmoqda..." : "Manga yaratish"}
            </Button>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Manga nomi <span className="text-red-400">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="masalan: one-piece"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tavsif</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Manga haqida qisqacha ma'lumot..."
                className="min-h-[80px]"
              />
            </div>

            {/* Titles */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Sarlavhalar (turli tillarda)</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">O'zbekcha</label>
                  <Input value={titleUz} onChange={(e) => setTitleUz(e.target.value)} placeholder="O'zbek tilidagi nomi" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Ruscha</label>
                  <Input value={titleRu} onChange={(e) => setTitleRu(e.target.value)} placeholder="Русское название" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Inglizcha</label>
                  <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="English title" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Yaponcha</label>
                  <Input value={titleJa} onChange={(e) => setTitleJa(e.target.value)} placeholder="日本語タイトル" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Koreyscha</label>
                  <Input value={titleKo} onChange={(e) => setTitleKo(e.target.value)} placeholder="한국어 제목" />
                </div>
              </div>
            </div>

            {/* Genres */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Janrlar</label>
              <GenrePicker value={tags} onChange={setTags} />
            </div>

            {/* Status, age rating, year, schedule, authors */}
            <MetadataExtraFields
              status={status}
              setStatus={setStatus}
              ageRating={ageRating}
              setAgeRating={setAgeRating}
              year={year}
              setYear={setYear}
              rating={rating}
              setRating={setRating}
              scheduleDays={scheduleDays}
              setScheduleDays={setScheduleDays}
              authors={authors}
              setAuthors={setAuthors}
            />
          </TabsContent>
        </Tabs>


        {/* Folder */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Folder</label>
          <Select
            value={folder || "__none__"}
            onValueChange={(v) => setFolder(v === "__none__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Folder tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Foldersiz —</SelectItem>
              {existingFolders.map((f) => (
                <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Dashboard da mangalarni guruhlash uchun folder belgilang. Yangi folder Dashboard dan yaratiladi.
          </p>
        </div>

        {/* Pipeline settings inline (faqat qo'lda rejimida) */}
        {activeTab === "manual" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Manba tili</label>
            <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">Yaponcha (JA)</SelectItem>
                <SelectItem value="ko">Koreyscha (KO)</SelectItem>
                <SelectItem value="ru">Ruscha (RU)</SelectItem>
                <SelectItem value="en">Inglizcha (EN)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tarjima backend</label>
            <Select value={backend} onValueChange={(v) => { setBackend(v as typeof backend); setTranslatorModel(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="kiro">Kiro (Amazon Q)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tarjima modeli</label>
            <Select value={translatorModel || defaultModel} onValueChange={setTranslatorModel}>
              <SelectTrigger>
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {currentModels.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}{m.default ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">OCR backend</label>
            <OcrBackendSelect value={ocrBackend} onValueChange={setOcrBackend} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Cleaner (inpaint) backend</label>
            <InpaintBackendSelect value={inpaintBackend} onValueChange={setInpaintBackend} />
          </div>
        </div>
        )}

        {/* Error (qo'lda rejimi) */}
        {activeTab === "manual" && error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit (qo'lda rejimi) */}
        {activeTab === "manual" && (
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleCreate} disabled={saving || !name.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Yaratilmoqda..." : "Manga yaratish"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Bekor qilish
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}

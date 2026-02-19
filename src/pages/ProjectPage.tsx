import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../lib/api";
import type { Chapter, Project, ProjectSettings } from "../lib/types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const statusVariant: Record<string, "success" | "info" | "warning" | "danger"> = {
  done: "success",
  ocr_done: "info",
  translating: "warning",
  processing: "warning",
  uploaded: "info",
  failed: "danger",
};

export default function ProjectPage() {
  const { manga } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<ProjectSettings>({
    language: "ja",
    backend: "openai",
    ocr_backend: "auto",
    limit: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!manga) return;
    api
      .getProject(manga)
      .then((data) => {
        setProject(data);
        if (data.settings) {
          setSettings({
            language: data.settings.language,
            backend: data.settings.backend,
            ocr_backend: data.settings.ocr_backend,
            limit: data.settings.limit || 0,
          });
        }
      })
      .catch(() => setProject(null));
  }, [manga]);

  const chapters = project?.chapters || [];
  const hasOcrDone = chapters.some((ch) => ch.status === "ocr_done");
  const hasTranslating = chapters.some((ch) => ch.status === "translating");

  async function handleSave() {
    if (!manga) return;
    setSaving(true);
    try {
      await api.saveProjectSettings(manga, settings);
    } finally {
      setTimeout(() => setSaving(false), 600);
    }
  }

  async function handleDeleteProject() {
    if (!manga) return;
    if (!confirm(`"${manga}" ni o'chirmoqchimisiz? Barcha fayllar o'chadi!`)) return;
    await api.deleteProject(manga);
    navigate("/");
  }

  async function handleStartJob(chapter: Chapter) {
    if (!manga) return;
    const result = await api.startJob({
      manga,
      chapter: chapter.name,
      language: settings.language,
      backend: settings.backend,
      ocr_backend: settings.ocr_backend,
      limit: settings.limit,
    });
    navigate(`/job/${result.job_id}`);
  }

  async function handleTranslateManga() {
    if (!manga) return;
    if (!confirm(`Butun "${manga}" mangasini tarjima qilmoqchimisiz?`)) return;
    const result = await api.translateManga({
      manga,
      language: settings.language,
      backend: settings.backend,
    });
    navigate(`/job/${result.job_id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Dashboard / {manga}</div>
          <h1 className="text-3xl font-semibold">{manga}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/upload/${manga}`}>
            <Button variant="outline">+ Bob qo'shish</Button>
          </Link>
          {hasTranslating ? (
            <Button variant="secondary" disabled>
              Tarjima jarayonda...
            </Button>
          ) : hasOcrDone ? (
            <Button onClick={handleTranslateManga}>Tarjima qilish</Button>
          ) : null}
          <Link to="/">
            <Button variant="outline">Ortga</Button>
          </Link>
          <Button variant="destructive" onClick={handleDeleteProject}>
            O'chirish
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <div className="space-y-2">
            <label className="label">Manba tili</label>
            <Select
              value={settings.language}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, language: value as ProjectSettings["language"] }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Til" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">Yaponcha (JA)</SelectItem>
                <SelectItem value="ko">Koreyscha (KO)</SelectItem>
                <SelectItem value="ru">Ruscha (RU)</SelectItem>
                <SelectItem value="en">Inglizcha (EN)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="label">Tarjima backend</label>
            <Select
              value={settings.backend}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, backend: value as ProjectSettings["backend"] }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="label">OCR backend</label>
            <Select
              value={settings.ocr_backend}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, ocr_backend: value as ProjectSettings["ocr_backend"] }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="OCR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Local (Auto)</SelectItem>
                <SelectItem value="openai">OpenAI Vision</SelectItem>
                <SelectItem value="ollama">Ollama Vision</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="label">Rasm limiti</label>
            <Input
              type="number"
              min={0}
              value={settings.limit}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, limit: Number.parseInt(e.target.value || "0", 10) }))
              }
            />
          </div>
          <div className="md:col-span-4">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Chapterlar</h2>
            <span className="text-sm text-muted-foreground">{chapters.length} ta</span>
          </div>

          {chapters.length === 0 ? (
            <div className="rounded-lg border bg-white/70 p-6 text-sm text-muted-foreground">
              Chapter topilmadi. Yuklash sahifasidan rasm qo'shing.
            </div>
          ) : (
            <div className="space-y-3">
              {chapters.map((chapter) => {
                const isClickable = chapter.status === "done" || chapter.status === "ocr_done";
                return (
                <div
                  key={chapter.name}
                  className={`flex flex-col gap-3 rounded-xl border bg-white/80 p-4 md:flex-row md:items-center md:justify-between ${
                    isClickable ? "cursor-pointer hover:shadow-lg transition" : ""
                  }`}
                  onClick={() => {
                    if (!project?.name || !isClickable) return;
                    navigate(`/results/${project.name}/${chapter.name}`);
                  }}
                >
                  <div>
                    <div className="text-lg font-semibold">{chapter.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {chapter.image_count} rasm
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[chapter.status] || "info"}>
                      {chapter.status === "ocr_done"
                        ? "OCR tayyor"
                        : chapter.status === "translating"
                        ? "Tarjima..."
                        : chapter.status}
                    </Badge>
                    {chapter.status === "done" && (
                      <Link to={`/edit/${project?.name}/${chapter.name}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline">Tahrirlash</Button>
                      </Link>
                    )}
                    {chapter.status === "ocr_done" && (
                      <Link to={`/edit/${project?.name}/${chapter.name}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline">Tahrirlash</Button>
                      </Link>
                    )}
                    {chapter.status === "processing" && chapter.job_id ? (
                      <Link to={`/job/${chapter.job_id}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline">Progress</Button>
                      </Link>
                    ) : null}
                    {chapter.status === "translating" && chapter.job_id ? (
                      <Link to={`/job/${chapter.job_id}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline">Tarjima progress</Button>
                      </Link>
                    ) : null}
                    {(chapter.status === "uploaded" || chapter.status === "failed") && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStartJob(chapter); }}>
                        OCR ishga tushirish
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!manga) return;
                        if (!confirm(`"${chapter.name}" bobni o'chirmoqchimisiz?`)) return;
                        await api.deleteChapter(manga, chapter.name);
                        const updated = await api.getProject(manga);
                        setProject(updated);
                      }}
                    >
                      O'chirish
                    </Button>
                  </div>
                </div>
              );})}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

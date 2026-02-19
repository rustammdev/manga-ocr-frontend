import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../lib/api";
import type { Project } from "../lib/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";

export default function UploadPage() {
  const { manga } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string>("");
  const [mangaName, setMangaName] = useState(manga || "");
  const [chapterName, setChapterName] = useState("");
  const dropRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api
      .getProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (manga) {
      setMangaName(manga);
    }
  }, [manga]);

  const existing = projects.find((p) => p.name === mangaName.trim());

  function onFiles(files: FileList | null) {
    if (!files) return;
    const images: File[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) {
        images.push(f);
      }
    }
    setSelectedFiles((prev) => [...prev, ...images]);
  }

  async function handleUpload() {
    if (!mangaName.trim() || !chapterName.trim()) {
      setStatus("Manga va chapter nomlarini kiriting");
      return;
    }
    if (selectedFiles.length === 0) {
      setStatus("Rasm fayllarini tanlang");
      return;
    }
    setStatus("Yuklanmoqda...");
    try {
      const result = await api.uploadFiles(mangaName.trim(), chapterName.trim(), selectedFiles);
      setStatus(`${result.saved} rasm yuklandi!`);
      setSelectedFiles([]);
      setTimeout(() => {
        navigate(`/project/${result.manga}`);
      }, 700);
    } catch (e) {
      const err = e as Error;
      setStatus(`Xatolik: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Rasm yuklash</h1>
        <p className="mt-2 text-muted-foreground">
          Yangi manga yoki mavjudiga yangi chapter qo'shish.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="label">Manga nomi</label>
            <Input
              value={mangaName}
              onChange={(e) => setMangaName(e.target.value)}
              placeholder="masalan: one-piece"
              list="manga-suggestions"
            />
            <datalist id="manga-suggestions">
              {projects.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
            {mangaName ? (
              <div className="text-xs text-muted-foreground">
                {existing ? (
                  <span> Mavjud manga — {existing.chapter_count} chapter bor. Yangi chapter qo'shiladi.</span>
                ) : (
                  <span> Yangi manga yaratiladi</span>
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="label">Chapter nomi</label>
            <Input
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              placeholder="masalan: 001"
            />
          </div>

          <div
            ref={dropRef}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-white/70 p-8 text-center transition hover:border-primary"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              onFiles(e.dataTransfer.files);
            }}
          >
            <div className="text-xl">📁</div>
            <p className="mt-2 text-sm font-medium">Rasmlarni bu yerga tashlang yoki bosing</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, JPEG, WebP, BMP (max 50MB, 200 ta gacha)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>

          {selectedFiles.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{selectedFiles.length} ta fayl tanlandi</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFiles([])}>
                  Tozalash
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {selectedFiles.map((f) => (
                  <span key={f.name} className="rounded-full border bg-white px-3 py-1">
                    {f.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <Button onClick={handleUpload} disabled={selectedFiles.length === 0}>
              Yuklash
            </Button>
            {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CloudUpload, X, Image as ImageIcon, FolderOpen, Folder } from "lucide-react";

import { api } from "../lib/api";
import type { Project } from "../lib/types";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

// folder upload uchun webkit relativePath kengaytmasi
type FileWithPath = File & { webkitRelativePath?: string };

// Drag-drop API uchun (TS lib da yo'q)
type FsEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (cb: (f: File) => void) => void;
  createReader?: () => {
    readEntries: (cb: (entries: FsEntry[]) => void) => void;
  };
};

type BulkItem = { folder: string; file: File };

export default function UploadPage() {
  const { manga } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [mangaSlug, setMangaSlug] = useState(manga || "");

  // Single chapter tab
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [singleStatus, setSingleStatus] = useState<string>("");
  const [singleDragging, setSingleDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Bulk chapters tab
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkDragging, setBulkDragging] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api
      .getProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (manga) setMangaSlug(manga);
  }, [manga]);

  const existing = projects.find((p) => p.slug === mangaSlug);

  // ── Single chapter helpers ─────────────────────────────────────────
  function onSingleFiles(files: FileList | null) {
    if (!files) return;
    const images: File[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) images.push(f);
    }
    setSelectedFiles((prev) => [...prev, ...images]);
  }

  function removeSingleFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSingleUpload() {
    if (!mangaSlug.trim()) {
      setSingleStatus("Manga tanlang");
      return;
    }
    if (selectedFiles.length === 0) {
      setSingleStatus("Rasm fayllarini tanlang");
      return;
    }
    setSingleStatus("Yuklanmoqda...");
    try {
      const result = await api.uploadFiles(mangaSlug.trim(), selectedFiles);
      setSingleStatus(`${result.saved} rasm yuklandi! (${result.chapter}-bob yaratildi)`);
      setSelectedFiles([]);
      setTimeout(() => navigate(`/project/${result.manga}`), 700);
    } catch (e) {
      const err = e as Error;
      setSingleStatus(`Xatolik: ${err.message}`);
    }
  }

  // ── Bulk folders helpers ───────────────────────────────────────────
  function addBulkItems(items: BulkItem[]) {
    if (items.length === 0) return;
    setBulkItems((prev) => [...prev, ...items]);
  }

  function onFolderInput(files: FileList | null) {
    if (!files) return;
    const items: BulkItem[] = [];
    for (const raw of Array.from(files)) {
      const f = raw as FileWithPath;
      if (!f.type.startsWith("image/")) continue;
      const rel = f.webkitRelativePath || f.name;
      // rel: "c148/001.jpg" → folder = "c148"
      const parts = rel.split("/").filter(Boolean);
      const folder = parts.length > 1 ? parts[parts.length - 2] : parts[0];
      if (!folder) continue;
      items.push({ folder, file: f });
    }
    addBulkItems(items);
  }

  async function readEntriesAsync(reader: ReturnType<NonNullable<FsEntry["createReader"]>>) {
    return new Promise<FsEntry[]>((resolve) => reader.readEntries(resolve));
  }

  async function fileFromEntry(entry: FsEntry): Promise<File | null> {
    return new Promise((resolve) => {
      if (!entry.file) return resolve(null);
      try {
        entry.file((f) => resolve(f));
      } catch {
        resolve(null);
      }
    });
  }

  async function walkEntry(entry: FsEntry, folder: string, out: BulkItem[]) {
    if (entry.isFile) {
      const file = await fileFromEntry(entry);
      if (file && file.type.startsWith("image/")) {
        out.push({ folder, file });
      }
      return;
    }
    if (entry.isDirectory && entry.createReader) {
      const reader = entry.createReader();
      // readEntries ko'p marta chaqirilishi mumkin (batch)
      while (true) {
        const entries = await readEntriesAsync(reader);
        if (entries.length === 0) break;
        for (const child of entries) {
          // Subfolderdagi rasmlar ham ota papka nomida bo'ladi
          await walkEntry(child, folder, out);
        }
      }
    }
  }

  async function onBulkDrop(e: React.DragEvent) {
    e.preventDefault();
    setBulkDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const collected: BulkItem[] = [];
    const entries: FsEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const entry = (it.webkitGetAsEntry?.() ?? null) as FsEntry | null;
      if (entry) entries.push(entry);
    }

    for (const entry of entries) {
      if (entry.isDirectory) {
        await walkEntry(entry, entry.name, collected);
      } else if (entry.isFile) {
        // Faylni alohida tashlasa, papka — fayl nomining birinchi qismi
        const file = await fileFromEntry(entry);
        if (file && file.type.startsWith("image/")) {
          collected.push({ folder: file.name.replace(/\.[^.]+$/, ""), file });
        }
      }
    }

    addBulkItems(collected);
  }

  function removeBulkFolder(folder: string) {
    setBulkItems((prev) => prev.filter((i) => i.folder !== folder));
  }

  function clearBulk() {
    setBulkItems([]);
    setBulkStatus("");
  }

  async function handleBulkUpload() {
    if (!mangaSlug.trim()) {
      setBulkStatus("Manga tanlang");
      return;
    }
    if (bulkItems.length === 0) {
      setBulkStatus("Papkalarni tanlang");
      return;
    }
    setBulkUploading(true);
    setBulkStatus("Yuklanmoqda...");
    try {
      const result = await api.uploadBulkFolders(mangaSlug.trim(), bulkItems);
      setBulkStatus(
        `${result.chapters_created} ta bob yaratildi (jami ${result.total_saved} rasm)`,
      );
      setBulkItems([]);
      setTimeout(() => navigate(`/project/${result.manga}`), 900);
    } catch (e) {
      const err = e as Error;
      setBulkStatus(`Xatolik: ${err.message}`);
    } finally {
      setBulkUploading(false);
    }
  }

  // Bulk papkalarni guruhlash (preview uchun)
  const bulkGroups = useMemo(() => {
    const map = new Map<string, File[]>();
    for (const it of bulkItems) {
      if (!map.has(it.folder)) map.set(it.folder, []);
      map.get(it.folder)!.push(it.file);
    }
    // Papka nomidagi raqam bo'yicha tartiblash
    return Array.from(map.entries()).sort(([a], [b]) => {
      const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
      const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
      return na - nb || a.localeCompare(b);
    });
  }, [bulkItems]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Rasm yuklash</h1>
        <p className="page-description">
          Mavjud mangaga yangi chapter qo'shish. Bob raqami avtomatik beriladi.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Manga select (umumiy) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Manga</label>
          <select
            value={mangaSlug}
            onChange={(e) => setMangaSlug(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Manga tanlang...</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.display_name}
              </option>
            ))}
          </select>
          {existing && (
            <p className="text-xs text-muted-foreground">
              {existing.chapter_count} chapter bor.
            </p>
          )}
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Bitta bob</TabsTrigger>
            <TabsTrigger value="bulk">Ko'p bob</TabsTrigger>
          </TabsList>

          {/* ── BITTA BOB ───────────────────────────────────────── */}
          <TabsContent value="single" className="space-y-6">
            <div
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                singleDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setSingleDragging(true);
              }}
              onDragLeave={() => setSingleDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSingleDragging(false);
                onSingleFiles(e.dataTransfer.files);
              }}
            >
              <CloudUpload className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">Rasmlarni bu yerga tashlang yoki bosing</p>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPG, JPEG, WebP, BMP (max 50MB, 999 ta gacha)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => onSingleFiles(e.target.files)}
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedFiles.length} ta fayl tanlandi
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFiles([])}>
                    Hammasini tozalash
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {selectedFiles.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="group flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
                    >
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-xs">{f.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSingleFile(i);
                        }}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSingleUpload}
                disabled={selectedFiles.length === 0 || !mangaSlug}
                className="gap-2"
              >
                <CloudUpload className="h-4 w-4" />
                Yuklash
              </Button>
              {singleStatus && (
                <span className="text-sm text-muted-foreground">{singleStatus}</span>
              )}
            </div>
          </TabsContent>

          {/* ── KO'P BOB ────────────────────────────────────────── */}
          <TabsContent value="bulk" className="space-y-6">
            <div
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                bulkDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
              onClick={() => folderInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setBulkDragging(true);
              }}
              onDragLeave={() => setBulkDragging(false)}
              onDrop={onBulkDrop}
            >
              <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">
                Papkalarni bu yerga tashlang yoki bosing
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Har bir papka — alohida bob. Papka nomidan raqam ajratiladi (masalan, "c148" → 148-bob).
              </p>
              {/* webkitdirectory orqali papka tanlash */}
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-expect-error webkitdirectory standart React tipida yo'q
                webkitdirectory=""
                directory=""
                className="hidden"
                onChange={(e) => onFolderInput(e.target.files)}
              />
            </div>

            {bulkGroups.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {bulkGroups.length} ta papka, {bulkItems.length} ta rasm
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearBulk}>
                    Hammasini tozalash
                  </Button>
                </div>
                <div className="space-y-2">
                  {bulkGroups.map(([folder, files]) => {
                    const m = folder.match(/\d+/);
                    const chapterPreview = m ? m[0].padStart(3, "0") : folder;
                    return (
                      <div
                        key={folder}
                        className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                      >
                        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="truncate font-medium">{folder}</span>
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                              → {chapterPreview}-bob
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {files.length} ta rasm
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBulkFolder(folder);
                          }}
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleBulkUpload}
                disabled={bulkItems.length === 0 || !mangaSlug || bulkUploading}
                className="gap-2"
              >
                <CloudUpload className="h-4 w-4" />
                {bulkUploading ? "Yuklanmoqda..." : `${bulkGroups.length} ta bobni yuklash`}
              </Button>
              {bulkStatus && (
                <span className="text-sm text-muted-foreground">{bulkStatus}</span>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

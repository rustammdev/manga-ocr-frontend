import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../lib/api";
import type { Page, Region, ResultsData } from "../lib/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
      continue;
    }
    if (current) lines.push(current);
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
    } else {
      let chunk = "";
      for (const ch of word) {
        const chunkTest = chunk + ch;
        if (ctx.measureText(chunkTest).width <= maxWidth) {
          chunk = chunkTest;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawTranslatedTexts(ctx: CanvasRenderingContext2D, regions: Region[]) {
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  regions.forEach((r) => {
    if (!r.uz_text) return;
    const text = r.uz_text.toUpperCase().trim();
    if (!text) return;

    const padding = 6;
    const boxWidth = Math.max(10, r.bbox.w);
    const boxHeight = Math.max(10, r.bbox.h);
    const maxWidth = Math.max(10, boxWidth - padding * 2);
    const maxHeight = Math.max(10, boxHeight - padding * 2);

    let fontSize = Math.floor(Math.min(32, Math.max(12, boxHeight * 0.55)));
    ctx.font = `700 ${fontSize}px 'Comic Neue'`;
    let lines = wrapText(ctx, text, maxWidth);
    let lineHeight = Math.floor(fontSize * 1.2);

    while (fontSize > 10 && lines.length * lineHeight > maxHeight) {
      fontSize -= 1;
      lineHeight = Math.floor(fontSize * 1.2);
      ctx.font = `700 ${fontSize}px 'Comic Neue'`;
      lines = wrapText(ctx, text, maxWidth);
    }

    const totalTextHeight = lines.length * lineHeight;
    const startY = r.bbox.y + padding + Math.max(0, (maxHeight - totalTextHeight) / 2);

    ctx.save();
    ctx.beginPath();
    ctx.rect(r.bbox.x, r.bbox.y, boxWidth, boxHeight);
    ctx.clip();
    ctx.fillStyle = "rgba(17, 24, 39, 0.92)";
    lines.forEach((line, idx) => {
      ctx.fillText(line, r.bbox.x + boxWidth / 2, startY + idx * lineHeight);
    });
    ctx.restore();
  });
}

function collectTexts(pages: Page[]) {
  const texts: { pageIdx: number; regionIdx: number; original_text: string; uz_text: string }[] = [];
  pages.forEach((page, pageIdx) => {
    (page.regions || []).forEach((r, regionIdx) => {
      if (r.original_text && r.original_text.trim()) {
        texts.push({
          pageIdx,
          regionIdx,
          original_text: r.original_text,
          uz_text: r.uz_text || "",
        });
      }
    });
  });
  return texts;
}

export default function ResultsPage() {
  const { manga, chapter } = useParams();
  const [data, setData] = useState<ResultsData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [drawingMode, setDrawingMode] = useState(false);
  const [status, setStatus] = useState<string>("Yuklanmoqda...");
  const [readingOpen, setReadingOpen] = useState(false);
  const [regionDrafts, setRegionDrafts] = useState<
    Record<string, { original: string; translation: string; status?: string }>
  >({});
  const [translating, setTranslating] = useState(false);

  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cleanImgRef = useRef<HTMLImageElement | null>(null);
  const cleanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalWrapRef = useRef<HTMLDivElement | null>(null);
  const cleanWrapRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef<"original" | "clean" | null>(null);
  const readingCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (!manga || !chapter) return;
    api
      .getResults(manga, chapter)
      .then((res) => {
        setData(res);
        setStatus("");
        const drafts: Record<string, { original: string; translation: string }> = {};
        const page = res.pages[currentPage];
        if (page) {
          page.regions.forEach((r, idx) => {
            drafts[`${currentPage}-${idx}`] = {
              original: r.original_text || "",
              translation: r.uz_text || "",
            };
          });
        }
        setRegionDrafts(drafts);
      })
      .catch((err) => {
        setStatus(`Xatolik: ${err.message}`);
      });
  }, [manga, chapter]);

  const pages = data?.pages || [];
  const totalPages = pages.length + 1;

  const texts = useMemo(() => collectTexts(pages), [pages]);

  const renderBboxes = useCallback(
    (img: HTMLImageElement, canvas: HTMLCanvasElement, regions: Region[]) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.style.width = `${img.clientWidth}px`;
      canvas.style.height = `${img.clientHeight}px`;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      regions.forEach((r) => {
        ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
        ctx.lineWidth = 3;
        ctx.strokeRect(r.bbox.x, r.bbox.y, r.bbox.w, r.bbox.h);
      });
    },
    []
  );

  const renderTextOverlay = useCallback(
    (img: HTMLImageElement, canvas: HTMLCanvasElement, regions: Region[]) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.style.width = `${img.clientWidth}px`;
      canvas.style.height = `${img.clientHeight}px`;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTranslatedTexts(ctx, regions);
    },
    []
  );

  useEffect(() => {
    if (!data) return;
    const page = pages[currentPage];
    if (!page) return;

    const img = originalImgRef.current;
    const canvas = originalCanvasRef.current;
    if (img && canvas) {
      const handler = () => renderBboxes(img, canvas, page.regions || []);
      if (img.complete && img.naturalWidth > 0) handler();
      else img.onload = handler;
    }

    const cleanImg = cleanImgRef.current;
    const cleanCanvas = cleanCanvasRef.current;
    if (cleanImg && cleanCanvas) {
      const handler = () => renderTextOverlay(cleanImg, cleanCanvas, page.regions || []);
      if (cleanImg.complete && cleanImg.naturalWidth > 0) handler();
      else cleanImg.onload = handler;
    }
  }, [data, currentPage, pages, renderBboxes, renderTextOverlay]);

  useEffect(() => {
    if (!data) return;
    const drafts: Record<string, { original: string; translation: string }> = {};
    const page = data.pages[currentPage];
    if (page) {
      page.regions.forEach((r, idx) => {
        drafts[`${currentPage}-${idx}`] = {
          original: r.original_text || "",
          translation: r.uz_text || "",
        };
      });
    }
    setRegionDrafts(drafts);
  }, [data, currentPage]);

  useEffect(() => {
    if (!drawingMode) return;
    const cleanImg = cleanImgRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!cleanImg || !drawCanvas) return;

    const canvas = drawCanvas;
    canvas.width = cleanImg.naturalWidth;
    canvas.height = cleanImg.naturalHeight;
    canvas.style.width = `${cleanImg.clientWidth}px`;
    canvas.style.height = `${cleanImg.clientHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startX = 0;
    let startY = 0;
    let isDrawing = false;

    function getCoords(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    function onDown(e: MouseEvent) {
      e.preventDefault();
      const coords = getCoords(e);
      startX = coords.x;
      startY = coords.y;
      isDrawing = true;
    }

    function onMove(e: MouseEvent) {
      if (!isDrawing) return;
      const drawCtx = canvas.getContext("2d");
      if (!drawCtx) return;
      const coords = getCoords(e);
      drawCtx.clearRect(0, 0, canvas.width, canvas.height);
      const x = Math.min(startX, coords.x);
      const y = Math.min(startY, coords.y);
      const w = Math.abs(coords.x - startX);
      const h = Math.abs(coords.y - startY);
      drawCtx.strokeStyle = "rgba(52, 211, 153, 0.9)";
      drawCtx.lineWidth = 3;
      drawCtx.setLineDash([8, 4]);
      drawCtx.strokeRect(x, y, w, h);
      drawCtx.fillStyle = "rgba(52, 211, 153, 0.15)";
      drawCtx.fillRect(x, y, w, h);
      drawCtx.setLineDash([]);
    }

    async function onUp(e: MouseEvent) {
      if (!isDrawing) return;
      isDrawing = false;
      const coords = getCoords(e);
      const x = Math.round(Math.min(startX, coords.x));
      const y = Math.round(Math.min(startY, coords.y));
      const w = Math.round(Math.abs(coords.x - startX));
      const h = Math.round(Math.abs(coords.y - startY));
      const drawCtx = canvas.getContext("2d");
      if (drawCtx) {
        drawCtx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (w < 10 || h < 10) return;
      if (!manga || !chapter) return;
      const pageIdx = currentPage;
      await api.addRegion(manga, chapter, pageIdx, {
        bbox: { x, y, w, h },
        original_text: "",
        uz_text: "",
      });
      const updated = await api.getResults(manga, chapter);
      setData(updated);
      setDrawingMode(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawingMode(false);
    }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    document.addEventListener("keydown", onKey);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      document.removeEventListener("keydown", onKey);
    };
  }, [drawingMode, manga, chapter, currentPage]);

  useEffect(() => {
    const originalWrap = originalWrapRef.current;
    const cleanWrap = cleanWrapRef.current;
    if (!originalWrap || !cleanWrap) return;

    const syncScroll = (
      source: HTMLDivElement,
      target: HTMLDivElement,
      tag: "original" | "clean"
    ) => {
      if (syncingRef.current && syncingRef.current !== tag) return;
      syncingRef.current = tag;
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;
      requestAnimationFrame(() => {
        syncingRef.current = null;
      });
    };

    const onOriginal = () => syncScroll(originalWrap, cleanWrap, "original");
    const onClean = () => syncScroll(cleanWrap, originalWrap, "clean");

    originalWrap.addEventListener("scroll", onOriginal);
    cleanWrap.addEventListener("scroll", onClean);

    return () => {
      originalWrap.removeEventListener("scroll", onOriginal);
      cleanWrap.removeEventListener("scroll", onClean);
    };
  }, [currentPage]);

  useEffect(() => {
    const originalWrap = originalWrapRef.current;
    const cleanWrap = cleanWrapRef.current;
    if (!originalWrap || !cleanWrap) return;
    originalWrap.scrollTop = 0;
    originalWrap.scrollLeft = 0;
    cleanWrap.scrollTop = 0;
    cleanWrap.scrollLeft = 0;
  }, [currentPage, data]);

  useEffect(() => {
    if (!readingOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReadingOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [readingOpen]);

  useEffect(() => {
    if (!readingOpen) return;
    const readingPages = pages.filter((p) => p.cleaned_image_url);
    readingPages.forEach((page, idx) => {
      const canvas = readingCanvasRefs.current[idx];
      if (!canvas || !page.cleaned_image_url) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        drawTranslatedTexts(ctx, page.regions || []);
      };
      img.src = page.cleaned_image_url;
    });
  }, [readingOpen, pages]);

  if (!data) {
    return <div className="text-muted-foreground">{status}</div>;
  }

  if (pages.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Natijalar topilmadi
        </CardContent>
      </Card>
    );
  }

  if (currentPage === pages.length) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">Tarjima matnlari</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCurrentPage(pages.length - 1)}>
              Orqaga
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {texts.length === 0 ? (
              <div className="text-muted-foreground">Matn topilmadi.</div>
            ) : (
              texts.map((t, idx) => (
                <div key={`${t.pageIdx}-${t.regionIdx}-${idx}`} className="rounded-lg border bg-white/70 p-3">
                  <div className="text-xs text-muted-foreground">Sahifa {t.pageIdx + 1}</div>
                  <div className="mt-1 text-sm font-medium">{t.original_text}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t.uz_text ? t.uz_text.toUpperCase() : "— Tarjima yo'q"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const page = pages[currentPage];
  const regions = page.regions || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link to="/">Dashboard</Link> / <Link to={`/project/${manga}`}>{manga}</Link> / {chapter}
          </div>
          <h1 className="text-3xl font-semibold">Natijalar</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/edit/${manga}/${chapter}`}>
            <Button variant="outline">Tahrirlash</Button>
          </Link>
          <Link to={`/project/${manga}`}>
            <Button variant="outline">Ortga</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              Sahifa {currentPage + 1} / {totalPages}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}>
                Oldingi
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(pages.length, currentPage + 1))}
              >
                Keyingi
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                disabled={translating}
                onClick={async () => {
                  if (!manga || !chapter) return;
                  if (!confirm("Barcha matnlarni tarjima qilmoqchimisiz?")) return;
                  setTranslating(true);
                  try {
                    const res = await api.translateChapter({
                      manga,
                      chapter,
                      backend: "openai",
                    });
                    if (res.job_id) {
                      window.location.hash = `#/jobs/${res.job_id}`;
                    } else {
                      alert(res.message || "Tarjima tugadi");
                      const updated = await api.getResults(manga, chapter);
                      setData(updated);
                    }
                  } catch (e) {
                    const err = e as Error;
                    alert(`Xatolik: ${err.message}`);
                  } finally {
                    setTranslating(false);
                  }
                }}
              >
                {translating ? "Boshlanmoqda..." : "Tarjima qilish"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage(pages.length)}>
                Tarjimaga
              </Button>
              <Button size="sm" onClick={() => setReadingOpen(true)}>
                To'liq o'qish
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_340px]">
            {/* Original image */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Original</div>
              <div
                ref={originalWrapRef}
                className="relative h-[75vh] overflow-auto rounded-lg border bg-white"
              >
                <img ref={originalImgRef} src={page.image_url} alt="Original" className="block w-full" />
                <canvas ref={originalCanvasRef} className="pointer-events-none absolute inset-0" />
              </div>
            </div>

            {/* Cleaned image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Tarjima</div>
                <Button
                  variant={drawingMode ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setDrawingMode((prev) => !prev)}
                >
                  {drawingMode ? "Bekor" : "+ Region"}
                </Button>
              </div>
              <div
                ref={cleanWrapRef}
                className="relative h-[75vh] overflow-auto rounded-lg border bg-white"
              >
                <img ref={cleanImgRef} src={page.cleaned_image_url} alt="Cleaned" className="block w-full" />
                <canvas ref={cleanCanvasRef} className="pointer-events-none absolute inset-0" />
                {drawingMode ? (
                  <>
                    <canvas ref={drawCanvasRef} className="absolute inset-0" />
                    <div className="absolute bottom-3 left-3 rounded-md bg-white/90 px-3 py-1 text-xs">
                      Matn joyini belgilang. Esc - bekor
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Text regions panel */}
            <div className="space-y-3 lg:max-h-[75vh] lg:overflow-y-auto">
              <div className="text-sm font-medium">Matnlar ({regions.length})</div>
              {regions.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Matn topilmadi
                </div>
              ) : (
                regions.map((r, i) => {
                  const key = `${currentPage}-${i}`;
                  const draft = regionDrafts[key] || { original: "", translation: "" };
                  return (
                    <div key={`${currentPage}-${i}`} className="flex flex-col gap-2 rounded-lg border bg-white/70 p-3">
                      <div className="text-sm font-semibold">
                        {i + 1}. {r.original_text || ""}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Original</div>
                        <textarea
                          className="min-h-[50px] w-full rounded border bg-white px-2 py-1 text-xs"
                          value={draft.original}
                          onChange={(e) =>
                            setRegionDrafts((prev) => ({
                              ...prev,
                              [key]: { ...draft, original: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Tarjima</div>
                        <textarea
                          className="min-h-[50px] w-full rounded border bg-white px-2 py-1 text-xs"
                          value={draft.translation}
                          onChange={(e) =>
                            setRegionDrafts((prev) => ({
                              ...prev,
                              [key]: { ...draft, translation: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!manga || !chapter) return;
                            setRegionDrafts((prev) => ({
                              ...prev,
                              [key]: { ...draft, status: "Saqlanmoqda..." },
                            }));
                            try {
                              await api.updateRegion(manga, chapter, currentPage, i, {
                                original_text: draft.original,
                                uz_text: draft.translation,
                              });
                              setRegionDrafts((prev) => ({
                                ...prev,
                                [key]: { ...draft, status: "Saqlandi!" },
                              }));
                            } catch (e) {
                              const err = e as Error;
                              setRegionDrafts((prev) => ({
                                ...prev,
                                [key]: { ...draft, status: `Xatolik: ${err.message}` },
                              }));
                            }
                          }}
                        >
                          Saqlash
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            if (!manga || !chapter) return;
                            if (!confirm("O'chirmoqchimisiz?")) return;
                            await api.deleteRegion(manga, chapter, currentPage, i);
                            const updated = await api.getResults(manga, chapter);
                            setData(updated);
                          }}
                        >
                          O'chir
                        </Button>
                        {draft.status && <div className="text-xs text-muted-foreground">{draft.status}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {(data.ocr_usage || data.translator_usage) && (
            <Card className="bg-white/70">
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="font-semibold">API xarajatlar</div>
                {data.ocr_usage && (
                  <div className="text-muted-foreground">
                    OCR ({data.ocr_usage.model || data.ocr_usage.ocr_backend}) — ${
                      (data.ocr_usage.estimated_cost_usd || 0).toFixed(6)
                    }
                  </div>
                )}
                {data.translator_usage && (
                  <div className="text-muted-foreground">
                    Tarjima ({data.translator_usage.model || data.translator_usage.translator_backend}) — ${
                      (data.translator_usage.estimated_cost_usd || 0).toFixed(6)
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          )}
      </div>

      {readingOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white/95">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="text-lg font-semibold">To'liq o'qish</div>
            <Button variant="outline" size="sm" onClick={() => setReadingOpen(false)}>
              Yopish
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
              {pages
                .filter((p) => p.cleaned_image_url)
                .map((page, idx) => (
                  <div key={`reading-${idx}`} className="rounded-2xl border bg-white p-4 shadow-sm">
                    <canvas
                      ref={(el) => {
                        readingCanvasRefs.current[idx] = el;
                      }}
                      className="h-auto w-full"
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

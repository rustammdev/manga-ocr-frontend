import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../lib/api";
import type { ResultsData } from "../lib/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";

type Draft = { original: string; translation: string; status?: string };

function buildDrafts(res: ResultsData) {
  const nextDrafts: Record<string, Draft> = {};
  res.pages.forEach((page, pageIdx) => {
    page.regions.forEach((region, regionIdx) => {
      nextDrafts[`${pageIdx}-${regionIdx}`] = {
        original: region.original_text || "",
        translation: region.uz_text || "",
      };
    });
  });
  return nextDrafts;
}

export default function EditorPage() {
  const { manga, chapter } = useParams();
  const [data, setData] = useState<ResultsData | null>(null);
  const [status, setStatus] = useState("Yuklanmoqda...");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    if (!manga || !chapter) return;
    api
      .getResults(manga, chapter)
      .then((res) => {
        setData(res);
        setStatus("");
        setDrafts(buildDrafts(res));
      })
      .catch((err) => setStatus(`Xatolik: ${err.message}`));
  }, [manga, chapter]);

  if (!data) {
    return <div className="text-muted-foreground">{status}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link to="/">Dashboard</Link> / <Link to={`/project/${manga}`}>{manga}</Link> / {chapter}
          </div>
          <h1 className="text-3xl font-semibold">OCR va tarjima tahrirlash</h1>
        </div>
        <Link to={`/results/${manga}/${chapter}`}>
          <Button variant="outline">Natijalar</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {data.pages.map((page, pageIdx) => (
          <Card key={`page-${pageIdx}`}>
            <CardContent className="space-y-4 p-6">
              <div className="text-lg font-semibold">Sahifa {pageIdx + 1}</div>
              {page.regions.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Bu sahifada matn regionlari topilmadi.
                </div>
              ) : (
                page.regions.map((region, regionIdx) => {
                  const key = `${pageIdx}-${regionIdx}`;
                  const draft = drafts[key] || { original: "", translation: "" };
                  return (
                    <div key={`region-${pageIdx}-${regionIdx}`} className="rounded-xl border bg-white/70 p-4">
                      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          Region {regionIdx + 1} [{region.bbox.x}, {region.bbox.y}, {region.bbox.w}, {region.bbox.h}]
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (!manga || !chapter) return;
                            if (!confirm("Bu regionni o'chirmoqchimisiz?")) return;
                          await api.deleteRegion(manga, chapter, pageIdx, regionIdx);
                          const updated = await api.getResults(manga, chapter);
                          setData(updated);
                          setDrafts(buildDrafts(updated));
                        }}
                        >
                          O'chirish
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">OCR matn (original):</div>
                        <Textarea
                          value={draft.original}
                          className="min-h-[80px]"
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [key]: { ...draft, original: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-muted-foreground">Tarjima (uz):</div>
                        <Textarea
                          value={draft.translation}
                          className="min-h-[80px]"
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [key]: { ...draft, translation: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!manga || !chapter) return;
                            setDrafts((prev) => ({
                              ...prev,
                              [key]: { ...draft, status: "Saqlanmoqda..." },
                            }));
                            try {
                              await api.updateRegion(manga, chapter, pageIdx, regionIdx, {
                                original_text: draft.original,
                                uz_text: draft.translation,
                              });
                              setDrafts((prev) => ({
                                ...prev,
                                [key]: { ...draft, status: "Saqlandi!" },
                              }));
                            } catch (e) {
                              const err = e as Error;
                              setDrafts((prev) => ({
                                ...prev,
                                [key]: { ...draft, status: `Xatolik: ${err.message}` },
                              }));
                            }
                          }}
                        >
                          Saqlash
                        </Button>
                        <div className="text-xs text-muted-foreground">{draft.status || ""}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

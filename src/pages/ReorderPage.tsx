import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Loader2,
  Trash2,
  Merge,
  GripVertical,
  Wand2,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { api } from "../lib/api";
import type { PageInfo } from "../lib/types";
import { Button } from "../components/ui/button";
import SplitModal from "../components/SplitModal";

type Mode = "reorder" | "merge";

/* ─── Sortable image card (grid) ─── */
function SortablePageCard({
  page,
  index,
}: {
  page: PageInfo;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.filename });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative w-[200px] overflow-hidden rounded-lg border-2 border-transparent hover:border-muted-foreground/30"
    >
      <img
        src={page.image_url}
        alt={page.filename}
        className="block w-full h-auto"
        draggable={false}
      />

      {/* Index badge */}
      <div className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white shadow">
        {index + 1}
      </div>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Filename */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6">
        <span className="block truncate text-[10px] font-medium text-white/90" dir="rtl">
          {page.filename}
        </span>
      </div>
    </div>
  );
}

/* ─── Static image card for merge mode ─── */
function MergePageCard({
  page,
  index,
  isSelected,
  isRangeStart,
  orderIdx,
  onClick,
}: {
  page: PageInfo;
  index: number;
  isSelected: boolean;
  isRangeStart: boolean;
  orderIdx: number;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative w-[200px] cursor-pointer rounded-lg border-2 transition-all ${
        isRangeStart
          ? "border-blue-500 ring-2 ring-blue-400/40"
          : isSelected
            ? "border-primary ring-2 ring-primary/30"
            : "border-transparent hover:border-muted-foreground/30"
      }`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    >
      <img
        src={page.image_url}
        alt={page.filename}
        className="block w-full h-auto"
        draggable={false}
      />

      {/* Index badge */}
      <div className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow ${
        isSelected ? "bg-primary" : isRangeStart ? "bg-blue-500" : "bg-black/70"
      }`}>
        {isSelected ? orderIdx + 1 : index + 1}
      </div>

      {/* Range start label */}
      {isRangeStart && (
        <div className="absolute left-9 top-1.5 rounded-md bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
          Boshi
        </div>
      )}

      {/* Filename */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6">
        <span className="block truncate text-[10px] font-medium text-white/90" dir="rtl">
          {page.filename}
        </span>
      </div>
    </div>
  );
}

/* ─── Drag overlay image ─── */
function DragOverlayCard({ page }: { page: PageInfo }) {
  return (
    <div className="w-48 overflow-hidden rounded-lg border-2 border-primary shadow-2xl">
      <img
        src={page.image_url}
        alt={page.filename}
        className="w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

/* ─── Draggable stash item ─── */
function StashItem({ page }: { page: PageInfo }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: page.filename,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`relative cursor-grab overflow-hidden rounded-md border transition-opacity active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <img
        src={page.image_url}
        alt={page.filename}
        className="block w-full h-auto"
        draggable={false}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 pb-1 pt-3">
        <span className="block truncate text-[9px] text-white/80" dir="rtl">
          {page.filename}
        </span>
      </div>
    </div>
  );
}

/* ─── Stash (staging) panel ─── */
function StashPanel({ stash }: { stash: PageInfo[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "stash-panel" });

  return (
    <div
      ref={setNodeRef}
      className={`sticky top-0 flex h-screen w-48 shrink-0 flex-col border-l transition-colors ${
        isOver ? "bg-primary/10 border-primary/30" : "bg-muted/30"
      }`}
    >
      <div className="border-b px-3 py-2.5">
        <h3 className="text-xs font-semibold text-muted-foreground">
          Saqlangan ({stash.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {stash.length === 0 ? (
          <p className="px-1 py-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            Rasmni shu yerga sudrab tashlang
          </p>
        ) : (
          stash.map((page) => <StashItem key={page.filename} page={page} />)
        )}
      </div>
    </div>
  );
}

/* ─── Droppable grid wrapper ─── */
function DroppableGrid({
  children,
  isEmpty,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "grid-area" });

  if (!isEmpty) {
    return (
      <div ref={setNodeRef} className="flex flex-wrap items-start gap-3">
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
        isOver ? "border-primary/40 bg-primary/5" : "border-muted"
      }`}
    >
      <p className="text-sm text-muted-foreground">
        {isOver
          ? "Shu yerga qo'ying"
          : "Paneldan rasmlarni shu yerga suring"}
      </p>
    </div>
  );
}

/* ─── Main page ─── */
export default function ReorderPage() {
  const { manga, chapter } = useParams<{ manga: string; chapter: string }>();
  const navigate = useNavigate();

  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [merging, setMerging] = useState(false);
  const [autoMerging, setAutoMerging] = useState(false);
  const [splitModalFile, setSplitModalFile] = useState<string | null>(null);

  // Mode
  const [mode, setMode] = useState<Mode>("merge");

  // Reorder state
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [hasReordered, setHasReordered] = useState(false);
  const [stash, setStash] = useState<PageInfo[]>([]);

  // Merge state
  const [selected, setSelected] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (!manga || !chapter) return;
    loadPages();
  }, [manga, chapter]);

  async function loadPages(silent = false) {
    if (!manga || !chapter) return;
    if (!silent) setLoading(true);
    try {
      const data = await api.getChapterPages(manga, chapter);
      const images = silent
        ? data.images.map((img) => ({
            ...img,
            image_url: `${img.image_url}?t=${Date.now()}`,
          }))
        : data.images;
      setPages(images);
      resetState();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function resetState() {
    setSelected([]);
    setRangeStart(null);
    setHasReordered(false);
    setDragActiveId(null);
    setStash([]);
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    resetState();
  }

  /* ── Drag handlers ── */
  function handleDragStart(event: DragStartEvent) {
    setDragActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDragActiveId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isActiveInGrid = pages.some((p) => p.filename === activeId);
    const isActiveInStash = stash.some((p) => p.filename === activeId);
    const isOverGridItem = pages.some((p) => p.filename === overId);

    // Grid → Stash panel
    if (isActiveInGrid && overId === "stash-panel") {
      const page = pages.find((p) => p.filename === activeId);
      if (!page) return;
      setPages((prev) => prev.filter((p) => p.filename !== activeId));
      setStash((prev) => [...prev, page]);
      setHasReordered(true);
      return;
    }

    // Grid → Grid (reorder)
    if (isActiveInGrid && isOverGridItem) {
      if (activeId === overId) return;
      setPages((prev) => {
        const oldIndex = prev.findIndex((p) => p.filename === activeId);
        const newIndex = prev.findIndex((p) => p.filename === overId);
        return arrayMove(prev, oldIndex, newIndex);
      });
      setHasReordered(true);
      return;
    }

    // Stash → Grid item (insert at position)
    if (isActiveInStash && isOverGridItem) {
      const page = stash.find((p) => p.filename === activeId);
      if (!page) return;
      const overIndex = pages.findIndex((p) => p.filename === overId);
      setStash((prev) => prev.filter((p) => p.filename !== activeId));
      setPages((prev) => {
        const copy = [...prev];
        copy.splice(overIndex, 0, page);
        return copy;
      });
      setHasReordered(true);
      return;
    }

    // Stash → Grid area (empty grid or dropped on grid background)
    if (isActiveInStash && overId === "grid-area") {
      const page = stash.find((p) => p.filename === activeId);
      if (!page) return;
      setStash((prev) => prev.filter((p) => p.filename !== activeId));
      setPages((prev) => [...prev, page]);
      setHasReordered(true);
      return;
    }
  }

  /* ── Merge selection ── */
  function handleMergeClick(filename: string) {
    if (!rangeStart) {
      setRangeStart(filename);
      setSelected([]);
      return;
    }
    if (rangeStart === filename) {
      setRangeStart(null);
      setSelected([]);
      return;
    }
    const startIdx = pages.findIndex((p) => p.filename === rangeStart);
    const endIdx = pages.findIndex((p) => p.filename === filename);
    if (startIdx < 0 || endIdx < 0) return;

    const from = Math.min(startIdx, endIdx);
    const to = Math.max(startIdx, endIdx);
    const rangeFiles = pages.slice(from, to + 1).map((p) => p.filename);
    setSelected(rangeFiles);
    setRangeStart(null);
  }

  /* ── Actions ── */
  async function handleSaveOrder() {
    if (!manga || !chapter) return;
    // If stash has items, append them to the end before saving
    const allPages = stash.length > 0 ? [...pages, ...stash] : pages;
    setSaving(true);
    try {
      const fullOrder = allPages.map((p) => p.filename);
      await api.reorderPages(manga, chapter, fullOrder);
      if (stash.length > 0) {
        setPages(allPages);
        setStash([]);
      }
      toast.success("Sahifalar tartibga solindi");
      setHasReordered(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMergeImages() {
    if (!manga || !chapter || selected.length < 2) return;
    if (
      !confirm(
        `${selected.length} ta rasmni bitta rasmga birlashtirilsinmi? (vertikal qo'shiladi)`
      )
    )
      return;

    setMerging(true);
    try {
      const res = await api.mergeImages(manga, chapter, selected);
      toast.success(
        `${res.merged_count} ta rasm birlashtirildi → ${res.merged_into}`
      );
      await loadPages(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMerging(false);
    }
  }

  async function handleDelete() {
    const toDelete = selected.length > 0 ? selected : rangeStart ? [rangeStart] : [];
    if (!manga || !chapter || toDelete.length === 0) return;
    if (
      !confirm(
        `${toDelete.length} ta rasmni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`
      )
    )
      return;

    setDeleting(true);
    try {
      const res = await api.deletePages(manga, chapter, toDelete);
      if (res.chapter_deleted) {
        toast.success("Barcha rasmlar o'chirildi, chapter ham o'chirildi");
        navigate(`/project/${manga}`);
        return;
      }
      toast.success(
        `${res.deleted} ta rasm o'chirildi, ${res.remaining} ta qoldi`
      );
      await loadPages(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAutoMerge() {
    if (!manga || !chapter) return;
    if (
      !confirm(
        "Qisqa rasmlar avtomatik birlashtirilsinmi? (bubble chekkalarini hurmat qiladi)"
      )
    )
      return;

    setAutoMerging(true);
    try {
      const res = await api.autoMerge(manga, chapter);
      if (res.merge_groups === 0) {
        toast.info("Birlashtirish kerak bo'lgan rasmlar topilmadi");
      } else {
        toast.success(
          `${res.total_merged} ta rasm ${res.merge_groups} ta guruhga birlashtirildi. ${res.remaining} ta rasm qoldi.`
        );
      }
      await loadPages(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAutoMerging(false);
    }
  }

  function handleSplitImage() {
    const target = selected.length === 1 ? selected[0] : rangeStart;
    if (target) setSplitModalFile(target);
  }

  async function handleSplitConfirm(cutLines: number[]) {
    if (!manga || !chapter || !splitModalFile) return;
    const res = await api.splitImage(manga, chapter, splitModalFile, cutLines);
    toast.success(
      `${splitModalFile} → ${res.parts} qismga bo'lindi. ${res.remaining} ta rasm qoldi.`
    );
    await loadPages(true);
  }

  const splitTarget = selected.length === 1 ? selected[0] : rangeStart;

  const draggedPage = dragActiveId
    ? pages.find((p) => p.filename === dragActiveId) ??
      stash.find((p) => p.filename === dragActiveId)
    : null;

  if (!manga || !chapter) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Sahifa topilmadi</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex">
        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Sticky toolbar */}
          <div className="sticky top-0 z-20 space-y-2 border-b bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/project/${manga}`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold">
                Tartib — {chapter}-bob
              </h1>
              <span className="text-xs text-muted-foreground">
                {pages.length} rasm
              </span>
            </div>

            {/* Mode switch + actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Mode toggle */}
              <div className="flex rounded-md border">
                <Button
                  variant={mode === "reorder" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => switchMode("reorder")}
                >
                  <GripVertical className="mr-1.5 h-3.5 w-3.5" />
                  Tartib
                </Button>
                <Button
                  variant={mode === "merge" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => switchMode("merge")}
                >
                  <Merge className="mr-1.5 h-3.5 w-3.5" />
                  Birlashtirish
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              {/* Reorder actions */}
              {mode === "reorder" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPages(true)}
                    disabled={!hasReordered}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Qaytarish
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveOrder}
                    disabled={saving || !hasReordered}
                  >
                    {saving ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </>
              )}

              {/* Merge actions */}
              {mode === "merge" && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAutoMerge}
                    disabled={autoMerging}
                  >
                    {autoMerging ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {autoMerging ? "Birlashtirilmoqda..." : "Auto birlashtirish"}
                  </Button>

                  <div className="h-6 w-px bg-border" />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelected([]); setRangeStart(null); }}
                    disabled={selected.length === 0 && !rangeStart}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Reset
                  </Button>

                  {selected.length >= 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMergeImages}
                      disabled={merging}
                    >
                      {merging ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Merge className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Birlashtirish ({selected.length})
                    </Button>
                  )}

                  {splitTarget && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSplitImage}
                    >
                      <Scissors className="mr-1.5 h-3.5 w-3.5" />
                      Qirqish
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting || (selected.length === 0 && !rangeStart)}
                  >
                    {deleting ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    O'chirish ({selected.length || (rangeStart ? 1 : 0)})
                  </Button>
                </>
              )}
            </div>

            {/* Hint */}
            <p className="text-xs text-muted-foreground">
              {mode === "reorder"
                ? stash.length > 0
                  ? `${stash.length} ta rasm panelda. Paneldan kerakli joyga suring.`
                  : "Rasmni suring. Uzoq masofaga ko'chirish uchun o'ng panelga tashlang."
                : rangeStart
                  ? "Endi tugash rasmini bosing — oradagi barcha rasmlar tanlanadi."
                  : "Boshlanish rasmini bosing, keyin tugash rasmini bosing — oraliq avtomatik tanlanadi."}
            </p>
          </div>

          {/* Grid */}
          <div className="p-4">
            {mode === "reorder" ? (
              <SortableContext
                items={pages.map((p) => p.filename)}
                strategy={rectSortingStrategy}
              >
                <DroppableGrid isEmpty={pages.length === 0}>
                  {pages.map((page, i) => (
                    <SortablePageCard
                      key={page.filename}
                      page={page}
                      index={i}
                    />
                  ))}
                </DroppableGrid>
              </SortableContext>
            ) : (
              <div className="flex flex-wrap items-start gap-3">
                {pages.map((page, i) => (
                  <MergePageCard
                    key={page.filename}
                    page={page}
                    index={i}
                    isSelected={selected.includes(page.filename)}
                    isRangeStart={rangeStart === page.filename}
                    orderIdx={selected.indexOf(page.filename)}
                    onClick={() => handleMergeClick(page.filename)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stash panel — only in reorder mode */}
        {mode === "reorder" && <StashPanel stash={stash} />}
      </div>

      <DragOverlay>
        {draggedPage ? <DragOverlayCard page={draggedPage} /> : null}
      </DragOverlay>

      {/* Split modal */}
      {(() => {
        const splitPage = splitModalFile
          ? pages.find((p) => p.filename === splitModalFile)
          : null;
        return (
          <SplitModal
            open={!!splitModalFile}
            onOpenChange={(v) => { if (!v) setSplitModalFile(null); }}
            imageUrl={splitPage?.image_url ?? ""}
            filename={splitModalFile ?? ""}
            onConfirm={handleSplitConfirm}
          />
        );
      })()}
    </DndContext>
  );
}

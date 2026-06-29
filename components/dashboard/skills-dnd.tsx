"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ListId = "required" | "secondary";
type Lists = { required: string[]; secondary: string[] };

/**
 * Two linked, sortable skill lists. Drag a chip to reorder it (priority) or move
 * it between Primary and Secondary. Type to add; ✕ to remove. Fully controlled;
 * the parent owns both arrays.
 */
export function SkillsDnd({
  required,
  secondary,
  onChange,
  max = 60,
}: {
  required: string[];
  secondary: string[];
  onChange: (next: Lists) => void;
  max?: number;
}) {
  const lists: Lists = { required, secondary };
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // A small drag threshold so clicking ✕ / focusing the input still works.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function findContainer(id: string): ListId | null {
    if (id === "required" || id === "secondary") return id;
    if (lists.required.includes(id)) return "required";
    if (lists.secondary.includes(id)) return "secondary";
    return null;
  }

  // Live-move a chip across lists while hovering.
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (!from || !to || from === to) return;

    const fromItems = [...lists[from]];
    const toItems = [...lists[to]];
    const activeIndex = fromItems.indexOf(activeId);
    if (activeIndex === -1) return;

    let overIndex = toItems.indexOf(overId);
    if (overId === to || overIndex === -1) overIndex = toItems.length;

    fromItems.splice(activeIndex, 1);
    toItems.splice(overIndex, 0, activeId);

    const next: Lists = { ...lists };
    next[from] = fromItems;
    next[to] = toItems;
    onChange(next);
  }

  // Finalize reordering inside a list (cross-list is handled in dragOver).
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (!from || !to || from !== to) return;

    const items = lists[from];
    const oldIndex = items.indexOf(activeId);
    const newIndex = overId === to ? items.length - 1 : items.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const next: Lists = { ...lists };
    next[from] = arrayMove(items, oldIndex, newIndex);
    onChange(next);
  }

  function add(list: ListId, raw: string) {
    const value = raw.trim().replace(/,$/, "").trim();
    if (!value) return;
    const total = lists.required.length + lists.secondary.length;
    if (total >= max * 2) return;
    const exists = [...lists.required, ...lists.secondary].some(
      (s) => s.toLowerCase() === value.toLowerCase(),
    );
    if (exists) return;
    onChange({ ...lists, [list]: [...lists[list], value] });
  }

  function remove(list: ListId, value: string) {
    onChange({ ...lists, [list]: lists[list].filter((s) => s !== value) });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-5">
        <SkillList
          id="required"
          label="Primary skills"
          tone="accent"
          items={lists.required}
          onAdd={(v) => add("required", v)}
          onRemove={(v) => remove("required", v)}
          placeholder="Add a core skill..."
        />
        <SkillList
          id="secondary"
          label="Secondary skills"
          tone="muted"
          items={lists.secondary}
          onAdd={(v) => add("secondary", v)}
          onRemove={(v) => remove("secondary", v)}
          placeholder="Add a nice-to-have..."
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Drag a skill to reorder it (top = highest priority) or move it between
        Primary and Secondary.
      </p>

      <DragOverlay>
        {activeId ? (
          <Chip
            id={activeId}
            tone={findContainer(activeId) === "required" ? "accent" : "muted"}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SkillList({
  id,
  label,
  tone,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  id: ListId;
  label: string;
  tone: "accent" | "muted";
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [draft, setDraft] = useState("");

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground">{items.length}</span>
      </div>

      <SortableContext id={id} items={items} strategy={rectSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-[3.25rem] flex-wrap gap-1.5 rounded-xl border bg-surface p-2 transition-colors ${
            isOver ? "border-accent/60 bg-blush/30" : "border-border"
          }`}
        >
          {items.map((item) => (
            <SortableChip
              key={item}
              id={item}
              tone={tone}
              onRemove={() => onRemove(item)}
            />
          ))}

          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                onAdd(draft);
                setDraft("");
              }
            }}
            onBlur={() => {
              if (draft.trim()) {
                onAdd(draft);
                setDraft("");
              }
            }}
            placeholder={placeholder}
            className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      </SortableContext>
    </div>
  );
}

function SortableChip({
  id,
  tone,
  onRemove,
}: {
  id: string;
  tone: "accent" | "muted";
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <span ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Chip id={id} tone={tone} onRemove={onRemove} />
    </span>
  );
}

function Chip({
  id,
  tone,
  onRemove,
  overlay = false,
}: {
  id: string;
  tone: "accent" | "muted";
  onRemove?: () => void;
  overlay?: boolean;
}) {
  return (
    <span
      className={`inline-flex cursor-grab items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium select-none active:cursor-grabbing ${
        tone === "accent"
          ? "bg-accent text-accent-contrast"
          : "bg-blush text-accent"
      } ${overlay ? "cursor-grabbing shadow-lg ring-2 ring-accent/40" : ""}`}
    >
      <GripIcon />
      {id}
      {onRemove && (
        <button
          type="button"
          // Stop the drag sensor from swallowing the click.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          aria-label={`Remove ${id}`}
          className="grid h-3.5 w-3.5 place-items-center rounded-sm opacity-70 transition-opacity hover:opacity-100"
        >
          <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M1 1l8 8M9 1l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

function GripIcon() {
  return (
    <svg
      width="9"
      height="12"
      viewBox="0 0 6 10"
      fill="currentColor"
      aria-hidden="true"
      className="opacity-50"
    >
      <circle cx="1.2" cy="1.2" r="1.1" />
      <circle cx="4.8" cy="1.2" r="1.1" />
      <circle cx="1.2" cy="5" r="1.1" />
      <circle cx="4.8" cy="5" r="1.1" />
      <circle cx="1.2" cy="8.8" r="1.1" />
      <circle cx="4.8" cy="8.8" r="1.1" />
    </svg>
  );
}

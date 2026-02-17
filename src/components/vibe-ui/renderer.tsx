/**
 * VibeOS — Server-Driven UI Renderer
 *
 * The generic engine that "paints" components based on Vibe-JSON metadata.
 * Instead of writing React components for every view, VibeOS reads the schema
 * and dynamically selects and configures the appropriate UI component.
 *
 * Works as a standard React component — framework-agnostic.
 */

import type {
  VibeViewSchema,
  VibeEntitySchema,
  VibeUIComponentType,
} from "@/lib/kernel/types";
import { VibeTable } from "./factory/vibe-table";
import { VibeForm } from "./factory/vibe-form";
import { VibeDetail } from "./factory/vibe-detail";
import { VibeCard } from "./factory/vibe-card";

/* ------------------------------------------------------------------ */
/*  Component Registry                                                */
/* ------------------------------------------------------------------ */

type VibeComponentProps = {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
};

/**
 * Registry mapping component types to their React implementations.
 * New component types are added here — the renderer automatically picks them up.
 */
const COMPONENT_REGISTRY: Record<
  VibeUIComponentType,
  React.ComponentType<VibeComponentProps> | null
> = {
  table: VibeTable,
  form: VibeForm,
  detail: VibeDetail,
  card: VibeCard,
  list: null, // TODO: Implement VibeList
  kanban: null, // TODO: Implement VibeKanban
  chart: null, // TODO: Implement VibeChart
  stat: null, // TODO: Implement VibeStat
  custom: null, // Custom components loaded dynamically
};

/* ------------------------------------------------------------------ */
/*  Renderer                                                          */
/* ------------------------------------------------------------------ */

interface VibeRendererProps {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
}

/**
 * The main renderer component. Given a view schema, entity definition,
 * and data — it selects and renders the appropriate UI component.
 */
export function VibeRenderer({ view, entity, data }: VibeRendererProps) {
  const Component = COMPONENT_REGISTRY[view.layout.type];

  if (!Component) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] p-8">
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            Component type{" "}
            <code className="rounded bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs">
              {view.layout.type}
            </code>{" "}
            is not yet implemented.
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            View: {view.label} &middot; Entity: {entity.label}
          </p>
        </div>
      </div>
    );
  }

  return <Component view={view} entity={entity} data={data} />;
}

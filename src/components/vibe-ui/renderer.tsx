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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  list: null,
  kanban: null,
  chart: null,
  stat: null,
  custom: null,
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
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Component type{" "}
              <Badge variant="secondary" className="font-mono text-xs">
                {view.layout.type}
              </Badge>{" "}
              is not yet implemented.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              View: {view.label} &middot; Entity: {entity.label}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <Component view={view} entity={entity} data={data} />;
}

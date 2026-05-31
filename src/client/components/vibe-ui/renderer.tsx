/**
 * VibeOS — Server-Driven UI Renderer
 *
 * Dynamically renders components based on Vibe-JSON metadata.
 * Supports interactive CRUD: tables show data, forms create records,
 * detail views inspect a single record.
 */

import type {
  VibeViewSchema,
  VibeEntitySchema,
  VibeUIComponentType,
} from "@shared/types";
import { VibeTable } from "./factory/vibe-table";
import { VibeForm } from "./factory/vibe-form";
import { VibeDetail } from "./factory/vibe-detail";
import { VibeCard } from "./factory/vibe-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Shared callback types for interactive SDUI                        */
/* ------------------------------------------------------------------ */

export interface VibeComponentCallbacks {
  onCreateRecord?: (entityName: string, record: Record<string, unknown>) => void;
  onDeleteRecord?: (entityName: string, recordId: string) => void;
  onNavigateToView?: (viewName: string) => void;
  onSelectRecord?: (entityName: string, record: Record<string, unknown>) => void;
}

/* ------------------------------------------------------------------ */
/*  Component Registry                                                */
/* ------------------------------------------------------------------ */

export type VibeComponentProps = {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
  callbacks?: VibeComponentCallbacks;
};

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
  callbacks?: VibeComponentCallbacks;
}

export function VibeRenderer({ view, entity, data, callbacks }: VibeRendererProps) {
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

  return <Component view={view} entity={entity} data={data} callbacks={callbacks} />;
}

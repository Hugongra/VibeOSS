import {
  Component,
  useCallback,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import type { VibeSchemaV1 } from "@shared/types";
import { VibeRenderer, type VibeComponentCallbacks } from "./renderer";
import { Badge } from "@/components/ui/badge";
import {
  apiRecordToRow,
  mutateRecord,
  queryRecords,
} from "@/lib/vibe-api";

type RecordStore = Record<string, Record<string, unknown>[]>;

interface SchemaPreviewPanelProps {
  schema: VibeSchemaV1 | null;
  moduleId: string | null;
  selectedViewName: string | null;
  onViewChange: (viewName: string) => void;
}

class PreviewErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SchemaPreview]", error, info.componentStack);
  }

  componentDidUpdate(prevProps: { children: ReactNode }) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            Could not render preview
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The generated schema may include an unsupported layout or invalid
            field configuration.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function InteractivePreview({
  schema,
  moduleId,
  selectedViewName,
  onViewChange,
}: {
  schema: VibeSchemaV1;
  moduleId: string | null;
  selectedViewName: string | null;
  onViewChange: (viewName: string) => void;
}) {
  const [records, setRecords] = useState<RecordStore>({});
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(
    null
  );
  const [detailEntity, setDetailEntity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeView =
    schema.views.find((v) => v.name === selectedViewName) ?? schema.views[0];

  const entity = activeView
    ? schema.entities.find((e) => e.name === activeView.entity)
    : undefined;

  const loadEntityRecords = useCallback(
    async (entityName: string) => {
      if (!moduleId) return;

      setLoading(true);
      setError(null);
      try {
        const result = await queryRecords({ moduleId, entity: entityName });
        if (!result.ok) {
          const err = result.json.error ?? "Failed to load records";
          setError(String(err));
          return;
        }

        const apiRecords = (result.json.records as Array<{
          id: string;
          data: Record<string, unknown>;
        }>) ?? [];

        setRecords((prev) => ({
          ...prev,
          [entityName]: apiRecords.map(apiRecordToRow),
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load records");
      } finally {
        setLoading(false);
      }
    },
    [moduleId]
  );

  useEffect(() => {
    if (entity && moduleId) {
      void loadEntityRecords(entity.name);
    }
  }, [entity?.name, moduleId, loadEntityRecords]);

  const handleCreateRecord = useCallback(
    async (entityName: string, record: Record<string, unknown>) => {
      if (moduleId) {
        setError(null);
        const result = await mutateRecord({
          moduleId,
          entity: entityName,
          operation: "create",
          data: record,
        });

        if (!result.ok) {
          const details = Array.isArray(result.json.details)
            ? (result.json.details as string[]).join("; ")
            : "";
          setError(`${result.json.error ?? "Create failed"}${details ? `: ${details}` : ""}`);
          return;
        }

        await loadEntityRecords(entityName);
        return;
      }

      // Fallback: in-memory when no moduleId (e.g. validate-only flow)
      const id = `local_${Date.now()}`;
      setRecords((prev) => ({
        ...prev,
        [entityName]: [...(prev[entityName] ?? []), { ...record, _id: id }],
      }));
    },
    [moduleId, loadEntityRecords]
  );

  const handleDeleteRecord = useCallback(
    async (entityName: string, recordId: string) => {
      if (moduleId) {
        setError(null);
        const result = await mutateRecord({
          moduleId,
          entity: entityName,
          operation: "delete",
          recordId,
        });

        if (!result.ok) {
          setError(String(result.json.error ?? "Delete failed"));
          return;
        }

        await loadEntityRecords(entityName);
        setSelectedRecord(null);
        setDetailEntity(null);
        return;
      }

      setRecords((prev) => ({
        ...prev,
        [entityName]: (prev[entityName] ?? []).filter((r) => r._id !== recordId),
      }));
      setSelectedRecord(null);
      setDetailEntity(null);
    },
    [moduleId, loadEntityRecords]
  );

  const handleNavigateToView = useCallback(
    (viewName: string) => {
      const exact = schema.views.find((v) => v.name === viewName);
      if (exact) {
        onViewChange(viewName);
        setSelectedRecord(null);
        setDetailEntity(null);
        return;
      }

      const targetType = viewName.includes("form")
        ? "form"
        : viewName.includes("detail")
          ? "detail"
          : "table";

      const entityName = viewName
        .replace(/_form$/, "")
        .replace(/_table$/, "")
        .replace(/_detail$/, "")
        .replace(/s_table$/, "")
        .replace(/s_form$/, "");

      const match = schema.views.find(
        (v) =>
          v.layout.type === targetType &&
          (v.entity === entityName ||
            v.entity === `${entityName}s` ||
            v.entity.startsWith(entityName))
      );

      if (match) {
        onViewChange(match.name);
        setSelectedRecord(null);
        setDetailEntity(null);
      }
    },
    [schema.views, onViewChange]
  );

  const handleSelectRecord = useCallback(
    (entityName: string, record: Record<string, unknown>) => {
      setSelectedRecord(record);
      setDetailEntity(entityName);

      const detailView = schema.views.find(
        (v) => v.entity === entityName && v.layout.type === "detail"
      );
      if (detailView) {
        onViewChange(detailView.name);
      }
    },
    [schema.views, onViewChange]
  );

  const callbacks: VibeComponentCallbacks = {
    onCreateRecord: (entityName, record) => {
      void handleCreateRecord(entityName, record);
    },
    onDeleteRecord: (entityName, recordId) => {
      void handleDeleteRecord(entityName, recordId);
    },
    onNavigateToView: handleNavigateToView,
    onSelectRecord: handleSelectRecord,
  };

  if (!activeView || !entity) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not render preview — no valid view/entity pairing in the schema.
      </p>
    );
  }

  const entityRecords = records[entity.name] ?? [];
  const displayData =
    selectedRecord && detailEntity === entity.name && activeView.layout.type === "detail"
      ? [selectedRecord]
      : entityRecords;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      {loading && (
        <p className="text-xs text-muted-foreground">Loading records from database…</p>
      )}
      <VibeRenderer
        view={activeView}
        entity={entity}
        data={displayData}
        callbacks={callbacks}
      />
    </div>
  );
}

export function SchemaPreviewPanel({
  schema,
  moduleId,
  selectedViewName,
  onViewChange,
}: SchemaPreviewPanelProps) {
  const activeView =
    schema?.views.find((v) => v.name === selectedViewName) ?? schema?.views[0];

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Live preview
          </span>
          <Badge
            variant="secondary"
            className={
              moduleId
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            }
          >
            {moduleId ? "Persisted" : "Waiting"}
          </Badge>
        </div>

        {schema && schema.views.length > 0 && (
          <select
            value={activeView?.name ?? ""}
            onChange={(e) => onViewChange(e.target.value)}
            className="h-8 max-w-[220px] truncate rounded-md border border-border bg-muted/40 px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Select view"
          >
            {schema.views.map((view) => (
              <option key={view.name} value={view.name}>
                {view.label} ({view.layout.type})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!schema ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">No preview yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Send a message in the chat to generate your application.
            </p>
          </div>
        ) : (
          <PreviewErrorBoundary
            key={`${schema.module}-${moduleId ?? "local"}-${activeView?.name ?? "default"}`}
          >
            <InteractivePreview
              schema={schema}
              moduleId={moduleId}
              selectedViewName={activeView?.name ?? null}
              onViewChange={onViewChange}
            />
          </PreviewErrorBoundary>
        )}
      </div>
    </div>
  );
}

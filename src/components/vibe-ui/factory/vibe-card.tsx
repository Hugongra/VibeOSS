/**
 * VibeOS Factory — Card Component
 *
 * Renders records as a responsive card grid based on entity schema.
 */

import type { VibeViewSchema, VibeEntitySchema } from "@/lib/kernel/types";

interface VibeCardProps {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
}

export function VibeCard({ view, entity, data }: VibeCardProps) {
  const displayFields = view.layout.columns ?? entity.fields.slice(0, 4).map((f) => f.name);
  const fieldMap = new Map(entity.fields.map((f) => [f.name, f]));

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          No {entity.pluralLabel.toLowerCase()} found.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          {view.label}
        </h3>
        <span className="text-xs text-[var(--muted-foreground)]">
          {data.length} {data.length === 1 ? "record" : "records"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((record, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)]"
          >
            {/* Title: use the first field */}
            <h4 className="mb-2 font-medium text-[var(--foreground)]">
              {String(record[displayFields[0]] ?? "Untitled")}
            </h4>

            {/* Remaining fields */}
            <div className="space-y-1">
              {displayFields.slice(1).map((col) => {
                const field = fieldMap.get(col);
                const value = record[col];
                return (
                  <div key={col} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {field?.label ?? col}
                    </span>
                    <span className="text-xs text-[var(--foreground)]">
                      {formatCardValue(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCardValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return "...";
  const str = String(value);
  return str.length > 30 ? `${str.slice(0, 30)}...` : str;
}

/**
 * VibeOS Factory — Detail Component
 *
 * Renders a single record's details in a clean key-value layout.
 */

import type { VibeViewSchema, VibeEntitySchema } from "@/lib/kernel/types";

interface VibeDetailProps {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
}

export function VibeDetail({ view, entity, data }: VibeDetailProps) {
  const record = data[0];

  if (!record) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          No record selected.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          {view.label}
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          {entity.description}
        </p>
      </div>

      <dl className="divide-y divide-[var(--border)]">
        {entity.fields.map((field) => (
          <div
            key={field.name}
            className="grid grid-cols-3 gap-4 px-6 py-3"
          >
            <dt className="text-sm font-medium text-[var(--muted-foreground)]">
              {field.label}
            </dt>
            <dd className="col-span-2 text-sm text-[var(--foreground)]">
              {formatDetailValue(record[field.name])}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

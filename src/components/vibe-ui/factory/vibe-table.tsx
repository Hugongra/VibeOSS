/**
 * VibeOS Factory — Table Component
 *
 * Renders a data table based on entity fields and view configuration.
 * Automatically generates columns from the schema and applies filters/sorting.
 */

import type { VibeViewSchema, VibeEntitySchema } from "@/lib/kernel/types";

interface VibeTableProps {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
}

export function VibeTable({ view, entity, data }: VibeTableProps) {
  const columns = view.layout.columns ?? entity.fields.map((f) => f.name);
  const fieldMap = new Map(entity.fields.map((f) => [f.name, f]));

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          {view.label}
        </h3>
        <span className="text-xs text-[var(--muted-foreground)]">
          {data.length} records
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
              {columns.map((col) => {
                const field = fieldMap.get(col);
                return (
                  <th
                    key={col}
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]"
                  >
                    {field?.label ?? col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  className="bg-[var(--card)] transition-colors hover:bg-[var(--secondary)]"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="whitespace-nowrap px-4 py-2.5 text-sm text-[var(--foreground)]"
                    >
                      {formatCellValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

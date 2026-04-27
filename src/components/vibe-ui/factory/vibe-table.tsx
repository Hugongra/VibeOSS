import type { VibeViewSchema, VibeEntitySchema } from "@/lib/kernel/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface VibeTableProps {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
}

export function VibeTable({ view, entity, data }: VibeTableProps) {
  const columns = view.layout.columns ?? entity.fields.map((f) => f.name);
  const fieldMap = new Map(entity.fields.map((f) => [f.name, f]));

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-foreground">{view.label}</h3>
        <Badge variant="secondary">{data.length} records</Badge>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const field = fieldMap.get(col);
                return (
                  <TableHead key={col} className="text-xs uppercase tracking-wider">
                    {field?.label ?? col}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow key={idx}>
                  {columns.map((col) => (
                    <TableCell key={col}>{formatCellValue(row[col])}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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

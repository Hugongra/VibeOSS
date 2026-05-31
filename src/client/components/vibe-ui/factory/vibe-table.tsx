import type { VibeComponentProps } from "../renderer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function VibeTable({ view, entity, data, callbacks }: VibeComponentProps) {
  const columns = view.layout.columns ?? entity.fields.map((f) => f.name);
  const fieldMap = new Map(entity.fields.map((f) => [f.name, f]));

  const formViewName = `${entity.name}_form`;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-foreground">{view.label}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{data.length} records</Badge>
          <Button
            size="sm"
            onClick={() => callbacks?.onNavigateToView?.(formViewName)}
          >
            + Add {entity.label}
          </Button>
        </div>
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
              <TableHead className="w-16 text-xs uppercase tracking-wider">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-24 text-center text-muted-foreground"
                >
                  No records yet. Click "+ Add {entity.label}" to create one.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow
                  key={(row._id as string) ?? idx}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => callbacks?.onSelectRecord?.(entity.name, row)}
                >
                  {columns.map((col) => {
                    const field = fieldMap.get(col);
                    return (
                      <TableCell key={col}>
                        <CellValue value={row[col]} fieldType={field?.type} options={field?.options} />
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (row._id) callbacks?.onDeleteRecord?.(entity.name, row._id as string);
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CellValue({
  value,
  fieldType,
  options,
}: {
  value: unknown;
  fieldType?: string;
  options?: string[];
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  if (fieldType === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if ((fieldType === "select" || fieldType === "multi-select") && options) {
    return <Badge variant="secondary">{String(value)}</Badge>;
  }

  if (fieldType === "currency") {
    const num = Number(value);
    if (!Number.isNaN(num)) {
      return <span>${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>;
    }
  }

  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (typeof value === "object") return <span>{JSON.stringify(value)}</span>;
  return <span>{String(value)}</span>;
}

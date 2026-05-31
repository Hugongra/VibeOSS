import type { VibeComponentProps } from "../renderer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function VibeCard({ view, entity, data, callbacks }: VibeComponentProps) {
  const displayFields =
    view.layout.columns ?? entity.fields.slice(0, 4).map((f) => f.name);
  const fieldMap = new Map(entity.fields.map((f) => [f.name, f]));

  const formViewName = `${entity.name}_form`;

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
          <p className="text-sm text-muted-foreground">
            No {entity.pluralLabel.toLowerCase()} found.
          </p>
          <Button size="sm" onClick={() => callbacks?.onNavigateToView?.(formViewName)}>
            + Add {entity.label}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{view.label}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {data.length} {data.length === 1 ? "record" : "records"}
          </Badge>
          <Button size="sm" onClick={() => callbacks?.onNavigateToView?.(formViewName)}>
            + Add
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((record, idx) => (
          <Card
            key={(record._id as string) ?? idx}
            className="cursor-pointer transition-colors hover:ring-1 hover:ring-foreground/20"
            onClick={() => callbacks?.onSelectRecord?.(entity.name, record)}
          >
            <CardHeader>
              <CardTitle className="text-base">
                {String(record[displayFields[0]] ?? "Untitled")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {displayFields.slice(1).map((col) => {
                  const field = fieldMap.get(col);
                  const value = record[col];
                  return (
                    <div key={col} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {field?.label ?? col}
                      </span>
                      <span className="text-xs text-foreground">
                        {formatCardValue(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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

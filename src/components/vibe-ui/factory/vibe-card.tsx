import type { VibeViewSchema, VibeEntitySchema } from "@/lib/kernel/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VibeCardProps {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
}

export function VibeCard({ view, entity, data }: VibeCardProps) {
  const displayFields =
    view.layout.columns ?? entity.fields.slice(0, 4).map((f) => f.name);
  const fieldMap = new Map(entity.fields.map((f) => [f.name, f]));

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            No {entity.pluralLabel.toLowerCase()} found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{view.label}</h3>
        <Badge variant="secondary">
          {data.length} {data.length === 1 ? "record" : "records"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((record, idx) => (
          <Card
            key={idx}
            className="transition-colors hover:ring-foreground/20"
          >
            <CardHeader>
              <CardTitle>
                {String(record[displayFields[0]] ?? "Untitled")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {displayFields.slice(1).map((col) => {
                  const field = fieldMap.get(col);
                  const value = record[col];
                  return (
                    <div
                      key={col}
                      className="flex items-center justify-between"
                    >
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

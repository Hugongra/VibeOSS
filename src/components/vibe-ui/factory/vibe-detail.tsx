import type { VibeViewSchema, VibeEntitySchema } from "@/lib/kernel/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface VibeDetailProps {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
}

export function VibeDetail({ view, entity, data }: VibeDetailProps) {
  const record = data[0];

  if (!record) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No record selected.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{view.label}</CardTitle>
        <CardDescription>{entity.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-0">
          {entity.fields.map((field, idx) => (
            <div key={field.name}>
              {idx > 0 && <Separator />}
              <div className="grid grid-cols-3 gap-4 py-3">
                <dt className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="col-span-2 text-sm text-foreground">
                  {formatDetailValue(record[field.name])}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

import type { VibeComponentProps } from "../renderer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function VibeDetail({ view, entity, data, callbacks }: VibeComponentProps) {
  const record = data[0];
  const tableViewName = `${entity.name}s_table`;

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{view.label}</CardTitle>
            <CardDescription>{entity.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => callbacks?.onNavigateToView?.(tableViewName)}
            >
              Back to list
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (record._id) {
                  callbacks?.onDeleteRecord?.(entity.name, record._id as string);
                  callbacks?.onNavigateToView?.(tableViewName);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="space-y-0">
          {entity.fields.map((field, idx) => {
            const val = record[field.name];
            return (
              <div key={field.name}>
                {idx > 0 && <Separator />}
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="col-span-2 text-sm text-foreground">
                    <DetailValue value={val} fieldType={field.type} />
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}

function DetailValue({ value, fieldType }: { value: unknown; fieldType: string }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  if (fieldType === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
  }

  if (fieldType === "select" || fieldType === "multi-select") {
    return <Badge variant="secondary">{String(value)}</Badge>;
  }

  if (fieldType === "currency") {
    const num = Number(value);
    if (!Number.isNaN(num)) {
      return <span>${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>;
    }
  }

  if (fieldType === "email") {
    return <a href={`mailto:${value}`} className="text-primary underline">{String(value)}</a>;
  }

  if (fieldType === "url") {
    return <a href={String(value)} className="text-primary underline" target="_blank" rel="noreferrer">{String(value)}</a>;
  }

  if (typeof value === "object") return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
  return <span>{String(value)}</span>;
}

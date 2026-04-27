import type {
  VibeViewSchema,
  VibeEntitySchema,
  VibeFieldDefinition,
} from "@/lib/kernel/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VibeFormProps {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
}

export function VibeForm({ view, entity }: VibeFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{view.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5">
          {entity.fields.map((field) => (
            <VibeFormField key={field.name} field={field} />
          ))}

          <div className="flex items-center gap-3 pt-4">
            <Button type="submit">Save</Button>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function VibeFormField({ field }: { field: VibeFieldDefinition }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required && (
          <span className="text-destructive">*</span>
        )}
      </Label>

      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}

      {renderInput(field)}
    </div>
  );
}

function renderInput(field: VibeFieldDefinition) {
  switch (field.type) {
    case "text":
    case "email":
    case "url":
    case "phone":
      return (
        <Input
          id={field.name}
          name={field.name}
          type={
            field.type === "email"
              ? "email"
              : field.type === "url"
                ? "url"
                : "text"
          }
          placeholder={field.label}
          required={field.required}
        />
      );

    case "number":
    case "currency":
    case "percentage":
      return (
        <Input
          id={field.name}
          name={field.name}
          type="number"
          placeholder={field.label}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Checkbox id={field.name} name={field.name} />
          <Label htmlFor={field.name} className="font-normal">
            {field.label}
          </Label>
        </div>
      );

    case "date":
    case "datetime":
      return (
        <Input
          id={field.name}
          name={field.name}
          type={field.type === "datetime" ? "datetime-local" : "date"}
          required={field.required}
        />
      );

    case "select":
      return (
        <Select name={field.name} required={field.required}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${field.label}...`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "rich-text":
      return (
        <Textarea
          id={field.name}
          name={field.name}
          placeholder={field.label}
          required={field.required}
          rows={4}
        />
      );

    default:
      return (
        <Input
          id={field.name}
          name={field.name}
          type="text"
          placeholder={field.label}
          required={field.required}
        />
      );
  }
}

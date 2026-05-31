import { useState, type FormEvent } from "react";
import type {
  VibeFieldDefinition,
} from "@shared/types";
import type { VibeComponentProps } from "../renderer";
import { mapVibeFieldTypeToSduiComponent } from "@shared/sdui/field-component-map";
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

export function VibeForm({ view, entity, callbacks }: VibeComponentProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  const tableViewName = `${entity.name}s_table`;

  function updateField(name: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    callbacks?.onCreateRecord?.(entity.name, { ...formData });
    setFormData({});
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
    callbacks?.onNavigateToView?.(tableViewName);
  }

  function handleCancel() {
    setFormData({});
    callbacks?.onNavigateToView?.(tableViewName);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{view.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {entity.fields.map((field) => (
            <VibeFormField
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={(val) => updateField(field.name, val)}
            />
          ))}

          <div className="flex items-center gap-3 pt-4">
            <Button type="submit">
              {submitted ? "Saved!" : `Create ${entity.label}`}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function VibeFormField({
  field,
  value,
  onChange,
}: {
  field: VibeFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>

      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}

      <FieldInput field={field} value={value} onChange={onChange} />
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: VibeFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const component = mapVibeFieldTypeToSduiComponent(field.type);
  const strVal = value !== undefined && value !== null ? String(value) : "";

  switch (component) {
    case "text-input":
      return (
        <Input
          id={field.name}
          type={field.type === "url" ? "url" : field.type === "phone" ? "tel" : "text"}
          placeholder={field.label}
          required={field.required}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "email-input":
      return (
        <Input
          id={field.name}
          type="email"
          placeholder={field.label}
          required={field.required}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number-input":
      return (
        <Input
          id={field.name}
          type="number"
          placeholder={field.label}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
          value={strVal}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );

    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={field.name}
            checked={!!value}
            onCheckedChange={(checked) => onChange(!!checked)}
          />
          <Label htmlFor={field.name} className="font-normal">
            {field.label}
          </Label>
        </div>
      );

    case "date-picker":
      return (
        <Input
          id={field.name}
          type="date"
          required={field.required}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "datetime-picker":
      return (
        <Input
          id={field.name}
          type="datetime-local"
          required={field.required}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "select":
      return (
        <Select
          required={field.required}
          value={strVal || undefined}
          onValueChange={(v) => onChange(v)}
        >
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

    case "textarea":
      return (
        <Textarea
          id={field.name}
          placeholder={field.label}
          required={field.required}
          rows={4}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "fallback-text-input":
    default:
      return (
        <Input
          id={field.name}
          type="text"
          placeholder={field.label}
          required={field.required}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

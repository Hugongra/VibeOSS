/**
 * VibeOS Factory — Form Component
 *
 * Renders a dynamic form based on entity field definitions.
 * Each field type maps to an appropriate input control.
 */

import type { VibeViewSchema, VibeEntitySchema, VibeFieldDefinition } from "@/lib/kernel/types";

interface VibeFormProps {
  view: VibeViewSchema;
  entity: VibeEntitySchema;
  data: Record<string, unknown>[];
}

export function VibeForm({ view, entity }: VibeFormProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <h3 className="mb-6 text-lg font-semibold text-[var(--foreground)]">
        {view.label}
      </h3>

      <form className="space-y-5">
        {entity.fields.map((field) => (
          <VibeFormField key={field.name} field={field} />
        ))}

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Save
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-transparent px-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function VibeFormField({ field }: { field: VibeFieldDefinition }) {
  const inputClasses =
    "w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <div>
      <label
        htmlFor={field.name}
        className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
      >
        {field.label}
        {field.required && (
          <span className="ml-1 text-[var(--destructive)]">*</span>
        )}
      </label>

      {field.description && (
        <p className="mb-1.5 text-xs text-[var(--muted-foreground)]">
          {field.description}
        </p>
      )}

      {renderInput(field, inputClasses)}
    </div>
  );
}

function renderInput(field: VibeFieldDefinition, className: string) {
  switch (field.type) {
    case "text":
    case "email":
    case "url":
    case "phone":
      return (
        <input
          id={field.name}
          name={field.name}
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          placeholder={field.label}
          required={field.required}
          className={className}
        />
      );

    case "number":
    case "currency":
    case "percentage":
      return (
        <input
          id={field.name}
          name={field.name}
          type="number"
          placeholder={field.label}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
          className={className}
        />
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <input
            id={field.name}
            name={field.name}
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--input)] bg-[var(--background)]"
          />
          <span className="text-sm text-[var(--muted-foreground)]">
            {field.label}
          </span>
        </div>
      );

    case "date":
    case "datetime":
      return (
        <input
          id={field.name}
          name={field.name}
          type={field.type === "datetime" ? "datetime-local" : "date"}
          required={field.required}
          className={className}
        />
      );

    case "select":
      return (
        <select
          id={field.name}
          name={field.name}
          required={field.required}
          className={className}
        >
          <option value="">Select {field.label}...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "rich-text":
      return (
        <textarea
          id={field.name}
          name={field.name}
          placeholder={field.label}
          required={field.required}
          rows={4}
          className={className}
        />
      );

    default:
      return (
        <input
          id={field.name}
          name={field.name}
          type="text"
          placeholder={field.label}
          required={field.required}
          className={className}
        />
      );
  }
}

import type { VibeFieldType } from "@shared/types";

/** SDUI widget kinds used by the form renderer and VEEF URC checks */
export type SduiComponentKind =
  | "text-input"
  | "email-input"
  | "number-input"
  | "date-picker"
  | "datetime-picker"
  | "select"
  | "checkbox"
  | "textarea"
  | "fallback-text-input";

/**
 * Maps a Vibe field type to the SDUI component used in form views.
 * Thesis mapping: String→text, Enum→select, Currency→number, Date→date-picker.
 */
export function mapVibeFieldTypeToSduiComponent(
  fieldType: VibeFieldType
): SduiComponentKind {
  switch (fieldType) {
    case "text":
    case "url":
    case "phone":
    case "json":
    case "file":
      return "text-input";
    case "email":
      return "email-input";
    case "number":
    case "currency":
    case "percentage":
      return "number-input";
    case "date":
      return "date-picker";
    case "datetime":
      return "datetime-picker";
    case "select":
    case "multi-select":
      return "select";
    case "boolean":
      return "checkbox";
    case "rich-text":
      return "textarea";
    case "relation":
    default:
      return "fallback-text-input";
  }
}

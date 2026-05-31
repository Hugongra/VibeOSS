import { describe, expect, it } from "vitest";
import type { VibeEntitySchema } from "@shared/types";
import {
  rejectUnknownFields,
  validateEntityRecord,
} from "../record-validator";

const CONTACT_ENTITY: VibeEntitySchema = {
  name: "contact",
  label: "Contact",
  pluralLabel: "Contacts",
  description: "CRM contact",
  timestamps: true,
  softDelete: true,
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: false,
      options: ["New", "Active"],
    },
    { name: "revenue", label: "Revenue", type: "currency", required: false },
  ],
};

describe("record-validator", () => {
  it("accepts valid create payload", () => {
    const result = validateEntityRecord(
      CONTACT_ENTITY,
      { name: "Alice", email: "alice@example.com", status: "New" },
      "create"
    );
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields on create", () => {
    const result = validateEntityRecord(CONTACT_ENTITY, { name: "Alice" }, "create");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes("email"))).toBe(true);
    }
  });

  it("rejects invalid select option", () => {
    const result = validateEntityRecord(
      CONTACT_ENTITY,
      { name: "Bob", email: "bob@example.com", status: "Invalid" },
      "create"
    );
    expect(result.success).toBe(false);
  });

  it("allows partial update payload", () => {
    const result = validateEntityRecord(
      CONTACT_ENTITY,
      { status: "Active" },
      "update"
    );
    expect(result.success).toBe(true);
  });

  it("flags unknown fields", () => {
    const unknown = rejectUnknownFields(CONTACT_ENTITY, {
      name: "Alice",
      foo: "bar",
    });
    expect(unknown).toEqual(["foo"]);
  });
});

/**
 * VEEF — Constraint Enforcement (CE)
 * Validates record mutations against declarative business rules from schema metadata.
 */

export interface FieldConstraintRule {
  id: string;
  entity: string;
  /** When the effective value of this field equals `whenValue` after the patch… */
  whenField: string;
  whenValue: string;
  /** …then `requireField` must be present and (optionally) a positive number */
  requireField: string;
  requirePositiveNumber?: boolean;
}

export interface ConstraintValidationResult {
  valid: boolean;
  errors: string[];
}

function effectiveValue(
  record: Record<string, unknown>,
  patch: Record<string, unknown>,
  field: string
): unknown {
  return field in patch ? patch[field] : record[field];
}

/**
 * Apply CE rules to a proposed create/update patch.
 */
export function validateRecordMutation(
  entityName: string,
  record: Record<string, unknown>,
  patch: Record<string, unknown>,
  rules: FieldConstraintRule[]
): ConstraintValidationResult {
  const errors: string[] = [];
  const entityRules = rules.filter((r) => r.entity === entityName);

  for (const rule of entityRules) {
    const whenVal = effectiveValue(record, patch, rule.whenField);
    if (whenVal !== rule.whenValue) continue;

    const requiredVal = effectiveValue(record, patch, rule.requireField);
    if (requiredVal === null || requiredVal === undefined || requiredVal === "") {
      errors.push(
        `${rule.id}: ${rule.whenField}="${rule.whenValue}" requires ${rule.requireField} to be set`
      );
      continue;
    }

    if (rule.requirePositiveNumber) {
      const num = Number(requiredVal);
      if (Number.isNaN(num) || num <= 0) {
        errors.push(
          `${rule.id}: ${rule.whenField}="${rule.whenValue}" requires ${rule.requireField} > 0`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

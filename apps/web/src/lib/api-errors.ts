/**
 * Parses the server constraint-violation error response shape:
 * { violations: [{ propertyPath: string, detail: string }] }
 *
 * Returns a map of { fieldName -> errorMessage } and a fallback general message.
 */
export interface ApiViolation {
  propertyPath: string;
  detail: string;
}

export interface ApiErrorResponse {
  detail?: string;
  violations?: ApiViolation[];
}

export interface ParsedApiError {
  /** field -> message map, e.g. { emailId: "must not be empty" } */
  fieldErrors: Record<string, string>;
  /** top-level message when no violations or as fallback */
  general: string | null;
}

export function parseApiError(err: unknown): ParsedApiError {
  const data = (err as { response?: { data?: ApiErrorResponse } })?.response?.data;

  if (!data) {
    return { fieldErrors: {}, general: 'An unexpected error occurred. Please try again.' };
  }

  const fieldErrors: Record<string, string> = {};

  if (data.violations && data.violations.length > 0) {
    for (const v of data.violations) {
      if (v.propertyPath) {
        // Use the last segment of the path (e.g. "user.emailId" -> "emailId")
        const key = v.propertyPath.split('.').pop() ?? v.propertyPath;
        fieldErrors[key] = v.detail;
      }
    }
  }

  const general =
    Object.keys(fieldErrors).length === 0
      ? (data.detail ?? 'An unexpected error occurred. Please try again.')
      : null;

  return { fieldErrors, general };
}

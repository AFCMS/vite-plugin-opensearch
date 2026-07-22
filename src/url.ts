/**
 * Resolves an OpenSearch URL value while preserving template placeholders.
 */
export function resolveOpenSearchURL(value: string, baseURL: URL, label: string): string {
  try {
    return new URL(value, baseURL).href;
  } catch {
    throw new Error(`${label} must be a valid absolute or relative URL.`);
  }
}

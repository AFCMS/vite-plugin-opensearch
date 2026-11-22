/**
 * Resolves an ordinary URL value against the configured base URL.
 */
export function resolveOpenSearchURL(value: string, baseURL: URL, label: string): string {
  try {
    return new URL(value, baseURL).href;
  } catch {
    throw new Error(`${label} must be a valid absolute or relative URL.`);
  }
}

/**
 * Resolves a validated OpenSearch URL template while preserving its parameters.
 */
export function resolveOpenSearchTemplate(value: string, baseURL: URL, label: string): string {
  const parameters: string[] = [];
  // Account for the ASCII whitespace that URL parsing removes, and reserve a
  // marker prefix absent from both the template and any inherited URL text.
  const urlText = `${value}\n${baseURL.href}`.replace(/[\t\n\r]/gu, "").toLowerCase();
  let markerPrefix = "%7bopensearch";
  while (urlText.includes(markerPrefix)) {
    markerPrefix += "x";
  }

  // Escaped braces keep markers intact during URL parsing without treating an
  // optional parameter's question mark as the start of a query string.
  const maskedValue = value.replace(/\{[^{}]+\}/gu, (parameter: string): string => {
    const marker = `${markerPrefix}${parameters.length}%7d`;
    parameters.push(parameter);
    return marker;
  });
  let resolved = resolveOpenSearchURL(maskedValue, baseURL, label);

  for (const [index, parameter] of parameters.entries()) {
    resolved = resolved.replaceAll(`${markerPrefix}${index}%7d`, parameter);
  }
  return resolved;
}

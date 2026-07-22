/**
 * Escapes a value for use as XML element text while keeping output on one line.
 */
export function escapeXMLText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\t", "&#x9;")
    .replaceAll("\n", "&#xA;")
    .replaceAll("\r", "&#xD;");
}

/**
 * Escapes a value for use in a double-quoted XML attribute.
 */
export function escapeXMLAttribute(value: string): string {
  return escapeXMLText(value).replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

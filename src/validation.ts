import type {
  OpenSearchDescription,
  OpenSearchImage,
  OpenSearchPluginOptions,
  OpenSearchQuery,
  OpenSearchURL,
} from "./types";
import { resolveOpenSearchURL } from "./url";

const MIME_TYPE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/u;
const LANGUAGE_PATTERN =
  /^(?:\*|[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*|[iIxX](?:-[A-Za-z0-9]{1,8})+)$/u;
const ENCODING_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/u;
const TEMPLATE_PARAMETER_PATTERN = /\{([^{}]+)\}/gu;
const TEMPLATE_BRACE_PATTERN = /[{}]/u;

const URL_RELATIONS: ReadonlySet<string> = new Set<string>([
  "results",
  "suggestions",
  "self",
  "collection",
]);
const QUERY_ROLES: ReadonlySet<string> = new Set<string>([
  "request",
  "example",
  "related",
  "correction",
  "subset",
  "superset",
]);
const SYNDICATION_RIGHTS: ReadonlySet<string> = new Set<string>([
  "open",
  "limited",
  "private",
  "closed",
]);
const TEMPLATE_PARAMETERS: ReadonlySet<string> = new Set<string>([
  "searchTerms",
  "count",
  "startIndex",
  "startPage",
  "language",
  "inputEncoding",
  "outputEncoding",
]);

function fail(message: string): never {
  throw new Error(`[vite-plugin-opensearch] ${message}`);
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string.`);
  }

  validateXMLCharacters(value, label);
}

function countCharacters(value: string): number {
  return Array.from(value).length;
}

function assertText(value: unknown, label: string, maximumLength?: number): void {
  assertNonEmptyString(value, label);

  if (maximumLength !== undefined && countCharacters(value) > maximumLength) {
    fail(`${label} must contain no more than ${maximumLength} characters.`);
  }
}

function validateXMLCharacters(value: string, label: string): void {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    const isValid =
      codePoint !== undefined &&
      (codePoint === 0x9 ||
        codePoint === 0xa ||
        codePoint === 0xd ||
        (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
        (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
        (codePoint >= 0x10000 && codePoint <= 0x10ffff));

    if (!isValid) {
      fail(`${label} contains a character that is not valid in XML 1.0.`);
    }
  }
}

function validateMIMEType(value: unknown, label: string): void {
  assertNonEmptyString(value, label);
  if (!MIME_TYPE_PATTERN.test(value)) {
    fail(`${label} must be a valid MIME type without parameters.`);
  }
}

function validateLanguage(value: unknown, label: string): void {
  assertNonEmptyString(value, label);
  if (!LANGUAGE_PATTERN.test(value)) {
    fail(`${label} must be a BCP 47 language tag or "*".`);
  }
}

function validateEncoding(value: unknown, label: string): void {
  assertNonEmptyString(value, label);
  if (!ENCODING_PATTERN.test(value)) {
    fail(`${label} must be a valid XML encoding name.`);
  }
}

function validateInteger(value: unknown, label: string, nonNegative: boolean): void {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(`${label} must be an integer.`);
  }
  if (nonNegative && value < 0) {
    fail(`${label} must be non-negative.`);
  }
}

function validateFileName(value: unknown, label: string): void {
  assertNonEmptyString(value, label);

  if (value.startsWith("/") || /^[A-Za-z]:/u.test(value) || value.includes("\\")) {
    fail(`${label} must be a relative POSIX-style output path.`);
  }

  const segments = value.split("/");
  for (const segment of segments) {
    if (segment.length === 0 || segment === "." || segment === "..") {
      fail(`${label} must not contain empty, ".", or ".." path segments.`);
    }
  }
}

function validateTemplateParameters(value: string, label: string): void {
  for (const match of value.matchAll(TEMPLATE_PARAMETER_PATTERN)) {
    const rawParameter = match[1];
    if (rawParameter === undefined) {
      fail(`${label} contains an invalid OpenSearch template parameter.`);
    }

    const parameter = rawParameter.endsWith("?") ? rawParameter.slice(0, -1) : rawParameter;
    if (!TEMPLATE_PARAMETERS.has(parameter)) {
      fail(`${label} contains unsupported template parameter "${rawParameter}".`);
    }
  }

  const unmatchedTemplateText = value.replace(TEMPLATE_PARAMETER_PATTERN, "");
  if (TEMPLATE_BRACE_PATTERN.test(unmatchedTemplateText)) {
    fail(`${label} contains an invalid OpenSearch template parameter.`);
  }
}

function validateURL(url: OpenSearchURL, index: number, baseURL: URL, prefix: string): void {
  const label = `${prefix}.urls[${index}]`;
  if (url === null || typeof url !== "object") {
    fail(`${label} must be an object.`);
  }

  assertNonEmptyString(url.template, `${label}.template`);
  validateTemplateParameters(url.template, `${label}.template`);
  resolveOpenSearchURL(url.template, baseURL, `${label}.template`);
  validateMIMEType(url.type, `${label}.type`);

  if (url.rel !== undefined) {
    if (!Array.isArray(url.rel) || url.rel.length === 0) {
      fail(`${label}.rel must contain at least one relationship.`);
    }
    for (const relation of url.rel) {
      assertNonEmptyString(relation, `${label}.rel`);
      if (!URL_RELATIONS.has(relation)) {
        fail(`${label}.rel contains unsupported relationship "${relation}".`);
      }
    }
  }

  if (url.indexOffset !== undefined) {
    validateInteger(url.indexOffset, `${label}.indexOffset`, false);
  }
  if (url.pageOffset !== undefined) {
    validateInteger(url.pageOffset, `${label}.pageOffset`, false);
  }
}

function validateImage(image: OpenSearchImage, index: number, baseURL: URL, prefix: string): void {
  const label = `${prefix}.images[${index}]`;
  if (image === null || typeof image !== "object") {
    fail(`${label} must be an object.`);
  }

  assertNonEmptyString(image.url, `${label}.url`);
  resolveOpenSearchURL(image.url, baseURL, `${label}.url`);
  if (image.height !== undefined) {
    validateInteger(image.height, `${label}.height`, true);
  }
  if (image.width !== undefined) {
    validateInteger(image.width, `${label}.width`, true);
  }
  if (image.type !== undefined) {
    validateMIMEType(image.type, `${label}.type`);
  }
}

function validateQuery(query: OpenSearchQuery, index: number, prefix: string): void {
  const label = `${prefix}.queries[${index}]`;
  if (query === null || typeof query !== "object") {
    fail(`${label} must be an object.`);
  }

  assertNonEmptyString(query.role, `${label}.role`);
  if (!QUERY_ROLES.has(query.role)) {
    fail(`${label}.role contains unsupported role "${query.role}".`);
  }
  if (query.title !== undefined) {
    assertText(query.title, `${label}.title`, 256);
  }
  if (query.totalResults !== undefined) {
    validateInteger(query.totalResults, `${label}.totalResults`, true);
  }
  if (query.searchTerms !== undefined) {
    assertText(query.searchTerms, `${label}.searchTerms`);
  }
  if (query.count !== undefined) {
    validateInteger(query.count, `${label}.count`, true);
  }
  if (query.startIndex !== undefined) {
    validateInteger(query.startIndex, `${label}.startIndex`, false);
  }
  if (query.startPage !== undefined) {
    validateInteger(query.startPage, `${label}.startPage`, false);
  }
  if (query.language !== undefined) {
    validateLanguage(query.language, `${label}.language`);
  }
  if (query.inputEncoding !== undefined) {
    validateEncoding(query.inputEncoding, `${label}.inputEncoding`);
  }
  if (query.outputEncoding !== undefined) {
    validateEncoding(query.outputEncoding, `${label}.outputEncoding`);
  }
}

function validateStringArray(
  value: unknown,
  label: string,
  validator: (entry: unknown, entryLabel: string) => void,
): void {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must contain at least one value.`);
  }
  for (let index = 0; index < value.length; index += 1) {
    validator(value[index], `${label}[${index}]`);
  }
}

function validateDescription(
  description: OpenSearchDescription,
  index: number,
  baseURL: URL,
): void {
  const prefix = `descriptions[${index}]`;
  if (description === null || typeof description !== "object") {
    fail(`${prefix} must be an object.`);
  }

  validateFileName(description.fileName, `${prefix}.fileName`);
  assertText(description.shortName, `${prefix}.shortName`, 16);
  assertText(description.description, `${prefix}.description`, 1024);

  if (!Array.isArray(description.urls) || description.urls.length === 0) {
    fail(`${prefix}.urls must contain at least one URL.`);
  }
  for (let urlIndex = 0; urlIndex < description.urls.length; urlIndex += 1) {
    validateURL(description.urls[urlIndex]!, urlIndex, baseURL, prefix);
  }

  if (description.contact !== undefined) {
    assertText(description.contact, `${prefix}.contact`);
  }
  if (description.tags !== undefined) {
    validateStringArray(description.tags, `${prefix}.tags`, assertNonEmptyString);
    for (const tag of description.tags) {
      if (/\s/u.test(tag)) {
        fail(`${prefix}.tags entries must be single words without whitespace.`);
      }
    }
    if (countCharacters(description.tags.join(" ")) > 256) {
      fail(`${prefix}.tags must contain no more than 256 characters when joined.`);
    }
  }
  if (description.longName !== undefined) {
    assertText(description.longName, `${prefix}.longName`, 48);
  }
  if (description.images !== undefined) {
    if (!Array.isArray(description.images)) {
      fail(`${prefix}.images must be an array.`);
    }
    for (let imageIndex = 0; imageIndex < description.images.length; imageIndex += 1) {
      validateImage(description.images[imageIndex]!, imageIndex, baseURL, prefix);
    }
  }
  if (description.queries !== undefined) {
    if (!Array.isArray(description.queries)) {
      fail(`${prefix}.queries must be an array.`);
    }
    for (let queryIndex = 0; queryIndex < description.queries.length; queryIndex += 1) {
      validateQuery(description.queries[queryIndex]!, queryIndex, prefix);
    }
  }
  if (description.developer !== undefined) {
    assertText(description.developer, `${prefix}.developer`, 64);
  }
  if (description.attribution !== undefined) {
    assertText(description.attribution, `${prefix}.attribution`, 256);
  }
  if (description.syndicationRight !== undefined) {
    assertNonEmptyString(description.syndicationRight, `${prefix}.syndicationRight`);
    if (!SYNDICATION_RIGHTS.has(description.syndicationRight)) {
      fail(`${prefix}.syndicationRight is not supported.`);
    }
  }
  if (description.adultContent !== undefined && typeof description.adultContent !== "boolean") {
    fail(`${prefix}.adultContent must be a boolean.`);
  }
  if (description.languages !== undefined) {
    validateStringArray(description.languages, `${prefix}.languages`, validateLanguage);
  }
  if (description.inputEncodings !== undefined) {
    validateStringArray(description.inputEncodings, `${prefix}.inputEncodings`, validateEncoding);
  }
  if (description.outputEncodings !== undefined) {
    validateStringArray(description.outputEncodings, `${prefix}.outputEncodings`, validateEncoding);
  }
}

/**
 * Validates plugin options and returns the parsed base URL.
 */
export function validatePluginOptions(options: OpenSearchPluginOptions): URL {
  if (options === null || typeof options !== "object") {
    fail("Plugin options must be an object.");
  }
  assertNonEmptyString(options.baseURL, "baseURL");

  let baseURL: URL;
  try {
    baseURL = new URL(options.baseURL);
  } catch {
    fail("baseURL must be an absolute HTTP(S) URL.");
  }
  if (baseURL.protocol !== "http:" && baseURL.protocol !== "https:") {
    fail("baseURL must use the HTTP or HTTPS protocol.");
  }

  if (!Array.isArray(options.descriptions) || options.descriptions.length === 0) {
    fail("descriptions must contain at least one OpenSearch description.");
  }

  const fileNames = new Set<string>();
  for (let index = 0; index < options.descriptions.length; index += 1) {
    const description = options.descriptions[index]!;
    validateDescription(description, index, baseURL);
    if (fileNames.has(description.fileName)) {
      fail(`descriptions must use unique fileName values; "${description.fileName}" is repeated.`);
    }
    fileNames.add(description.fileName);
  }

  return baseURL;
}

/**
 * Returns browser-compatibility warnings for validated descriptions.
 */
export function getBrowserCompatibilityWarnings(
  descriptions: readonly OpenSearchDescription[],
): readonly string[] {
  const warnings: string[] = [];

  for (const description of descriptions) {
    let hasHTMLResultsURL = false;
    for (const url of description.urls) {
      const representsResults = url.rel === undefined || url.rel.includes("results");
      if (representsResults && url.type.toLowerCase() === "text/html") {
        hasHTMLResultsURL = true;
        break;
      }
    }

    if (!hasHTMLResultsURL) {
      warnings.push(
        `OpenSearch description "${description.fileName}" has no results URL with type "text/html"; common browsers may reject it.`,
      );
    }
  }

  return warnings;
}

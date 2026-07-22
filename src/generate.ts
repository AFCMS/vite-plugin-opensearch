import type {
  OpenSearchDescription,
  OpenSearchImage,
  OpenSearchQuery,
  OpenSearchURL,
} from "./types";
import { resolveOpenSearchURL } from "./url";
import { escapeXMLAttribute, escapeXMLText } from "./xml";

interface XMLAttribute {
  readonly name: string;
  readonly value: string;
}

function formatAttributes(attributes: readonly XMLAttribute[]): string {
  let output = "";
  for (const attribute of attributes) {
    output += ` ${attribute.name}="${escapeXMLAttribute(attribute.value)}"`;
  }
  return output;
}

function textElement(name: string, value: string): string {
  return `  <${name}>${escapeXMLText(value)}</${name}>`;
}

function emptyElement(name: string, attributes: readonly XMLAttribute[]): string {
  return `  <${name}${formatAttributes(attributes)} />`;
}

function serializeURL(url: OpenSearchURL, index: number, baseURL: URL): string {
  const attributes: XMLAttribute[] = [{ name: "type", value: url.type }];
  if (url.rel !== undefined) {
    attributes.push({ name: "rel", value: url.rel.join(" ") });
  }
  if (url.indexOffset !== undefined) {
    attributes.push({ name: "indexOffset", value: String(url.indexOffset) });
  }
  if (url.pageOffset !== undefined) {
    attributes.push({ name: "pageOffset", value: String(url.pageOffset) });
  }
  attributes.push({
    name: "template",
    value: resolveOpenSearchURL(url.template, baseURL, `urls[${index}].template`),
  });
  return emptyElement("Url", attributes);
}

function serializeImage(image: OpenSearchImage, index: number, baseURL: URL): string {
  const attributes: XMLAttribute[] = [];
  if (image.height !== undefined) {
    attributes.push({ name: "height", value: String(image.height) });
  }
  if (image.width !== undefined) {
    attributes.push({ name: "width", value: String(image.width) });
  }
  if (image.type !== undefined) {
    attributes.push({ name: "type", value: image.type });
  }
  const imageURL = resolveOpenSearchURL(image.url, baseURL, `images[${index}].url`);
  return `  <Image${formatAttributes(attributes)}>${escapeXMLText(imageURL)}</Image>`;
}

function serializeQuery(query: OpenSearchQuery): string {
  const attributes: XMLAttribute[] = [{ name: "role", value: query.role }];
  if (query.title !== undefined) {
    attributes.push({ name: "title", value: query.title });
  }
  if (query.totalResults !== undefined) {
    attributes.push({ name: "totalResults", value: String(query.totalResults) });
  }
  if (query.searchTerms !== undefined) {
    attributes.push({ name: "searchTerms", value: query.searchTerms });
  }
  if (query.count !== undefined) {
    attributes.push({ name: "count", value: String(query.count) });
  }
  if (query.startIndex !== undefined) {
    attributes.push({ name: "startIndex", value: String(query.startIndex) });
  }
  if (query.startPage !== undefined) {
    attributes.push({ name: "startPage", value: String(query.startPage) });
  }
  if (query.language !== undefined) {
    attributes.push({ name: "language", value: query.language });
  }
  if (query.inputEncoding !== undefined) {
    attributes.push({ name: "inputEncoding", value: query.inputEncoding });
  }
  if (query.outputEncoding !== undefined) {
    attributes.push({ name: "outputEncoding", value: query.outputEncoding });
  }
  return emptyElement("Query", attributes);
}

/**
 * Generates one deterministic OpenSearch 1.1 description document.
 */
export function generateOpenSearchDescription(
  description: OpenSearchDescription,
  baseURL: URL,
): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">',
    textElement("ShortName", description.shortName),
    textElement("Description", description.description),
  ];

  for (let index = 0; index < description.urls.length; index += 1) {
    lines.push(serializeURL(description.urls[index]!, index, baseURL));
  }
  if (description.contact !== undefined) {
    lines.push(textElement("Contact", description.contact));
  }
  if (description.tags !== undefined) {
    lines.push(textElement("Tags", description.tags.join(" ")));
  }
  if (description.longName !== undefined) {
    lines.push(textElement("LongName", description.longName));
  }
  if (description.images !== undefined) {
    for (let index = 0; index < description.images.length; index += 1) {
      lines.push(serializeImage(description.images[index]!, index, baseURL));
    }
  }
  if (description.queries !== undefined) {
    for (const query of description.queries) {
      lines.push(serializeQuery(query));
    }
  }
  if (description.developer !== undefined) {
    lines.push(textElement("Developer", description.developer));
  }
  if (description.attribution !== undefined) {
    lines.push(textElement("Attribution", description.attribution));
  }
  if (description.syndicationRight !== undefined) {
    lines.push(textElement("SyndicationRight", description.syndicationRight));
  }
  if (description.adultContent !== undefined) {
    lines.push(textElement("AdultContent", String(description.adultContent)));
  }
  if (description.languages !== undefined) {
    for (const language of description.languages) {
      lines.push(textElement("Language", language));
    }
  }
  if (description.outputEncodings !== undefined) {
    for (const encoding of description.outputEncodings) {
      lines.push(textElement("OutputEncoding", encoding));
    }
  }
  if (description.inputEncodings !== undefined) {
    for (const encoding of description.inputEncodings) {
      lines.push(textElement("InputEncoding", encoding));
    }
  }

  lines.push("</OpenSearchDescription>");
  return `${lines.join("\n")}\n`;
}

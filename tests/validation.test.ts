import { describe, expect, test } from "vitest";

import type { OpenSearchDescription, OpenSearchPluginOptions } from "../src/types";
import { getBrowserCompatibilityWarnings, validatePluginOptions } from "../src/validation";

function createDescription(overrides: Partial<OpenSearchDescription> = {}): OpenSearchDescription {
  return {
    fileName: "opensearch.xml",
    shortName: "Site Search",
    description: "Search this site.",
    urls: [{ type: "text/html", template: "/search?q={searchTerms}" }],
    ...overrides,
  };
}

function createOptions(overrides: Partial<OpenSearchPluginOptions> = {}): OpenSearchPluginOptions {
  return {
    baseURL: "https://example.com/app/",
    descriptions: [createDescription()],
    ...overrides,
  };
}

interface InvalidCase {
  readonly name: string;
  readonly options: OpenSearchPluginOptions;
  readonly message: RegExp;
}

const INVALID_CASES: readonly InvalidCase[] = [
  {
    name: "relative base URL",
    options: createOptions({ baseURL: "/relative" }),
    message: /baseURL must be an absolute HTTP\(S\) URL/u,
  },
  {
    name: "non-HTTP base URL",
    options: createOptions({ baseURL: "ftp://example.com/" }),
    message: /baseURL must use the HTTP or HTTPS protocol/u,
  },
  {
    name: "empty description list",
    options: createOptions({ descriptions: [] }),
    message: /descriptions must contain at least one/u,
  },
  {
    name: "unsafe output path",
    options: createOptions({ descriptions: [createDescription({ fileName: "../search.xml" })] }),
    message: /must not contain empty, "\.", or "\.\." path segments/u,
  },
  {
    name: "absolute output path",
    options: createOptions({ descriptions: [createDescription({ fileName: "/search.xml" })] }),
    message: /relative POSIX-style output path/u,
  },
  {
    name: "duplicate output path",
    options: createOptions({
      descriptions: [createDescription(), createDescription()],
    }),
    message: /must use unique fileName values/u,
  },
  {
    name: "missing URL",
    options: createOptions({ descriptions: [createDescription({ urls: [] })] }),
    message: /urls must contain at least one URL/u,
  },
  {
    name: "overlong short name",
    options: createOptions({
      descriptions: [createDescription({ shortName: "12345678901234567" })],
    }),
    message: /shortName must contain no more than 16 characters/u,
  },
  {
    name: "invalid MIME type",
    options: createOptions({
      descriptions: [createDescription({ urls: [{ type: "not a mime", template: "/search" }] })],
    }),
    message: /type must be a valid MIME type/u,
  },
  {
    name: "unknown URL relationship",
    options: createOptions({
      descriptions: [
        createDescription({
          urls: [
            {
              type: "text/html",
              template: "/search",
              rel: ["unknown" as never],
            },
          ],
        }),
      ],
    }),
    message: /unsupported relationship "unknown"/u,
  },
  {
    name: "invalid XML character",
    options: createOptions({ descriptions: [createDescription({ description: "bad\u0000" })] }),
    message: /not valid in XML 1\.0/u,
  },
  {
    name: "negative image dimension",
    options: createOptions({
      descriptions: [createDescription({ images: [{ url: "/icon.png", width: -1 }] })],
    }),
    message: /width must be non-negative/u,
  },
  {
    name: "fractional URL offset",
    options: createOptions({
      descriptions: [
        createDescription({
          urls: [{ type: "text/html", template: "/search", indexOffset: 1.5 }],
        }),
      ],
    }),
    message: /indexOffset must be an integer/u,
  },
  {
    name: "invalid language",
    options: createOptions({ descriptions: [createDescription({ languages: ["en--US"] })] }),
    message: /BCP 47 language tag/u,
  },
  {
    name: "invalid encoding",
    options: createOptions({
      descriptions: [createDescription({ inputEncodings: ["8 bit"] })],
    }),
    message: /valid XML encoding name/u,
  },
  {
    name: "extension template parameter",
    options: createOptions({
      descriptions: [
        createDescription({
          urls: [
            {
              type: "text/html",
              template: "/search?color={custom:color?}",
            },
          ],
        }),
      ],
    }),
    message: /unsupported template parameter "custom:color\?"/u,
  },
  {
    name: "malformed template parameter",
    options: createOptions({
      descriptions: [
        createDescription({
          urls: [{ type: "text/html", template: "/search?q={searchTerms" }],
        }),
      ],
    }),
    message: /invalid OpenSearch template parameter/u,
  },
  {
    name: "multi-word tag entry",
    options: createOptions({
      descriptions: [createDescription({ tags: ["site search"] })],
    }),
    message: /tags entries must be single words/u,
  },
];

describe("validatePluginOptions", (): void => {
  test("accepts code-point length limits and valid optional fields", (): void => {
    const options = createOptions({
      descriptions: [
        createDescription({
          shortName: "😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀",
          images: [{ url: "data:image/png;base64,AA==", width: 0, height: 0 }],
          languages: ["en-US", "*"],
          inputEncodings: ["UTF-8"],
          outputEncodings: ["UTF-8"],
        }),
      ],
    });

    expect(validatePluginOptions(options).href).toBe("https://example.com/app/");
  });

  test.each(INVALID_CASES)("rejects $name", ({ options, message }): void => {
    expect((): URL => validatePluginOptions(options)).toThrow(message);
  });
});

describe("getBrowserCompatibilityWarnings", (): void => {
  test("warns only when a description has no HTML results URL", (): void => {
    const compatible = createDescription();
    const incompatible = createDescription({
      fileName: "feed.xml",
      urls: [
        {
          type: "application/rss+xml",
          rel: ["results"],
          template: "/feed?q={searchTerms}",
        },
        {
          type: "text/html",
          rel: ["collection"],
          template: "/collection",
        },
      ],
    });

    expect(getBrowserCompatibilityWarnings([compatible])).toEqual([]);
    expect(getBrowserCompatibilityWarnings([compatible, incompatible])).toEqual([
      'OpenSearch description "feed.xml" has no results URL with type "text/html"; common browsers may reject it.',
    ]);
  });
});

import { describe, expect, test } from "vitest";

import { generateOpenSearchDescription } from "../src/generate.ts";
import type { OpenSearchDescription } from "../src/types.ts";
import { validatePluginOptions } from "../src/validation.ts";
import { escapeXMLAttribute, escapeXMLText } from "../src/xml.ts";

describe("generateOpenSearchDescription", (): void => {
  test("generates a minimal description and resolves its URL template", (): void => {
    const description: OpenSearchDescription = {
      fileName: "opensearch.xml",
      shortName: "Site Search",
      description: "Search the site.",
      urls: [
        {
          type: "text/html",
          template: "/search?q={searchTerms}&page={startPage?}",
        },
      ],
    };
    const baseURL = validatePluginOptions({
      baseURL: "https://example.com/docs/",
      descriptions: [description],
    });

    expect(generateOpenSearchDescription(description, baseURL))
      .toBe(`<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Site Search</ShortName>
  <Description>Search the site.</Description>
  <Url type="text/html" template="https://example.com/search?q={searchTerms}&amp;page={startPage?}" />
</OpenSearchDescription>
`);
  });

  test.each([
    {
      name: "root-relative path placeholders",
      template: "/search/{searchTerms}/page/{startPage?}",
      baseURL: "https://example.com/docs/",
      expected: "https://example.com/search/{searchTerms}/page/{startPage?}",
    },
    {
      name: "relative path placeholders",
      template: "search/{searchTerms}/page/{startPage?}",
      baseURL: "https://example.com/docs/",
      expected: "https://example.com/docs/search/{searchTerms}/page/{startPage?}",
    },
    {
      name: "absolute path placeholders",
      template: "https://other.example/search/{searchTerms}/page/{startPage?}",
      baseURL: "https://example.com/docs/",
      expected: "https://other.example/search/{searchTerms}/page/{startPage?}",
    },
    {
      name: "optional path placeholders before a query string and fragment",
      template: "/{startPage?}/search/{searchTerms}?lang={language?}&count={count?}#results",
      baseURL: "https://example.com/",
      expected:
        "https://example.com/{startPage?}/search/{searchTerms}?lang={language?}&amp;count={count?}#results",
    },
    {
      name: "path normalization after an optional placeholder",
      template: "/{startPage?}/discard/../{searchTerms}",
      baseURL: "https://example.com/",
      expected: "https://example.com/{startPage?}/{searchTerms}",
    },
    {
      name: "repeated placeholders",
      template: "/{searchTerms}/{searchTerms}?page={startPage?}",
      baseURL: "https://example.com/",
      expected: "https://example.com/{searchTerms}/{searchTerms}?page={startPage?}",
    },
    {
      name: "literal percent-encoded braces and slashes",
      template: "/%7BsearchTerms%7D/%7bstartPage%3f%7d/a%2Fb/{searchTerms}",
      baseURL: "https://example.com/",
      expected: "https://example.com/%7BsearchTerms%7D/%7bstartPage%3f%7d/a%2Fb/{searchTerms}",
    },
    {
      name: "normal encoding of spaces and Unicode",
      template: "/café menu/{searchTerms}",
      baseURL: "https://example.com/",
      expected: "https://example.com/caf%C3%A9%20menu/{searchTerms}",
    },
    {
      name: "literal marker-like text in the template",
      template: "/%7bopensearch0%7d/{searchTerms}",
      baseURL: "https://example.com/",
      expected: "https://example.com/%7bopensearch0%7d/{searchTerms}",
    },
    {
      name: "literal marker-like text inherited from the base URL",
      template: "{searchTerms}",
      baseURL: "https://example.com/%7bopensearch0%7d/",
      expected: "https://example.com/%7bopensearch0%7d/{searchTerms}",
    },
    {
      name: "literal marker-like text after URL whitespace normalization",
      template: "/%7bopen\tsearch0%7d/{searchTerms}",
      baseURL: "https://example.com/",
      expected: "https://example.com/%7bopensearch0%7d/{searchTerms}",
    },
  ])("preserves $name", ({ template, baseURL, expected }): void => {
    const description: OpenSearchDescription = {
      fileName: "opensearch.xml",
      shortName: "Docs",
      description: "Search docs.",
      urls: [{ type: "text/html", template }],
    };
    const resolvedBaseURL = validatePluginOptions({ baseURL, descriptions: [description] });

    expect(generateOpenSearchDescription(description, resolvedBaseURL)).toContain(
      `template="${expected}"`,
    );
  });

  test("encodes literal image URL braces while preserving search placeholders", (): void => {
    const description: OpenSearchDescription = {
      fileName: "opensearch.xml",
      shortName: "Docs",
      description: "Search docs.",
      urls: [{ type: "text/html", template: "/search/{searchTerms}" }],
      images: [{ url: "/icons/{searchTerms}.png" }],
    };
    const baseURL = validatePluginOptions({
      baseURL: "https://example.com/",
      descriptions: [description],
    });
    const source = generateOpenSearchDescription(description, baseURL);

    expect(source).toContain('template="https://example.com/search/{searchTerms}"');
    expect(source).toContain("<Image>https://example.com/icons/%7BsearchTerms%7D.png</Image>");
  });

  test("generates every core description element in canonical order", (): void => {
    const description: OpenSearchDescription = {
      fileName: "search/catalog.xml",
      shortName: "Catalog & More",
      description: "Books < authors",
      urls: [
        {
          type: "text/html",
          rel: ["results"],
          indexOffset: 0,
          pageOffset: 1,
          template: "search?q={searchTerms}&page={startPage?}",
        },
        {
          type: "application/x-suggestions+json",
          rel: ["suggestions"],
          template: "https://suggest.example.test/?q={searchTerms}",
        },
      ],
      contact: "search@example.com",
      tags: ["books", "authors"],
      longName: "Example Catalog Search",
      images: [
        {
          url: "/favicon.ico",
          height: 16,
          width: 16,
          type: "image/x-icon",
        },
        { url: "data:image/png;base64,AA==" },
      ],
      queries: [
        {
          role: "example",
          title: 'Try "fiction"',
          totalResults: 12,
          searchTerms: "fiction & fantasy",
          count: 10,
          startIndex: 0,
          startPage: 1,
          language: "en-US",
          inputEncoding: "UTF-8",
          outputEncoding: "UTF-8",
        },
      ],
      developer: "Example Development",
      attribution: "Data & metadata by Example",
      syndicationRight: "limited",
      adultContent: false,
      languages: ["en-US", "*"],
      outputEncodings: ["UTF-8"],
      inputEncodings: ["UTF-8"],
    };
    const baseURL = validatePluginOptions({
      baseURL: "https://example.com/app/",
      descriptions: [description],
    });

    expect(generateOpenSearchDescription(description, baseURL))
      .toBe(`<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Catalog &amp; More</ShortName>
  <Description>Books &lt; authors</Description>
  <Url type="text/html" rel="results" indexOffset="0" pageOffset="1" template="https://example.com/app/search?q={searchTerms}&amp;page={startPage?}" />
  <Url type="application/x-suggestions+json" rel="suggestions" template="https://suggest.example.test/?q={searchTerms}" />
  <Contact>search@example.com</Contact>
  <Tags>books authors</Tags>
  <LongName>Example Catalog Search</LongName>
  <Image height="16" width="16" type="image/x-icon">https://example.com/favicon.ico</Image>
  <Image>data:image/png;base64,AA==</Image>
  <Query role="example" title="Try &quot;fiction&quot;" totalResults="12" searchTerms="fiction &amp; fantasy" count="10" startIndex="0" startPage="1" language="en-US" inputEncoding="UTF-8" outputEncoding="UTF-8" />
  <Developer>Example Development</Developer>
  <Attribution>Data &amp; metadata by Example</Attribution>
  <SyndicationRight>limited</SyndicationRight>
  <AdultContent>false</AdultContent>
  <Language>en-US</Language>
  <Language>*</Language>
  <OutputEncoding>UTF-8</OutputEncoding>
  <InputEncoding>UTF-8</InputEncoding>
</OpenSearchDescription>
`);
  });
});

describe("XML escaping", (): void => {
  test("escapes text and attributes without double escaping", (): void => {
    const value = `A & <tag> "quote" 'apostrophe'\t\n\r`;

    expect(escapeXMLText(value)).toBe(`A &amp; &lt;tag&gt; "quote" 'apostrophe'&#x9;&#xA;&#xD;`);
    expect(escapeXMLAttribute(value)).toBe(
      "A &amp; &lt;tag&gt; &quot;quote&quot; &apos;apostrophe&apos;&#x9;&#xA;&#xD;",
    );
  });
});

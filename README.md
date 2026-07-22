# @afcms/vite-plugin-opensearch

A build-only Vite plugin that generates browser-compatible
[OpenSearch 1.1](https://github.com/dewitt/opensearch/blob/master/opensearch-1-1-draft-6.md)
description documents.

This package implements the browser search protocol, not the OpenSearch search
server derived from Elasticsearch.

## Installation

```sh
pnpm add --save-dev @afcms/vite-plugin-opensearch
```

The package requires Vite 8.

## Basic usage

Add the plugin to `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import openSearch from "@afcms/vite-plugin-opensearch";

export default defineConfig({
  plugins: [
    openSearch({
      baseURL: "https://example.com/",
      descriptions: [
        {
          fileName: "opensearch.xml",
          shortName: "Example Search",
          description: "Search example.com.",
          urls: [
            {
              type: "text/html",
              template: "/search?q={searchTerms}",
            },
          ],
          images: [
            {
              url: "/favicon.ico",
              width: 16,
              height: 16,
              type: "image/x-icon",
            },
          ],
          inputEncodings: ["UTF-8"],
        },
      ],
    }),
  ],
});
```

The build emits `opensearch.xml` at the root of Vite's output directory. The
relative search and image URLs become `https://example.com/search?...` and
`https://example.com/favicon.ico` in the generated document.

## Multiple search engines

Every description has its own exact output path, so a domain can publish
multiple search engines:

```ts
openSearch({
  baseURL: "https://example.com/",
  descriptions: [
    {
      fileName: "search/articles.xml",
      shortName: "Articles",
      description: "Search articles.",
      urls: [
        {
          type: "text/html",
          template: "/articles?q={searchTerms}",
        },
      ],
    },
    {
      fileName: "search/people.xml",
      shortName: "People",
      description: "Search people.",
      urls: [
        {
          type: "text/html",
          template: "/people?q={searchTerms}",
        },
      ],
    },
  ],
});
```

This emits `search/articles.xml` and `search/people.xml`. Output paths must be
unique, relative POSIX paths and may use any file extension.

## URL resolution

`baseURL` must be an absolute HTTP or HTTPS URL. URL templates and image URLs
are resolved with the standard `URL` constructor:

- `/search` resolves from the origin root.
- `search` resolves relative to the path in `baseURL`.
- Absolute URLs remain absolute.
- `data:` image URLs remain `data:` URLs.

OpenSearch template placeholders such as `{searchTerms}` and `{startPage?}`
are preserved. Query-string ampersands and other XML-sensitive characters are
escaped in the emitted document.

## Optional OpenSearch fields

The typed API supports all core OpenSearch description fields: contact, tags,
long name, images, example queries, developer, attribution, syndication rights,
adult-content status, languages, and input/output encodings. Every public input
has JSDoc describing its limits and defaults.

The plugin rejects invalid OpenSearch data and unsafe output paths before it
emits any files. A valid description without a `text/html` results URL produces
a build warning because common browsers may reject it.

## Browser autodiscovery

The plugin generates description files but does not modify HTML. Add one link
for each engine to the page's `<head>`:

```html
<link
  rel="search"
  type="application/opensearchdescription+xml"
  title="Articles"
  href="https://example.com/search/articles.xml"
/>
<link
  rel="search"
  type="application/opensearchdescription+xml"
  title="People"
  href="https://example.com/search/people.xml"
/>
```

The link title should match the description's `shortName`.

Configure the production server or CDN to serve generated descriptions with
`Content-Type: application/opensearchdescription+xml`. The plugin only runs
during Vite builds; it does not add development-server routes.

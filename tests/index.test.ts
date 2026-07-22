import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { build } from "vite";
import { describe, expect, test, vi } from "vitest";

import openSearch from "../src";
import type { OpenSearchPluginOptions } from "../src";

describe("openSearch", (): void => {
  test("emits multiple assets at exact nested file names in a Vite build", async (): Promise<void> => {
    const root = await mkdtemp(join(tmpdir(), "vite-plugin-opensearch-"));
    await writeFile(join(root, "index.html"), "<!doctype html><title>Test</title>", "utf8");

    try {
      const result = await build({
        root,
        configFile: false,
        logLevel: "silent",
        plugins: [
          openSearch({
            baseURL: "https://example.com/",
            descriptions: [
              {
                fileName: "opensearch.xml",
                shortName: "Site Search",
                description: "Search the site.",
                urls: [{ type: "text/html", template: "/search?q={searchTerms}" }],
              },
              {
                fileName: "search/people.xml",
                shortName: "People",
                description: "Search people.",
                urls: [{ type: "text/html", template: "/people?q={searchTerms}" }],
              },
            ],
          }),
        ],
        build: {
          write: false,
          minify: false,
          rolldownOptions: {
            input: join(root, "index.html"),
          },
        },
      });
      const buildResult = Array.isArray(result) ? result[0] : result;
      if (buildResult === undefined || !("output" in buildResult)) {
        throw new Error("Expected Vite to return an in-memory build output.");
      }

      const sources = new Map<string, string>();
      for (const output of buildResult.output) {
        if (output.type === "asset" && typeof output.source === "string") {
          sources.set(output.fileName, output.source);
        }
      }

      expect([...sources.keys()]).toEqual(
        expect.arrayContaining(["opensearch.xml", "search/people.xml"]),
      );
      expect(sources.get("opensearch.xml")).toContain(
        'template="https://example.com/search?q={searchTerms}"',
      );
      expect(sources.get("search/people.xml")).toContain("<ShortName>People</ShortName>");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("validates every description before emitting any asset", (): void => {
    const options: OpenSearchPluginOptions = {
      baseURL: "https://example.com/",
      descriptions: [
        {
          fileName: "valid.xml",
          shortName: "Valid",
          description: "Valid description.",
          urls: [{ type: "text/html", template: "/search?q={searchTerms}" }],
        },
        {
          fileName: "../invalid.xml",
          shortName: "Invalid",
          description: "Invalid description.",
          urls: [{ type: "text/html", template: "/search?q={searchTerms}" }],
        },
      ],
    };
    const plugin = openSearch(options);
    const emitFile = vi.fn();
    const warn = vi.fn();

    const generateBundle = plugin.generateBundle;
    if (typeof generateBundle !== "function") {
      throw new TypeError("Expected generateBundle to be a function hook.");
    }

    expect((): void => {
      Reflect.apply(generateBundle, { emitFile, warn }, []);
    }).toThrow(/descriptions\[1\]\.fileName/u);
    expect(emitFile).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  test("forwards browser compatibility warnings through the plugin context", (): void => {
    const plugin = openSearch({
      baseURL: "https://example.com/",
      descriptions: [
        {
          fileName: "feed.xml",
          shortName: "Feed Search",
          description: "Search the feed.",
          urls: [
            {
              type: "application/rss+xml",
              template: "/feed?q={searchTerms}",
            },
          ],
        },
      ],
    });
    const emitFile = vi.fn();
    const warn = vi.fn();
    const generateBundle = plugin.generateBundle;
    if (typeof generateBundle !== "function") {
      throw new TypeError("Expected generateBundle to be a function hook.");
    }

    Reflect.apply(generateBundle, { emitFile, warn }, []);

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"feed.xml"'));
    expect(emitFile).toHaveBeenCalledWith(
      expect.objectContaining({ type: "asset", fileName: "feed.xml" }),
    );
  });
});

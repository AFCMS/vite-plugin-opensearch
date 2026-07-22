import type { Plugin } from "vite";

export interface OpenSearchPluginOptions {
  readonly baseUrl: string;
  readonly configs: readonly OpenSearchConfig[];
}

type OpenSearchCongigUrlRel = "results" | "suggestions" | "self" | "collection";

export interface OpenSearchConfigUrl {
  readonly template: string;
  /**
   * The MIME type of the resource being described.
   */
  readonly type: string;
  /**
   * @default "results"
   */
  readonly rel?: OpenSearchCongigUrlRel;
  readonly indexOffset?: number;
  readonly pageOffset?: number;
}

export interface OpenSearchConfig {
  readonly shortName: string;
  readonly description: string;
  readonly urls: readonly string[];
}

export function fn(): string {
  return "Hello, tsdown!";
}

/**
 *
 */
export default function openSearch(options: OpenSearchPluginOptions): Plugin {
  return {
    name: "@afcms/vite-plugin-opensearch",
    apply: "build",

    generateBundle(outputOptions, bundle, isWrite) {
      console.log("Options:", options);
      console.log("Output options:", outputOptions);
      console.log("Bundle:", bundle);
      console.log("Is write:", isWrite);
    },
  };
}

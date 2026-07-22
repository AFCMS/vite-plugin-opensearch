import type { Plugin } from "vite";

import { generateOpenSearchDescription } from "./generate";
import type { OpenSearchPluginOptions } from "./types";
import { getBrowserCompatibilityWarnings, validatePluginOptions } from "./validation";

export type {
  OpenSearchDescription,
  OpenSearchImage,
  OpenSearchPluginOptions,
  OpenSearchQuery,
  OpenSearchQueryRole,
  OpenSearchSyndicationRight,
  OpenSearchURL,
  OpenSearchURLRelation,
} from "./types";

interface GeneratedDescription {
  readonly fileName: string;
  readonly source: string;
}

function prepareDescriptions(options: OpenSearchPluginOptions): readonly GeneratedDescription[] {
  const baseURL = validatePluginOptions(options);
  const generatedDescriptions: GeneratedDescription[] = [];

  for (const description of options.descriptions) {
    generatedDescriptions.push({
      fileName: description.fileName,
      source: generateOpenSearchDescription(description, baseURL),
    });
  }

  return generatedDescriptions;
}

/**
 * Creates a build-only Vite plugin that emits OpenSearch 1.1 XML description
 * documents at the configured output paths.
 */
export default function openSearch(options: OpenSearchPluginOptions): Plugin {
  return {
    name: "@afcms/vite-plugin-opensearch",
    apply: "build",

    generateBundle(): void {
      const generatedDescriptions = prepareDescriptions(options);
      const warnings = getBrowserCompatibilityWarnings(options.descriptions);

      for (const warning of warnings) {
        this.warn(warning);
      }
      for (const description of generatedDescriptions) {
        this.emitFile({
          type: "asset",
          fileName: description.fileName,
          source: description.source,
        });
      }
    },
  };
}

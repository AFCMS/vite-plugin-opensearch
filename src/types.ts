/**
 * A standard relationship between an OpenSearch description and a URL.
 */
export type OpenSearchURLRelation = "results" | "suggestions" | "self" | "collection";

/**
 * A standard role assigned to an example OpenSearch query.
 */
export type OpenSearchQueryRole =
  | "request"
  | "example"
  | "related"
  | "correction"
  | "subset"
  | "superset";

/**
 * The degree to which OpenSearch results may be queried and redistributed.
 */
export type OpenSearchSyndicationRight = "open" | "limited" | "private" | "closed";

/**
 * Options for generating OpenSearch description documents during a Vite build.
 */
export interface OpenSearchPluginOptions {
  /**
   * An absolute HTTP(S) URL used to resolve relative URL templates and image
   * URLs. Resolution follows the standard `URL` constructor semantics and is
   * independent of Vite's `base` option.
   */
  readonly baseURL: string;
  /**
   * The OpenSearch descriptions to emit. At least one description is required,
   * and every description must use a unique `fileName`.
   */
  readonly descriptions: readonly OpenSearchDescription[];
}

/**
 * A complete OpenSearch 1.1 description document and its build output path.
 */
export interface OpenSearchDescription {
  /**
   * The exact POSIX-style path relative to Vite's output directory. The path
   * must not be absolute, contain backslashes, or contain `.` or `..` segments.
   * OpenSearch does not require a particular file extension.
   */
  readonly fileName: string;
  /**
   * A plain-text title that identifies the search engine. It must contain no
   * more than 16 characters.
   */
  readonly shortName: string;
  /**
   * A plain-text description of the search engine. It must contain no more
   * than 1024 characters.
   */
  readonly description: string;
  /**
   * Interfaces through which the search engine can be queried. At least one
   * URL is required.
   */
  readonly urls: readonly OpenSearchURL[];
  /**
   * An email address for the maintainer of the description document.
   */
  readonly contact?: string;
  /**
   * Single-word keywords describing the search content. Entries are joined by
   * spaces and the resulting value must contain no more than 256 characters.
   */
  readonly tags?: readonly string[];
  /**
   * An extended plain-text title containing no more than 48 characters.
   */
  readonly longName?: string;
  /**
   * Images associated with the search engine, in client preference order.
   */
  readonly images?: readonly OpenSearchImage[];
  /**
   * Example or related queries that clients can use with the search engine.
   */
  readonly queries?: readonly OpenSearchQuery[];
  /**
   * The plain-text name of the document creator or maintainer. It must contain
   * no more than 64 characters.
   */
  readonly developer?: string;
  /**
   * Plain-text attribution for search content sources. It must contain no more
   * than 256 characters.
   */
  readonly attribution?: string;
  /**
   * The permitted use of search results.
   *
   * @default "open"
   */
  readonly syndicationRight?: OpenSearchSyndicationRight;
  /**
   * Whether results may contain content intended only for adults.
   *
   * @default false
   */
  readonly adultContent?: boolean;
  /**
   * Supported BCP 47 language tags. Use `"*"` for any language.
   *
   * @default ["*"]
   */
  readonly languages?: readonly string[];
  /**
   * Supported character encodings for search requests.
   *
   * @default ["UTF-8"]
   */
  readonly inputEncodings?: readonly string[];
  /**
   * Supported character encodings for search responses.
   *
   * @default ["UTF-8"]
   */
  readonly outputEncodings?: readonly string[];
}

/**
 * A request interface exposed by an OpenSearch description document.
 */
export interface OpenSearchURL {
  /**
   * A URL template containing OpenSearch parameters such as `{searchTerms}`.
   * Relative templates are resolved against the root `baseURL` before XML is
   * emitted.
   */
  readonly template: string;
  /**
   * The MIME type of the resource returned by this URL.
   */
  readonly type: string;
  /**
   * Relationships represented by this URL. Multiple values are serialized as
   * a space-delimited attribute.
   *
   * @default ["results"]
   */
  readonly rel?: readonly OpenSearchURLRelation[];
  /**
   * The integer index of the first search result.
   *
   * @default 1
   */
  readonly indexOffset?: number;
  /**
   * The integer page number of the first result set.
   *
   * @default 1
   */
  readonly pageOffset?: number;
}

/**
 * An image associated with an OpenSearch search engine.
 */
export interface OpenSearchImage {
  /**
   * The image URL. Relative values are resolved against the root `baseURL`;
   * absolute and `data:` URLs are preserved.
   */
  readonly url: string;
  /**
   * The non-negative image height in pixels.
   */
  readonly height?: number;
  /**
   * The non-negative image width in pixels.
   */
  readonly width?: number;
  /**
   * The image MIME type.
   */
  readonly type?: string;
}

/**
 * A specific search request that an OpenSearch client can perform.
 */
export interface OpenSearchQuery {
  /**
   * How a client should interpret this query.
   */
  readonly role: OpenSearchQueryRole;
  /**
   * A plain-text query title containing no more than 256 characters.
   */
  readonly title?: string;
  /**
   * The expected non-negative number of matching results.
   */
  readonly totalResults?: number;
  /**
   * The search terms represented by this query.
   */
  readonly searchTerms?: string;
  /**
   * The requested non-negative number of results per page.
   */
  readonly count?: number;
  /**
   * The integer index of the first requested result.
   */
  readonly startIndex?: number;
  /**
   * The integer page number of the requested result set.
   */
  readonly startPage?: number;
  /**
   * The requested BCP 47 language tag, or `"*"` for any language.
   */
  readonly language?: string;
  /**
   * The character encoding used for the search request.
   */
  readonly inputEncoding?: string;
  /**
   * The desired character encoding of the search response.
   */
  readonly outputEncoding?: string;
}

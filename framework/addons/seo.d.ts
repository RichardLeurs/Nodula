import type { Accessor } from "nodula-framework";

export type SEOMetadataValue = string | null | undefined | Accessor<string | null | undefined>;
export interface SEOOpenGraph {
  title?: SEOMetadataValue;
  description?: SEOMetadataValue;
  url?: SEOMetadataValue;
  type?: SEOMetadataValue;
  image?: SEOMetadataValue;
  siteName?: SEOMetadataValue;
  locale?: SEOMetadataValue;
}
export interface SEOLanguageAlternate {
  lang: SEOMetadataValue;
  href: SEOMetadataValue;
}
export interface SEOMetadata {
  title?: SEOMetadataValue;
  description?: SEOMetadataValue;
  keywords?: SEOMetadataValue;
  author?: SEOMetadataValue;
  /** Absolute URL; omitted values are generated from siteUrl and the active route. */
  canonical?: SEOMetadataValue;
  robots?: SEOMetadataValue;
  openGraph?: SEOOpenGraph;
  hreflang?: SEOLanguageAlternate[];
}
export interface SEORouteContext {
  /** Current router path, without the query string or fragment. */
  path: string;
  /** Decoded dynamic route parameters. */
  params: Readonly<Record<string, string>>;
  router: {
    mode: "hash" | "history";
    current: Accessor<string>;
    navigate(path: string): void;
  };
}
export type SEOMetadataResolver = SEOMetadata | ((context: SEORouteContext) => SEOMetadata);
export interface SEOOptions {
  /** Base origin/path used for generated absolute canonical URLs. */
  siteUrl?: string;
  /** Metadata applied globally unless overridden by a route or update(). */
  defaults?: SEOMetadataResolver;
  /** Route patterns accept `/posts/:id` or `/posts/[id]` parameters. */
  routes?: Record<string, SEOMetadataResolver>;
}
export interface SEOController {
  /** Merge page-local metadata into the current route metadata. */
  update(metadata: SEOMetadata): void;
  /** Stop reactive route updates and restore pre-existing head elements. */
  dispose(): void;
}

/** Manage title, description, keywords, author, canonical, Open Graph, robots, and hreflang head tags. */
export function createSEO(router: SEORouteContext["router"], options?: SEOOptions): SEOController;

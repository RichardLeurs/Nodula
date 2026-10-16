import type { Plugin } from "vite";

export interface SEORouteDefinition {
  path: string;
  /** Sitemap change frequency. */
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  /** Sitemap priority between 0 and 1. */
  priority?: number;
  /** Explicit last modified date. */
  lastmod?: string | Date;
}
export interface SEOViteOptions {
  /** Public site origin, for example https://example.com. */
  siteUrl: string;
  /** Routes included in sitemap.xml. */
  routes: readonly (string | SEORouteDefinition)[];
  /** Public robots.txt rules, defaulting to allow all crawlers and point at sitemap.xml. */
  robots?: string | false;
  /** Sitemap output filename, default sitemap.xml. */
  sitemapFilename?: string;
  /** robots output filename, default robots.txt. */
  robotsFilename?: string;
}

/** Vite build plugin that emits sitemap.xml and robots.txt into the build output. */
export function nodulaSEO(options: SEOViteOptions): Plugin;

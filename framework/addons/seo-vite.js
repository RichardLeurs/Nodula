function escapeXML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function validateOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('nodulaSEO expects an options object.');
  }
  if (typeof options.siteUrl !== 'string') throw new TypeError('nodulaSEO siteUrl must be a URL string.');
  const site = new URL(options.siteUrl);
  if (!['http:', 'https:'].includes(site.protocol)) throw new TypeError('nodulaSEO siteUrl must use HTTP or HTTPS.');
  if (site.pathname !== '/' || site.search || site.hash) throw new TypeError('nodulaSEO siteUrl must be an origin without a path, query, or fragment.');
  if (!Array.isArray(options.routes)) throw new TypeError('nodulaSEO routes must be an array.');
  for (const route of options.routes) {
    const path = typeof route === 'string' ? route : route?.path;
    if (typeof path !== 'string' || !path.startsWith('/')) {
      throw new TypeError('Each sitemap route must be an absolute path beginning with /.');
    }
    if (typeof route === 'object' && route.priority !== undefined
      && (typeof route.priority !== 'number' || route.priority < 0 || route.priority > 1)) {
      throw new TypeError(`Sitemap priority for ${path} must be between 0 and 1.`);
    }
    if (typeof route === 'object' && route.lastmod !== undefined && Number.isNaN(new Date(route.lastmod).valueOf())) {
      throw new TypeError(`Sitemap lastmod for ${path} must be a valid date.`);
    }
    if (typeof route === 'object' && route.changefreq !== undefined
      && !['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].includes(route.changefreq)) {
      throw new TypeError(`Sitemap changefreq for ${path} is invalid.`);
    }
    if (new URL(routeURL(site, path)).origin !== site.origin) {
      throw new TypeError(`Sitemap route ${path} must stay on the configured site origin.`);
    }
  }
  for (const filename of [options.sitemapFilename, options.robotsFilename]) {
    if (filename !== undefined && (typeof filename !== 'string' || !filename || filename.includes('/') || filename.includes('\\'))) {
      throw new TypeError('SEO output filenames must be simple filenames.');
    }
  }
}

function routeURL(site, path) {
  const url = new URL(path, site);
  url.search = '';
  url.hash = '';
  return url.href;
}

function createSitemap(siteUrl, routes) {
  const site = new URL(siteUrl);
  const entries = routes.map((route) => {
    const definition = typeof route === 'string' ? { path: route } : route;
    const fields = [`    <loc>${escapeXML(routeURL(site, definition.path))}</loc>`];
    if (definition.lastmod !== undefined) fields.push(`    <lastmod>${escapeXML(new Date(definition.lastmod).toISOString())}</lastmod>`);
    if (definition.changefreq !== undefined) fields.push(`    <changefreq>${escapeXML(definition.changefreq)}</changefreq>`);
    if (definition.priority !== undefined) fields.push(`    <priority>${definition.priority.toFixed(1)}</priority>`);
    return `  <url>\n${fields.join('\n')}\n  </url>`;
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + `${entries.join('\n')}\n</urlset>\n`;
}

function createRobots(siteUrl, sitemapFilename, robots) {
  if (robots === false) return null;
  const rules = robots ?? 'User-agent: *\nAllow: /';
  if (typeof rules !== 'string') throw new TypeError('nodulaSEO robots must be a string or false.');
  const lines = rules.trimEnd().split(/\r?\n/).filter((line) => !/^\s*sitemap\s*:/i.test(line));
  lines.push(`Sitemap: ${new URL(sitemapFilename, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).href}`);
  return `${lines.join('\n')}\n`;
}

/** Generate sitemap.xml and robots.txt as static Vite build assets. */
export function nodulaSEO(options) {
  validateOptions(options);
  const sitemapFilename = options.sitemapFilename ?? 'sitemap.xml';
  const robotsFilename = options.robotsFilename ?? 'robots.txt';
  const sitemap = createSitemap(options.siteUrl, options.routes);
  const robots = createRobots(options.siteUrl, sitemapFilename, options.robots);

  return {
    name: 'nodula-seo-static-files',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: sitemapFilename, source: sitemap });
      if (robots !== null) this.emitFile({ type: 'asset', fileName: robotsFilename, source: robots });
    },
  };
}
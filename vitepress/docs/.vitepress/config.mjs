import { defineConfig } from "vitepress";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const siteUrl = "https://nodula-docs.richardleurs.nl";
const siteDescription =
  "Documentation for Nodula, a lightweight JavaScript framework for building applications with signals, direct DOM updates, and single-file components.";
const docsDirectory = fileURLToPath(new URL("../", import.meta.url));

function getPageDescription(source) {
  const markdown = String(source ?? "").replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, "");
  const paragraph = markdown
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block && !block.startsWith("#") && !block.startsWith("```") && !block.startsWith("<"),
    );

  if (!paragraph) return siteDescription;

  return paragraph
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 220);
}

function getCanonicalUrl(page) {
  let route = `/${String(page).replace(/^\/+/, "")}`;
  route = route.replace(/(?:^|\/)index\.md$/i, "/").replace(/\.md$/i, ".html");
  if (route === "//") route = "/";
  return new URL(route, siteUrl).href;
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  outDir: path.resolve(docsDirectory, ".vitepress/dist"),
  vite: {
    configFile: false,
  },
  title: "Nodula Docs",
  titleTemplate: ":title | Nodula Docs",
  description: siteDescription,
  sitemap: {
    hostname: siteUrl,
  },
  transformPageData(pageData) {
    const source = pageData.filePath
      ? readFileSync(path.resolve(docsDirectory, pageData.filePath), "utf8")
      : pageData.src;
    return {
      description: pageData.frontmatter?.description || getPageDescription(source),
    };
  },
  transformHead({ page, title, description }) {
    const canonical = getCanonicalUrl(page);
    const pageDescription = description || siteDescription;

    return [
      ["link", { rel: "canonical", href: canonical }],
      ["meta", { property: "og:type", content: "website" }],
      ["meta", { property: "og:site_name", content: "Nodula Documentation" }],
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: pageDescription }],
      ["meta", { property: "og:url", content: canonical }],
      ["meta", { property: "og:image", content: new URL("/logo-nodula-64.webp", siteUrl).href }],
      ["meta", { name: "twitter:card", content: "summary" }],
      ["meta", { name: "twitter:title", content: title }],
      ["meta", { name: "twitter:description", content: pageDescription }],
      ["meta", { name: "twitter:image", content: new URL("/logo-nodula-64.webp", siteUrl).href }],
    ];
  },
  head: [["link", { rel: "icon", href: "/logo-nodula-64.webp" }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: "local",
    },
    logo: {
      src: "/logo-nodula-64.webp",
      alt: "Nodula",
    },
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/introduction" },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Introduction", link: "/guide/introduction" },
          { text: "Installation", link: "/guide/installation" },
          { text: "Quick Start", link: "/guide/quick-start" },
          { text: "Specifications and Limits", link: "/guide/specifications" },
        ],
      },
      {
        text: "Framework",
        items: [
          { text: "Framework core", link: "/guide/framework-core" },
          { text: "Routing", link: "/guide/routing" },
          { text: "Local storage", link: "/guide/local-storage" },
          { text: "Data", link: "/guide/data" },
          { text: "Store", link: "/guide/stores" },
          { text: "Animation", link: "/guide/animations" },
          { text: "Form", link: "/guide/forms" },
          { text: "Navigation", link: "/guide/navigation" },
          { text: "Navigation dropdown", link: "/guide/navigation-dropdown" },
          { text: "Drag and drop", link: "/guide/drag-and-drop" },
          { text: "Sortable lists", link: "/guide/sortable-lists" },
          { text: "Async resources", link: "/guide/resource" },
          { text: "File drop", link: "/guide/file-drop" },
          { text: "File upload", link: "/guide/file-upload" },
          { text: "Authentication", link: "/guide/auth" },
          { text: "Dialog", link: "/guide/dialogs" },
          { text: "Notification", link: "/guide/notification" },
          { text: "Modal", link: "/guide/modals" },
          { text: "Side drawer", link: "/guide/drawers" },
          { text: "Progressive Web App", link: "/guide/pwa" },
          { text: "SEO", link: "/guide/seo" },
          { text: "Cookie consent", link: "/guide/cookie-consent" },
          { text: "Framework Stylesheets", link: "/guide/framework-stylesheet" },
        ],
      },
      {
        text: "Tooling",
        items: [
          { text: "Vite", link: "/guide/tooling" },
          { text: "VS Code", link: "/guide/vscode" },
          { text: "Building the npm Package", link: "/guide/npm-package" },
          { text: "Vitest", link: "/guide/testing" },
        ],
      },
      {
        text: "Essentials",
        items: [
          { text: "Template Syntax", link: "/guide/templates" },
          { text: "Styles ans CSS modules", link: "/guide/styles" },
          { text: "Reactivity Fundamentals", link: "/guide/reactivity" },
          { text: "Computed Properties", link: "/guide/computed-properties" },
          { text: "Class and Style Bindings", link: "/guide/class-and-style-bindings" },
          { text: "Conditional Rendering", link: "/guide/conditional-rendering" },
          { text: "List Rendering", link: "/guide/list-rendering" },
          { text: "Event Handling", link: "/guide/event-handling" },
          { text: "Form Input Bindings", link: "/guide/form-input-bindings" },
          { text: "Styles and CSS Modules", link: "/guide/styles" },
          { text: "Watchers", link: "/guide/watchers" },
          { text: "Template Refs", link: "/guide/template-refs" },
          { text: "Components Basics", link: "/guide/components-basics" },
          { text: "Lifecycle Hooks", link: "/guide/lifecycle-hooks" },
        ],
      },
      {
        text: "Components In-Depth",
        items: [
          { text: "Components", link: "/guide/components-in-depth" },
          { text: "Web Components", link: "/guide/web-components" },
          { text: "Registration", link: "/guide/registration" },
          { text: "Props", link: "/guide/props" },
          { text: "Events", link: "/guide/component-events" },
          //  { text: 'Component v-model', link: '/guide/component-v-model' },
          { text: "Fallthrough Attributes", link: "/guide/fallthrough-attributes" },
          { text: "Slots", link: "/guide/slots" },
          { text: "State Management", link: "/guide/state-management" },
          { text: "Async Components", link: "/guide/async-components" },
        ],
      },
      {
        text: "Best Practices",
        items: [
          { text: "Best Practices", link: "/guide/best-practices" },
          { text: "Production Deployment", link: "/guide/production-deployment" },
          { text: "Performance", link: "/guide/performance" },
          { text: "Accessibility", link: "/guide/accessibility" },
          { text: "Internationalization", link: "/guide/internationalization" },
          { text: "Security", link: "/guide/security" },
        ],
      },
      {
        text: "TypeScript",
        items: [
          { text: "Overview", link: "/guide/typescript" },
          // { text: 'Privacy', link: '/guide/privacy' },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/RichardLeurs/nodula" }],
  },
});

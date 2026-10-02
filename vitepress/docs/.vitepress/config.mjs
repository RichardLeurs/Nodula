import { defineConfig } from 'vitepress'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const siteUrl = 'https://nodula-docs.richardleurs.nl'
const siteDescription = 'Documentation for Nodula, a lightweight JavaScript framework for building applications with signals, direct DOM updates, and single-file components.'
const docsDirectory = fileURLToPath(new URL('../', import.meta.url))

function getPageDescription(source) {
  const markdown = String(source ?? '').replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '')
  const paragraph = markdown
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith('#') && !block.startsWith('```') && !block.startsWith('<'))

  if (!paragraph) return siteDescription

  return paragraph
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 220)
}

function getCanonicalUrl(page) {
  let route = `/${String(page).replace(/^\/+/, '')}`
  route = route.replace(/(?:^|\/)index\.md$/i, '/').replace(/\.md$/i, '.html')
  if (route === '//') route = '/'
  return new URL(route, siteUrl).href
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  outDir: '../../dist/vitepress',

  title: 'Nodula Documentation',
  titleTemplate: ':title | Nodula Docs',
  description: siteDescription,
  sitemap: {
    hostname: siteUrl,
  },
  transformPageData(pageData) {
    const source = pageData.filePath
      ? readFileSync(path.resolve(docsDirectory, pageData.filePath), 'utf8')
      : pageData.src
    return {
      description: pageData.frontmatter?.description || getPageDescription(source),
    }
  },
  transformHead({ page, title, description }) {
    const canonical = getCanonicalUrl(page)
    const pageDescription = description || siteDescription

    return [
      ['link', { rel: 'canonical', href: canonical }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'Nodula Documentation' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: pageDescription }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { property: 'og:image', content: new URL('/logo-nodula-64.webp', siteUrl).href }],
      ['meta', { name: 'twitter:card', content: 'summary' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: pageDescription }],
      ['meta', { name: 'twitter:image', content: new URL('/logo-nodula-64.webp', siteUrl).href }],
    ]
  },
  head: [['link', { rel: 'icon', href: '/logo-nodula-64.webp' }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: {
      src: '/logo-nodula-64.webp',
      alt: 'Nodula',
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
    //  { text: 'Local Storage', link: '/guide/local-storage' },
      // { text: 'Examples', link: '/markdown-examples' },
      // { text: 'API Examples', link: '/api-examples' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Quick Start', link: '/guide/quick-start' }
        ]
      },
      {
        text: 'Essentials',
        items: [
          { text: 'Essentials', link: '/guide/essentials' },
          { text: 'Creating an Application', link: '/guide/creating-an-application' },
          { text: 'Template Syntax', link: '/guide/templates' },
          { text: 'Reactivity Fundamentals', link: '/guide/reactivity' },
          { text: 'Computed Properties', link: '/guide/computed-properties' },
          { text: 'Class and Style Bindings', link: '/guide/class-and-style-bindings' },
          { text: 'Conditional Rendering', link: '/guide/conditional-rendering' },
          { text: 'List Rendering', link: '/guide/list-rendering' },
          { text: 'Event Handling', link: '/guide/event-handling' },
          { text: 'Form Input Bindings', link: '/guide/form-input-bindings' },
          { text: 'Watchers', link: '/guide/watchers' },
          { text: 'Template Refs', link: '/guide/template-refs' }
        ]
      },
      {
        text: 'Components Basics',
        items: [
          { text: 'Components Basics', link: '/guide/components-basics' },
          { text: 'Lifecycle Hooks', link: '/guide/lifecycle-hooks' }
        ]
      },
      {
        text: 'Components In-Depth',
        items: [
          { text: 'Components In-Depth', link: '/guide/components-in-depth' },
          { text: 'Registration', link: '/guide/registration' },
          { text: 'Props', link: '/guide/props' },
          { text: 'Events', link: '/guide/component-events' },
          { text: 'Component v-model', link: '/guide/component-v-model' },
          { text: 'Fallthrough Attributes', link: '/guide/fallthrough-attributes' },
          { text: 'Slots', link: '/guide/slots' },
          { text: 'Provide / inject', link: '/guide/provide-inject' },
          { text: 'Async Components', link: '/guide/async-components' }
        ]
      },
      {
        text: 'Reusability',
        items: [
          { text: 'Reusability', link: '/guide/reusability' },
          { text: 'Composables', link: '/guide/composables' },
          { text: 'Custom Directives', link: '/guide/custom-directives' },
          { text: 'Plugins', link: '/guide/plugins' }
        ]
      },
      {
        text: 'Built-in Components',
        items: [
          { text: 'Built-in Components', link: '/guide/built-in-components' },
          { text: 'Transition', link: '/guide/transition' },
          { text: 'TransitionGroup', link: '/guide/transition-group' },
          { text: 'KeepAlive', link: '/guide/keep-alive' },
          { text: 'Teleport', link: '/guide/teleport' },
          { text: 'Suspense', link: '/guide/suspense' }
        ]
      },
      {
        text: 'Scaling Up',
        items: [
          { text: 'Scaling Up', link: '/guide/scaling-up' },
          { text: 'Single-File Components', link: '/guide/templates' }
        ]
      },
      {
        text: 'Tooling',
        items: [
          { text: 'Tooling', link: '/guide/tooling' },
          { text: 'Routing', link: '/guide/routing' },
          { text: 'Navigation', link: '/guide/navigation' },
          { text: 'Local storage and cookies', link: '/guide/local-storage' },
          { text: 'Data requests', link: '/guide/data' },
          { text: 'Authentication, roles, and permissions', link: '/guide/auth' },
          { text: 'Progressive Web Apps', link: '/guide/pwa' },
          { text: 'State Management', link: '/guide/state-management' },
          { text: 'Sprig and Web Components', link: '/guide/sprig-and-web-components' },
          { text: 'Framework Stylesheet', link: '/guide/framework-stylesheet' },
          { text: 'Building the npm Package', link: '/guide/npm-package' },
          { text: 'Reactive Stores', link: '/guide/stores' },
          { text: 'Dialogs', link: '/guide/dialogs' },
          { text: 'Notifications', link: '/guide/notifications' },
          { text: 'Modals', link: '/guide/modals' },
          { text: 'Side drawers', link: '/guide/drawers' },
          { text: 'Testing', link: '/guide/testing' },
          { text: 'Server-Side Rendering (SSR)', link: '/guide/server-side-rendering' }
        ]
      },
      {
        text: 'Best Practices',
        items: [
          { text: 'Best Practices', link: '/guide/best-practices' },
          { text: 'Production Deployment', link: '/guide/production-deployment' },
          { text: 'Performance', link: '/guide/performance' },
          { text: 'Accessibility', link: '/guide/accessibility' },
          { text: 'Security', link: '/guide/security' }
        ]
      },
      {
        text: 'TypeScript',
        items: [
          { text: 'TypeScript', link: '/guide/typescript' },
          { text: 'Overview', link: '/guide/typescript-overview' },
          { text: 'TS with Composition API', link: '/guide/typescript-composition-api' },
          { text: 'TS with Options API', link: '/guide/typescript-options-api' }
        ]
      },
      {
        text: 'Extra Topics',
        items: [
          { text: 'Extra Topics', link: '/guide/extra-topics' },
          { text: 'Ways of Using Vue', link: '/guide/ways-of-using-sprig' },
          { text: 'Composition API FAQ', link: '/guide/composition-api-faq' },
          { text: 'Reactivity in Depth', link: '/guide/reactivity-in-depth' },
          { text: 'Rendering Mechanism', link: '/guide/rendering-mechanism' },
          { text: 'Render Functions & JSX', link: '/guide/render-functions-jsx' },
          { text: 'Vue and Web Components', link: '/guide/sprig-and-web-components' },
          { text: 'Animation Techniques', link: '/guide/animation-techniques' },
          { text: 'Specifications and Limits', link: '/guide/specifications' }
        ]
      },
      // {
      //   text: 'Examples',
      //   items: [
      //     { text: 'Markdown Examples', link: '/markdown-examples' },
      //     { text: 'Runtime API Examples', link: '/api-examples' }
      //   ]
      // }
    ],

    // socialLinks: [
    //   { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    // ]
  }
})

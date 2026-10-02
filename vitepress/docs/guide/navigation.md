# Navigation

The optional `nodula-framework/navigation` add-on mounts accessible router-aware links into a target element. Active links receive `aria-current="page"` and an optional active CSS class as the router changes.

```
import { createRouter } from 'nodula-framework/router';
import { createNavigation } from 'nodula-framework/navigation';

const router = createRouter(routes);
const disposeNavigation = createNavigation(document.querySelector('#navigation'), router, [
  { label: 'Home', href: '/' },
  { label: 'Guide', href: '/guide' },
  { label: 'Nodula website', href: 'https://sprigjs.richardleurs.nl/', external: true },
  { label: 'External in this tab', href: 'https://example.com/docs', external: true, target: '_self' },
], {
  label: 'Main navigation',
  className: 'site-nav',
  linkClassName: 'nav-link',
  activeClassName: 'nav-link--active',
});
```

Pass a container to have the helper create a semantic `<nav>`, or pass an existing `<nav>` to populate it directly. Internal items use router-aware hash or history links and track the current path. To add an external link, set `external: true`; its `href` must be an absolute HTTP(S) URL and it is not marked active or routed internally. External links open in a new tab by default and receive `rel="noopener noreferrer"`; set `target: '_self'` to use the current tab. Other schemes, such as `javascript:`, are rejected. Call the returned disposer when removing the navigation. The demo app uses the helper for its header navigation.

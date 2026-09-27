import { effect } from 'nodula-framework';

/** Mount router-aware links into a semantic navigation element. */
export function mountNavigation(target, router, items, options = {}) {
  if (!target || target.nodeType !== 1) throw new TypeError('mountNavigation expects a target element.');
  if (!router || typeof router.current !== 'function' || typeof router.navigate !== 'function' || !['hash', 'history'].includes(router.mode)) {
    throw new TypeError('mountNavigation expects a Nodula router.');
  }
  if (!Array.isArray(items)) throw new TypeError('mountNavigation items must be an array.');

  const { label = 'Primary navigation', className = '', linkClassName = '', activeClassName = 'is-active' } = options;
  if ([label, className, linkClassName, activeClassName].some((value) => typeof value !== 'string')) {
    throw new TypeError('mountNavigation labels and class names must be strings.');
  }

  const usesTargetNav = target.tagName === 'NAV';
  const nav = usesTargetNav ? target : document.createElement('nav');
  const previousLabel = usesTargetNav ? nav.getAttribute('aria-label') : null;
  nav.setAttribute('aria-label', label);
  if (className) nav.classList.add(...className.split(/\s+/).filter(Boolean));

  const normalizedItems = items.map((item) => {
    if (!item || typeof item.label !== 'string' || typeof item.href !== 'string') {
      throw new TypeError('Navigation items require string labels and hrefs.');
    }
    if (item.external === true) {
      let url;
      try {
        url = new URL(item.href);
      } catch {
        throw new TypeError('External navigation hrefs must be absolute HTTP or HTTPS URLs.');
      }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new TypeError('External navigation hrefs must be safe HTTP or HTTPS URLs.');
      }
      const target = item.target ?? '_blank';
      if (target !== '_blank' && target !== '_self') {
        throw new TypeError('External navigation target must be _blank or _self.');
      }
      return { label: item.label, href: url.href, external: true, target };
    }
    if (item.target !== undefined || !item.href.startsWith('/')) {
      throw new TypeError('Internal navigation hrefs must begin with /.');
    }
    return { label: item.label, href: item.href, external: false, target: undefined };
  });

  const links = normalizedItems.map((item) => {
    const link = document.createElement('a');
    link.textContent = item.label;
    link.href = item.external || router.mode === 'history' ? item.href : `#${item.href}`;
    if (item.external) {
      link.target = item.target;
      if (item.target === '_blank') link.rel = 'noopener noreferrer';
    }
    if (linkClassName) link.className = linkClassName;
    nav.append(link);
    return { link, path: item.href, external: item.external };
  });

  if (!usesTargetNav) target.append(nav);
  const disposeEffect = effect(() => {
    const currentPath = router.current();
    for (const { link, path, external } of links) {
      const active = !external && path === currentPath;
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      if (activeClassName) link.classList.toggle(activeClassName, active);
    }
  });

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    disposeEffect();
    for (const { link } of links) link.remove();
    if (usesTargetNav) {
      if (previousLabel === null) nav.removeAttribute('aria-label');
      else nav.setAttribute('aria-label', previousLabel);
      if (className) nav.classList.remove(...className.split(/\s+/).filter(Boolean));
    } else {
      nav.remove();
    }
  };
}
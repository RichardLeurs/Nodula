import { createRoot, effect, onCleanup, signal, untrack } from './reactivity.js';

const EACH = Symbol('nodula.each');
const WHEN = Symbol('nodula.when');
const COMPONENT = Symbol('nodula.component');
const OUTLET = Symbol('nodula.outlet');
const BINDINGS = new WeakMap();
const lifecycleTransitions = new Set();

/** Register an optional lifecycle transition hook without adding it to the core runtime. */
export function registerLifecycleTransition(transition) {
  if (typeof transition !== 'function') throw new TypeError('Lifecycle transition must be a function.');
  lifecycleTransitions.add(transition);
  return () => lifecycleTransitions.delete(transition);
}

function runLifecycleTransition(phase, nodes, details = {}) {
  const roots = nodes.filter((node) => node?.nodeType === 1);
  if (!roots.length || !lifecycleTransitions.size) return Promise.resolve();
  return Promise.all([...lifecycleTransitions].map((transition) => {
    try { return transition(phase, roots, details); }
    catch { return undefined; }
  })).catch(() => undefined);
}

function removeAfterLeave(nodes, details = {}, canRemove = () => true) {
  const remove = () => {
    for (const node of nodes) if (canRemove(node)) node.remove();
  };
  if (!lifecycleTransitions.size) {
    remove();
    return Promise.resolve();
  }
  return runLifecycleTransition('leave', nodes, details).finally(() => {
    remove();
  });
}

function binding(node) {
  let record = BINDINGS.get(node);
  if (!record) {
    record = { target: node, listeners: [], refs: [], adopt: [], properties: new Set() };
    BINDINGS.set(node, record);
  }
  return record;
}

function createReactiveProps(initialProps) {
  const values = { ...initialProps };
  const readers = new Map();
  const [readKeys, setKeys] = signal(Object.keys(values));

  function readerFor(key) {
    if (!readers.has(key)) {
      readers.set(key, signal({ value: values[key], present: Object.hasOwn(values, key) }));
    }
    return readers.get(key);
  }

  return new Proxy(values, {
    get(target, key, receiver) {
      if (typeof key === 'symbol') return Reflect.get(target, key, receiver);
      return readerFor(key)[0]().value;
    },
    set(target, key, value) {
      if (typeof key === 'symbol') return Reflect.set(target, key, value);
      const existed = Object.hasOwn(target, key);
      if (existed && Object.is(target[key], value)) return true;
      target[key] = value;
      readerFor(key)[1](() => ({ value, present: true }));
      if (!existed) setKeys(Object.keys(target));
      return true;
    },
    deleteProperty(target, key) {
      if (!Object.hasOwn(target, key)) return true;
      delete target[key];
      readerFor(key)[1](() => ({ value: undefined, present: false }));
      setKeys(Object.keys(target));
      return true;
    },
    has(target, key) {
      if (typeof key !== 'symbol') readerFor(key)[0]().present;
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      readKeys();
      return Reflect.ownKeys(target);
    },
  });
}

function customElementPropertyName(name) {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function customElementAttributeName(name) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function customElementEventProp(name) {
  return `on${name[0].toUpperCase()}${name.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`;
}

/** Register a Nodula component as a native custom element. */
export function defineCustomElement(name, render, { props = [], events = [], shadow = 'open' } = {}) {
  if (typeof name !== 'string' || !/^[a-z][.0-9_a-z-]*-[.0-9_a-z-]*$/.test(name)) {
    throw new TypeError('defineCustomElement expects a valid custom element name containing a hyphen.');
  }
  if (typeof render !== 'function') throw new TypeError('defineCustomElement expects a component render function.');
  if (!Array.isArray(props) || props.some((prop) => typeof prop !== 'string' || !/^[a-zA-Z][\w-]*$/.test(prop))) {
    throw new TypeError('Custom element props must be an array of valid property names.');
  }
  if (!Array.isArray(events) || events.some((event) => typeof event !== 'string' || !/^[a-z][\w-]*$/.test(event))) {
    throw new TypeError('Custom element events must be an array of valid event names.');
  }
  if (shadow !== false && shadow !== 'open' && shadow !== 'closed') {
    throw new TypeError('Custom element shadow must be false, open, or closed.');
  }

  const registry = document.defaultView?.customElements ?? globalThis.customElements;
  const ElementBase = document.defaultView?.HTMLElement ?? globalThis.HTMLElement;
  const CustomEventBase = document.defaultView?.CustomEvent ?? globalThis.CustomEvent;
  if (!registry || !ElementBase) throw new Error('Custom elements are unavailable in this environment.');
  if (registry.get(name)) throw new Error(`Custom element is already registered: ${name}`);

  const propertyNames = [...new Set(props.map(customElementPropertyName))];
  const attributeToProperty = new Map(propertyNames.map((prop) => [customElementAttributeName(prop), prop]));
  const observedAttributes = [...attributeToProperty.keys()];
  const eventNames = [...new Set(events)];

  class NodulaCustomElement extends ElementBase {
    static get observedAttributes() { return observedAttributes; }

    constructor() {
      super();
      this._nodulaValues = new Map();
      this._nodulaExplicitProperties = new Set();
      this._nodulaProps = createReactiveProps({});
      this._nodulaMountPoint = shadow === false ? this : this.attachShadow({ mode: shadow });

      for (const prop of propertyNames) {
        if (Object.hasOwn(this, prop)) {
          const value = this[prop];
          delete this[prop];
          this[prop] = value;
        }
      }
    }

    attributeChangedCallback(attribute, _previous, value) {
      const prop = attributeToProperty.get(attribute);
      if (!prop || this._nodulaExplicitProperties.has(prop)) return;
      this._setNodulaProperty(prop, value, false);
    }

    connectedCallback() {
      for (const attribute of observedAttributes) {
        const prop = attributeToProperty.get(attribute);
        if (!this._nodulaExplicitProperties.has(prop) && this.hasAttribute(attribute)) {
          this._setNodulaProperty(prop, this.getAttribute(attribute), false);
        }
      }

      for (const eventName of eventNames) {
        this._nodulaProps[customElementEventProp(eventName)] = (detail) => {
          this.dispatchEvent(new CustomEventBase(eventName, {
            detail,
            bubbles: true,
            composed: true,
          }));
        };
      }

      const [, dispose] = createRoot(() => append(this._nodulaMountPoint, component(render, () => this._nodulaProps)));
      this._nodulaDispose = dispose;
    }

    disconnectedCallback() {
      this._nodulaDispose?.();
      this._nodulaDispose = null;
      this._nodulaMountPoint.replaceChildren();
    }

    _setNodulaProperty(prop, value, explicit) {
      if (explicit) this._nodulaExplicitProperties.add(prop);
      this._nodulaValues.set(prop, value);
      this._nodulaProps[prop] = value;

      if (!explicit || value === undefined || value !== null && (typeof value === 'object' || typeof value === 'function')) return;
      const attribute = customElementAttributeName(prop);
      if (value === null || value === false) {
        if (this.hasAttribute(attribute)) this.removeAttribute(attribute);
      } else {
        const attributeValue = value === true ? '' : String(value);
        if (this.getAttribute(attribute) !== attributeValue) this.setAttribute(attribute, attributeValue);
      }
    }
  }

  for (const prop of propertyNames) {
    Object.defineProperty(NodulaCustomElement.prototype, prop, {
      configurable: true,
      enumerable: true,
      get() { return this._nodulaValues.get(prop); },
      set(value) { this._setNodulaProperty(prop, value, true); },
    });
  }

  registry.define(name, NodulaCustomElement);
  return NodulaCustomElement;
}

function reconcile(current, next) {
  if (current === next) return current;
  if (current.nodeType !== next.nodeType ||
      (current.nodeType === 1 && (current.tagName !== next.tagName || current.namespaceURI !== next.namespaceURI))) {
    current.replaceWith(next);
    return next;
  }

  if (current.nodeType === 3 || current.nodeType === 8) {
    if (current.data !== next.data) current.data = next.data;
  } else if (current.nodeType === 1) {
    for (const attribute of [...current.attributes]) {
      if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
    }
    for (const attribute of next.attributes) {
      if (current.getAttribute(attribute.name) !== attribute.value) {
        current.setAttribute(attribute.name, attribute.value);
      }
    }
    for (const property of BINDINGS.get(next)?.properties ?? []) {
      if (current[property] !== next[property]) current[property] = next[property];
    }
    const oldChildren = [...current.childNodes];
    const newChildren = [...next.childNodes];
    const keyed = new Map(oldChildren.filter((node) => BINDINGS.get(node)?.key !== undefined)
      .map((node) => [BINDINGS.get(node).key, node]));
    const unkeyed = oldChildren.filter((node) => BINDINGS.get(node)?.key === undefined);
    const retained = new Set();
    let unkeyedIndex = 0;
    for (let index = 0; index < newChildren.length; index += 1) {
      const proposed = newChildren[index];
      const key = BINDINGS.get(proposed)?.key;
      const previous = key === undefined ? unkeyed[unkeyedIndex++] : keyed.get(key);
      const node = previous ? reconcile(previous, proposed) : proposed;
      retained.add(node);
      const reference = current.childNodes[index] ?? null;
      if (reference !== node) current.insertBefore(node, reference);
    }
    for (const node of oldChildren) if (!retained.has(node)) node.remove();
  }

  const record = BINDINGS.get(next);
  if (record) {
    record.target = current;
    for (const [name, listener] of record.listeners) {
      next.removeEventListener(name, listener);
      current.addEventListener(name, listener);
    }
    for (const ref of record.refs) ref(current);
    for (const adopt of record.adopt) adopt(current);
    BINDINGS.set(current, record);
    BINDINGS.delete(next);
  }
  return current;
}

function toNode(value) {
  if (value instanceof Node) return value;
  if (value?.[COMPONENT]) {
    const container = document.createDocumentFragment();
    append(container, value);
    return container;
  }
  return document.createTextNode(value == null || value === false ? '' : String(value));
}

function append(parent, child) {
  if (Array.isArray(child)) {
    child.forEach((item) => append(parent, item));
    return;
  }

  if (child?.[COMPONENT]) {
    const props = createReactiveProps(untrack(child.readProps));
    const slots = child.slots;
    const [node, dispose] = createRoot(() => toNode(child.render({
      props,
      children: slots.default ? slots.default() : undefined,
      slots,
    })), { detached: true });
    parent.append(node);
    effect(() => {
      const nextProps = child.readProps();
      for (const key of Object.keys(props)) {
        if (!Object.hasOwn(nextProps, key)) delete props[key];
      }
      for (const [key, value] of Object.entries(nextProps)) props[key] = value;
    });
    onCleanup(dispose);
    return;
  }

  if (child?.[OUTLET]) {
    const start = document.createComment('nodula outlet start');
    const end = document.createComment('nodula outlet end');
    parent.append(start, end);
    const state = { start, end, current: null, disposeCurrent: null, active: true };

    effect(() => {
      const value = child.view();
      const current = state.current;
      if (current?.value === value) return;
      const [node, dispose] = untrack(() => createRoot(() => toNode(value), { detached: true }));
      const nodes = node.nodeType === 11 ? [...node.childNodes] : [node];
      if (!state.active) {
        dispose();
        return;
      }

      if (current) {
        state.disposeCurrent?.();
        void removeAfterLeave(current.nodes, { type: 'page' });
      }
      state.end.parentNode.insertBefore(node, state.end);
      state.current = { value, nodes };
      state.disposeCurrent = dispose;
      if (lifecycleTransitions.size) void runLifecycleTransition('enter', nodes, { type: 'page' });
    });

    onCleanup(() => {
      state.active = false;
      state.disposeCurrent?.();
      for (const node of state.current?.nodes ?? []) node.remove();
    });
    binding(start).adopt.push((node) => { state.start = node; });
    binding(end).adopt.push((node) => { state.end = node; });
    return;
  }

  if (child?.[WHEN]) {
    const start = document.createComment('nodula if start');
    const end = document.createComment('nodula if end');
    parent.append(start, end);
    const state = { start, end, activeNodes: [] };
    let selected;
    let disposeBranch = null;

    effect(() => {
      const next = Boolean(child.condition());
      if (selected === next) return;
      selected = next;
      disposeBranch?.();
      const leavingNodes = state.activeNodes;
      state.activeNodes = [];
      if (leavingNodes.length) {
        void removeAfterLeave(leavingNodes, { type: 'conditional' }, (node) => !state.activeNodes.includes(node));
      }
      const render = next ? child.yes : child.no;
      if (!render) {
        disposeBranch = null;
        return;
      }
      const [branch, dispose] = untrack(() => createRoot(() => {
        const container = state.end.parentNode;
        return toNode(render());
      }, { detached: true }));
      const enteringNodes = branch.nodeType === 11 ? [...branch.childNodes] : [branch];
      state.end.parentNode.insertBefore(branch, state.end);
      state.activeNodes = enteringNodes;
      disposeBranch = dispose;
      if (lifecycleTransitions.size) void runLifecycleTransition('enter', enteringNodes, { type: 'conditional' });
    });

    onCleanup(() => {
      disposeBranch?.();
      let node = state.start.nextSibling;
      while (node && node !== state.end) {
        const following = node.nextSibling;
        node.remove();
        node = following;
      }
      state.activeNodes = [];
    });
    binding(start).adopt.push((node) => { state.start = node; });
    binding(end).adopt.push((node) => { state.end = node; });
    return;
  }

  if (child?.[EACH]) {
    const start = document.createComment('nodula each start');
    const end = document.createComment('nodula each end');
    parent.append(start, end);
    const state = { parent, end };
    const rows = new Map();

    effect(() => {
      const values = child.items();
      const seen = new Set();
      for (const item of values) {
        const id = child.key(item);
        if (seen.has(id)) throw new Error(`Duplicate list key: ${id}`);
        seen.add(id);

        let row = rows.get(id);
        let created = false;
        if (!row) {
          const [readItem, setItem] = signal(item);
          const [node, dispose] = createRoot(() => toNode(child.render(readItem)), { detached: true });
          row = { node, dispose, setItem };
          binding(node).key = id;
          binding(node).adopt.push((adopted) => { row.node = adopted; });
          rows.set(id, row);
          created = true;
        } else {
          row.setItem(item);
        }
        state.parent.insertBefore(row.node, state.end);
        if (created && lifecycleTransitions.size) {
          const enteringNodes = row.node.nodeType === 11 ? [...row.node.childNodes] : [row.node];
          void runLifecycleTransition('enter', enteringNodes, { type: 'list', key: id });
        }
      }

      for (const [id, row] of rows) {
        if (seen.has(id)) continue;
        row.dispose();
        const leavingNodes = row.node.nodeType === 11 ? [...row.node.childNodes] : [row.node];
        void removeAfterLeave(leavingNodes, { type: 'list', key: id });
        rows.delete(id);
      }
    });

    onCleanup(() => {
      for (const row of rows.values()) row.dispose();
      rows.clear();
    });
    binding(parent).adopt.push((node) => { state.parent = node; });
    binding(end).adopt.push((node) => { state.end = node; });
    return;
  }

  if (typeof child === 'function') {
    const anchor = document.createComment('nodula dynamic');
    parent.append(anchor);
    const state = { anchor, currentNode: null };
    let disposeCurrent = null;

    effect(() => {
      disposeCurrent?.();
      const [nextNode, dispose] = createRoot(() => toNode(child()), { detached: true });
      binding(nextNode).adopt.push((node) => { state.currentNode = node; });
      if (state.currentNode) state.currentNode = reconcile(state.currentNode, nextNode);
      else {
        state.anchor.after(nextNode);
        state.currentNode = nextNode;
      }
      disposeCurrent = dispose;
    });

    onCleanup(() => {
      disposeCurrent?.();
    });
    binding(anchor).adopt.push((node) => { state.anchor = node; });
    return;
  }

  parent.append(toNode(child));
}

export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  const record = binding(element);
  const bindings = [];
  const isCustomElement = tag.includes('-');

  for (const [key, value] of Object.entries(props ?? {})) {
    if ((key.startsWith('on:') || key.startsWith('on')) && typeof value === 'function') {
      const eventName = key.startsWith('on:') ? key.slice(3) : key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
      record.listeners.push([eventName, value]);
      onCleanup(() => record.target.removeEventListener(eventName, value));
      continue;
    }

    if (key === 'ref') {
      value(element);
      record.refs.push(value);
      onCleanup(() => value(null));
      continue;
    }

    if (key === 'show') {
      continue;
    }

    if (key === 'bind') {
      const { property, read, write } = value;
      const eventName = property === 'checked' ? 'change' : 'input';
      const update = () => { record.target[property] = read(); };
      bindings.push(update);
      const listener = (event) => write(event.currentTarget[property]);
      element.addEventListener(eventName, listener);
      record.listeners.push([eventName, listener]);
      record.properties.add(property);
      onCleanup(() => record.target.removeEventListener(eventName, listener));
      continue;
    }

    const isForcedProperty = key.endsWith('.prop');
    const rawPropertyKey = isForcedProperty ? key.slice(0, -5) : key;
    const update = () => {
      const nextValue = typeof value === 'function' ? value() : value;
      const target = record.target;
      const isObjectProperty = isCustomElement && nextValue !== null && typeof nextValue === 'object';
      const isReactiveCustomProperty = isCustomElement && typeof value === 'function';
      const propertyKey = isForcedProperty || isObjectProperty || isReactiveCustomProperty
        ? customElementPropertyName(rawPropertyKey)
        : rawPropertyKey;
      if (propertyKey === 'className') target.className = nextValue ?? '';
      else if (propertyKey === 'style' && typeof nextValue === 'object') Object.assign(target.style, nextValue);
      else if (isForcedProperty || isReactiveCustomProperty || isObjectProperty || propertyKey in target && ['value', 'checked', 'disabled'].includes(propertyKey)) {
        record.properties.add(propertyKey);
        target[propertyKey] = nextValue ?? (propertyKey === 'value' ? '' : false);
      } else if (nextValue == null || nextValue === false) target.removeAttribute(propertyKey);
      else target.setAttribute(propertyKey, nextValue === true ? '' : String(nextValue));
    };

    if (typeof value === 'function') effect(update);
    else update();
  }

  children.forEach((child) => append(element, child));
  if (Object.hasOwn(props ?? {}, 'show')) {
    const value = props.show;
    const originalDisplay = element.style.display;
    const update = () => { record.target.style.display = (typeof value === 'function' ? value() : value) ? originalDisplay : 'none'; };
    if (typeof value === 'function') effect(update);
    else update();
  }
  for (const update of bindings) effect(update);
  return element;
}

export function fragment(...children) {
  const node = document.createDocumentFragment();
  children.forEach((child) => append(node, child));
  return node;
}

export function mount(target, component) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) throw new Error(`Mount target not found: ${target}`);

  const [node, dispose] = createRoot(() => component());
  container.replaceChildren(node);
  return () => {
    dispose();
    node.remove();
  };
}

// Only changed rows are created or removed; unchanged nodes keep their identity.
export function list(items, key, render) {
  const container = document.createElement('div');
  const rows = new Map();

  effect(() => {
    const values = items();
    const seen = new Set();

    const ids = values.map((item) => key(item));
    for (const id of ids) {
      if (seen.has(id)) throw new Error(`Duplicate list key: ${id}`);
      seen.add(id);
    }

    for (const [id, row] of rows) {
      if (seen.has(id)) continue;
      row.dispose();
      row.node.remove();
      rows.delete(id);
    }

    let current = container.firstChild;
    values.forEach((item, index) => {
      const id = ids[index];
      let row = rows.get(id);
      if (!row) {
        const [node, dispose] = createRoot(() => render(item, index), { detached: true });
        row = { node, dispose };
        rows.set(id, row);
      }
      if (current !== row.node) {
        if (current) container.insertBefore(row.node, current);
        else container.append(row.node);
      }
      current = row.node.nextSibling;
    });
  });

  onCleanup(() => {
    for (const row of rows.values()) row.dispose();
    rows.clear();
  });
  return container;
}

// Template loops receive an accessor so rows can react when an item is replaced by key.
export function each(items, key, render) {
  return { [EACH]: true, items, key, render };
}

export function when(condition, yes, no) {
  return { [WHEN]: true, condition, yes, no };
}

/** Mark a rendered page view for leave/enter handling when the view changes. */
export function outlet(view) {
  return { [OUTLET]: true, view };
}

export function slot(slots, name, fallback) {
  const supplied = slots && Object.hasOwn(slots, name) ? slots[name] : undefined;
  return when(() => true, () => supplied == null ? fallback() : typeof supplied === 'function' ? supplied() : supplied);
}

/** Describe an imported component with reactive props and supplied slots. */
export function component(render, readProps, slots = {}) {
  return { [COMPONENT]: true, render, readProps, slots };
}
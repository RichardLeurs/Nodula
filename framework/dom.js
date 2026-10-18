// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { createRoot, effect, onCleanup, signal, untrack } from "./reactivity.js";

const EACH = Symbol("nodula.each");
const WHEN = Symbol("nodula.when");
const COMPONENT = Symbol("nodula.component");
const OUTLET = Symbol("nodula.outlet");
const BINDINGS = new WeakMap();
const lifecycleTransitions = new Set();

/** Register an optional lifecycle transition hook without adding it to the core runtime. */
export function registerLifecycleTransition(transition) {
  if (typeof transition !== "function")
    throw new TypeError("Lifecycle transition must be a function.");
  lifecycleTransitions.add(transition);
  return () => lifecycleTransitions.delete(transition);
}

/**
 * Run every registered lifecycle transition for a phase on the element nodes.
 *
 * A transition that throws or rejects is logged with console.error, and the DOM update still completes.
 *
 * @param {"enter" | "leave"} phase
 * @param {Node[]} nodes Nodes entering or leaving; text nodes are ignored.
 * @param {object} [details] Transition details, such as the list key.
 * @returns {Promise<void>} Settles when all transitions have settled.
 */
function runLifecycleTransition(phase, nodes, details = {}) {
  const roots = nodes.filter((node) => node?.nodeType === 1);
  if (!roots.length || !lifecycleTransitions.size) return Promise.resolve();
  // A failing transition must not block DOM updates, but it should not fail silently either.
  /**
   * Log a failed lifecycle transition without interrupting the DOM update.
   */
  const report = (error) => console.error("Nodula: lifecycle transition failed.", error);
  return Promise.all(
    [...lifecycleTransitions].map((transition) => {
      try {
        return Promise.resolve(transition(phase, roots, details)).catch(report);
      } catch (error) {
        report(error);
        return undefined;
      }
    }),
  );
}

/**
 * Remove nodes after their leave transitions have finished.
 *
 * With no transitions registered, the nodes are removed at once.
 *
 * @param {Node[]} nodes
 * @param {object} [details] Transition details.
 * @param {(node: Node) => boolean} [canRemove] Lets the caller skip nodes that were re-inserted meanwhile.
 * @returns {Promise<void>}
 */
function removeAfterLeave(nodes, details = {}, canRemove = () => true) {
  /**
   * Remove each node that is still eligible.
   */
  const remove = () => {
    for (const node of nodes) if (canRemove(node)) node.remove();
  };
  if (!lifecycleTransitions.size) {
    remove();
    return Promise.resolve();
  }
  return runLifecycleTransition("leave", nodes, details).finally(() => {
    remove();
  });
}

/**
 * Get the binding record of a node, creating it on first use.
 *
 * The record holds the listeners, refs and property bindings that the node owns.
 *
 * @param {Node} node
 * @returns {{ target: Node, listeners: Array<[string, Function]>, refs: Function[], adopt: Function[], properties: Set<string> }}
 */
function binding(node) {
  let record = BINDINGS.get(node);
  if (!record) {
    record = { target: node, listeners: [], refs: [], adopt: [], properties: new Set() };
    BINDINGS.set(node, record);
  }
  return record;
}

/**
 * Create a props object whose keys can be read reactively, including keys added later.
 *
 * @param {object} initialProps
 * @returns {object} A proxy over the props.
 */
function createReactiveProps(initialProps) {
  const values = { ...initialProps };
  const readers = new Map();
  const [readKeys, setKeys] = signal(Object.keys(values));

  /**
   * Return the signal that tracks one prop, creating it on first use.
   *
   * @param {string} key
   */
  function readerFor(key) {
    if (!readers.has(key)) {
      readers.set(key, signal({ value: values[key], present: Object.hasOwn(values, key) }));
    }
    return readers.get(key);
  }

  return new Proxy(values, {
    /**
     * Proxy read trap. Reads a prop reactively, and records keys that are read before they exist.
     */
    get(target, key, receiver) {
      if (typeof key === "symbol") return Reflect.get(target, key, receiver);
      return readerFor(key)[0]().value;
    },
    /**
     * Proxy write trap. Updates a prop and notifies its readers and key enumeration.
     */
    set(target, key, value) {
      if (typeof key === "symbol") return Reflect.set(target, key, value);
      const existed = Object.hasOwn(target, key);
      if (existed && Object.is(target[key], value)) return true;
      target[key] = value;
      readerFor(key)[1](() => ({ value, present: true }));
      if (!existed) setKeys(Object.keys(target));
      return true;
    },
    /**
     * Proxy trap for `delete`. Removes a prop and notifies its readers.
     */
    deleteProperty(target, key) {
      if (!Object.hasOwn(target, key)) return true;
      delete target[key];
      readerFor(key)[1](() => ({ value: undefined, present: false }));
      setKeys(Object.keys(target));
      return true;
    },
    /**
     * Proxy trap for the `in` operator. Tracks whether a prop is present.
     */
    has(target, key) {
      if (typeof key !== "symbol") readerFor(key)[0]();
      return Reflect.has(target, key);
    },
    /**
     * Proxy trap for own-key enumeration. Tracks the key list.
     */
    ownKeys(target) {
      readKeys();
      return Reflect.ownKeys(target);
    },
  });
}

/**
 * Convert a kebab-case attribute or prop name to camelCase.
 *
 * @param {string} name
 * @returns {string}
 */
function customElementPropertyName(name) {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Make the DOM node `current` match `next` where that is safe, and return the node to keep.
 *
 * Compatible nodes are updated in place. Otherwise `next` replaces `current`, so element identity is kept only where the types match.
 *
 * @param {Node} current Node already in the DOM.
 * @param {Node} next Freshly rendered node.
 * @returns {Node} The node that should stay in the DOM.
 */
function reconcile(current, next) {
  if (current === next) return current;
  if (
    current.nodeType !== next.nodeType ||
    (current.nodeType === 1 &&
      (current.tagName !== next.tagName || current.namespaceURI !== next.namespaceURI))
  ) {
    current.replaceWith(next);
    return next;
  }

  if (current.nodeType === 3 || current.nodeType === 8) {
    if (current.data !== next.data) current.data = next.data;
  } else if (current.nodeType === 1) {
    for (const attribute of Array.from(current.attributes)) {
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
    const keyed = new Map(
      oldChildren
        .filter((node) => BINDINGS.get(node)?.key !== undefined)
        .map((node) => [BINDINGS.get(node).key, node]),
    );
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

/**
 * Convert a child value to a DOM node.
 *
 * Nodes pass through, components and arrays become fragments, and other values become text. `null`, `undefined` and
 * `false` become empty text.
 *
 * @param {unknown} value
 * @returns {Node}
 */
function toNode(value) {
  if (value instanceof Node) return value;
  if (Array.isArray(value) || value?.[COMPONENT]) {
    const container = document.createDocumentFragment();
    append(container, value);
    return container;
  }
  return document.createTextNode(value == null || value === false ? "" : String(value));
}

/** Collect the live nodes of an `each` row, from its first node to its last (inclusive). */
function rowNodes(row) {
  const nodes = [];
  for (let node = row.first; node; node = node.nextSibling) {
    nodes.push(node);
    if (node === row.last) break;
  }
  return nodes;
}

/**
 * Find one longest strictly increasing subsequence, as indices into `values`.
 *
 * Patience sorting with predecessor links, so it runs in O(n log n) for `each()` reorders.
 *
 * @param {number[]} values
 * @returns {Set<number>} Indices of the values in the subsequence.
 */
function longestIncreasingSubsequence(values) {
  // tails[length - 1] holds the index that ends the smallest increasing run of that length.
  const tails = [];
  const predecessor = [];
  values.forEach((value, index) => {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (values[tails[middle]] < value) low = middle + 1;
      else high = middle;
    }
    predecessor[index] = low > 0 ? tails[low - 1] : -1;
    tails[low] = index;
  });
  const chosen = new Set();
  for (let index = tails.at(-1) ?? -1; index >= 0; index = predecessor[index]) chosen.add(index);
  return chosen;
}

/**
 * Append a child value to a parent, handling arrays, reactive values, `each`, `when`, components and outlets.
 *
 * @param {Node} parent
 * @param {unknown} child
 */
function append(parent, child) {
  if (Array.isArray(child)) {
    child.forEach((item) => append(parent, item));
    return;
  }

  if (child?.[COMPONENT]) {
    const props = createReactiveProps(untrack(child.readProps));
    const slots = child.slots;
    const [node, dispose] = createRoot(
      () =>
        toNode(
          child.render({
            props,
            children: slots.default ? slots.default() : undefined,
            slots,
          }),
        ),
      { detached: true },
    );
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
    const start = document.createComment("nodula outlet start");
    const end = document.createComment("nodula outlet end");
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
        void removeAfterLeave(current.nodes, { type: "page" });
      }
      state.end.parentNode.insertBefore(node, state.end);
      state.current = { value, nodes };
      state.disposeCurrent = dispose;
      if (lifecycleTransitions.size) void runLifecycleTransition("enter", nodes, { type: "page" });
    });

    onCleanup(() => {
      state.active = false;
      state.disposeCurrent?.();
      for (const node of state.current?.nodes ?? []) node.remove();
    });
    binding(start).adopt.push((node) => {
      state.start = node;
    });
    binding(end).adopt.push((node) => {
      state.end = node;
    });
    return;
  }

  if (child?.[WHEN]) {
    const start = document.createComment("nodula if start");
    const end = document.createComment("nodula if end");
    parent.append(start, end);
    const state = { start, end, activeNodes: [] };
    let selected;
    let disposeBranch = null;

    effect(() => {
      const next = Boolean(child.condition());
      if (selected === next) return;
      selected = next;
      disposeBranch?.();
      // Read the nodes between the markers, not the mount-time snapshot, because a function child in the
      // branch may have replaced its nodes since then.
      const leavingNodes = [];
      for (let node = state.start.nextSibling; node !== state.end; node = node.nextSibling) leavingNodes.push(node);
      state.activeNodes = [];
      if (leavingNodes.length) {
        void removeAfterLeave(
          leavingNodes,
          { type: "conditional" },
          (node) => !state.activeNodes.includes(node),
        );
      }
      const render = next ? child.yes : child.no;
      if (!render) {
        disposeBranch = null;
        return;
      }
      const [branch, dispose] = untrack(() =>
        createRoot(
          () => {
            return toNode(render());
          },
          { detached: true },
        ),
      );
      const enteringNodes = branch.nodeType === 11 ? [...branch.childNodes] : [branch];
      state.end.parentNode.insertBefore(branch, state.end);
      state.activeNodes = enteringNodes;
      disposeBranch = dispose;
      if (lifecycleTransitions.size)
        void runLifecycleTransition("enter", enteringNodes, { type: "conditional" });
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
    binding(start).adopt.push((node) => {
      state.start = node;
    });
    binding(end).adopt.push((node) => {
      state.end = node;
    });
    return;
  }

  if (child?.[EACH]) {
    const start = document.createComment("nodula each start");
    const end = document.createComment("nodula each end");
    parent.append(start, end);
    const state = { parent, start, end };
    const rows = new Map();
    let previousIds = [];

    effect(() => {
      const values = child.items();
      const ids = values.map((item) => child.key(item));
      const seen = new Set();
      for (const id of ids) {
        if (seen.has(id)) throw new Error(`Duplicate list key: ${id}`);
        seen.add(id);
      }

      // Removed rows keep their nodes until removal (or a leave transition) finishes. They are
      // never anchors below, so leaving nodes sitting between live rows do not affect the order.
      const removed = [];
      for (const [id, row] of rows) {
        if (seen.has(id)) continue;
        removed.push([id, rowNodes(row)]);
        row.dispose();
        rows.delete(id);
      }

      // Rows already rendered keep their place if they lie in the longest run whose previous
      // positions increase. Every other row is moved, so each move is one insertBefore per node.
      const previousIndex = new Map(previousIds.map((id, index) => [id, index]));
      const survivors = ids.filter((id) => previousIndex.has(id));
      const stayed = longestIncreasingSubsequence(survivors.map((id) => previousIndex.get(id)));
      const kept = new Set(survivors.filter((_, index) => stayed.has(index)));

      const entering = [];
      values.forEach((item, index) => {
        const id = ids[index];
        const row = rows.get(id);
        if (row) {
          row.setItem(item);
          return;
        }
        const [readItem, setItem] = signal(item);
        const [node, dispose] = createRoot(() => toNode(child.render(readItem)), {
          detached: true,
        });
        // A fragment is emptied by its first insertion, so bracket it with markers
        // and treat everything between them (including dynamic content) as the row.
        const isFragment = node.nodeType === 11;
        const newRow = { first: node, last: node, dispose, setItem };
        if (isFragment) {
          newRow.first = document.createComment("nodula row start");
          newRow.last = document.createComment("nodula row end");
          node.prepend(newRow.first);
          node.append(newRow.last);
          // Keep the markers valid when reconcile() swaps them for already-mounted twins.
          binding(newRow.first).adopt.push((adopted) => {
            newRow.first = adopted;
          });
          binding(newRow.last).adopt.push((adopted) => {
            newRow.last = adopted;
          });
        } else {
          binding(node).adopt.push((adopted) => {
            newRow.first = adopted;
            newRow.last = adopted;
          });
        }
        binding(node).key = id;
        rows.set(id, newRow);
        entering.push(id);
      });

      // Walk backwards so each moved row can be placed before the first node of the row after it.
      let anchor = state.end;
      for (let index = ids.length - 1; index >= 0; index -= 1) {
        const row = rows.get(ids[index]);
        if (!kept.has(ids[index])) {
          for (const node of rowNodes(row)) state.parent.insertBefore(node, anchor);
        }
        anchor = row.first;
      }

      for (const id of entering) {
        if (lifecycleTransitions.size) {
          void runLifecycleTransition("enter", rowNodes(rows.get(id)), { type: "list", key: id });
        }
      }
      for (const [id, nodes] of removed) void removeAfterLeave(nodes, { type: "list", key: id });
      previousIds = ids;
    });

    onCleanup(() => {
      for (const row of rows.values()) row.dispose();
      rows.clear();
    });
    binding(parent).adopt.push((node) => {
      state.parent = node;
    });
    binding(start).adopt.push((node) => {
      state.start = node;
    });
    binding(end).adopt.push((node) => {
      state.end = node;
    });
    return;
  }

  if (typeof child === "function") {
    const anchor = document.createComment("nodula dynamic");
    parent.append(anchor);
    // `nodes` are the live top-level nodes of the output. `source` is the value the child returned last time.
    // `hooked` marks the nodes whose adoption already re-points `nodes`, so cached nodes do not add hooks again.
    const state = { anchor, nodes: [], source: null, hooked: new WeakSet() };
    let disposeCurrent = null;

    effect(() => {
      const [result, dispose] = createRoot(() => {
        const value = child();
        return value === null || (typeof value !== "object" && typeof value !== "function") ? value : toNode(value);
      }, { detached: true });
      // The same value is still mounted, so its root must stay alive. Disposing it would stop its bindings.
      if (state.nodes.length && result === state.source) {
        dispose();
        return;
      }
      disposeCurrent?.();
      disposeCurrent = dispose;
      state.source = result;
      // Text over a mounted text node only changes its data, so no node is built or reconciled.
      if (!(result instanceof Node) && state.nodes.length === 1 && state.nodes[0].nodeType === 3) {
        state.nodes[0].data = result == null || result === false ? "" : String(result);
        return;
      }
      const nextNode = result instanceof Node ? result : toNode(result);
      const previous = state.nodes;
      const nextNodes = nextNode.nodeType === 11 ? [...nextNode.childNodes] : [nextNode];
      let reference = state.anchor;
      state.nodes = nextNodes.map((next, index) => {
        if (!state.hooked.has(next)) {
          state.hooked.add(next);
          binding(next).adopt.push((adopted) => {
            state.nodes = state.nodes.map((node) => (node === next ? adopted : node));
          });
        }
        // Positional reuse keeps unchanged nodes in place. Extra nodes go after the previous one.
        const node = index < previous.length ? reconcile(previous[index], next) : next;
        if (index >= previous.length) reference.after(node);
        reference = node;
        return node;
      });
      for (const node of previous.slice(nextNodes.length)) node.remove();
    });

    onCleanup(() => {
      disposeCurrent?.();
    });
    binding(anchor).adopt.push((node) => {
      state.anchor = node;
    });
    return;
  }

  parent.append(toNode(child));
}

/**
 * Create a native element with reactive props, event listeners, bindings and children.
 *
 * Event props are `on:name` or `onName` function props. `ref` receives the element. `bind` syncs a `value`
 * or `checked` prop with a read and write pair. Function-valued props and children are reactive. Listeners,
 * refs and bindings are cleaned up with the surrounding owner.
 *
 * @param {string} tag Element name.
 * @param {object | null} [props]
 * @param {...unknown} children
 * @returns {HTMLElement}
 * @throws {Error} When called outside a root or effect, because there is no owner to register cleanup with.
 * @throws {TypeError} For a malformed `ref` or `bind`.
 */
export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  const record = binding(element);
  const bindings = [];
  const isCustomElement = tag.includes("-");

  for (const [key, value] of Object.entries(props ?? {})) {
    // Only `on:name` or `onName` are events, so bound attributes like `one` or `online` stay attributes.
    if (/^on(?::|[A-Z])/.test(key) && typeof value === "function") {
      const eventName = key.startsWith("on:") ? key.slice(3) : key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
      record.listeners.push([eventName, value]);
      onCleanup(() => record.target.removeEventListener(eventName, value));
      continue;
    }

    if (key === "ref") {
      if (typeof value !== "function")
        throw new TypeError("h() ref must be a function that receives the element.");
      value(element);
      record.refs.push(value);
      onCleanup(() => value(null));
      continue;
    }

    if (key === "show") {
      continue;
    }

    if (key === "bind") {
      if (!value || typeof value.read !== "function" || typeof value.write !== "function")
        throw new TypeError("h() bind needs { property, read, write } with read and write functions.");
      if (value.property !== "value" && value.property !== "checked")
        throw new TypeError('h() bind property must be "value" or "checked".');
      const { property, read, write } = value;
      const eventName = property === "checked" ? "change" : "input";
      /**
       * Re-apply one prop to the element when its reactive value changes.
       */
      const update = () => {
        record.target[property] = read();
      };
      bindings.push(update);
      /**
       * Write the element value to the bound signal when the control changes.
       */
      const listener = (event) => write(event.currentTarget[property]);
      element.addEventListener(eventName, listener);
      record.listeners.push([eventName, listener]);
      record.properties.add(property);
      onCleanup(() => record.target.removeEventListener(eventName, listener));
      continue;
    }

    const isForcedProperty = key.endsWith(".prop");
    const rawPropertyKey = isForcedProperty ? key.slice(0, -5) : key;
    /**
     * Re-apply one prop to the element when its reactive value changes.
     */
    const update = () => {
      const nextValue = typeof value === "function" ? value() : value;
      const target = record.target;
      const isObjectProperty =
        isCustomElement && nextValue !== null && typeof nextValue === "object";
      const isReactiveCustomProperty = isCustomElement && typeof value === "function";
      const propertyKey =
        isForcedProperty || isObjectProperty || isReactiveCustomProperty
          ? customElementPropertyName(rawPropertyKey)
          : rawPropertyKey;
      if (propertyKey === "className") target.className = nextValue ?? "";
      else if (propertyKey === "style" && typeof nextValue === "object")
        Object.assign(target.style, nextValue);
      else if (
        isForcedProperty ||
        isReactiveCustomProperty ||
        isObjectProperty ||
        (propertyKey in target && ["value", "checked", "disabled"].includes(propertyKey))
      ) {
        record.properties.add(propertyKey);
        target[propertyKey] = nextValue ?? (propertyKey === "value" ? "" : false);
      } else if (nextValue == null || nextValue === false) target.removeAttribute(propertyKey);
      else target.setAttribute(propertyKey, nextValue === true ? "" : String(nextValue));
    };

    if (typeof value === "function") effect(update);
    else update();
  }

  children.forEach((child) => append(element, child));
  if (Object.hasOwn(props ?? {}, "show")) {
    const value = props.show;
    const originalDisplay = element.style.display;
    /**
     * Re-apply one prop to the element when its reactive value changes.
     */
    const update = () => {
      record.target.style.display = (typeof value === "function" ? value() : value)
        ? originalDisplay
        : "none";
    };
    if (typeof value === "function") effect(update);
    else update();
  }
  for (const update of bindings) effect(update);
  return element;
}

/**
 * Group children into a DocumentFragment, for use where one node is required.
 *
 * @param {...unknown} children
 * @returns {DocumentFragment}
 */
export function fragment(...children) {
  const node = document.createDocumentFragment();
  children.forEach((child) => append(node, child));
  return node;
}

/**
 * Render a component into a target and return a function that removes it.
 *
 * @param {string | Element} target A selector or an element. Its children are replaced.
 * @param {() => Node} component Renders the component.
 * @returns {() => void} Removes the output and disposes the owned effects and listeners. Calling it again does nothing.
 * @throws {Error} If a selector matches no element.
 */
export function mount(target, component) {
  const container = typeof target === "string" ? document.querySelector(target) : target;
  if (!container) throw new Error(`Mount target not found: ${target}`);

  const [node, dispose] = createRoot(() => component());
  container.replaceChildren(node);
  return () => {
    dispose();
    node.remove();
  };
}

// Only changed rows are created or removed; unchanged nodes keep their identity.
/**
 * Render content inside an error boundary. If the content throws while it is created, the error is logged and
 * `fallback(error)` renders instead, so the failure does not take down the parent tree.
 *
 * Catches errors from the content and the child components it creates. It does not catch errors from later
 * reactive updates.
 *
 * @param {() => unknown} render Renders the protected content.
 * @param {(error: unknown) => unknown} fallback Renders the content shown after a failure.
 * @returns {Node} The content, or the fallback when the content throws.
 */
export function errorBoundary(render, fallback) {
  if (typeof render !== "function") throw new TypeError("errorBoundary render must be a function.");
  if (typeof fallback !== "function") throw new TypeError("errorBoundary fallback must be a function.");
  try {
    return createRoot(() => toNode(render()))[0];
  } catch (error) {
    console.error("errorBoundary: content failed to render.", error);
    return createRoot(() => toNode(fallback(error)))[0];
  }
}

/**
 * Render a keyed list into its own container element.
 *
 * Rows are reused by key, so existing row nodes are kept when the items change. Each row is rendered once per key.
 *
 * @param {() => T[]} items Accessor for the list.
 * @param {(item: T, index: number) => string | number} key Stable, unique key per item.
 * @param {(item: T, index: number) => Node} render Renders one row.
 * @returns {HTMLDivElement}
 * @throws {Error} For duplicate keys.
 */
export function list(items, key, render) {
  const container = document.createElement("div");
  const rows = new Map();
  let previousIds = [];

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

    // Rows already rendered keep their place if they lie in the longest run whose previous
    // positions increase. Every other row is moved, so each move is one insertBefore.
    const previousIndex = new Map(previousIds.map((id, index) => [id, index]));
    const survivors = ids.filter((id) => previousIndex.has(id));
    const stayed = longestIncreasingSubsequence(survivors.map((id) => previousIndex.get(id)));
    const kept = new Set(survivors.filter((_, index) => stayed.has(index)));

    values.forEach((item, index) => {
      const id = ids[index];
      if (rows.has(id)) return;
      const [node, dispose] = createRoot(() => render(item, index), { detached: true });
      rows.set(id, { node, dispose });
    });

    // Walk backwards so each moved row can be placed before the first node of the row after it.
    let anchor = null;
    for (let index = ids.length - 1; index >= 0; index -= 1) {
      const row = rows.get(ids[index]);
      if (!kept.has(ids[index])) container.insertBefore(row.node, anchor);
      anchor = row.node;
    }
    previousIds = ids;
  });

  onCleanup(() => {
    for (const row of rows.values()) row.dispose();
    rows.clear();
  });
  return container;
}

// Template loops receive an accessor so rows can react when an item is replaced by key.
/**
 * Describe a keyed list inside `h()` or compiled templates.
 *
 * Rows receive a reactive item accessor, so their fields can update without re-rendering.
 *
 * @param {() => T[]} items Accessor for the list.
 * @param {(item: T) => string | number} key Stable, unique key per item.
 * @param {(item: () => T) => unknown} render Renders one row from its item accessor.
 * @returns {object} A descriptor for the renderer.
 */
export function each(items, key, render) {
  return { [EACH]: true, items, key, render };
}

/**
 * Describe a conditional branch inside `h()` or compiled templates.
 *
 * @param {() => boolean} condition Accessor for the condition.
 * @param {() => unknown} yes Renders when the condition is true.
 * @param {() => unknown} [no] Renders when the condition is false.
 * @returns {object} A descriptor for the branch.
 */
export function when(condition, yes, no) {
  return { [WHEN]: true, condition, yes, no };
}

/** Mark a rendered page view for leave/enter handling when the view changes. */
export function outlet(view) {
  return { [OUTLET]: true, view };
}

/**
 * Render a named slot, or its fallback when the caller supplied none.
 *
 * @param {Record<string, unknown> | undefined} slots Slots passed to the component.
 * @param {string} name Slot name.
 * @param {() => unknown} fallback Renders the default content.
 * @returns {object} A descriptor for the slot.
 */
export function slot(slots, name, fallback) {
  const supplied = slots && Object.hasOwn(slots, name) ? slots[name] : undefined;
  return when(
    () => true,
    () => (supplied == null ? fallback() : typeof supplied === "function" ? supplied() : supplied),
  );
}

/** Describe an imported component with reactive props and supplied slots. */
export function component(render, readProps, slots = {}) {
  return { [COMPONENT]: true, render, readProps, slots };
}

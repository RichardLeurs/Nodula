// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { parseFragment } from "parse5";
import { createHash } from "node:crypto";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

/**
 * Generate the scope attribute name for a component file.
 *
 * The name is a short hash of the file id, so the same file always gets the same attribute.
 *
 * @param {string} id Component file path.
 * @returns {string} For example `data-nodula-scope-1a2b3c4d5e`.
 */
function scopeAttributeFor(id) {
  const hash = createHash("sha256").update(id).digest("hex").slice(0, 10);
  return `data-nodula-scope-${hash}`;
}

const DOCUMENT_ROOT_TAGS = new Set(["html", "body"]);

// :root, html and body sit outside every component, so a scope attribute could never match them.
/**
 * Whether a selector compound targets `html`, `body`, or `:root`.
 *
 * Those elements are outside every component, so their selectors are never scoped.
 *
 * @param {object[]} compound Parsed selector nodes.
 * @returns {boolean}
 */
function isDocumentRoot(compound) {
  return compound.some(
    (node) =>
      (node.type === "tag" && DOCUMENT_ROOT_TAGS.has(node.value.toLowerCase())) ||
      (node.type === "pseudo" && node.value === ":root"),
  );
}

/** Replace a `:global(...)` or `:deep(...)` pseudo in a compound with its inner selector nodes. */
function unwrapPseudo(compound, pseudo) {
  if (pseudo.nodes.length !== 1) throw new Error(`${pseudo.value}() accepts one selector.`);
  const index = compound.indexOf(pseudo);
  const inner = pseudo.nodes[0].nodes.map((node) => node.clone());
  return [...compound.slice(0, index), ...inner, ...compound.slice(index + 1)];
}

/**
 * Rewrite one CSS selector so only its last compound matches this component.
 *
 * Document roots stay global. `:global()` opts a part out of scoping. `:deep()` reaches elements
 * rendered by child components, so the scope attribute goes before it.
 *
 * @param {string} selector A single selector, not a selector list.
 * @param {string} attribute Scope attribute name, as `data-nodula-scope-…`.
 * @returns {string} The rewritten selector.
 */
function scopeSelector(selector, attribute) {
  const scopeNode = selectorParser.attribute({ attribute });
  const selectorNode = selectorParser().astSync(selector);

  selectorNode.each((currentSelector) => {
    // Split into compounds so attributes are placed by compound, not by shifting node indices.
    const parts = [];
    let compound = [];
    for (const node of currentSelector.nodes) {
      if (node.type === "combinator") {
        parts.push({ compound, combinator: node });
        compound = [];
      } else compound.push(node);
    }
    parts.push({ compound, combinator: null });

    let deepIndex = -1;
    parts.forEach((part, index) => {
      /**
       * Find the pseudo node with the given name in a compound.
       */
      const special = (name) =>
        part.compound.find((node) => node.type === "pseudo" && node.value === name);
      const global = special(":global");
      const deep = special(":deep");
      part.scopeable = !global && !deep && !isDocumentRoot(part.compound);
      if (global) part.compound = unwrapPseudo(part.compound, global);
      if (deep) {
        part.compound = unwrapPseudo(part.compound, deep);
        if (deepIndex < 0) deepIndex = index;
      }
    });

    // Scope only the last compound before any :deep(), so ancestors outside the component still match.
    const limit = deepIndex < 0 ? parts.length : deepIndex;
    const target = parts
      .slice(0, limit)
      .findLast((part) => part.scopeable && part.compound.length);
    if (target) {
      const pseudoElement = target.compound.findIndex(
        (node) => node.type === "pseudo" && node.value.startsWith("::"),
      );
      const at = pseudoElement < 0 ? target.compound.length : pseudoElement;
      target.compound.splice(at, 0, scopeNode.clone());
    } else if (deepIndex >= 0) {
      // A leading :deep() still needs an anchor inside the component.
      parts.unshift({
        compound: [scopeNode.clone()],
        combinator: selectorParser.combinator({ value: " " }),
      });
    }

    currentSelector.removeAll();
    for (const part of parts) {
      for (const node of part.compound) currentSelector.append(node);
      if (part.combinator) currentSelector.append(part.combinator);
    }
  });

  return selectorNode.toString();
}

/**
 * Scope every rule in a stylesheet to one component.
 *
 * Rules inside keyframes are left alone.
 *
 * @param {string} css Stylesheet source.
 * @param {string} attribute Scope attribute name.
 * @returns {string} The rewritten stylesheet.
 */
function scopeStyles(css, attribute) {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    let parent = rule.parent;
    while (parent && parent.type !== "root") {
      if (parent.type === "atrule" && /(?:^|-)keyframes$/i.test(parent.name)) return;
      parent = parent.parent;
    }
    rule.selector = rule.selectors.map((selector) => scopeSelector(selector, attribute)).join(", ");
  });
  return root.toString();
}

/**
 * Split a component file into its `<script>`, `<template>` and `<style>` blocks.
 *
 * Only those three top-level elements are allowed, with HTML comments, `//` line comments and blank lines between them.
 *
 * @param {string} source Component file source.
 * @param {string} componentName Basename, used in error messages.
 * @returns {{ scripts: string[], templates: object[], styles: Array<{ content: string, scoped: boolean, module: boolean }> }}
 * @throws {Error} For unexpected top-level elements, duplicate or invalid style attributes, or a template count other than one.
 */
function collectBlocks(source, componentName) {
  const document = parseFragment(source, { sourceCodeLocationInfo: true });
  const blocks = { scripts: [], templates: [], styles: [] };

  for (const node of document.childNodes) {
    // Blank lines and `//` line comments are allowed between the blocks, for example a copyright notice.
    if (node.nodeName === "#text" && !node.value.replace(/^[ \t]*\/\/.*$/gm, "").trim()) continue;
    // HTML comments are allowed above the blocks, for example a copyright notice.
    if (node.nodeName === "#comment") continue;
    const name = node.tagName;
    if (!["script", "template", "style"].includes(name)) {
      throw new Error(
        `${componentName}: unexpected top-level <${name ?? "node"}>; expected <script>, <template>, or <style>.`,
      );
    }
    const content = node.childNodes.map((child) => child.value ?? "").join("");
    if (name === "script") blocks.scripts.push(content);
    if (name === "template") blocks.templates.push(node);
    if (name === "style") {
      const scoped = node.attrs.some((attribute) => attribute.name === "scoped");
      const moduleAttribute = node.attrs.find((attribute) => attribute.name === "module");
      const module = Boolean(moduleAttribute);
      if (moduleAttribute?.value)
        throw new Error(`${componentName}: <style module> does not accept a custom mapping name.`);
      if (scoped && module)
        throw new Error(`${componentName}: <style> cannot combine "scoped" and "module".`);
      blocks.styles.push({ content, scoped, module });
    }
  }

  if (blocks.templates.length !== 1) {
    throw new Error(
      `${componentName}: expected exactly one <template> block, found ${blocks.templates.length}.`,
    );
  }
  if (blocks.scripts.length > 1 || blocks.styles.length > 1) {
    throw new Error(`${componentName}: only one <script> and one <style> block are supported.`);
  }
  for (const node of document.childNodes) {
    if (["script", "template", "style"].includes(node.tagName) && node.attrs.length) {
      const allowed =
        node.tagName === "script"
          ? ["setup"]
          : node.tagName === "style"
            ? ["scoped", "module"]
            : [];
      const unsupported = node.attrs.find((attribute) => !allowed.includes(attribute.name));
      if (unsupported)
        throw new Error(
          `${componentName}: unsupported <${node.tagName}> attribute "${unsupported.name}".`,
        );
    }
  }
  return blocks;
}

/**
 * Strip the optional braces from a template expression and check that it is not empty.
 *
 * @param {string} value Attribute or interpolation value.
 * @param {string} componentName Basename, used in error messages.
 * @param {string} context Attribute or directive name, used in error messages.
 * @returns {string} The trimmed JavaScript expression.
 * @throws {Error} If the expression is empty.
 */
function parseExpression(value, componentName, context) {
  const expression = value
    .trim()
    .replace(/^\{([\s\S]*)\}$/, "$1")
    .trim();
  if (!expression) throw new Error(`${componentName}: empty expression in ${context}.`);
  return expression;
}

/** Return the index of the `}` that closes a template-literal `${` interpolation starting at `index`. */
function findInterpolationEnd(expression, index) {
  let depth = 1;
  while (index < expression.length) {
    const character = expression[index];
    if (character === "'" || character === '"' || character === "`") {
      index = skipQuoted(expression, index);
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return index;
    index += 1;
  }
  return index;
}

/** Return the index just past the string or template literal that starts at `index`. */
function skipQuoted(expression, index) {
  const quote = expression[index++];
  while (index < expression.length) {
    const character = expression[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (quote === "`" && character === "$" && expression[index + 1] === "{") {
      index = findInterpolationEnd(expression, index + 2) + 1;
      continue;
    }
    index += 1;
    if (character === quote) break;
  }
  return index;
}

/**
 * Rewrite loop item references in a JavaScript expression to call their reactive accessors.
 *
 * Quoted text is kept as written. Object keys are not rewritten, while shorthand properties such as
 * `{ item }` expand to `{ item: accessor }`. Spreads are rewritten.
 *
 * @param {string} expression JavaScript expression.
 * @param {Map<string, string>} loopVariables Loop variable name to accessor expression.
 * @returns {string} The rewritten expression.
 */
function bindLoopVariables(expression, loopVariables) {
  let result = "";
  let index = 0;
  let previousSignificant = "";
  // Open brackets let us tell object literals ({ item }) from calls and arrays (f(a, item)).
  const brackets = [];

  while (index < expression.length) {
    const character = expression[index];

    // Template literals keep their text, but ${…} holds real expressions that need rewriting.
    if (character === "`") {
      let literal = "`";
      index += 1;
      while (index < expression.length) {
        const next = expression[index];
        if (next === "\\") {
          literal += expression.slice(index, index + 2);
          index += 2;
          continue;
        }
        if (next === "$" && expression[index + 1] === "{") {
          const end = findInterpolationEnd(expression, index + 2);
          literal += `\${${bindLoopVariables(expression.slice(index + 2, end), loopVariables)}}`;
          index = end + 1;
          continue;
        }
        literal += next;
        index += 1;
        if (next === "`") break;
      }
      result += literal;
      previousSignificant = "value";
      continue;
    }

    // Preserve quoted text so item names in class strings and labels remain literal.
    if (character === "'" || character === '"') {
      const start = index;
      index = skipQuoted(expression, index);
      result += expression.slice(start, index);
      previousSignificant = "value";
      continue;
    }

    if (/[a-zA-Z_$]/.test(character)) {
      const start = index++;
      while (index < expression.length && /[\w$]/.test(expression[index])) index += 1;
      const identifier = expression.slice(start, index);
      const accessor = previousSignificant === "." ? null : loopVariables.get(identifier);
      if (accessor) {
        const following = expression.slice(index).match(/^\s*(.)?/)[1];
        const inObjectLiteral =
          brackets.at(-1) === "{" && (previousSignificant === "{" || previousSignificant === ",");
        if (inObjectLiteral && following === ":") {
          // Object keys are names, not references to the loop variable.
          result += identifier;
        } else if (inObjectLiteral && (following === "}" || following === ",")) {
          // Expand { item } so the key keeps its name while the value reads the accessor.
          result += `${identifier}: ${accessor}`;
        } else {
          result += accessor;
          const call = expression.slice(index).match(/^\s*\(\s*\)/);
          if (call) index += call[0].length;
        }
      } else {
        result += identifier;
      }
      previousSignificant = "value";
      continue;
    }

    // Spread (`...item`) reads the variable; only a single `.` marks property access.
    if (expression.startsWith("...", index)) {
      result += "...";
      previousSignificant = "...";
      index += 3;
      continue;
    }

    if ("{([".includes(character)) brackets.push(character);
    else if ("})]".includes(character)) brackets.pop();

    result += character;
    if (!/\s/.test(character)) previousSignificant = character;
    index += 1;
  }
  return result;
}

/**
 * Compile text containing `{{ expression }}` placeholders into a render expression.
 *
 * A single placeholder compiles to its accessor. Mixed text compiles to a function that joins the parts.
 *
 * @param {string} text Text node value.
 * @param {string} componentName Basename, used in error messages.
 * @param {Map<string, string>} loopVariables Loop variable accessors in scope.
 * @returns {string} JavaScript source for the text node.
 */
function compileText(text, componentName, loopVariables) {
  const parts = [];
  const interpolation = /\{\{([\s\S]+?)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = interpolation.exec(text))) {
    if (match.index > lastIndex) parts.push(JSON.stringify(text.slice(lastIndex, match.index)));
    parts.push(
      `() => (${bindLoopVariables(parseExpression(match[1], componentName, "text interpolation"), loopVariables)})`,
    );
    lastIndex = interpolation.lastIndex;
  }
  if (lastIndex < text.length) parts.push(JSON.stringify(text.slice(lastIndex)));
  if (!parts.length) return JSON.stringify(text);
  if (parts.length === 1) return parts[0];
  return `() => [${parts.map((part) => `(${part})`).join(", ")}].map((part) => typeof part === 'function' ? part() : part).join('')`;
}

/**
 * Compile one element attribute or directive into an entry of the props object.
 *
 * Handles `@show`, `@ref`, `@on:event`, `@bind`, `bind:value`, `:attribute` and plain attributes.
 *
 * @param {{ name: string, value: string }} attribute Parsed attribute.
 * @param {string} componentName Basename, used in error messages.
 * @param {Map<string, string>} loopVariables Loop variable accessors in scope.
 * @returns {string | null} A props entry, or null when the attribute produces none.
 * @throws {Error} For malformed or unsupported directives.
 */
function compileAttribute(attribute, componentName, loopVariables) {
  const { name, value } = attribute;
  // @attrs marks the element that receives the caller's attributes; it is not an event listener.
  if (name === "@attrs") return null;
  if (name === "@show") {
    return `"show": () => (${bindLoopVariables(parseExpression(value, componentName, name), loopVariables)})`;
  }
  if (name === "@ref") {
    return `"ref": ${bindLoopVariables(parseExpression(value, componentName, name), loopVariables)}`;
  }
  if (name === "@slot" || name === "@on" || name === "@bind") {
    throw new Error(
      `${componentName}: ${name} requires ${name === "@slot" ? "a <slot> placeholder" : name === "@on" ? "an event name, e.g. @on:click" : "a control element"}.`,
    );
  }
  if (name.startsWith("@on:")) {
    const eventName = name.slice(4);
    if (!/^[a-z][\w-]*$/.test(eventName))
      throw new Error(`${componentName}: invalid event name in ${name}.`);
    const expression = bindLoopVariables(
      parseExpression(value, componentName, name),
      loopVariables,
    );
    const eventProp = eventName.includes("-")
      ? `on:${eventName}`
      : `on${eventName[0].toUpperCase()}${eventName.slice(1)}`;
    return `${JSON.stringify(eventProp)}: ($event) => (${expression})`;
  }
  if (name.startsWith("@bind:") || name.startsWith("bind:")) {
    const property = name.slice(name.indexOf(":") + 1);
    if (!["value", "checked"].includes(property))
      throw new Error(`${componentName}: ${name} only supports value or checked.`);
    const parts = value.split(",").map((part) => part.trim());
    if (parts.length !== 2 || parts.some((part) => !/^[\w$]+$/.test(part))) {
      throw new Error(
        `${componentName}: ${name} requires "getter, setter" (e.g. "draft, setDraft").`,
      );
    }
    const read = bindLoopVariables(parts[0], loopVariables);
    const write = bindLoopVariables(parts[1], loopVariables);
    return `"bind": { property: ${JSON.stringify(property)}, read: ${read}, write: ${write} }`;
  }
  if (name.startsWith("@") || name.startsWith("on:")) {
    const eventName = name.startsWith("@") ? name.slice(1) : name.slice(3);
    const expression = bindLoopVariables(
      parseExpression(value, componentName, name),
      loopVariables,
    );
    const eventProp = eventName.includes("-")
      ? `on:${eventName}`
      : `on${eventName[0]?.toUpperCase() ?? ""}${eventName.slice(1)}`;
    return `${JSON.stringify(eventProp)}: ($event) => (${expression})`;
  }
  if (name.startsWith(":")) {
    const rawName = name.slice(1);
    const propName = rawName.endsWith(".prop")
      ? rawName
      : rawName === "class"
        ? "className"
        : rawName;
    const expression = bindLoopVariables(
      parseExpression(value, componentName, name),
      loopVariables,
    );
    return `${JSON.stringify(propName)}: () => (${expression})`;
  }
  if (/\{\{|\}\}/.test(value)) {
    throw new Error(
      `${componentName}: interpolate dynamic attributes with :attribute="expression".`,
    );
  }
  const propName = name === "class" ? "className" : name;
  return `${JSON.stringify(propName)}: ${JSON.stringify(value)}`;
}

// Per-compile state. compileNodulaComponent saves and restores it, so a nested compile
// (for example from a tool that compiles an imported component mid-build) cannot clobber its caller.
let loopIndex = 0;
let usesWhen = false;
let usesFragment = false;
let usesSlot = false;
let usesOutlet = false;
let currentScopeAttribute = null;
let importedComponents = new Map();
// The element that receives caller attributes (@attrs, or the root of a component with a prop schema).
let attrsTarget = null;

/**
 * Capture the per-compile state so a nested compile can restore it.
 *
 * @returns {object}
 */
function snapshotCompileState() {
  return { loopIndex, usesWhen, usesFragment, usesSlot, usesOutlet, currentScopeAttribute, importedComponents, attrsTarget };
}

/**
 * Restore per-compile state captured by `snapshotCompileState`.
 *
 * @param {object} state
 */
function restoreCompileState(state) {
  ({ loopIndex, usesWhen, usesFragment, usesSlot, usesOutlet, currentScopeAttribute, importedComponents, attrsTarget } = state);
}

/**
 * Return the component identifier for an imported `.comp` tag, if the tag names one.
 *
 * @param {string} tagName Element tag name.
 * @returns {string | undefined}
 */
function componentNameForTag(tagName) {
  return importedComponents.get(tagName.toLowerCase());
}

/**
 * Compile one attribute of an imported component tag into a prop or callback prop.
 *
 * Directives that belong to the element (`@if`, `@else`) produce nothing. `@show` and `@ref` are element-only and throw.
 *
 * @param {{ name: string, value: string }} attribute Parsed attribute.
 * @param {string} componentName Basename, used in error messages.
 * @param {Map<string, string>} loopVariables Loop variable accessors in scope.
 * @returns {string | null}
 */
function compileComponentAttribute(attribute, componentName, loopVariables) {
  const { name, value } = attribute;
  if (["@if", "@else", "@attrs"].includes(name)) return null;
  if (name.startsWith(":")) {
    const propName = name.slice(1);
    if (!/^[a-zA-Z_$][\w$-]*$/.test(propName)) {
      throw new Error(`${componentName}: invalid component prop name "${propName}".`);
    }
    return `${JSON.stringify(propName)}: (${bindLoopVariables(parseExpression(value, componentName, name), loopVariables)})`;
  }
  // Without this check, @show and @ref would fall through to callback props and silently do nothing.
  if (name === "@show" || name === "@ref") {
    throw new Error(
      `${componentName}: ${name} is not supported on component tags; wrap the component in an element with ${name}, or ${name === "@show" ? "pass the condition as a prop" : "use a ref inside the component"}.`,
    );
  }
  if (name.startsWith("@") || name.startsWith("on:")) {
    if (name === "@on")
      throw new Error(`${componentName}: @on requires an event name, e.g. @on:save.`);
    const eventName = name.startsWith("@on:")
      ? name.slice(4)
      : name.startsWith("on:")
        ? name.slice(3)
        : name.slice(1);
    if (!/^[a-z][\w-]*$/.test(eventName))
      throw new Error(`${componentName}: invalid component event name in ${name}.`);
    const propName = `on${eventName[0].toUpperCase()}${eventName.slice(1)}`;
    const expression = bindLoopVariables(
      parseExpression(value, componentName, name),
      loopVariables,
    );
    return `${JSON.stringify(propName)}: ($event) => (${expression})`;
  }
  if (
    name === "@bind" ||
    name.startsWith("bind:") ||
    name.startsWith("@bind:") ||
    name.toLowerCase() === "use:visibleisland"
  ) {
    throw new Error(
      `${componentName}: native bindings and actions are not supported on component tags.`,
    );
  }
  return `${JSON.stringify(name)}: ${JSON.stringify(value)}`;
}

/**
 * Compile an imported component tag into a `component(...)` descriptor.
 *
 * Child nodes become the default slot, and `<slot @slot="name">` children become named slots.
 *
 * @param {object} node Parsed element node.
 * @param {string} importedName Identifier of the imported component.
 * @param {string} componentName Basename, used in error messages.
 * @param {Map<string, string>} loopVariables Loop variable accessors in scope.
 * @returns {string} JavaScript source for the descriptor.
 */
function compileComponentNode(node, importedName, componentName, loopVariables) {
  const props = node.attrs
    .filter((attribute) => !["each", "@for", "key", ":key"].includes(attribute.name))
    .map((attribute) => compileComponentAttribute(attribute, componentName, loopVariables))
    .filter(Boolean);
  // Caller attributes go first, so the tag's own props override them.
  if (node === attrsTarget) props.unshift("...attrs");
  const slots = new Map();
  const defaultChildren = [];

  for (const child of node.childNodes) {
    if (child.nodeName === "#text" && !child.value.trim()) continue;
    if (child.tagName === "template") {
      const slotAttributes = child.attrs.filter(
        (attribute) => attribute.name.startsWith("#") || attribute.name === "slot",
      );
      if (slotAttributes.length !== 1 || child.attrs.length !== 1) {
        throw new Error(
          `${componentName}: component child <template> requires exactly one #slot="name" or slot="name" attribute.`,
        );
      }
      const slotAttribute = slotAttributes[0];
      const slotName =
        slotAttribute.name === "slot" ? slotAttribute.value : slotAttribute.name.slice(1);
      if (!/^[\w-]+$/.test(slotName))
        throw new Error(`${componentName}: component slot requires a static name.`);
      if (slots.has(slotName))
        throw new Error(`${componentName}: duplicate component slot "${slotName}".`);
      slots.set(
        slotName,
        compileChildren(
          child.content?.childNodes ?? child.childNodes,
          componentName,
          loopVariables,
        ),
      );
      continue;
    }
    defaultChildren.push(compileNode(child, componentName, loopVariables));
  }

  const slotEntries = [];
  if (defaultChildren.length)
    slotEntries.push(`default: () => fragment(${defaultChildren.join(", ")})`);
  for (const [name, children] of slots) {
    slotEntries.push(`${JSON.stringify(name)}: () => fragment(${children.join(", ")})`);
  }
  usesFragment ||= slotEntries.length > 0;
  return `component(${importedName}, () => ({ ${props.join(", ")} }), { ${slotEntries.join(", ")} })`;
}

/**
 * Compile a list of sibling nodes, grouping adjacent `@if` / `@else` branches and keyed loops.
 *
 * @param {object[]} nodes Parsed sibling nodes.
 * @param {string} componentName Basename, used in error messages.
 * @param {Map<string, string>} loopVariables Loop variable accessors in scope.
 * @returns {string[]} JavaScript source for each child, with empty text removed.
 */
function compileChildren(nodes, componentName, loopVariables) {
  const children = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const condition = node.attrs?.find((attribute) => attribute.name === "@if");
    if (condition) {
      const expression = bindLoopVariables(
        parseExpression(condition.value, componentName, "@if"),
        loopVariables,
      );
      let elseIndex = index + 1;
      while (nodes[elseIndex]?.nodeName === "#text" && !nodes[elseIndex].value.trim())
        elseIndex += 1;
      const alternative = nodes[elseIndex]?.attrs?.find((attribute) => attribute.name === "@else");
      if (alternative && alternative.value.trim())
        throw new Error(`${componentName}: @else must not have a value.`);
      usesWhen = true;
      children.push(
        `when(() => (${expression}), () => ${compileNode(node, componentName, loopVariables)}${alternative ? `, () => ${compileNode(nodes[elseIndex], componentName, loopVariables, true)}` : ""})`,
      );
      if (alternative) index = elseIndex;
      continue;
    }
    const child = compileNode(node, componentName, loopVariables);
    if (child !== "null") children.push(child);
  }
  return children;
}

/**
 * Compile one parsed element or text node into a `h(…)` call or other render expression.
 *
 * Handles `@if`, `@for` / `each`, `<template>` fragments, `<slot>`, `<outlet>`, and imported component tags.
 *
 * @param {object} node Parsed node.
 * @param {string} componentName Basename, used in error messages.
 * @param {Map<string, string>} [loopVariables] Loop variable accessors in scope.
 * @param {boolean} [pairedElse] Whether this node is the `@else` branch of the preceding `@if`.
 * @returns {string} JavaScript source for the node.
 * @throws {Error} For directive combinations the compiler does not support.
 */
function compileNode(node, componentName, loopVariables = new Map(), pairedElse = false) {
  if (node.nodeName === "#text") return compileText(node.value, componentName, loopVariables);
  if (node.nodeName === "#comment") return "null";
  if (node.attrs?.some((attribute) => attribute.name === "@else") && !pairedElse) {
    throw new Error(`${componentName}: @else requires an adjacent @if sibling.`);
  }
  if (
    node.attrs?.some((attribute) => attribute.name === "@else") &&
    node.attrs.some((attribute) => attribute.name === "@if")
  ) {
    throw new Error(`${componentName}: @if and @else cannot be used on the same element.`);
  }
  if (
    node.attrs?.some((attribute) => attribute.name === "@if") &&
    node.attrs.some((attribute) => ["each", "@for"].includes(attribute.name))
  ) {
    throw new Error(`${componentName}: @if and a loop cannot be used on the same element.`);
  }
  if (
    node.attrs?.some((attribute) => attribute.name === "@else") &&
    node.attrs.some((attribute) => ["each", "@for"].includes(attribute.name))
  ) {
    throw new Error(`${componentName}: @else and a loop cannot be used on the same element.`);
  }
  if (node.tagName === "slot") {
    if (node.attrs.some((attribute) => attribute.name !== "@slot")) {
      throw new Error(`${componentName}: <slot> only accepts @slot="name".`);
    }
    const name = node.attrs.find((attribute) => attribute.name === "@slot")?.value ?? "default";
    if (!/^[\w-]+$/.test(name))
      throw new Error(`${componentName}: @slot requires a static slot name.`);
    usesSlot = true;
    usesFragment = true;
    return `slot(slots, ${JSON.stringify(name)}, () => fragment(${compileChildren(node.childNodes, componentName, loopVariables).join(", ")}))`;
  }
  if (node.attrs?.some((attribute) => attribute.name === "@slot")) {
    throw new Error(`${componentName}: @slot is only supported on <slot>.`);
  }
  if (node.tagName === "template") {
    if (!node.attrs.some((attribute) => ["@if", "@else"].includes(attribute.name))) {
      throw new Error(`${componentName}: <template> is only supported for conditional branches.`);
    }
    if (node.attrs.some((attribute) => !["@if", "@else"].includes(attribute.name))) {
      throw new Error(`${componentName}: unsupported attribute on conditional <template>.`);
    }
    usesFragment = true;
    return `fragment(${compileChildren(node.content?.childNodes ?? node.childNodes, componentName, loopVariables).join(", ")})`;
  }
  if (node.tagName === "outlet") {
    if (node.attrs.some((attribute) => attribute.name === "@for")) {
      throw new Error(`${componentName}: @for requires an element with a :key, not <outlet>.`);
    }
    const view = node.attrs.find((attribute) => attribute.name === ":view");
    if (!view) throw new Error(`${componentName}: <outlet> requires :view="expression".`);
    usesOutlet = true;
    return `outlet(() => (${bindLoopVariables(parseExpression(view.value, componentName, ":view"), loopVariables)}))`;
  }
  const eachAttribute = node.attrs.find((attribute) => ["each", "@for"].includes(attribute.name));
  if (
    node.attrs.some((attribute) => attribute.name === "each") &&
    node.attrs.some((attribute) => attribute.name === "@for")
  ) {
    throw new Error(`${componentName}: use either each or @for on an element, not both.`);
  }
  let itemName = null;
  let itemsExpression = null;
  let keyExpression = null;

  if (eachAttribute) {
    const match = eachAttribute.value.match(/^\s*([\w$]+)\s+(?:of|in)\s+([\s\S]+?)\s*$/);
    if (!match)
      throw new Error(
        `${componentName}: ${eachAttribute.name} must use the form ${eachAttribute.name}="item of items()".`,
      );
    itemName = match[1];
    itemsExpression = match[2];
    const keyAttribute = node.attrs.find(
      (attribute) =>
        attribute.name === ":key" || (eachAttribute.name === "each" && attribute.name === "key"),
    );
    if (!keyAttribute)
      throw new Error(
        `${componentName}: an element with ${eachAttribute.name}="…" must specify :key="…".`,
      );
    keyExpression = keyAttribute.value;
  }

  const childLoopVariables = new Map(loopVariables);
  let rowAccessor = null;
  let rowValue = null;
  if (eachAttribute) {
    rowAccessor = `__nodulaItem${loopIndex}`;
    rowValue = `__nodulaValue${loopIndex++}`;
    childLoopVariables.set(itemName, `${rowAccessor}()`);
  }

  const importedName = componentNameForTag(node.tagName);
  let element;
  if (importedName) {
    element = compileComponentNode(node, importedName, componentName, childLoopVariables);
  } else {
    const shorthand = node.attrs.find((attribute) => attribute.name === "@bind");
    const bindingAttributes = shorthand
      ? node.attrs.map((attribute) =>
          attribute === shorthand
            ? {
                ...attribute,
                name: `@bind:${node.tagName === "input" && node.attrs.some((item) => item.name === "type" && item.value === "checkbox") ? "checked" : "value"}`,
              }
            : attribute,
        )
      : node.attrs;
    const props = bindingAttributes
      .filter(
        (attribute) => !["each", "@for", "key", ":key", "@if", "@else"].includes(attribute.name),
      )
      .filter((attribute) => attribute.name.toLowerCase() !== "use:visibleisland")
      .map((attribute) => compileAttribute(attribute, componentName, childLoopVariables))
      .filter(Boolean);
    if (currentScopeAttribute) props.push(`${JSON.stringify(currentScopeAttribute)}: true`);
    const bindings = bindingAttributes.filter(
      (attribute) => attribute.name.startsWith("bind:") || attribute.name.startsWith("@bind:"),
    );
    if (
      bindings.length > 1 ||
      bindings.some((attribute) =>
        node.attrs.some(
          (other) => other.name === `:${attribute.name.slice(attribute.name.indexOf(":") + 1)}`,
        ),
      )
    ) {
      throw new Error(
        `${componentName}: only one binding per element is supported; do not combine it with a reactive property.`,
      );
    }
    if (bindings.length && !["input", "textarea", "select"].includes(node.tagName)) {
      throw new Error(`${componentName}: bindings require an input, textarea, or select element.`);
    }
    if (
      bindings.length &&
      bindings[0].name.endsWith(":checked") &&
      !(
        node.tagName === "input" &&
        node.attrs.some(
          (attribute) =>
            attribute.name === "type" && ["checkbox", "radio"].includes(attribute.value),
        )
      )
    ) {
      throw new Error(`${componentName}: bind:checked requires a checkbox or radio input.`);
    }
    if (
      bindings.length &&
      bindings[0].name.endsWith(":value") &&
      node.tagName === "input" &&
      node.attrs.some(
        (attribute) =>
          attribute.name === "type" && ["checkbox", "radio", "file"].includes(attribute.value),
      )
    ) {
      throw new Error(
        `${componentName}: bind:value requires a text-like input, textarea, or select.`,
      );
    }
    const islandAction = node.attrs.find(
      (attribute) => attribute.name.toLowerCase() === "use:visibleisland",
    );
    if (islandAction) {
      props.push(
        `"ref": (element) => { if (element) element.replaceChildren(${parseExpression(islandAction.value, componentName, "use:visibleIsland")}); }`,
      );
    }
    const children = compileChildren(node.childNodes, componentName, childLoopVariables);
    const ownProps = `{ ${props.join(", ")} }`;
    const elementProps = node === attrsTarget ? `mergeAttrs(attrs, ${ownProps})` : ownProps;
    element = `h(${JSON.stringify(node.tagName)}, ${elementProps}${children.length ? `, ${children.join(", ")}` : ""})`;
  }

  if (eachAttribute) {
    const key = bindLoopVariables(
      parseExpression(keyExpression, componentName, ":key"),
      new Map([...loopVariables, [itemName, rowValue]]),
    );
    return `each(() => (${bindLoopVariables(itemsExpression, loopVariables)}), (${rowValue}) => (${key}), (${rowAccessor}) => ${element})`;
  }
  return element;
}

/**
 * Remove the import statements from a component script and collect them.
 *
 * Handles multi-line named imports and side-effect imports. Imports of `.comp` files are recorded so their tags compile to components.
 *
 * @param {string} script Script source.
 * @returns {{ imports: string[], body: string, components: Map<string, string>, importsNodula: boolean }}
 */
function extractImports(script) {
  const imports = [];
  const components = new Map();
  const body = script.replace(
    // Covers multi-line named imports and side-effect imports (`import "x"`).
    /^[ \t]*import\s+(?:[\w$*{},\s]+?\s*\bfrom\s*)?['"][^'"\n]+['"][ \t]*;?[ \t]*$/gm,
    (statement) => {
      imports.push(statement.trim());
      const componentImport = statement.match(
        /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]+\.comp['"];?\s*$/,
      );
      if (componentImport) components.set(componentImport[1].toLowerCase(), componentImport[1]);
      // Framework components such as `import { Suspense } from 'nodula-framework/suspense'` are plain functions, not .comp files.
      const frameworkImport = statement.match(
        /^\s*import\s*\{([^}]*)\}\s*from\s+['"]nodula-framework\/[^'"]+['"];?\s*$/,
      );
      for (const name of frameworkImport?.[1].split(",").map((part) => part.trim()) ?? []) {
        if (/^[A-Z][\w$]*$/.test(name)) components.set(name.toLowerCase(), name);
      }
      return "";
    },
  );
  const importsNodula = imports.some((statement) => {
    const namedImports = statement.match(/^\s*import\s*\{([^}]*)\}\s*from/);
    return namedImports?.[1].split(",").some((specifier) => {
      const [imported] = specifier.trim().split(/\s+as\s+/);
      return imported === "Nodula";
    });
  });
  return { imports, body, components, importsNodula };
}

/**
 * Return the index of the `}` that closes the object literal opened at `open`.
 *
 * Strings, template literals and comments are skipped, so braces inside them do not end the literal early.
 * Regex literals with unbalanced brackets or quotes are not supported.
 *
 * @param {string} text Script source.
 * @param {number} open Index of the opening `{`.
 * @returns {number} Index of the closing `}`, or -1 when the literal is not closed.
 */
function findObjectEnd(text, open) {
  let depth = 0;
  let index = open;
  while (index < text.length) {
    const character = text[index];
    if (character === "'" || character === '"' || character === "`") {
      index = skipQuoted(text, index);
      continue;
    }
    if (character === "/" && text[index + 1] === "/") {
      const newline = text.indexOf("\n", index);
      index = newline === -1 ? text.length : newline;
      continue;
    }
    if (character === "/" && text[index + 1] === "*") {
      const commentEnd = text.indexOf("*/", index + 2);
      index = commentEnd === -1 ? text.length : commentEnd + 2;
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return index;
    index += 1;
  }
  return -1;
}

/**
 * Cut the `export const propSchema = {…}` statement out of a component script.
 *
 * The statement is moved to module scope by the caller, so the schema is created once rather than on every render.
 * Other top-level exports are rejected, since they would be invalid inside the component function.
 *
 * @param {string} body Script source without its imports.
 * @param {string} componentName Basename, used in error messages.
 * @returns {{ schema: string | null, body: string }} The object literal source, or null, and the script without the statement.
 * @throws {Error} For a schema in a .page, a schema that is not an object literal, or any other top-level export.
 */
function hoistPropSchema(body, componentName) {
  const isPage = componentName.endsWith(".page");
  const declaration = /^[ \t]*export\s+(?:const|let|var)\s+propSchema\b/m;
  const match = /^[ \t]*export\s+const\s+propSchema\s*=\s*\{/m.exec(body);
  let schema = null;
  let rest = body;
  if (declaration.test(body)) {
    if (isPage) throw new Error(`${componentName}: propSchema is only supported in .comp files.`);
    if (!match)
      throw new Error(`${componentName}: export const propSchema must be an object literal.`);
    const open = match.index + match[0].length - 1;
    const close = findObjectEnd(body, open);
    if (close === -1) throw new Error(`${componentName}: propSchema object is not closed.`);
    const end = close + 1 + (/^[ \t]*;?/.exec(body.slice(close + 1))[0].length);
    schema = body.slice(open, close + 1);
    rest = body.slice(0, match.index) + body.slice(end);
  }
  if (/^[ \t]*export\b/m.test(rest))
    throw new Error(
      `${componentName}: only export const propSchema is supported in <script>; other exports are not allowed.`,
    );
  return { schema, body: rest };
}

/**
 * Find the element that receives the caller's attributes: the one marked `@attrs`, or else the root when the
 * component declares a prop schema.
 *
 * @param {object[]} rootNodes Top-level template nodes, without empty text.
 * @param {string} componentName Basename, used in error messages.
 * @param {boolean} hasSchema Whether the script declares propSchema.
 * @returns {object | null} The receiving node, or null when the component has no schema.
 * @throws {Error} For @attrs with a value, without a schema, on a slot, template or outlet, inside a loop, or repeated; and
 *   for a schema whose root is text or an outlet, which cannot receive attributes.
 */
function findAttrsTarget(rootNodes, componentName, hasSchema) {
  const marked = [];
  /**
   * Collect the @attrs elements under `nodes`, rejecting placements the compiler cannot honour.
   *
   * @param {object[]} nodes
   * @param {boolean} insideLoop Whether an ancestor is a loop.
   */
  const visit = (nodes, insideLoop) => {
    for (const node of nodes) {
      const loop = node.attrs?.some((attribute) => ["each", "@for"].includes(attribute.name)) ?? false;
      const attribute = node.attrs?.find((item) => item.name === "@attrs");
      if (attribute) {
        if (attribute.value.trim())
          throw new Error(`${componentName}: @attrs does not take a value.`);
        if (!hasSchema)
          throw new Error(`${componentName}: @attrs requires export const propSchema in <script>.`);
        if (["slot", "template", "outlet"].includes(node.tagName))
          throw new Error(`${componentName}: @attrs is not supported on <${node.tagName}>.`);
        if (insideLoop || loop)
          throw new Error(`${componentName}: @attrs cannot be used inside a loop.`);
        marked.push(node);
      }
      visit(node.content?.childNodes ?? node.childNodes ?? [], insideLoop || loop);
    }
  };
  visit(rootNodes, false);
  if (marked.length > 1)
    throw new Error(`${componentName}: only one element can have @attrs; found ${marked.length}.`);
  if (marked.length) return marked[0];
  if (!hasSchema) return null;

  const root = rootNodes.find((node) => node.nodeName !== "#comment");
  if (!root || root.nodeName === "#text" || root.tagName === "outlet")
    throw new Error(
      `${componentName}: a component with propSchema needs an element or component root, or an @attrs element.`,
    );
  return root;
}

/**
 * Compile a `.page` or `.comp` file into a JavaScript module.
 *
 * The compile state is saved and restored, so a nested compile does not disturb its caller.
 *
 * @param {string} source File source.
 * @param {string} [id] File path, used for the scope attribute and error messages.
 * @returns {string} The generated module source.
 * @throws {Error} For invalid templates, directives or imports.
 */
export function compileNodulaComponent(source, id = "Anonymous.comp") {
  const saved = snapshotCompileState();
  try {
    return compileComponent(source, id);
  } finally {
    restoreCompileState(saved);
  }
}

/**
 * Compile a component file. Called by `compileNodulaComponent`, which manages the compile state.
 *
 * @param {string} source File source.
 * @param {string} id File path.
 * @returns {string} The generated module source.
 */
function compileComponent(source, id) {
  const componentName = id.split(/[\\/]/).pop();
  const blocks = collectBlocks(source, componentName);
  loopIndex = 0;
  usesWhen = false;
  usesFragment = false;
  usesSlot = false;
  usesOutlet = false;
  const styleBlock = blocks.styles[0];
  currentScopeAttribute = styleBlock?.scoped ? scopeAttributeFor(id) : null;
  const script = blocks.scripts[0] ?? "";
  const { imports, body: scriptBody, components, importsNodula } = extractImports(script);
  const { schema, body } = hoistPropSchema(scriptBody, componentName);
  importedComponents = components;
  const template = blocks.templates[0];
  const rootNodes = (template.content?.childNodes ?? template.childNodes).filter(
    (node) => node.nodeName !== "#text" || node.value.trim(),
  );
  if (rootNodes.some((node) => node.tagName === "slot")) {
    throw new Error(`${componentName}: <slot> must be inside the single root element.`);
  }
  if (
    rootNodes.some((node) =>
      node.attrs?.some((attribute) => ["@if", "@else", "@for"].includes(attribute.name)),
    )
  ) {
    throw new Error(
      `${componentName}: @if, @else, and @for must be inside the single root element.`,
    );
  }
  attrsTarget = findAttrsTarget(rootNodes, componentName, schema !== null);
  const roots = compileChildren(rootNodes, componentName, new Map()).filter(
    (node) => node !== '""',
  );
  if (roots.length !== 1) {
    throw new Error(
      `${componentName}: <template> must have exactly one root element; found ${roots.length}.`,
    );
  }
  const component =
    componentName.replace(/\.(?:page|comp)$/, "").replace(/[^a-zA-Z0-9_$]/g, "_") ||
    "NodulaComponent";
  const usesNodulaCss = /\bNodula\s*\.\s*css\s*\(/.test(script);
  const runtimeExports = [
    "h",
    ...(components.size ? ["component"] : []),
    ...(/\s(?:each|@for)\s*=/.test(source) ? ["each"] : []),
    ...(usesWhen ? ["when"] : []),
    ...(usesFragment ? ["fragment"] : []),
    ...(usesSlot ? ["slot"] : []),
    ...(usesOutlet ? ["outlet"] : []),
  ].join(", ");
  const generatedImports = [
    `import { ${runtimeExports} } from "nodula-framework";`,
    ...(usesNodulaCss && !importsNodula
      ? [`import { Nodula } from "nodula-framework/web-components";`]
      : []),
    ...(schema === null ? [] : [`import { withProps, mergeAttrs } from "nodula-framework/props";`]),
    ...imports,
  ];
  const styleImport =
    styleBlock && (styleBlock.module || styleBlock.content.trim())
      ? styleBlock.module
        ? `\nimport $style from ${JSON.stringify(`${id}.module.css?nodula-style-module`)};`
        : `\nimport ${JSON.stringify(`${id}?nodula-style${styleBlock.scoped ? "-scoped" : ""}`)};`
      : "";

  if (schema === null)
    return `${generatedImports.join("\n")}${styleImport}\nexport function ${component}({ params = {}, children, slots = {}, props = {} } = {}) {\n${body}\nreturn ${roots[0]};\n}\nexport default ${component};`;

  // The render function keeps the component's name, which withProps uses in warnings.
  return `${generatedImports.join("\n")}${styleImport}\nexport const propSchema = ${schema};\nfunction ${component}({ params = {}, children, slots = {}, props = {}, attrs = {} } = {}) {\n${body}\nreturn ${roots[0]};\n}\nconst __nodulaComponent = withProps(propSchema, ${component});\nexport { __nodulaComponent as ${component} };\nexport default __nodulaComponent;`;
}

/**
 * Compile the `<style>` block of a component file.
 *
 * `scoped` blocks are rewritten to the component’s scope attribute. `module` blocks are returned unchanged for Vite CSS Modules.
 *
 * @param {string} source File source.
 * @param {string} id File path.
 * @returns {{ css: string, scoped: boolean, attribute?: string, module?: boolean }}
 */
export function compileNodulaStyle(source, id) {
  const styleBlock = collectBlocks(source, id.split(/[\\/]/).pop()).styles[0];
  if (!styleBlock) return { css: "", scoped: false };
  if (styleBlock.module) return { css: styleBlock.content, scoped: false, module: true };
  if (!styleBlock.scoped) return { css: styleBlock.content, scoped: false };
  const attribute = scopeAttributeFor(id);
  return { css: scopeStyles(styleBlock.content, attribute), scoped: true, attribute };
}

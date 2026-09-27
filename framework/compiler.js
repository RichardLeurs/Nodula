import { parseFragment } from 'parse5';
import { createHash } from 'node:crypto';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

function scopeAttributeFor(id) {
  const hash = createHash('sha256').update(id).digest('hex').slice(0, 10);
  return `data-nodula-scope-${hash}`;
}

function scopeSelector(selector, attribute) {
  const scopeNode = selectorParser.attribute({ attribute });
  const selectorNode = selectorParser().astSync(selector);

  selectorNode.each((currentSelector) => {
    let compoundStart = 0;
    const compounds = [];
    currentSelector.each((node, index) => {
      if (node.type === 'combinator') {
        compounds.push([compoundStart, index]);
        compoundStart = index + 1;
      }
    });
    compounds.push([compoundStart, currentSelector.nodes.length]);

    for (const [start, end] of compounds) {
      if (start === end) continue;
      const nodes = currentSelector.nodes.slice(start, end);
      if (nodes.some((node) => node.type === 'attribute' && node.attribute === attribute)) continue;
      const pseudoElement = nodes.find((node) => node.type === 'pseudo' && node.value.startsWith('::'));
      if (pseudoElement) currentSelector.insertBefore(pseudoElement, scopeNode.clone());
      else currentSelector.insertAfter(nodes.at(-1), scopeNode.clone());
    }
  });

  return selectorNode.toString();
}

function scopeStyles(css, attribute) {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    let parent = rule.parent;
    while (parent && parent.type !== 'root') {
      if (parent.type === 'atrule' && /(?:^|-)keyframes$/i.test(parent.name)) return;
      parent = parent.parent;
    }
    rule.selector = rule.selectors.map((selector) => scopeSelector(selector, attribute)).join(', ');
  });
  return root.toString();
}

function collectBlocks(source, componentName) {
  const document = parseFragment(source, { sourceCodeLocationInfo: true });
  const blocks = { scripts: [], templates: [], styles: [] };

  for (const node of document.childNodes) {
    if (node.nodeName === '#text' && !node.value.trim()) continue;
    const name = node.tagName;
    if (!['script', 'template', 'style'].includes(name)) {
      throw new Error(`${componentName}: unexpected top-level <${name ?? 'node'}>; expected <script>, <template>, or <style>.`);
    }
    const content = node.childNodes.map((child) => child.value ?? '').join('');
    if (name === 'script') blocks.scripts.push(content);
    if (name === 'template') blocks.templates.push(node);
    if (name === 'style') blocks.styles.push({ content, scoped: node.attrs.some((attribute) => attribute.name === 'scoped') });
  }

  if (blocks.templates.length !== 1) {
    throw new Error(`${componentName}: expected exactly one <template> block, found ${blocks.templates.length}.`);
  }
  if (blocks.scripts.length > 1 || blocks.styles.length > 1) {
    throw new Error(`${componentName}: only one <script> and one <style> block are supported.`);
  }
  for (const node of document.childNodes) {
    if (['script', 'template', 'style'].includes(node.tagName) && node.attrs.length) {
      const allowed = node.tagName === 'script' ? ['setup'] : node.tagName === 'style' ? ['scoped'] : [];
      const unsupported = node.attrs.find((attribute) => !allowed.includes(attribute.name));
      if (unsupported) throw new Error(`${componentName}: unsupported <${node.tagName}> attribute "${unsupported.name}".`);
    }
  }
  return blocks;
}

function parseExpression(value, componentName, context) {
  const expression = value.trim().replace(/^\{([\s\S]*)\}$/, '$1').trim();
  if (!expression) throw new Error(`${componentName}: empty expression in ${context}.`);
  return expression;
}

function bindLoopVariables(expression, loopVariables) {
  let result = '';
  let index = 0;
  let previousSignificant = '';

  while (index < expression.length) {
    const character = expression[index];

    // Preserve quoted text so item names in class strings and labels remain literal.
    if (character === '\'' || character === '"' || character === '`') {
      const quote = character;
      const start = index++;
      while (index < expression.length) {
        if (expression[index] === '\\') {
          index += 2;
          continue;
        }
        if (expression[index++] === quote) break;
      }
      result += expression.slice(start, index);
      previousSignificant = 'value';
      continue;
    }

    if (/[a-zA-Z_$]/.test(character)) {
      const start = index++;
      while (index < expression.length && /[\w$]/.test(expression[index])) index += 1;
      const identifier = expression.slice(start, index);
      const accessor = previousSignificant === '.' ? null : loopVariables.get(identifier);
      if (accessor) {
        result += accessor;
        const call = expression.slice(index).match(/^\s*\(\s*\)/);
        if (call) index += call[0].length;
      } else {
        result += identifier;
      }
      previousSignificant = 'value';
      continue;
    }

    result += character;
    if (!/\s/.test(character)) previousSignificant = character;
    index += 1;
  }
  return result;
}

function compileText(text, componentName, loopVariables) {
  const parts = [];
  const interpolation = /\{\{([\s\S]+?)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = interpolation.exec(text))) {
    if (match.index > lastIndex) parts.push(JSON.stringify(text.slice(lastIndex, match.index)));
    parts.push(`() => (${bindLoopVariables(parseExpression(match[1], componentName, 'text interpolation'), loopVariables)})`);
    lastIndex = interpolation.lastIndex;
  }
  if (lastIndex < text.length) parts.push(JSON.stringify(text.slice(lastIndex)));
  if (!parts.length) return JSON.stringify(text);
  if (parts.length === 1 && typeof parts[0] === 'string' && parts[0].startsWith('() => ')) return parts[0];
  if (parts.length === 1) return parts[0];
  return `() => [${parts.map((part) => `(${part})`).join(', ')}].map((part) => typeof part === 'function' ? part() : part).join('')`;
}

function compileAttribute(attribute, componentName, loopVariables) {
  const { name, value } = attribute;
  if (name === '@show') {
    return `"show": () => (${bindLoopVariables(parseExpression(value, componentName, name), loopVariables)})`;
  }
  if (name === '@ref') {
    return `"ref": ${bindLoopVariables(parseExpression(value, componentName, name), loopVariables)}`;
  }
  if (name === '@slot' || name === '@on' || name === '@bind') {
    throw new Error(`${componentName}: ${name} requires ${name === '@slot' ? 'a <slot> placeholder' : name === '@on' ? 'an event name, e.g. @on:click' : 'a control element'}.`);
  }
  if (name.startsWith('@on:')) {
    const eventName = name.slice(4);
    if (!/^[a-z][\w-]*$/.test(eventName)) throw new Error(`${componentName}: invalid event name in ${name}.`);
    const expression = bindLoopVariables(parseExpression(value, componentName, name), loopVariables);
    const eventProp = eventName.includes('-') ? `on:${eventName}` : `on${eventName[0].toUpperCase()}${eventName.slice(1)}`;
    return `${JSON.stringify(eventProp)}: ($event) => (${expression})`;
  }
  if (name.startsWith('@bind:') || name.startsWith('bind:')) {
    const property = name.slice(name.indexOf(':') + 1);
    if (!['value', 'checked'].includes(property)) throw new Error(`${componentName}: ${name} only supports value or checked.`);
    const parts = value.split(',').map((part) => part.trim());
    if (parts.length !== 2 || parts.some((part) => !/^[\w$]+$/.test(part))) {
      throw new Error(`${componentName}: ${name} requires "getter, setter" (e.g. "draft, setDraft").`);
    }
    const read = bindLoopVariables(parts[0], loopVariables);
    const write = bindLoopVariables(parts[1], loopVariables);
    return `"bind": { property: ${JSON.stringify(property)}, read: ${read}, write: ${write} }`;
  }
  if (name.startsWith('@') || name.startsWith('on:')) {
    const eventName = name.startsWith('@') ? name.slice(1) : name.slice(3);
    const expression = bindLoopVariables(parseExpression(value, componentName, name), loopVariables);
    const eventProp = eventName.includes('-') ? `on:${eventName}` : `on${eventName[0]?.toUpperCase() ?? ''}${eventName.slice(1)}`;
    return `${JSON.stringify(eventProp)}: ($event) => (${expression})`;
  }
  if (name.startsWith(':')) {
    const rawName = name.slice(1);
    const propName = rawName.endsWith('.prop') ? rawName : rawName === 'class' ? 'className' : rawName;
    const expression = bindLoopVariables(parseExpression(value, componentName, name), loopVariables);
    return `${JSON.stringify(propName)}: () => (${expression})`;
  }
  if (/\{\{|\}\}/.test(value)) {
    throw new Error(`${componentName}: interpolate dynamic attributes with :attribute="expression".`);
  }
  const propName = name === 'class' ? 'className' : name;
  return `${JSON.stringify(propName)}: ${JSON.stringify(value)}`;
}

let loopIndex = 0;
let usesWhen = false;
let usesFragment = false;
let usesSlot = false;
let usesOutlet = false;
let currentScopeAttribute = null;
let importedComponents = new Map();

function componentNameForTag(tagName) {
  return importedComponents.get(tagName.toLowerCase());
}

function compileComponentAttribute(attribute, componentName, loopVariables) {
  const { name, value } = attribute;
  if (['@if', '@else'].includes(name)) return null;
  if (name.startsWith(':')) {
    const propName = name.slice(1);
    if (!/^[a-zA-Z_$][\w$-]*$/.test(propName)) {
      throw new Error(`${componentName}: invalid component prop name "${propName}".`);
    }
    return `${JSON.stringify(propName)}: (${bindLoopVariables(parseExpression(value, componentName, name), loopVariables)})`;
  }
  if (name.startsWith('@') || name.startsWith('on:')) {
    if (name === '@on') throw new Error(`${componentName}: @on requires an event name, e.g. @on:save.`);
    const eventName = name.startsWith('@on:') ? name.slice(4) : name.startsWith('on:') ? name.slice(3) : name.slice(1);
    if (!/^[a-z][\w-]*$/.test(eventName)) throw new Error(`${componentName}: invalid component event name in ${name}.`);
    const propName = `on${eventName[0].toUpperCase()}${eventName.slice(1)}`;
    const expression = bindLoopVariables(parseExpression(value, componentName, name), loopVariables);
    return `${JSON.stringify(propName)}: ($event) => (${expression})`;
  }
  if (name === '@bind' || name.startsWith('bind:') || name.startsWith('@bind:') || name.toLowerCase() === 'use:visibleisland') {
    throw new Error(`${componentName}: native bindings and actions are not supported on component tags.`);
  }
  return `${JSON.stringify(name)}: ${JSON.stringify(value)}`;
}

function compileComponentNode(node, importedName, componentName, loopVariables) {
  const props = node.attrs
    .filter((attribute) => !['each', '@for', 'key', ':key'].includes(attribute.name))
    .map((attribute) => compileComponentAttribute(attribute, componentName, loopVariables))
    .filter(Boolean);
  const slots = new Map();
  const defaultChildren = [];

  for (const child of node.childNodes) {
    if (child.nodeName === '#text' && !child.value.trim()) continue;
    if (child.tagName === 'template') {
      const slotAttributes = child.attrs.filter((attribute) => attribute.name.startsWith('#') || attribute.name === 'slot');
      if (slotAttributes.length !== 1 || child.attrs.length !== 1) {
        throw new Error(`${componentName}: component child <template> requires exactly one #slot="name" or slot="name" attribute.`);
      }
      const slotAttribute = slotAttributes[0];
      const slotName = slotAttribute.name === 'slot' ? slotAttribute.value : slotAttribute.name.slice(1);
      if (!/^[\w-]+$/.test(slotName)) throw new Error(`${componentName}: component slot requires a static name.`);
      if (slots.has(slotName)) throw new Error(`${componentName}: duplicate component slot "${slotName}".`);
      slots.set(slotName, compileChildren(child.content?.childNodes ?? child.childNodes, componentName, loopVariables));
      continue;
    }
    defaultChildren.push(compileNode(child, componentName, loopVariables));
  }

  const slotEntries = [];
  if (defaultChildren.length) slotEntries.push(`default: () => fragment(${defaultChildren.join(', ')})`);
  for (const [name, children] of slots) {
    slotEntries.push(`${JSON.stringify(name)}: () => fragment(${children.join(', ')})`);
  }
  usesFragment ||= slotEntries.length > 0;
  return `component(${importedName}, () => ({ ${props.join(', ')} }), { ${slotEntries.join(', ')} })`;
}

function compileChildren(nodes, componentName, loopVariables) {
  const children = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const condition = node.attrs?.find((attribute) => attribute.name === '@if');
    if (condition) {
      const expression = bindLoopVariables(parseExpression(condition.value, componentName, '@if'), loopVariables);
      let elseIndex = index + 1;
      while (nodes[elseIndex]?.nodeName === '#text' && !nodes[elseIndex].value.trim()) elseIndex += 1;
      const alternative = nodes[elseIndex]?.attrs?.find((attribute) => attribute.name === '@else');
      if (alternative && alternative.value.trim()) throw new Error(`${componentName}: @else must not have a value.`);
      usesWhen = true;
      children.push(`when(() => (${expression}), () => ${compileNode(node, componentName, loopVariables)}${alternative ? `, () => ${compileNode(nodes[elseIndex], componentName, loopVariables, true)}` : ''})`);
      if (alternative) index = elseIndex;
      continue;
    }
    const child = compileNode(node, componentName, loopVariables);
    if (child !== 'null') children.push(child);
  }
  return children;
}

function compileNode(node, componentName, loopVariables = new Map(), pairedElse = false) {
  if (node.nodeName === '#text') return compileText(node.value, componentName, loopVariables);
  if (node.nodeName === '#comment') return 'null';
  if (node.attrs?.some((attribute) => attribute.name === '@else') && !pairedElse) {
    throw new Error(`${componentName}: @else requires an adjacent @if sibling.`);
  }
  if (node.attrs?.some((attribute) => attribute.name === '@else') && node.attrs.some((attribute) => attribute.name === '@if')) {
    throw new Error(`${componentName}: @if and @else cannot be used on the same element.`);
  }
  if (node.attrs?.some((attribute) => attribute.name === '@if') && node.attrs.some((attribute) => ['each', '@for'].includes(attribute.name))) {
    throw new Error(`${componentName}: @if and a loop cannot be used on the same element.`);
  }
  if (node.attrs?.some((attribute) => attribute.name === '@else') && node.attrs.some((attribute) => ['each', '@for'].includes(attribute.name))) {
    throw new Error(`${componentName}: @else and a loop cannot be used on the same element.`);
  }
  if (node.tagName === 'slot') {
    if (node.attrs.some((attribute) => attribute.name !== '@slot')) {
      throw new Error(`${componentName}: <slot> only accepts @slot="name".`);
    }
    const name = node.attrs.find((attribute) => attribute.name === '@slot')?.value ?? 'default';
    if (!/^[\w-]+$/.test(name)) throw new Error(`${componentName}: @slot requires a static slot name.`);
    usesSlot = true;
    usesFragment = true;
    return `slot(slots, ${JSON.stringify(name)}, () => fragment(${compileChildren(node.childNodes, componentName, loopVariables).join(', ')}))`;
  }
  if (node.attrs?.some((attribute) => attribute.name === '@slot')) {
    throw new Error(`${componentName}: @slot is only supported on <slot>.`);
  }
  if (node.tagName === 'template') {
    if (!node.attrs.some((attribute) => ['@if', '@else'].includes(attribute.name))) {
      throw new Error(`${componentName}: <template> is only supported for conditional branches.`);
    }
    if (node.attrs.some((attribute) => !['@if', '@else'].includes(attribute.name))) {
      throw new Error(`${componentName}: unsupported attribute on conditional <template>.`);
    }
    usesFragment = true;
    return `fragment(${compileChildren(node.content?.childNodes ?? node.childNodes, componentName, loopVariables).join(', ')})`;
  }
  if (node.tagName === 'outlet') {
    if (node.attrs.some((attribute) => attribute.name === '@for')) {
      throw new Error(`${componentName}: @for requires an element with a :key, not <outlet>.`);
    }
    const view = node.attrs.find((attribute) => attribute.name === ':view');
    if (!view) throw new Error(`${componentName}: <outlet> requires :view="expression".`);
    usesOutlet = true;
    return `outlet(() => (${bindLoopVariables(parseExpression(view.value, componentName, ':view'), loopVariables)}))`;
  }
  const eachAttribute = node.attrs.find((attribute) => ['each', '@for'].includes(attribute.name));
  if (node.attrs.some((attribute) => attribute.name === 'each') && node.attrs.some((attribute) => attribute.name === '@for')) {
    throw new Error(`${componentName}: use either each or @for on an element, not both.`);
  }
  let itemName = null;
  let itemsExpression = null;
  let keyExpression = null;

  if (eachAttribute) {
    const match = eachAttribute.value.match(/^\s*([\w$]+)\s+(?:of|in)\s+([\s\S]+?)\s*$/);
    if (!match) throw new Error(`${componentName}: ${eachAttribute.name} must use the form ${eachAttribute.name}="item of items()".`);
    itemName = match[1];
    itemsExpression = match[2];
    const keyAttribute = node.attrs.find((attribute) => attribute.name === ':key' || (eachAttribute.name === 'each' && attribute.name === 'key'));
    if (!keyAttribute) throw new Error(`${componentName}: an element with ${eachAttribute.name}="…" must specify :key="…".`);
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
    const shorthand = node.attrs.find((attribute) => attribute.name === '@bind');
    const bindingAttributes = shorthand ? node.attrs.map((attribute) => attribute === shorthand ? {
      ...attribute, name: `@bind:${node.tagName === 'input' && node.attrs.some((item) => item.name === 'type' && item.value === 'checkbox') ? 'checked' : 'value'}`,
    } : attribute) : node.attrs;
    const props = bindingAttributes
      .filter((attribute) => !['each', '@for', 'key', ':key', '@if', '@else'].includes(attribute.name))
      .filter((attribute) => attribute.name.toLowerCase() !== 'use:visibleisland')
      .map((attribute) => compileAttribute(attribute, componentName, childLoopVariables))
      .filter(Boolean);
    if (currentScopeAttribute) props.push(`${JSON.stringify(currentScopeAttribute)}: true`);
    const bindings = bindingAttributes.filter((attribute) => attribute.name.startsWith('bind:') || attribute.name.startsWith('@bind:'));
    if (bindings.length > 1 || bindings.some((attribute) => node.attrs.some((other) => other.name === `:${attribute.name.slice(attribute.name.indexOf(':') + 1)}`))) {
      throw new Error(`${componentName}: only one binding per element is supported; do not combine it with a reactive property.`);
    }
    if (bindings.length && !['input', 'textarea', 'select'].includes(node.tagName)) {
      throw new Error(`${componentName}: bindings require an input, textarea, or select element.`);
    }
    if (bindings.length && bindings[0].name.endsWith(':checked') &&
        !(node.tagName === 'input' && node.attrs.some((attribute) => attribute.name === 'type' && ['checkbox', 'radio'].includes(attribute.value)))) {
      throw new Error(`${componentName}: bind:checked requires a checkbox or radio input.`);
    }
    if (bindings.length && bindings[0].name.endsWith(':value') && node.tagName === 'input' &&
        node.attrs.some((attribute) => attribute.name === 'type' && ['checkbox', 'radio', 'file'].includes(attribute.value))) {
      throw new Error(`${componentName}: bind:value requires a text-like input, textarea, or select.`);
    }
    const islandAction = node.attrs.find((attribute) => attribute.name.toLowerCase() === 'use:visibleisland');
    if (islandAction) {
      props.push(`"ref": (element) => { if (element) element.replaceChildren(${parseExpression(islandAction.value, componentName, 'use:visibleIsland')}); }`);
    }
    const children = compileChildren(node.childNodes, componentName, childLoopVariables);
    element = `h(${JSON.stringify(node.tagName)}, { ${props.join(', ')} }${children.length ? `, ${children.join(', ')}` : ''})`;
  }

  if (eachAttribute) {
    const key = bindLoopVariables(parseExpression(keyExpression, componentName, ':key'), new Map([...loopVariables, [itemName, rowValue]]));
    return `each(() => (${bindLoopVariables(itemsExpression, loopVariables)}), (${rowValue}) => (${key}), (${rowAccessor}) => ${element})`;
  }
  return element;
}

function extractImports(script) {
  const imports = [];
  const components = new Map();
  const body = script.replace(/^\s*import\s+[^\n;]+\s+from\s+['"][^'\"]+['"];?\s*$/gm, (statement) => {
    imports.push(statement.trim());
    const componentImport = statement.match(/^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'\"]+\.comp['"];?\s*$/);
    if (componentImport) components.set(componentImport[1].toLowerCase(), componentImport[1]);
    return '';
  });
  const importsNodula = imports.some((statement) => {
    const namedImports = statement.match(/^\s*import\s*\{([^}]*)\}\s*from/);
    return namedImports?.[1].split(',').some((specifier) => {
      const [imported] = specifier.trim().split(/\s+as\s+/);
      return imported === 'Nodula';
    });
  });
  return { imports, body, components, importsNodula };
}

export function compileNodulaComponent(source, id = 'Anonymous.comp') {
  const componentName = id.split(/[\\/]/).pop();
  const blocks = collectBlocks(source, componentName);
  loopIndex = 0;
  usesWhen = false;
  usesFragment = false;
  usesSlot = false;
  usesOutlet = false;
  const styleBlock = blocks.styles[0];
  currentScopeAttribute = styleBlock?.scoped ? scopeAttributeFor(id) : null;
  const script = blocks.scripts[0] ?? '';
  const { imports, body, components, importsNodula } = extractImports(script);
  importedComponents = components;
  const template = blocks.templates[0];
  const rootNodes = (template.content?.childNodes ?? template.childNodes)
    .filter((node) => node.nodeName !== '#text' || node.value.trim());
  if (rootNodes.some((node) => node.tagName === 'slot')) {
    throw new Error(`${componentName}: <slot> must be inside the single root element.`);
  }
  if (rootNodes.some((node) => node.attrs?.some((attribute) => ['@if', '@else', '@for'].includes(attribute.name)))) {
    throw new Error(`${componentName}: @if, @else, and @for must be inside the single root element.`);
  }
  const roots = compileChildren(rootNodes, componentName, new Map()).filter((node) => node !== '""');
  if (roots.length !== 1) {
    throw new Error(`${componentName}: <template> must have exactly one root element; found ${roots.length}.`);
  }
  const component = componentName.replace(/\.(?:page|comp)$/, '').replace(/[^a-zA-Z0-9_$]/g, '_') || 'NodulaComponent';
  const usesNodulaCss = /\bNodula\s*\.\s*css\s*\(/.test(script);
  const runtimeExports = ['h', ...(usesNodulaCss && !importsNodula ? ['Nodula'] : []), ...(components.size ? ['component'] : []), ...(/\s(?:each|@for)\s*=/.test(source) ? ['each'] : []), ...(usesWhen ? ['when'] : []), ...(usesFragment ? ['fragment'] : []), ...(usesSlot ? ['slot'] : []), ...(usesOutlet ? ['outlet'] : [])].join(', ');
  const generatedImports = [`import { ${runtimeExports} } from "nodula-framework";`, ...imports];
  const styleImport = styleBlock?.content.trim()
    ? `\nimport ${JSON.stringify(`${id}?nodula-style${styleBlock.scoped ? '-scoped' : ''}`)};`
    : '';

  return `${generatedImports.join('\n')}${styleImport}\nexport function ${component}({ params = {}, children, slots = {}, props = {} } = {}) {\n${body}\nreturn ${roots[0]};\n}\nexport default ${component};`;
}

export function compileNodulaStyle(source, id) {
  const styleBlock = collectBlocks(source, id.split(/[\\/]/).pop()).styles[0];
  if (!styleBlock) return { css: '', scoped: false };
  if (!styleBlock.scoped) return { css: styleBlock.content, scoped: false };
  const attribute = scopeAttributeFor(id);
  return { css: scopeStyles(styleBlock.content, attribute), scoped: true, attribute };
}
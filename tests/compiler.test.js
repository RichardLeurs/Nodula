import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compileNodulaComponent, compileNodulaStyle } from '../framework/compiler.js';

describe('Nodula single-file component compiler', () => {
  it('compiles conditional elements and adjacent else branches without treating them as events', () => {
    const output = compileNodulaComponent('<template><div><p @if="online()">Online</p> \n <p @else>Offline</p><span>After</span></div></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/Status.comp');
    assert.match(output, /import \{ h, when \}/);
    assert.match(output, /when\(\(\) => \(online\(\)\), \(\) => h\("p", \{  \}, "Online"\), \(\) => h\("p", \{  \}, "Offline"\)\)/);
    assert.match(output, /h\("span", \{  \}, "After"\)/);
    assert.doesNotMatch(output, /"onIf"|"onElse"/);
  });

  it('compiles conditional template blocks and keeps one-root validation', () => {
    const output = compileNodulaComponent('<template><div><template @if="ready()"><b>One</b><i>Two</i></template><template @else><p>Waiting</p></template></div></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/Status.comp');
    assert.match(output, /import \{ h, when, fragment \}/);
    assert.match(output, /when\(\(\) => \(ready\(\)\), \(\) => fragment\(h\("b"/);
    assert.match(output, /\(\) => fragment\(h\("p"/);
    assert.throws(() => compileNodulaComponent('<template><p @if="ready()">Yes</p></template>', 'Root.comp'), /single root element/);
  });

  it('rejects misplaced else and incompatible conditional syntax', () => {
    assert.throws(() => compileNodulaComponent('<template><div><p @else>No</p></div></template>', 'Status.comp'), /adjacent @if/);
    assert.throws(() => compileNodulaComponent('<template><div><p @if="ready()"></p><span></span><p @else>No</p></div></template>', 'Status.comp'), /adjacent @if/);
    assert.throws(() => compileNodulaComponent('<template><div><p @if="ready()"></p><p @else="other()">No</p></div></template>', 'Status.comp'), /@else must not have a value/);
    assert.throws(() => compileNodulaComponent('<template><div><p @if="ready()" each="item of items()" :key="item.id"></p></div></template>', 'Status.comp'), /@if and a loop/);
  });
  it('compiles keyed @for rows and nested loops using reactive item accessors', () => {
    const output = compileNodulaComponent('<template><ul><li @for="group of groups()" :key="group.id"><span>{{ group.name }}</span><b @for="item of group.items" :key="item.id" :title="item().name">{{ item.name }}</b></li></ul></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/Rows.comp');
    assert.match(output, /import \{ h, each \}/);
    assert.match(output, /each\(\(\) => \(groups\(\)\)/);
    assert.match(output, /each\(\(\) => \(__nodulaItem0\(\)\.items\)/);
    assert.match(output, /__nodulaItem1\(\)\.name/);
    assert.doesNotMatch(output, /"onFor"|"@for"/);
  });

  it('rejects missing keys, conflicting directives and malformed @for expressions', () => {
    const compile = (markup) => compileNodulaComponent(`<template><ul>${markup}</ul></template>`, 'Rows.comp');
    assert.throws(() => compile('<li @for="item of items()">{{ item.name }}</li>'), /@for.*:key/);
    assert.throws(() => compile('<li @for="item of items()" key="item.id"></li>'), /@for.*:key/);
    assert.throws(() => compile('<li @for="items()" :key="item.id"></li>'), /@for must use the form/);
    assert.throws(() => compile('<li @for="item of items()" each="item of items()" :key="item.id"></li>'), /either each or @for/);
    assert.throws(() => compile('<li @if="ready()" @for="item of items()" :key="item.id"></li>'), /@if and a loop/);
    assert.throws(() => compile('<li @else @for="item of items()" :key="item.id"></li>'), /@else requires an adjacent @if/);
    assert.throws(() => compileNodulaComponent('<template><li @for="item of items()" :key="item.id"></li></template>', 'Rows.comp'), /single root element/);
  });
  it('compiles show, ref, explicit events, and both binding spellings', () => {
    const output = compileNodulaComponent('<template><section><p @show="visible()" @ref="setParagraph" @on:click="clicked($event)">Hi</p><input @bind="name, setName" /><input type="checkbox" bind:checked="done, setDone" /><textarea bind:value="name, setName"></textarea></section></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/Directives.comp');
    assert.match(output, /"show": \(\) => \(visible\(\)\)/);
    assert.match(output, /"ref": setParagraph/);
    assert.match(output, /"onClick": \(\$event\) => \(clicked\(\$event\)\)/);
    assert.match(output, /"bind": \{ property: "value", read: name, write: setName \}/);
    assert.match(output, /"bind": \{ property: "checked", read: done, write: setDone \}/);
    assert.doesNotMatch(output, /"onShow"|"onBind"|"onRef"/);
  });

  it('compiles named and default slots with fallback content', () => {
    const output = compileNodulaComponent('<template><article><slot @slot="header"><h2>Fallback title</h2></slot><slot><p>Fallback body</p></slot></article></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/Panel.comp');
    assert.match(output, /import \{ h, fragment, slot \}/);
    assert.match(output, /slot\(slots, "header", \(\) => fragment\(h\("h2"/);
    assert.match(output, /slot\(slots, "default", \(\) => fragment\(h\("p"/);
  });

  it('rejects unsupported directive shapes instead of emitting inert attributes', () => {
    const compile = (markup) => compileNodulaComponent(`<template><div>${markup}</div></template>`, 'Invalid.comp');
    assert.throws(() => compile('<span @on="clicked($event)"></span>'), /@on requires an event name/);
    assert.throws(() => compile('<span @slot="header"></span>'), /@slot is only supported on <slot>/);
    assert.throws(() => compile('<input @bind:value="name" />'), /getter, setter/);
    assert.throws(() => compile('<input bind:foo="name, setName" />'), /only supports value or checked/);
    assert.throws(() => compile('<input @bind="name, setName" :value="name()" />'), /do not combine/);
    assert.throws(() => compile('<span bind:value="name, setName"></span>'), /require an input/);
    assert.throws(() => compile('<input type="text" bind:checked="done, setDone" />'), /checkbox or radio/);
    assert.throws(() => compile('<input type="checkbox" bind:value="name, setName" />'), /text-like input/);
    assert.throws(() => compileNodulaComponent('<template><slot @slot="header">Fallback</slot></template>', 'Invalid.comp'), /inside the single root element/);
  });
  it('exposes route params and layout children in compiled templates', () => {
    const page = compileNodulaComponent('<template><h1>{{ params.id }}</h1></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/routes/ideas/[id].comp');
    const layout = compileNodulaComponent('<template><main><outlet :view="children" /></main></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/routes/ideas/layout.comp');
    assert.match(page, /function \w+\(\{ params = \{\}, children, slots = \{\}, props = \{\} \} = \{\}\)/);
    assert.match(page, /params\.id/);
    assert.match(layout, /outlet\(\(\) => \(children\)\)/);
  });

  it('compiles outlets through the optional lifecycle-aware outlet helper', () => {
    const output = compileNodulaComponent('<template><main><outlet :view="router.view()" /></main></template>', 'Layout.comp');

    assert.match(output, /import \{ h, outlet \} from "nodula-framework"/);
    assert.match(output, /outlet\(\(\) => \(router\.view\(\)\)\)/);
  });
  it('keeps siblings after a component outlet with an explicit closing tag', () => {
    const output = compileNodulaComponent('<template><div><outlet :view="DemoCounter()"></outlet><article class="ideas-card">Ideas</article></div></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/routes/index.comp');
    assert.match(output, /\(\) => \(DemoCounter\(\)\)/);
    assert.match(output, /h\("article", \{ "className": "ideas-card" \}, "Ideas"\)/);
  });
  it('compiles imported component tags with props, events, default children, and named slots', () => {
    const output = compileNodulaComponent(`
      <script setup>
      import CardPanel from './CardPanel.comp';
      const [title, setTitle] = signal('Reactive title');
      </script>
      <template><main><CardPanel title="Static title" :subtitle="title()" @save="save($event)"><span>Default content</span><template #heading><b>Named heading</b></template></CardPanel></main></template>
    `, '/Users/richardleurs/Documents/Webserver/framework/src app/Consumer.comp');

    assert.match(output, /import CardPanel from '\.\/CardPanel\.comp'/);
    assert.match(output, /component\(CardPanel, \(\) => \(\{ "title": "Static title", "subtitle": \(title\(\)\), "onSave": \(\$event\) => \(save\(\$event\)\) \}\), \{ default: \(\) => fragment/);
    assert.match(output, /"heading": \(\) => fragment\(h\("b"/);
    assert.match(output, /props = \{\}/);
  });

  it('recognizes .comp imports as components without classifying .page imports as components', () => {
    const componentOutput = compileNodulaComponent(`
      <script setup>import Card from './Card.comp';</script>
      <template><main><Card /></main></template>
    `, 'Consumer.comp');
    const pageOutput = compileNodulaComponent(`
      <script setup>import Card from './Card.page';</script>
      <template><main><Card /></main></template>
    `, 'Consumer.comp');

    assert.match(componentOutput, /import \{ h, component \}/);
    assert.match(componentOutput, /import Card from '\.\/Card\.comp'/);
    assert.match(pageOutput, /import \{ h \}/);
    assert.doesNotMatch(pageOutput, /import \{ h, component \}/);
  });
  it('rejects malformed and duplicate named component slots', () => {
    const source = (children) => `<script setup>import Panel from './Panel.comp';</script><template><main><Panel>${children}</Panel></main></template>`;
    assert.throws(() => compileNodulaComponent(source('<template>Missing name</template>'), 'Consumer.comp'), /component child <template> requires exactly one/);
    assert.throws(() => compileNodulaComponent(source('<template #title>One</template><template #title>Two</template>'), 'Consumer.comp'), /duplicate component slot/);
  });
  it('compiles script setup, HTML, text interpolation, bindings, events, and styles', () => {
    const output = compileNodulaComponent(`
      <script setup>
      import { signal } from './state.js';
      const [count, setCount] = signal(0);
      </script>
      <template><button :title="String(count())" @click="setCount(count() + 1)">Count: {{ count() }}</button></template>
      <style>.counter { color: green; }</style>
    `, '/Users/richardleurs/Documents/Webserver/framework/src app/Counter.comp');

    assert.match(output, /import \{ h \} from "nodula-framework"/);
    assert.match(output, /import \{ signal \} from '\.\/state\.js'/);
    assert.match(output, /title.*\(\) => \(String\(count\(\)\)\)/);
    assert.match(output, /onClick.*\$event.*setCount/);
    assert.match(output, /Count: /);
    assert.match(output, /\(\(\) => \(count\(\)\)\)/);
    assert.match(output, /nodula-style/);
  });

  it('compiles native custom-element reactive properties and dashed custom events', () => {
    const output = compileNodulaComponent(`<script setup>const payload = { id: 1 }; const save = (event) => event;</script><template><x-data-panel :payload="payload" :plain.prop="payload" @selection-change="save($event)"></x-data-panel></template>`, 'CustomElementConsumer.comp');
    assert.match(output, /"payload": \(\) => \(payload\)/);
    assert.match(output, /"plain\.prop": \(\) => \(payload\)/);
    assert.match(output, /"on:selection-change": \(\$event\) => \(save\(\$event\)\)/);
  });

  it('adds the Nodula stylesheet helper when a component script uses Nodula.css', () => {
    const source = '<script setup>Nodula.css("/assets/app.css");</script><template><main>Ready</main></template>';
    const output = compileNodulaComponent(source, 'Styles.comp');
    assert.match(output, /import \{ h, Nodula \} from "nodula-framework"/);
    assert.match(output, /Nodula\.css\("\/assets\/app\.css"\)/);

    const explicitlyImported = compileNodulaComponent(`<script setup>
      import { Nodula } from "nodula-framework";
      Nodula.css("/assets/app.css");
      </script><template><main>Ready</main></template>`, 'ExplicitStyles.comp');
    assert.match(explicitlyImported, /^import \{ h \} from "nodula-framework"/);
    assert.match(explicitlyImported, /import \{ Nodula \} from "nodula-framework"/);
  });

  it('scopes component selectors while leaving global styles unchanged', () => {
    const source = '<template><section class="card"><p class="copy">Hello</p></section></template><style scoped>.card, .copy:hover { color: red; } @media (min-width: 2px) { .card .copy { color: blue; } } @keyframes fade { from { opacity: 0; } to { opacity: 1; } }</style>';
    const id = '/Users/richardleurs/Documents/Webserver/framework/tests/fixtures/ScopedPanel.comp';
    const output = compileNodulaComponent(source, id);
    const style = compileNodulaStyle(source, id);

    assert.match(output, /data-nodula-scope-[a-f0-9]{10}/);
    assert.match(output, /\?nodula-style-scoped/);
    assert.match(style.css, /\.card\[data-nodula-scope-[a-f0-9]{10}\]/);
    assert.match(style.css, /\.card\[data-nodula-scope-[a-f0-9]{10}\] \[data-nodula-scope-[a-f0-9]{10}\]\.copy/);
    assert.match(style.css, /@media \(min-width: 2px\)/);
    assert.match(style.css, /@keyframes fade \{ from \{ opacity: 0; \} to \{ opacity: 1; \} \}/);

    const globalSource = source.replace('<style scoped>', '<style>');
    assert.deepEqual(compileNodulaStyle(globalSource, id), {
      css: '.card, .copy:hover { color: red; } @media (min-width: 2px) { .card .copy { color: blue; } } @keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
      scoped: false,
    });
  });

  it('rejects unsupported style block attributes', () => {
    assert.throws(() => compileNodulaComponent('<template><div /></template><style module>.x { color: red; }</style>', 'Style.comp'), /unsupported <style> attribute "module"/);
  });

  it('reports missing templates and invalid attribute binding clearly', () => {
    assert.throws(() => compileNodulaComponent('<script setup>const x = 1;</script>', 'NoTemplate.comp'), /expected exactly one <template>/);
    assert.throws(() => compileNodulaComponent('<template><input bind:value="name" /></template>', 'Binding.comp'), /getter, setter/);
  });

  it('compiles keyed each rows with reactive item accessors', () => {
    const output = compileNodulaComponent('<template><ul><li each="idea of ideas()" :key="idea.id">{{ idea.text }}</li></ul></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/Rows.comp');

    assert.match(output, /import \{ h, each \}/);
    assert.match(output, /each\(\(\) => \(ideas\(\)\)/);
    assert.match(output, /__nodulaItem0\(\)\.text/);
  });

  it('does not rewrite loop variable names inside literal strings', () => {
    const output = compileNodulaComponent('<template><li each="idea of ideas()" :key="idea.id" :class="idea().done ? \'idea idea--done\' : \'idea\'">{{ idea.text }}</li></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/Rows.comp');

    assert.match(output, /__nodulaItem0\(\)\.done \? 'idea idea--done' : 'idea'/);
    assert.match(output, /\(__nodulaValue0\) => \(__nodulaValue0\.id\)/);
  });

  it('does not double-call loop item accessors and preserves visible-island actions', () => {
    const output = compileNodulaComponent('<template><ul><li each="idea of ideas()" :key="idea.id"><input :checked="idea().done" @change="toggle(idea().id)" /><span>{{ idea().text }}</span></li></ul></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/Rows.comp');
    const island = compileNodulaComponent('<template><div use:visibleIsland="visibleIsland(loadCard)"></div></template>', '/Users/richardleurs/Documents/Webserver/framework/src app/Island.comp');

    assert.doesNotMatch(output, /__nodulaItem0\(\)\(\)/);
    assert.match(output, /"checked": \(\) => \(__nodulaItem0\(\)\.done\)/);
    assert.match(output, /toggle\(__nodulaItem0\(\)\.id\)/);
    assert.match(island, /if \(element\) element\.replaceChildren\(visibleIsland\(loadCard\)\)/);
  });
});
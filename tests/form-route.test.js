import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';

it('demonstrates createForm validation, submission, and reset on the form route', async () => {
  const window = new Window({ url: 'http://localhost/form' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  const animations = [];
  window.Element.prototype.animate = function (keyframes, options) {
    const animation = {
      keyframes,
      options,
      cancelled: false,
      finished: Promise.resolve(),
      cancel() { this.cancelled = true; },
    };
    animations.push({ element: this, animation });
    return animation;
  };
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  let dispose;
  try {
    await server.ssrLoadModule('/dist/framework/nodula-animation.js');
    const { default: FormPage } = await server.ssrLoadModule('/src/routes/forms.page');
    const { mount } = await server.ssrLoadModule('/dist/framework/nodula-framework.js');
    dispose = mount(document.body, FormPage);

    const name = document.querySelector('#form-name');
    const email = document.querySelector('#form-email');
    const updates = document.querySelector('[name="updates"]');
    const submit = document.querySelector('[type="submit"]');
    assert.ok(name);
    assert.ok(email);
    assert.ok(updates);

    submit.click();
    assert.equal(document.querySelector('#form-name-error').textContent, 'Enter your name.');
    assert.equal(document.querySelector('#form-email-error').textContent, 'Enter a valid email address.');
    assert.equal(name.getAttribute('aria-invalid'), 'true');
    assert.equal(email.getAttribute('aria-invalid'), 'true');

    name.value = 'Ada Nodula';
    name.dispatchEvent(new window.Event('input', { bubbles: true }));
    email.value = 'ada@example.com';
    email.dispatchEvent(new window.Event('input', { bubbles: true }));
    updates.checked = true;
    updates.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(document.querySelector('.form-dirty').textContent, 'Unsaved changes');

    document.querySelector('.form-example').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.match(document.querySelector('.form-success').textContent, /Thanks, Ada Nodula/);
    const successNotification = document.querySelector('.nodula-notification--success');
    assert.ok(successNotification);
    assert.equal(successNotification.querySelector('.nodula-notification__title').textContent, 'Form submitted');
    assert.match(successNotification.querySelector('.nodula-notification__message').textContent, /Thanks, Ada Nodula/);
    assert.equal(animations.length, 1);
    assert.equal(animations[0].element, document.querySelector('.form-success'));
    assert.equal(animations[0].animation.options.duration, 220);
    assert.equal(animations[0].animation.keyframes[0].opacity, 0);
    assert.equal(submit.disabled, false);
    successNotification.querySelector('.nodula-notification__close').click();
    successNotification.dispatchEvent(new window.Event('animationend', { bubbles: true }));

    const reset = document.querySelector('.form-actions [type="button"]');
    reset.click();
    const cancelDialog = document.querySelector('dialog.nodula-dialog');
    assert.equal(cancelDialog.querySelector('.nodula-dialog__message').textContent, 'Reset this form? Your changes will be cleared.');
    assert.equal(cancelDialog.querySelector('.nodula-dialog__title').textContent, 'Reset form?');
    assert.equal(cancelDialog.querySelector('.nodula-dialog__button--cancel').textContent, 'Keep editing');
    assert.equal(cancelDialog.querySelector('.nodula-dialog__button--ok').textContent, 'Reset form');
    cancelDialog.querySelector('.nodula-dialog__button--cancel').click();
    await window.happyDOM.whenAsyncComplete();
    assert.equal(name.value, 'Ada Nodula');
    assert.equal(email.value, 'ada@example.com');
    assert.equal(updates.checked, true);
    assert.match(document.querySelector('.form-success').textContent, /Thanks, Ada Nodula/);

    reset.click();
    document.querySelector('.nodula-dialog__button--ok').click();
    await window.happyDOM.whenAsyncComplete();
    assert.equal(name.value, '');
    assert.equal(email.value, '');
    assert.equal(updates.checked, false);
    assert.equal(document.querySelector('.form-success').textContent, '');
    assert.equal(document.querySelector('.form-dirty').textContent, 'No changes yet');
  } finally {
    dispose?.();
    await server.close();
    window.close();
  }
});
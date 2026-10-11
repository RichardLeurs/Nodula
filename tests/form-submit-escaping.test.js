import assert from 'node:assert/strict';
import { it } from 'vitest';
import { createForm } from '../framework/addons/form.js';

it('HTML-escapes submitted strings without changing reactive form values', async () => {
  let submittedValues;
  const form = createForm({
    name: '<img src=x onerror="run()"> & O\'Reilly',
    details: { message: '<script>unsafe()</script>' },
    tags: ['<b>one</b>', 'two & three'],
    enabled: true,
  }, {
    onSubmit(values) {
      submittedValues = values;
    },
  });

  assert.equal(await form.handleSubmit(), true);
  assert.deepEqual(submittedValues, {
    name: '&lt;img src=x onerror=&quot;run()&quot;&gt; &amp; O&#39;Reilly',
    details: { message: '&lt;script&gt;unsafe()&lt;/script&gt;' },
    tags: ['&lt;b&gt;one&lt;/b&gt;', 'two &amp; three'],
    enabled: true,
  });
  assert.equal(form.values.name, '<img src=x onerror="run()"> & O\'Reilly');
  assert.equal(form.values.details.message, '<script>unsafe()</script>');
});
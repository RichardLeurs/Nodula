import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDataClient, DataError } from '../framework/addons/data.js';

function createResponse({ status = 200, statusText = 'OK', body = '', contentType = 'application/json' } = {}) {
  return {
    status,
    statusText,
    ok: status >= 200 && status < 300,
    headers: new Headers(contentType ? { 'content-type': contentType } : {}),
    async text() { return body; },
  };
}

describe('Nodula data add-on', () => {
  it('fetches JSON with base URLs, default headers, and query parameters', async () => {
    let requestUrl;
    let requestOptions;
    const client = createDataClient({
      baseURL: 'https://api.example.test/v1',
      headers: { authorization: 'Bearer token' },
      fetcher: async (url, options) => {
        requestUrl = url;
        requestOptions = options;
        return createResponse({ body: '{"items":[1,2]}' });
      },
    });

    const result = await client.get('/items', { params: { page: 2, tag: ['a', 'b'], skip: null } });

    assert.deepEqual(result, { items: [1, 2] });
    assert.equal(requestUrl, 'https://api.example.test/v1/items?page=2&tag=a&tag=b');
    assert.equal(requestOptions.method, 'GET');
    assert.equal(requestOptions.headers.get('authorization'), 'Bearer token');
  });

  it('JSON-serializes object bodies and allows request headers to override defaults', async () => {
    let requestOptions;
    const client = createDataClient({
      baseURL: 'https://api.example.test',
      headers: { 'x-client': 'default' },
      fetcher: async (_url, options) => {
        requestOptions = options;
        return createResponse({ body: '{"id":7}' });
      },
    });

    assert.deepEqual(await client.post('/items', { name: 'Leaf' }, { headers: { 'x-client': 'custom' } }), { id: 7 });
    assert.equal(requestOptions.method, 'POST');
    assert.equal(requestOptions.body, '{"name":"Leaf"}');
    assert.equal(requestOptions.headers.get('content-type'), 'application/json');
    assert.equal(requestOptions.headers.get('x-client'), 'custom');
  });

  it('supports the remaining HTTP method helpers and the fetch/request aliases', async () => {
    const methods = [];
    const client = createDataClient({
      fetcher: async (_url, options) => {
        methods.push(options.method ?? 'GET');
        return createResponse({ body: 'done', contentType: 'text/plain' });
      },
    });

    assert.equal(await client.fetch('/fetch'), 'done');
    assert.equal(await client.request('/request'), 'done');
    assert.equal(await client.put('/items/1', { name: 'Updated' }), 'done');
    assert.equal(await client.patch('/items/1', { name: 'Patched' }), 'done');
    assert.equal(await client.delete('/items/1'), 'done');
    assert.deepEqual(methods, ['GET', 'GET', 'PUT', 'PATCH', 'DELETE']);
  });

  it('keeps absolute request URLs independent of the configured base URL', async () => {
    let requestUrl;
    const client = createDataClient({
      baseURL: 'https://api.example.test/v1',
      fetcher: async (url) => {
        requestUrl = url;
        return createResponse({ body: '{}'});
      },
    });

    await client.get(new URL('https://other.example.test/items'));
    assert.equal(requestUrl, 'https://other.example.test/items');

    await client.get('https://another.example.test/items');
    assert.equal(requestUrl, 'https://another.example.test/items');
  });

  it('passes Fetch body types through instead of JSON-serializing them', async () => {
    const formData = new FormData();
    formData.set('file-name', 'leaves.png');
    const blob = new Blob(['image-bytes'], { type: 'image/png' });
    const bodies = [];
    const client = createDataClient({
      fetcher: async (_url, options) => {
        bodies.push(options.body);
        return createResponse({ body: '{}'});
      },
    });

    await client.post('/upload/form', formData);
    await client.post('/upload/blob', blob);

    assert.equal(bodies[0], formData);
    assert.equal(bodies[1], blob);
  });

  it('returns null for empty success responses and includes parsed error payloads', async () => {
    const emptyClient = createDataClient({ fetcher: async () => createResponse({ status: 204, body: '' }) });
    assert.equal(await emptyClient.delete('/items/1'), null);

    const failingClient = createDataClient({
      fetcher: async () => createResponse({ status: 422, statusText: 'Unprocessable Entity', body: '{"message":"Invalid"}' }),
    });
    await assert.rejects(failingClient.get('/items'), (error) => {
      assert.ok(error instanceof DataError);
      assert.equal(error.status, 422);
      assert.deepEqual(error.data, { message: 'Invalid' });
      assert.match(error.message, /HTTP 422 Unprocessable Entity/);
      return true;
    });
  });

  it('validates client options and propagates fetch failures', async () => {
    assert.throws(() => createDataClient({ baseURL: 42 }), /baseURL to be a string/);
    assert.throws(() => createDataClient({ fetcher: null }), /Fetch-compatible fetcher/);

    const client = createDataClient({ fetcher: async () => { throw new Error('network unavailable'); } });
    await assert.rejects(client.get('/items'), /network unavailable/);
  });
});
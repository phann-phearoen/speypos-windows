import test from 'node:test';
import assert from 'node:assert/strict';

test('performHandshake uses data.store.id instead of data.store_client.id', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        store: { id: 4 },
        store_client: {
          id: 7,
          name: 'Client 2',
        },
      },
      meta: { request_id: 'handshake-test-request' },
    }),
  });

  try {
    const { performHandshake } = await import('../services/cloudHandshake.service.js');
    const metadata = await performHandshake({
      apiKey: 'test-api-key',
      baseUrl: 'https://cloud.example.test',
    });

    assert.equal(metadata.store_id, '4');
    assert.equal(metadata.store_client_name, 'Client 2');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('performHandshake rejects a response containing only a POS client ID', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        store_client: { id: 7 },
      },
      meta: { request_id: 'client-only-handshake-test-request' },
    }),
  });

  try {
    const { performHandshake } = await import('../services/cloudHandshake.service.js');
    await assert.rejects(
      performHandshake({
        apiKey: 'test-api-key',
        baseUrl: 'https://cloud.example.test',
      }),
      /missing store id/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
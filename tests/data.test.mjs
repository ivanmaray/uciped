import test from 'node:test';
import assert from 'node:assert/strict';

test('los datos farmacológicos se solicitan una sola vez con una URL estable', async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  let requestedUrl = null;
  let requestedCacheMode = null;
  globalThis.fetch = async (url, options) => {
    requestCount += 1;
    requestedUrl = url;
    requestedCacheMode = options?.cache;
    return {
      ok: true,
      json: async () => ({ urgencia: {}, intubacion: {}, perfusiones: {} }),
    };
  };

  try {
    const { loadMeds } = await import(`../js/data.js?test=${Date.now()}`);
    const [first, second] = await Promise.all([loadMeds(), loadMeds()]);
    assert.equal(first, second);
    assert.equal(requestCount, 1);
    assert.equal(requestedUrl, './data/meds.json');
    assert.equal(requestedCacheMode, 'no-cache');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('un fallo de carga devuelve null y no inventa metadatos farmacológicos', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('sin red'); };

  try {
    const { loadMeds } = await import(`../js/data.js?failure=${Date.now()}`);
    assert.equal(await loadMeds(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

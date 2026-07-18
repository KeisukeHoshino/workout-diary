import 'fake-indexeddb/auto';

if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => `test-${Date.now()}-${Math.random()}` }
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOMER_DISPLAY_STORAGE_KEY,
  openCustomerDisplayWindow,
  publishCustomerDisplaySnapshot,
  readCustomerDisplaySnapshot,
  subscribeCustomerDisplaySnapshot
} from '../src/services/customerDisplayBridge.js';

function makeWindow({ popup = null } = {}) {
  const storage = new Map();
  const listeners = new Map();
  const intervals = new Map();
  let nextInterval = 1;
  let desktopListener = null;
  const desktopPayloads = [];
  const win = {
    location: { href: 'https://bumi-makmur.my.id/kasir?foo=bar#x' },
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
    setInterval: fn => { const id = nextInterval++; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id),
    open: () => popup,
    bmDesktop: {
      publishCustomerDisplay: snapshot => desktopPayloads.push(snapshot),
      onCustomerDisplayUpdate: callback => { desktopListener = callback; return () => { desktopListener = null; }; }
    },
    __storage: storage,
    __listeners: listeners,
    __intervals: intervals,
    __desktopPayloads: desktopPayloads,
    __emitDesktop: payload => desktopListener?.(payload)
  };
  return win;
}

class FakeBroadcastChannel {
  static posts = [];
  constructor(name) { this.name = name; this.listeners = new Set(); }
  postMessage(payload) { FakeBroadcastChannel.posts.push({ name: this.name, payload }); }
  addEventListener(_name, fn) { this.listeners.add(fn); }
  removeEventListener(_name, fn) { this.listeners.delete(fn); }
  close() {}
}

test('customer display runtime menyimpan snapshot lokal dan meneruskan ke desktop', () => {
  const originalWindow = globalThis.window;
  const originalBroadcastChannel = globalThis.BroadcastChannel;
  const windowMock = makeWindow();
  globalThis.window = windowMock;
  globalThis.BroadcastChannel = FakeBroadcastChannel;
  try {
    const delivered = publishCustomerDisplaySnapshot({ cart: [{ lineId: '1', name: 'Cable Ties', qty: 2 }], total: 39000, customerName: 'Umum' });
    assert.equal(delivered, true);
    const stored = JSON.parse(windowMock.__storage.get(CUSTOMER_DISPLAY_STORAGE_KEY));
    assert.equal(stored.total, 39000);
    assert.equal(stored.cart[0].name, 'Cable Ties');
    assert.equal(readCustomerDisplaySnapshot().total, 39000);
    assert.equal(windowMock.__desktopPayloads.at(-1).total, 39000);
    assert.equal(FakeBroadcastChannel.posts.at(-1).payload.total, 39000);
  } finally {
    globalThis.window = originalWindow;
    globalThis.BroadcastChannel = originalBroadcastChannel;
  }
});

test('customer display subscription menerima update Electron dan dapat dibersihkan', () => {
  const originalWindow = globalThis.window;
  const originalBroadcastChannel = globalThis.BroadcastChannel;
  const windowMock = makeWindow();
  globalThis.window = windowMock;
  globalThis.BroadcastChannel = FakeBroadcastChannel;
  try {
    const values = [];
    const unsubscribe = subscribeCustomerDisplaySnapshot(value => values.push(value));
    windowMock.__emitDesktop({ total: 50000, customerName: 'Pelanggan A', cart: [] });
    assert.equal(values.at(-1).total, 50000);
    assert.equal(values.at(-1).customerName, 'Pelanggan A');
    unsubscribe();
    const length = values.length;
    windowMock.__emitDesktop({ total: 60000, cart: [] });
    assert.equal(values.length, length);
    assert.equal(windowMock.__intervals.size, 0);
  } finally {
    globalThis.window = originalWindow;
    globalThis.BroadcastChannel = originalBroadcastChannel;
  }
});

test('customer display web tidak mengaku sukses bila popup diblokir', async () => {
  const originalWindow = globalThis.window;
  const windowMock = makeWindow({ popup: null });
  delete windowMock.bmDesktop;
  globalThis.window = windowMock;
  try {
    await assert.rejects(openCustomerDisplayWindow(), error => error?.code === 'popup-blocked');
  } finally {
    globalThis.window = originalWindow;
  }
});

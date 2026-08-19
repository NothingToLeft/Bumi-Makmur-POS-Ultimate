export const CUSTOMER_DISPLAY_STORAGE_KEY = 'bm_pos_customer_display_v1';
export const CUSTOMER_DISPLAY_CHANNEL = 'bm-pos-customer-display';

const FALLBACK_SNAPSHOT = Object.freeze({
  cart: [],
  total: 0,
  customerName: 'Umum',
  message: '',
  companyName: 'BUMI MAKMUR',
  branchName: '',
  online: true,
  updatedAt: ''
});

const canUseWindow = () => typeof window !== 'undefined';

export function readCustomerDisplaySnapshot() {
  if (!canUseWindow()) return { ...FALLBACK_SNAPSHOT };
  try {
    const raw = window.localStorage.getItem(CUSTOMER_DISPLAY_STORAGE_KEY);
    return { ...FALLBACK_SNAPSHOT, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...FALLBACK_SNAPSHOT };
  }
}

export function publishCustomerDisplaySnapshot(snapshot) {
  if (!canUseWindow()) return false;
  const safeSnapshot = {
    ...FALLBACK_SNAPSHOT,
    ...(snapshot || {}),
    cart: Array.isArray(snapshot?.cart) ? snapshot.cart : [],
    total: Number(snapshot?.total || 0),
    updatedAt: snapshot?.updatedAt || new Date().toISOString()
  };

  let delivered = false;
  try {
    window.localStorage.setItem(CUSTOMER_DISPLAY_STORAGE_KEY, JSON.stringify(safeSnapshot));
    delivered = true;
  } catch (error) {
    console.warn('Snapshot layar pelanggan tidak dapat disimpan lokal.', error);
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
      channel.postMessage(safeSnapshot);
      channel.close();
      delivered = true;
    }
  } catch (error) {
    console.warn('BroadcastChannel layar pelanggan tidak tersedia.', error);
  }

  try {
    if (window.bmDesktop?.publishCustomerDisplay) {
      window.bmDesktop.publishCustomerDisplay(safeSnapshot);
      delivered = true;
    }
  } catch (error) {
    console.warn('Bridge desktop layar pelanggan tidak tersedia.', error);
  }
  return delivered;
}

export function subscribeCustomerDisplaySnapshot(onSnapshot, { pollInterval = 750 } = {}) {
  if (!canUseWindow() || typeof onSnapshot !== 'function') return () => {};
  let lastSerialized = '';
  const deliver = value => {
    const next = { ...FALLBACK_SNAPSHOT, ...(value || {}) };
    let serialized = '';
    try { serialized = JSON.stringify(next); } catch { serialized = String(next?.updatedAt || ''); }
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    onSnapshot(next);
  };

  deliver(readCustomerDisplaySnapshot());

  let channel = null;
  const receiveBroadcast = event => { if (event?.data) deliver(event.data); };
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
      channel.addEventListener('message', receiveBroadcast);
    }
  } catch (error) {
    console.warn('Listener BroadcastChannel layar pelanggan gagal dibuat.', error);
  }

  const receiveStorage = event => {
    if (event.key === CUSTOMER_DISPLAY_STORAGE_KEY) deliver(readCustomerDisplaySnapshot());
  };
  window.addEventListener('storage', receiveStorage);

  let removeDesktopListener = null;
  try {
    removeDesktopListener = window.bmDesktop?.onCustomerDisplayUpdate?.(payload => deliver(payload)) || null;
  } catch (error) {
    console.warn('Listener desktop layar pelanggan gagal dibuat.', error);
  }

  // Poll ringan sebagai fallback untuk WebView/Electron tertentu yang tidak
  // meneruskan storage event atau BroadcastChannel secara konsisten.
  const timer = window.setInterval(() => deliver(readCustomerDisplaySnapshot()), Math.max(500, Number(pollInterval) || 750));

  return () => {
    window.clearInterval(timer);
    window.removeEventListener('storage', receiveStorage);
    try { channel?.removeEventListener('message', receiveBroadcast); channel?.close(); } catch {}
    try { if (typeof removeDesktopListener === 'function') removeDesktopListener(); } catch {}
  };
}

export async function openCustomerDisplayWindow() {
  if (!canUseWindow()) throw new Error('Layar pelanggan hanya dapat dibuka dari perangkat dengan antarmuka grafis.');

  if (window.bmDesktop?.openCustomerDisplay) {
    const result = await window.bmDesktop.openCustomerDisplay(readCustomerDisplaySnapshot());
    if (!result?.opened) throw new Error('Jendela layar pelanggan gagal dibuat oleh aplikasi Desktop.');
    return { mode: 'desktop', ...result };
  }

  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('desktopDisplay', '1');
  const popup = window.open(url.toString(), 'bm-customer-display', 'popup=yes,width=1100,height=760');
  if (!popup) {
    const error = new Error('Popup layar pelanggan diblokir browser. Izinkan pop-up untuk situs Bumi Makmur lalu coba lagi.');
    error.code = 'popup-blocked';
    throw error;
  }
  try { popup.focus(); } catch {}
  return { mode: 'web', opened: true, reused: false, externalMonitor: false };
}

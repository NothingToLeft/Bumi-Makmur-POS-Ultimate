import React, { useEffect, useMemo, useState } from 'react';
import { MonitorSmartphone, QrCode, WifiOff } from 'lucide-react';
import { formatRp } from '../utils/helpers.js';

const STORAGE_KEY = 'bm_pos_customer_display_v1';
const CHANNEL_NAME = 'bm-pos-customer-display';
const fallback = { cart: [], total: 0, customerName: 'Umum', message: '', companyName: 'BUMI MAKMUR', branchName: '', online: true, updatedAt: '' };

function readSnapshot() {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return fallback; }
}

export default function DesktopCustomerDisplayScreen() {
  const [snapshot, setSnapshot] = useState(readSnapshot);
  useEffect(() => {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
    const receive = event => { if (event?.data) setSnapshot(previous => ({ ...previous, ...event.data })); };
    const storage = event => { if (event.key === STORAGE_KEY) setSnapshot(readSnapshot()); };
    channel?.addEventListener('message', receive);
    window.addEventListener('storage', storage);
    return () => { channel?.removeEventListener('message', receive); channel?.close(); window.removeEventListener('storage', storage); };
  }, []);

  const itemCount = useMemo(() => snapshot.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0), [snapshot.cart]);
  return <div className="desktop-customer-display min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white p-8 lg:p-12 flex flex-col overflow-hidden">
    <header className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-4"><img src="/logo-bm.svg" alt="Logo toko" className="w-16 h-16 rounded-2xl shadow-2xl ring-1 ring-white/20"/><div><p className="text-emerald-300 text-sm font-black tracking-[.2em] uppercase">Layar Pelanggan</p><h1 className="text-3xl lg:text-5xl font-black tracking-tight">{snapshot.companyName || 'BUMI MAKMUR'}</h1><p className="text-emerald-200 mt-1">{snapshot.branchName || 'Cabang aktif'}</p></div></div>
      <div className="flex items-center gap-3 text-emerald-200">{snapshot.online === false ? <WifiOff/> : <MonitorSmartphone/>}<span className="font-bold">{snapshot.online === false ? 'Kasir offline' : 'Terhubung ke kasir'}</span></div>
    </header>
    <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 mt-8">
      <section className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 overflow-y-auto custom-scrollbar">
        {snapshot.cart.length === 0 ? <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center text-emerald-100"><QrCode size={100} className="opacity-70 mb-5"/><p className="text-3xl font-black">Selamat Datang</p><p className="text-lg mt-3 max-w-2xl text-emerald-200">{snapshot.message || 'Silakan mulai transaksi di kasir. Harga dan total belanja akan tampil di layar ini.'}</p></div> : <div className="space-y-3">{snapshot.cart.map(line => <div key={line.lineId} className="grid grid-cols-[1fr_auto] gap-6 p-5 rounded-2xl bg-white/10 border border-white/10"><div><p className="font-black text-xl">{line.name}</p><p className="text-emerald-200 mt-1">{line.qty} {line.unit} × {formatRp(line.price)}</p></div><p className="text-2xl font-black text-orange-300">{formatRp(Number(line.price || 0) * Number(line.qty || 0) - Number(line.itemDiscount || 0))}</p></div>)}</div>}
      </section>
      <aside className="bg-white text-slate-900 rounded-[2rem] p-7 shadow-2xl flex flex-col justify-between">
        <div><p className="text-xs uppercase tracking-[.2em] font-black text-emerald-700">Ringkasan Belanja</p><p className="text-2xl font-black mt-3">{snapshot.customerName || 'Pelanggan Umum'}</p><p className="text-gray-500 mt-1">{itemCount} item</p></div>
        <div className="my-8"><p className="text-gray-500 font-bold">Total Pembayaran</p><p className="text-5xl font-black text-orange-600 mt-3 break-words">{formatRp(snapshot.total)}</p></div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center"><p className="font-black text-emerald-900">Terima kasih telah berbelanja</p><p className="text-sm text-emerald-700 mt-1">Mohon periksa kembali barang dan nota Anda.</p></div>
      </aside>
    </main>
  </div>;
}

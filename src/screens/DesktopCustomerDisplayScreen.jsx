import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, MonitorSmartphone, QrCode, Wifi, WifiOff } from 'lucide-react';
import { formatRp } from '../utils/helpers.js';
import { formatQuantity } from '../utils/fractionalUnits.js';
import { formatTimeId, toEpochMs } from '../utils/temporal.js';
import { readCustomerDisplaySnapshot, subscribeCustomerDisplaySnapshot } from '../services/customerDisplayBridge.js';

export default function DesktopCustomerDisplayScreen() {
  const [snapshot, setSnapshot] = useState(readCustomerDisplaySnapshot);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => subscribeCustomerDisplaySnapshot(next => setSnapshot(next)), []);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const itemCount = useMemo(
    () => (snapshot.cart || []).reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [snapshot.cart]
  );
  const updatedAt = toEpochMs(snapshot.updatedAt);
  const stale = Boolean(updatedAt && clock - updatedAt > 15000);
  const connectionLabel = snapshot.online === false
    ? 'Kasir offline'
    : stale
      ? 'Menunggu pembaruan kasir'
      : 'Terhubung ke kasir';
  const ConnectionIcon = snapshot.online === false ? WifiOff : stale ? Clock3 : Wifi;

  return <div className="desktop-customer-display min-h-screen bg-[#0b0d10] text-white p-5 md:p-8 lg:p-10 flex flex-col overflow-hidden">
    <header className="flex items-center justify-between gap-6 border-b border-white/10 pb-5">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white flex items-center justify-center p-1 shadow-2xl ring-1 ring-white/20 shrink-0">
          <img src="/logo-bm.svg" alt="Logo Bumi Makmur" className="w-full h-full object-contain"/>
        </div>
        <div className="min-w-0">
          <p className="text-red-400 text-xs md:text-sm font-black tracking-[.2em] uppercase">Layar Pelanggan</p>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight truncate">{snapshot.companyName || 'BUMI MAKMUR'}</h1>
          <p className="text-slate-300 mt-1 truncate">{snapshot.branchName || 'Cabang aktif'}</p>
        </div>
      </div>
      <div className={`hidden sm:flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${snapshot.online === false || stale ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'}`}>
        <ConnectionIcon size={18}/><span>{connectionLabel}</span>
      </div>
    </header>

    <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 lg:gap-8 mt-6 lg:mt-8">
      <section className="rounded-[2rem] bg-white text-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col min-h-0">
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between gap-4">
          <div><p className="text-xs uppercase tracking-[.18em] text-slate-500 font-black">Daftar Belanja</p><p className="text-sm text-slate-500 mt-1">Harga tampil langsung dari kasir.</p></div>
          <span className="rounded-full bg-slate-900 text-white text-sm font-black px-4 py-2">{formatQuantity(itemCount)} item</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 md:p-6">
          {(snapshot.cart || []).length === 0 ? <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center">
            <div className="w-28 h-28 rounded-[2rem] bg-red-50 text-red-600 flex items-center justify-center mb-5"><QrCode size={72}/></div>
            <p className="text-3xl font-black text-slate-900">Selamat Datang</p>
            <p className="text-base md:text-lg mt-3 max-w-2xl text-slate-500 leading-relaxed">{snapshot.message || 'Silakan mulai transaksi di kasir. Barang, harga, dan total belanja akan tampil di layar ini.'}</p>
          </div> : <div className="space-y-3">{snapshot.cart.map((line, index) => <div key={line.lineId || `${line.id || 'line'}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-5 p-4 md:p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="min-w-0"><p className="font-black text-lg md:text-xl break-words">{line.name}</p><p className="text-slate-500 mt-1">{formatQuantity(line.qty)} {line.unit} × {formatRp(line.price)}</p>{Number(line.itemDiscount || 0)>0&&<p className="text-xs font-bold text-red-600 mt-1">Diskon {formatRp(line.itemDiscount)}</p>}</div>
            <p className="text-xl md:text-2xl font-black text-slate-950 whitespace-nowrap">{formatRp(Number(line.price || 0) * Number(line.qty || 0) - Number(line.itemDiscount || 0))}</p>
          </div>)}</div>}
        </div>
      </section>

      <aside className="rounded-[2rem] bg-gradient-to-b from-red-700 to-red-950 p-6 lg:p-7 shadow-2xl flex flex-col justify-between border border-red-500/30 min-h-[360px]">
        <div>
          <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[.2em] font-black text-red-100">Ringkasan</p><MonitorSmartphone className="text-red-200"/></div>
          <p className="text-2xl font-black mt-5 break-words">{snapshot.customerName || 'Pelanggan Umum'}</p>
          <p className="text-red-100/80 mt-1">{formatQuantity(itemCount)} item dalam transaksi</p>
        </div>
        <div className="my-8 rounded-3xl bg-white text-slate-950 p-6 shadow-xl">
          <p className="text-sm text-slate-500 font-bold">TOTAL PEMBAYARAN</p>
          <p className="text-4xl lg:text-5xl font-black mt-3 break-words tabular-nums">{formatRp(snapshot.total)}</p>
        </div>
        <div className="rounded-2xl bg-black/25 border border-white/10 p-5 text-center">
          <p className="font-black">Terima kasih telah berbelanja</p>
          <p className="text-sm text-red-100 mt-1">Mohon periksa kembali barang dan nota sebelum meninggalkan toko.</p>
          <p className="text-[11px] text-red-200/70 mt-3">{connectionLabel}{snapshot.updatedAt ? ` · ${formatTimeId(snapshot.updatedAt)}` : ''}</p>
        </div>
      </aside>
    </main>
  </div>;
}

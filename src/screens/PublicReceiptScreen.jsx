import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Package, Printer, ShieldCheck } from 'lucide-react';
import { fetchPublicReceipt } from '../services/cloudStore.js';
import { formatRp } from '../utils/helpers.js';
import { getReceiptLogo } from '../services/receiptShare.js';

export default function PublicReceiptScreen({ token }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    let active = true;
    fetchPublicReceipt(token)
      .then(data => active && setState({ loading: false, data, error: '' }))
      .catch(error => active && setState({ loading: false, data: null, error: error?.message || 'Nota gagal dibuka.' }));
    return () => { active = false; };
  }, [token]);

  if (state.loading) return <div className="min-h-screen bg-emerald-950 text-white flex flex-col items-center justify-center"><Loader2 className="animate-spin" size={48}/><p className="font-bold mt-4">Membuka nota resmi...</p></div>;
  if (state.error) return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-7 max-w-md text-center shadow-xl"><Package className="mx-auto text-red-500" size={48}/><h1 className="font-black text-xl mt-3">Nota Tidak Tersedia</h1><p className="text-gray-500 mt-2">{state.error}</p></div></div>;

  const { sale, store } = state.data;
  const receiptLogo = getReceiptLogo(store);
  return <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 p-3 md:p-8">
    <div className="max-w-xl mx-auto">
      <div className="text-white text-center mb-5"><ShieldCheck className="mx-auto text-emerald-300"/><p className="font-black text-xl mt-2">Nota Online Terverifikasi</p><p className="text-xs text-emerald-200">Disimpan langsung oleh Bumi Makmur POS Cloud</p></div>
      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-50 to-white p-6 text-center border-b border-dashed">
          {receiptLogo && <img src={receiptLogo} alt="Logo BM" className="w-20 h-20 object-contain mx-auto rounded-[1.35rem] bg-white shadow-xl ring-1 ring-emerald-100"/>}
          <p className="text-[10px] tracking-[.22em] uppercase text-emerald-700 font-black mt-3">{store.receiptHeader || 'Nota Pembelian'}</p>
          <h1 className="font-black text-2xl text-gray-900 mt-1">{store.companyName || 'BUMI MAKMUR'}</h1>
          <p className="text-xs text-gray-500 mt-1">{store.address}</p>
          {store.phone && <p className="text-xs text-gray-500">Telp: {store.phone}</p>}
          <div className="inline-flex mt-4 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">{sale.id}</div>
          <p className="text-xs text-gray-500 mt-2">{new Date(sale.createdAt).toLocaleString('id-ID')}</p>
        </div>
        <div className="p-5 md:p-7">
          <div className="grid grid-cols-2 gap-3 mb-5"><Info label="Pelanggan" value={sale.customerName || 'Umum'}/><Info label="Kasir" value={sale.cashierName || '-'}/></div>
          <div className="space-y-3">{(sale.items || []).map((line,index)=><div key={line.lineId || index} className="flex justify-between gap-3 pb-3 border-b border-dashed"><div><p className="font-bold text-sm">{line.name}</p><p className="text-xs text-gray-500">{line.qty} {line.unit} × {formatRp(line.price)}</p></div><b className="text-sm">{formatRp(line.price * line.qty - (line.itemDiscount || 0))}</b></div>)}</div>
          <div className="mt-5 space-y-1 text-sm"><Row label="Subtotal" value={formatRp(sale.subtotal)}/>{sale.globalDiscount>0&&<Row label="Diskon" value={`-${formatRp(sale.globalDiscount)}`}/>} {sale.tax>0&&<Row label="Pajak" value={formatRp(sale.tax)}/>}<div className="mt-3 p-4 rounded-2xl bg-emerald-900 text-white flex justify-between text-lg font-black"><span>TOTAL</span><span>{formatRp(sale.total)}</span></div></div>
          <div className="mt-5 pt-4 border-t border-dashed">{(sale.payments || []).map(payment=><Row key={payment.id} label={payment.name} value={formatRp(payment.amount)}/>)}</div>
          <div className="text-center mt-6"><CheckCircle2 className="mx-auto text-emerald-600"/><p className="font-bold text-sm mt-2">Pembayaran tercatat di sistem</p><p className="text-xs text-gray-500 mt-1">{store.receiptMessage || store.receiptFooter}</p></div>
        </div>
        <div className="p-4 bg-gray-50"><button onClick={()=>window.print()} className="w-full min-h-[50px] rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2"><Printer size={18}/> Cetak / Simpan PDF</button></div>
      </div>
    </div>
  </div>;
}
function Info({label,value}){return <div className="p-3 bg-gray-50 rounded-xl"><p className="text-[10px] text-gray-500">{label}</p><p className="text-sm font-bold truncate">{value}</p></div>}
function Row({label,value}){return <div className="flex justify-between gap-3"><span>{label}</span><b>{value}</b></div>}

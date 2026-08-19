import React, { useEffect, useState } from 'react';
import { Loader2, Package, Printer, ShieldCheck } from 'lucide-react';
import { fetchPublicReceipt } from '../services/cloudStore.js';
import ReceiptDocument from '../components/ReceiptDocument.jsx';

export default function PublicReceiptScreen({ token }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    let active = true;
    fetchPublicReceipt(token)
      .then(data => active && setState({ loading: false, data, error: '' }))
      .catch(error => active && setState({ loading: false, data: null, error: error?.message || 'Nota gagal dibuka.' }));
    return () => { active = false; };
  }, [token]);

  if (state.loading) return <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6"><Loader2 className="animate-spin text-red-400" size={44}/><p className="font-bold mt-4">Membuka nota resmi...</p></div>;
  if (state.error) return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-7 max-w-md text-center shadow-xl"><Package className="mx-auto text-red-500" size={48}/><h1 className="font-black text-xl mt-3">Nota Tidak Tersedia</h1><p className="text-gray-500 mt-2">{state.error}</p></div></div>;

  const { sale = {}, store = {} } = state.data || {};
  return <div className="min-h-screen bg-[#f3f4f6] px-3 py-5 sm:px-5 sm:py-8 print:bg-white print:p-0">
    <div className="max-w-[500px] mx-auto">
      <div className="mb-4 flex items-center justify-center gap-2 text-gray-700 print:hidden"><ShieldCheck size={18} className="text-red-700"/><div><p className="font-black text-sm leading-tight">Nota Online Terverifikasi</p><p className="text-[10px] text-gray-500">Diterbitkan oleh Bumi Makmur POS</p></div></div>
      <div className="bg-white rounded-[1.35rem] sm:rounded-[1.7rem] shadow-xl overflow-hidden border border-gray-200 print:shadow-none print:border-0 print:rounded-none">
        <ReceiptDocument sale={sale} configs={store} verified/>
        <div className="p-3 bg-gray-50 border-t border-gray-200 print:hidden"><button onClick={()=>window.print()} className="w-full min-h-[48px] rounded-xl bg-gray-950 hover:bg-black text-white font-bold flex items-center justify-center gap-2 transition-colors"><Printer size={18}/> Cetak / Simpan PDF</button></div>
      </div>
    </div>
  </div>;
}

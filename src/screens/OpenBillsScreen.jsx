import React, { useState } from 'react';
import { ListChecks, Trash2, ShoppingCart } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { formatRp } from '../utils/helpers.js';
import { formatDateTimeId } from '../utils/temporal.js';
import { Button, Card, EmptyState, PageHeader } from '../components/ui.jsx';

export default function OpenBillsScreen({ onNavigate }) {
  const { scoped, deleteHeldSale } = usePos();
  const [query, setQuery] = useState('');
  const rows = scoped.heldSales.filter(item => item.name.toLowerCase().includes(query.toLowerCase()) || item.customerName?.toLowerCase().includes(query.toLowerCase()));
  const load = bill => {
    window.dispatchEvent(new CustomEvent('bm-load-bill', { detail: bill }));
    onNavigate('pos');
  };
  return <div className="h-full overflow-y-auto bg-gray-50 generic-bg pb-24 md:pb-6"><PageHeader title="Open Bill & Pending Bill" subtitle="Tahan transaksi, lanjutkan kembali, atau hapus tagihan"/><div className="p-4 md:p-6 space-y-4"><input className="field-input" placeholder="Cari nama tagihan atau pelanggan..." value={query} onChange={event=>setQuery(event.target.value)}/>{rows.length===0?<EmptyState icon={ListChecks} title="Tidak ada open bill" subtitle="Simpan transaksi dari kasir untuk melanjutkan nanti."/>:<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(bill=>{const total=(bill.items||[]).reduce((sum,item)=>sum+item.price*item.qty-item.itemDiscount,0)-Number(bill.globalDiscount||0);return <Card key={bill.id} className="p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="font-bold text-gray-800 truncate">{bill.name}</p><p className="text-xs text-gray-500">{bill.customerName||'Umum'} · {formatDateTimeId(bill.updatedAt||bill.createdAt)}</p></div><p className="font-bold text-emerald-600 shrink-0">{formatRp(total)}</p></div><p className="text-xs text-gray-500 mt-3">{bill.items?.length||0} baris item</p><div className="flex gap-2 mt-4"><Button onClick={()=>load(bill)} className="flex-1"><ShoppingCart size={17}/> Buka</Button><Button variant="danger" onClick={()=>window.confirm('Hapus tagihan ini?')&&deleteHeldSale(bill.id)}><Trash2 size={17}/></Button></div></Card>})}</div>}</div></div>;
}

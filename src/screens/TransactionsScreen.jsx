import React, { useMemo, useRef, useState } from 'react';
import { ReceiptText, RotateCcw, Ban, Printer, MessageCircle, Share2, ArrowUpDown, Clock3, UserRound, Download } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { downloadFile, formatRp, localDateKey, printHtmlDocument } from '../utils/helpers.js';
import { buildTransactionsCsv } from '../utils/csvExport.js';
import { formatQuantity, normalizeQuantity, quantityStepLabel } from '../utils/fractionalUnits.js';
import { remainingSaleLineQty } from '../utils/saleLines.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, NumberInput, PageHeader, SearchBox, Select, StatusBadge, Textarea } from '../components/ui.jsx';
import { buildReceiptPrintHtml, getReceiptPaymentSummary, openWhatsappReceipt, receiptPaymentLabel, shareReceipt } from '../services/receiptShare.js';
import { formatDateTimeId, sortNewest, sortOldest } from '../utils/temporal.js';

const TRANSACTION_STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua status' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'PARTIAL_REFUND', label: 'Refund Sebagian' },
  { value: 'REFUNDED', label: 'Refund Penuh' },
  { value: 'VOIDED', label: 'Void / Dibatalkan' }
];
const TRANSACTION_SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'highest', label: 'Nominal terbesar' },
  { value: 'lowest', label: 'Nominal terkecil' }
];
const transactionTimeFields = ['completedAt', 'createdAt', 'updatedAt', 'date', 'timestamp'];

function transactionSearchText(sale) {
  return [
    sale?.id, sale?.customerName, sale?.customerPhone,
    ...(sale?.items || []).flatMap(item => [item?.name, item?.sku, item?.barcode]),
    ...(sale?.payments || []).map(payment => payment?.name)
  ].filter(Boolean).join(' ').toLowerCase();
}

function itemSummary(sale) {
  const items = sale?.items || [];
  if (!items.length) return 'Tidak ada rincian barang';
  const first = items[0];
  const label = `${formatQuantity(first.qty)}× ${first.name}`;
  return items.length > 1 ? `${label} +${items.length - 1} item lain` : label;
}

export default function TransactionsScreen(){
 const {scoped,hasPermission,refundSale,db}=usePos();
 const[search,setSearch]=useState('');
 const[status,setStatus]=useState('Semua');
 const[sortMode,setSortMode]=useState('newest');
 const[selected,setSelected]=useState(null);
 const[refundMode,setRefundMode]=useState(null);
 const userNames=useMemo(()=>new Map((db.users||[]).map(user=>[String(user.id),user.name||user.loginName||user.id])),[db.users]);
 const rows=useMemo(()=>{
   const term=search.trim().toLowerCase();
   const filtered=(scoped.sales||[]).filter(sale=>{const statusMatch=status==='Semua'||sale.status===status||(status==='VOIDED'&&sale.status==='VOID');return statusMatch&&(!term||transactionSearchText(sale).includes(term));});
   if(sortMode==='oldest') return sortOldest(filtered,transactionTimeFields);
   if(sortMode==='highest') return [...filtered].sort((a,b)=>(Number(b.total)||0)-(Number(a.total)||0)||String(b.id||'').localeCompare(String(a.id||''),'id'));
   if(sortMode==='lowest') return [...filtered].sort((a,b)=>(Number(a.total)||0)-(Number(b.total)||0)||String(a.id||'').localeCompare(String(b.id||''),'id'));
   return sortNewest(filtered,transactionTimeFields);
 },[scoped.sales,search,status,sortMode]);
 const canRefund=hasPermission('transactions.refund'); const canVoid=hasPermission('transactions.void');
 const exportCsv=()=>downloadFile(`Transaksi-Bumi-Makmur-${localDateKey()}.csv`,buildTransactionsCsv(rows,{cashierName:sale=>userNames.get(String(sale.createdBy||sale.userId||''))||sale.cashierName||''}),'text/csv;charset=utf-8');
 const processingRef=useRef(false);
 const process=async data=>{if(processingRef.current)return;processingRef.current=true;try{await refundSale(data);setRefundMode(null);setSelected(null);alert(data.voidAll?'Transaksi dibatalkan.':'Refund berhasil.')}catch(e){alert(e.message)}finally{processingRef.current=false}};
 return <div className="h-full flex flex-col bg-gray-50 generic-bg">
   <PageHeader title="Transaksi, Refund & Void" subtitle="Riwayat pembayaran tersusun kronologis, cetak ulang, refund penuh/sebagian, dan pembatalan" actions={hasPermission('reports.view')&&<Button variant="secondary" onClick={exportCsv} disabled={!rows.length}><Download size={17}/> Ekspor CSV ({rows.length})</Button>}/>
   <div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">
     <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px_220px] gap-3 mb-3">
       <SearchBox value={search} onChange={setSearch} placeholder="Cari invoice, pelanggan, barang, barcode, atau pembayaran..."/>
       <Select value={status} onChange={e=>setStatus(e.target.value)}>{TRANSACTION_STATUS_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</Select>
       <Select value={sortMode} onChange={e=>setSortMode(e.target.value)}>{TRANSACTION_SORT_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</Select>
     </div>
     <div className="flex items-center justify-between gap-3 mb-4 text-xs text-gray-500">
       <span>{rows.length.toLocaleString('id-ID')} transaksi ditampilkan</span>
       <span className="inline-flex items-center gap-1"><ArrowUpDown size={14}/> Urutan {TRANSACTION_SORT_OPTIONS.find(option=>option.value===sortMode)?.label}</span>
     </div>
     {rows.length===0?<EmptyState icon={ReceiptText} title="Belum ada transaksi"/>:<div className="space-y-2">{rows.map(sale=>{
       const cashier=userNames.get(String(sale.createdBy||sale.userId||''))||sale.cashierName||'-';
       const payments=(sale.payments||[]).map(payment=>payment.name).filter(Boolean).join(' + ')||'-';
       return <Card key={sale.id} className="p-0 overflow-hidden cursor-pointer hover:border-emerald-300 hover:shadow-sm transition" onClick={()=>setSelected(sale)}>
         <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,1.15fr)_minmax(180px,.85fr)_minmax(220px,1fr)_auto] md:items-center gap-3 px-4 py-3.5">
           <div className="min-w-0">
             <div className="flex flex-wrap gap-2 items-center"><p className="font-black text-sm text-gray-900 break-all">{sale.id}</p><StatusBadge status={sale.status}/></div>
             <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock3 size={13}/>{formatDateTimeId(sale.completedAt||sale.createdAt||sale.date)}</p>
           </div>
           <div className="min-w-0">
             <p className="font-bold text-sm text-gray-800 truncate">{sale.customerName||'Umum'}</p>
             <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><UserRound size={13}/>{cashier}</p>
           </div>
           <div className="min-w-0">
             <p className="text-sm font-semibold text-gray-700 truncate" title={(sale.items||[]).map(item=>`${formatQuantity(item.qty)}× ${item.name}`).join(', ')}>{itemSummary(sale)}</p>
             <p className="text-xs text-gray-500 mt-1 truncate">{payments}</p>
           </div>
           <div className="md:text-right md:min-w-[130px] border-t md:border-t-0 pt-3 md:pt-0">
             <p className="font-black text-lg text-emerald-700 tabular-nums">{formatRp(sale.total)}</p>
             {Number(sale.refundedTotal||0)>0&&<p className="text-xs font-bold text-red-600">Refund {formatRp(sale.refundedTotal)}</p>}
           </div>
         </div>
       </Card>;
     })}</div>}
   </div>
   {selected&&<TransactionDetail sale={selected} configs={db.configs} refunds={scoped.refunds.filter(r=>r.saleId===selected.id)} canRefund={canRefund} canVoid={canVoid} onClose={()=>setSelected(null)} onRefund={()=>setRefundMode('refund')} onVoid={()=>setRefundMode('void')}/>} 
   {refundMode&&selected&&<RefundModal sale={selected} refunds={scoped.refunds.filter(r=>r.saleId===selected.id)} serialNumbers={scoped.serialNumbers || []} voidAll={refundMode==='void'} onClose={()=>setRefundMode(null)} onSubmit={process}/>} 
 </div>;
}

function TransactionDetail({sale,configs,refunds,canRefund,canVoid,onClose,onRefund,onVoid}){
 const [phone,setPhone]=useState(sale.customerPhone&&sale.customerPhone!=='-'?sale.customerPhone:'');
 const paymentSummary=getReceiptPaymentSummary(sale);
 const qrisAudit=(sale.payments||[]).filter(payment=>payment?.methodId==='qris'||payment?.brand==='qris').map(payment=>({payment,assurance:payment.qrisAssurance||null}));
 const printReceipt=()=>printHtmlDocument(`Struk ${sale.id}`,buildReceiptPrintHtml(sale,configs),`${configs.receiptPaperWidth||80}mm`);
 const sendWhatsApp=async()=>{try{await openWhatsappReceipt(sale,configs,phone)}catch(error){alert(error.message||'Gagal membuka WhatsApp.')}};
 const nativeShare=async()=>{try{await shareReceipt(sale,configs)}catch(error){if(error?.name!=='AbortError')alert('Gagal membuka menu berbagi.')}};
 const assuranceModeLabel=mode=>({dynamic:'Dinamis lokal',static:'Statis', 'static-fallback':'Fallback statis','physical-static':'QRIS fisik','physical-static-fallback':'Fallback QRIS fisik'})[mode]||mode||'Legacy / tidak tersedia';
 return <Modal title="Detail Transaksi" onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={printReceipt}><Printer size={17}/> Cetak Ulang</Button><Button variant="secondary" onClick={nativeShare}><Share2 size={17}/> Bagikan</Button><Button onClick={sendWhatsApp} className="bg-[#25D366]"><MessageCircle size={17}/> WhatsApp</Button>{canRefund&&!['REFUNDED','VOIDED'].includes(sale.status)&&<Button variant="orange" onClick={onRefund}><RotateCcw size={17}/> Refund</Button>}{canVoid&&sale.status==='COMPLETED'&&<Button variant="danger" onClick={onVoid}><Ban size={17}/> Void</Button>}</>}>
   <div className="space-y-4">
     <div className="flex justify-between"><div><p className="font-black text-lg">{sale.id}</p><p className="text-sm text-gray-500">{sale.customerName} · {formatDateTimeId(sale.completedAt || sale.createdAt || sale.date)}</p></div><StatusBadge status={sale.status}/></div>
     <Card className="p-3 bg-gray-50 border-gray-200"><Field label="Nomor WhatsApp untuk nota online"><Input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="08xxxxxxxxxx"/></Field></Card>
     <div className="space-y-2">{sale.items.map(line=><Card key={line.lineId} className="p-3 flex justify-between gap-3"><div><p className="font-bold text-sm">{line.name}</p><p className="text-xs text-gray-500">{formatQuantity(line.qty)} {line.unit} × {formatRp(line.price)} {line.note?`· ${line.note}`:''}</p></div><b>{formatRp(line.price*line.qty-line.itemDiscount)}</b></Card>)}</div>
     <Card className="p-4 space-y-1">
       <div className="flex justify-between"><span>Subtotal</span><b>{formatRp(sale.subtotal)}</b></div>
       {sale.globalDiscount>0&&<div className="flex justify-between"><span>Diskon</span><b>-{formatRp(sale.globalDiscount)}</b></div>}
       {sale.tax>0&&<div className="flex justify-between"><span>Pajak</span><b>{formatRp(sale.tax)}</b></div>}
       <div className="flex justify-between border-t pt-2 text-lg"><b>Total</b><b className="text-gray-950">{formatRp(sale.total)}</b></div>
       <div className="border-t border-dashed mt-3 pt-3 space-y-2">{paymentSummary.payments.map(p=><div key={p.id} className="flex justify-between text-sm"><span>{receiptPaymentLabel(p)}</span><b>{formatRp(p.amount)}</b></div>)}{paymentSummary.hasChange&&<div className="mt-3 p-3 rounded-xl border-2 border-amber-300 bg-amber-50 flex items-center justify-between gap-3"><div><p className="text-[10px] tracking-[.15em] font-black text-amber-800">KEMBALIAN</p><p className="text-[11px] text-amber-700">Diberikan kepada pelanggan</p></div><b className="text-xl text-amber-950 tabular-nums">{formatRp(paymentSummary.change)}</b></div>}</div>
     </Card>
     {qrisAudit.length>0&&<Card className="p-4 border-emerald-200 bg-emerald-50/60">
       <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div><p className="font-black text-emerald-950">Payment Assurance QRIS</p><p className="text-xs text-emerald-800">Audit konfirmasi merchant. Payload QR tidak disimpan di histori transaksi.</p></div><Badge tone="green">{qrisAudit.length} pembayaran QRIS</Badge></div>
       <div className="space-y-3">{qrisAudit.map(({payment,assurance},index)=><div key={payment.id||index} className="rounded-xl border border-emerald-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
         <div><p className="text-gray-500">Mode</p><b>{assuranceModeLabel(assurance?.mode)}</b></div>
         <div><p className="text-gray-500">Nominal</p><b>{formatRp(payment.amount)}</b></div>
         <div><p className="text-gray-500">Verifikasi</p><b className={assurance?.verification?.status==='merchant-notification-confirmed'?'text-emerald-700':'text-amber-700'}>{assurance?.verification?.status==='merchant-notification-confirmed'?'Notifikasi merchant dikonfirmasi':'Belum ada audit konfirmasi'}</b></div>
         <div><p className="text-gray-500">Kasir / waktu</p><b>{assurance?.verification?.confirmedByName||'-'}</b><p className="text-[11px] text-gray-500">{assurance?.verification?.confirmedAt?formatDateTimeId(assurance.verification.confirmedAt):'-'}</p></div>
         {assurance?.merchantName&&<div><p className="text-gray-500">Merchant QRIS</p><b>{assurance.merchantName}</b></div>}
         {assurance?.sessionId&&<div><p className="text-gray-500">Session</p><b className="font-mono break-all">{assurance.sessionId}</b></div>}
         {assurance?.verification?.reference&&<div className="sm:col-span-2"><p className="text-gray-500">Referensi / approval</p><b className="break-all">{assurance.verification.reference}</b></div>}
       </div>)}</div>
     </Card>}
     {refunds.length>0&&<Card className="p-4"><p className="font-bold mb-3">Riwayat Refund/Void</p>{refunds.map(r=><div key={r.id} className="py-2 border-b last:border-0 flex justify-between gap-3"><div className="min-w-0"><Badge tone="red">{r.type}</Badge><p className="text-xs text-gray-500 mt-1">{r.reason} · {r.approvedByName}</p>{Number(r.receivableReduction || 0)>0&&<p className="text-xs text-amber-700 mt-1">Potong piutang {formatRp(r.receivableReduction)}</p>}{r.payoutAmount!==undefined&&Number(r.payoutAmount || 0)!==Number(r.amount || 0)&&<p className="text-xs text-emerald-700">Dana kembali {formatRp(r.payoutAmount)}</p>}</div><b className="text-red-600 shrink-0">{formatRp(r.amount)}</b></div>)}</Card>}
   </div>
 </Modal>
}
function RefundModal({ sale, refunds, serialNumbers = [], voidAll, onClose, onSubmit }) {
  const refundedSerialIds = new Set((refunds || []).flatMap(refund => (refund.items || []).flatMap(item => item.serialIds || [])));
  const [items, setItems] = useState(() => sale.items.map(line => {
    const maxQty = remainingSaleLineQty(line, refunds);
    const originalSerialIds = (line.serialIds || []).filter(id => !refundedSerialIds.has(id));
    const serialOptions = originalSerialIds.map(id => serialNumbers.find(row => row.id === id)).filter(Boolean).filter(row => row.saleId === sale.id && row.status === 'SOLD');
    const basePerQty = Number(line.baseQty || line.qty || 0) / Math.max(0.000001, Number(line.qty || 0));
    const required = originalSerialIds.length ? Math.round(maxQty * basePerQty) : 0;
    return {
      lineId: line.lineId, productId: line.productId, name: line.name, price: Number(line.netUnitPrice ?? line.price),
      qty: voidAll ? maxQty : 0, maxQty, step: Number(line.quantityStep || 1), unit: line.unit || 'item', basePerQty,
      serialTracking: originalSerialIds.length > 0, serialOptions, serialIds: voidAll ? serialOptions.slice(0, required).map(row => row.id) : []
    };
  }));
  const [reason, setReason] = useState(voidAll ? 'Kesalahan transaksi' : 'Barang dikembalikan pelanggan');
  const [restock, setRestock] = useState(true);
  const [method, setMethod] = useState('Tunai');
  const [managerPin, setManagerPin] = useState('');

  const updateQty = (index, raw) => setItems(previous => previous.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    const qty = Math.min(row.maxQty, normalizeQuantity(raw, { allowFractional: row.step < 1, step: row.step, min: 0 }));
    const required = row.serialTracking ? Math.max(0, Math.round(qty * row.basePerQty)) : 0;
    return { ...row, qty, serialIds: row.serialTracking ? (row.serialIds || []).slice(0, required) : [] };
  }));
  const toggleSerial = (index, serialId) => setItems(previous => previous.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    const required = Math.max(0, Math.round(Number(row.qty || 0) * Number(row.basePerQty || 1)));
    const selected = row.serialIds || [];
    if (selected.includes(serialId)) return { ...row, serialIds: selected.filter(id => id !== serialId) };
    if (selected.length >= required) return row;
    return { ...row, serialIds: [...selected, serialId] };
  }));

  const selected = items.filter(item => item.qty > 0);
  const amount = selected.reduce((sum, item) => sum + item.price * item.qty, 0);
  const serialIncomplete = selected.some(item => item.serialTracking && (item.serialIds || []).length !== Math.round(Number(item.qty || 0) * Number(item.basePerQty || 1)));

  return <Modal title={voidAll ? 'Batalkan / Void Transaksi' : 'Refund Penjualan'} onClose={onClose} size="lg" footer={<>
    <Button variant="secondary" onClick={onClose}>Batal</Button>
    <Button variant="danger" onClick={() => onSubmit({ saleId: sale.id, items: selected, reason, restock, method, managerPin, voidAll })} disabled={!selected.length || !reason.trim() || serialIncomplete}>{voidAll ? 'Void Transaksi' : 'Proses Refund'}</Button>
  </>}>
    <div className="space-y-4">
      <Card className="p-3 bg-red-50"><p className="text-xs text-red-700">Perkiraan nilai item refund</p><p className="font-black text-xl text-red-800">{formatRp(amount)}</p><p className="text-[11px] text-red-600 mt-1">Nominal final mengikuti diskon, pajak, dan pembulatan transaksi asli.</p></Card>
      <div className="space-y-2">{items.map((item, index) => {
        const requiredSerials = item.serialTracking ? Math.max(0, Math.round(Number(item.qty || 0) * Number(item.basePerQty || 1))) : 0;
        return <Card key={item.lineId || `${item.productId}-${index}`} className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px] gap-2 items-center"><div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">Maksimal {formatQuantity(item.maxQty)} {item.unit}</p></div><NumberInput inputMode="decimal" min="0" max={item.maxQty} step={item.step} disabled={voidAll} value={item.qty} title={item.step < 1 ? quantityStepLabel(item.step, item.unit) : undefined} onValueChange={value => updateQty(index, value)}/></div>
          {item.serialTracking && Number(item.qty || 0) > 0 && <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3"><p className="text-xs font-black text-violet-900">Serial yang dikembalikan ({(item.serialIds || []).length}/{requiredSerials})</p>{item.serialOptions.length === 0 ? <p className="text-xs text-red-700 mt-2">Tidak ada serial SOLD yang tersedia. Jika serial sedang dalam proses garansi, selesaikan klaim terlebih dahulu.</p> : <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">{item.serialOptions.map(serial => <label key={serial.id} className="flex items-center gap-2 bg-white border rounded-lg p-2 text-xs"><input type="checkbox" checked={(item.serialIds || []).includes(serial.id)} disabled={voidAll} onChange={() => toggleSerial(index, serial.id)}/><span className="font-bold break-all">{serial.serial}</span></label>)}</div>}</div>}
        </Card>;
      })}</div>
      {serialIncomplete && <p className="text-xs font-bold text-red-700 bg-red-50 rounded-xl p-3">Pilih jumlah serial yang tepat untuk item berserial sebelum refund.</p>}
      <Field label="Alasan"><Textarea value={reason} onChange={e => setReason(e.target.value)}/></Field>
      <Field label="Metode Pengembalian Dana"><Select value={method} onChange={e => setMethod(e.target.value)}><option>Tunai</option><option>Transfer</option><option>QRIS</option><option>Kartu/EDC</option></Select></Field>
      <label className="flex gap-2 items-center p-3 rounded-xl bg-gray-50"><input type="checkbox" checked={restock} onChange={e => setRestock(e.target.checked)}/><span className="text-sm font-bold">Barang layak jual dan kembali ke stok</span></label>
      <Field label="PIN Manager/Owner" hint="Wajib untuk kasir dan transaksi di atas batas persetujuan"><Input type="password" inputMode="numeric" maxLength="4" value={managerPin} onChange={e => setManagerPin(e.target.value.replace(/\D/g,''))}/></Field>
    </div>
  </Modal>;
}

import React, { useMemo, useState } from 'react';
import { BarChart3, Clock3, Download, Package, Percent, ReceiptText, RotateCcw, TrendingUp, WalletCards } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { downloadFile, formatRp, localDateKey } from '../utils/helpers.js';
import { buildNetPaymentBreakdown, buildNetProductPerformance, calculateNetHpp, calculateNetPurchaseValue } from '../utils/accounting.js';
import { buildInventoryAging, buildSmartRestock, receivableAging } from '../utils/businessInsights.js';
import { Badge, Button, Card, EmptyState, PageHeader, SummaryCard } from '../components/ui.jsx';
import { formatQuantity } from '../utils/fractionalUnits.js';
import { formatDateTimeId } from '../utils/temporal.js';

const tabs = [['summary', 'Ringkasan'], ['payments', 'Pembayaran'], ['products', 'Produk'], ['inventory', 'Stok & Aging'], ['finance', 'Utang & Piutang'], ['shifts', 'Shift']];

export default function ReportsScreen() {
  const { scoped } = usePos();
  const [tab, setTab] = useState('summary');
  const metrics = useMemo(() => {
    const valid = scoped.sales.filter(s => s.status !== 'VOIDED' && s.status !== 'VOID');
    const revenue = valid.reduce((sum, s) => sum + Number(s.total || 0) - Number(s.refundedTotal || 0), 0);
    const hpp = calculateNetHpp(scoped.sales, scoped.refunds);
    const expenses = scoped.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const discounts = valid.reduce((sum, s) => sum + Number(s.globalDiscount || 0) + Number(s.promoDiscount || 0) + Number(s.loyaltyDiscount || 0) + (s.items || []).reduce((a, i) => a + Number(i.itemDiscount || 0), 0), 0);
    const tax = valid.reduce((sum, s) => sum + Number(s.tax || 0), 0);
    const refunds = scoped.refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    return { valid, revenue, hpp, expenses, discounts, tax, refunds, profit: revenue - hpp - expenses };
  }, [scoped]);
  const inventoryAging = useMemo(() => buildInventoryAging({ products: scoped.products, sales: scoped.sales, stockMovements: scoped.movements }), [scoped.products, scoped.sales, scoped.movements]);
  const smartRestock = useMemo(() => buildSmartRestock({ products: scoped.products, sales: scoped.sales, purchaseOrders: scoped.purchaseOrders, supplierPrices: scoped.supplierPriceHistory }), [scoped.products, scoped.sales, scoped.purchaseOrders, scoped.supplierPriceHistory]);
  const exportAll = () => {
    const rows = ['Tanggal,ID,Pelanggan,Status,Total,Refund,Metode'];
    scoped.sales.forEach(s => rows.push([s.createdAt, s.id, `"${s.customerName || ''}"`, s.status, s.total, s.refundedTotal || 0, `"${(s.payments || []).map(p => p.name).join('+')}"`].join(',')));
    downloadFile(`Laporan-Bumi-Makmur-${localDateKey()}.csv`, `\uFEFF${rows.join('\n')}`, 'text/csv;charset=utf-8');
  };
  return <div className="h-full flex flex-col bg-gray-50 generic-bg">
    <PageHeader title="Laporan & Analitik" subtitle="Penjualan, margin, pembayaran, stok mati, modal tertahan, hutang/piutang, dan shift" actions={<Button onClick={exportAll}><Download size={17}/> Ekspor CSV</Button>}/>
    <div className="bg-white border-b px-4 md:px-6 flex gap-1 overflow-x-auto no-scrollbar card-element">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 min-h-[52px] font-bold text-sm whitespace-nowrap border-b-2 ${tab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>{label}</button>)}</div>
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
      {tab === 'summary' && <SummaryTab metrics={metrics} sales={scoped.sales}/>} 
      {tab === 'payments' && <PaymentsTab sales={scoped.sales} refunds={scoped.refunds}/>} 
      {tab === 'products' && <ProductsTab sales={scoped.sales} refunds={scoped.refunds}/>} 
      {tab === 'inventory' && <InventoryTab products={scoped.products} movements={scoped.movements} purchases={scoped.purchases} aging={inventoryAging} restock={smartRestock}/>} 
      {tab === 'finance' && <FinanceTab receivables={scoped.receivables} payables={scoped.payables} expenses={scoped.expenses}/>} 
      {tab === 'shifts' && <ShiftTab shifts={scoped.shifts} movements={scoped.cashMovements}/>} 
    </div>
  </div>;
}

function SummaryTab({ metrics, sales }) {
  const chart = useMemo(() => [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const key = localDateKey(d); return { key, total: sales.filter(s => localDateKey(s.createdAt) === key && s.status !== 'VOIDED' && s.status !== 'VOID').reduce((sum, s) => sum + Number(s.total || 0) - Number(s.refundedTotal || 0), 0) }; }), [sales]);
  const max = Math.max(1, ...chart.map(d => d.total));
  return <div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><SummaryCard title="Omzet Bersih" value={formatRp(metrics.revenue)} icon={TrendingUp} tone="green"/><SummaryCard title="HPP" value={formatRp(metrics.hpp)} icon={Package} tone="orange"/><SummaryCard title="Pengeluaran" value={formatRp(metrics.expenses)} icon={WalletCards} tone="red"/><SummaryCard title="Laba Bersih" value={formatRp(metrics.profit)} icon={BarChart3} tone={metrics.profit >= 0 ? 'blue' : 'red'}/></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><SummaryCard title="Diskon" value={formatRp(metrics.discounts)} icon={Percent} tone="purple"/><SummaryCard title="Pajak" value={formatRp(metrics.tax)} icon={ReceiptText} tone="blue"/><SummaryCard title="Refund/Void" value={formatRp(metrics.refunds)} icon={RotateCcw} tone="red"/></div><Card className="p-5"><p className="font-bold mb-5">Penjualan 7 Hari Terakhir</p><div className="h-56 flex items-end gap-2 border-b pb-2">{chart.map(d => <div key={d.key} className="flex-1 h-full flex flex-col justify-end items-center gap-2"><div className="text-[10px] text-gray-500">{d.total ? formatRp(d.total) : ''}</div><div className="w-full max-w-12 bg-emerald-500 rounded-t-md" style={{ height: `${Math.max(d.total ? 4 : 0, d.total / max * 80)}%` }}/><span className="text-[10px] font-bold text-gray-500">{d.key.slice(5)}</span></div>)}</div></Card></div>;
}

function PaymentsTab({ sales, refunds }) {
  const rows = buildNetPaymentBreakdown(sales, refunds);
  return <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Object.entries(rows).map(([name, total]) => <SummaryCard key={name} title={name} value={formatRp(total)} icon={WalletCards} tone={total < 0 ? 'red' : 'blue'}/>)}</div><Card className="p-4"><p className="font-bold mb-3">Refund per Metode</p>{refunds.length === 0 ? <p className="text-sm text-gray-500">Belum ada refund.</p> : refunds.map(r => <div key={r.id} className="py-2 border-b last:border-0 flex justify-between"><div><Badge tone="red">{r.type}</Badge><span className="text-sm ml-2">{r.method}</span></div><b className="text-red-600">{formatRp(r.payoutAmount ?? r.amount)}</b></div>)}</Card></div>;
}

function ProductsTab({ sales, refunds }) {
  const rows = buildNetProductPerformance(sales, refunds);
  return rows.length === 0 ? <EmptyState icon={Package} title="Belum ada data produk terjual"/> : <div className="space-y-3">{rows.map((r, i) => <Card key={r.productId || r.name} className="p-4 flex justify-between gap-3"><div><p className="font-bold"><span className="text-gray-400 mr-2">#{i + 1}</span>{r.name}</p><p className="text-xs text-gray-500">Terjual bersih {formatQuantity(r.qty)} · margin {formatRp(r.revenue - r.hpp)}</p></div><b className="text-emerald-600">{formatRp(r.revenue)}</b></Card>)}</div>;
}

function InventoryTab({ products, movements, purchases, aging, restock }) {
  const value = products.reduce((sum, p) => sum + Number(p.stock || 0) * Number(p.modalPrice || 0), 0);
  const low = products.filter(p => Number(p.stock || 0) <= Number(p.minStock || 0) && p.active !== false);
  const bought = calculateNetPurchaseValue(purchases);
  const dead = aging.filter(row => row.movementClass === 'dead' && Number(row.stock || 0) > 0);
  const slow = aging.filter(row => row.movementClass === 'slow' && Number(row.stock || 0) > 0);
  const fast = aging.filter(row => row.movementClass === 'fast' && Number(row.stock || 0) > 0);
  const excess = aging.filter(row => row.excessStock && Number(row.stock || 0) > 0);
  const dormant = aging.filter(row => ['slow', 'dead'].includes(row.movementClass) && Number(row.stock || 0) > 0);
  const deadCapital = dead.reduce((sum, row) => sum + row.capital, 0);
  const excessCapital = excess.reduce((sum, row) => sum + row.capital, 0);
  return <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><SummaryCard title="Nilai Persediaan" value={formatRp(value)} icon={Package} tone="blue"/><SummaryCard title="Fast Moving" value={`${fast.length} produk`} icon={TrendingUp} tone="green"/><SummaryCard title="Slow / Dead Stock" value={`${slow.length + dead.length} produk`} icon={Clock3} tone={dead.length ? 'red' : slow.length ? 'orange' : 'green'}/><SummaryCard title="Modal Berlebih" value={formatRp(excessCapital)} icon={Package} tone={excess.length ? 'orange' : 'green'}/></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><SummaryCard title="Stok Menipis" value={`${low.length} produk`} icon={Package} tone={low.length ? 'red' : 'green'}/><SummaryCard title="Modal Stok Mati 90+ Hari" value={formatRp(deadCapital)} icon={Clock3} tone={dead.length ? 'red' : 'green'}/><SummaryCard title="Stok Berlebih" value={`${excess.length} produk`} icon={Package} tone={excess.length ? 'orange' : 'green'}/><SummaryCard title="Pembelian Bersih" value={formatRp(bought)} icon={ReceiptText} tone="orange"/></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><Card className="p-4"><div className="flex justify-between"><div><p className="font-black">Inventory Aging & Perputaran</p><p className="text-xs text-gray-500">Mengutamakan hari sejak penjualan terakhir; barang yang belum pernah terjual dihitung sejak stok masuk pertama/terbaru yang tersedia.</p></div><Badge tone={dead.length ? 'red' : slow.length ? 'orange' : 'green'}>{dead.length} dead · {slow.length} slow</Badge></div><div className="mt-3 max-h-[50vh] overflow-y-auto">{dormant.length === 0 ? <p className="text-sm text-gray-500">Tidak ada slow/dead stock yang perlu perhatian.</p> : dormant.slice(0, 50).map(row => <div key={row.id} className="py-3 border-b last:border-0 flex justify-between gap-3"><div><p className="font-bold text-sm">{row.name}</p><p className="text-xs text-gray-500">{row.neverSold ? `Belum pernah terjual · umur ${row.inactiveDays} hari` : `Terakhir terjual ${row.inactiveDays} hari lalu`} · stok {formatQuantity(row.stock)} {row.baseUnit}</p>{row.coverageDays !== null && <p className="text-[11px] text-gray-500">Coverage ±{row.coverageDays.toFixed(1)} hari</p>}</div><div className="text-right"><Badge tone={row.movementClass === 'dead' ? 'red' : 'orange'}>{row.movementClass === 'dead' ? 'Dead' : 'Slow'}</Badge>{row.clearanceSuggested && <p className="text-[10px] font-black text-purple-700 mt-1">Pertimbangkan clearance</p>}<p className="text-xs font-bold mt-1">{formatRp(row.capital)}</p></div></div>)}</div></Card><Card className="p-4"><div className="flex justify-between"><div><p className="font-black">Prioritas Restock</p><p className="text-xs text-gray-500">Memisahkan PO yang benar-benar dipesan dari Draft PO agar rencana pembelian tidak disalahartikan sebagai barang dalam perjalanan.</p></div><Badge tone={restock.length ? 'orange' : 'green'}>{restock.length}</Badge></div><div className="mt-3 max-h-[50vh] overflow-y-auto">{restock.length === 0 ? <p className="text-sm text-gray-500">Belum ada rekomendasi restock.</p> : restock.slice(0, 50).map(row => <div key={row.id} className="py-3 border-b last:border-0 flex justify-between"><div><p className="font-bold text-sm">{row.name}</p><p className="text-xs text-gray-500">Stok {formatQuantity(row.stock)} · dipesan {formatQuantity(row.incoming)} · draft {formatQuantity(row.plannedDraft || 0)}</p></div><b className="text-emerald-700">{row.suggestedQty > 0 ? `+${formatQuantity(row.suggestedQty)} ${row.baseUnit}` : 'Sudah direncanakan'}</b></div>)}</div></Card></div>
    <Card className="p-4"><p className="font-bold mb-3">Pergerakan Terbaru</p>{movements.slice(0, 20).map(m => <div key={m.id} className="py-2 border-b last:border-0 flex justify-between"><span className="text-sm">{m.type} · {m.productName}</span><b className={m.qtyChange > 0 ? 'text-emerald-600' : 'text-orange-600'}>{m.qtyChange > 0 ? '+' : ''}{formatQuantity(m.qtyChange)}</b></div>)}</Card>
  </div>;
}

function FinanceTab({ receivables, payables, expenses }) {
  const rec = receivables.filter(r => r.status === 'OPEN');
  const pay = payables.filter(r => r.status === 'OPEN');
  const aging = receivableAging(receivables);
  const buckets = [['Belum jatuh tempo', aging.current], ['1–30 hari', aging.d1_30], ['31–60 hari', aging.d31_60], ['61–90 hari', aging.d61_90], ['>90 hari', aging.d90plus]];
  return <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><SummaryCard title="Piutang Aktif" value={formatRp(rec.reduce((s, r) => s + Number(r.balance || 0), 0))} icon={WalletCards} tone="orange"/><SummaryCard title="Hutang Pemasok" value={formatRp(pay.reduce((s, r) => s + Number(r.balance || 0), 0))} icon={WalletCards} tone="red"/><SummaryCard title="Beban Operasional" value={formatRp(expenses.reduce((s, e) => s + Number(e.amount || 0), 0))} icon={WalletCards} tone="purple"/></div><Card className="p-4"><p className="font-black mb-3">Umur Piutang</p><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{buckets.map(([label, total]) => <div key={label} className="rounded-xl bg-gray-50 p-3"><p className="text-[11px] text-gray-500">{label}</p><b className={label === '>90 hari' && total > 0 ? 'text-red-700' : ''}>{formatRp(total)}</b></div>)}</div></Card><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Card className="p-4"><p className="font-bold mb-3">Piutang Pelanggan</p>{rec.length === 0 ? <p className="text-sm text-gray-500">Tidak ada piutang aktif.</p> : rec.map(r => <div key={r.id} className="py-2 border-b flex justify-between"><div><span className="text-sm font-bold">{r.customerName}</span><p className="text-xs text-gray-500">Jatuh tempo {r.dueDate || '-'}</p></div><b className="text-orange-600">{formatRp(r.balance)}</b></div>)}</Card><Card className="p-4"><p className="font-bold mb-3">Hutang Pemasok</p>{pay.length === 0 ? <p className="text-sm text-gray-500">Tidak ada hutang aktif.</p> : pay.map(r => <div key={r.id} className="py-2 border-b flex justify-between"><div><span className="text-sm font-bold">{r.supplierName}</span><p className="text-xs text-gray-500">Jatuh tempo {r.dueDate || '-'}</p></div><b className="text-red-600">{formatRp(r.balance)}</b></div>)}</Card></div></div>;
}

function ShiftTab({ shifts, movements }) {
  return shifts.length === 0 ? <EmptyState icon={Clock3}/> : <div className="space-y-3">{shifts.map(s => { const rows = movements.filter(m => m.shiftId === s.id); const sales = rows.filter(m => m.type === 'SALE').reduce((a, m) => a + Number(m.amount || 0), 0); return <Card key={s.id} className="p-4"><div className="flex justify-between"><div><p className="font-bold">{s.userName}</p><p className="text-xs text-gray-500">{formatDateTimeId(s.startAt)} {s.endAt ? `- ${formatDateTimeId(s.endAt)}` : ''}</p></div><Badge tone={s.status === 'OPEN' ? 'blue' : 'gray'}>{s.status}</Badge></div><div className="grid grid-cols-3 gap-2 mt-3 text-sm"><div><p className="text-gray-500">Penjualan Tunai</p><b>{formatRp(sales)}</b></div><div><p className="text-gray-500">Expected</p><b>{formatRp(s.expectedEndingCash || 0)}</b></div><div><p className="text-gray-500">Selisih</p><b className={(s.difference || 0) < 0 ? 'text-red-600' : 'text-emerald-600'}>{formatRp(s.difference || 0)}</b></div></div></Card>; })}</div>;
}

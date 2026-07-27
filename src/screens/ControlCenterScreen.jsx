import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, BadgeDollarSign, Boxes, CheckCircle2, CircleDollarSign,
  ClipboardList, Clock3, Download, Gauge, PackageX, Printer, RefreshCw,
  ScanSearch, ShieldAlert, TrendingUp
} from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { Badge, Button, Card, EmptyState, PageHeader } from '../components/ui.jsx';
import { buildOperationalHealth, buildReorderCsv } from '../utils/operationsHealth.js';
import { downloadFile, formatRp, localDateKey, printHtmlDocument } from '../utils/helpers.js';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const scoreTone = score => score >= 85 ? 'green' : score >= 65 ? 'orange' : 'red';
const metricToneClass = tone => ({ emerald: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700', orange: 'bg-orange-50 text-orange-700', blue: 'bg-blue-50 text-blue-700' }[tone] || 'bg-gray-50 text-gray-700');

export default function ControlCenterScreen() {
  const { db, branchId, branch, syncNow, online, cloudReady, pendingSyncCount } = usePos();
  const [tab, setTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const health = useMemo(() => buildOperationalHealth(db, branchId), [db, branchId]);

  const refresh = async () => {
    setRefreshing(true);
    try { if (online) await syncNow(); } finally { setRefreshing(false); }
  };

  const exportReorder = () => {
    downloadFile(`Saran-Restock-${branch?.name || branchId}-${localDateKey()}.csv`, buildReorderCsv(health.lowStock), 'text/csv;charset=utf-8');
  };

  const printReorder = () => {
    const rows = health.lowStock.map((row, index) => `<tr><td>${index + 1}</td><td><b>${escapeHtml(row.name)}</b><br><small>${escapeHtml(row.sku || '-')} · Rak ${escapeHtml(row.rack || '-')}</small></td><td>${row.stock} ${escapeHtml(row.baseUnit || '')}</td><td>${row.minStock}</td><td><b>${row.suggestedQty} ${escapeHtml(row.baseUnit || '')}</b></td></tr>`).join('');
    printHtmlDocument(
      `Saran Restock ${branch?.name || db.configs.companyName || 'BUMI MAKMUR'}`,
      `<div class="center"><h2>${escapeHtml(branch?.name||db.configs.companyName||'BUMI MAKMUR')}</h2><p class="bold">SARAN RESTOCK</p><p>${escapeHtml(db.configs.companyName || '')}</p><p>${new Date().toLocaleString('id-ID')}</p></div><div class="line"></div><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th>No</th><th>Produk</th><th>Stok</th><th>Min</th><th>Saran</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Tidak ada stok rendah.</td></tr>'}</tbody></table>`,
      '80mm'
    );
  };

  const tabs = [
    ['overview', 'Ringkasan'],
    ['restock', `Restock (${health.lowStock.length})`],
    ['quality', `Kualitas Data (${health.marginRisk.length + health.duplicateCodes.length})`],
    ['finance', `Peringatan Keuangan (${health.overdueReceivables.length + health.overduePayables.length})`]
  ];

  return <div className="h-full flex flex-col bg-gray-50 generic-bg">
    <PageHeader title="Pusat Kontrol Operasional" subtitle={`${branch?.name || branchId} · audit stok, margin, kas, piutang, dan kualitas data`} actions={<Button variant="secondary" onClick={refresh} disabled={refreshing || !online}><RefreshCw size={17} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Memperbarui...' : 'Refresh Cloud'}</Button>}/>
    <div className="bg-white border-b px-4 md:px-6 flex overflow-x-auto no-scrollbar card-element">
      {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 min-h-[52px] font-bold text-sm border-b-2 whitespace-nowrap ${tab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>{label}</button>)}
    </div>
    <div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6 space-y-4">
      <Card className="p-5 bg-gradient-to-br from-slate-950 to-emerald-950 text-white border-0 overflow-hidden relative">
        <div className="absolute -right-12 -top-12 w-52 h-52 bg-emerald-400/10 blur-3xl rounded-full"/>
        <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-center">
          <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center"><Gauge size={42} className="text-emerald-200"/></div>
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">Operational Health Score</p><div className="flex flex-wrap items-end gap-3 mt-1"><p className="text-5xl font-black">{health.score}</p><Badge tone={scoreTone(health.score)}>{health.score >= 85 ? 'Sehat' : health.score >= 65 ? 'Perlu perhatian' : 'Tindakan segera'}</Badge></div><p className="text-sm text-emerald-100 mt-2">{health.issueCount} temuan operasional · {cloudReady ? 'Cloud tersambung' : 'Cache lokal aktif'} · {pendingSyncCount} antrean</p></div>
          <div className="grid grid-cols-2 gap-2 text-center"><div className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-black">{health.salesTodayCount}</p><p className="text-[10px] text-emerald-200">Transaksi hari ini</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-sm font-black">{formatRp(health.salesTodayTotal)}</p><p className="text-[10px] text-emerald-200">Omzet bersih hari ini</p></div></div>
        </div>
      </Card>

      {tab === 'overview' && <Overview health={health}/>} 
      {tab === 'restock' && <Restock health={health} onExport={exportReorder} onPrint={printReorder}/>} 
      {tab === 'quality' && <Quality health={health}/>} 
      {tab === 'finance' && <FinanceAlerts health={health}/>} 
    </div>
  </div>;
}

function Overview({ health }) {
  const cards = [
    { label: 'Nilai Stok Modal', value: formatRp(health.stockValue), detail: `Potensi retail ${formatRp(health.retailStockValue)}`, icon: Boxes, tone: 'emerald' },
    { label: 'Stok Rendah', value: health.lowStock.length, detail: `${health.outOfStock.length} produk habis`, icon: PackageX, tone: health.outOfStock.length ? 'red' : 'orange' },
    { label: 'Piutang Berjalan', value: formatRp(health.receivableTotal), detail: `${formatRp(health.overdueReceivableTotal)} terlambat`, icon: CircleDollarSign, tone: health.overdueReceivables.length ? 'red' : 'blue' },
    { label: 'Shift Terlalu Lama', value: health.staleShifts.length, detail: 'Perlu penutupan/pengecekan kas', icon: Clock3, tone: health.staleShifts.length ? 'orange' : 'emerald' }
  ];
  return <>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(item => { const Icon = item.icon; return <Card key={item.label} className="p-4"><div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${metricToneClass(item.tone)}`}><Icon size={22}/></div><p className="text-xs text-gray-500 mt-3">{item.label}</p><p className="text-2xl font-black text-gray-900 mt-1">{item.value}</p><p className="text-xs text-gray-500 mt-1">{item.detail}</p></Card>; })}</div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <IssueSummary title="Prioritas Hari Ini" icon={ShieldAlert} items={[
        health.outOfStock.length ? `${health.outOfStock.length} produk habis dan tidak dapat dijual tanpa koreksi stok.` : '',
        health.overdueReceivables.length ? `${health.overdueReceivables.length} piutang melewati jatuh tempo.` : '',
        health.marginRisk.length ? `${health.marginRisk.length} produk dijual setara/di bawah modal.` : '',
        health.staleShifts.length ? `${health.staleShifts.length} shift terbuka terlalu lama.` : ''
      ].filter(Boolean)}/>
      <IssueSummary title="Kontrol Data" icon={ScanSearch} items={[
        health.duplicateCodes.length ? `${health.duplicateCodes.length} kelompok SKU/barcode ganda.` : '',
        health.lowStock.length ? `${health.lowStock.length} produk membutuhkan restock.` : '',
        health.payableTotal ? `Total utang pemasok aktif ${formatRp(health.payableTotal)}.` : '',
        !health.issueCount ? 'Tidak ditemukan masalah prioritas pada cabang ini.' : ''
      ].filter(Boolean)}/>
    </div>
  </>;
}

function IssueSummary({ title, icon: Icon, items }) {
  return <Card className="p-5"><p className="font-black flex items-center gap-2"><Icon size={19} className="text-emerald-700"/>{title}</p><div className="mt-4 space-y-3">{items.map(item => <div key={item} className="flex gap-3 text-sm text-gray-600"><CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5"/><span>{item}</span></div>)}</div></Card>;
}

function Restock({ health, onExport, onPrint }) {
  return <div className="space-y-4">
    <Card className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div><p className="font-black">Saran Pesanan Otomatis</p><p className="text-xs text-gray-500 mt-1">Saran = target 2× stok minimum dikurangi stok saat ini. Tetap periksa kebutuhan proyek dan lead time pemasok.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={onPrint}><Printer size={17}/> Cetak</Button><Button onClick={onExport}><Download size={17}/> CSV</Button></div></Card>
    {health.lowStock.length === 0 ? <EmptyState icon={CheckCircle2} title="Stok aman" description="Tidak ada produk yang berada di bawah stok minimum."/> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{health.lowStock.map(row => <Card key={row.id} className={`p-4 ${row.stock <= 0 ? 'border-red-200' : 'border-orange-200'}`}><div className="flex gap-3"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${row.stock <= 0 ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}><PackageX/></div><div className="flex-1 min-w-0"><div className="flex gap-2 items-start"><p className="font-bold text-gray-900 flex-1">{row.name}</p><Badge tone={row.stock <= 0 ? 'red' : 'orange'}>{row.stock <= 0 ? 'Habis' : 'Menipis'}</Badge></div><p className="text-xs text-gray-500 mt-1">{row.sku || '-'} · Rak {row.rack || '-'} · Modal {formatRp(row.modalPrice)}</p><div className="grid grid-cols-3 gap-2 mt-3 text-center"><div className="rounded-xl bg-gray-50 p-2"><p className="text-[10px] text-gray-500">Stok</p><b>{row.stock} {row.baseUnit}</b></div><div className="rounded-xl bg-gray-50 p-2"><p className="text-[10px] text-gray-500">Minimum</p><b>{row.minStock}</b></div><div className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><p className="text-[10px]">Saran pesan</p><b>{row.suggestedQty} {row.baseUnit}</b></div></div></div></div></Card>)}</div>}
  </div>;
}

function Quality({ health }) {
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
    <Card className="p-5"><p className="font-black flex items-center gap-2"><TrendingUp size={19} className="text-red-600"/>Risiko Margin</p><p className="text-xs text-gray-500 mt-1">Harga retail sama atau lebih rendah dari harga modal.</p><div className="mt-3 max-h-[55vh] overflow-y-auto">{health.marginRisk.length === 0 ? <GoodMessage text="Tidak ada produk dengan margin negatif."/> : health.marginRisk.map(row => <div key={row.id} className="py-3 border-b last:border-0"><div className="flex justify-between gap-3"><div><p className="font-bold text-sm">{row.name}</p><p className="text-xs text-gray-500">Modal {formatRp(row.modalPrice)} · Retail {formatRp(row.prices?.retail)}</p></div><Badge tone="red">{formatRp(row.margin)}</Badge></div></div>)}</div></Card>
    <Card className="p-5"><p className="font-black flex items-center gap-2"><ScanSearch size={19} className="text-orange-600"/>SKU / Barcode Ganda</p><p className="text-xs text-gray-500 mt-1">Kode ganda dapat membuat scanner memilih produk yang salah.</p><div className="mt-3 max-h-[55vh] overflow-y-auto">{health.duplicateCodes.length === 0 ? <GoodMessage text="Tidak ada SKU atau barcode ganda."/> : health.duplicateCodes.map(group => <div key={`${group.field}-${group.value}`} className="py-3 border-b last:border-0"><p className="text-xs font-black uppercase text-orange-700">{group.field}: {group.value}</p>{group.items.map(row => <p key={row.id} className="text-sm text-gray-600 mt-1">• {row.name}</p>)}</div>)}</div></Card>
  </div>;
}

function FinanceAlerts({ health }) {
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
    <FinanceList title="Piutang Lewat Jatuh Tempo" icon={CircleDollarSign} rows={health.overdueReceivables} total={health.overdueReceivableTotal}/>
    <FinanceList title="Utang Pemasok Lewat Jatuh Tempo" icon={BadgeDollarSign} rows={health.overduePayables} total={health.overduePayables.reduce((sum, row) => sum + Number(row.balance || 0), 0)}/>
    <Card className="p-5 xl:col-span-2"><p className="font-black flex items-center gap-2"><Clock3 size={19} className="text-orange-600"/>Shift Terbuka Terlalu Lama</p><div className="mt-3">{health.staleShifts.length === 0 ? <GoodMessage text="Tidak ada shift yang melewati batas peringatan."/> : health.staleShifts.map(row => <div key={row.id} className="py-3 border-b flex justify-between gap-3"><div><p className="font-bold text-sm">{row.userName || row.userId}</p><p className="text-xs text-gray-500">Mulai {new Date(row.startAt).toLocaleString('id-ID')}</p></div><Badge tone="orange">{Math.floor(row.openHours)} jam</Badge></div>)}</div></Card>
  </div>;
}

function FinanceList({ title, icon: Icon, rows, total }) {
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-black flex items-center gap-2"><Icon size={19} className="text-red-600"/>{title}</p><p className="text-xs text-gray-500 mt-1">Total {formatRp(total)}</p></div><Badge tone={rows.length ? 'red' : 'green'}>{rows.length}</Badge></div><div className="mt-3 max-h-[55vh] overflow-y-auto">{rows.length === 0 ? <GoodMessage text="Tidak ada tagihan yang melewati jatuh tempo."/> : rows.map(row => <div key={row.id} className="py-3 border-b last:border-0 flex justify-between gap-3"><div><p className="font-bold text-sm">{row.customerName || row.supplierName || row.name || row.id}</p><p className="text-xs text-gray-500">Jatuh tempo {row.dueDate || '-'}</p></div><b className="text-red-700">{formatRp(row.balance)}</b></div>)}</div></Card>;
}

function GoodMessage({ text }) {
  return <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 flex gap-3 text-sm"><CheckCircle2 size={20} className="shrink-0"/><span>{text}</span></div>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, FileText, Pencil, Plus, Printer, ShieldCheck, ShoppingCart, Wrench } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { Button, Card, EmptyState, Field, Input, Modal, MoneyInput, NumberInput, PageHeader, SearchBox, Select, StatusBadge, Textarea } from '../components/ui.jsx';
import ProductPicker from '../components/ProductPicker.jsx';
import { conversionFactor, formatQuantity, normalizeQuantity, normalizeQuantityStep, priceForSaleUnit, recommendedQuantityStep } from '../utils/fractionalUnits.js';
import { escapeHtml, formatRp, generateId, localDateKey, printHtmlDocument } from '../utils/helpers.js';

const quoteStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'];
const warrantyStatuses = ['IN_STOCK', 'SOLD', 'WARRANTY', 'RETURNED'];

export default function BusinessToolsScreen({ initialTab = 'quotations', onNavigate }) {
  const [tab, setTab] = useState(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  return <div className="h-full flex flex-col bg-gray-50 generic-bg">
    <PageHeader title="Penawaran, Serial & Garansi" subtitle="Penawaran proyek, pelacakan unit berserial, dan klaim garansi dalam satu alur"/>
    <div className="bg-white border-b px-4 md:px-6 flex gap-1 overflow-x-auto no-scrollbar card-element">
      <TabButton active={tab === 'quotations'} onClick={() => setTab('quotations')} icon={FileText}>Penawaran</TabButton>
      <TabButton active={tab === 'warranty'} onClick={() => setTab('warranty')} icon={ShieldCheck}>Serial & Garansi</TabButton>
    </div>
    <div className="flex-1 min-h-0 overflow-hidden">{tab === 'quotations' ? <QuotationsTab onNavigate={onNavigate}/> : <WarrantyTab/>}</div>
  </div>;
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return <button onClick={onClick} className={`px-4 min-h-[52px] font-bold text-sm whitespace-nowrap border-b-2 flex items-center gap-2 ${active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><Icon size={17}/>{children}</button>;
}

function QuotationsTab({ onNavigate }) {
  const { db, scoped, saveQuotation, convertQuotationToBill, hasPermission } = usePos();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Semua');
  const [editing, setEditing] = useState(null);
  const canManage = hasPermission('quotations.manage');
  const effectiveQuoteStatus = row => row.status === 'CONVERTED' || row.status === 'REJECTED'
    ? row.status
    : (row.validUntil && String(row.validUntil).slice(0, 10) < localDateKey() ? 'EXPIRED' : row.status);
  const rows = useMemo(() => (scoped.quotations || []).filter(row => {
    const effectiveStatus = row.status === 'CONVERTED' || row.status === 'REJECTED'
      ? row.status
      : (row.validUntil && String(row.validUntil).slice(0, 10) < localDateKey() ? 'EXPIRED' : row.status);
    return (status === 'Semua' || effectiveStatus === status) && (!search || `${row.quoteNo} ${row.customerName}`.toLowerCase().includes(search.toLowerCase()));
  }).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [scoped.quotations, search, status]);

  const printQuote = quote => {
    const branch = db.branches.find(row => row.id === quote.branchId);
    const lines = (quote.items || []).map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}<br><span class="small">${formatQuantity(item.qty)} ${escapeHtml(item.unit)}</span></td><td class="right">${escapeHtml(formatRp(item.price))}</td><td class="right">${escapeHtml(formatRp(item.qty * item.price - Number(item.discount || 0)))}</td></tr>`).join('');
    printHtmlDocument(`Penawaran ${quote.quoteNo}`, `<div class="center"><h2>${escapeHtml(db.configs.companyName || 'BUMI MAKMUR')}</h2><p class="bold">PENAWARAN HARGA</p><p>${escapeHtml(branch?.name || '')}</p></div><div class="line"></div><p>No: <b>${escapeHtml(quote.quoteNo)}</b></p><p>Pelanggan: <b>${escapeHtml(quote.customerName)}</b></p><p>Berlaku sampai: <b>${escapeHtml(quote.validUntil || '-')}</b></p><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th>No</th><th>Barang</th><th class="right">Harga</th><th class="right">Jumlah</th></tr></thead><tbody>${lines}</tbody></table><div class="line"></div><div class="row"><span>Subtotal</span><b>${escapeHtml(formatRp(quote.subtotal))}</b></div>${quote.discount ? `<div class="row"><span>Diskon</span><b>-${escapeHtml(formatRp(quote.discount))}</b></div>` : ''}${quote.tax ? `<div class="row"><span>Pajak</span><b>${escapeHtml(formatRp(quote.tax))}</b></div>` : ''}<div class="row bold"><span>TOTAL</span><span>${escapeHtml(formatRp(quote.total))}</span></div>${quote.notes ? `<div class="line"></div><p class="small">Catatan: ${escapeHtml(quote.notes)}</p>` : ''}`);
  };

  const convert = quote => {
    try {
      convertQuotationToBill(quote.id);
      alert('Penawaran sudah dijadikan Open Bill. Harga dan barang tetap dapat diperiksa kasir sebelum pembayaran.');
      onNavigate?.('openBills');
    } catch (error) { alert(error.message); }
  };

  return <div className="h-full overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
    <div className="flex flex-col lg:flex-row gap-3 mb-4">
      <SearchBox value={search} onChange={setSearch} placeholder="Cari nomor penawaran atau pelanggan..."/>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">{['Semua', ...quoteStatuses].map(item => <button key={item} onClick={() => setStatus(item)} className={`px-3 min-h-[48px] rounded-xl border text-xs font-bold whitespace-nowrap ${status === item ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200'}`}>{item}</button>)}</div>
      {canManage && <Button onClick={() => setEditing({})} className="shrink-0"><Plus size={17}/> Penawaran Baru</Button>}
    </div>
    {rows.length === 0 ? <EmptyState icon={FileText} title="Belum ada penawaran" subtitle="Buat penawaran untuk tukang, kontraktor, pelanggan proyek, atau pelanggan toko."/> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(row => {
      const effectiveStatus = effectiveQuoteStatus(row);
      return <Card key={row.id} className="p-4">
        <div className="flex justify-between gap-3"><div><p className="font-black">{row.quoteNo}</p><p className="text-sm text-gray-600 mt-1">{row.customerName}</p><p className={`text-xs ${effectiveStatus === 'EXPIRED' ? 'text-red-600 font-bold' : 'text-gray-500'}`}>Berlaku sampai {row.validUntil || '-'}</p></div><StatusBadge status={effectiveStatus}/></div>
        <div className="mt-4 border-t pt-3 flex justify-between items-end"><div><p className="text-xs text-gray-500">{row.items?.length || 0} jenis barang</p><b className="text-emerald-700">{formatRp(row.total)}</b></div><div className="flex gap-2"><button title="Cetak / Simpan PDF" onClick={() => printQuote(row)} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><Printer size={17}/></button>{canManage && row.status !== 'CONVERTED' && <button title="Edit" onClick={() => setEditing(row)} className="px-3 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs">Edit</button>}{canManage && !['CONVERTED', 'REJECTED', 'EXPIRED'].includes(effectiveStatus) && <button title="Jadikan Open Bill" onClick={() => convert(row)} className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><ShoppingCart size={17}/></button>}</div></div>
      </Card>;
    })}</div>}
    {editing && <QuotationForm value={editing} products={scoped.products} customers={scoped.customers} configs={db.configs} onClose={() => setEditing(null)} onSave={payload => { try { saveQuotation(payload); setEditing(null); } catch (error) { alert(error.message); } }}/>} 
  </div>;
}

function QuotationForm({ value, products, customers, configs, onClose, onSave }) {
  const activeProducts = products.filter(row => row.active !== false);
  const activeCustomers = customers.filter(row => row.active !== false && row.id !== 'CUS-GENERAL');
  const [quoteNo, setQuoteNo] = useState(value.quoteNo || generateId('QT'));
  const [customerId, setCustomerId] = useState(value.customerId || activeCustomers[0]?.id || '');
  const [validUntil, setValidUntil] = useState(value.validUntil || (() => { const date = new Date(); date.setDate(date.getDate() + 14); return localDateKey(date); })());
  const [status, setStatus] = useState(value.status || 'DRAFT');
  const [notes, setNotes] = useState(value.notes || 'Harga berlaku selama periode penawaran dan dapat berubah setelah masa berlaku berakhir.');
  const [discount, setDiscount] = useState(Number(value.discount || 0));
  const [taxEnabled, setTaxEnabled] = useState(value.taxEnabled ?? Boolean(configs.taxEnabled));
  const [items, setItems] = useState(value.items || []);
  const [productId, setProductId] = useState(activeProducts[0]?.id || '');
  const product = activeProducts.find(row => row.id === productId);
  const [unit, setUnit] = useState(product?.baseUnit || 'pcs');
  const initialStep = product?.allowFractional ? normalizeQuantityStep(product.quantityStep, true, recommendedQuantityStep(product.baseUnit, product.category)) : 1;
  const [qty, setQty] = useState(initialStep);
  const [price, setPrice] = useState(product ? priceForSaleUnit(product, product.baseUnit, 'retail') : 0);
  const subtotal = items.reduce((sum, row) => sum + Math.max(0, Number(row.qty) * Number(row.price) - Number(row.discount || 0)), 0);
  const safeDiscount = Math.min(subtotal, Number(discount || 0));
  const tax = taxEnabled ? Math.round((subtotal - safeDiscount) * Number(configs.taxRate || 0) / 100) : 0;
  const total = subtotal - safeDiscount + tax;
  const units = product ? [{ unit: product.baseUnit, factor: 1 }, ...(product.conversions || [])] : [];

  const quantityStepFor = (target, targetUnit) => targetUnit === target?.baseUnit
    ? normalizeQuantityStep(target?.quantityStep, target?.allowFractional === true, recommendedQuantityStep(target?.baseUnit, target?.category))
    : 1;
  const chooseProduct = id => {
    const next = activeProducts.find(row => row.id === id);
    const nextUnit = next?.baseUnit || 'pcs';
    const step = quantityStepFor(next, nextUnit);
    setProductId(id); setUnit(nextUnit); setQty(step); setPrice(next ? priceForSaleUnit(next, nextUnit, 'retail') : 0);
  };
  const chooseUnit = nextUnit => {
    if (!product) return;
    const step = quantityStepFor(product, nextUnit);
    setUnit(nextUnit); setQty(step); setPrice(priceForSaleUnit(product, nextUnit, 'retail'));
  };
  const add = () => {
    if (!product) return;
    const step = quantityStepFor(product, unit);
    const safeQty = normalizeQuantity(qty, { allowFractional: step < 1, step, min: step });
    if (safeQty <= 0) return;
    const factor = conversionFactor(product, unit);
    setItems(previous => [...previous, { id: generateId('QITEM'), productId: product.id, name: product.name, qty: safeQty, unit, factor, baseQty: safeQty * factor, baseUnit: product.baseUnit, quantityStep: step, allowFractional: step < 1, price: Number(price || 0), discount: 0 }]);
  };
  const submit = () => onSave({ ...value, quoteNo, customerId, validUntil, status, notes, discount: safeDiscount, taxEnabled, taxRate: Number(configs.taxRate || 0), items });

  return <Modal title={value.id ? 'Edit Penawaran' : 'Buat Penawaran'} size="xl" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit} disabled={!customerId || !items.length}>Simpan Penawaran</Button></>}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nomor Penawaran"><Input value={quoteNo} onChange={e => setQuoteNo(e.target.value)}/></Field>
      <Field label="Status"><Select value={status} onChange={e => setStatus(e.target.value)}>{quoteStatuses.filter(row => row !== 'CONVERTED').map(row => <option key={row}>{row}</option>)}</Select></Field>
      <Field label="Pelanggan"><Select value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Pilih pelanggan...</option>{activeCustomers.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field>
      <Field label="Berlaku Sampai"><Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}/></Field>
      <Card className="md:col-span-2 p-4"><p className="font-black mb-3">Tambah Barang</p><div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"><ProductPicker products={activeProducts} value={productId} onChange={chooseProduct} label="Barang" className="md:col-span-5"/><Field label="Satuan" className="md:col-span-2"><Select value={unit} onChange={e => chooseUnit(e.target.value)}>{units.map(row => <option key={row.unit} value={row.unit}>{row.unit}</option>)}</Select></Field><Field label="Jumlah" className="md:col-span-2"><NumberInput inputMode="decimal" min={quantityStepFor(product, unit)} step={quantityStepFor(product, unit)} value={qty} onValueChange={value => setQty(value)} onBlur={() => setQty(normalizeQuantity(qty, { allowFractional: quantityStepFor(product, unit) < 1, step: quantityStepFor(product, unit), min: quantityStepFor(product, unit) }))}/></Field><Field label="Harga" className="md:col-span-3"><MoneyInput value={price} onValueChange={setPrice}/></Field></div><Button className="mt-3" variant="secondary" onClick={add}><Plus size={16}/> Tambah</Button></Card>
      <div className="md:col-span-2 space-y-2">{items.map((row, index) => <Card key={row.id || index} className="p-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_100px_150px_48px] gap-2 items-center"><div><p className="font-bold text-sm">{row.name}</p><p className="text-xs text-gray-500">{formatQuantity(row.qty)} {row.unit}</p></div><NumberInput inputMode="decimal" min={row.quantityStep || 1} step={row.quantityStep || 1} value={row.qty} onValueChange={value => setItems(prev => prev.map((item, i) => i === index ? { ...item, qty: value, baseQty: Number(value || 0) * Number(item.factor || 1) } : item))} onBlur={() => setItems(prev => prev.map((item, i) => { if (i !== index) return item; const step = Number(item.quantityStep || 1); const safeQty = normalizeQuantity(item.qty, { allowFractional: step < 1, step, min: step }); return { ...item, qty: safeQty, baseQty: safeQty * Number(item.factor || 1) }; }))}/><MoneyInput value={row.price} onValueChange={value => setItems(prev => prev.map((item, i) => i === index ? { ...item, price: value } : item))}/><button onClick={() => setItems(prev => prev.filter((_, i) => i !== index))} className="w-12 h-12 rounded-xl bg-red-50 text-red-600">×</button></Card>)}</div>
      <Field label="Diskon Penawaran"><MoneyInput max={subtotal} value={discount} onValueChange={setDiscount}/></Field>
      <label className="flex gap-3 items-center p-3 rounded-xl bg-gray-50"><input type="checkbox" checked={taxEnabled} onChange={e => setTaxEnabled(e.target.checked)}/><span className="font-bold text-sm">Gunakan pajak {Number(configs.taxRate || 0)}%</span></label>
      <Field label="Catatan" className="md:col-span-2"><Textarea value={notes} onChange={e => setNotes(e.target.value)}/></Field>
      <Card className="md:col-span-2 p-4 bg-emerald-50"><div className="flex justify-between"><span>Subtotal</span><b>{formatRp(subtotal)}</b></div><div className="flex justify-between"><span>Diskon</span><b>-{formatRp(safeDiscount)}</b></div><div className="flex justify-between"><span>Pajak</span><b>{formatRp(tax)}</b></div><div className="flex justify-between border-t mt-2 pt-2 text-lg"><b>Total</b><b className="text-emerald-700">{formatRp(total)}</b></div></Card>
    </div>
  </Modal>;
}

function WarrantyTab() {
  const { scoped, saveSerialNumber, saveWarrantyClaim, hasPermission } = usePos();
  const [search, setSearch] = useState('');
  const [serialEditing, setSerialEditing] = useState(null);
  const [claimSerial, setClaimSerial] = useState(null);
  const canManage = hasPermission('warranty.manage');
  const rows = useMemo(() => (scoped.serialNumbers || []).filter(row => !search || `${row.serial} ${row.productName} ${row.customerName || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))), [scoped.serialNumbers, search]);
  const claimsBySerial = useMemo(() => {
    const map = new Map();
    for (const claim of scoped.warrantyClaims || []) {
      const list = map.get(claim.serialId) || [];
      list.push(claim);
      map.set(claim.serialId, list.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))));
    }
    return map;
  }, [scoped.warrantyClaims]);
  const warrantyLabel = row => {
    if (!row.warrantyEndsAt) return row.warrantyMonths > 0 ? `${row.warrantyMonths} bulan` : 'Tanpa garansi';
    const end = new Date(row.warrantyEndsAt);
    const expired = end.getTime() < Date.now();
    return expired ? `Berakhir ${end.toLocaleDateString('id-ID')}` : `s.d. ${end.toLocaleDateString('id-ID')}`;
  };
  return <div className="h-full overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
    <div className="flex flex-col sm:flex-row gap-3 mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Cari serial, barang, atau pelanggan..."/>{canManage && <Button onClick={() => setSerialEditing({})} className="shrink-0"><Plus size={17}/> Daftarkan Serial</Button>}</div>
    {rows.length === 0 ? <EmptyState icon={ShieldCheck} title="Belum ada serial terdaftar" subtitle="Aktifkan pelacakan serial pada produk bergaransi. Serial dapat direkam langsung saat penerimaan atau didaftarkan manual setelahnya."/> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(row => {
      const claims = claimsBySerial.get(row.id) || [];
      const activeClaim = claims.find(claim => !['RESOLVED', 'REJECTED'].includes(claim.status));
      const latestClaim = claims[0];
      const expired = row.warrantyEndsAt && new Date(row.warrantyEndsAt).getTime() < Date.now();
      return <Card key={row.id} className="p-4 min-w-0">
        <div className="flex justify-between gap-3"><div className="min-w-0"><p className="font-black break-all">{row.serial}</p><p className="font-bold text-sm mt-1">{row.productName}</p><p className="text-xs text-gray-500">{row.customerName || 'Belum dikaitkan pelanggan'} · {warrantyLabel(row)}</p>{row.saleId && <p className="text-[11px] text-blue-600 mt-1">Penjualan {row.saleId}</p>}</div><StatusBadge status={expired && row.status === 'SOLD' ? 'EXPIRED' : row.status}/></div>
        {latestClaim && <div className="mt-3 rounded-xl bg-orange-50 p-3"><p className="text-xs font-bold text-orange-800"><Wrench size={14} className="inline mr-1"/>Klaim {latestClaim.status}{claims.length > 1 ? ` · ${claims.length} riwayat` : ''}</p><p className="text-xs text-orange-700 mt-1">{latestClaim.issue}</p></div>}
        <div className="mt-3 grid grid-cols-2 gap-2">{canManage && <Button variant="secondary" onClick={() => setSerialEditing(row)}><Pencil size={16}/> Edit Serial</Button>}{canManage && (activeClaim || (row.saleId && row.status !== 'RETURNED') ? <Button variant="secondary" onClick={() => setClaimSerial({ serial: row, existing: activeClaim || null })}><BadgeCheck size={16}/> {activeClaim ? 'Proses Klaim' : 'Klaim Garansi'}</Button> : <Button variant="secondary" disabled title="Klaim tersedia setelah serial terjual"><BadgeCheck size={16}/> Belum Terjual</Button>)}</div>
      </Card>;
    })}</div>}
    {serialEditing && <SerialForm value={serialEditing} products={scoped.products} customers={scoped.customers} sales={scoped.sales} purchases={scoped.purchases} onClose={() => setSerialEditing(null)} onSave={payload => { try { saveSerialNumber(payload); setSerialEditing(null); } catch (error) { alert(error.message); } }}/>} 
    {claimSerial && <ClaimForm serial={claimSerial.serial} customers={scoped.customers} existing={claimSerial.existing} onClose={() => setClaimSerial(null)} onSave={payload => { try { saveWarrantyClaim(payload); setClaimSerial(null); } catch (error) { alert(error.message); } }}/>} 
  </div>;
}

function SerialForm({ value = {}, products, customers, sales, purchases, onClose, onSave }) {
  const active = products.filter(row => row.active !== false).sort((a, b) => Number(b.serialTracking === true) - Number(a.serialTracking === true) || a.name.localeCompare(b.name, 'id'));
  const [productId, setProductId] = useState(value.productId || active[0]?.id || '');
  const selectedProduct = active.find(row => row.id === productId);
  const [serial, setSerial] = useState(value.serial || '');
  const [warrantyMonths, setWarrantyMonths] = useState(value.warrantyMonths ?? selectedProduct?.warrantyMonths ?? 0);
  const [status, setStatus] = useState(value.status || 'IN_STOCK');
  const [customerId, setCustomerId] = useState(value.customerId || '');
  const [saleId, setSaleId] = useState(value.saleId || '');
  const [purchaseId, setPurchaseId] = useState(value.purchaseId || '');
  const saleOptions = sales.filter(sale => sale.status !== 'VOIDED' && (sale.items || []).some(item => item.productId === productId));
  const purchaseOptions = purchases.filter(purchase => purchase.status === 'RECEIVED' && (purchase.items || []).some(item => item.productId === productId));
  const selectedSale = sales.find(row => row.id === saleId);
  const customer = customers.find(row => row.id === (selectedSale?.customerId || customerId));
  const changeProduct = id => {
    const product = active.find(row => row.id === id);
    setProductId(id);
    setWarrantyMonths(Number(product?.warrantyMonths || 0));
    setSaleId(''); setPurchaseId(''); setCustomerId(''); setStatus('IN_STOCK');
  };
  const changeSale = id => {
    const sale = sales.find(row => row.id === id);
    setSaleId(id);
    if (sale) { setCustomerId(sale.customerId || ''); setStatus('SOLD'); }
  };
  return <Modal title={value.id ? 'Edit Nomor Serial' : 'Daftarkan Nomor Serial'} size="lg" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave({ ...value, productId, serial, warrantyMonths, status, customerId: selectedSale?.customerId || customerId, customerName: customer?.name || selectedSale?.customerName || '', saleId, purchaseId })} disabled={!productId || !serial.trim()}>Simpan Serial</Button></>}>
    <div className="space-y-3">
      <ProductPicker products={active} value={productId} onChange={changeProduct} label="Barang"/>
      {selectedProduct && !selectedProduct.serialTracking && <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-xl p-3">Produk ini belum mengaktifkan pelacakan serial. Serial tetap dapat disimpan untuk kompatibilitas data lama, tetapi sebaiknya aktifkan “Lacak nomor serial per unit” pada Produk.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Nomor Serial"><Input value={serial} onChange={e => setSerial(e.target.value.toUpperCase())} autoFocus/></Field><Field label="Masa Garansi (bulan)"><NumberInput min={0} max={120} value={warrantyMonths} integer zeroAsEmpty onValueChange={value => setWarrantyMonths(value === '' ? 0 : value)}/></Field></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Penerimaan / Faktur (opsional)"><Select value={purchaseId} onChange={e => setPurchaseId(e.target.value)}><option value="">Belum dikaitkan</option>{purchaseOptions.map(row => <option key={row.id} value={row.id}>{row.invoiceNo || row.id} · {new Date(row.createdAt).toLocaleDateString('id-ID')}</option>)}</Select></Field><Field label="Penjualan (opsional)"><Select value={saleId} onChange={e => changeSale(e.target.value)}><option value="">Belum dijual</option>{saleOptions.map(row => <option key={row.id} value={row.id}>{row.id} · {row.customerName || 'Umum'} · {new Date(row.createdAt).toLocaleDateString('id-ID')}</option>)}</Select></Field></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Status"><Select value={status} onChange={e => setStatus(e.target.value)}>{warrantyStatuses.map(row => <option key={row}>{row}</option>)}</Select></Field><Field label="Pelanggan"><Select value={selectedSale?.customerId || customerId} onChange={e => setCustomerId(e.target.value)} disabled={Boolean(selectedSale)}><option value="">Belum dikaitkan</option>{customers.filter(row => row.id !== 'CUS-GENERAL').map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field></div>
    </div>
  </Modal>;
}

function ClaimForm({ serial, customers, existing, onClose, onSave }) {
  const [issue, setIssue] = useState(existing?.issue || '');
  const [status, setStatus] = useState(existing?.status || 'OPEN');
  const [resolution, setResolution] = useState(existing?.resolution || '');
  const [customerId, setCustomerId] = useState(existing?.customerId || serial.customerId || '');
  const customer = customers.find(row => row.id === customerId);
  return <Modal title={`Klaim Garansi · ${serial.serial}`} size="md" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave({ ...existing, serialId: serial.id, customerId, customerName: customer?.name || serial.customerName || '', issue, status, resolution })} disabled={!issue.trim()}>Simpan Klaim</Button></>}><div className="space-y-3"><Card className="p-3 bg-blue-50"><p className="font-bold">{serial.productName}</p><p className="text-xs text-blue-700">Serial {serial.serial} · garansi {serial.warrantyMonths || 0} bulan</p></Card><Field label="Pelanggan"><Select value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Tidak diketahui</option>{customers.filter(row => row.id !== 'CUS-GENERAL').map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field><Field label="Keluhan / Masalah"><Textarea value={issue} onChange={e => setIssue(e.target.value)}/></Field><Field label="Status Klaim"><Select value={status} onChange={e => setStatus(e.target.value)}><option>OPEN</option><option>PROCESSING</option><option>RESOLVED</option><option>REJECTED</option></Select></Field><Field label="Penyelesaian"><Textarea value={resolution} onChange={e => setResolution(e.target.value)}/></Field></div></Modal>;
}

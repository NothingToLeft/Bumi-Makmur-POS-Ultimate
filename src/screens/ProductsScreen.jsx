import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Package, Plus, Star, Archive, Eye, EyeOff, Pencil, Printer, Percent, TrendingUp,
  ScanLine, Camera, Keyboard, Boxes, AlertTriangle, ArrowLeftRight, ClipboardCheck,
  SlidersHorizontal, History, Download, PackagePlus, CircleDollarSign, Ruler
} from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import {
  calculateMarkupPercent, calculateMarkupPrice, downloadFile, escapeHtml, formatRp,
  localDateKey, printHtmlDocument
} from '../utils/helpers.js';
import { formatQuantity, fractionalSaleLabel, normalizeQuantityStep } from '../utils/fractionalUnits.js';
import { openNativeAppSettings, requestCameraPermission } from '../services/nativeDevice.js';
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, MoneyInput,
  PageHeader, SearchBox, Select, SummaryCard, Textarea
} from '../components/ui.jsx';

const DEFAULT_MARKUPS = { retail: 30, wholesale: 20, project: 15 };
const PRICE_TIERS = [
  { id: 'retail', label: 'Eceran' },
  { id: 'wholesale', label: 'Grosir' },
  { id: 'project', label: 'Proyek' }
];
const TABS = [
  ['catalog', 'Barang & Stok', Package],
  ['movements', 'Pergerakan', History],
  ['adjust', 'Penyesuaian', SlidersHorizontal],
  ['opname', 'Stok Opname', ClipboardCheck],
  ['transfer', 'Transfer Cabang', ArrowLeftRight]
];

const blank = {
  name: '', category: 'Listrik', sku: '', barcode: '', baseUnit: 'pcs', stock: 0,
  minStock: 5, rack: '-', modalPrice: 0,
  prices: { retail: 0, wholesale: 0, project: 0 }, markups: DEFAULT_MARKUPS,
  variants: [], conversions: [], bundleItems: [], favorite: false,
  available: true, active: true, trackStock: true, allowFractional: false, quantityStep: 1
};

const deriveMarkups = product => Object.fromEntries(PRICE_TIERS.map(tier => [
  tier.id,
  Number(product?.markups?.[tier.id] ?? calculateMarkupPercent(product?.modalPrice, product?.prices?.[tier.id]))
]));

const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function ProductsScreen() {
  const {
    db, scoped, branch, hasPermission, saveProduct, archiveProduct, toggleProduct,
    adjustStock, stockOpname, transferStock
  } = usePos();
  const [tab, setTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [stockFilter, setStockFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [opnameOpen, setOpnameOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const canManageProducts = hasPermission('products.manage');
  const canManageStock = hasPermission('inventory.manage');

  const products = useMemo(() => scoped.products.filter(product => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || product.name.toLowerCase().includes(term) ||
      String(product.sku || '').toLowerCase().includes(term) ||
      String(product.barcode || '').toLowerCase().includes(term) ||
      String(product.rack || '').toLowerCase().includes(term);
    const matchesArchive = showArchived || product.active !== false;
    const low = Number(product.stock || 0) <= Number(product.minStock || 0);
    const matchesStock = stockFilter === 'all' ||
      (stockFilter === 'low' && low) ||
      (stockFilter === 'empty' && Number(product.stock || 0) <= 0) ||
      (stockFilter === 'fractional' && product.allowFractional === true);
    return matchesSearch && matchesArchive && matchesStock;
  }), [scoped.products, search, showArchived, stockFilter]);

  const activeProducts = useMemo(() => scoped.products.filter(product => product.active !== false), [scoped.products]);
  const summary = useMemo(() => {
    const low = activeProducts.filter(product => Number(product.stock || 0) <= Number(product.minStock || 0));
    const modalValue = activeProducts.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.modalPrice || 0), 0);
    const retailValue = activeProducts.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.prices?.retail || 0), 0);
    return { total: activeProducts.length, low: low.length, modalValue, retailValue };
  }, [activeProducts]);

  const printLabel = product => {
    const code = product.barcode || product.sku;
    printHtmlDocument(
      `Label ${product.name}`,
      `<div class="center"><p class="bold">${escapeHtml(product.name)}</p><p>${escapeHtml(product.sku)}</p><h2>${escapeHtml(formatRp(product.prices?.retail))}</h2><div class="line"></div><p style="font-family:monospace;font-size:14px;letter-spacing:2px">${escapeHtml(code)}</p><p class="small">${escapeHtml(product.baseUnit)} · Rak ${escapeHtml(product.rack || '-')}</p></div>`,
      '58mm'
    );
  };

  const exportInventory = () => {
    const rows = [[
      'Nama Produk', 'SKU', 'Barcode', 'Kategori', 'Satuan Dasar', 'Stok', 'Stok Minimum',
      'Harga Modal', 'Harga Eceran', 'Rak', 'Jual Pecahan', 'Langkah Pecahan', 'Konversi'
    ].map(csvCell).join(',')];
    activeProducts.forEach(product => rows.push([
      product.name, product.sku, product.barcode, product.category, product.baseUnit,
      product.stock, product.minStock, product.modalPrice, product.prices?.retail, product.rack,
      product.allowFractional ? 'Ya' : 'Tidak', product.quantityStep,
      (product.conversions || []).map(item => `1 ${item.unit} = ${item.factor} ${product.baseUnit}`).join('; ')
    ].map(csvCell).join(',')));
    downloadFile(`Produk-dan-Stok-${branch?.name || 'Cabang'}-${localDateKey()}.csv`, `\uFEFF${rows.join('\n')}`, 'text/csv;charset=utf-8');
  };

  const printStockSheet = () => {
    const body = activeProducts.map((product, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.sku)}</td><td>${escapeHtml(product.rack || '-')}</td><td>${escapeHtml(formatQuantity(product.stock))} ${escapeHtml(product.baseUnit)}</td><td style="min-width:60px"></td><td></td></tr>`).join('');
    printHtmlDocument(
      `Lembar Stok ${branch?.name || ''}`,
      `<h2>${escapeHtml(branch?.name || db.configs.companyName || 'Bumi Makmur')}</h2><p>Lembar hitung stok fisik · ${escapeHtml(localDateKey())}</p><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr><th style="border:1px solid #999">No</th><th style="border:1px solid #999">Barang</th><th style="border:1px solid #999">SKU</th><th style="border:1px solid #999">Rak</th><th style="border:1px solid #999">Sistem</th><th style="border:1px solid #999">Fisik</th><th style="border:1px solid #999">Catatan</th></tr></thead><tbody>${body}</tbody></table>`,
      '210mm'
    );
  };

  const save = data => {
    try {
      saveProduct(data);
      setEditing(null);
    } catch (error) {
      alert(error.message || 'Barang gagal disimpan.');
    }
  };

  const newProduct = () => setEditing({ ...blank, prices: { ...blank.prices }, markups: { ...DEFAULT_MARKUPS }, conversions: [], variants: [], bundleItems: [] });

  return (
    <div className="h-full flex flex-col bg-gray-50 generic-bg">
      <PageHeader
        title="Produk & Stok"
        subtitle="Satu tempat untuk membuat barang, memasukkan stok awal, harga, satuan eceran, opname, dan transfer cabang"
        actions={<>
          <Button variant="outline" onClick={exportInventory}><Download size={17}/> Ekspor</Button>
          <Button variant="outline" onClick={printStockSheet}><Printer size={17}/> Lembar Stok</Button>
          {canManageProducts && <Button onClick={newProduct}><PackagePlus size={18}/> Tambah Barang & Stok</Button>}
        </>}
      />

      <div className="bg-white border-b px-4 md:px-6 flex gap-1 overflow-x-auto no-scrollbar card-element">
        {TABS.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`px-4 min-h-[52px] font-bold text-sm flex items-center gap-2 whitespace-nowrap border-b-2 ${tab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><Icon size={17}/>{label}</button>)}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        {tab === 'catalog' && <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
            <SummaryCard title="Barang Aktif" value={`${summary.total} SKU`} icon={Package} tone="blue"/>
            <SummaryCard title="Stok Menipis" value={`${summary.low} barang`} icon={AlertTriangle} tone={summary.low ? 'red' : 'green'}/>
            <SummaryCard title="Nilai Modal Stok" value={formatRp(summary.modalValue)} icon={CircleDollarSign} tone="orange"/>
            <SummaryCard title="Potensi Nilai Eceran" value={formatRp(summary.retailValue)} icon={TrendingUp} tone="green"/>
          </div>

          <Card className="p-3 mb-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <SearchBox value={search} onChange={setSearch} placeholder="Cari nama, SKU, barcode, atau rak..."/>
              <Select value={stockFilter} onChange={event => setStockFilter(event.target.value)} className="lg:max-w-[210px]">
                <option value="all">Semua kondisi stok</option>
                <option value="low">Stok menipis</option>
                <option value="empty">Stok kosong</option>
                <option value="fractional">Bisa dijual eceran/pecahan</option>
              </Select>
              <label className="flex items-center gap-2 px-3 min-h-[48px] rounded-xl border bg-white text-sm font-bold whitespace-nowrap">
                <input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)}/>
                Tampilkan arsip
              </label>
            </div>
          </Card>

          {products.length === 0 ? <EmptyState icon={Package} title="Barang tidak ditemukan" subtitle="Gunakan tombol Tambah Barang & Stok untuk memasukkan barang lama beserta stok awalnya." action={canManageProducts && <Button onClick={newProduct}><Plus size={18}/> Tambah Barang</Button>}/> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {products.map(product => {
                const retailMarkup = Number(product.markups?.retail ?? calculateMarkupPercent(product.modalPrice, product.prices?.retail));
                const lowStock = Number(product.stock || 0) <= Number(product.minStock || 0);
                return (
                  <Card key={product.id} className={`p-4 relative ${product.active === false ? 'opacity-60' : ''}`}>
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 img-placeholder flex items-center justify-center shrink-0"><Package className="text-gray-400"/></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex gap-1 flex-wrap mb-1">
                          {product.favorite && <Badge tone="yellow">Favorit</Badge>}
                          {product.allowFractional && <Badge tone="blue"><Ruler size={11} className="mr-1"/>Eceran</Badge>}
                          {product.bundleItems?.length > 0 && <Badge tone="purple">Paket</Badge>}
                          {lowStock && product.active !== false && <Badge tone="red">{Number(product.stock || 0) <= 0 ? 'Habis' : 'Menipis'}</Badge>}
                          {product.available === false && <Badge tone="red">Tidak Tersedia</Badge>}
                          {product.active === false && <Badge>Diarsipkan</Badge>}
                        </div>
                        <p className="font-bold text-sm text-gray-800 line-clamp-2">{product.name}</p>
                        <p className="text-[11px] text-gray-500">{product.category} · {product.sku} · Rak {product.rack || '-'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      <div className="p-2 bg-emerald-50 rounded-xl"><p className="text-gray-500">Harga/{product.baseUnit}</p><p className="font-bold text-emerald-700">{formatRp(product.prices?.retail)}</p></div>
                      <div className="p-2 bg-orange-50 rounded-xl"><p className="text-gray-500">Modal/{product.baseUnit}</p><p className="font-bold text-orange-700">{formatRp(product.modalPrice)}</p></div>
                      <div className={`p-2 rounded-xl ${lowStock ? 'bg-red-50' : 'bg-blue-50'}`}><p className="text-gray-500">Stok</p><p className={`font-bold ${lowStock ? 'text-red-700' : 'text-blue-700'}`}>{formatQuantity(product.stock)} {product.baseUnit}</p></div>
                      <div className="p-2 bg-purple-50 rounded-xl"><p className="text-gray-500">Markup Eceran</p><p className="font-bold text-purple-700">{retailMarkup}%</p></div>
                    </div>
                    {product.allowFractional && <p className="mt-3 text-[11px] rounded-xl bg-blue-50 text-blue-700 p-2 font-bold">{fractionalSaleLabel(product)}</p>}
                    {(product.conversions || []).length > 0 && <p className="mt-2 text-[11px] text-gray-500">{product.conversions.map(item => `1 ${item.unit} = ${formatQuantity(item.factor)} ${product.baseUnit}`).join(' · ')}</p>}
                    {(canManageProducts || canManageStock) && <div className="grid grid-cols-6 gap-2 mt-4">
                      {canManageProducts && <button title="Edit barang" onClick={() => setEditing(product)} className="h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Pencil size={17}/></button>}
                      {canManageStock && <button title="Penyesuaian stok" onClick={() => setAdjusting(product)} className="h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><SlidersHorizontal size={17}/></button>}
                      {canManageProducts && <button title="Favorit" onClick={() => toggleProduct(product.id, 'favorite')} className="h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center"><Star size={17} fill={product.favorite ? 'currentColor' : 'none'}/></button>}
                      {canManageProducts && <button title="Ketersediaan" onClick={() => toggleProduct(product.id, 'available')} className="h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">{product.available !== false ? <Eye size={17}/> : <EyeOff size={17}/>}</button>}
                      <button title="Cetak label harga/barcode" onClick={() => printLabel(product)} className="h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Printer size={17}/></button>
                      {canManageProducts && <button title="Arsipkan" onClick={() => window.confirm('Arsipkan barang ini? Riwayat transaksi tetap aman.') && archiveProduct(product.id)} className="h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Archive size={17}/></button>}
                    </div>}
                  </Card>
                );
              })}
            </div>
          )}
        </>}

        {tab === 'movements' && <MovementTab rows={scoped.movements}/>} 
        {tab === 'adjust' && <HistoryActionTab title="Penyesuaian Stok" description="Tambah atau kurangi stok karena stok awal, koreksi, barang rusak, hilang, atau pemakaian internal." icon={SlidersHorizontal} disabled={!canManageStock} button="Buat Penyesuaian" onClick={() => setAdjusting(activeProducts[0] || null)} rows={scoped.adjustments}/>} 
        {tab === 'opname' && <HistoryActionTab title="Stok Opname" description="Bandingkan stok sistem dengan hitungan fisik. Selisih akan dicatat otomatis sebagai pergerakan stok." icon={ClipboardCheck} disabled={!canManageStock || activeProducts.length === 0} button="Mulai Opname" onClick={() => setOpnameOpen(true)} rows={scoped.opnames}/>} 
        {tab === 'transfer' && <HistoryActionTab title="Transfer Antar-Cabang" description="Pindahkan persediaan dari cabang aktif ke cabang lain tanpa membuat ulang produk." icon={ArrowLeftRight} disabled={!canManageStock || db.branches.length < 2 || activeProducts.length === 0} button="Transfer Stok" onClick={() => setTransferOpen(true)} rows={scoped.transfers}/>} 
      </div>

      {editing && <ProductForm product={editing} categories={db.categories} units={db.units} products={scoped.products} onClose={() => setEditing(null)} onSave={save}/>} 
      {adjusting && <AdjustModal product={adjusting} products={activeProducts} onClose={() => setAdjusting(null)} onSelect={setAdjusting} onSave={data => { try { adjustStock(data); setAdjusting(null); } catch (error) { alert(error.message); } }}/>} 
      {opnameOpen && <OpnameModal products={activeProducts} onClose={() => setOpnameOpen(false)} onSave={data => { try { stockOpname(data); setOpnameOpen(false); } catch (error) { alert(error.message); } }}/>} 
      {transferOpen && <TransferModal products={activeProducts} branches={db.branches} activeBranchId={branch?.id || db.configs.activeBranchId} onClose={() => setTransferOpen(false)} onSave={data => { try { transferStock(data); setTransferOpen(false); } catch (error) { alert(error.message); } }}/>} 
    </div>
  );
}

function ProductForm({ product, categories, units, products, onClose, onSave }) {
  const initialMarkups = deriveMarkups(product.id ? product : { ...product, markups: product.markups || DEFAULT_MARKUPS });
  const [form, setForm] = useState(() => ({
    ...blank, ...product,
    prices: { ...blank.prices, ...product.prices },
    markups: initialMarkups,
    variants: product.variants || [], conversions: product.conversions || [], bundleItems: product.bundleItems || [],
    allowFractional: product.allowFractional === true,
    quantityStep: normalizeQuantityStep(product.quantityStep, product.allowFractional === true)
  }));
  const [markups, setMarkups] = useState(initialMarkups);
  const [variantText, setVariantText] = useState((form.variants || []).map(variant => variant.name).join(', '));
  const [conversionText, setConversionText] = useState((form.conversions || []).map(value => `${value.unit}=${value.factor}`).join('\n'));
  const [bundleId, setBundleId] = useState('');
  const [bundleQty, setBundleQty] = useState(1);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);

  const changeModalPrice = modalPrice => {
    setForm(previous => ({
      ...previous,
      modalPrice,
      prices: Object.fromEntries(PRICE_TIERS.map(tier => [tier.id, calculateMarkupPrice(modalPrice, markups[tier.id])]))
    }));
  };

  const changeMarkup = (tier, value) => {
    const nextValue = Math.min(1000, Math.max(0, Number(value) || 0));
    setMarkups(previous => ({ ...previous, [tier]: nextValue }));
    setForm(previous => ({
      ...previous,
      markups: { ...previous.markups, [tier]: nextValue },
      prices: { ...previous.prices, [tier]: calculateMarkupPrice(previous.modalPrice, nextValue) }
    }));
  };

  const changeSellingPrice = (tier, value) => {
    const nextMarkup = calculateMarkupPercent(form.modalPrice, value);
    setMarkups(previous => ({ ...previous, [tier]: nextMarkup }));
    setForm(previous => ({
      ...previous,
      markups: { ...previous.markups, [tier]: nextMarkup },
      prices: { ...previous.prices, [tier]: value }
    }));
  };

  const submit = () => {
    if (!form.name.trim()) return alert('Nama barang wajib diisi.');
    if (Number(form.modalPrice) < 0) return alert('Harga modal tidak valid.');
    if (!form.id && Number(form.stock || 0) < 0) return alert('Stok awal tidak boleh negatif.');
    if (products.some(item => item.id !== form.id && item.active !== false && String(item.barcode || '') && String(item.barcode || '') === String(form.barcode || ''))) return alert('Barcode ini sudah dipakai barang lain.');
    if (PRICE_TIERS.some(tier => Number(form.prices[tier.id]) < Number(form.modalPrice))) {
      const proceed = window.confirm('Ada harga jual di bawah harga modal. Tetap simpan?');
      if (!proceed) return;
    }
    const variants = variantText.split(',').map(value => value.trim()).filter(Boolean)
      .map((name, index) => {
        const previous = (form.variants || []).find(item => String(item.name || '').trim().toLowerCase() === name.toLowerCase());
        return previous ? { ...previous, name } : { id: `VAR-${Date.now()}-${index}`, name, barcode: '', factor: 1, priceDelta: 0 };
      });
    const conversions = conversionText.split('\n').map(line => line.trim()).filter(Boolean)
      .map(line => {
        const [rawUnit, rawFactor] = line.split('=');
        const unit = rawUnit?.trim();
        const factor = Number(String(rawFactor || '').replace(',', '.')) || 1;
        const previous = (form.conversions || []).find(item => String(item.unit || '').trim().toLowerCase() === String(unit || '').toLowerCase());
        return previous ? { ...previous, unit, factor } : { unit, factor };
      })
      .filter(item => item.unit && item.unit !== form.baseUnit && item.factor > 0);
    onSave({
      ...form,
      markups,
      variants,
      conversions,
      stock: Number(form.stock || 0),
      minStock: Number(form.minStock || 0),
      quantityStep: normalizeQuantityStep(form.quantityStep, form.allowFractional)
    });
  };

  const stockStep = normalizeQuantityStep(form.quantityStep, form.allowFractional);
  return (
    <Modal
      title={form.id ? 'Edit Barang & Pengaturan Stok' : 'Tambah Barang & Stok Awal'}
      onClose={onClose}
      size="xl"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Simpan Barang</Button></>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!form.id && <Card className="md:col-span-2 p-4 bg-blue-50 border-blue-100"><p className="font-black text-blue-900">Mudah untuk pengguna baru</p><p className="text-sm text-blue-700 mt-1">Isi identitas barang dan stok yang sudah ada sekarang. Barang langsung tersimpan sekaligus muncul di kasir dan laporan stok.</p></Card>}
        <Field label="Nama Barang" className="md:col-span-2"><Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} autoFocus/></Field>
        <Field label="Kategori"><Select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</Select></Field>
        <Field label="Satuan Dasar" hint="Pilih satuan terkecil yang akan mengurangi stok, misalnya meter untuk kabel."><Select value={form.baseUnit} onChange={event => setForm({ ...form, baseUnit: event.target.value })}>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</Select></Field>
        <Field label="SKU"><Input value={form.sku} onChange={event => setForm({ ...form, sku: event.target.value })} placeholder="Otomatis jika kosong"/></Field>
        <Field label="Barcode" hint="Klik Scan untuk kamera, atau fokuskan kolom lalu tembak dengan scanner USB/Bluetooth.">
          <div className="flex gap-2"><Input value={form.barcode} onChange={event => setForm({ ...form, barcode: event.target.value.trim() })} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} inputMode="numeric" placeholder="Scan tanpa mengetik nomor"/><Button type="button" variant="secondary" onClick={() => setBarcodeScannerOpen(true)} className="shrink-0"><ScanLine size={18}/> Scan</Button></div>
          {form.barcode && products.some(item => item.id !== form.id && item.active !== false && String(item.barcode || '') === String(form.barcode || '')) && <p className="text-xs font-bold text-red-600 mt-1">Barcode ini sudah dipakai barang lain.</p>}
        </Field>
        <Field label="Rak/Lokasi"><Input value={form.rack} onChange={event => setForm({ ...form, rack: event.target.value })}/></Field>
        <Field label={form.id ? 'Stok Saat Ini' : 'Stok Awal'} hint={form.id ? 'Gunakan tab Penyesuaian atau Pembelian untuk mengubah stok agar riwayat tetap tercatat.' : `Masukkan jumlah yang sudah ada dalam satuan ${form.baseUnit}.`}><Input type="number" inputMode="decimal" min="0" step={stockStep} value={form.id ? Number(form.stock || 0) : (form.stock || '')} disabled={Boolean(form.id)} onChange={event => setForm({ ...form, stock: Number(event.target.value || 0) })} placeholder="0"/></Field>
        <Field label="Stok Minimum"><Input type="number" inputMode="decimal" min="0" step={stockStep} value={form.minStock || ''} onChange={event => setForm({ ...form, minStock: Number(event.target.value || 0) })} placeholder="0"/></Field>

        <Card className="md:col-span-2 p-4 border-blue-200 bg-blue-50/50">
          <div className="flex items-start gap-3"><Ruler className="text-blue-700 shrink-0"/><div><p className="font-black text-gray-800">Penjualan Eceran / Pecahan</p><p className="text-xs text-gray-500 mt-1">Contoh kabel: satuan dasar meter, 1 roll = 50 meter, lalu kasir dapat menjual 2 atau 3,5 meter.</p></div></div>
          <label className="mt-4 flex gap-3 items-center p-3 rounded-xl bg-white border"><input type="checkbox" checked={form.allowFractional} onChange={event => setForm({ ...form, allowFractional: event.target.checked, quantityStep: event.target.checked ? 0.1 : 1 })}/><div><p className="font-bold text-sm">Boleh dijual dalam jumlah pecahan</p><p className="text-xs text-gray-500">Aktifkan untuk meter, kilogram, liter, atau barang potongan.</p></div></label>
          {form.allowFractional && <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3"><Field label={`Langkah jumlah terkecil (${form.baseUnit})`} hint="0,1 cocok untuk 2 m atau 3,5 m; 0,01 untuk ukuran lebih presisi."><Input type="number" min="0.001" max="1" step="0.001" value={form.quantityStep} onChange={event => setForm({ ...form, quantityStep: Number(event.target.value || 0.1) })}/></Field><div className="rounded-xl bg-white border p-3 text-sm"><p className="text-gray-500">Contoh checkout</p><p className="font-black text-blue-800">3,5 {form.baseUnit} × {formatRp(form.prices?.retail)} = {formatRp(3.5 * Number(form.prices?.retail || 0))}</p></div></div>}
        </Card>

        <Card className="md:col-span-2 p-4 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center gap-2 mb-3"><TrendingUp size={20} className="text-emerald-700"/><div><p className="font-black text-gray-800">Harga & Persentase Keuntungan</p><p className="text-xs text-gray-500">Harga di bawah adalah per satuan dasar ({form.baseUnit}). Harga roll/box dihitung dari konversinya.</p></div></div>
          <Field label={`Harga Modal per ${form.baseUnit}`}><MoneyInput value={form.modalPrice} onValueChange={changeModalPrice}/></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {PRICE_TIERS.map(tier => {
              const profit = Math.max(0, Number(form.prices[tier.id]) - Number(form.modalPrice));
              return (
                <div key={tier.id} className="p-3 bg-white rounded-2xl border border-gray-200">
                  <p className="font-bold text-sm text-gray-800 mb-2">Harga {tier.label}</p>
                  <Field label="Markup (%)"><div className="relative"><Percent size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/><Input type="number" inputMode="decimal" min="0" max="1000" step="0.1" value={markups[tier.id] || ''} onChange={event => changeMarkup(tier.id, event.target.value)} className="field-input-trailing" placeholder="0"/></div></Field>
                  <Field label={`Harga/${form.baseUnit}`}><MoneyInput value={form.prices[tier.id]} onValueChange={value => changeSellingPrice(tier.id, value)}/></Field>
                  <p className="text-[11px] text-emerald-700 font-bold mt-2">Untung {formatRp(profit)} per {form.baseUnit}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">{[10, 20, 30, 40, 50].map(value => <button key={value} type="button" onClick={() => changeMarkup(tier.id, value)} className="px-2 py-1 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-600">{value}%</button>)}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Field label="Varian" hint="Pisahkan dengan koma, contoh: Putih, Warm White, 12W"><Textarea value={variantText} onChange={event => setVariantText(event.target.value)}/></Field>
        <Field label="Konversi Satuan" hint={`Satu baris per konversi. Contoh kabel:\nroll=50\nartinya 1 roll = 50 ${form.baseUnit}.`}><Textarea value={conversionText} onChange={event => setConversionText(event.target.value)} placeholder={'roll=50\nbox=12'}/></Field>

        <div className="md:col-span-2">
          <p className="field-label">Komponen Paket/Bundle</p>
          <div className="flex gap-2">
            <Select value={bundleId} onChange={event => setBundleId(event.target.value)}><option value="">Pilih barang komponen</option>{products.filter(item => item.id !== form.id && item.active !== false).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <Input type="number" className="w-24" min="1" value={bundleQty || ''} onChange={event => setBundleQty(Math.max(1, Number(event.target.value || 1)))}/>
            <Button type="button" onClick={() => { if (bundleId) setForm({ ...form, bundleItems: [...form.bundleItems, { productId: bundleId, qty: bundleQty }] }); }}>Tambah</Button>
          </div>
          {form.bundleItems.length > 0 && <div className="mt-2 space-y-2">{form.bundleItems.map((item, index) => { const component = products.find(row => row.id === item.productId); return <div key={`${item.productId}-${index}`} className="flex justify-between p-2 rounded-xl bg-gray-50"><span className="text-sm">{item.qty} × {component?.name || item.productId}</span><button type="button" onClick={() => setForm({ ...form, bundleItems: form.bundleItems.filter((_, itemIndex) => itemIndex !== index) })} className="text-red-600 font-bold">Hapus</button></div>; })}</div>}
        </div>

        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.favorite} onChange={event => setForm({ ...form, favorite: event.target.checked })}/> Favorit</label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.available} onChange={event => setForm({ ...form, available: event.target.checked })}/> Tersedia di kasir</label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.trackStock} onChange={event => setForm({ ...form, trackStock: event.target.checked })}/> Lacak stok</label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })}/> Aktif</label>
        </div>
      </div>
      {barcodeScannerOpen && <ProductBarcodeScannerModal onClose={() => setBarcodeScannerOpen(false)} onDetected={rawCode => {
        const code = String(rawCode || '').trim();
        if (!code) return 'Barcode belum terbaca.';
        const duplicate = products.find(item => item.id !== form.id && item.active !== false && String(item.barcode || '') === code);
        if (duplicate) return `Barcode ${code} sudah dipakai oleh ${duplicate.name}.`;
        setForm(previous => ({ ...previous, barcode: code }));
        return true;
      }}/>} 
    </Modal>
  );
}

function MovementTab({ rows }) {
  return rows.length === 0 ? <EmptyState icon={History} title="Belum ada pergerakan stok"/> : <div className="space-y-3">{rows.slice(0, 300).map(row => <Card key={row.id} className="p-4 flex justify-between items-center gap-3"><div><div className="flex gap-2 items-center flex-wrap"><Badge tone={row.qtyChange > 0 ? 'green' : 'orange'}>{row.type}</Badge><span className="text-xs text-gray-500">{new Date(row.createdAt || row.date).toLocaleString('id-ID')}</span></div><p className="font-bold text-sm mt-2">{row.productName}</p><p className="text-xs text-gray-500">{row.note || row.refId}</p></div><p className={`font-black text-xl ${row.qtyChange > 0 ? 'text-emerald-600' : 'text-orange-600'}`}>{row.qtyChange > 0 ? '+' : ''}{formatQuantity(row.qtyChange)}</p></Card>)}</div>;
}

function HistoryActionTab({ title, description, icon: Icon, disabled, button, onClick, rows }) {
  return <div className="space-y-4"><Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Icon/></div><div><p className="font-bold text-gray-800">{title}</p><p className="text-sm text-gray-500 max-w-2xl">{description}</p></div></div><Button onClick={onClick} disabled={disabled}>{button}</Button></Card>{rows.length === 0 ? <EmptyState title={`Belum ada riwayat ${title.toLowerCase()}`}/> : <div className="space-y-3">{rows.slice(0, 100).map(row => <Card key={row.id} className="p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-sm">{row.productName || row.id}</p><p className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleString('id-ID')} · {row.notes || row.reason || ''}</p></div><Badge tone="blue">{row.items?.length || formatQuantity(row.qty || Math.abs(row.qtyChange || 0))} item</Badge></div></Card>)}</div>}</div>;
}

function AdjustModal({ product, products, onClose, onSelect, onSave }) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('Stok awal / koreksi stok');
  const step = normalizeQuantityStep(product?.quantityStep, product?.allowFractional === true);
  return <Modal title="Penyesuaian Stok" onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave({ productId: product.id, qtyChange: Number(qty), reason })} disabled={!product?.id || !Number(qty)}>Simpan Penyesuaian</Button></>}><div className="space-y-3"><Field label="Barang"><Select value={product?.id || ''} onChange={event => onSelect(products.find(item => item.id === event.target.value) || product)}>{products.map(item => <option key={item.id} value={item.id}>{item.name} ({formatQuantity(item.stock)} {item.baseUnit})</option>)}</Select></Field><Card className="p-3 bg-blue-50"><p className="text-xs text-blue-700">Stok sistem saat ini</p><p className="text-xl font-black text-blue-900">{formatQuantity(product?.stock)} {product?.baseUnit}</p></Card><Field label={`Perubahan (${product?.baseUnit})`} hint="Gunakan + untuk menambah dan - untuk mengurangi. Contoh +20, -2, atau +3,5."><Input type="number" step={step} value={qty} onChange={event => setQty(event.target.value)} placeholder="Contoh: 20 atau -2" autoFocus/></Field><Field label="Alasan"><Textarea value={reason} onChange={event => setReason(event.target.value)}/></Field></div></Modal>;
}

function OpnameModal({ products, onClose, onSave }) {
  const [counts, setCounts] = useState(products.map(product => ({ productId: product.id, name: product.name, unit: product.baseUnit, step: normalizeQuantityStep(product.quantityStep, product.allowFractional === true), system: Number(product.stock || 0), actual: Number(product.stock || 0) })));
  const [notes, setNotes] = useState('Stok opname berkala');
  return <Modal title="Stok Opname" onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave({ counts, notes })}>Selesaikan Opname</Button></>}><Field label="Catatan"><Input value={notes} onChange={event => setNotes(event.target.value)}/></Field><div className="mt-4 space-y-2 max-h-[58vh] overflow-y-auto">{counts.map((item, index) => { const difference = Number(item.actual || 0) - Number(item.system || 0); return <Card key={item.productId} className="p-3 grid grid-cols-[1fr_120px_90px] gap-2 items-center"><div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">Sistem: {formatQuantity(item.system)} {item.unit}</p></div><Input type="number" min="0" step={item.step} value={item.actual} onChange={event => setCounts(previous => previous.map((row, itemIndex) => itemIndex === index ? { ...row, actual: Number(event.target.value) } : row))}/><p className={`text-right font-bold ${difference === 0 ? 'text-gray-500' : difference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{difference > 0 ? '+' : ''}{formatQuantity(difference)}</p></Card>; })}</div></Modal>;
}

function TransferModal({ products, branches, activeBranchId, onClose, onSave }) {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const product = products.find(item => item.id === productId);
  const [destinationBranchId, setDestination] = useState(branches.find(branch => branch.id !== activeBranchId)?.id || '');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('Transfer stok');
  const step = normalizeQuantityStep(product?.quantityStep, product?.allowFractional === true);
  return <Modal title="Transfer Stok Antar-Cabang" onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave({ productId, destinationBranchId, qty: Number(qty), notes })} disabled={!productId || !destinationBranchId || qty <= 0}>Transfer</Button></>}><div className="space-y-3"><Field label="Barang"><Select value={productId} onChange={event => { setProductId(event.target.value); setQty(1); }}>{products.map(item => <option key={item.id} value={item.id}>{item.name} · stok {formatQuantity(item.stock)} {item.baseUnit}</option>)}</Select></Field><Field label="Cabang Tujuan"><Select value={destinationBranchId} onChange={event => setDestination(event.target.value)}>{branches.filter(branch => branch.id !== activeBranchId).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field><Field label={`Jumlah (${product?.baseUnit || 'unit'})`}><Input type="number" min={step} max={product?.stock || undefined} step={step} value={qty} onChange={event => setQty(Number(event.target.value))}/></Field><Field label="Catatan"><Textarea value={notes} onChange={event => setNotes(event.target.value)}/></Field></div></Modal>;
}

function ProductBarcodeScannerModal({ onClose, onDetected }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [cameraStatus, setCameraStatus] = useState('idle');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const detectedRef = useRef(false);
  const aliveRef = useRef(true);

  const stopCamera = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const accept = rawCode => {
    const normalized = String(rawCode || '').trim();
    if (!normalized) { setError('Arahkan kamera ke barcode atau gunakan scanner fisik.'); return false; }
    const result = onDetected(normalized);
    if (result !== true) { setError(typeof result === 'string' ? result : 'Barcode tidak dapat digunakan.'); return false; }
    detectedRef.current = true;
    stopCamera();
    onClose();
    return true;
  };

  const startCamera = async () => {
    try {
      stopCamera();
      setError('');
      detectedRef.current = false;
      setCameraStatus('starting');
      const permission = await requestCameraPermission();
      if (permission.state === 'denied') throw new Error('Izin kamera ditolak. Buka Pengaturan Aplikasi lalu izinkan Kamera.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera perangkat tidak tersedia.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!aliveRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraStatus('active');
      if (!('BarcodeDetector' in window)) { setError('Deteksi otomatis belum didukung perangkat ini. Gunakan scanner USB/Bluetooth atau masukkan kode pada kolom.'); return; }
      const preferred = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf'];
      const supported = typeof window.BarcodeDetector.getSupportedFormats === 'function' ? await window.BarcodeDetector.getSupportedFormats() : preferred;
      const formats = preferred.filter(format => supported.includes(format));
      if (!formats.length) { setError('Format barcode tidak didukung kamera perangkat ini. Gunakan scanner fisik.'); return; }
      const detector = new window.BarcodeDetector({ formats });
      const scanFrame = async () => {
        if (detectedRef.current || !videoRef.current || !streamRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const value = results?.[0]?.rawValue;
          if (value) { setCode(value); if (accept(value)) return; }
        } catch {}
        frameRef.current = requestAnimationFrame(scanFrame);
      };
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (cameraError) {
      stopCamera();
      if (!aliveRef.current) return;
      setCameraStatus('error');
      setError(cameraError.message || 'Kamera tidak dapat dibuka.');
    }
  };

  useEffect(() => {
    aliveRef.current = true;
    void startCamera();
    return () => { aliveRef.current = false; stopCamera(); };
  }, []);

  const close = () => { stopCamera(); onClose(); };
  return <Modal title="Scan Barcode Barang Baru" onClose={close} size="md">
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-black aspect-video">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
        {cameraStatus !== 'active' && <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm"><Camera className="mr-2"/>{cameraStatus === 'error' ? 'Kamera gagal dibuka' : 'Mempersiapkan kamera...'}</div>}
        {cameraStatus === 'active' && <><div className="absolute inset-8 border-2 border-white/70 rounded-2xl"/><div className="absolute inset-x-10 top-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,.9)]"/></>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Button variant="secondary" onClick={startCamera}><ScanLine size={18}/> Scan Ulang</Button><Button variant="secondary" onClick={() => void openNativeAppSettings()}>Buka Izin Kamera</Button></div>
      <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex gap-3 text-blue-900"><Keyboard className="shrink-0"/><div><p className="font-black text-sm">Scanner USB/Bluetooth</p><p className="text-xs mt-1">Klik kolom di bawah, lalu scan. Umumnya scanner akan mengetik kode dan mengirim Enter otomatis.</p></div></div>
      <div className="flex gap-2"><Input value={code} onChange={event => setCode(event.target.value)} onKeyDown={event => event.key === 'Enter' && accept(code)} placeholder="Barcode hasil scan" autoFocus/><Button onClick={() => accept(code)}>Pakai</Button></div>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
    </div>
  </Modal>;
}

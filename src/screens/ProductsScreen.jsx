import React, { useMemo, useState } from 'react';
import { Package, Plus, Star, Archive, Eye, EyeOff, Pencil, Printer, Percent, TrendingUp } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import {
  calculateMarkupPercent, calculateMarkupPrice, escapeHtml, formatRp, printHtmlDocument
} from '../utils/helpers.js';
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, MoneyInput,
  PageHeader, SearchBox, Select, Textarea
} from '../components/ui.jsx';

const DEFAULT_MARKUPS = { retail: 30, wholesale: 20, project: 15 };
const PRICE_TIERS = [
  { id: 'retail', label: 'Eceran' },
  { id: 'wholesale', label: 'Grosir' },
  { id: 'project', label: 'Proyek' }
];

const blank = {
  name: '', category: 'Listrik', sku: '', barcode: '', baseUnit: 'pcs', stock: 0,
  minStock: 5, rack: '-', modalPrice: 0,
  prices: { retail: 0, wholesale: 0, project: 0 }, markups: DEFAULT_MARKUPS,
  variants: [], conversions: [], bundleItems: [], favorite: false,
  available: true, active: true, trackStock: true
};

const deriveMarkups = product => Object.fromEntries(PRICE_TIERS.map(tier => [
  tier.id,
  Number(product?.markups?.[tier.id] ?? calculateMarkupPercent(product?.modalPrice, product?.prices?.[tier.id]))
]));

export default function ProductsScreen() {
  const { db, scoped, hasPermission, saveProduct, archiveProduct, toggleProduct } = usePos();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);

  const rows = useMemo(() => scoped.products.filter(product =>
    (showArchived || product.active !== false) &&
    (!search || product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      String(product.barcode || '').includes(search))
  ), [scoped.products, search, showArchived]);

  const canManage = hasPermission('products.manage');

  const printLabel = product => {
    const code = product.barcode || product.sku;
    printHtmlDocument(
      `Label ${product.name}`,
      `<div class="center"><p class="bold">${escapeHtml(product.name)}</p><p>${escapeHtml(product.sku)}</p><h2>${escapeHtml(formatRp(product.prices?.retail))}</h2><div class="line"></div><p style="font-family:monospace;font-size:14px;letter-spacing:2px">${escapeHtml(code)}</p><p class="small">${escapeHtml(product.baseUnit)} · Rak ${escapeHtml(product.rack || '-')}</p></div>`,
      '58mm'
    );
  };

  const save = data => {
    try {
      saveProduct(data);
      setEditing(null);
    } catch (error) {
      alert(error.message || 'Produk gagal disimpan.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 generic-bg">
      <PageHeader
        title="Produk, Varian & Paket"
        subtitle="SKU, barcode, harga otomatis dari markup, satuan konversi, dan bundle"
        actions={canManage && <Button onClick={() => setEditing({ ...blank, prices: { ...blank.prices }, markups: { ...DEFAULT_MARKUPS } })}><Plus size={18}/> Produk Baru</Button>}
      />
      <div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Cari produk, SKU, atau barcode..."/>
          <label className="flex items-center gap-2 px-3 min-h-[48px] rounded-xl border bg-white card-element text-sm font-bold">
            <input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)}/>
            Tampilkan arsip
          </label>
        </div>

        {rows.length === 0 ? <EmptyState icon={Package} title="Produk tidak ditemukan"/> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {rows.map(product => {
              const retailMarkup = Number(product.markups?.retail ?? calculateMarkupPercent(product.modalPrice, product.prices?.retail));
              return (
                <Card key={product.id} className={`p-4 relative ${product.active === false ? 'opacity-60' : ''}`}>
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 img-placeholder flex items-center justify-center shrink-0"><Package className="text-gray-400"/></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex gap-1 flex-wrap mb-1">
                        {product.favorite && <Badge tone="yellow">Favorit</Badge>}
                        {product.bundleItems?.length > 0 && <Badge tone="purple">Bundle</Badge>}
                        {product.available === false && <Badge tone="red">Tidak Tersedia</Badge>}
                        {product.active === false && <Badge>Diarsipkan</Badge>}
                      </div>
                      <p className="font-bold text-sm text-gray-800 line-clamp-2">{product.name}</p>
                      <p className="text-[11px] text-gray-500">{product.category} · {product.sku}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-2 bg-emerald-50 rounded-xl"><p className="text-gray-500">Eceran</p><p className="font-bold text-emerald-700">{formatRp(product.prices?.retail)}</p></div>
                    <div className="p-2 bg-orange-50 rounded-xl"><p className="text-gray-500">Modal</p><p className="font-bold text-orange-700">{formatRp(product.modalPrice)}</p></div>
                    <div className="p-2 bg-blue-50 rounded-xl"><p className="text-gray-500">Stok</p><p className="font-bold text-blue-700">{product.stock} {product.baseUnit}</p></div>
                    <div className="p-2 bg-purple-50 rounded-xl"><p className="text-gray-500">Markup Eceran</p><p className="font-bold text-purple-700">{retailMarkup}%</p></div>
                  </div>
                  {canManage && <div className="grid grid-cols-5 gap-2 mt-4">
                    <button title="Edit" onClick={() => setEditing(product)} className="h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Pencil size={17}/></button>
                    <button title="Favorit" onClick={() => toggleProduct(product.id, 'favorite')} className="h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center"><Star size={17} fill={product.favorite ? 'currentColor' : 'none'}/></button>
                    <button title="Ketersediaan" onClick={() => toggleProduct(product.id, 'available')} className="h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">{product.available !== false ? <Eye size={17}/> : <EyeOff size={17}/>}</button>
                    <button title="Cetak label harga/barcode" onClick={() => printLabel(product)} className="h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Printer size={17}/></button>
                    <button title="Arsipkan" onClick={() => window.confirm('Arsipkan produk ini? Riwayat transaksi tetap aman.') && archiveProduct(product.id)} className="h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Archive size={17}/></button>
                  </div>}
                </Card>
              );
            })}
          </div>
        )}
      </div>
      {editing && <ProductForm product={editing} categories={db.categories} units={db.units} products={scoped.products} onClose={() => setEditing(null)} onSave={save}/>} 
    </div>
  );
}

function ProductForm({ product, categories, units, products, onClose, onSave }) {
  const initialMarkups = deriveMarkups(product.id ? product : { ...product, markups: product.markups || DEFAULT_MARKUPS });
  const [form, setForm] = useState(() => ({
    ...blank, ...product,
    prices: { ...blank.prices, ...product.prices },
    markups: initialMarkups,
    variants: product.variants || [], conversions: product.conversions || [], bundleItems: product.bundleItems || []
  }));
  const [markups, setMarkups] = useState(initialMarkups);
  const [variantText, setVariantText] = useState((form.variants || []).map(variant => variant.name).join(', '));
  const [conversionText, setConversionText] = useState((form.conversions || []).map(value => `${value.unit}=${value.factor}`).join('\n'));
  const [bundleId, setBundleId] = useState('');
  const [bundleQty, setBundleQty] = useState(1);

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
    if (!form.name.trim()) return alert('Nama produk wajib diisi.');
    if (Number(form.modalPrice) < 0) return alert('Harga modal tidak valid.');
    if (PRICE_TIERS.some(tier => Number(form.prices[tier.id]) < Number(form.modalPrice))) {
      const proceed = window.confirm('Ada harga jual di bawah harga modal. Tetap simpan?');
      if (!proceed) return;
    }
    const variants = variantText.split(',').map(value => value.trim()).filter(Boolean)
      .map((name, index) => ({ id: `VAR-${Date.now()}-${index}`, name, barcode: '', factor: 1, priceDelta: 0 }));
    const conversions = conversionText.split('\n').map(line => line.trim()).filter(Boolean)
      .map(line => { const [unit, factor] = line.split('='); return { unit: unit?.trim(), factor: Number(factor) || 1 }; })
      .filter(item => item.unit && item.factor > 0);
    onSave({ ...form, markups, variants, conversions });
  };

  return (
    <Modal
      title={form.id ? 'Edit Produk' : 'Tambah Produk'}
      onClose={onClose}
      size="xl"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Simpan Produk</Button></>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nama Produk" className="md:col-span-2"><Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></Field>
        <Field label="Kategori"><Select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</Select></Field>
        <Field label="Satuan Dasar"><Select value={form.baseUnit} onChange={event => setForm({ ...form, baseUnit: event.target.value })}>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</Select></Field>
        <Field label="SKU"><Input value={form.sku} onChange={event => setForm({ ...form, sku: event.target.value })} placeholder="Otomatis jika kosong"/></Field>
        <Field label="Barcode"><Input value={form.barcode} onChange={event => setForm({ ...form, barcode: event.target.value })} inputMode="numeric"/></Field>
        <Field label="Rak/Lokasi"><Input value={form.rack} onChange={event => setForm({ ...form, rack: event.target.value })}/></Field>
        <Field label="Stok Awal"><Input type="number" inputMode="decimal" value={form.id ? form.stock : (form.stock || '')} disabled={Boolean(form.id)} onChange={event => setForm({ ...form, stock: Number(event.target.value || 0) })} placeholder="0"/></Field>
        <Field label="Stok Minimum"><Input type="number" inputMode="decimal" value={form.minStock || ''} onChange={event => setForm({ ...form, minStock: Number(event.target.value || 0) })} placeholder="0"/></Field>

        <Card className="md:col-span-2 p-4 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center gap-2 mb-3"><TrendingUp size={20} className="text-emerald-700"/><div><p className="font-black text-gray-800">Harga & Persentase Keuntungan</p><p className="text-xs text-gray-500">Harga jual dihitung otomatis dari harga modal + markup.</p></div></div>
          <Field label="Harga Modal"><MoneyInput value={form.modalPrice} onValueChange={changeModalPrice} autoFocus={!form.id}/></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {PRICE_TIERS.map(tier => {
              const profit = Math.max(0, Number(form.prices[tier.id]) - Number(form.modalPrice));
              return (
                <div key={tier.id} className="p-3 bg-white rounded-2xl border border-gray-200">
                  <p className="font-bold text-sm text-gray-800 mb-2">Harga {tier.label}</p>
                  <Field label="Markup (%)">
                    <div className="relative"><Percent size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/><Input type="number" inputMode="decimal" min="0" max="1000" step="0.1" value={markups[tier.id] || ''} onChange={event => changeMarkup(tier.id, event.target.value)} className="field-input-trailing" placeholder="0"/></div>
                  </Field>
                  <Field label={`Harga ${tier.label}`}><MoneyInput value={form.prices[tier.id]} onValueChange={value => changeSellingPrice(tier.id, value)}/></Field>
                  <p className="text-[11px] text-emerald-700 font-bold mt-2">Untung {formatRp(profit)} per {form.baseUnit}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">{[10, 20, 30, 40, 50].map(value => <button key={value} type="button" onClick={() => changeMarkup(tier.id, value)} className="px-2 py-1 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-600">{value}%</button>)}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Field label="Varian" hint="Pisahkan dengan koma, contoh: Putih, Warm White, 12W"><Textarea value={variantText} onChange={event => setVariantText(event.target.value)}/></Field>
        <Field label="Konversi Satuan" hint={'Satu baris per konversi. Contoh:\nbox=10\nroll=100'}><Textarea value={conversionText} onChange={event => setConversionText(event.target.value)}/></Field>

        <div className="md:col-span-2">
          <p className="field-label">Komponen Bundle/Paket</p>
          <div className="flex gap-2">
            <Select value={bundleId} onChange={event => setBundleId(event.target.value)}><option value="">Pilih produk komponen</option>{products.filter(item => item.id !== form.id && item.active !== false).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <Input type="number" className="w-24" min="1" value={bundleQty || ''} onChange={event => setBundleQty(Math.max(1, Number(event.target.value || 1)))}/>
            <Button type="button" onClick={() => { if (bundleId) setForm({ ...form, bundleItems: [...form.bundleItems, { productId: bundleId, qty: bundleQty }] }); }}>Tambah</Button>
          </div>
          {form.bundleItems.length > 0 && <div className="mt-2 space-y-2">{form.bundleItems.map((item, index) => { const component = products.find(row => row.id === item.productId); return <div key={`${item.productId}-${index}`} className="flex justify-between p-2 rounded-xl bg-gray-50"><span className="text-sm">{item.qty} × {component?.name || item.productId}</span><button type="button" onClick={() => setForm({ ...form, bundleItems: form.bundleItems.filter((_, itemIndex) => itemIndex !== index) })} className="text-red-600 font-bold">Hapus</button></div>; })}</div>}
        </div>

        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.favorite} onChange={event => setForm({ ...form, favorite: event.target.checked })}/> Favorit</label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.available} onChange={event => setForm({ ...form, available: event.target.checked })}/> Tersedia</label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.trackStock} onChange={event => setForm({ ...form, trackStock: event.target.checked })}/> Lacak stok</label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })}/> Aktif</label>
        </div>
      </div>
    </Modal>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Package, Plus, Star, Archive, ArchiveRestore, Eye, EyeOff, Pencil, Printer, Percent, TrendingUp,
  ScanLine, Boxes, AlertTriangle, ArrowLeftRight, ClipboardCheck,
  SlidersHorizontal, History, Download, Upload, PackagePlus, CircleDollarSign, Ruler, Layers3, Trash2, WandSparkles, Copy, Tags, FolderPlus, Barcode
} from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import {
  calculateMarkupPercent, calculateMarkupPrice, downloadFile, escapeHtml, formatRp,
  localDateKey, printHtmlDocument
} from '../utils/helpers.js';
import {
  QUANTITY_STEP_PRESETS, formatQuantity, fractionalSaleLabel, normalizeQuantity, normalizeQuantityStep, normalizeSignedQuantity,
  quantityStepLabel, recommendedQuantityStep
} from '../utils/fractionalUnits.js';
import { barcodeSvgMarkup } from '../utils/barcodeLabel.js';
import { normalizeConversionRows, sortCategories, sortProductsByName } from '../utils/productCatalog.js';
import { buildProductLifecycleSummary, productLifecycleLabel } from '../utils/productLifecycle.js';
import {
  buildVariantGroupDraft, codeCollision, generateVariantGroupId, generateVariantSku,
  groupVariantProducts, isVariantChild, variantParentName
} from '../utils/variantProducts.js';
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, MoneyInput,
  PageHeader, SearchBox, Select, SummaryCard, Textarea
} from '../components/ui.jsx';
import ProductPicker from '../components/ProductPicker.jsx';
import InventoryImportModal from '../components/InventoryImportModal.jsx';
import BulkBarcodeLabelsModal from '../components/BulkBarcodeLabelsModal.jsx';
import BarcodeScannerModal from '../components/BarcodeScannerModal.jsx';
import { findProductByCode } from '../utils/barcode.js';

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
  name: '', brand: '', specifications: '', category: 'Listrik', sku: '', barcode: '', baseUnit: 'pcs', stock: 0,
  minStock: 5, rack: '-', modalPrice: 0,
  prices: { retail: 0, wholesale: 0, project: 0 }, markups: DEFAULT_MARKUPS,
  variants: [], conversions: [], bundleItems: [], favorite: false,
  available: true, active: true, trackStock: true, allowFractional: false, quantityStep: 1,
  serialTracking: false, warrantyMonths: 0
};

const createVariantRow = (parentName = '', variantName = '', products = [], source = {}) => {
  const usedCodes = products.flatMap(item => [item.sku, item.barcode]).filter(Boolean);
  const sku = source.sku || generateVariantSku(parentName, variantName || 'Varian', usedCodes);
  return {
    id: source.id || '',
    variantName: source.variantName || variantName,
    sku,
    internalBarcode: source.internalBarcode || source.barcode || sku,
    stock: Number(source.stock || 0),
    minStock: Number(source.minStock || 0),
    rack: source.rack || '-',
    modalPrice: Number(source.modalPrice || 0),
    prices: { retail: Number(source.prices?.retail || 0), wholesale: Number(source.prices?.wholesale || 0), project: Number(source.prices?.project || 0) },
    active: source.active !== false,
    available: source.available !== false,
    favorite: Boolean(source.favorite),
    existing: Boolean(source.id)
  };
};

const deriveMarkups = product => Object.fromEntries(PRICE_TIERS.map(tier => [
  tier.id,
  Number(product?.markups?.[tier.id] ?? calculateMarkupPercent(product?.modalPrice, product?.prices?.[tier.id]))
]));

const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function ProductsScreen() {
  const {
    db, scoped, branch, currentUser, hasPermission, saveProduct, archiveProduct, restoreProduct, deleteProduct, zeroProductStock, toggleProduct,
    adjustStock, stockOpname, transferStock, saveCategory, deleteCategory, importInventoryRows, authorizeManagerPin
  } = usePos();
  const [tab, setTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [stockFilter, setStockFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [opnameOpen, setOpnameOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [lifecycleProduct, setLifecycleProduct] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkLabelsOpen, setBulkLabelsOpen] = useState(false);
  const [sensitiveAction, setSensitiveAction] = useState(null);

  const canManageProducts = hasPermission('products.manage');
  const canManageStock = hasPermission('inventory.manage');
  const canManageCategories = hasPermission('categories.manage');
  const canDeleteProducts = hasPermission('products.delete');
  const canImportInventory = hasPermission('inventory.import');

  const catalogProducts = useMemo(() => sortProductsByName(groupVariantProducts(scoped.products)), [scoped.products]);
  const products = useMemo(() => catalogProducts.filter(product => {
    const term = search.trim().toLowerCase();
    const childText = product.isVariantGroup
      ? product.children.map(child => `${child.variantName} ${child.sku} ${child.barcode} ${child.rack}`).join(' ').toLowerCase()
      : '';
    const matchesSearch = !term || String(product.name || '').toLowerCase().includes(term) ||
      String(product.sku || '').toLowerCase().includes(term) ||
      String(product.barcode || product.sharedBarcode || '').toLowerCase().includes(term) ||
      String(product.rack || '').toLowerCase().includes(term) || childText.includes(term);
    const matchesArchive = showArchived || product.active !== false;
    const low = product.isVariantGroup
      ? product.children.some(child => child.active !== false && Number(child.stock || 0) <= Number(child.minStock || 0))
      : Number(product.stock || 0) <= Number(product.minStock || 0);
    const empty = product.isVariantGroup
      ? product.children.every(child => child.active === false || Number(child.stock || 0) <= 0)
      : Number(product.stock || 0) <= 0;
    const fractional = product.isVariantGroup
      ? product.children.some(child => child.allowFractional === true)
      : product.allowFractional === true;
    const matchesStock = stockFilter === 'all' ||
      (stockFilter === 'low' && low) ||
      (stockFilter === 'empty' && empty) ||
      (stockFilter === 'fractional' && fractional);
    return matchesSearch && matchesArchive && matchesStock;
  }), [catalogProducts, search, showArchived, stockFilter]);

  const activeProducts = useMemo(() => sortProductsByName(scoped.products.filter(product => product.active !== false && product.productType !== 'parent')), [scoped.products]);
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
      `<div class="center"><p class="bold">${escapeHtml(product.name)}</p>${product.variantName ? `<p class="small">Varian ${escapeHtml(product.variantName)} · Barcode internal</p>` : ''}<h2>${escapeHtml(formatRp(product.prices?.retail))}</h2><div class="line"></div><div style="display:flex;justify-content:center;max-width:100%;overflow:hidden">${barcodeSvgMarkup(code, { width: 1.45, height: 48, fontSize: 10 })}</div><p class="small">SKU ${escapeHtml(product.sku)} · ${escapeHtml(product.baseUnit)} · Rak ${escapeHtml(product.rack || '-')}</p>${product.sharedBarcode ? `<p class="small">Barcode kemasan: ${escapeHtml(product.sharedBarcode)}</p>` : ''}</div>`,
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
      (product.conversions || []).map(item => `1 ${item.unit} = ${item.factor} ${product.baseUnit}${Number(item.prices?.retail || 0) > 0 ? ` @ ${formatRp(item.prices.retail)}` : ''}`).join('; ')
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

  const persistProduct = data => {
    try {
      saveProduct(data);
      setEditing(null);
    } catch (error) {
      alert(error.message || 'Barang gagal disimpan.');
    }
  };

  const productPriceNeedsApproval = data => {
    const belowCost = (modalPrice, prices = {}) => PRICE_TIERS.some(tier => Number(prices?.[tier.id] || 0) < Number(modalPrice || 0));
    if (data.variantMode && Array.isArray(data.variantRows)) {
      return data.variantRows.some(row => {
        const existing = row.id ? scoped.products.find(product => product.id === row.id) : null;
        const modalChanged = existing && Number(existing.modalPrice || 0) !== Number(row.modalPrice || 0);
        return modalChanged || belowCost(row.modalPrice, row.prices);
      });
    }
    const existing = data.id ? scoped.products.find(product => product.id === data.id) : null;
    const modalChanged = existing && Number(existing.modalPrice || 0) !== Number(data.modalPrice || 0);
    return modalChanged || belowCost(data.modalPrice, data.prices);
  };

  const save = data => {
    if (productPriceNeedsApproval(data)) {
      requireSensitivePin('Konfirmasi Harga Modal / Harga di Bawah Modal', 'PRODUCT_COST_OVERRIDE', () => persistProduct(data));
      return;
    }
    persistProduct(data);
  };

  const newProduct = () => setEditing({ ...blank, prices: { ...blank.prices }, markups: { ...DEFAULT_MARKUPS }, conversions: [], variants: [], bundleItems: [], variantMode: false, variantRows: [] });

  const requireSensitivePin = (title, action, callback) => setSensitiveAction({ title, action, callback });

  return (
    <div className="h-full flex flex-col bg-gray-50 generic-bg">
      <PageHeader
        title="Produk & Stok"
        subtitle="Satu tempat untuk membuat barang, memasukkan stok awal, harga, satuan eceran, opname, dan transfer cabang"
        actions={<>
          <Button variant="outline" onClick={exportInventory}><Download size={17}/> Ekspor</Button>
          <Button variant="outline" onClick={printStockSheet}><Printer size={17}/> Lembar Stok</Button>
          <Button variant="outline" onClick={() => setBulkLabelsOpen(true)}><Barcode size={17}/> Label Massal</Button>
          {canImportInventory && <Button variant="outline" onClick={() => setImportOpen(true)}><Upload size={17}/> Impor Excel/CSV</Button>}
          {canManageCategories && <Button variant="outline" onClick={() => setCategoryOpen(true)}><Tags size={17}/> Kategori</Button>}
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
              {products.map(product => <ProductCatalogCard
                key={product.id}
                product={product}
                canManageProducts={canManageProducts}
                canManageStock={canManageStock}
                onEdit={() => setEditing(product.isVariantGroup ? buildVariantGroupDraft(product.children) : product)}
                onAdjust={child => setAdjusting(child || product)}
                onToggle={(id, field) => toggleProduct(id, field)}
                onPrint={printLabel}
                onLifecycle={() => setLifecycleProduct(product)}
              />)}
            </div>
          )}
        </>}

        {tab === 'movements' && <MovementTab rows={scoped.movements}/>} 
        {tab === 'adjust' && <HistoryActionTab title="Penyesuaian Stok" description="Tambah atau kurangi stok karena stok awal, koreksi, barang rusak, hilang, atau pemakaian internal." icon={SlidersHorizontal} disabled={!canManageStock} button="Buat Penyesuaian" onClick={() => setAdjusting(activeProducts[0] || null)} rows={scoped.adjustments}/>} 
        {tab === 'opname' && <HistoryActionTab title="Stok Opname" description="Bandingkan stok sistem dengan hitungan fisik. Selisih akan dicatat otomatis sebagai pergerakan stok." icon={ClipboardCheck} disabled={!canManageStock || activeProducts.length === 0} button="Mulai Opname" onClick={() => setOpnameOpen(true)} rows={scoped.opnames}/>} 
        {tab === 'transfer' && <HistoryActionTab title="Transfer Antar-Cabang" description="Pindahkan persediaan dari cabang aktif ke cabang lain tanpa membuat ulang produk." icon={ArrowLeftRight} disabled={!canManageStock || db.branches.length < 2 || activeProducts.length === 0} button="Transfer Stok" onClick={() => setTransferOpen(true)} rows={scoped.transfers}/>} 
      </div>

      {importOpen && canImportInventory && <InventoryImportModal products={scoped.products} categories={db.categories} branchId={branch?.id || db.configs.activeBranchId} onClose={() => setImportOpen(false)} onImport={(rows, options) => importInventoryRows(rows, options)}/>}
      {bulkLabelsOpen && <BulkBarcodeLabelsModal products={activeProducts} onClose={() => setBulkLabelsOpen(false)}/>}
      {editing && <ProductForm product={editing} categories={sortCategories(db.categories)} units={db.units} products={scoped.products} onAddCategory={canManageCategories ? (name => saveCategory({ name })) : null} onClose={() => setEditing(null)} onSave={save}/>} 
      {adjusting && <AdjustModal product={adjusting} products={activeProducts} onClose={() => setAdjusting(null)} onSelect={setAdjusting} onSave={data => requireSensitivePin('Konfirmasi Penyesuaian Stok', 'STOCK_ADJUST', () => { adjustStock(data); setAdjusting(null); })}/>} 
      {opnameOpen && <OpnameModal products={activeProducts} onClose={() => setOpnameOpen(false)} onSave={data => requireSensitivePin('Konfirmasi Stok Opname', 'STOCK_OPNAME', () => { stockOpname(data); setOpnameOpen(false); })}/>} 
      {categoryOpen && canManageCategories && <CategoryManagerModal categories={sortCategories(db.categories)} products={db.products} onClose={() => setCategoryOpen(false)} onSave={saveCategory} onDelete={deleteCategory}/>}
      {lifecycleProduct && (canManageProducts || canManageStock || canDeleteProducts) && <ProductLifecycleModal
        product={lifecycleProduct}
        db={db}
        canManageProducts={canManageProducts}
        canManageStock={canManageStock}
        canDeleteProducts={canDeleteProducts}
        onClose={() => setLifecycleProduct(null)}
        onArchive={ids => { ids.forEach(id => archiveProduct(id)); setLifecycleProduct(null); }}
        onRestore={ids => { ids.forEach(id => restoreProduct(id)); setLifecycleProduct(null); }}
        onZeroStock={(ids, reason) => requireSensitivePin('Kosongkan Stok Produk', 'STOCK_RESET', () => { zeroProductStock(ids, reason); setLifecycleProduct(null); })}
        onDelete={ids => requireSensitivePin('Hapus Produk Permanen', 'PRODUCT_DELETE', () => { deleteProduct(ids); setLifecycleProduct(null); })}
      />}
      {transferOpen && <TransferModal products={activeProducts} branches={db.branches} activeBranchId={branch?.id || db.configs.activeBranchId} onClose={() => setTransferOpen(false)} onSave={data => { try { transferStock(data); setTransferOpen(false); } catch (error) { alert(error.message); } }}/>} 
      {sensitiveAction && <SensitivePinModal title={sensitiveAction.title} userName={currentUser?.name} onClose={() => setSensitiveAction(null)} onConfirm={async pin => { try { const approval = await authorizeManagerPin(pin, sensitiveAction.action); if (!approval) throw new Error('PIN Owner/Manager tidak valid.'); sensitiveAction.callback(); setSensitiveAction(null); } catch (error) { alert(error.message); } }}/>}
    </div>
  );
}


function ProductCatalogCard({ product, canManageProducts, canManageStock, onEdit, onAdjust, onToggle, onPrint, onLifecycle }) {
  if (product.isVariantGroup) {
    const activeChildren = product.children.filter(child => child.active !== false);
    const lowChildren = activeChildren.filter(child => Number(child.stock || 0) <= Number(child.minStock || 0));
    const prices = activeChildren.map(child => Number(child.prices?.retail || 0));
    const priceMin = prices.length ? Math.min(...prices) : 0;
    const priceMax = prices.length ? Math.max(...prices) : 0;
    return <Card className="p-4 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40">
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0"><Layers3 className="text-emerald-700"/></div>
        <div className="min-w-0 flex-1">
          <div className="flex gap-1 flex-wrap mb-1"><Badge tone="green">Produk Induk</Badge><Badge tone="blue">{activeChildren.length} varian</Badge>{lowChildren.length > 0 && <Badge tone="red">{lowChildren.length} stok menipis</Badge>}</div>
          <p className="font-black text-sm text-gray-900 line-clamp-2">{product.name}</p>
          <p className="text-[11px] text-gray-500">Barcode bersama: {product.sharedBarcode || 'belum diisi'}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {activeChildren.map(child => <div key={child.id} className="rounded-xl border bg-white p-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0"><p className="font-bold text-xs text-gray-800 truncate">{child.variantName}</p><p className="text-[10px] text-gray-500 truncate">{child.sku} · Rak {child.rack || '-'}</p></div>
          <div className="flex items-center gap-2 shrink-0"><div className="text-right"><p className="font-black text-xs text-emerald-700">{formatRp(child.prices?.retail)}</p><p className={`text-[10px] font-bold ${Number(child.stock || 0) <= Number(child.minStock || 0) ? 'text-red-600' : 'text-blue-600'}`}>{formatQuantity(child.stock)} {child.baseUnit}</p></div><button type="button" title="Cetak label barcode internal" onClick={() => onPrint(child)} className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Printer size={14}/></button></div>
        </div>)}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {canManageProducts && <button title="Edit produk induk dan varian" onClick={onEdit} className="h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Pencil size={17}/></button>}
        {canManageStock && <button title="Pilih varian untuk penyesuaian stok" onClick={() => onAdjust(activeChildren[0])} className="h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><SlidersHorizontal size={17}/></button>}
        {canManageProducts && <button title="Kelola, arsipkan, atau hapus semua varian" onClick={onLifecycle} className="h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Trash2 size={17}/></button>}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs"><div className="p-2 bg-emerald-50 rounded-xl"><p className="text-gray-500">Rentang Harga</p><p className="font-bold text-emerald-700">{priceMin === priceMax ? formatRp(priceMin) : `${formatRp(priceMin)} – ${formatRp(priceMax)}`}</p></div><div className="p-2 bg-blue-50 rounded-xl"><p className="text-gray-500">Total Stok</p><p className="font-bold text-blue-700">{formatQuantity(product.stock)} {product.baseUnit}</p></div></div>
    </Card>;
  }
  const retailMarkup = Number(product.markups?.retail ?? calculateMarkupPercent(product.modalPrice, product.prices?.retail));
  const lowStock = Number(product.stock || 0) <= Number(product.minStock || 0);
  return <Card className={`p-4 relative ${product.active === false ? 'opacity-60' : ''}`}>
    <div className="flex gap-3"><div className="w-14 h-14 rounded-2xl bg-gray-100 img-placeholder flex items-center justify-center shrink-0"><Package className="text-gray-400"/></div><div className="min-w-0 flex-1"><div className="flex gap-1 flex-wrap mb-1">{product.favorite && <Badge tone="yellow">Favorit</Badge>}{product.allowFractional && <Badge tone="blue"><Ruler size={11} className="mr-1"/>Eceran</Badge>}{product.bundleItems?.length > 0 && <Badge tone="purple">Paket</Badge>}{lowStock && product.active !== false && <Badge tone="red">{Number(product.stock || 0) <= 0 ? 'Habis' : 'Menipis'}</Badge>}{product.available === false && <Badge tone="red">Tidak Tersedia</Badge>}{product.active === false && <Badge>Diarsipkan</Badge>}</div><p className="font-bold text-sm text-gray-800 line-clamp-2">{product.name}</p><p className="text-[11px] text-gray-500">{product.category} · {product.sku} · Rak {product.rack || '-'}</p></div></div>
    <div className="grid grid-cols-2 gap-2 mt-4 text-xs"><div className="p-2 bg-emerald-50 rounded-xl"><p className="text-gray-500">Harga/{product.baseUnit}</p><p className="font-bold text-emerald-700">{formatRp(product.prices?.retail)}</p></div><div className="p-2 bg-orange-50 rounded-xl"><p className="text-gray-500">Modal/{product.baseUnit}</p><p className="font-bold text-orange-700">{formatRp(product.modalPrice)}</p></div><div className={`p-2 rounded-xl ${lowStock ? 'bg-red-50' : 'bg-blue-50'}`}><p className="text-gray-500">Stok</p><p className={`font-bold ${lowStock ? 'text-red-700' : 'text-blue-700'}`}>{formatQuantity(product.stock)} {product.baseUnit}</p></div><div className="p-2 bg-purple-50 rounded-xl"><p className="text-gray-500">Markup Eceran</p><p className="font-bold text-purple-700">{retailMarkup}%</p></div></div>
    {product.allowFractional && <p className="mt-3 text-[11px] rounded-xl bg-blue-50 text-blue-700 p-2 font-bold">{fractionalSaleLabel(product)}</p>}
    {(product.conversions || []).length > 0 && <div className="mt-2 space-y-1">{product.conversions.map(item => <p key={item.unit} className="text-[11px] text-gray-500">1 {item.unit} = {formatQuantity(item.factor)} {product.baseUnit}{Number(item.prices?.retail || 0) > 0 ? ` · Harga ${formatRp(item.prices.retail)}` : ' · Harga otomatis'}</p>)}</div>}
    {(canManageProducts || canManageStock) && <div className="grid grid-cols-6 gap-2 mt-4">{canManageProducts && <button title="Edit barang" onClick={onEdit} className="h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Pencil size={17}/></button>}{canManageStock && <button title="Penyesuaian stok" onClick={() => onAdjust(product)} className="h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><SlidersHorizontal size={17}/></button>}{canManageProducts && <button title="Favorit" onClick={() => onToggle(product.id, 'favorite')} className="h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center"><Star size={17} fill={product.favorite ? 'currentColor' : 'none'}/></button>}{canManageProducts && <button title="Ketersediaan" onClick={() => onToggle(product.id, 'available')} className="h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">{product.available !== false ? <Eye size={17}/> : <EyeOff size={17}/>}</button>}<button title="Cetak label harga/barcode" onClick={() => onPrint(product)} className="h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Printer size={17}/></button>{canManageProducts && <button title="Kelola, arsipkan, atau hapus" onClick={onLifecycle} className="h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Trash2 size={17}/></button>}</div>}
  </Card>;
}


function ProductLifecycleModal({ product, db, canManageProducts, canManageStock, canDeleteProducts, onClose, onArchive, onRestore, onZeroStock, onDelete }) {
  const ids = product.isVariantGroup ? product.children.map(child => child.id) : [product.id];
  const summary = useMemo(() => buildProductLifecycleSummary(db, ids), [db, product]);
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('Koreksi stok sebelum produk diarsipkan atau dihapus');
  const allArchived = summary.products.length > 0 && summary.products.every(item => item.active === false);
  const displayName = product.name || summary.products[0]?.name || 'Produk';
  const run = action => {
    try { action(); }
    catch (error) { alert(error.message || 'Tindakan produk gagal.'); }
  };
  return <Modal title="Kelola Produk & Stok" onClose={onClose} size="lg" footer={<Button variant="secondary" onClick={onClose}>Tutup</Button>}>
    <div className="space-y-4">
      <div className="rounded-2xl border bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="font-black text-gray-900">{displayName}</p><p className="text-sm text-gray-600 mt-1">{productLifecycleLabel(summary)}</p></div><Badge tone={summary.canDeletePermanently ? 'green' : 'orange'}>{product.isVariantGroup ? `${summary.products.length} varian` : '1 produk'}</Badge></div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm"><div className="rounded-xl bg-white border p-3"><p className="text-gray-500">Total stok</p><p className="font-black text-blue-700">{formatQuantity(summary.stock)}</p></div><div className="rounded-xl bg-white border p-3"><p className="text-gray-500">Referensi riwayat</p><p className="font-black text-purple-700">{summary.historyCount}</p></div></div>
        {summary.usage.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{summary.usage.map(([label, count]) => <Badge key={label}>{label}: {count}</Badge>)}</div>}
      </div>

      {(() => {
        const history = (db.productPriceHistory || []).filter(item => ids.includes(item.productId)).slice(0, 8);
        if (!history.length) return null;
        return <Card className="p-4 border-blue-200 bg-blue-50/50"><div className="flex items-center justify-between gap-2"><div><p className="font-black text-blue-950">Riwayat Harga</p><p className="text-xs text-blue-800 mt-1">Jejak harga modal, eceran, grosir, proyek, dan kemasan.</p></div><Badge tone="blue">{history.length} terbaru</Badge></div><div className="mt-3 space-y-2">{history.map(item => <div key={item.id} className="rounded-xl bg-white border p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><b>{item.reason || 'Perubahan harga'}</b><span className="text-gray-500">{new Date(item.createdAt).toLocaleString('id-ID')}</span></div><p className="mt-1 text-gray-600">Modal {formatRp(item.before?.modalPrice || 0)} → {formatRp(item.after?.modalPrice || 0)} · Eceran {formatRp(item.before?.retail || 0)} → {formatRp(item.after?.retail || 0)}</p></div>)}</div></Card>;
      })()}

      {summary.stock > 0 && canManageStock && <Card className="p-4 border-orange-200 bg-orange-50/70"><p className="font-black text-orange-900">Kosongkan stok menjadi 0</p><p className="text-xs text-orange-800 mt-1">Ini membuat penyesuaian stok dan jejak audit. Riwayat lama tidak dihapus.</p><Field label="Alasan" className="mt-3"><Input value={reason} onChange={event => setReason(event.target.value)} maxLength={180}/></Field><Button variant="danger" className="mt-3" onClick={() => run(() => onZeroStock(ids, reason))} disabled={!reason.trim()}><SlidersHorizontal size={17}/> Kosongkan Stok</Button></Card>}

      {canManageProducts && <Card className="p-4 border-amber-200 bg-amber-50/60"><p className="font-black text-amber-900">{allArchived ? 'Pulihkan produk' : 'Arsipkan produk'}</p><p className="text-xs text-amber-800 mt-1">{allArchived ? 'Produk kembali muncul di Kasir dan daftar aktif.' : 'Pilihan paling aman bila produk pernah dipakai. Produk hilang dari Kasir, tetapi laporan tetap utuh.'}</p><Button variant="outline" className="mt-3" onClick={() => run(() => allArchived ? onRestore(ids) : onArchive(ids))}>{allArchived ? <ArchiveRestore size={17}/> : <Archive size={17}/>} {allArchived ? 'Pulihkan Produk' : 'Arsipkan Produk'}</Button></Card>}

      {canDeleteProducts && <Card className="p-4 border-red-200 bg-red-50/70"><p className="font-black text-red-900">Hapus permanen</p><p className="text-xs text-red-800 mt-1">Hanya tersedia bila stok 0 dan produk sama sekali belum memiliki transaksi, pembelian, pergerakan stok, opname, transfer, refund, pesanan, atau referensi paket.</p>{summary.canDeletePermanently ? <><Field label={`Ketik nama produk untuk konfirmasi: ${displayName}`} className="mt-3"><Input value={confirmation} onChange={event => setConfirmation(event.target.value)}/></Field><Button variant="danger" className="mt-3" onClick={() => run(() => onDelete(ids))} disabled={confirmation.trim() !== displayName.trim()}><Trash2 size={17}/> Hapus Permanen</Button></> : <p className="mt-3 text-sm font-bold text-red-700">Tidak dapat dihapus permanen. Gunakan Arsipkan agar data laporan tidak rusak.</p>}</Card>}

      {!canManageProducts && !canManageStock && !canDeleteProducts && <p className="text-sm text-gray-600">Akun ini hanya dapat melihat produk.</p>}
    </div>
  </Modal>;
}


function PackagingUnitsEditor({ baseUnit, basePrices, rows, onChange, onPreset, sharedAcrossVariants = false }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const update = (index, patch) => onChange(safeRows.map((row, rowIndex) => rowIndex === index ? {
    ...row,
    ...patch,
    prices: patch.prices ? { ...(row.prices || {}), ...patch.prices } : (row.prices || { retail: 0, wholesale: 0, project: 0 })
  } : row));
  const add = () => onChange([...safeRows, { unit: '', factor: '', barcode: '', prices: { retail: 0, wholesale: 0, project: 0 } }]);
  const remove = index => onChange(safeRows.filter((_, rowIndex) => rowIndex !== index));
  return <Card className="p-4 border-purple-200 bg-purple-50/40">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div><p className="font-black text-gray-900">Satuan Jual & Harga Kemasan</p><p className="text-xs text-gray-600 mt-1">Satu stok disimpan dalam {baseUnit}. Setiap pack, dus, box, atau roll dapat memiliki harga jual khusus—tidak harus harga {baseUnit} × isi.</p>{sharedAcrossVariants && <p className="text-[11px] font-bold text-purple-700 mt-1">Konversi ini berlaku pada semua varian; harga kosong mengikuti harga varian × isi kemasan.</p>}</div>
      <Button type="button" size="sm" onClick={add}><Plus size={16}/> Tambah Satuan</Button>
    </div>
    <div className="mt-4 rounded-2xl border bg-white p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div><p className="text-gray-500">Satuan dasar</p><p className="font-black">1 {baseUnit}</p></div>
      <div><p className="text-gray-500">Harga eceran</p><p className="font-black text-emerald-700">{formatRp(basePrices?.retail)}</p></div>
      <div><p className="text-gray-500">Harga grosir</p><p className="font-black text-blue-700">{formatRp(basePrices?.wholesale)}</p></div>
      <div><p className="text-gray-500">Harga proyek</p><p className="font-black text-purple-700">{formatRp(basePrices?.project)}</p></div>
    </div>
    <div className="mt-3 space-y-3">
      {safeRows.map((row, index) => {
        const factor = Number(row.factor || 0);
        const calculatedRetail = Math.round(Number(basePrices?.retail || 0) * factor);
        const packageRetail = Number(row.prices?.retail || 0);
        const saving = calculatedRetail > 0 && packageRetail > 0 ? calculatedRetail - packageRetail : 0;
        return <div key={`${row.unit || 'new'}-${index}`} className="rounded-2xl border border-gray-200 bg-white p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(120px,.8fr)_minmax(130px,.8fr)_repeat(3,minmax(145px,1fr))_48px] gap-3 items-end">
            <Field label="Nama satuan"><Input value={row.unit || ''} onChange={event => update(index, { unit: event.target.value.toLowerCase() })} placeholder="pack / dus / box / roll"/></Field>
            <Field label={`Isi dalam ${baseUnit}`}><Input type="number" inputMode="decimal" min="0.001" step="0.001" value={row.factor ?? ''} onChange={event => update(index, { factor: event.target.value })} placeholder="100"/></Field>
            <Field label="Harga eceran khusus"><MoneyInput value={row.prices?.retail || 0} onValueChange={value => update(index, { prices: { retail: value } })} placeholder={String(calculatedRetail || 0)}/></Field>
            <Field label="Harga grosir khusus"><MoneyInput value={row.prices?.wholesale || 0} onValueChange={value => update(index, { prices: { wholesale: value } })}/></Field>
            <Field label="Harga proyek khusus"><MoneyInput value={row.prices?.project || 0} onValueChange={value => update(index, { prices: { project: value } })}/></Field>
            <button type="button" onClick={() => remove(index)} className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center" title="Hapus satuan"><Trash2 size={17}/></button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {factor > 0 && <Badge tone="blue">1 {row.unit || 'kemasan'} = {formatQuantity(factor)} {baseUnit}</Badge>}
            {calculatedRetail > 0 && <Badge>Harga hitung normal {formatRp(calculatedRetail)}</Badge>}
            {packageRetail > 0 && saving > 0 && <Badge tone="green">Hemat {formatRp(saving)} ({Math.round(saving / calculatedRetail * 100)}%)</Badge>}
            {packageRetail > calculatedRetail && <Badge tone="orange">Harga kemasan lebih tinggi {formatRp(packageRetail - calculatedRetail)}</Badge>}
            {!packageRetail && calculatedRetail > 0 && <Badge tone="purple">Kosong = otomatis {formatRp(calculatedRetail)}</Badge>}
          </div>
        </div>;
      })}
      {!safeRows.length && <div className="rounded-2xl border border-dashed p-5 text-center text-gray-500 text-sm">Belum ada kemasan. Barang tetap dapat dijual per {baseUnit}.</div>}
    </div>
    <div className="flex flex-wrap gap-2 mt-3">
      {baseUnit === 'pcs' && <><Button type="button" size="sm" variant="secondary" onClick={() => onPreset('pack', 100)}>Preset pack 100 pcs</Button><Button type="button" size="sm" variant="secondary" onClick={() => onPreset('dus', 50)}>Preset dus 50 pcs</Button><Button type="button" size="sm" variant="secondary" onClick={() => onPreset('lusin', 12)}>Preset lusin 12 pcs</Button></>}
      {baseUnit === 'meter' && <Button type="button" size="sm" variant="secondary" onClick={() => onPreset('roll', 50)}>Preset roll 50 meter</Button>}
    </div>
  </Card>;
}

function CategoryManagerModal({ categories, products, onClose, onSave, onDelete }) {
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState('');
  const [replacement, setReplacement] = useState('');
  const rows = sortCategories(categories);
  const countFor = category => products.filter(product => product.active !== false && String(product.category || '').toLowerCase() === String(category).toLowerCase()).length;
  const save = () => {
    try {
      onSave({ name, originalName: editingName });
      setName(''); setEditingName('');
    } catch (error) { alert(error.message || 'Kategori gagal disimpan.'); }
  };
  const remove = category => {
    try {
      const count = countFor(category);
      const targetReplacement = count ? replacement : '';
      if (count && !targetReplacement) return alert(`Kategori ${category} masih dipakai ${count} barang. Pilih kategori pengganti terlebih dahulu.`);
      if (count && targetReplacement.toLowerCase() === category.toLowerCase()) return alert('Kategori pengganti harus berbeda dari kategori yang dihapus.');
      if (!window.confirm(count ? `Pindahkan ${count} barang dari ${category} ke ${targetReplacement}, lalu hapus kategori lama?` : `Hapus kategori ${category}?`)) return;
      onDelete(category, targetReplacement);
      setReplacement('');
    } catch (error) { alert(error.message || 'Kategori gagal dihapus.'); }
  };
  return <Modal title="Kategori Produk" onClose={onClose} size="lg" footer={<Button variant="secondary" onClick={onClose}>Selesai</Button>}>
    <Card className="p-4 bg-emerald-50 border-emerald-100">
      <p className="font-black text-emerald-900">{editingName ? `Ubah kategori ${editingName}` : 'Tambah kategori baru'}</p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Contoh: Kabel & Aksesori"/><Button onClick={save} disabled={name.trim().length < 2}><FolderPlus size={17}/>{editingName ? 'Simpan Nama' : 'Tambah Kategori'}</Button>{editingName && <Button variant="secondary" onClick={() => { setEditingName(''); setName(''); }}>Batal Edit</Button>}</div>
    </Card>
    <Field label="Kategori pengganti saat menghapus kategori yang masih dipakai" className="mt-4"><Select value={replacement} onChange={event => setReplacement(event.target.value)}><option value="">Pilih bila diperlukan</option>{rows.map(category => <option key={category} value={category}>{category}</option>)}</Select></Field>
    <div className="mt-4 space-y-2">
      {rows.map(category => <Card key={category} className="p-3 flex items-center justify-between gap-3"><div><p className="font-black text-gray-900">{category}</p><p className="text-xs text-gray-500">{countFor(category)} barang aktif</p></div><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setEditingName(category); setName(category); }}><Pencil size={15}/> Ubah</Button><Button size="sm" variant="danger" onClick={() => remove(category)} disabled={rows.length <= 1}><Trash2 size={15}/> Hapus</Button></div></Card>)}
    </div>
  </Modal>;
}

function ProductForm({ product, categories, units, products, onAddCategory, onClose, onSave }) {
  const initialMarkups = deriveMarkups(product.id ? product : { ...product, markups: product.markups || DEFAULT_MARKUPS });
  const [form, setForm] = useState(() => ({
    ...blank, ...product,
    prices: { ...blank.prices, ...product.prices },
    markups: initialMarkups,
    variants: product.variants || [], conversions: product.conversions || [], bundleItems: product.bundleItems || [],
    allowFractional: product.allowFractional === true,
    quantityStep: normalizeQuantityStep(product.quantityStep, product.allowFractional === true, recommendedQuantityStep(product.baseUnit, product.category))
  }));
  const [markups, setMarkups] = useState(initialMarkups);
  const [variantMode, setVariantMode] = useState(product.variantMode === true || product.isVariantGroupDraft === true);
  const [variantRows, setVariantRows] = useState(() => {
    if (Array.isArray(product.variantRows) && product.variantRows.length) return product.variantRows.map(row => createVariantRow(product.name, row.variantName, products, row));
    return [];
  });
  const [deletedVariantIds, setDeletedVariantIds] = useState([]);
  const [variantText, setVariantText] = useState((form.variants || []).map(variant => variant.name).join(', '));
  const [conversionRows, setConversionRows] = useState(() => normalizeConversionRows(form.conversions || [], form.baseUnit));
  const [categoryQuickOpen, setCategoryQuickOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [bundleQty, setBundleQty] = useState(1);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [variantScannerIndex, setVariantScannerIndex] = useState(null);


  const changeBaseUnit = nextUnit => setForm(previous => ({
    ...previous,
    baseUnit: nextUnit,
    quantityStep: previous.allowFractional
      ? recommendedQuantityStep(nextUnit, previous.category)
      : 1
  }));

  const toggleFractional = enabled => setForm(previous => ({
    ...previous,
    allowFractional: enabled,
    quantityStep: enabled ? recommendedQuantityStep(previous.baseUnit, previous.category) : 1
  }));

  const applyConversionPreset = (unit, factor) => setConversionRows(previous => normalizeConversionRows([
    { unit, factor, prices: { retail: 0, wholesale: 0, project: 0 } },
    ...previous.filter(row => String(row.unit || '').toLowerCase() !== String(unit).toLowerCase())
  ], form.baseUnit));

  const addCategoryInline = () => {
    try {
      const name = onAddCategory?.(newCategoryName);
      if (!name) return;
      setForm(previous => ({ ...previous, category: name }));
      setNewCategoryName('');
      setCategoryQuickOpen(false);
    } catch (error) {
      alert(error.message || 'Kategori gagal ditambahkan.');
    }
  };

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

  const enableVariantMode = () => {
    setVariantMode(true);
    setForm(previous => ({
      ...previous,
      variantGroupId: previous.variantGroupId || generateVariantGroupId(previous.name || 'Produk'),
      sharedBarcode: previous.sharedBarcode || previous.barcode || ''
    }));
    setVariantRows(previous => {
      if (previous.length) return previous;
      if (product.id && !product.isVariantGroupDraft) {
        const generatedSku = generateVariantSku(form.name, 'Standar', products.filter(item => item.id !== product.id).flatMap(item => [item.sku, item.barcode]).filter(Boolean));
        return [createVariantRow(form.name, 'Standar', products, {
          ...product,
          sku: generatedSku,
          barcode: '',
          internalBarcode: generatedSku,
          variantName: 'Standar'
        })];
      }
      return [
        createVariantRow(form.name, '6W', products),
        createVariantRow(form.name, '10W', products)
      ];
    });
  };

  const updateVariantRow = (index, patch) => setVariantRows(previous => previous.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    const next = { ...row, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, 'variantName') && !row.existing) {
      const used = [
        ...products.filter(item => item.id !== row.id).flatMap(item => [item.sku, item.barcode]),
        ...previous.filter((_, otherIndex) => otherIndex !== index).flatMap(item => [item.sku, item.internalBarcode])
      ].filter(Boolean);
      const wasAuto = !row.sku || row.internalBarcode === row.sku || /^BM-/.test(row.sku);
      if (wasAuto) {
        const sku = generateVariantSku(form.name, patch.variantName, used);
        next.sku = sku;
        if (!row.internalBarcode || row.internalBarcode === row.sku || /^BM-/.test(row.internalBarcode)) next.internalBarcode = sku;
      }
    }
    return next;
  }));

  const addVariantRow = () => setVariantRows(previous => {
    const row = createVariantRow(form.name, `Varian ${previous.length + 1}`, [
      ...products,
      ...previous.map(item => ({ sku: item.sku, barcode: item.internalBarcode }))
    ]);
    return [...previous, row];
  });

  const removeVariantRow = index => setVariantRows(previous => {
    const row = previous[index];
    if (row?.id) setDeletedVariantIds(ids => [...new Set([...ids, row.id])]);
    return previous.filter((_, rowIndex) => rowIndex !== index);
  });

  const applyLedWattPreset = () => setVariantRows(previous => {
    const desired = ['6W', '10W', '12W', '15W'];
    const used = products.filter(item => !previous.some(row => row.id === item.id)).flatMap(item => [item.sku, item.barcode]).filter(Boolean);
    return desired.map(name => {
      const existing = previous.find(row => String(row.variantName || '').trim().toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      const row = createVariantRow(form.name || 'Philips LED', name, [...products, ...used.map(code => ({ sku: code }))]);
      used.push(row.sku, row.internalBarcode);
      return row;
    });
  });

  const regenerateVariantCodes = () => setVariantRows(previous => {
    const used = products.filter(item => !previous.some(row => row.id === item.id)).flatMap(item => [item.sku, item.barcode]).filter(Boolean);
    return previous.map(row => {
      const sku = generateVariantSku(form.name, row.variantName || 'Varian', used);
      used.push(sku);
      return { ...row, sku, internalBarcode: sku };
    });
  });

  const parsedConversions = () => normalizeConversionRows(conversionRows, form.baseUnit);

  const submitVariantGroup = () => {
    const parentName = form.name.trim();
    if (!parentName) return alert('Nama produk induk wajib diisi.');
    if (variantRows.length < 2) return alert('Produk varian minimal memiliki dua varian.');
    const names = new Set();
    const skus = new Set();
    const internalCodes = new Set();
    const codeOwners = new Map();
    for (const row of variantRows) {
      const variantName = String(row.variantName || '').trim();
      const sku = String(row.sku || '').trim().toUpperCase();
      const internalBarcode = String(row.internalBarcode || sku).trim().toUpperCase();
      if (!variantName) return alert('Semua nama varian wajib diisi.');
      if (names.has(variantName.toLowerCase())) return alert(`Nama varian ${variantName} digunakan lebih dari sekali.`);
      if (!sku) return alert(`SKU varian ${variantName} wajib diisi.`);
      if (skus.has(sku)) return alert(`SKU ${sku} digunakan lebih dari sekali.`);
      if (!internalBarcode) return alert(`Barcode internal varian ${variantName} wajib diisi.`);
      if (internalCodes.has(internalBarcode)) return alert(`Barcode internal ${internalBarcode} digunakan lebih dari sekali.`);
      for (const code of new Set([sku, internalBarcode])) {
        const owner = codeOwners.get(code);
        if (owner && owner !== variantName) return alert(`Kode ${code} sudah dipakai oleh varian ${owner}. SKU dan barcode internal antarvarian harus unik.`);
        codeOwners.set(code, variantName);
      }
      if (Number(row.modalPrice) < 0 || PRICE_TIERS.some(tier => Number(row.prices?.[tier.id] || 0) < 0)) return alert(`Harga varian ${variantName} tidak valid.`);
      if (!row.id && Number(row.stock || 0) < 0) return alert(`Stok awal varian ${variantName} tidak boleh negatif.`);
      names.add(variantName.toLowerCase()); skus.add(sku); internalCodes.add(internalBarcode);
    }
    const ignoreIds = variantRows.map(row => row.id).filter(Boolean);
    const sharedBarcode = String(form.sharedBarcode || '').trim();
    if (sharedBarcode) {
      const collision = codeCollision(products, {
        code: sharedBarcode,
        branchId: form.branchId,
        ignoreIds,
        variantGroupId: form.variantGroupId,
        shared: true
      });
      if (collision) return alert(`Barcode kemasan ${sharedBarcode} sudah dipakai oleh ${collision.name}.`);
    }
    for (const row of variantRows) {
      for (const [label, code] of [['SKU', row.sku], ['Barcode internal', row.internalBarcode]]) {
        const collision = codeCollision(products, { code, branchId: form.branchId, ignoreIds, variantGroupId: form.variantGroupId });
        if (collision) return alert(`${label} ${code} sudah dipakai oleh ${collision.name}.`);
      }
    }
    onSave({
      ...form,
      variantMode: true,
      variantGroupId: form.variantGroupId || generateVariantGroupId(parentName),
      parentName,
      sharedBarcode,
      conversions: parsedConversions(),
      quantityStep: normalizeQuantityStep(form.quantityStep, form.allowFractional, recommendedQuantityStep(form.baseUnit, form.category)),
      variantRows: variantRows.map(row => ({
        ...row,
        variantName: String(row.variantName).trim(),
        sku: String(row.sku).trim().toUpperCase(),
        internalBarcode: String(row.internalBarcode || row.sku).trim().toUpperCase(),
        stock: Number(row.stock || 0),
        minStock: Number(row.minStock || 0),
        modalPrice: Number(row.modalPrice || 0),
        prices: Object.fromEntries(PRICE_TIERS.map(tier => [tier.id, Number(row.prices?.[tier.id] || 0)]))
      })),
      deletedVariantIds
    });
  };

  const submit = () => {
    if (variantMode) return submitVariantGroup();
    if (!form.name.trim()) return alert('Nama barang wajib diisi.');
    if (Number(form.modalPrice) < 0) return alert('Harga modal tidak valid.');
    if (!form.id && Number(form.stock || 0) < 0) return alert('Stok awal tidak boleh negatif.');
    if (products.some(item => item.id !== form.id && item.active !== false && String(item.barcode || '') && String(item.barcode || '') === String(form.barcode || ''))) return alert('Barcode ini sudah dipakai barang lain.');
    const variants = variantText.split(',').map(value => value.trim()).filter(Boolean)
      .map((name, index) => {
        const previous = (form.variants || []).find(item => String(item.name || '').trim().toLowerCase() === name.toLowerCase());
        return previous ? { ...previous, name } : { id: `VAR-${Date.now()}-${index}`, name, barcode: '', factor: 1, priceDelta: 0 };
      });
    const conversions = normalizeConversionRows(conversionRows, form.baseUnit);
    onSave({
      ...form,
      markups,
      variants,
      conversions,
      stock: Number(form.stock || 0),
      minStock: Number(form.minStock || 0),
      quantityStep: normalizeQuantityStep(form.quantityStep, form.allowFractional, recommendedQuantityStep(form.baseUnit, form.category))
    });
  };

  const stockStep = normalizeQuantityStep(form.quantityStep, form.allowFractional, recommendedQuantityStep(form.baseUnit, form.category));
  if (variantMode) return <VariantGroupFormModal
    form={form}
    setForm={setForm}
    categories={categories}
    onAddCategory={onAddCategory}
    units={units}
    products={products}
    variantRows={variantRows}
    updateVariantRow={updateVariantRow}
    addVariantRow={addVariantRow}
    removeVariantRow={removeVariantRow}
    regenerateVariantCodes={regenerateVariantCodes}
    applyLedWattPreset={applyLedWattPreset}
    conversionRows={conversionRows}
    setConversionRows={setConversionRows}
    applyConversionPreset={applyConversionPreset}
    changeBaseUnit={changeBaseUnit}
    toggleFractional={toggleFractional}
    onClose={onClose}
    onSubmit={submitVariantGroup}
    barcodeScannerOpen={barcodeScannerOpen}
    setBarcodeScannerOpen={setBarcodeScannerOpen}
    variantScannerIndex={variantScannerIndex}
    setVariantScannerIndex={setVariantScannerIndex}
    canReturnToStandard={!product.isVariantGroupDraft && !(product.variantRows || []).length}
    onReturnToStandard={() => setVariantMode(false)}
  />;
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
        <Field label="Merek"><Input value={form.brand || ''} onChange={event => setForm({ ...form, brand: event.target.value })} placeholder="Contoh: Philips, Supreme, Broco"/></Field>
        <Field label="Spesifikasi Singkat" hint="Gunakan untuk watt, ampere, ukuran, warna cahaya, diameter, atau spesifikasi teknis lain."><Input value={form.specifications || ''} onChange={event => setForm({ ...form, specifications: event.target.value })} placeholder="Contoh: 10W · 6500K · E27"/></Field>
        <Card className="md:col-span-2 p-4 border-emerald-200 bg-emerald-50/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex gap-3"><Layers3 className="text-emerald-700 shrink-0"/><div><p className="font-black text-gray-900">Produk memiliki beberapa varian?</p><p className="text-xs text-gray-600 mt-1">Gunakan untuk Philips LED 6W, 10W, 12W, 15W. Setiap varian memiliki SKU, harga, stok, dan barcode internal sendiri; barcode kemasan boleh sama.</p></div></div><Button type="button" onClick={enableVariantMode} variant="secondary" className="shrink-0"><Layers3 size={17}/> Aktifkan Varian</Button></div>
        </Card>
        <Field label="Kategori"><div className="flex gap-2"><Select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{sortCategories(categories).map(category => <option key={category}>{category}</option>)}</Select>{onAddCategory && <Button type="button" variant="secondary" className="shrink-0" onClick={() => setCategoryQuickOpen(true)}><FolderPlus size={17}/> Baru</Button>}</div></Field>
        <Field label="Satuan Dasar" hint="Pilih satuan terkecil yang mengurangi stok. Kabel umumnya memakai meter."><Select value={form.baseUnit} onChange={event => changeBaseUnit(event.target.value)}>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</Select></Field>
        <Field label="SKU"><Input value={form.sku} onChange={event => setForm({ ...form, sku: event.target.value })} placeholder="Otomatis jika kosong"/></Field>
        <Field label="Barcode" hint="Klik Scan untuk kamera, atau fokuskan kolom lalu tembak dengan scanner USB/Bluetooth.">
          <div className="flex gap-2"><Input value={form.barcode} onChange={event => setForm({ ...form, barcode: event.target.value.trim() })} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} inputMode="numeric" placeholder="Scan tanpa mengetik nomor"/><Button type="button" variant="secondary" onClick={() => setBarcodeScannerOpen(true)} className="shrink-0"><ScanLine size={18}/> Scan</Button></div>
          {form.barcode && products.some(item => item.id !== form.id && item.active !== false && String(item.barcode || '') === String(form.barcode || '')) && <p className="text-xs font-bold text-red-600 mt-1">Barcode ini sudah dipakai barang lain.</p>}
        </Field>
        <Field label="Rak/Lokasi"><Input value={form.rack} onChange={event => setForm({ ...form, rack: event.target.value })}/></Field>
        <Field label={form.id ? 'Stok Saat Ini' : 'Stok Awal'} hint={form.id ? 'Gunakan tab Penyesuaian atau Pembelian untuk mengubah stok agar riwayat tetap tercatat.' : `Masukkan jumlah yang sudah ada dalam satuan ${form.baseUnit}.`}><Input type="number" inputMode="decimal" min="0" step={stockStep} value={form.id ? Number(form.stock || 0) : (form.stock || '')} disabled={Boolean(form.id)} onChange={event => setForm({ ...form, stock: event.target.value })} onBlur={() => setForm(previous => ({ ...previous, stock: normalizeQuantity(previous.stock, { allowFractional: stockStep < 1, step: stockStep, min: 0 }) }))} placeholder="0"/></Field>
        <Field label="Stok Minimum"><Input type="number" inputMode="decimal" min="0" step={stockStep} value={form.minStock || ''} onChange={event => setForm({ ...form, minStock: event.target.value })} onBlur={() => setForm(previous => ({ ...previous, minStock: normalizeQuantity(previous.minStock, { allowFractional: stockStep < 1, step: stockStep, min: 0 }) }))} placeholder="0"/></Field>

        <Card className="md:col-span-2 p-4 border-blue-200 bg-blue-50/50">
          <div className="flex items-start gap-3"><Ruler className="text-blue-700 shrink-0"/><div><p className="font-black text-gray-800">Penjualan Eceran / Pecahan</p><p className="text-xs text-gray-500 mt-1">Contoh kabel: satuan dasar meter, 1 roll = 50 meter, lalu kasir dapat menjual 2 atau 3,5 meter.</p></div></div>
          <label className="mt-4 flex gap-3 items-center p-3 rounded-xl bg-white border"><input type="checkbox" checked={form.allowFractional} disabled={form.serialTracking} onChange={event => toggleFractional(event.target.checked)}/><div><p className="font-bold text-sm">Boleh dijual eceran / potongan</p><p className="text-xs text-gray-500">Aktifkan untuk kabel per meter, pipa potongan, kilogram, liter, atau barang lain yang tidak selalu dijual utuh.</p></div></label>
          {form.allowFractional && <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={`Kelipatan penjualan (${form.baseUnit})`} hint={form.baseUnit === 'meter' ? 'Untuk kabel, pilih 0,5 meter agar kasir hanya dapat menjual 0,5; 1; 1,5; 2; 2,5; dan seterusnya.' : 'Pilih kelipatan yang benar-benar digunakan toko. Nilai aneh seperti 0,499 tidak diperbolehkan.'}>
              <Select value={String(form.quantityStep)} onChange={event => setForm({ ...form, quantityStep: Number(event.target.value) })}>
                {QUANTITY_STEP_PRESETS.map(step => <option key={step} value={step}>{quantityStepLabel(step, form.baseUnit)} ({formatQuantity(step)} {form.baseUnit}){step === recommendedQuantityStep(form.baseUnit, form.category) ? ' · Disarankan' : ''}</option>)}
              </Select>
            </Field>
            <div className="rounded-xl bg-white border p-3 text-sm"><p className="text-gray-500">Contoh checkout sesuai kelipatan</p><p className="font-black text-blue-800">3,5 {form.baseUnit} × {formatRp(form.prices?.retail)} = {formatRp(3.5 * Number(form.prices?.retail || 0))}</p><p className="text-xs text-gray-500 mt-1">Kasir akan otomatis membulatkan jumlah ke kelipatan {formatQuantity(form.quantityStep)} {form.baseUnit}.</p></div>
          </div>}
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
        <div className="md:col-span-2"><PackagingUnitsEditor baseUnit={form.baseUnit} basePrices={form.prices} rows={conversionRows} onChange={setConversionRows} onPreset={applyConversionPreset}/></div>

        <div className="md:col-span-2">
          <p className="field-label">Komponen Paket/Bundle</p>
          <div className="flex gap-2">
            <Select value={bundleId} onChange={event => setBundleId(event.target.value)}><option value="">Pilih barang komponen</option>{products.filter(item => item.id !== form.id && item.active !== false).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <Input type="number" className="w-24" min="1" value={bundleQty || ''} onChange={event => setBundleQty(Math.max(1, Number(event.target.value || 1)))}/>
            <Button type="button" onClick={() => { if (bundleId) setForm({ ...form, bundleItems: [...form.bundleItems, { productId: bundleId, qty: bundleQty }] }); }}>Tambah</Button>
          </div>
          {form.bundleItems.length > 0 && <div className="mt-2 space-y-2">{form.bundleItems.map((item, index) => { const component = products.find(row => row.id === item.productId); return <div key={`${item.productId}-${index}`} className="flex justify-between p-2 rounded-xl bg-gray-50"><span className="text-sm">{item.qty} × {component?.name || item.productId}</span><button type="button" onClick={() => setForm({ ...form, bundleItems: form.bundleItems.filter((_, itemIndex) => itemIndex !== index) })} className="text-red-600 font-bold">Hapus</button></div>; })}</div>}
        </div>

        <Card className="md:col-span-2 p-4 border-violet-200 bg-violet-50/40">
          <div className="flex items-start gap-3"><Barcode className="text-violet-700 shrink-0"/><div><p className="font-black text-gray-800">Serial Number & Garansi</p><p className="text-xs text-gray-500 mt-1">Aktifkan hanya untuk unit yang memang perlu dilacak satu per satu, seperti pompa, stabilizer, alat listrik, inverter, atau produk bergaransi.</p></div></div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <label className="min-h-[48px] flex gap-3 items-center p-3 rounded-xl bg-white border"><input type="checkbox" checked={Boolean(form.serialTracking)} onChange={event => setForm({ ...form, serialTracking: event.target.checked, allowFractional: event.target.checked ? false : form.allowFractional, quantityStep: event.target.checked ? 1 : form.quantityStep })}/><span className="font-bold text-sm">Lacak nomor serial per unit</span></label>
            <Field label="Garansi Default (bulan)" hint="Akan otomatis dipakai saat serial didaftarkan."><Input type="number" min="0" max="120" step="1" disabled={!form.serialTracking} value={form.warrantyMonths || ''} onChange={event => setForm({ ...form, warrantyMonths: Math.max(0, Number(event.target.value || 0)) })} placeholder="12"/></Field>
          </div>
        </Card>

        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.favorite} onChange={event => setForm({ ...form, favorite: event.target.checked })}/> Favorit</label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.available} onChange={event => setForm({ ...form, available: event.target.checked })}/> Tersedia di kasir</label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.trackStock} onChange={event => setForm({ ...form, trackStock: event.target.checked })}/> Lacak stok</label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })}/> Aktif</label>
        </div>
      </div>
      {categoryQuickOpen && onAddCategory && <Modal title="Kategori Baru" onClose={() => setCategoryQuickOpen(false)} size="sm" footer={<><Button variant="secondary" onClick={() => setCategoryQuickOpen(false)}>Batal</Button><Button onClick={addCategoryInline} disabled={newCategoryName.trim().length < 2}>Simpan Kategori</Button></>}><Field label="Nama Kategori"><Input value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCategoryInline(); } }} placeholder="Contoh: Kabel & Aksesori" autoFocus/></Field></Modal>}
      {barcodeScannerOpen && <BarcodeScannerModal title="Scan Barcode Barang Baru" onClose={() => setBarcodeScannerOpen(false)} onDetected={rawCode => {
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


function VariantGroupFormModal({
  form, setForm, categories, onAddCategory, units, products, variantRows, updateVariantRow, addVariantRow,
  removeVariantRow, regenerateVariantCodes, applyLedWattPreset, conversionRows, setConversionRows, applyConversionPreset,
  changeBaseUnit, toggleFractional, onClose, onSubmit, barcodeScannerOpen, setBarcodeScannerOpen,
  variantScannerIndex, setVariantScannerIndex, canReturnToStandard, onReturnToStandard
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [lifecycleProduct, setLifecycleProduct] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkLabelsOpen, setBulkLabelsOpen] = useState(false);
  const [sensitiveAction, setSensitiveAction] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const addCategory = () => {
    try {
      const result = onAddCategory?.(categoryName.trim());
      const savedName = result?.name || result || categoryName.trim();
      if (savedName) setForm(previous => ({ ...previous, category: savedName }));
      setCategoryName('');
      setCategoryOpen(false);
    } catch (error) { alert(error.message || 'Kategori gagal ditambahkan.'); }
  };
  const stockStep = normalizeQuantityStep(form.quantityStep, form.allowFractional, recommendedQuantityStep(form.baseUnit, form.category));
  const scanSharedBarcode = () => { setVariantScannerIndex(null); setBarcodeScannerOpen(true); };
  const scanVariantBarcode = index => { setVariantScannerIndex(index); setBarcodeScannerOpen(true); };
  const usedCodesOutsideGroup = products.filter(item => item.variantGroupId !== form.variantGroupId).flatMap(item => [item.sku, item.barcode, item.sharedBarcode]).filter(Boolean);
  return <Modal
    title={form.variantGroupId ? 'Produk Induk & Manajemen Varian' : 'Tambah Produk Induk & Varian'}
    onClose={onClose}
    size="full"
    footer={<>{canReturnToStandard && <Button variant="ghost" onClick={onReturnToStandard}>Kembali ke Barang Biasa</Button>}<Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={onSubmit}><Layers3 size={17}/> Simpan Produk & Varian</Button></>}
  >
    <div className="space-y-5">
      <Card className="p-4 border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50">
        <div className="flex gap-3"><Layers3 className="text-emerald-700 shrink-0"/><div><p className="font-black text-gray-900">Produk Induk + Varian Profesional</p><p className="text-sm text-gray-600 mt-1">Barcode kemasan pabrik boleh sama. Saat barcode bersama dipindai, kasir memilih 6W, 10W, 12W, atau 15W. SKU dan barcode internal tetap unik agar scan stiker internal langsung memilih varian yang benar.</p></div></div>
      </Card>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Nama Produk Induk" className="md:col-span-2"><Input value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} placeholder="Contoh: Philips LED" autoFocus/></Field>
          <Field label="Merek"><Input value={form.brand || ''} onChange={event => setForm(previous => ({ ...previous, brand: event.target.value }))} placeholder="Philips, Supreme, Broco"/></Field>
          <Field label="Spesifikasi Induk"><Input value={form.specifications || ''} onChange={event => setForm(previous => ({ ...previous, specifications: event.target.value }))} placeholder="Contoh: LED E27 · 6500K"/></Field>
          <Field label="Kategori"><div className="flex gap-2"><Select value={form.category} onChange={event => setForm(previous => ({ ...previous, category: event.target.value }))}>{sortCategories(categories).map(category => <option key={category}>{category}</option>)}</Select>{onAddCategory&&<Button type="button" variant="secondary" className="shrink-0" onClick={()=>setCategoryOpen(true)}><FolderPlus size={17}/> Baru</Button>}</div></Field>
          <Field label="Satuan Dasar"><Select value={form.baseUnit} onChange={event => changeBaseUnit(event.target.value)}>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</Select></Field>
          <Field label="Barcode Kemasan Bersama" hint="Barcode pabrik yang sama pada semua watt/ukuran. Boleh kosong bila setiap varian memiliki barcode berbeda." className="md:col-span-2">
            <div className="flex gap-2"><Input value={form.sharedBarcode || ''} onChange={event => setForm(previous => ({ ...previous, sharedBarcode: event.target.value.trim() }))} placeholder="Scan barcode kemasan Philips"/><Button type="button" variant="secondary" onClick={scanSharedBarcode}><ScanLine size={17}/> Scan</Button></div>
          </Field>
          <Field label="Kelompok Varian" hint="ID internal otomatis; tidak perlu diubah." className="md:col-span-2"><Input value={form.variantGroupId || ''} disabled placeholder="Dibuat otomatis saat disimpan"/></Field>
        </div>
      </Card>

      <Card className="p-4 border-violet-200 bg-violet-50/40">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-3 items-end">
          <label className="min-h-[48px] flex gap-3 items-center p-3 rounded-xl bg-white border"><input type="checkbox" checked={Boolean(form.serialTracking)} onChange={event => setForm(previous => ({ ...previous, serialTracking: event.target.checked, allowFractional: event.target.checked ? false : previous.allowFractional, quantityStep: event.target.checked ? 1 : previous.quantityStep }))}/><div><p className="font-bold text-sm">Lacak serial untuk semua varian</p><p className="text-xs text-gray-500">Serial tetap unik per unit/SKU.</p></div></label>
          <Field label="Garansi Default (bulan)"><Input type="number" min="0" max="120" step="1" disabled={!form.serialTracking} value={form.warrantyMonths || ''} onChange={event => setForm(previous => ({ ...previous, warrantyMonths: Math.max(0, Number(event.target.value || 0)) }))}/></Field>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h3 className="font-black text-lg text-gray-900">Daftar Varian</h3><p className="text-sm text-gray-500">Setiap baris adalah SKU nyata dengan stok, HPP, harga jual, dan rak masing-masing.</p></div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={applyLedWattPreset}><Layers3 size={17}/> Preset LED 6W–15W</Button><Button type="button" variant="secondary" onClick={regenerateVariantCodes}><WandSparkles size={17}/> Buat Ulang SKU Otomatis</Button><Button type="button" onClick={addVariantRow}><Plus size={17}/> Tambah Varian</Button></div>
      </div>

      <div className="space-y-4">
        {variantRows.map((row, index) => {
          const rowStep = stockStep;
          const skuConflict = row.sku && usedCodesOutsideGroup.some(code => String(code).toUpperCase() === String(row.sku).toUpperCase());
          const barcodeConflict = row.internalBarcode && usedCodesOutsideGroup.some(code => String(code).toUpperCase() === String(row.internalBarcode).toUpperCase());
          return <Card key={row.id || `new-${index}`} className="p-4 border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">{index + 1}</div><div><p className="font-black text-gray-900">{row.variantName || `Varian ${index + 1}`}</p><p className="text-xs text-gray-500">{row.existing ? 'Stok lama tetap aman; ubah lewat Pembelian/Penyesuaian.' : 'Varian baru dapat langsung diberi stok awal.'}</p></div></div><button type="button" onClick={() => removeVariantRow(index)} disabled={variantRows.length <= 2} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center disabled:opacity-30" title="Hapus varian"><Trash2 size={17}/></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <Field label="Nama Varian"><Input value={row.variantName} onChange={event => updateVariantRow(index, { variantName: event.target.value })} placeholder="6W / 10W / 12W / Warm White"/></Field>
              <Field label="SKU Otomatis" hint="Boleh diedit, tetapi harus unik."><div className="flex gap-2"><Input value={row.sku} onChange={event => updateVariantRow(index, { sku: event.target.value.toUpperCase() })} className={skuConflict ? 'border-red-400' : ''}/><Button type="button" variant="secondary" onClick={() => navigator.clipboard?.writeText(row.sku)} title="Salin SKU"><Copy size={16}/></Button></div>{skuConflict && <p className="text-xs text-red-600 font-bold mt-1">SKU sudah digunakan produk lain.</p>}</Field>
              <Field label="Barcode Internal / Stiker" hint="Default sama dengan SKU dan dapat dicetak sebagai Code 128."><div className="flex gap-2"><Input value={row.internalBarcode} onChange={event => updateVariantRow(index, { internalBarcode: event.target.value.toUpperCase() })} className={barcodeConflict ? 'border-red-400' : ''}/><Button type="button" variant="secondary" onClick={() => scanVariantBarcode(index)}><ScanLine size={16}/></Button></div>{barcodeConflict && <p className="text-xs text-red-600 font-bold mt-1">Barcode internal sudah digunakan.</p>}</Field>
              <Field label="Rak / Lokasi"><Input value={row.rack} onChange={event => updateVariantRow(index, { rack: event.target.value })}/></Field>
              <Field label={row.existing ? 'Stok Saat Ini' : 'Stok Awal'}><Input type="number" min="0" step={rowStep} disabled={row.existing} value={row.stock || ''} onChange={event => updateVariantRow(index, { stock: event.target.value })} onBlur={() => updateVariantRow(index, { stock: normalizeQuantity(row.stock, { allowFractional: rowStep < 1, step: rowStep, min: 0 }) })}/></Field>
              <Field label="Stok Minimum"><Input type="number" min="0" step={rowStep} value={row.minStock || ''} onChange={event => updateVariantRow(index, { minStock: event.target.value })} onBlur={() => updateVariantRow(index, { minStock: normalizeQuantity(row.minStock, { allowFractional: rowStep < 1, step: rowStep, min: 0 }) })}/></Field>
              <Field label={`Harga Modal / ${form.baseUnit}`}><MoneyInput value={row.modalPrice} onValueChange={value => {
                const currentMarkup = calculateMarkupPercent(row.modalPrice, row.prices.retail);
                updateVariantRow(index, { modalPrice: value, prices: { ...row.prices, retail: calculateMarkupPrice(value, currentMarkup) } });
              }}/></Field>
              <Field label="Markup Eceran (%)"><Input type="number" min="0" max="1000" step="0.1" value={calculateMarkupPercent(row.modalPrice, row.prices.retail) || ''} onChange={event => updateVariantRow(index, { prices: { ...row.prices, retail: calculateMarkupPrice(row.modalPrice, event.target.value) } })}/></Field>
              <Field label={`Harga Eceran / ${form.baseUnit}`}><MoneyInput value={row.prices.retail} onValueChange={value => updateVariantRow(index, { prices: { ...row.prices, retail: value } })}/></Field>
              <Field label={`Harga Grosir / ${form.baseUnit}`}><MoneyInput value={row.prices.wholesale} onValueChange={value => updateVariantRow(index, { prices: { ...row.prices, wholesale: value } })}/></Field>
              <Field label={`Harga Proyek / ${form.baseUnit}`}><MoneyInput value={row.prices.project} onValueChange={value => updateVariantRow(index, { prices: { ...row.prices, project: value } })}/></Field>
              <div className="md:col-span-2 flex flex-wrap gap-4 items-center rounded-xl border bg-gray-50 px-3 py-2"><label className="flex gap-2 items-center text-sm font-bold"><input type="checkbox" checked={row.available} onChange={event => updateVariantRow(index, { available: event.target.checked })}/> Tersedia di Kasir</label><label className="flex gap-2 items-center text-sm font-bold"><input type="checkbox" checked={row.favorite} onChange={event => updateVariantRow(index, { favorite: event.target.checked })}/> Favorit</label><label className="flex gap-2 items-center text-sm font-bold"><input type="checkbox" checked={row.active} onChange={event => updateVariantRow(index, { active: event.target.checked })}/> Aktif</label></div>
            </div>
          </Card>;
        })}
      </div>

      <Card className="p-4 border-blue-200 bg-blue-50/50">
        <div className="flex items-start gap-3"><Ruler className="text-blue-700 shrink-0"/><div><p className="font-black text-gray-800">Satuan, Eceran, dan Kemasan Berlaku untuk Semua Varian</p><p className="text-xs text-gray-500 mt-1">Contoh varian kabel ukuran berbeda dapat tetap memakai meter dan kelipatan 0,5 meter. Untuk lampu, gunakan pcs.</p></div></div>
        <label className="mt-4 flex gap-3 items-center p-3 rounded-xl bg-white border"><input type="checkbox" checked={form.allowFractional} disabled={form.serialTracking} onChange={event => toggleFractional(event.target.checked)}/><div><p className="font-bold text-sm">Boleh dijual eceran / pecahan</p><p className="text-xs text-gray-500">Aktifkan hanya bila seluruh varian memang dapat dijual pecahan.</p></div></label>
        {form.allowFractional && <Field label={`Kelipatan Penjualan (${form.baseUnit})`} className="mt-3"><Select value={String(form.quantityStep)} onChange={event => setForm(previous => ({ ...previous, quantityStep: Number(event.target.value) }))}>{QUANTITY_STEP_PRESETS.map(step => <option key={step} value={step}>{quantityStepLabel(step, form.baseUnit)} ({formatQuantity(step)} {form.baseUnit})</option>)}</Select></Field>}
        <div className="mt-3"><PackagingUnitsEditor baseUnit={form.baseUnit} basePrices={variantRows[0]?.prices || { retail: 0, wholesale: 0, project: 0 }} rows={conversionRows} onChange={setConversionRows} onPreset={applyConversionPreset} sharedAcrossVariants/></div>
      </Card>
    </div>
    {categoryOpen&&onAddCategory&&<Modal title="Kategori Baru" onClose={()=>setCategoryOpen(false)} size="sm" footer={<><Button variant="secondary" onClick={()=>setCategoryOpen(false)}>Batal</Button><Button onClick={addCategory} disabled={categoryName.trim().length<2}>Simpan Kategori</Button></>}><Field label="Nama Kategori"><Input value={categoryName} onChange={event=>setCategoryName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();addCategory();}}} placeholder="Contoh: Lampu & Penerangan" autoFocus/></Field></Modal>}
    {barcodeScannerOpen && <BarcodeScannerModal title="Scan Barcode Barang Baru" onClose={() => { setBarcodeScannerOpen(false); setVariantScannerIndex(null); }} onDetected={rawCode => {
      const code = String(rawCode || '').trim();
      if (!code) return 'Barcode belum terbaca.';
      if (variantScannerIndex == null) {
        const collision = codeCollision(products, { code, branchId: form.branchId, ignoreIds: variantRows.map(row => row.id).filter(Boolean), variantGroupId: form.variantGroupId, shared: true });
        if (collision) return `Barcode ${code} sudah dipakai oleh ${collision.name}.`;
        setForm(previous => ({ ...previous, sharedBarcode: code }));
      } else {
        const collision = codeCollision(products, { code, branchId: form.branchId, ignoreIds: variantRows.map(row => row.id).filter(Boolean), variantGroupId: form.variantGroupId });
        if (collision) return `Barcode ${code} sudah dipakai oleh ${collision.name}.`;
        updateVariantRow(variantScannerIndex, { internalBarcode: code });
      }
      setBarcodeScannerOpen(false); setVariantScannerIndex(null); return true;
    }}/>} 
  </Modal>;
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
  const step = normalizeQuantityStep(product?.quantityStep, product?.allowFractional === true, recommendedQuantityStep(product?.baseUnit, product?.category));
  const normalizedQty = normalizeSignedQuantity(qty, { allowFractional: step < 1, step });
  const save = () => onSave({ productId: product.id, qtyChange: normalizedQty, reason });
  return <Modal title="Penyesuaian Stok" onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={save} disabled={!product?.id || !normalizedQty}>Simpan Penyesuaian</Button></>}>
    <div className="space-y-3">
      <ProductPicker products={products} value={product?.id || ''} onChange={(id, selected) => { onSelect(selected || product); setQty(''); }} label="Barang"/>
      <Card className="p-3 bg-blue-50"><p className="text-xs text-blue-700">Stok sistem saat ini</p><p className="text-xl font-black text-blue-900">{formatQuantity(product?.stock)} {product?.baseUnit}</p></Card>
      <Field label={`Perubahan (${product?.baseUnit})`} hint={`Gunakan tanda + untuk menambah dan - untuk mengurangi. Jumlah dibulatkan ke ${quantityStepLabel(step, product?.baseUnit)}.`}><Input type="number" inputMode="decimal" step={step} value={qty} onChange={event => setQty(event.target.value)} onBlur={() => setQty(normalizedQty || '')} placeholder={step === 0.5 ? 'Contoh: 10 atau -1,5' : 'Contoh: 20 atau -2'} autoFocus/></Field>
      {qty !== '' && Number(qty) !== normalizedQty && <p className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-3">Jumlah akan disesuaikan menjadi {formatQuantity(normalizedQty)} {product?.baseUnit}.</p>}
      <Field label="Alasan"><Textarea value={reason} onChange={event => setReason(event.target.value)}/></Field>
    </div>
  </Modal>;
}

function OpnameModal({ products, onClose, onSave }) {
  const [counts, setCounts] = useState(products.map(product => ({
    productId: product.id,
    name: product.name,
    unit: product.baseUnit,
    barcode: product.barcode || product.sku || '',
    step: normalizeQuantityStep(product.quantityStep, product.allowFractional === true, recommendedQuantityStep(product.baseUnit, product.category)),
    system: Number(product.stock || 0),
    actual: Number(product.stock || 0),
    reason: ''
  })));
  const [notes, setNotes] = useState('Stok opname berkala');
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [scanNotice, setScanNotice] = useState('');
  const reasons = ['Salah hitung sebelumnya', 'Barang rusak', 'Barang hilang', 'Dipakai internal', 'Bonus pemasok', 'Salah input transaksi', 'Koreksi stok fisik', 'Lainnya'];
  const normalizeCount = (productId, value) => setCounts(previous => previous.map(row => row.productId === productId
    ? { ...row, actual: normalizeQuantity(value, { allowFractional: row.step < 1, step: row.step, min: 0 }) }
    : row));
  const visible = counts.filter(row => {
    const term = search.trim().toLowerCase();
    const difference = Number(row.actual || 0) - Number(row.system || 0);
    return (!onlyDifferences || Math.abs(difference) > 0.000001) && (!term || `${row.name} ${row.barcode}`.toLowerCase().includes(term));
  });
  const changed = counts.filter(row => Math.abs(Number(row.actual || 0) - Number(row.system || 0)) > 0.000001);
  const handleScan = code => {
    const result = findProductByCode(products, code);
    if (!result || result.ambiguous || !result.product) return `Barcode/SKU "${String(code || '').trim()}" tidak ditemukan atau ambigu.`;
    const target = counts.find(row => row.productId === result.product.id);
    if (!target) return 'Barang hasil scan tidak tersedia di daftar opname.';
    setSearch(target.name);
    setScanNotice(`${target.name} ditemukan. Masukkan jumlah fisik yang Anda hitung.`);
    return { ok: true, close: true, message: `${target.name} dipilih.` };
  };
  const submit = () => {
    const missingReason = changed.find(row => !String(row.reason || '').trim());
    if (missingReason) return alert(`Pilih alasan selisih untuk ${missingReason.name}.`);
    onSave({ counts, notes });
  };
  return <Modal title="Stok Opname Scanner" onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Selesaikan Opname ({changed.length} selisih)</Button></>}>
    <div className="space-y-3">
      <Card className="p-4 bg-blue-50 border-blue-100"><p className="font-black text-blue-900 flex items-center gap-2"><ScanLine size={18}/> Opname scanner-first</p><p className="text-xs text-blue-700 mt-1">Scan barang saat berkeliling toko, lalu masukkan stok fisik. Selisih tidak bisa disimpan tanpa alasan agar audit stok tetap jelas.</p></Card>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2"><SearchBox value={search} onChange={setSearch} placeholder="Cari nama, SKU, barcode..."/><Button variant="secondary" onClick={() => setScannerOpen(true)}><ScanLine size={18}/> Scan Barang</Button></div>
      {scanNotice && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl p-3">{scanNotice}</p>}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end"><Field label="Catatan Opname"><Input value={notes} onChange={event => setNotes(event.target.value)}/></Field><label className="min-h-[48px] px-3 rounded-xl bg-gray-50 border flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={onlyDifferences} onChange={e => setOnlyDifferences(e.target.checked)}/> Hanya yang selisih</label></div>
      <div className="space-y-2 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">{visible.map(item => {
        const difference = Number(item.actual || 0) - Number(item.system || 0);
        return <Card key={item.productId} className={`p-3 ${Math.abs(difference) > 0.000001 ? 'border-orange-200 bg-orange-50/30' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_140px_110px_220px] gap-2 items-center">
            <div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">Sistem {formatQuantity(item.system)} {item.unit} · {quantityStepLabel(item.step, item.unit)}</p></div>
            <Input type="number" inputMode="decimal" min="0" step={item.step} value={item.actual} onChange={event => setCounts(previous => previous.map(row => row.productId === item.productId ? { ...row, actual: event.target.value } : row))} onBlur={event => normalizeCount(item.productId, event.target.value)}/>
            <p className={`lg:text-right font-black ${difference === 0 ? 'text-gray-500' : difference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{difference > 0 ? '+' : ''}{formatQuantity(difference)}</p>
            {Math.abs(difference) > 0.000001 ? <Select value={item.reason} onChange={event => setCounts(previous => previous.map(row => row.productId === item.productId ? { ...row, reason: event.target.value } : row))}><option value="">Pilih alasan selisih...</option>{reasons.map(reason => <option key={reason}>{reason}</option>)}</Select> : <span className="text-xs text-gray-400">Stok sesuai</span>}
          </div>
        </Card>;
      })}{!visible.length && <EmptyState icon={ClipboardCheck} title="Tidak ada barang pada filter ini"/>}</div>
    </div>
    {scannerOpen && <BarcodeScannerModal title="Scan Barang untuk Opname" onClose={() => setScannerOpen(false)} onDetected={handleScan} helperText="Scan barcode/SKU. Setelah barang ditemukan, masukkan jumlah fisik yang benar."/>}
  </Modal>;
}

function SensitivePinModal({ title, userName, onClose, onConfirm }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (pin.length !== 4 || busy) return; setBusy(true); try { await onConfirm(pin); } finally { setBusy(false); } };
  return <Modal title={title} onClose={onClose} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit} disabled={pin.length !== 4 || busy}>{busy ? 'Memeriksa...' : 'Konfirmasi'}</Button></>}><Card className="p-4 bg-amber-50 border-amber-200"><p className="font-black text-amber-900">Tindakan sensitif</p><p className="text-xs text-amber-700 mt-1">Masukkan PIN 4 digit Owner/Store Manager sebelum perubahan stok permanen dilakukan. Aktivitas tetap dicatat pada audit log.</p></Card><Field label={`PIN persetujuan${userName ? ` · ${userName}` : ''}`} className="mt-4"><Input type="password" inputMode="numeric" maxLength="4" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={e => { if (e.key === 'Enter') void submit(); }} autoFocus/></Field></Modal>;
}

function TransferModal({ products, branches, activeBranchId, onClose, onSave }) {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const product = products.find(item => item.id === productId);
  const [destinationBranchId, setDestination] = useState(branches.find(branch => branch.id !== activeBranchId)?.id || '');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('Transfer stok');
  const step = normalizeQuantityStep(product?.quantityStep, product?.allowFractional === true, recommendedQuantityStep(product?.baseUnit, product?.category));
  const normalizedQty = normalizeQuantity(qty, { allowFractional: step < 1, step, min: step });
  const maxQty = Number(product?.stock || 0);
  const safeQty = Math.min(maxQty, normalizedQty);
  return <Modal title="Transfer Stok Antar-Cabang" onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave({ productId, destinationBranchId, qty: safeQty, notes })} disabled={!productId || !destinationBranchId || safeQty <= 0 || safeQty > maxQty}>Transfer</Button></>}>
    <div className="space-y-3">
      <ProductPicker products={products} value={productId} onChange={id => { setProductId(id); setQty(''); }} label="Barang"/>
      <Field label="Cabang Tujuan"><Select value={destinationBranchId} onChange={event => setDestination(event.target.value)}>{branches.filter(branch => branch.id !== activeBranchId).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field>
      <Field label={`Jumlah (${product?.baseUnit || 'unit'})`} hint={`${quantityStepLabel(step, product?.baseUnit || 'unit')}. Maksimal ${formatQuantity(maxQty)} ${product?.baseUnit || 'unit'}.`}><Input type="number" inputMode="decimal" min={step} max={maxQty || undefined} step={step} value={qty} onChange={event => setQty(event.target.value)} onBlur={() => setQty(safeQty || '')}/></Field>
      {normalizedQty > maxQty && <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">Jumlah melebihi stok tersedia.</p>}
      <Field label="Catatan"><Textarea value={notes} onChange={event => setNotes(event.target.value)}/></Field>
    </div>
  </Modal>;
}

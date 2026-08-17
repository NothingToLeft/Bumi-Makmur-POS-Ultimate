import React, { useMemo, useState } from 'react';
import { ChevronDown, Package, ScanLine, SearchX } from 'lucide-react';
import { Badge, Button, Modal, SearchBox, Select } from './ui.jsx';
import { formatQuantity } from '../utils/fractionalUnits.js';
import { productSearchText, sortCategories, sortProductsByName } from '../utils/productCatalog.js';
import { findProductByCode } from '../utils/barcode.js';
import BarcodeScannerModal from './BarcodeScannerModal.jsx';

export default function ProductPicker({
  products = [], value = '', onChange, label = 'Barang', placeholder = 'Pilih barang',
  includeInactive = false, showStock = true, className = ''
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanNotice, setScanNotice] = useState('');
  const sorted = useMemo(() => sortProductsByName(products.filter(product => includeInactive || product.active !== false)), [products, includeInactive]);
  const selected = sorted.find(product => product.id === value) || products.find(product => product.id === value);
  const categories = useMemo(() => sortCategories(sorted.map(product => product.category)), [sorted]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('id-ID');
    return sorted.filter(product => (category === 'all' || product.category === category) && (!term || productSearchText(product).includes(term)));
  }, [sorted, category, search]);

  const select = product => {
    onChange?.(product?.id || '', product || null);
    setOpen(false);
    setSearch('');
    setScanNotice('');
  };

  const handleScannedCode = code => {
    const result = findProductByCode(sorted, code);
    if (!result) return `Barcode/SKU \"${String(code || '').trim()}\" tidak ditemukan.`;
    if (result.ambiguous) {
      setCategory('all');
      setSearch(String(code || '').trim());
      const message = `Ditemukan ${result.matches?.length || 0} varian dengan barcode yang sama. Pilih varian yang benar dari daftar.`;
      setScanNotice(message);
      return { ok: true, close: true, message };
    }
    select(result.product);
    return { ok: true, close: true, message: `${result.product.name} dipilih.` };
  };

  return <>
    <label className={`block ${className}`}>
      {label && <span className="field-label">{label}</span>}
      <button type="button" onClick={() => setOpen(true)} className="field-input min-h-[52px] text-left flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className={`block font-bold truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>{selected?.name || placeholder}</span>
          {selected && <span className="block text-[11px] text-gray-500 truncate">{selected.category || 'Tanpa kategori'} · {selected.sku || 'Tanpa SKU'}{showStock ? ` · stok ${formatQuantity(selected.stock)} ${selected.baseUnit}` : ''}</span>}
        </span>
        <ChevronDown size={18} className="shrink-0 text-gray-400"/>
      </button>
    </label>
    {open && <Modal title="Pilih Barang" onClose={() => setOpen(false)} size="md" footer={<Button variant="secondary" onClick={() => setOpen(false)}>Tutup</Button>}>
      <div className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center"><SearchBox value={search} onChange={setSearch} placeholder="Cari nama, SKU, barcode, kategori, atau rak..." inputProps={{ autoFocus: true }}/><Button variant="secondary" onClick={() => setScannerOpen(true)} className="px-3 min-h-[48px]" title="Scan barcode untuk memilih barang"><ScanLine size={18}/><span className="hidden sm:inline">Scan</span></Button></div>
        {scanNotice && <p className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl p-3">{scanNotice}</p>}
        <Select value={category} onChange={event => setCategory(event.target.value)}>
          <option value="all">Semua kategori</option>
          {categories.map(item => <option key={item} value={item}>{item}</option>)}
        </Select>
        <div className="space-y-2 max-h-[58vh] overflow-y-auto custom-scrollbar pr-1">
          {filtered.map(product => <button type="button" key={product.id} onClick={() => select(product)} className={`w-full rounded-2xl border p-3 text-left flex items-center gap-3 transition ${product.id === value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
            <span className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Package size={20} className="text-gray-500"/></span>
            <span className="min-w-0 flex-1"><span className="font-black text-sm text-gray-900 block">{product.name}</span><span className="text-[11px] text-gray-500 block truncate">{product.category || 'Tanpa kategori'} · {product.sku || 'Tanpa SKU'} · Rak {product.rack || '-'}</span></span>
            {showStock && <Badge tone={Number(product.stock || 0) <= Number(product.minStock || 0) ? 'red' : 'blue'}>{formatQuantity(product.stock)} {product.baseUnit}</Badge>}
          </button>)}
          {!filtered.length && <div className="py-10 text-center text-gray-400"><SearchX className="mx-auto mb-2"/><p className="font-bold">Barang tidak ditemukan</p><p className="text-xs mt-1">Coba nama, SKU, barcode, kategori, atau rak lain.</p></div>}
        </div>
      </div>
    </Modal>}
    {scannerOpen && <BarcodeScannerModal title="Scan untuk Pilih Barang" onClose={() => setScannerOpen(false)} onDetected={handleScannedCode} helperText="Scan barcode atau SKU untuk langsung memilih barang. Jika barcode dipakai bersama oleh beberapa varian, daftar akan difilter agar Anda tinggal memilih variannya."/>}
  </>;
}

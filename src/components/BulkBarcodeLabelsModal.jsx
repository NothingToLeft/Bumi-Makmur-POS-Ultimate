import React, { useMemo, useState } from 'react';
import { Barcode, CheckSquare, Printer, Square } from 'lucide-react';
import { Button, Card, Field, Input, Modal, NumberInput, SearchBox, Select } from './ui.jsx';
import { barcodeSvgMarkup } from '../utils/barcodeLabel.js';
import { escapeHtml, formatRp, printHtmlDocument } from '../utils/helpers.js';
import { sortProductsByName } from '../utils/productCatalog.js';

export default function BulkBarcodeLabelsModal({ products = [], onClose }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [copies, setCopies] = useState(1);
  const [width, setWidth] = useState('58mm');
  const rows = useMemo(() => sortProductsByName(products).filter(product => {
    const term = search.trim().toLowerCase();
    return !term || `${product.name} ${product.sku} ${product.barcode} ${product.rack}`.toLowerCase().includes(term);
  }), [products, search]);
  const toggle = id => setSelected(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const selectVisible = () => setSelected(previous => new Set([...previous, ...rows.map(row => row.id)]));
  const print = () => {
    const chosen = products.filter(product => selected.has(product.id));
    if (!chosen.length) return;
    const labels = chosen.flatMap(product => Array.from({ length: Math.max(1, Number(copies) || 1) }, (_, index) => `<section class="label"><p class="name">${escapeHtml(product.name)}</p>${product.variantName ? `<p class="variant">${escapeHtml(product.variantName)}</p>` : ''}<p class="price">${escapeHtml(formatRp(product.prices?.retail || 0))}</p><div class="barcode">${barcodeSvgMarkup(product.barcode || product.sku, { width: 1.25, height: 44, fontSize: 9 })}</div><p class="meta">${escapeHtml(product.sku || '')} · Rak ${escapeHtml(product.rack || '-')}</p></section>`)).join('');
    printHtmlDocument('Label Barcode Massal', `<style>.labels{display:grid;grid-template-columns:1fr;gap:3mm}.label{break-inside:avoid;border:1px dashed #94a3b8;border-radius:8px;padding:3mm;text-align:center}.name{font-weight:900;font-size:11px;margin:0}.variant,.meta{font-size:8px;color:#475569;margin:2px 0}.price{font-size:14px;font-weight:900;margin:4px 0}.barcode{display:flex;justify-content:center;overflow:hidden}</style><div class="labels">${labels}</div>`, width);
  };
  return <Modal title="Cetak Label Barcode Massal" onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={print} disabled={!selected.size}><Printer size={18}/> Cetak {selected.size * Math.max(1, Number(copies) || 1)} Label</Button></>}>
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px_180px] gap-3"><SearchBox value={search} onChange={setSearch} placeholder="Cari nama, SKU, barcode, atau rak..."/><Field label="Salinan / barang"><NumberInput min="1" max="100" value={copies} allowEmpty={false} integer onValueChange={value => setCopies(value)}/></Field><Field label="Lebar media"><Select value={width} onChange={event => setWidth(event.target.value)}><option value="58mm">Thermal 58 mm</option><option value="80mm">Thermal 80 mm</option><option value="210mm">Kertas A4</option></Select></Field></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={selectVisible}><CheckSquare size={16}/> Pilih hasil pencarian</Button><Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}><Square size={16}/> Bersihkan pilihan</Button><span className="text-sm text-gray-500 self-center">{selected.size} barang dipilih</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto pr-1">{rows.map(product => <Card key={product.id} onClick={() => toggle(product.id)} className={`p-3 flex gap-3 items-center ${selected.has(product.id) ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''}`}><div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Barcode size={20}/></div><div className="min-w-0 flex-1"><p className="font-bold truncate">{product.name}</p><p className="text-xs text-gray-500 truncate">{product.sku} · Rak {product.rack || '-'}</p></div>{selected.has(product.id) ? <CheckSquare className="text-emerald-600"/> : <Square className="text-gray-300"/>}</Card>)}</div>
    </div>
  </Modal>;
}

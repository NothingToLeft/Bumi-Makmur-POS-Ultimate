import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Camera, CheckCircle2, ImagePlus, Loader2, PackageSearch, Sparkles, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, Field, Input, Modal, MoneyInput, NumberInput, Select } from './ui.jsx';
import { analyzeProductPhoto, findBestProductMatch, getAiDeviceSettings } from '../services/aiProductAssistant.js';
import { formatRp } from '../utils/helpers.js';

const emptyResult = {
  productName: '', brand: '', model: '', category: '', variantName: '', specifications: '', size: '', color: '', material: '',
  packUnit: '', packQty: 0, baseUnit: 'pcs', barcode: '', suggestedVariantMode: false, confidence: 0, warnings: [], source: 'manual'
};

export default function AIProductCaptureModal({ mode = 'create', products = [], categories = [], onClose, onApply }) {
  const fileRef = useRef(null);
  const previewBlobRef = useRef('');
  const analysisRequestRef = useRef(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState(emptyResult);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [aiError, setAiError] = useState('');
  const [packCost, setPackCost] = useState('');
  const [retailPack, setRetailPack] = useState('');
  const [retailUnit, setRetailUnit] = useState('');
  const [initialPacks, setInitialPacks] = useState(0);
  const [rack, setRack] = useState('-');
  const [receiveQty, setReceiveQty] = useState(1);
  const [receivePrice, setReceivePrice] = useState('');
  const [productId, setProductId] = useState('');

  useEffect(() => () => { if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current); }, []);

  const settings = useMemo(getAiDeviceSettings, []);
  const match = useMemo(() => findBestProductMatch(result, products), [result, products]);
  const activeProducts = useMemo(() => products.filter(item => item.active !== false && item.productType !== 'parent'), [products]);
  const selectedProduct = activeProducts.find(item => item.id === (productId || match?.product?.id));
  const packQty = Math.max(0, Number(result.packQty || 0));
  const baseModal = packQty > 0 && Number(packCost) > 0 ? Number(packCost) / packQty : 0;

  const update = patch => setResult(previous => ({ ...previous, ...patch }));

  const analyze = async nextFile => {
    const target = nextFile || file;
    if (!target) return;
    const requestId = ++analysisRequestRef.current;
    setStatus('analyzing'); setError(''); setNotice('Membaca barcode, teks kemasan, dan struktur produk...'); setAiError('');
    try {
      const response = await analyzeProductPhoto(target, { categories, settings: getAiDeviceSettings() });
      if (requestId !== analysisRequestRef.current) return;
      if (previewBlobRef.current) { URL.revokeObjectURL(previewBlobRef.current); previewBlobRef.current = ''; }
      setPreview(response.optimized?.dataUrl || '');
      setResult({ ...emptyResult, ...response.result });
      setAiError(response.aiError || '');
      const found = findBestProductMatch(response.result, products);
      setProductId(found?.product?.id || '');
      if (!found?.product && mode === 'receive') setReceivePrice('');
      const suggestedUnit = response.result.packUnit || response.result.baseUnit || 'pcs';
      if (mode === 'receive' && found?.product) {
        const conversion = (found.product.conversions || []).find(row => String(row.unit).toLowerCase() === String(suggestedUnit).toLowerCase()) ||
          (Number(response.result.packQty || 0) > 1 ? (found.product.conversions || []).find(row => Number(row.factor) === Number(response.result.packQty || 0)) : null);
        if (conversion) setReceivePrice(Number(found.product.modalPrice || 0) * Number(conversion.factor || 1));
        else setReceivePrice(Number(found.product.modalPrice || 0));
      }
      setStatus('ready');
      setNotice(response.result.source === 'gemini+vision' ? 'Foto dianalisis dengan Gemini + scanner/OCR lokal. Periksa hasil sebelum digunakan.' : 'Hasil dibuat dari barcode/OCR lokal. Periksa data yang belum terbaca.');
    } catch (analysisError) {
      if (requestId !== analysisRequestRef.current) return;
      setStatus('error'); setError(analysisError?.message || 'Foto produk gagal dianalisis.'); setNotice('');
    }
  };

  const chooseFile = nextFile => {
    if (!nextFile) return;
    setFile(nextFile);
    if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    const url = URL.createObjectURL(nextFile);
    previewBlobRef.current = url;
    setPreview(url);
    void analyze(nextFile);
  };

  const apply = () => {
    if (!String(result.productName || '').trim()) return setError('Nama produk belum terbaca. Isi atau perbaiki Nama Produk terlebih dahulu.');
    if (mode === 'receive') {
      if (!selectedProduct) return setError('Produk belum cocok dengan katalog. Pilih produk yang benar atau buat sebagai produk baru dari menu Produk & Stok.');
      const suggestedConversion = (selectedProduct.conversions || []).find(row => Number(row.factor) === Number(result.packQty || 0));
      const unit = suggestedConversion?.unit || ((result.packUnit && (selectedProduct.conversions || []).some(row => row.unit === result.packUnit)) ? result.packUnit : selectedProduct.baseUnit);
      onApply?.({ analysis: result, product: selectedProduct, unit, qty: Math.max(0.0001, Number(receiveQty || 1)), purchasePrice: Math.max(0, Number(receivePrice || 0)) });
      return;
    }
    onApply?.({
      analysis: result,
      packCost: Math.max(0, Number(packCost || 0)),
      retailPack: Math.max(0, Number(retailPack || 0)),
      retailUnit: Math.max(0, Number(retailUnit || 0)),
      initialPacks: Math.max(0, Number(initialPacks || 0)),
      rack: String(rack || '-').trim() || '-'
    });
  };

  const confidenceTone = result.confidence >= 0.8 ? 'green' : result.confidence >= 0.55 ? 'orange' : 'gray';
  const title = mode === 'receive' ? 'Smart Receiving · Foto Barang' : 'AI Foto Produk · Isi Otomatis';
  return <Modal title={title} onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={apply} disabled={status === 'analyzing' || !result.productName}>{mode === 'receive' ? 'Pakai untuk Barang Masuk' : 'Isi Form Produk'}</Button></>}>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(300px,.85fr)_minmax(0,1.4fr)] gap-5">
      <div className="space-y-4">
        <Card className="p-4 bg-gradient-to-br from-violet-50 to-blue-50 border-violet-100">
          <div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center"><Bot/></div><div><p className="font-black text-gray-900">Bumi Makmur AI Product Assistant</p><p className="text-xs text-gray-600 mt-1">Foto produk dibaca oleh scanner barcode, OCR lokal Android, lalu Gemini bila API key tersedia. Harga dan stok tidak pernah ditebak AI.</p></div></div>
        </Card>
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full min-h-[280px] rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden relative flex items-center justify-center">
          {preview ? <img src={preview} alt="Preview produk" className="absolute inset-0 w-full h-full object-contain bg-white"/> : <div className="text-center p-6"><ImagePlus size={46} className="mx-auto text-violet-600"/><p className="font-black mt-3">Foto label / kemasan produk</p><p className="text-xs text-gray-500 mt-1">Usahakan tulisan merek, ukuran, QTY/isi, dan barcode terlihat jelas.</p></div>}
          {status === 'analyzing' && <div className="absolute inset-0 bg-black/55 text-white flex flex-col items-center justify-center"><Loader2 size={36} className="animate-spin"/><p className="font-black mt-3">Menganalisis produk...</p></div>}
        </button>
        <input ref={fileRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={event => chooseFile(event.target.files?.[0])}/>
        <div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => fileRef.current?.click()}><Camera size={17}/> Ambil / Pilih Foto</Button><Button variant="secondary" onClick={() => void analyze()} disabled={!file || status === 'analyzing'}><Sparkles size={17}/> Analisis Ulang</Button></div>
        <div className="flex flex-wrap gap-2"><Badge tone={confidenceTone}>Keyakinan {Math.round(Number(result.confidence || 0) * 100)}%</Badge><Badge tone={result.source === 'gemini+vision' ? 'blue' : 'gray'}>{result.source === 'gemini+vision' ? 'Gemini Vision' : result.source === 'local-ocr' ? 'OCR Lokal' : 'Scanner Lokal'}</Badge>{settings.apiKey ? <Badge tone="green">Gemini siap</Badge> : <Badge tone="orange">Gemini key belum diatur</Badge>}</div>
        {notice && <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{notice}</p>}
        {aiError && <p className="text-xs font-bold text-orange-800 bg-orange-50 border border-orange-100 rounded-xl p-3">AI fallback: {aiError}</p>}
        {error && <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
      </div>

      <div className="space-y-4">
        <Card className="p-4"><div className="flex items-center justify-between gap-3 mb-4"><div><p className="font-black">Hasil Pembacaan Produk</p><p className="text-xs text-gray-500">Semua kolom masih dapat diperbaiki sebelum masuk ke form utama.</p></div><CheckCircle2 className="text-emerald-600"/></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nama Produk"><Input value={result.productName} onChange={event => update({ productName: event.target.value })}/></Field>
            <Field label="Merek"><Input value={result.brand} onChange={event => update({ brand: event.target.value })}/></Field>
            <Field label="Model / Kode"><Input value={result.model} onChange={event => update({ model: event.target.value })}/></Field>
            <Field label="Kategori"><Select value={result.category || categories[0] || ''} onChange={event => update({ category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</Select></Field>
            <Field label="Varian / Ukuran"><Input value={result.variantName} onChange={event => update({ variantName: event.target.value, suggestedVariantMode: Boolean(event.target.value.trim()) })}/></Field>
            <Field label="Barcode"><Input value={result.barcode} onChange={event => update({ barcode: event.target.value.replace(/\s/g, '') })}/></Field>
            <Field label="Spesifikasi" className="md:col-span-2"><Input value={result.specifications} onChange={event => update({ specifications: event.target.value })}/></Field>
            <Field label="Satuan Dasar"><Select value={result.baseUnit || 'pcs'} onChange={event => update({ baseUnit: event.target.value })}><option value="pcs">pcs</option><option value="unit">unit</option><option value="meter">meter</option><option value="batang">batang</option><option value="set">set</option><option value="roll">roll</option><option value="kg">kg</option><option value="liter">liter</option></Select></Field>
            <Field label="Isi Kemasan"><div className="grid grid-cols-[1fr_120px] gap-2"><Input value={result.packUnit || ''} onChange={event => update({ packUnit: event.target.value.toLowerCase() })} placeholder="pack / box / dus"/><NumberInput min="0" step="1" value={result.packQty || ''} onValueChange={value => update({ packQty: value === '' ? 0 : Number(value) })} placeholder="100"/></div></Field>
          </div>
        </Card>

        {mode === 'create' && match?.product && <Card className="p-4 border-orange-200 bg-orange-50"><div className="flex gap-3"><TriangleAlert className="text-orange-600 shrink-0"/><div><p className="font-black text-orange-950">Kemungkinan produk sudah ada</p><p className="text-xs text-orange-800 mt-1">{match.reason === 'barcode' ? 'Barcode ini sudah terdaftar' : `Kemiripan katalog ${Math.round(match.score * 100)}%`} pada <b>{match.product.name}</b>{match.product.variantName ? ` · ${match.product.variantName}` : ''}. Jika ini stok baru dari barang yang sama, gunakan Pembelian → Terima Langsung → Foto Barang Masuk agar katalog tidak duplikat.</p></div></div></Card>}

        {mode === 'create' ? <Card className="p-4 border-emerald-200 bg-emerald-50/50"><p className="font-black text-emerald-950">Harga & Stok — tetap kamu yang menentukan</p><p className="text-xs text-emerald-800 mt-1">Contoh Cable Ties: AI membaca 100 pcs/pack. Kamu cukup isi modal pack, harga jual pack/pcs, dan jumlah pack yang ada.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Field label={`Harga Modal / ${result.packUnit || 'kemasan'}`}><MoneyInput value={packCost} onValueChange={setPackCost}/>{baseModal > 0 && <p className="text-xs text-gray-500 mt-1">HPP otomatis {formatRp(baseModal)} / {result.baseUnit || 'pcs'}</p>}</Field>
          <Field label={`Harga Jual / ${result.packUnit || 'kemasan'}`}><MoneyInput value={retailPack} onValueChange={setRetailPack}/></Field>
          <Field label={`Harga Jual / ${result.baseUnit || 'pcs'}`}><MoneyInput value={retailUnit} onValueChange={setRetailUnit}/></Field>
          <Field label={`Stok Awal (${result.packUnit || 'kemasan'})`}><NumberInput min="0" step="1" value={initialPacks} onValueChange={setInitialPacks}/>{packQty > 0 && <p className="text-xs text-gray-500 mt-1">= {Number(initialPacks || 0) * packQty} {result.baseUnit || 'pcs'} stok dasar</p>}</Field>
          <Field label="Rak / Lokasi" className="sm:col-span-2"><Input value={rack} onChange={event => setRack(event.target.value)}/></Field>
        </div></Card> : <Card className="p-4 border-blue-200 bg-blue-50/60"><div className="flex gap-3"><PackageSearch className="text-blue-700 shrink-0"/><div><p className="font-black text-blue-950">Cocokkan ke katalog</p><p className="text-xs text-blue-700">Barcode exact diprioritaskan. Jika barcode belum ada, sistem memakai kemiripan nama, merek, model, dan varian.</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <Field label="Produk yang akan ditambah stoknya" className="md:col-span-2"><Select value={productId || match?.product?.id || ''} onChange={event => setProductId(event.target.value)}><option value="">Pilih produk</option>{activeProducts.map(product => <option key={product.id} value={product.id}>{product.name}{product.variantName ? ` · ${product.variantName}` : ''}</option>)}</Select>{match?.product && <p className="text-xs font-bold text-emerald-700 mt-1">Saran: {match.product.name} · cocok {Math.round(match.score * 100)}% ({match.reason}).</p>}</Field>
          <Field label={`Jumlah Masuk (${result.packUnit || selectedProduct?.baseUnit || 'unit'})`}><NumberInput min="0.0001" step="1" value={receiveQty} onValueChange={setReceiveQty}/></Field>
          <Field label={`Harga Beli / ${result.packUnit || selectedProduct?.baseUnit || 'unit'}`}><MoneyInput value={receivePrice} onValueChange={setReceivePrice}/></Field>
        </div></Card>}

        {(result.warnings || []).length > 0 && <Card className="p-4 border-orange-200 bg-orange-50"><div className="flex gap-2"><TriangleAlert className="text-orange-600 shrink-0"/><div><p className="font-black text-orange-900">Perlu diperiksa</p>{result.warnings.map((warning, index) => <p key={`${warning}-${index}`} className="text-xs text-orange-800 mt-1">• {warning}</p>)}</div></div></Card>}
      </div>
    </div>
  </Modal>;
}

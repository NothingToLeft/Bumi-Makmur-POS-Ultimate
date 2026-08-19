import React, { useMemo, useState } from 'react';
import { ClipboardList, History, PackageCheck, Plus, ReceiptText, Trash2, Truck, Undo2, WandSparkles } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { escapeHtml, formatRp, generateId, localDateKey, printHtmlDocument } from '../utils/helpers.js';
import {
  baseUnitCost, conversionFactor, formatQuantity, normalizeQuantity, normalizeQuantityStep,
  priceForUnit, quantityStepLabel, toBaseQuantity
} from '../utils/fractionalUnits.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, MoneyInput, NumberInput, PageHeader, SearchBox, Select, StatusBadge, Textarea } from '../components/ui.jsx';
import ProductPicker from '../components/ProductPicker.jsx';
import AIProductCaptureModal from '../components/AIProductCaptureModal.jsx';

const PO_STATUSES = ['DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'];

export default function PurchasesScreen() {
  const { db, scoped, hasPermission, savePurchaseOrder, receivePurchaseOrder, savePurchase, returnPurchase } = usePos();
  const [tab, setTab] = useState('po');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Semua');
  const [poOpen, setPoOpen] = useState(false);
  const [editingPo, setEditingPo] = useState(null);
  const [directOpen, setDirectOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const canManage = hasPermission('purchases.manage');
  const poRows = useMemo(() => (scoped.purchaseOrders || []).filter(row =>
    (status === 'Semua' || row.status === status) && (!search || `${row.orderNo} ${row.supplierName}`.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [scoped.purchaseOrders, search, status]);
  const purchaseRows = useMemo(() => (scoped.purchases || []).filter(row => !search || `${row.invoiceNo} ${row.supplierName}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [scoped.purchases, search]);

  return <div className="h-full flex flex-col bg-gray-50 generic-bg">
    <PageHeader title="Purchase Order, Pembelian & Restok" subtitle="PO terpisah, penerimaan sebagian, histori harga pemasok, dan konversi roll/box/dus ke stok dasar" actions={canManage && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setPoOpen(true)}><ClipboardList size={18}/> Buat PO</Button><Button onClick={() => setDirectOpen(true)}><PackageCheck size={18}/> Terima Langsung</Button></div>}/>
    <div className="bg-white border-b px-4 md:px-6 flex gap-1 overflow-x-auto no-scrollbar card-element">
      <TabButton active={tab === 'po'} onClick={() => setTab('po')} icon={ClipboardList}>Purchase Order</TabButton>
      <TabButton active={tab === 'receipts'} onClick={() => setTab('receipts')} icon={ReceiptText}>Penerimaan & Faktur</TabButton>
      <TabButton active={tab === 'prices'} onClick={() => setTab('prices')} icon={History}>Riwayat Harga Pemasok</TabButton>
    </div>
    <div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
        <Metric label="PO Draft" value={(scoped.purchaseOrders || []).filter(row => row.status === 'DRAFT').length}/>
        <Metric label="Menunggu" value={(scoped.purchaseOrders || []).filter(row => row.status === 'ORDERED').length} tone="blue"/>
        <Metric label="Diterima Sebagian" value={(scoped.purchaseOrders || []).filter(row => row.status === 'PARTIAL').length} tone="orange"/>
        <Metric label="Penerimaan Selesai" value={(scoped.purchases || []).filter(row => row.status === 'RECEIVED').length} tone="green"/>
        <Metric label="Nilai Pembelian" value={formatRp((scoped.purchases || []).filter(row => row.status === 'RECEIVED').reduce((sum, row) => sum + Number(row.total || 0), 0))} tone="green" compact/>
      </div>
      <div className="flex flex-col lg:flex-row gap-3 mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Cari nomor PO, faktur, atau pemasok..."/>{tab === 'po' && <div className="flex gap-2 overflow-x-auto no-scrollbar">{['Semua', ...PO_STATUSES].map(item => <button key={item} onClick={() => setStatus(item)} className={`px-3 min-h-[48px] rounded-xl border text-xs font-bold whitespace-nowrap ${status === item ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200'}`}>{item}</button>)}</div>}</div>
      {tab === 'po' && <PurchaseOrdersList rows={poRows} onOpen={setSelectedPo}/>} 
      {tab === 'receipts' && <PurchasesList rows={purchaseRows} onOpen={setSelectedPurchase}/>} 
      {tab === 'prices' && <SupplierPriceHistory rows={scoped.supplierPriceHistory || []} search={search}/>} 
    </div>
    {poOpen && <PurchaseOrderForm products={scoped.products} suppliers={scoped.suppliers} onClose={() => setPoOpen(false)} onSave={data => { try { savePurchaseOrder(data); setPoOpen(false); } catch (error) { alert(error.message); } }}/>} 
    {editingPo && <PurchaseOrderForm value={editingPo} products={scoped.products} suppliers={scoped.suppliers} onClose={() => setEditingPo(null)} onSave={data => { try { savePurchaseOrder(data); setEditingPo(null); setSelectedPo(null); } catch (error) { alert(error.message); } }}/>} 
    {directOpen && <DirectPurchaseForm products={scoped.products} suppliers={scoped.suppliers} categories={db.categories || []} onClose={() => setDirectOpen(false)} onSave={data => { try { savePurchase({ ...data, status: 'RECEIVED' }); setDirectOpen(false); } catch (error) { alert(error.message); } }}/>} 
    {selectedPo && <PurchaseOrderDetail order={selectedPo} configs={db.configs} onClose={() => setSelectedPo(null)} onEdit={order => setEditingPo(order)} onSaveOrder={payload => { try { savePurchaseOrder(payload); setSelectedPo(null); } catch (error) { alert(error.message); } }} onReceive={payload => { try { receivePurchaseOrder(payload); setSelectedPo(null); } catch (error) { alert(error.message); } }}/>} 
    {selectedPurchase && <PurchaseDetail purchase={selectedPurchase} serialNumbers={scoped.serialNumbers || []} configs={db.configs} onClose={() => setSelectedPurchase(null)} onReturn={data => { try { returnPurchase(data); setSelectedPurchase(null); } catch (error) { alert(error.message); } }}/>} 
  </div>;
}

function TabButton({ active, onClick, icon: Icon, children }) { return <button onClick={onClick} className={`px-4 min-h-[52px] font-bold text-sm whitespace-nowrap border-b-2 flex items-center gap-2 ${active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><Icon size={17}/>{children}</button>; }
function Metric({ label, value, tone = 'gray', compact = false }) { const tones = { gray: 'text-gray-900', blue: 'text-blue-700', orange: 'text-orange-700', green: 'text-emerald-700' }; return <Card className="p-3"><p className="text-xs text-gray-500">{label}</p><p className={`${compact ? 'text-lg' : 'text-2xl'} font-black ${tones[tone]}`}>{value}</p></Card>; }

function PurchaseOrdersList({ rows, onOpen }) {
  if (!rows.length) return <EmptyState icon={ClipboardList} title="Belum ada Purchase Order" subtitle="Buat PO untuk memantau barang yang dipesan, diterima sebagian, dan sisa yang belum dikirim pemasok."/>;
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(order => { const progress = order.items?.length ? order.items.reduce((sum, item) => sum + Math.min(1, Number(item.receivedQty || 0) / Math.max(0.0001, Number(item.qty || 0))), 0) / order.items.length : 0; return <Card key={order.id} className="p-4 cursor-pointer" onClick={() => onOpen(order)}><div className="flex justify-between gap-3"><div><p className="font-black text-sm">{order.orderNo || order.id}</p><p className="text-xs text-gray-500">{order.supplierName} · {new Date(order.createdAt).toLocaleDateString('id-ID')}</p></div><StatusBadge status={order.status}/></div><div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.round(progress * 100)}%` }}/></div><div className="mt-2 flex justify-between text-xs"><span>{Math.round(progress * 100)}% diterima</span><b>{formatRp(order.total)}</b></div>{order.expectedDate && <p className="text-xs text-orange-700 mt-2">Estimasi {order.expectedDate}</p>}</Card>; })}</div>;
}

function PurchasesList({ rows, onOpen }) {
  if (!rows.length) return <EmptyState icon={Truck} title="Belum ada penerimaan barang"/>;
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(purchase => <Card key={purchase.id} className="p-4 cursor-pointer" onClick={() => onOpen(purchase)}><div className="flex justify-between gap-3"><div><p className="font-bold text-sm">{purchase.invoiceNo || purchase.id}</p><p className="text-xs text-gray-500">{purchase.supplierName || 'Pemasok'} · {new Date(purchase.createdAt).toLocaleDateString('id-ID')}</p>{purchase.purchaseOrderId && <p className="text-[11px] text-blue-600 mt-1">Dari Purchase Order</p>}</div><StatusBadge status={purchase.status}/></div><div className="mt-3 flex justify-between items-end border-t border-dashed pt-3"><div><p className="text-xs text-gray-500">{purchase.items?.length || 0} jenis barang</p>{purchase.dueDate && <p className="text-xs text-orange-600">Jatuh tempo {purchase.dueDate}</p>}</div><p className="font-black text-emerald-600">{formatRp(purchase.total)}</p></div></Card>)}</div>;
}

function SupplierPriceHistory({ rows, search }) {
  const filtered = rows.filter(row => !search || `${row.productName} ${row.supplierName}`.toLowerCase().includes(search.toLowerCase())).slice(0, 300);
  if (!filtered.length) return <EmptyState icon={History} title="Belum ada riwayat harga pemasok" subtitle="Riwayat otomatis terbentuk saat barang diterima."/>;
  return <div className="space-y-2">{filtered.map(row => <Card key={row.id} className="p-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px_150px] gap-2 items-center"><div><p className="font-bold text-sm">{row.productName}</p><p className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleString('id-ID')} · {row.unit}</p></div><p className="text-sm font-bold">{row.supplierName || 'Pemasok'}</p><div className="sm:text-right"><p className="font-black text-emerald-700">{formatRp(row.unitPrice)} / {row.unit}</p><p className="text-[11px] text-gray-500">Modal dasar {formatRp(row.unitCost)}</p></div></Card>)}</div>;
}

function availableUnits(product) { return [{ unit: product.baseUnit, factor: 1 }, ...(product.conversions || []).filter(item => item.unit && Number(item.factor) > 0)]; }
function quantityStepFor(product, unit) { return unit === product?.baseUnit ? normalizeQuantityStep(product?.quantityStep, product?.allowFractional) : 1; }

function PurchaseLinesEditor({ products, items, setItems, captureSerials = false }) {
  const activeProducts = products.filter(product => product.active !== false);
  const [productId, setProductId] = useState(activeProducts[0]?.id || '');
  const selectedProduct = activeProducts.find(product => product.id === productId);
  const defaultUnit = selectedProduct?.allowFractional && selectedProduct?.conversions?.[0]?.unit
    ? selectedProduct.conversions[0].unit
    : selectedProduct?.baseUnit || 'pcs';
  const [unit, setUnit] = useState(defaultUnit);
  const [qty, setQty] = useState(1);
  const factor = selectedProduct ? conversionFactor(selectedProduct, unit) : 1;
  const step = quantityStepFor(selectedProduct, unit);
  const [unitPrice, setUnitPrice] = useState(selectedProduct ? priceForUnit(selectedProduct.modalPrice, factor) : 0);

  const chooseProduct = id => {
    const product = activeProducts.find(item => item.id === id);
    const nextUnit = product?.allowFractional && product?.conversions?.[0]?.unit
      ? product.conversions[0].unit
      : product?.baseUnit || 'pcs';
    const nextFactor = product ? conversionFactor(product, nextUnit) : 1;
    setProductId(id);
    setUnit(nextUnit);
    setQty(quantityStepFor(product, nextUnit));
    setUnitPrice(product ? priceForUnit(product.modalPrice, nextFactor) : 0);
  };

  const chooseUnit = nextUnit => {
    if (!selectedProduct) return;
    const oldFactor = conversionFactor(selectedProduct, unit);
    const nextFactor = conversionFactor(selectedProduct, nextUnit);
    const effectiveBaseCost = baseUnitCost(unitPrice, oldFactor);
    setUnit(nextUnit);
    setQty(quantityStepFor(selectedProduct, nextUnit));
    setUnitPrice(priceForUnit(effectiveBaseCost, nextFactor));
  };

  const changeItemUnit = (index, nextUnit) => {
    setItems(previous => previous.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const product = activeProducts.find(item => item.id === row.productId);
      if (!product) return row;
      const oldFactor = Number(row.factor || conversionFactor(product, row.unit));
      const nextFactor = conversionFactor(product, nextUnit);
      const effectiveBaseCost = baseUnitCost(row.price, oldFactor);
      const nextStep = quantityStepFor(product, nextUnit);
      return {
        ...row,
        unit: nextUnit,
        factor: nextFactor,
        quantityStep: nextStep,
        allowFractional: nextStep < 1,
        price: priceForUnit(effectiveBaseCost, nextFactor),
        baseUnitCost: effectiveBaseCost,
        baseQty: toBaseQuantity(product, row.qty, nextUnit)
      };
    }));
  };

  const changeItemQty = (index, rawQty) => {
    setItems(previous => previous.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const product = activeProducts.find(item => item.id === row.productId);
      const safeStep = Number(row.quantityStep || 1);
      const amount = normalizeQuantity(rawQty, { allowFractional: safeStep < 1, step: safeStep, min: safeStep });
      return { ...row, qty: amount, baseQty: product ? toBaseQuantity(product, amount, row.unit) : amount * Number(row.factor || 1) };
    }));
  };

  const add = () => {
    if (!selectedProduct) return;
    const safeStep = quantityStepFor(selectedProduct, unit);
    const amount = normalizeQuantity(qty, { allowFractional: safeStep < 1, step: safeStep, min: safeStep });
    const itemFactor = conversionFactor(selectedProduct, unit);
    const price = Math.max(0, Number(unitPrice) || 0);
    setItems(previous => [...previous, {
      id: generateId('PITEM'),
      productId: selectedProduct.id,
      name: selectedProduct.name,
      qty: amount,
      unit,
      factor: itemFactor,
      baseQty: toBaseQuantity(selectedProduct, amount, unit),
      baseUnit: selectedProduct.baseUnit,
      quantityStep: safeStep,
      allowFractional: safeStep < 1,
      price,
      baseUnitCost: baseUnitCost(price, itemFactor),
      discount: 0,
      receivedQty: 0,
      receivedBaseQty: 0,
      serialTracking: selectedProduct.serialTracking === true,
      warrantyMonths: Number(selectedProduct.warrantyMonths || 0),
      serials: ''
    }]);
  };

  return <Card className="p-4 min-w-0">
    <p className="font-black mb-3">Daftar Barang</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 2xl:grid-cols-12 gap-3 items-end purchase-entry-grid">
      <ProductPicker products={activeProducts} value={productId} onChange={chooseProduct} label="Barang" className="sm:col-span-2 xl:col-span-6"/>
      <Field label="Satuan Beli" className="xl:col-span-3">
        <Select value={unit} onChange={event => chooseUnit(event.target.value)}>
          {selectedProduct && availableUnits(selectedProduct).map(item => <option key={item.unit} value={item.unit}>{item.unit}{item.factor !== 1 ? ` = ${formatQuantity(item.factor)} ${selectedProduct.baseUnit}` : ''}</option>)}
        </Select>
      </Field>
      <Field label="Jumlah" className="xl:col-span-3"><NumberInput inputMode="decimal" min={step} step={step} value={qty} onValueChange={value => setQty(value)}/></Field>
      <Field label={`Harga beli / ${unit}`} className="xl:col-span-6"><MoneyInput value={unitPrice} onValueChange={setUnitPrice}/></Field>
      <Button variant="orange" onClick={add} className="xl:col-span-6 w-full min-w-0 whitespace-normal"><Plus size={17}/> Tambah ke Daftar</Button>
    </div>
    {selectedProduct && <div className="text-xs font-bold text-blue-700 bg-blue-50 rounded-xl p-3 mt-3">
      <p>{formatQuantity(Number(qty || 0))} {unit} = {formatQuantity(toBaseQuantity(selectedProduct, Number(qty || 0), unit))} {selectedProduct.baseUnit} stok dasar.</p>
      {availableUnits(selectedProduct).length === 1 && <p className="mt-1 text-gray-600">Barang ini belum memiliki kemasan pembelian tambahan. Tambahkan konversi roll/box/dus pada Produk bila diperlukan.</p>}
    </div>}
    <div className="mt-4 space-y-2">
      {items.length === 0 ? <EmptyState icon={PackageCheck} title="Belum ada barang"/> : items.map((item, index) => {
        const product = activeProducts.find(row => row.id === item.productId);
        const itemUnits = product ? availableUnits(product) : [{ unit: item.unit, factor: item.factor || 1 }];
        return <Card key={item.id} className="p-3 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2 items-end">
            <div className="xl:col-span-4 min-w-0"><p className="font-bold text-sm break-words">{item.name}</p><p className="text-xs text-gray-500">Masuk stok {formatQuantity(item.baseQty)} {item.baseUnit}</p>{item.serialTracking && <p className="text-[11px] font-bold text-violet-700 mt-1">Berserial · {captureSerials ? `masukkan ${Math.round(Number(item.baseQty || 0))} serial jika ingin langsung siap dijual.` : 'serial dicatat saat barang benar-benar diterima.'}</p>}</div>
            <Field label="Satuan" className="xl:col-span-2"><Select value={item.unit} onChange={event => changeItemUnit(index, event.target.value)}>{itemUnits.map(row => <option key={row.unit} value={row.unit}>{row.unit}</option>)}</Select></Field>
            <Field label="Jumlah" className="xl:col-span-2"><NumberInput inputMode="decimal" min={item.quantityStep || 1} step={item.quantityStep || 1} value={item.qty} onValueChange={value => changeItemQty(index, value)}/></Field>
            <Field label={`Harga / ${item.unit}`} className="xl:col-span-3"><MoneyInput value={item.price} onValueChange={value => setItems(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, price: value, baseUnitCost: baseUnitCost(value, row.factor || 1) } : row))}/></Field>
            <button onClick={() => setItems(previous => previous.filter((_, rowIndex) => rowIndex !== index))} className="xl:col-span-1 w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center justify-self-end" aria-label={`Hapus ${item.name}`}><Trash2 size={18}/></button>
          </div>
          {captureSerials && item.serialTracking && <Field label="Nomor Serial Unit (opsional)" hint={`Satu serial per baris/koma. Jika diisi harus tepat ${Math.round(Number(item.baseQty || 0))} serial.`} className="mt-3"><Textarea value={item.serials || ''} onChange={event => setItems(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, serials: event.target.value.toUpperCase() } : row))} placeholder={'SN001\nSN002\nSN003'}/></Field>}
        </Card>;
      })}
    </div>
  </Card>;
}

function PurchaseOrderForm({ value = {}, products, suppliers, onClose, onSave }) {
  const [orderNo, setOrderNo] = useState(value.orderNo || generateId('PO'));
  const [supplierId, setSupplierId] = useState(value.supplierId || suppliers[0]?.id || '');
  const [items, setItems] = useState((value.items || []).map(item => ({ ...item })));
  const [expectedDate, setExpectedDate] = useState(value.expectedDate || (() => { const d = new Date(); d.setDate(d.getDate() + 7); return localDateKey(d); })());
  const [notes, setNotes] = useState(value.notes || '');
  const [status, setStatus] = useState(value.status || 'ORDERED');
  const subtotal = items.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.price || 0) - Number(row.discount || 0), 0);
  const supplier = suppliers.find(row => row.id === supplierId);
  return <Modal title={value.id ? 'Edit Draft Purchase Order' : 'Buat Purchase Order'} onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave({ ...value, orderNo, supplierId, supplierName: supplier?.name || value.supplierName || '', items, expectedDate, notes, status })} disabled={!supplierId || !items.length}>Simpan PO</Button></>}><div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-4"><div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Nomor PO"><Input value={orderNo} onChange={e => setOrderNo(e.target.value)}/></Field><Field label="Pemasok"><Select value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Pilih pemasok</option>{suppliers.filter(row => row.active !== false).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field><Field label="Estimasi Tiba"><Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}/></Field><Field label="Status"><Select value={status} onChange={e => setStatus(e.target.value)}><option>DRAFT</option><option>ORDERED</option></Select></Field></div><PurchaseLinesEditor products={products} items={items} setItems={setItems}/></div><div className="space-y-4 purchase-summary-column"><Card className="p-4"><p className="text-xs text-gray-500">Estimasi Nilai PO</p><p className="font-black text-2xl text-emerald-700">{formatRp(subtotal)}</p></Card><Field label="Catatan"><Textarea value={notes} onChange={e => setNotes(e.target.value)}/></Field></div></div></Modal>;
}

function DirectPurchaseForm({ products, suppliers, categories = [], onClose, onSave }) {
  const [invoiceNo, setInvoiceNo] = useState(generateId('BUY'));
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [items, setItems] = useState([]);
  const [aiReceivingOpen, setAiReceivingOpen] = useState(false);
  const [paid, setPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Tempo');
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return localDateKey(d); });
  const [notes, setNotes] = useState('');
  const subtotal = items.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.price || 0) - Number(row.discount || 0), 0);
  const supplier = suppliers.find(row => row.id === supplierId);
  const applyAiReceiving = ({ product, unit, qty, purchasePrice }) => {
    const factor = conversionFactor(product, unit);
    const safeStep = quantityStepFor(product, unit);
    const amount = normalizeQuantity(qty, { allowFractional: safeStep < 1, step: safeStep, min: safeStep });
    setItems(previous => [...previous, {
      id: generateId('PITEM'), productId: product.id, name: product.name, qty: amount, unit, factor,
      baseQty: toBaseQuantity(product, amount, unit), baseUnit: product.baseUnit, quantityStep: safeStep,
      allowFractional: safeStep < 1, price: Math.max(0, Number(purchasePrice || 0)),
      baseUnitCost: baseUnitCost(purchasePrice, factor), discount: 0, receivedQty: 0, receivedBaseQty: 0,
      serialTracking: product.serialTracking === true, warrantyMonths: Number(product.warrantyMonths || 0), serials: ''
    }]);
    setAiReceivingOpen(false);
  };
  return <Modal title="Terima Barang Langsung" onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave({ invoiceNo, supplierId, supplierName: supplier?.name || '', items, paid, paymentMethod, dueDate, notes })} disabled={!supplierId || !items.length}>Terima & Tambah Stok</Button></>}><div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-4"><div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Nomor Faktur"><Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}/></Field><Field label="Pemasok"><Select value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Pilih pemasok</option>{suppliers.filter(row => row.active !== false).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field></div><Card className="p-4 border-violet-200 bg-violet-50/60"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="font-black text-violet-950">Smart Receiving v6</p><p className="text-xs text-violet-700 mt-1">Foto barang masuk, cocokkan barcode/model ke katalog, lalu isi jumlah dan harga beli tanpa mencari barang manual.</p></div><Button variant="secondary" onClick={() => setAiReceivingOpen(true)}><WandSparkles size={17}/> Foto Barang Masuk</Button></div></Card><PurchaseLinesEditor products={products} items={items} setItems={setItems} captureSerials/></div><div className="space-y-4 purchase-summary-column"><Card className="p-4"><p className="text-xs text-gray-500">Total</p><p className="font-black text-2xl text-emerald-700">{formatRp(subtotal)}</p></Card><Field label="Dibayar"><MoneyInput max={subtotal} value={paid} onValueChange={setPaid}/></Field><Field label="Metode"><Select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option>Tempo</option><option>Tunai</option><option>Transfer</option></Select></Field>{Number(paid) < subtotal && <Field label="Jatuh Tempo"><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/></Field>}<Field label="Catatan"><Textarea value={notes} onChange={e => setNotes(e.target.value)}/></Field></div></div>{aiReceivingOpen && <AIProductCaptureModal mode="receive" products={products} categories={categories} onClose={() => setAiReceivingOpen(false)} onApply={applyAiReceiving}/>}</Modal>;
}

function PurchaseOrderDetail({ order, configs, onClose, onEdit, onSaveOrder, onReceive }) {
  const [receiving, setReceiving] = useState(false);
  const print = () => printHtmlDocument(`PO ${order.orderNo}`, `<div class="center"><h2>${escapeHtml(configs.companyName || 'BUMI MAKMUR')}</h2><p class="bold">PURCHASE ORDER</p><p>${escapeHtml(order.orderNo)}</p></div><div class="line"></div><p>Pemasok: <b>${escapeHtml(order.supplierName)}</b></p>${order.items.map(row => `<div class="item"><p class="bold">${escapeHtml(row.name)}</p><div class="row small"><span>${formatQuantity(row.qty)} ${escapeHtml(row.unit)} × ${escapeHtml(formatRp(row.price))}</span><span>${escapeHtml(formatRp(row.qty * row.price))}</span></div><p class="small">Diterima ${formatQuantity(row.receivedQty || 0)} · Sisa ${formatQuantity(Math.max(0, row.qty - Number(row.receivedQty || 0)))} ${escapeHtml(row.unit)}</p></div>`).join('')}<div class="line"></div><div class="row bold"><span>TOTAL</span><span>${escapeHtml(formatRp(order.total))}</span></div>`);
  return <Modal title="Detail Purchase Order" onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={print}>Cetak PO</Button>{order.status === 'DRAFT' && <Button variant="secondary" onClick={() => onEdit?.(order)}>Edit Draft</Button>}{order.status === 'DRAFT' && <Button onClick={() => onSaveOrder({ ...order, status: 'ORDERED' })}><Truck size={17}/> Tandai Dipesan</Button>}{['DRAFT', 'ORDERED', 'PARTIAL'].includes(order.status) && <Button variant="outline" onClick={() => onSaveOrder({ ...order, status: 'CANCELLED' })}>Batalkan PO</Button>}{['ORDERED', 'PARTIAL'].includes(order.status) && <Button onClick={() => setReceiving(true)}><PackageCheck size={17}/> Terima Barang</Button>}</>}><div className="space-y-4"><div className="flex justify-between gap-3"><div><p className="font-black text-xl">{order.orderNo}</p><p className="text-sm text-gray-500">{order.supplierName} · estimasi {order.expectedDate || '-'}</p></div><StatusBadge status={order.status}/></div><div className="space-y-2">{order.items.map(row => { const remaining = Math.max(0, Number(row.qty || 0) - Number(row.receivedQty || 0)); return <Card key={row.id} className="p-3"><div className="flex justify-between gap-3"><div><p className="font-bold text-sm">{row.name}</p><p className="text-xs text-gray-500">Dipesan {formatQuantity(row.qty)} {row.unit} · diterima {formatQuantity(row.receivedQty || 0)} · sisa {formatQuantity(remaining)}</p></div><Badge tone={remaining <= 0 ? 'green' : Number(row.receivedQty || 0) > 0 ? 'orange' : 'blue'}>{remaining <= 0 ? 'Lengkap' : `${formatQuantity(remaining)} ${row.unit}`}</Badge></div></Card>; })}</div>{order.receipts?.length > 0 && <Card className="p-4"><p className="font-black mb-2">Riwayat Penerimaan</p>{order.receipts.map(row => <div key={row.purchaseId} className="py-2 border-b last:border-0 flex justify-between"><span className="text-sm">{row.invoiceNo} · {new Date(row.createdAt).toLocaleDateString('id-ID')}</span><b>{formatRp(row.total)}</b></div>)}</Card>}</div>{receiving && <ReceiveOrderModal order={order} onClose={() => setReceiving(false)} onSave={onReceive}/>}</Modal>;
}

function ReceiveOrderModal({ order, onClose, onSave }) {
  const [items, setItems] = useState(order.items.map(row => ({ ...row, remainingQty: Math.max(0, Number(row.qty || 0) - Number(row.receivedQty || 0)), receiveQty: Math.max(0, Number(row.qty || 0) - Number(row.receivedQty || 0)), receivePrice: Number(row.price || 0), serials: '' })));
  const [invoiceNo, setInvoiceNo] = useState(`${order.orderNo}-${(order.receipts || []).length + 1}`);
  const [paid, setPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Tempo');
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return localDateKey(d); });
  const [notes, setNotes] = useState('Penerimaan dari Purchase Order');
  const total = items.reduce((sum, row) => sum + Number(row.receiveQty || 0) * Number(row.receivePrice || 0), 0);
  return <Modal title="Terima Barang dari PO" onClose={onClose} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave({ id: order.id, invoiceNo, items: items.filter(row => Number(row.receiveQty) > 0).map(row => ({ id: row.id, productId: row.productId, qty: Number(row.receiveQty), price: Number(row.receivePrice), serials: row.serials || '' })), paid, paymentMethod, dueDate, notes })} disabled={!items.some(row => Number(row.receiveQty) > 0)}>Proses Penerimaan</Button></>}><div className="space-y-4"><Field label="Nomor Faktur / Surat Jalan"><Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}/></Field><div className="space-y-2 max-h-[42vh] overflow-y-auto">{items.filter(row => row.remainingQty > 0).map((row, index) => <Card key={row.id} className="p-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_160px] gap-2 items-center"><div><p className="font-bold text-sm">{row.name}</p><p className="text-xs text-gray-500">Sisa PO {formatQuantity(row.remainingQty)} {row.unit}</p>{row.serialTracking && <p className="text-[11px] font-bold text-violet-700 mt-1">Berserial · garansi default {row.warrantyMonths || 0} bulan</p>}</div><Field label="Diterima"><NumberInput min={0} max={row.remainingQty} value={row.receiveQty} zeroAsEmpty onValueChange={value => setItems(prev => prev.map(item => item.id === row.id ? { ...item, receiveQty: value === '' ? '' : Math.min(row.remainingQty, Math.max(0, Number(value))), serials: '' } : item))}/></Field><Field label={`Harga / ${row.unit}`}><MoneyInput value={row.receivePrice} onValueChange={value => setItems(prev => prev.map(item => item.id === row.id ? { ...item, receivePrice: value } : item))}/></Field>{row.serialTracking && Number(row.receiveQty || 0) > 0 && <Field label="Serial Unit (opsional)" hint={`Jika diisi harus tepat ${Math.round(Number(row.receiveQty || 0) * Number(row.factor || 1))} serial.`} className="sm:col-span-3"><Textarea value={row.serials || ''} onChange={e => setItems(prev => prev.map(item => item.id === row.id ? { ...item, serials: e.target.value.toUpperCase() } : item))} placeholder="Satu serial per baris atau pisahkan dengan koma"/></Field>}</Card>)}</div>{items.some(row => row.serialTracking && Number(row.receiveQty || 0) > 0) && <Card className="p-3 bg-violet-50 border-violet-200"><p className="text-xs font-black text-violet-900">Barang berserial terdeteksi</p><p className="text-xs text-violet-700 mt-1">Masukkan serial saat penerimaan agar unit langsung siap dipilih di POS. Kolom boleh dikosongkan bila serial belum tersedia; kemudian daftarkan dari menu Garansi & Serial. Kasir tetap tidak dapat menjual unit berserial sebelum serial tersedia.</p></Card>}<Card className="p-4 bg-emerald-50"><div className="flex justify-between"><b>Total Penerimaan</b><b className="text-emerald-700">{formatRp(total)}</b></div></Card><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Dibayar"><MoneyInput max={total} value={paid} onValueChange={setPaid}/></Field><Field label="Metode"><Select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option>Tempo</option><option>Tunai</option><option>Transfer</option></Select></Field>{Number(paid) < total && <Field label="Jatuh Tempo"><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/></Field>}</div><Field label="Catatan"><Textarea value={notes} onChange={e => setNotes(e.target.value)}/></Field></div></Modal>;
}

function PurchaseDetail({ purchase, serialNumbers = [], configs, onClose, onReturn }) {
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState('Barang rusak/tidak sesuai');
  const [returnItems, setReturnItems] = useState(() => (purchase.items || []).map(item => {
    const returned = (purchase.returns || []).reduce((sum, row) => sum + row.items.filter(value => value.id === item.id || value.productId === item.productId).reduce((itemSum, value) => itemSum + Number(value.qty || 0), 0), 0);
    const returnedSerialIds = new Set((purchase.returns || []).flatMap(row => row.items || []).filter(value => value.id === item.id || value.productId === item.productId).flatMap(value => value.serialIds || []));
    const serialOptions = serialNumbers.filter(serial => serial.branchId === purchase.branchId && serial.productId === item.productId && serial.purchaseId === purchase.id && serial.status === 'IN_STOCK' && !returnedSerialIds.has(serial.id));
    return { ...item, returnableQty: Math.max(0, Number(item.qty) - returned), qtyReturn: 0, serialOptions, serialIds: [] };
  }));

  const printInvoice = () => printHtmlDocument(
    `Pembelian ${purchase.invoiceNo || purchase.id}`,
    `<div class="center"><h2>${escapeHtml(configs?.companyName || 'BUMI MAKMUR')}</h2><p class="bold">FAKTUR PEMBELIAN</p><p>${escapeHtml(purchase.invoiceNo || purchase.id)}</p></div><div class="line"></div><p>Pemasok: <b>${escapeHtml(purchase.supplierName)}</b></p>${purchase.items.map(item => `<div class="item"><p class="bold">${escapeHtml(item.name)}</p><div class="row small"><span>${formatQuantity(item.qty)} ${escapeHtml(item.unit)} x ${escapeHtml(formatRp(item.price))}</span><span>${escapeHtml(formatRp(item.qty * item.price - item.discount))}</span></div><p class="small">Masuk stok: ${formatQuantity(item.baseQty ?? item.qty)} ${escapeHtml(item.baseUnit || item.unit)}</p></div>`).join('')}<div class="line"></div><div class="row bold"><span>TOTAL</span><span>${escapeHtml(formatRp(purchase.total))}</span></div>`
  );

  const setReturnQty = (index, raw) => setReturnItems(previous => previous.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    const qty = Math.min(row.returnableQty, normalizeQuantity(raw, { allowFractional: Number(row.quantityStep || 1) < 1, step: Number(row.quantityStep || 1), min: 0 }));
    const requiredSerials = row.serialTracking ? Math.max(0, Math.round(qty * Number(row.factor || 1))) : 0;
    return { ...row, qtyReturn: qty, serialIds: row.serialTracking ? (row.serialIds || []).slice(0, requiredSerials) : [] };
  }));

  const toggleReturnSerial = (index, serialId) => setReturnItems(previous => previous.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    const required = Math.max(0, Math.round(Number(row.qtyReturn || 0) * Number(row.factor || 1)));
    const selected = row.serialIds || [];
    if (selected.includes(serialId)) return { ...row, serialIds: selected.filter(id => id !== serialId) };
    if (selected.length >= required) return row;
    return { ...row, serialIds: [...selected, serialId] };
  }));

  const selectedReturns = returnItems.filter(item => Number(item.qtyReturn) > 0);
  const serialIncomplete = selectedReturns.some(item => item.serialTracking && (item.serialIds || []).length !== Math.round(Number(item.qtyReturn || 0) * Number(item.factor || 1)));

  return <Modal title="Detail Penerimaan" onClose={onClose} size="xl" footer={<>
    {purchase.status === 'RECEIVED' && <Button variant="danger" onClick={() => setReturnOpen(true)}><Undo2 size={17}/> Retur</Button>}
    <Button variant="secondary" onClick={printInvoice}>Cetak</Button>
  </>}>
    <div className="space-y-4">
      <div className="flex justify-between"><div><p className="font-bold text-lg">{purchase.invoiceNo || purchase.id}</p><p className="text-sm text-gray-500">{purchase.supplierName}</p></div><StatusBadge status={purchase.status}/></div>
      <div className="space-y-2">{purchase.items.map(item => <Card key={item.id || item.productId} className="p-3 flex justify-between gap-3"><div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">{formatQuantity(item.qty)} {item.unit} × {formatRp(item.price)}</p><p className="text-xs text-blue-600">Stok masuk {formatQuantity(item.baseQty ?? item.qty)} {item.baseUnit || item.unit}</p>{item.serialIds?.length > 0 && <p className="text-[11px] font-bold text-violet-700">{item.serialIds.length} serial direkam saat penerimaan</p>}</div><b>{formatRp(item.qty * item.price - item.discount)}</b></Card>)}</div>
      <Card className="p-4 space-y-1"><div className="flex justify-between"><span>Total</span><b>{formatRp(purchase.total)}</b></div><div className="flex justify-between"><span>Dibayar</span><b>{formatRp(purchase.paid)}</b></div><div className="flex justify-between text-orange-600"><span>Sisa</span><b>{formatRp(Math.max(0, purchase.total - purchase.paid))}</b></div></Card>
    </div>
    {returnOpen && <Modal title="Retur Pembelian" onClose={() => setReturnOpen(false)} size="lg" footer={<>
      <Button variant="secondary" onClick={() => setReturnOpen(false)}>Batal</Button>
      <Button variant="danger" onClick={() => onReturn({ purchaseId: purchase.id, reason, items: selectedReturns.map(item => ({ ...item, qty: Number(item.qtyReturn) })) })} disabled={!selectedReturns.length || serialIncomplete}>Proses Retur</Button>
    </>}>
      <Field label="Alasan"><Textarea value={reason} onChange={event => setReason(event.target.value)}/></Field>
      <div className="mt-3 space-y-2">{returnItems.map((item, index) => {
        const requiredSerials = item.serialTracking ? Math.max(0, Math.round(Number(item.qtyReturn || 0) * Number(item.factor || 1))) : 0;
        return <Card key={item.id || item.productId} className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px] gap-2 items-center"><div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">Sisa dapat diretur {formatQuantity(item.returnableQty)} {item.unit}</p></div><NumberInput min="0" max={item.returnableQty} step={item.quantityStep || 1} value={item.qtyReturn} onValueChange={value => setReturnQty(index, value)}/></div>
          {item.serialTracking && Number(item.qtyReturn || 0) > 0 && <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3"><p className="text-xs font-black text-violet-900">Pilih serial yang kembali ke pemasok ({(item.serialIds || []).length}/{requiredSerials})</p>{item.serialOptions.length === 0 ? <p className="text-xs text-red-700 mt-2">Tidak ada serial IN_STOCK yang terkait dengan faktur ini. Periksa registrasi serial sebelum retur.</p> : <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">{item.serialOptions.map(serial => <label key={serial.id} className="flex items-center gap-2 bg-white border rounded-lg p-2 text-xs"><input type="checkbox" checked={(item.serialIds || []).includes(serial.id)} onChange={() => toggleReturnSerial(index, serial.id)}/><span className="font-bold break-all">{serial.serial}</span></label>)}</div>}</div>}
        </Card>;
      })}</div>
      {serialIncomplete && <p className="mt-3 text-xs font-bold text-red-700 bg-red-50 rounded-xl p-3">Pilih jumlah serial yang tepat untuk setiap barang berserial sebelum memproses retur.</p>}
    </Modal>}
  </Modal>;
}

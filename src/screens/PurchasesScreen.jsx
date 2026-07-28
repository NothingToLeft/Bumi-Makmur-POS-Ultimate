import React, { useMemo, useState } from 'react';
import { Truck, Plus, PackageCheck, Undo2, Trash2 } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { escapeHtml, formatRp, generateId, localDateKey, printHtmlDocument } from '../utils/helpers.js';
import {
  baseUnitCost, conversionFactor, formatQuantity, normalizeQuantity, normalizeQuantityStep,
  priceForUnit, quantityStepLabel, toBaseQuantity
} from '../utils/fractionalUnits.js';
import { Button, Card, EmptyState, Field, Input, Modal, MoneyInput, PageHeader, SearchBox, Select, StatusBadge, Textarea } from '../components/ui.jsx';

export default function PurchasesScreen() {
  const { db, scoped, hasPermission, savePurchase, returnPurchase } = usePos();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Semua');
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const rows = useMemo(() => scoped.purchases.filter(row =>
    (status === 'Semua' || row.status === status) &&
    (!search || String(row.invoiceNo || row.id).toLowerCase().includes(search.toLowerCase()) || row.supplierName?.toLowerCase().includes(search.toLowerCase()))
  ), [scoped.purchases, search, status]);
  const canManage = hasPermission('purchases.manage');

  return <div className="h-full flex flex-col bg-gray-50 generic-bg">
    <PageHeader title="Pembelian & Restok" subtitle="Terima barang dalam roll, box, dus, atau satuan dasar; stok selalu dikonversi otomatis" actions={canManage && <Button onClick={() => setFormOpen(true)}><Plus size={18}/> Pembelian Baru</Button>}/>
    <div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Cari faktur atau pemasok..."/>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">{['Semua', 'DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].map(item => <button key={item} onClick={() => setStatus(item)} className={`px-4 min-h-[48px] rounded-xl border text-sm font-bold whitespace-nowrap ${status === item ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200'}`}>{item === 'Semua' ? 'Semua' : item}</button>)}</div>
      </div>
      {rows.length === 0 ? <EmptyState icon={Truck} title="Belum ada pembelian"/> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(purchase => <Card key={purchase.id} className="p-4" onClick={() => setSelected(purchase)}>
        <div className="flex justify-between gap-3"><div><p className="font-bold text-sm text-gray-800">{purchase.invoiceNo || purchase.id}</p><p className="text-xs text-gray-500">{purchase.supplierName || 'Belum memilih pemasok'} · {new Date(purchase.createdAt).toLocaleDateString('id-ID')}</p></div><StatusBadge status={purchase.status}/></div>
        <div className="mt-3 flex justify-between items-end border-t border-dashed pt-3"><div><p className="text-xs text-gray-500">{purchase.items?.length || 0} jenis barang</p>{purchase.dueDate && <p className="text-xs text-orange-600">Jatuh tempo {purchase.dueDate}</p>}</div><p className="font-black text-emerald-600">{formatRp(purchase.total)}</p></div>
      </Card>)}</div>}
    </div>
    {formOpen && <PurchaseForm products={scoped.products} suppliers={scoped.suppliers} onClose={() => setFormOpen(false)} onSave={data => { try { savePurchase(data); setFormOpen(false); } catch (error) { alert(error.message); } }}/>} 
    {selected && <PurchaseDetail purchase={selected} configs={db.configs} onClose={() => setSelected(null)} onReceive={() => { try { savePurchase({ ...selected, status: 'RECEIVED' }); setSelected(null); } catch (error) { alert(error.message); } }} onReturn={data => { try { returnPurchase(data); setSelected(null); } catch (error) { alert(error.message); } }}/>} 
  </div>;
}

function availableUnits(product) {
  return [{ unit: product.baseUnit, factor: 1 }, ...(product.conversions || []).filter(item => item.unit && Number(item.factor) > 0)];
}

function quantityStepFor(product, unit) {
  return unit === product?.baseUnit ? normalizeQuantityStep(product?.quantityStep, product?.allowFractional) : 1;
}

function PurchaseForm({ products, suppliers, onClose, onSave }) {
  const activeProducts = products.filter(product => product.active !== false);
  const [invoiceNo, setInvoiceNo] = useState(generateId('PO'));
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [status, setStatus] = useState('ORDERED');
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [additional, setAdditional] = useState(0);
  const [paid, setPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Tempo');
  const [dueDate, setDueDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 30); return localDateKey(date); });
  const [notes, setNotes] = useState('');
  const [productId, setProductId] = useState(activeProducts[0]?.id || '');
  const selectedProduct = activeProducts.find(product => product.id === productId);
  const defaultUnit = selectedProduct?.allowFractional && selectedProduct?.conversions?.[0]?.unit ? selectedProduct.conversions[0].unit : selectedProduct?.baseUnit || 'pcs';
  const [unit, setUnit] = useState(defaultUnit);
  const [qty, setQty] = useState(1);
  const factor = selectedProduct ? conversionFactor(selectedProduct, unit) : 1;
  const selectedStep = quantityStepFor(selectedProduct, unit);
  const [unitPrice, setUnitPrice] = useState(selectedProduct ? priceForUnit(selectedProduct.modalPrice, factor) : 0);

  const subtotal = items.reduce((sum, item) => sum + Math.max(0, item.qty * item.price - item.discount), 0);
  const total = Math.max(0, subtotal + Number(additional) - Number(discount));

  const chooseProduct = id => {
    const product = activeProducts.find(item => item.id === id);
    const nextUnit = product?.allowFractional && product?.conversions?.[0]?.unit ? product.conversions[0].unit : product?.baseUnit || 'pcs';
    const nextFactor = product ? conversionFactor(product, nextUnit) : 1;
    setProductId(id);
    setUnit(nextUnit);
    setQty(quantityStepFor(product, nextUnit));
    setUnitPrice(product ? priceForUnit(product.modalPrice, nextFactor) : 0);
  };

  const chooseUnit = nextUnit => {
    if (!selectedProduct) return;
    const currentFactor = conversionFactor(selectedProduct, unit);
    const nextFactor = conversionFactor(selectedProduct, nextUnit);
    const currentBaseCost = baseUnitCost(unitPrice, currentFactor);
    const nextStep = quantityStepFor(selectedProduct, nextUnit);
    setUnit(nextUnit);
    setQty(previous => normalizeQuantity(previous, { allowFractional: nextStep < 1, step: nextStep, min: nextStep }));
    setUnitPrice(priceForUnit(currentBaseCost, nextFactor));
  };

  const addItem = () => {
    if (!selectedProduct) return;
    const itemStep = quantityStepFor(selectedProduct, unit);
    const amount = normalizeQuantity(qty, { allowFractional: itemStep < 1, step: itemStep, min: itemStep });
    const itemFactor = conversionFactor(selectedProduct, unit);
    const baseQty = toBaseQuantity(selectedProduct, amount, unit);
    const price = Math.max(0, Number(unitPrice) || 0);
    const item = {
      id: generateId('PITEM'), productId: selectedProduct.id, name: selectedProduct.name,
      qty: amount, unit, factor: itemFactor, baseQty, baseUnit: selectedProduct.baseUnit,
      quantityStep: itemStep, allowFractional: itemStep < 1,
      price, baseUnitCost: baseUnitCost(price, itemFactor), discount: 0
    };
    setQty(itemStep);
    setItems(previous => {
      const existing = previous.find(row => row.productId === item.productId && row.unit === item.unit && row.price === item.price);
      return existing
        ? previous.map(row => row.id === existing.id ? { ...row, qty: row.qty + amount, baseQty: row.baseQty + baseQty } : row)
        : [...previous, item];
    });
  };


  const changeItemUnit = (index, nextUnit) => setItems(previous => previous.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    const product = activeProducts.find(item => item.id === row.productId);
    if (!product) return row;
    const oldFactor = conversionFactor(product, row.unit);
    const nextFactor = conversionFactor(product, nextUnit);
    const effectiveBaseCost = baseUnitCost(row.price, oldFactor);
    const nextStep = quantityStepFor(product, nextUnit);
    const nextQty = normalizeQuantity(row.qty, { allowFractional: nextStep < 1, step: nextStep, min: nextStep });
    return {
      ...row,
      unit: nextUnit,
      factor: nextFactor,
      qty: nextQty,
      baseQty: toBaseQuantity(product, nextQty, nextUnit),
      quantityStep: nextStep,
      allowFractional: nextStep < 1,
      price: priceForUnit(effectiveBaseCost, nextFactor),
      baseUnitCost: effectiveBaseCost
    };
  }));

  const updateItem = (index, patch) => setItems(previous => previous.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    const product = activeProducts.find(item => item.id === row.productId);
    const next = { ...row, ...patch };
    const nextStep = quantityStepFor(product, next.unit);
    next.qty = normalizeQuantity(next.qty, { allowFractional: nextStep < 1, step: nextStep, min: nextStep });
    next.quantityStep = nextStep;
    next.allowFractional = nextStep < 1;
    const nextFactor = product ? conversionFactor(product, next.unit) : Number(next.factor || 1);
    next.factor = nextFactor;
    next.baseQty = product ? toBaseQuantity(product, next.qty, next.unit) : Number(next.qty || 0) * nextFactor;
    next.baseUnitCost = baseUnitCost(next.price, nextFactor);
    return next;
  }));

  const save = () => {
    const supplier = suppliers.find(item => item.id === supplierId);
    if (status !== 'DRAFT' && !supplier) return alert('Pilih pemasok.');
    if (status !== 'DRAFT' && !items.length) return alert('Tambahkan barang.');
    if (items.some(item => Number(item.qty) <= 0 || Number(item.price) < 0 || Number(item.baseQty) <= 0)) return alert('Jumlah, satuan, dan harga barang harus valid.');
    if (items.some(item => Number(item.discount) > Number(item.qty) * Number(item.price))) return alert('Diskon item tidak boleh melebihi subtotal item.');
    const safePaid = Math.min(Number(paid), total);
    if (status === 'RECEIVED' && total - safePaid > 0 && paymentMethod === 'Tempo' && !dueDate) return alert('Tanggal jatuh tempo wajib diisi untuk pembelian tempo.');
    onSave({ invoiceNo, supplierId: supplier?.id || '', supplierName: supplier?.name || 'Draft', status, items, subtotal, discount: Number(discount), additional: Number(additional), total, paid: safePaid, paymentMethod, dueDate, notes });
  };

  return <Modal title="Pembelian Baru / Restok" onClose={onClose} size="full" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={save}>Simpan Pembelian</Button></>}>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-4 items-start purchase-form-layout">
      <div className="min-w-0 space-y-4">
        <Card className="p-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nomor Faktur / PO"><Input value={invoiceNo} onChange={event => setInvoiceNo(event.target.value)}/></Field>
          <Field label="Pemasok"><Select value={supplierId} onChange={event => setSupplierId(event.target.value)}><option value="">Pilih pemasok</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Select></Field>
          <Field label="Status"><Select value={status} onChange={event => setStatus(event.target.value)}><option value="DRAFT">Draft</option><option value="ORDERED">Dipesan / PO</option><option value="RECEIVED">Langsung Diterima</option></Select></Field>
          <Field label="Metode Pembayaran"><Select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option>Tunai</option><option>Transfer</option><option>Tempo</option></Select></Field>
          <Field label="Jumlah Dibayar"><MoneyInput max={total} value={paid} onValueChange={setPaid}/></Field>
          <Field label="Jatuh Tempo"><Input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)}/></Field>
        </div></Card>

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3 mb-4 items-end purchase-entry-grid">
            <Field label="Barang" className="sm:col-span-2 xl:col-span-6"><Select value={productId} onChange={event => chooseProduct(event.target.value)}>{activeProducts.map(product => <option key={product.id} value={product.id}>{product.name} · stok {formatQuantity(product.stock)} {product.baseUnit}</option>)}</Select></Field>
            <Field label="Satuan Beli" className="xl:col-span-3"><Select value={unit} onChange={event => chooseUnit(event.target.value)}>{selectedProduct && availableUnits(selectedProduct).map(item => <option key={item.unit} value={item.unit}>{item.unit}{item.factor !== 1 ? ` = ${formatQuantity(item.factor)} ${selectedProduct.baseUnit}` : ''}</option>)}</Select></Field>
            <Field label="Jumlah" hint={selectedStep < 1 ? quantityStepLabel(selectedStep, unit) : ''} className="xl:col-span-3"><Input type="number" min={selectedStep} step={selectedStep} value={qty} onChange={event => setQty(event.target.value)} onBlur={() => setQty(normalizeQuantity(qty, { allowFractional: selectedStep < 1, step: selectedStep, min: selectedStep }))}/></Field>
            <Field label={`Harga beli per ${unit}`} className="xl:col-span-6"><MoneyInput value={unitPrice} onValueChange={setUnitPrice}/></Field>
            <Button variant="orange" onClick={addItem} className="sm:col-span-1 xl:col-span-6 w-full min-w-0 whitespace-normal leading-tight"><Plus size={17}/> Tambah ke Daftar</Button>
          </div>
          {selectedProduct && <div className="space-y-2 mb-4">
            <p className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl p-3">{formatQuantity(normalizeQuantity(qty, { allowFractional: selectedStep < 1, step: selectedStep, min: selectedStep }))} {unit} akan menambah stok {formatQuantity(toBaseQuantity(selectedProduct, normalizeQuantity(qty, { allowFractional: selectedStep < 1, step: selectedStep, min: selectedStep }), unit))} {selectedProduct.baseUnit}. Modal efektif per {selectedProduct.baseUnit}: {formatRp(baseUnitCost(unitPrice, factor))}.</p>
            {selectedProduct.allowFractional && !(selectedProduct.conversions || []).length && <p className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-3">Barang ini dijual per {selectedProduct.baseUnit}, tetapi belum memiliki kemasan pembelian. Buka Produk & Stok lalu tambahkan konversi, misalnya <b>roll=50</b>, agar restok dapat dimasukkan per roll.</p>}
          </div>}

          {items.length === 0 ? <EmptyState icon={PackageCheck} title="Belum ada barang dalam pembelian" subtitle="Pilih barang, satuan beli, jumlah, dan harga lalu tekan Tambah ke Daftar."/> : <div className="space-y-2">{items.map((item, index) => {
            const product = activeProducts.find(row => row.id === item.productId);
            return <Card key={item.id} className="p-3 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-[minmax(180px,1fr)_130px_90px_150px_120px_48px] gap-2 items-center purchase-item-row">
              <div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">Masuk stok {formatQuantity(item.baseQty)} {item.baseUnit}</p></div>
              <Select value={item.unit} onChange={event => changeItemUnit(index, event.target.value)}>{product && availableUnits(product).map(unitOption => <option key={unitOption.unit} value={unitOption.unit}>{unitOption.unit}</option>)}</Select>
              <Input type="number" min={quantityStepFor(product, item.unit)} step={quantityStepFor(product, item.unit)} value={item.qty} onChange={event => updateItem(index, { qty: event.target.value })} onBlur={event => updateItem(index, { qty: normalizeQuantity(event.target.value, { allowFractional: quantityStepFor(product, item.unit) < 1, step: quantityStepFor(product, item.unit), min: quantityStepFor(product, item.unit) }) })}/>
              <MoneyInput value={item.price} onValueChange={value => updateItem(index, { price: value })}/>
              <MoneyInput max={Math.max(0, item.qty * item.price)} value={item.discount} onValueChange={value => updateItem(index, { discount: value })} placeholder="Diskon"/>
              <button onClick={() => setItems(previous => previous.filter((_, rowIndex) => rowIndex !== index))} className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Trash2 size={18}/></button>
            </Card>;
          })}</div>}
        </Card>
      </div>

      <div className="min-w-0 space-y-4 xl:sticky xl:top-0 purchase-summary-column">
        <Card className="p-4 space-y-3 overflow-hidden"><h3 className="font-bold">Ringkasan</h3><div className="flex justify-between text-sm"><span>Subtotal</span><b>{formatRp(subtotal)}</b></div><Field label="Diskon Faktur"><MoneyInput max={Math.max(0, subtotal + Number(additional))} value={discount} onValueChange={setDiscount}/></Field><Field label="Biaya Tambahan"><MoneyInput value={additional} onValueChange={setAdditional}/></Field><div className="flex justify-between border-t pt-3 text-lg"><b>Total</b><b className="text-emerald-600">{formatRp(total)}</b></div><div className="flex justify-between text-orange-600"><b>Sisa Hutang</b><b>{formatRp(Math.max(0, total - Number(paid)))}</b></div></Card>
        <Field label="Catatan"><Textarea value={notes} onChange={event => setNotes(event.target.value)}/></Field>
      </div>
    </div>
  </Modal>;
}

function PurchaseDetail({ purchase, configs, onClose, onReceive, onReturn }) {
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState('Barang rusak/tidak sesuai');
  const [returnItems, setReturnItems] = useState((purchase.items || []).map(item => {
    const returned = (purchase.returns || []).reduce((sum, row) => sum + row.items.filter(value => value.id === item.id || value.productId === item.productId).reduce((itemSum, value) => itemSum + Number(value.qty || 0), 0), 0);
    return { ...item, returnableQty: Math.max(0, Number(item.qty) - returned), qtyReturn: 0 };
  }));
  const printInvoice = () => printHtmlDocument(`Pembelian ${purchase.invoiceNo || purchase.id}`, `<div class="center"><h2>${escapeHtml(configs?.companyName || 'BUMI MAKMUR')}</h2><p class="bold">FAKTUR PEMBELIAN</p><p>${escapeHtml(purchase.invoiceNo || purchase.id)}</p></div><div class="line"></div><p>Pemasok: <b>${escapeHtml(purchase.supplierName)}</b></p>${purchase.items.map(item => `<div class="item"><p class="bold">${escapeHtml(item.name)}</p><div class="row small"><span>${formatQuantity(item.qty)} ${escapeHtml(item.unit)} x ${escapeHtml(formatRp(item.price))}</span><span>${escapeHtml(formatRp(item.qty * item.price - item.discount))}</span></div><p class="small">Masuk stok: ${formatQuantity(item.baseQty ?? item.qty)} ${escapeHtml(item.baseUnit || item.unit)}</p></div>`).join('')}<div class="line"></div><div class="row bold"><span>TOTAL</span><span>${escapeHtml(formatRp(purchase.total))}</span></div>`);
  return <Modal title="Detail Pembelian" onClose={onClose} size="xl" footer={<>{purchase.status === 'ORDERED' && <Button onClick={onReceive}><PackageCheck size={17}/> Terima Barang</Button>}{purchase.status === 'RECEIVED' && <Button variant="danger" onClick={() => setReturnOpen(true)}><Undo2 size={17}/> Retur</Button>}<Button variant="secondary" onClick={printInvoice}>Cetak</Button></>}>
    <div className="space-y-4"><div className="flex justify-between"><div><p className="font-bold text-lg">{purchase.invoiceNo || purchase.id}</p><p className="text-sm text-gray-500">{purchase.supplierName}</p></div><StatusBadge status={purchase.status}/></div><div className="space-y-2">{purchase.items.map(item => <Card key={item.id || item.productId} className="p-3 flex justify-between gap-3"><div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">{formatQuantity(item.qty)} {item.unit} × {formatRp(item.price)}</p><p className="text-xs text-blue-600">Stok masuk {formatQuantity(item.baseQty ?? item.qty)} {item.baseUnit || item.unit}</p></div><b>{formatRp(item.qty * item.price - item.discount)}</b></Card>)}</div><Card className="p-4 space-y-1"><div className="flex justify-between"><span>Total</span><b>{formatRp(purchase.total)}</b></div><div className="flex justify-between"><span>Dibayar</span><b>{formatRp(purchase.paid)}</b></div><div className="flex justify-between text-orange-600"><span>Sisa</span><b>{formatRp(Math.max(0, purchase.total - purchase.paid))}</b></div></Card></div>
    {returnOpen && <Modal title="Retur Pembelian" onClose={() => setReturnOpen(false)} size="lg" footer={<><Button variant="secondary" onClick={() => setReturnOpen(false)}>Batal</Button><Button variant="danger" onClick={() => onReturn({ purchaseId: purchase.id, reason, items: returnItems.filter(item => item.qtyReturn > 0).map(item => ({ ...item, qty: item.qtyReturn })) })} disabled={!returnItems.some(item => item.qtyReturn > 0)}>Proses Retur</Button></>}><Field label="Alasan"><Textarea value={reason} onChange={event => setReason(event.target.value)}/></Field><div className="mt-3 space-y-2">{returnItems.map((item, index) => <Card key={item.id || item.productId} className="p-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px] gap-2 items-center"><div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">Sisa dapat diretur {formatQuantity(item.returnableQty)} {item.unit}</p></div><Input type="number" inputMode="decimal" min="0" step={normalizeQuantityStep(item.quantityStep, Number(item.quantityStep) < 1)} max={item.returnableQty} value={item.qtyReturn} title={quantityStepLabel(normalizeQuantityStep(item.quantityStep, Number(item.quantityStep) < 1), item.unit)} onChange={event => setReturnItems(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, qtyReturn: event.target.value } : row))} onBlur={event => setReturnItems(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, qtyReturn: Math.min(item.returnableQty, normalizeQuantity(event.target.value, { allowFractional: Number(item.quantityStep) < 1, step: item.quantityStep || 1, min: 0 })) } : row))}/></Card>)}</div></Modal>}
  </Modal>;
}

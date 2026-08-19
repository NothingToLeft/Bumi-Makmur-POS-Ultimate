import React, { useMemo, useState } from 'react';
import { ShoppingBag, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { formatRp, generateId } from '../utils/helpers.js';
import { conversionFactor, formatQuantity, normalizeQuantity, normalizeQuantityStep, priceForSaleUnit, saleUnitOptions, toBaseQuantity } from '../utils/fractionalUnits.js';
import { Button, Card, EmptyState, Field, Input, Modal, NumberInput, PageHeader, Select, StatusBadge, Textarea } from '../components/ui.jsx';
import ProductPicker from '../components/ProductPicker.jsx';

const activeProducts = products => products.filter(product => product.active !== false && product.available !== false);
const productUnits = product => saleUnitOptions(product, 'retail');
const quantityStepFor = (product, unit) => unit === product?.baseUnit ? normalizeQuantityStep(product?.quantityStep, product?.allowFractional) : 1;

export default function OrdersScreen({ onNavigate }) {
  const { scoped, hasPermission, saveOnlineOrder, convertOrderToBill } = usePos();
  const [status, setStatus] = useState('Semua');
  const [formOpen, setFormOpen] = useState(false);
  const canManage = hasPermission('orders.manage');
  const rows = useMemo(() => scoped.orders.filter(order => status === 'Semua' || order.status === status), [scoped.orders, status]);

  return <div className="h-full flex flex-col bg-gray-50 generic-bg">
    <PageHeader title="Pesanan Online & Delivery" subtitle="WhatsApp, marketplace, delivery, termasuk barang eceran dan konversi satuan" actions={canManage && <Button onClick={() => setFormOpen(true)}><Plus size={17}/> Pesanan Baru</Button>}/>
    <div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">
      <div className="flex gap-2 overflow-x-auto mb-4 no-scrollbar">{['Semua', 'NEW', 'PROCESSING', 'IN_POS', 'COMPLETED', 'CANCELLED'].map(item => <button key={item} onClick={() => setStatus(item)} className={`px-4 min-h-[44px] rounded-xl border font-bold text-sm whitespace-nowrap ${status === item ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200'}`}>{item}</button>)}</div>
      {rows.length === 0 ? <EmptyState icon={ShoppingBag} title="Belum ada pesanan online"/> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(order => <Card key={order.id} className="p-4">
        <div className="flex justify-between gap-3"><div><p className="font-bold">{order.id}</p><p className="text-xs text-gray-500">{order.channel} · {order.customerName}</p></div><StatusBadge status={order.status}/></div>
        <p className="text-xs text-gray-500 mt-2">{order.items?.map(item => `${formatQuantity(item.qty)} ${item.unit || ''} ${item.name}`).join(', ')}</p>
        <div className="flex justify-between border-t mt-3 pt-3"><b className="text-emerald-600">{formatRp(order.total)}</b><div className="flex gap-2">{order.status === 'NEW' && <Button size="sm" variant="secondary" onClick={() => saveOnlineOrder({ ...order, status: 'PROCESSING' })}>Proses</Button>}{['NEW', 'PROCESSING'].includes(order.status) && <Button size="sm" onClick={() => { convertOrderToBill(order.id); onNavigate('openBills'); }}><ArrowRight size={15}/> Kasir</Button>}</div></div>
      </Card>)}</div>}
    </div>
    {formOpen && <OrderForm products={scoped.products} customers={scoped.customers} onClose={() => setFormOpen(false)} onSave={data => { saveOnlineOrder(data); setFormOpen(false); }}/>} 
  </div>;
}

function OrderForm({ products, customers, onClose, onSave }) {
  const productsAvailable = activeProducts(products);
  const [channel, setChannel] = useState('WhatsApp');
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [items, setItems] = useState([]);
  const [productId, setProductId] = useState(productsAvailable[0]?.id || '');
  const selectedProduct = productsAvailable.find(product => product.id === productId);
  const [unit, setUnit] = useState(selectedProduct?.baseUnit || 'pcs');
  const step = quantityStepFor(selectedProduct, unit);
  const [qty, setQty] = useState(step);
  const [notes, setNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const chooseProduct = id => {
    const product = productsAvailable.find(item => item.id === id);
    const nextUnit = product?.baseUnit || 'pcs';
    const nextStep = quantityStepFor(product, nextUnit);
    setProductId(id);
    setUnit(nextUnit);
    setQty(nextStep);
  };

  const chooseUnit = nextUnit => {
    const nextStep = quantityStepFor(selectedProduct, nextUnit);
    setUnit(nextUnit);
    setQty(previous => normalizeQuantity(previous, { allowFractional: nextStep < 1, step: nextStep, min: nextStep }));
  };

  const add = () => {
    if (!selectedProduct) return;
    const safeStep = quantityStepFor(selectedProduct, unit);
    const amount = normalizeQuantity(qty, { allowFractional: safeStep < 1, step: safeStep, min: safeStep });
    const factor = conversionFactor(selectedProduct, unit);
    const baseQty = toBaseQuantity(selectedProduct, amount, unit);
    if (baseQty <= 0) return alert('Jumlah pesanan harus lebih dari 0.');
    const price = priceForSaleUnit(selectedProduct, unit, 'retail');
    const line = {
      lineId: generateId('ORDLINE'), productId: selectedProduct.id, name: selectedProduct.name,
      qty: amount, unit, factor, baseQty, baseUnit: selectedProduct.baseUnit,
      quantityStep: safeStep, allowFractional: safeStep < 1,
      price, netUnitPrice: price, modalPrice: selectedProduct.modalPrice,
      itemDiscount: 0, note: '', variant: ''
    };
    setItems(previous => {
      const existing = previous.find(item => item.productId === line.productId && item.unit === line.unit && item.price === line.price);
      return existing
        ? previous.map(item => item.lineId === existing.lineId ? { ...item, qty: item.qty + amount, baseQty: item.baseQty + baseQty } : item)
        : [...previous, line];
    });
    setQty(safeStep);
  };

  const save = () => {
    if (!items.length) return;
    const customer = customers.find(item => item.id === customerId);
    onSave({ channel, customerId: customer?.id, customerName: customer?.name || 'Umum', items, total, notes, deliveryAddress, status: 'NEW', saleType: 'retail' });
  };

  return <Modal title="Pesanan Online Baru" onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={save} disabled={!items.length}>Simpan Pesanan</Button></>}>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <Field label="Kanal"><Select value={channel} onChange={event => setChannel(event.target.value)}><option>WhatsApp</option><option>Tokopedia</option><option>Shopee</option><option>Telepon</option><option>Delivery Internal</option><option>Proyek</option></Select></Field>
        <Field label="Pelanggan"><Select value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Pelanggan umum</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></Field>
        <Field label="Alamat Pengiriman"><Textarea value={deliveryAddress} onChange={event => setDeliveryAddress(event.target.value)}/></Field>
        <Field label="Catatan"><Textarea value={notes} onChange={event => setNotes(event.target.value)}/></Field>
      </Card>
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-[minmax(180px,1fr)_120px_100px_auto] gap-3 items-end">
          <ProductPicker products={productsAvailable} value={productId} onChange={id => chooseProduct(id)} label="Barang" className="sm:col-span-2 2xl:col-span-1"/>
          <Field label="Satuan"><Select value={unit} onChange={event => chooseUnit(event.target.value)}>{selectedProduct && productUnits(selectedProduct).map(option => <option key={option.unit} value={option.unit}>{option.unit}{option.factor !== 1 ? ` = ${formatQuantity(option.factor)} ${selectedProduct.baseUnit}` : ''} · {formatRp(option.price)}</option>)}</Select></Field>
          <Field label="Jumlah"><NumberInput inputMode="decimal" min={step} step={step} value={qty} onValueChange={value => setQty(value)} onBlur={() => setQty(normalizeQuantity(qty, { allowFractional: step < 1, step, min: step }))}/></Field>
          <Button onClick={add} className="sm:col-span-2 2xl:col-span-1 w-full 2xl:w-auto"><Plus size={17}/> Tambah</Button>
        </div>
        {selectedProduct && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-700">{formatQuantity(qty)} {unit} = {formatQuantity(toBaseQuantity(selectedProduct, qty, unit))} {selectedProduct.baseUnit}. Harga: {formatRp(priceForSaleUnit(selectedProduct, unit, 'retail'))} per {unit}.</div>}
        <div className="space-y-2 mt-4">{items.map((item, index) => <Card key={item.lineId} className="p-3 flex justify-between gap-3"><div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">{formatQuantity(item.qty)} {item.unit} × {formatRp(item.price)}</p><p className="text-xs text-blue-600">Mengurangi stok {formatQuantity(item.baseQty)} {item.baseUnit}</p></div><div className="text-right"><b>{formatRp(item.qty * item.price)}</b><button type="button" onClick={() => setItems(previous => previous.filter((_, rowIndex) => rowIndex !== index))} className="mt-2 ml-auto flex items-center gap-1 text-xs font-bold text-red-600"><Trash2 size={13}/> Hapus</button></div></Card>)}</div>
        <div className="flex justify-between border-t mt-4 pt-3 text-lg"><b>Total</b><b className="text-emerald-600">{formatRp(total)}</b></div>
      </Card>
    </div>
  </Modal>;
}

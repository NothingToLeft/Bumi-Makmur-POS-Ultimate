import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ScanLine, ShoppingCart, Plus, Minus, Trash2, Package, Save, ReceiptText, Star, User, SlidersHorizontal, QrCode, CreditCard, Banknote, WalletCards, Printer, X } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { formatRp, generateId, localDateKey } from '../utils/helpers.js';
import { Badge, Button, Card, Field, Input, Modal, MoneyInput, Select, Textarea } from '../components/ui.jsx';

const priceFor = (product, tier) => Number(product.prices?.[tier] ?? product.prices?.retail ?? 0);
const roundTotal = (total, step) => step > 0 ? Math.round(total / step) * step : Math.round(total);

export default function POSScreen() {
  const { db, scoped, completeSale, holdSale, findOpenShift, setCustomerDisplay } = usePos();
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [customerId, setCustomerId] = useState(scoped.customers[0]?.id || '');
  const [saleType, setSaleType] = useState('retail');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [notes, setNotes] = useState('');
  const [mobileCart, setMobileCart] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [choosingProduct, setChoosingProduct] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [heldSaleId, setHeldSaleId] = useState(null);

  useEffect(() => {
    const handleLoad = event => {
      const bill = event.detail;
      if (!bill) return;
      setCart(bill.items || []); setCustomerId(bill.customerId || scoped.customers[0]?.id || '');
      setSaleType(bill.saleType || 'retail'); setNotes(bill.note || ''); setHeldSaleId(bill.id); setGlobalDiscount(Number(bill.globalDiscount || 0)); setPointsRedeemed(Number(bill.pointsRedeemed || 0));
    };
    window.addEventListener('bm-load-bill', handleLoad);
    return () => window.removeEventListener('bm-load-bill', handleLoad);
  }, [scoped.customers]);

  const filtered = useMemo(() => scoped.products.filter(product => {
    const term = search.toLowerCase();
    return product.active !== false && product.available !== false &&
      (category === 'Semua' || product.category === category) && (!favoritesOnly || product.favorite) &&
      (!term || product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term) || String(product.barcode || '').includes(term));
  }), [scoped.products, search, category, favoritesOnly]);

  const customer = scoped.customers.find(item => item.id === customerId) || scoped.customers[0];
  useEffect(() => { if (customer?.priceTier && cart.length === 0) setSaleType(customer.priceTier); }, [customerId]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + (Number(line.price) * Number(line.qty)) - Number(line.itemDiscount || 0), 0);
    const today = localDateKey();
    const promoCandidates = (scoped.promotions || []).filter(promo => promo.active !== false &&
      (!promo.startDate || promo.startDate <= today) && (!promo.endDate || promo.endDate >= today) && subtotal >= Number(promo.minPurchase || 0))
      .map(promo => {
        const eligibleBase = promo.productId
          ? cart.filter(line => line.productId === promo.productId).reduce((sum, line) => sum + line.price * line.qty - line.itemDiscount, 0)
          : promo.category
            ? cart.filter(line => line.category === promo.category).reduce((sum, line) => sum + line.price * line.qty - line.itemDiscount, 0)
            : subtotal;
        let discount = promo.type === 'percent' ? eligibleBase * (Number(promo.value || 0) / 100) : Number(promo.value || 0);
        if (Number(promo.maxDiscount || 0) > 0) discount = Math.min(discount, Number(promo.maxDiscount));
        return { ...promo, discount: Math.max(0, Math.round(discount)) };
      }).filter(promo => promo.discount > 0).sort((a, b) => b.discount - a.discount);
    const appliedPromo = promoCandidates[0] || null;
    const promoDiscount = appliedPromo?.discount || 0;
    const loyaltyDiscount = Math.min(Math.max(0, Number(pointsRedeemed || 0)) * Number(db.configs.pointValue || 0), Math.max(0, subtotal - Number(globalDiscount || 0) - promoDiscount));
    const afterDiscount = Math.max(0, subtotal - Number(globalDiscount || 0) - promoDiscount - loyaltyDiscount);
    const tax = db.configs.taxEnabled ? afterDiscount * (Number(db.configs.taxRate || 0) / 100) : 0;
    const service = db.configs.serviceEnabled ? afterDiscount * (Number(db.configs.serviceRate || 0) / 100) : 0;
    const raw = afterDiscount + tax + service;
    const total = roundTotal(raw, Number(db.configs.roundingStep || 0));
    return { subtotal, promoDiscount, appliedPromo, loyaltyDiscount, afterDiscount, tax: Math.round(tax), service: Math.round(service), rounding: total - Math.round(raw), total };
  }, [cart, globalDiscount, pointsRedeemed, db.configs, scoped.promotions]);

  useEffect(() => {
    setCustomerDisplay({ cart, total: totals.total, customerName: customer?.name || 'Umum', message: notes });
  }, [cart, totals.total, customer?.name, notes, setCustomerDisplay]);

  const addProduct = (product, options = {}) => {
    const conversion = product.conversions?.find(item => item.unit === options.unit);
    const factor = conversion ? Number(conversion.factor) : 1;
    const unit = options.unit || product.baseUnit;
    const price = options.price ?? priceFor(product, saleType) * factor;
    const line = {
      lineId: generateId('LINE'), productId: product.id, name: product.name, category: product.category, sku: product.sku, barcode: product.barcode,
      qty: 1, baseQty: factor, unit, factor, basePrice: Math.round(price), modifierAmount: 0, price: Math.round(price), modalPrice: Number(product.modalPrice || 0) * factor,
      itemDiscount: 0, note: '', variant: options.variant || product.variants?.[0]?.name || '', modifiers: [], bundleItems: product.bundleItems || []
    };
    setCart(previous => {
      const existing = previous.find(item => item.productId === line.productId && item.unit === line.unit && item.variant === line.variant && !item.note && !item.itemDiscount);
      if (existing) return previous.map(item => item.lineId === existing.lineId ? { ...item, qty: item.qty + 1, baseQty: item.baseQty + factor } : item);
      return [...previous, line];
    });
  };

  const updateLine = updated => setCart(previous => previous.map(line => line.lineId === updated.lineId ? updated : line));
  const changeQty = (lineId, delta) => setCart(previous => previous.map(line => line.lineId === lineId ? { ...line, qty: Math.max(0, line.qty + delta), baseQty: Math.max(0, line.baseQty + delta * line.factor) } : line).filter(line => line.qty > 0));
  const clear = () => { setCart([]); setGlobalDiscount(0); setPointsRedeemed(0); setNotes(''); setHeldSaleId(null); };

  const saveBill = name => {
    if (!cart.length) return;
    holdSale({ id: heldSaleId || undefined, name, customerId, customerName: customer?.name || 'Umum', saleType, globalDiscount, pointsRedeemed, note: notes, items: cart });
    clear(); setHoldOpen(false); setMobileCart(false);
  };

  const splitBill = ({ name, selections }) => {
    const splitItems = [];
    const remaining = [];
    for (const line of cart) {
      const splitQty = Math.min(Number(selections[line.lineId] || 0), Number(line.qty));
      if (splitQty > 0) splitItems.push({ ...line, qty: splitQty, baseQty: (line.baseQty / line.qty) * splitQty });
      const remainQty = line.qty - splitQty;
      if (remainQty > 0) remaining.push({ ...line, qty: remainQty, baseQty: (line.baseQty / line.qty) * remainQty });
    }
    if (!splitItems.length) throw new Error('Pilih minimal satu item untuk dipisah.');
    holdSale({ name, customerId, customerName: customer?.name || 'Umum', saleType, globalDiscount: 0, pointsRedeemed: 0, note: `Hasil split dari ${heldSaleId || 'keranjang'}`, items: splitItems });
    setCart(remaining); setSplitOpen(false);
  };

  const processPayment = async payments => {
    const paid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const credit = payments.find(item => item.type === 'credit');
    if (paid < totals.total) throw new Error('Jumlah pembayaran belum mencukupi.');
    if (credit && !credit.dueDate) throw new Error('Pembayaran tempo wajib memiliki tanggal jatuh tempo.');
    const sale = completeSale({
      items: cart.map(line => ({ ...line, netUnitPrice: Math.max(0, line.price - Number(line.itemDiscount || 0) / Math.max(1, line.qty)) })),
      customerId: customer?.id, customerName: customer?.name || 'Umum', saleType, notes, globalDiscount: Number(globalDiscount || 0),
      promoDiscount: totals.promoDiscount, appliedPromos: totals.appliedPromo ? [{ id: totals.appliedPromo.id, name: totals.appliedPromo.name, discount: totals.appliedPromo.discount }] : [],
      loyaltyDiscount: totals.loyaltyDiscount, subtotal: Math.round(totals.subtotal), tax: totals.tax, service: totals.service, rounding: totals.rounding, total: totals.total,
      payments, heldSaleId, pointsRedeemed: Number(pointsRedeemed || 0)
    });
    setReceipt(sale); setPaymentOpen(false); setMobileCart(false); clear();
  };

  const cartPanel = (
    <div className="h-full flex flex-col bg-white card-element">
      <div className="p-3 border-b border-gray-100 space-y-2">
        <div className="flex gap-2"><Select value={customerId} onChange={event => setCustomerId(event.target.value)} className="text-sm"><option value="">Pelanggan Umum</option>{scoped.customers.filter(item => item.active !== false).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select value={saleType} onChange={event => setSaleType(event.target.value)} className="w-32 text-sm"><option value="retail">Eceran</option><option value="wholesale">Grosir</option><option value="project">Proyek</option></Select></div>
        <Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Catatan pesanan / alamat pengiriman..." className="min-h-[58px] text-sm"/>
        {db.configs.loyaltyEnabled && customer && customer.name !== 'Umum (Non-Member)' && <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-yellow-50 border border-yellow-100 text-xs"><span className="font-bold text-yellow-800">Poin tersedia: {customer.points || 0}</span><div className="flex items-center gap-1"><span>Tukar</span><Input type="number" min="0" max={customer.points || 0} value={pointsRedeemed} onChange={event => setPointsRedeemed(Math.min(Number(customer.points || 0), Math.max(0, Number(event.target.value || 0))))} className="w-20 min-h-[36px] py-1 text-right"/></div></div>}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-gray-400"><ShoppingCart size={48} className="mb-3 opacity-40"/><p className="font-bold">Keranjang kosong</p><p className="text-xs mt-1">Pilih produk untuk mulai transaksi</p></div> : cart.map(line => <Card key={line.lineId} className="p-3 bg-gray-50 input-element"><div className="flex justify-between gap-2"><div className="min-w-0"><p className="font-bold text-xs text-gray-800 line-clamp-2">{line.name}</p><p className="text-[10px] text-gray-500">{line.variant ? `${line.variant} · ` : ''}{line.unit} · {formatRp(line.price)}</p>{line.note && <p className="text-[10px] text-blue-600 mt-1">Catatan: {line.note}</p>}</div><p className="font-bold text-xs shrink-0">{formatRp(line.price * line.qty - line.itemDiscount)}</p></div><div className="flex items-center justify-between mt-3"><div className="flex gap-1"><button onClick={() => setEditingLine(line)} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><SlidersHorizontal size={16}/></button><button onClick={() => setCart(previous => previous.filter(item => item.lineId !== line.lineId))} className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center"><Trash2 size={16}/></button></div><div className="flex items-center gap-2 bg-white border rounded-xl p-1"><button onClick={() => changeQty(line.lineId,-1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Minus size={14}/></button><span className="w-8 text-center font-bold text-sm">{line.qty}</span><button onClick={() => changeQty(line.lineId,1)} className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Plus size={14}/></button></div></div></Card>)}
      </div>
      <div className="p-4 border-t border-gray-100 shadow-[0_-4px_15px_rgba(0,0,0,.04)] space-y-2 pb-safe">
        <div className="flex justify-between text-sm"><span>Subtotal</span><b>{formatRp(totals.subtotal)}</b></div>
        <div className="flex items-center justify-between gap-2 text-sm"><span>Diskon Transaksi</span><MoneyInput max={Math.max(0, totals.subtotal)} value={globalDiscount} onValueChange={setGlobalDiscount} className="w-32 min-h-[40px] py-1 text-right"/></div>
        {totals.promoDiscount > 0 && <div className="flex justify-between text-sm text-emerald-700"><span>Promo {totals.appliedPromo?.name}</span><b>-{formatRp(totals.promoDiscount)}</b></div>}
        {totals.loyaltyDiscount > 0 && <div className="flex justify-between text-sm text-yellow-700"><span>Reward Poin</span><b>-{formatRp(totals.loyaltyDiscount)}</b></div>}
        {totals.tax > 0 && <div className="flex justify-between text-sm"><span>Pajak {db.configs.taxRate}%</span><b>{formatRp(totals.tax)}</b></div>}
        {totals.service > 0 && <div className="flex justify-between text-sm"><span>Service {db.configs.serviceRate}%</span><b>{formatRp(totals.service)}</b></div>}
        {totals.rounding !== 0 && <div className="flex justify-between text-sm"><span>Pembulatan</span><b>{formatRp(totals.rounding)}</b></div>}
        <div className="flex justify-between items-end border-t border-dashed pt-2"><b>TOTAL</b><b className="text-2xl text-orange-600">{formatRp(totals.total)}</b></div>
        <div className="grid grid-cols-4 gap-2 pt-2"><Button variant="secondary" onClick={() => setHoldOpen(true)} disabled={!cart.length}><Save size={16}/><span className="hidden lg:inline">Tahan</span></Button><Button variant="secondary" onClick={() => setSplitOpen(true)} disabled={cart.length < 2}><ReceiptText size={16}/><span className="hidden lg:inline">Pisah</span></Button><Button variant="danger" onClick={clear} disabled={!cart.length}><Trash2 size={16}/></Button><Button variant="orange" onClick={() => setPaymentOpen(true)} disabled={!cart.length}>Bayar</Button></div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex bg-gray-50 relative overflow-hidden generic-bg">
      <div className={`flex-1 flex flex-col min-w-0 ${mobileCart ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-white p-3 md:p-4 border-b border-gray-100 card-element space-y-3">
          <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama, SKU, atau barcode..." className="pl-10"/></div><Button variant="secondary" onClick={() => setScannerOpen(true)} className="px-3"><ScanLine size={20}/></Button><Button variant="secondary" onClick={() => setCustomOpen(true)} className="px-3"><Plus size={20}/></Button></div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar"><button onClick={() => setFavoritesOnly(value => !value)} className={`min-h-[40px] px-3 rounded-full border font-bold text-xs flex items-center gap-1 ${favoritesOnly ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-white text-gray-600 border-gray-200'}`}><Star size={15} fill={favoritesOnly?'currentColor':'none'}/> Favorit</button>{['Semua', ...db.categories].map(item => <button key={item} onClick={() => setCategory(item)} className={`min-h-[40px] px-4 rounded-full border font-bold text-xs whitespace-nowrap ${category === item ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-white text-gray-600 border-gray-200'}`}>{item}</button>)}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar pb-28 md:pb-4"><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">{filtered.map(product => <button key={product.id} onClick={() => (product.variants?.length > 1 || product.conversions?.length > 0) ? setChoosingProduct(product) : addProduct(product)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-left card-element active:scale-[.98]"><div className="aspect-square rounded-xl bg-gray-100 img-placeholder flex items-center justify-center mb-2 relative"><Package size={30} className="text-gray-400"/>{product.favorite && <Star size={16} fill="currentColor" className="absolute top-2 right-2 text-yellow-500"/>}{product.bundleItems?.length > 0 && <Badge tone="purple">Paket</Badge>}</div><p className="font-bold text-xs text-gray-800 line-clamp-2 min-h-[32px]">{product.name}</p><p className="font-bold text-emerald-600 mt-2">{formatRp(priceFor(product,saleType))}</p><div className="flex justify-between text-[10px] text-gray-500 mt-1"><span>{product.stock} {product.baseUnit}</span><span>{product.rack}</span></div></button>)}</div></div>
        {cart.length > 0 && !mobileCart && <div className="md:hidden absolute left-4 right-4 bottom-[76px] z-30"><button onClick={() => setMobileCart(true)} className="w-full bg-emerald-800 text-white min-h-[64px] rounded-2xl shadow-xl px-4 flex justify-between items-center"><div className="flex gap-3 items-center"><ShoppingCart/><div className="text-left"><p className="text-[10px] text-emerald-200">{cart.reduce((sum,line)=>sum+line.qty,0)} item</p><p className="font-bold">{formatRp(totals.total)}</p></div></div><span className="font-bold text-sm">Lihat Keranjang</span></button></div>}
      </div>
      <div className="hidden md:block w-[340px] lg:w-[390px] border-l border-gray-200 shrink-0">{cartPanel}</div>
      {mobileCart && <div className="md:hidden absolute inset-0 z-40 bg-white flex flex-col"><div className="p-3 border-b flex items-center justify-between"><Button variant="ghost" onClick={() => setMobileCart(false)}>← Produk</Button><b>Keranjang</b><span/></div><div className="flex-1 min-h-0">{cartPanel}</div></div>}

      {choosingProduct && <ProductChoiceModal product={choosingProduct} saleType={saleType} onClose={() => setChoosingProduct(null)} onAdd={options => { addProduct(choosingProduct, options); setChoosingProduct(null); }}/>}      
      {editingLine && <LineEditModal line={editingLine} product={scoped.products.find(item => item.id === editingLine.productId)} onClose={() => setEditingLine(null)} onSave={line => { updateLine(line); setEditingLine(null); }}/>}      
      {paymentOpen && <PaymentModal total={totals.total} methods={db.configs.paymentMethods.filter(item => item.active)} onClose={() => setPaymentOpen(false)} onConfirm={processPayment}/>}      
      {splitOpen && <SplitBillModal cart={cart} onClose={() => setSplitOpen(false)} onSplit={splitBill}/>}      
      {holdOpen && <HoldModal defaultName={customer?.name || ''} onClose={() => setHoldOpen(false)} onSave={saveBill}/>}      
      {scannerOpen && <ScannerModal products={scoped.products} onClose={() => setScannerOpen(false)} onDetected={product => { addProduct(product); setScannerOpen(false); }}/>}      
      {customOpen && <CustomItemModal onClose={() => setCustomOpen(false)} onAdd={line => { setCart(previous => [...previous, line]); setCustomOpen(false); }}/>}      
      {receipt && <ReceiptModal sale={receipt} configs={db.configs} onClose={() => setReceipt(null)}/>}      
    </div>
  );
}

function ProductChoiceModal({ product, saleType, onClose, onAdd }) {
  const [variant, setVariant] = useState(product.variants?.[0]?.name || '');
  const [unit, setUnit] = useState(product.baseUnit);
  const conversion = product.conversions?.find(item => item.unit === unit);
  const factor = conversion ? Number(conversion.factor) : 1;
  const price = priceFor(product, saleType) * factor;
  return <Modal title="Pilih Varian & Satuan" onClose={onClose} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onAdd({ variant, unit, price })}>Tambah</Button></>}><div className="space-y-3"><div><p className="font-bold text-gray-800">{product.name}</p><p className="text-xs text-gray-500">Stok {product.stock} {product.baseUnit}</p></div>{product.variants?.length > 0 && <Field label="Varian"><Select value={variant} onChange={event => setVariant(event.target.value)}>{product.variants.map(item => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}</Select></Field>}<Field label="Satuan"><Select value={unit} onChange={event => setUnit(event.target.value)}><option value={product.baseUnit}>{product.baseUnit}</option>{product.conversions?.map(item => <option key={item.unit} value={item.unit}>{item.unit} = {item.factor} {product.baseUnit}</option>)}</Select></Field><Card className="p-3 bg-emerald-50 text-center"><p className="text-xs text-emerald-700">Harga</p><p className="text-xl font-black text-emerald-800">{formatRp(price)}</p></Card></div></Modal>;
}

function LineEditModal({ line, product, onClose, onSave }) {
  const [form, setForm] = useState({ ...line, basePrice: line.basePrice ?? (line.price - Number(line.modifierAmount || 0)), modifierAmount: Number(line.modifierAmount || 0), modifierName: line.modifiers?.[0]?.name || '' });
  const changeUnit = unit => {
    const conversion = product?.conversions?.find(item => item.unit === unit);
    const factor = conversion ? Number(conversion.factor) : 1;
    const oldFactor = Number(form.factor || 1);
    setForm(previous => { const basePrice = Math.round(previous.basePrice / oldFactor * factor); return { ...previous, unit, factor, baseQty: previous.qty * factor, basePrice, price: basePrice + Number(previous.modifierAmount || 0), modalPrice: Math.round(previous.modalPrice / oldFactor * factor) }; });
  };
  return <Modal title="Atur Item" onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave(form)}>Simpan</Button></>}><div className="space-y-4"><div><p className="font-bold text-gray-800">{line.name}</p><p className="text-xs text-gray-500">{line.sku}</p></div>{(product?.conversions?.length || 0) > 0 && <Field label="Satuan"><Select value={form.unit} onChange={event => changeUnit(event.target.value)}><option value={product.baseUnit}>{product.baseUnit}</option>{product.conversions.map(item => <option key={item.unit} value={item.unit}>{item.unit} = {item.factor} {product.baseUnit}</option>)}</Select></Field>}<div className="grid grid-cols-2 gap-3"><Field label="Jumlah"><Input type="number" min="0.01" step="0.01" value={form.qty} onChange={event => setForm(previous => ({...previous, qty:Number(event.target.value), baseQty:Number(event.target.value)*previous.factor}))}/></Field><Field label="Harga per Satuan"><MoneyInput value={form.price} onValueChange={value => setForm(previous => ({...previous, price:value}))}/></Field></div><Field label="Diskon Item (Rp)"><MoneyInput max={Math.max(0, form.price * form.qty)} value={form.itemDiscount} onValueChange={value => setForm(previous => ({...previous,itemDiscount:value}))}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Modifier/Tambahan"><Input value={form.modifierName || ''} onChange={event => setForm(previous => ({...previous,modifierName:event.target.value,modifiers:event.target.value?[{name:event.target.value,amount:Number(previous.modifierAmount||0)}]:[]}))} placeholder="Contoh: Potong kabel"/></Field><Field label="Biaya Tambahan"><MoneyInput value={form.modifierAmount || 0} onValueChange={amount => setForm(previous => ({...previous,modifierAmount:amount,price:Number(previous.basePrice||0)+amount,modifiers:previous.modifierName?[{name:previous.modifierName,amount}]:[]}))}/></Field></div><Field label="Catatan Item"><Textarea value={form.note} onChange={event => setForm(previous => ({...previous,note:event.target.value}))} placeholder="Contoh: potong 2 meter, warna putih..."/></Field></div></Modal>;
}

function PaymentModal({ total, methods, onClose, onConfirm }) {
  const firstMethod = methods[0] || { id: 'cash', type: 'cash', name: 'Tunai' };
  const [payments, setPayments] = useState([{ id: generateId('PAYLINE'), methodId: firstMethod.id, type: firstMethod.type, name: firstMethod.name, amount: total, dueDate: '', reference: '' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const paid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const add = () => {
    const method = methods[0] || firstMethod;
    setPayments(previous => [...previous, {
      id: generateId('PAYLINE'), methodId: method.id, type: method.type, name: method.name,
      amount: Math.max(0, total - paid), dueDate: '', reference: ''
    }]);
  };

  const update = (id, patch) => setPayments(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item));

  const submit = async () => {
    if (submitting) return;
    try {
      setError('');
      if (payments.some(payment => Number(payment.amount || 0) <= 0)) throw new Error('Semua nominal pembayaran harus lebih dari Rp 0.');
      if (paid < total) throw new Error('Jumlah pembayaran belum mencukupi total tagihan.');
      if (payments.some(payment => payment.type === 'credit' && !payment.dueDate)) throw new Error('Pembayaran tempo wajib memiliki tanggal jatuh tempo.');
      if (paid > total && !payments.some(payment => payment.type === 'cash')) throw new Error('Pembayaran non-tunai tidak boleh melebihi total tagihan.');
      setSubmitting(true);
      await onConfirm(payments);
    } catch (err) {
      setError(err.message || 'Transaksi gagal diproses.');
      setSubmitting(false);
    }
  };

  return <Modal title="Pembayaran & Split Payment" onClose={submitting ? undefined : onClose} size="lg" footer={<><Button variant="secondary" onClick={onClose} disabled={submitting}>Batal</Button><Button variant="orange" onClick={submit} disabled={submitting}>{submitting ? 'Memproses...' : 'Selesaikan Transaksi'}</Button></>}><div className="space-y-4"><Card className="p-4 bg-emerald-50 border-emerald-100 text-center"><p className="text-xs font-bold text-emerald-800">Total Tagihan</p><p className="text-3xl font-black text-emerald-700">{formatRp(total)}</p><p className={`text-sm font-bold mt-1 ${paid>=total?'text-emerald-700':'text-orange-600'}`}>Terbayar {formatRp(paid)} · Sisa {formatRp(Math.max(0,total-paid))}</p></Card>{error&&<p className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold">{error}</p>}<div className="space-y-3">{payments.map(payment=><Card key={payment.id} className="p-3"><div className="flex gap-2 items-start"><div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2"><Select value={payment.methodId} onChange={event=>{const method=methods.find(item=>item.id===event.target.value);if(method)update(payment.id,{methodId:method.id,type:method.type,name:method.name,amount:Math.max(0,total-(paid-payment.amount)),dueDate:method.type==='credit'?payment.dueDate:'',reference:''});}}>{methods.map(method=><option key={method.id} value={method.id}>{method.name}</option>)}</Select><MoneyInput value={payment.amount} onValueChange={amount=>update(payment.id,{amount})} placeholder="Nominal"/>{payment.type==='credit'&&<Input type="date" value={payment.dueDate} onChange={event=>update(payment.id,{dueDate:event.target.value})}/>} {payment.type!=='cash'&&payment.type!=='credit'&&<Input value={payment.reference} onChange={event=>update(payment.id,{reference:event.target.value})} placeholder="Nomor referensi (opsional)"/>}</div>{payments.length>1&&<button onClick={()=>setPayments(previous=>previous.filter(item=>item.id!==payment.id))} disabled={submitting} className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><X size={18}/></button>}</div></Card>)}</div><Button variant="secondary" onClick={add} className="w-full" disabled={submitting}><Plus size={18}/> Tambah Metode Pembayaran</Button>{payments.some(item=>item.type==='cash')&&paid>total&&<Card className="p-3 bg-orange-50 text-orange-700 text-center font-bold">Kembalian: {formatRp(paid-total)}</Card>}</div></Modal>;
}

function SplitBillModal({ cart, onClose, onSplit }) {
  const [name, setName] = useState('Tagihan Terpisah');
  const [selections, setSelections] = useState(Object.fromEntries(cart.map(line => [line.lineId, 0])));
  const submit = () => { try { onSplit({ name, selections }); } catch (error) { alert(error.message); } };
  return <Modal title="Pisah Tagihan / Split Bill" onClose={onClose} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Simpan Tagihan Terpisah</Button></>}><Field label="Nama Tagihan"><Input value={name} onChange={event => setName(event.target.value)}/></Field><div className="mt-4 space-y-2">{cart.map(line => <Card key={line.lineId} className="p-3 grid grid-cols-[1fr_100px] gap-3 items-center"><div><p className="font-bold text-sm">{line.name}</p><p className="text-xs text-gray-500">Tersedia di tagihan: {line.qty} {line.unit}</p></div><Input type="number" min="0" max={line.qty} value={selections[line.lineId]} onChange={event => setSelections(previous => ({ ...previous, [line.lineId]: Math.min(line.qty, Math.max(0, Number(event.target.value || 0))) }))}/></Card>)}</div></Modal>;
}

function HoldModal({ defaultName, onClose, onSave }) { const [name,setName]=useState(defaultName?`Tagihan ${defaultName}`:'Tagihan Baru'); return <Modal title="Simpan Open Bill" onClose={onClose} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={()=>onSave(name)} disabled={!name.trim()}>Simpan</Button></>}><Field label="Nama Tagihan"><Input value={name} onChange={event=>setName(event.target.value)} autoFocus/></Field></Modal>; }

function CustomItemModal({ onClose, onAdd }) { const [name,setName]=useState('Item Kustom'); const [price,setPrice]=useState(0); return <Modal title="Nominal / Item Kustom" onClose={onClose} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={()=>onAdd({lineId:generateId('LINE'),productId:`CUSTOM-${Date.now()}`,name,category:'Kustom',sku:'CUSTOM',barcode:'',qty:1,baseQty:1,unit:'item',factor:1,price:Number(price),modalPrice:0,itemDiscount:0,note:'',variant:'',modifiers:[],bundleItems:[]})} disabled={!name||Number(price)<=0}>Tambah</Button></>}><div className="space-y-3"><Field label="Nama"><Input value={name} onChange={event=>setName(event.target.value)}/></Field><Field label="Nominal"><MoneyInput value={price} onValueChange={setPrice} autoFocus/></Field></div></Modal>; }

function ScannerModal({ products, onClose, onDetected }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [cameraStatus, setCameraStatus] = useState('idle');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const detectedRef = useRef(false);

  const stopCamera = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  useEffect(() => stopCamera, []);

  const resolveProduct = rawCode => {
    const normalized = String(rawCode || '').trim();
    const product = products.find(item =>
      String(item.barcode || '') === normalized ||
      String(item.sku || '').toLowerCase() === normalized.toLowerCase() ||
      item.variants?.some(variant => String(variant.barcode || '') === normalized)
    );
    if (!product) {
      setError(`Barcode/SKU "${normalized}" tidak ditemukan.`);
      return false;
    }
    detectedRef.current = true;
    stopCamera();
    onDetected(product);
    return true;
  };

  const find = () => resolveProduct(code);

  const startCamera = async () => {
    try {
      setError('');
      detectedRef.current = false;
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera browser tidak tersedia.');
      setCameraStatus('starting');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus('active');

      if (!('BarcodeDetector' in window)) {
        setError('Pemindaian otomatis belum didukung browser ini. Kamera aktif; gunakan scanner fisik atau masukkan kode manual.');
        return;
      }

      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'] });
      const scanFrame = async () => {
        if (detectedRef.current || !videoRef.current || !streamRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const value = results?.[0]?.rawValue;
          if (value) {
            setCode(value);
            if (resolveProduct(value)) return;
          }
        } catch (scanError) {
          // Beberapa perangkat gagal mendeteksi saat video belum siap; coba lagi pada frame berikutnya.
        }
        frameRef.current = requestAnimationFrame(scanFrame);
      };
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      setCameraStatus('error');
      setError(err.message || 'Kamera tidak dapat dibuka.');
      stopCamera();
    }
  };

  const close = () => { stopCamera(); onClose(); };

  return (
    <Modal title="Scan Barcode" onClose={close} size="md">
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl bg-black aspect-video">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
          {cameraStatus !== 'active' && <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">Kamera belum aktif</div>}
          {cameraStatus === 'active' && <div className="absolute inset-x-8 top-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,.9)]"/>}
        </div>
        <Button variant="secondary" onClick={startCamera} className="w-full" disabled={cameraStatus === 'starting'}>
          <ScanLine size={18}/> {cameraStatus === 'starting' ? 'Membuka Kamera...' : 'Aktifkan Kamera'}
        </Button>
        <p className="text-xs text-gray-500">Mendukung BarcodeDetector bila tersedia. Scanner USB/Bluetooth yang bekerja sebagai keyboard dapat langsung mengisi kolom di bawah.</p>
        <div className="flex gap-2">
          <Input value={code} onChange={event => setCode(event.target.value)} onKeyDown={event => event.key === 'Enter' && find()} placeholder="Ketik/scan barcode atau SKU" autoFocus/>
          <Button onClick={find}>Cari</Button>
        </div>
        {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
      </div>
    </Modal>
  );
}

function ReceiptModal({ sale, configs, onClose }) {
  const print = () => window.print();
  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4 receipt-overlay">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden print-area">
        <div className="p-5 text-center border-b border-dashed">
          <h3 className="font-black">{configs.companyName}</h3>
          <p className="text-xs">{configs.address}</p>
          <p className="text-xs mt-2">{sale.id}</p>
          <p className="text-xs">{new Date(sale.createdAt).toLocaleString('id-ID')}</p>
        </div>
        <div className="p-5 text-sm max-h-[55vh] overflow-y-auto">
          <p className="font-bold mb-3">Pelanggan: {sale.customerName}</p>
          {sale.items.map(line => (
            <div key={line.lineId} className="mb-2 flex justify-between gap-3">
              <div>
                <p className="font-bold">{line.name}</p>
                <p className="text-xs">
                  {line.qty} {line.unit} x {formatRp(line.price)}
                  {line.itemDiscount > 0 ? ` - diskon ${formatRp(line.itemDiscount)}` : ''}
                </p>
                {line.modifiers?.length > 0 && (
                  <p className="text-xs">+ {line.modifiers.map(modifier => modifier.name).join(', ')}</p>
                )}
              </div>
              <b>{formatRp(line.price * line.qty - line.itemDiscount)}</b>
            </div>
          ))}
          <div className="border-t border-dashed pt-3 mt-3 space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatRp(sale.subtotal)}</span></div>
            {sale.globalDiscount > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{formatRp(sale.globalDiscount)}</span></div>}
            {sale.promoDiscount > 0 && <div className="flex justify-between"><span>Promo</span><span>-{formatRp(sale.promoDiscount)}</span></div>}
            {sale.loyaltyDiscount > 0 && <div className="flex justify-between"><span>Reward Poin</span><span>-{formatRp(sale.loyaltyDiscount)}</span></div>}
            {sale.tax > 0 && <div className="flex justify-between"><span>Pajak</span><span>{formatRp(sale.tax)}</span></div>}
            {sale.service > 0 && <div className="flex justify-between"><span>Service</span><span>{formatRp(sale.service)}</span></div>}
            <div className="flex justify-between text-lg font-black border-t pt-2"><span>TOTAL</span><span>{formatRp(sale.total)}</span></div>
          </div>
          <div className="border-t border-dashed mt-3 pt-3">
            {sale.payments.map(payment => (
              <div key={payment.id} className="flex justify-between"><span>{payment.name}</span><span>{formatRp(payment.amount)}</span></div>
            ))}
          </div>
          <p className="text-center text-xs mt-5">{configs.receiptFooter}</p>
        </div>
        <div className="p-3 bg-gray-100 flex gap-2 print-controls">
          <Button variant="secondary" onClick={onClose} className="flex-1">Tutup</Button>
          <Button onClick={print} className="flex-1"><Printer size={18}/> Cetak</Button>
        </div>
      </div>
    </div>
  );
}

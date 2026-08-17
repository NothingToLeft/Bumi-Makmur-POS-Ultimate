import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScanLine, ShoppingCart, Plus, Minus, Trash2, Package, Save, ReceiptText, Star, User, SlidersHorizontal, QrCode, CreditCard, Banknote, WalletCards, Printer, X, MessageCircle, Copy, Share2, CheckCircle2 } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { formatRp, generateId } from '../utils/helpers.js';
import {
  formatQuantity, normalizeQuantity, normalizeQuantityStep, quickQuantityOptions, quantityStepLabel,
  priceForSaleUnit, saleUnitOptions
} from '../utils/fractionalUnits.js';
import { Badge, Button, Card, Field, Input, Modal, MoneyInput, SearchBox, Select, Textarea } from '../components/ui.jsx';
import { copyReceiptText, getReceiptLogo, openWhatsappReceipt, shareReceipt } from '../services/receiptShare.js';
import { findProductByCode, isEditableTarget } from '../utils/barcode.js';
import BarcodeScannerModal from '../components/BarcodeScannerModal.jsx';
import { sortProductsByName } from '../utils/productCatalog.js';

const priceFor = (product, tier) => Number(product.prices?.[tier] ?? product.prices?.retail ?? 0);
const roundTotal = (total, step) => step > 0 ? Math.round(total / step) * step : Math.round(total);

export default function POSScreen() {
  const { db, scoped, completeSale, holdSale, findOpenShift, setCustomerDisplay, currentUser, branch, authorizeManagerPin } = usePos();
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
  const [barcodeChoices, setBarcodeChoices] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [discountApproval, setDiscountApproval] = useState(null);
  const [heldSaleId, setHeldSaleId] = useState(null);
  const [scanNotice, setScanNotice] = useState('');
  const scannerBufferRef = useRef('');
  const scannerLastKeyAtRef = useRef(0);
  const scannerBufferTimerRef = useRef(null);
  const scanNoticeTimerRef = useRef(null);
  const searchInputRef = useRef(null);

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

  const filtered = useMemo(() => sortProductsByName(scoped.products.filter(product => {
    const term = search.toLowerCase();
    return product.active !== false && product.available !== false &&
      (category === 'Semua' || product.category === category) && (!favoritesOnly || product.favorite) &&
      (!term || product.name.toLowerCase().includes(term) || String(product.parentName || '').toLowerCase().includes(term) || String(product.variantName || '').toLowerCase().includes(term) || String(product.sku || '').toLowerCase().includes(term) || String(product.barcode || '').toLowerCase().includes(term) || String(product.sharedBarcode || '').toLowerCase().includes(term));
  })), [scoped.products, search, category, favoritesOnly]);

  const customer = scoped.customers.find(item => item.id === customerId) || scoped.customers[0];
  const branchPaymentProfile = scoped.paymentProfile || null;
  const paymentDisplayConfig = {
    ...db.configs,
    qrisImage: branchPaymentProfile?.qrisImage || db.configs.qrisImage || '',
    qrisMerchantName: branchPaymentProfile?.merchantName || db.configs.qrisMerchantName || db.configs.companyName,
    qrisInstruction: branchPaymentProfile?.qrisInstruction || db.configs.qrisInstruction
  };
  const receiptDisplayConfig = { ...db.configs, companyName: branch?.name || db.configs.companyName, address: branch?.address || db.configs.address, phone: branch?.phone || db.configs.phone };
  const activePaymentMethods = (db.configs.paymentMethods || []).filter(item => item.active && (item.id !== 'qris' || branchPaymentProfile?.enabled !== false));
  useEffect(() => { if (customer?.priceTier && cart.length === 0) setSaleType(customer.priceTier); }, [customerId]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + (Number(line.price) * Number(line.qty)) - Number(line.itemDiscount || 0), 0);
    const loyaltyDiscount = Math.min(Math.max(0, Number(pointsRedeemed || 0)) * Number(db.configs.pointValue || 0), Math.max(0, subtotal - Number(globalDiscount || 0)));
    const afterDiscount = Math.max(0, subtotal - Number(globalDiscount || 0) - loyaltyDiscount);
    const tax = db.configs.taxEnabled ? afterDiscount * (Number(db.configs.taxRate || 0) / 100) : 0;
    const service = db.configs.serviceEnabled ? afterDiscount * (Number(db.configs.serviceRate || 0) / 100) : 0;
    const raw = afterDiscount + tax + service;
    const total = roundTotal(raw, Number(db.configs.roundingStep || 0));
    return { subtotal, promoDiscount: 0, appliedPromo: null, loyaltyDiscount, afterDiscount, tax: Math.round(tax), service: Math.round(service), rounding: total - Math.round(raw), total };
  }, [cart, globalDiscount, pointsRedeemed, db.configs]);

  useEffect(() => {
    setCustomerDisplay({ cart, total: totals.total, customerName: customer?.name || 'Umum', message: notes });
  }, [cart, totals.total, customer?.name, notes, setCustomerDisplay]);

  useEffect(() => {
    if (!receipt || !db.configs.printAuto) return undefined;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [receipt, db.configs.printAuto]);

  const addProduct = (product, options = {}) => {
    const conversion = product.conversions?.find(item => item.unit === options.unit);
    const factor = conversion ? Number(conversion.factor) : 1;
    const unit = options.unit || product.baseUnit;
    const quantityStep = unit === product.baseUnit ? normalizeQuantityStep(product.quantityStep, product.allowFractional === true) : 1;
    const qty = normalizeQuantity(options.qty || quantityStep, { allowFractional: quantityStep < 1, step: quantityStep, min: quantityStep });
    const price = options.price ?? priceForSaleUnit(product, unit, saleType);
    const line = {
      lineId: generateId('LINE'), productId: product.id, name: product.name, category: product.category, sku: product.sku, barcode: product.barcode,
      qty, baseQty: qty * factor, unit, factor, quantityStep, allowFractional: product.allowFractional === true && unit === product.baseUnit,
      basePrice: Math.round(price), modifierAmount: 0, price: Math.round(price), modalPrice: Number(product.modalPrice || 0) * factor,
      itemDiscount: 0, note: '', variant: options.variant || product.variants?.[0]?.name || '', variantName: product.variantName || '',
      variantGroupId: product.variantGroupId || '', sharedBarcode: product.sharedBarcode || '', parentName: product.parentName || '',
      modifiers: [], bundleItems: product.bundleItems || []
    };
    setCart(previous => {
      const existing = previous.find(item => item.productId === line.productId && item.unit === line.unit && item.variant === line.variant && !item.note && !item.itemDiscount);
      if (existing) return previous.map(item => item.lineId === existing.lineId ? { ...item, qty: Math.round((item.qty + qty) * 1000) / 1000, baseQty: Math.round((item.baseQty + qty * factor) * 1000) / 1000 } : item);
      return [...previous, line];
    });
  };

  const addCodeToCart = rawCode => {
    const normalizedCode = String(rawCode || '').trim();
    const result = findProductByCode(scoped.products, normalizedCode);
    if (!result) {
      const message = `Barcode/SKU "${normalizedCode}" tidak ditemukan.`;
      setScanNotice(message);
      return { ok: false, message };
    }
    if (result.ambiguous) {
      const message = `Barcode ditemukan pada ${result.matches?.length || 0} varian. Pilih watt/ukuran yang benar.`;
      setBarcodeChoices({ code: normalizedCode, matches: result.matches || [] });
      setScanNotice(message);
      return { ok: true, close: true, message };
    }
    const tierPrice = priceFor(result.product, saleType);
    const options = { ...result.options };
    if (options.unit) {
      options.price = priceForSaleUnit(result.product, options.unit, saleType);
    } else if (options.variant) {
      const variant = result.product.variants?.find(item => item.name === options.variant);
      options.price = tierPrice + Number(variant?.priceDelta || 0);
    }
    addProduct(result.product, options);
    setSearch('');
    const message = `${result.product.name} ditambahkan ke keranjang.`;
    setScanNotice(message);
    window.clearTimeout(scanNoticeTimerRef.current);
    scanNoticeTimerRef.current = window.setTimeout(() => setScanNotice(''), 2200);
    return { ok: true, message };
  };

  useEffect(() => {
    const handleDesktopShortcuts = event => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'F2') { event.preventDefault(); searchInputRef.current?.focus(); searchInputRef.current?.select(); return; }
      if (event.key === 'F4') { event.preventDefault(); if (cart.length && !paymentOpen) setPaymentOpen(true); return; }
      if (event.key === 'F8') { event.preventDefault(); if (cart.length && !holdOpen) setHoldOpen(true); return; }
      if (event.key === 'F9') { event.preventDefault(); if (!scannerOpen) setScannerOpen(true); return; }
      if (event.key === 'Escape') {
        if (paymentOpen) setPaymentOpen(false);
        else if (holdOpen) setHoldOpen(false);
        else if (splitOpen) setSplitOpen(false);
        else if (scannerOpen) setScannerOpen(false);
        else if (customOpen) setCustomOpen(false);
        else if (editingLine) setEditingLine(null);
        else if (barcodeChoices) setBarcodeChoices(null);
        else if (choosingProduct) setChoosingProduct(null);
        else if (mobileCart) setMobileCart(false);
      }
    };
    window.addEventListener('keydown', handleDesktopShortcuts);
    return () => window.removeEventListener('keydown', handleDesktopShortcuts);
  }, [cart.length, paymentOpen, holdOpen, splitOpen, scannerOpen, customOpen, editingLine, choosingProduct, barcodeChoices, mobileCart]);

  useEffect(() => {
    const resetBufferSoon = () => {
      window.clearTimeout(scannerBufferTimerRef.current);
      scannerBufferTimerRef.current = window.setTimeout(() => { scannerBufferRef.current = ''; }, 180);
    };
    const handleScannerKeyboard = event => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) return;
      if (paymentOpen || holdOpen || splitOpen || scannerOpen || customOpen || editingLine || choosingProduct || barcodeChoices || receipt) return;
      const now = performance.now();
      if (now - scannerLastKeyAtRef.current > 120) scannerBufferRef.current = '';
      scannerLastKeyAtRef.current = now;
      if (event.key === 'Escape') { scannerBufferRef.current = ''; return; }
      if (event.key === 'Enter') {
        const code = scannerBufferRef.current.trim();
        scannerBufferRef.current = '';
        if (code.length >= 3) {
          event.preventDefault();
          addCodeToCart(code);
        }
        return;
      }
      if (event.key.length === 1 && !/\s/.test(event.key)) {
        scannerBufferRef.current += event.key;
        resetBufferSoon();
      }
    };
    window.addEventListener('keydown', handleScannerKeyboard);
    return () => {
      window.removeEventListener('keydown', handleScannerKeyboard);
      window.clearTimeout(scannerBufferTimerRef.current);
      window.clearTimeout(scanNoticeTimerRef.current);
    };
  }, [scoped.products, saleType, paymentOpen, holdOpen, splitOpen, scannerOpen, customOpen, editingLine, choosingProduct, barcodeChoices, receipt]);

  const updateLine = updated => setCart(previous => previous.map(line => line.lineId === updated.lineId ? updated : line));
  const changeQty = (lineId, direction) => setCart(previous => previous.map(line => {
    if (line.lineId !== lineId) return line;
    const step = Number(line.quantityStep || 1);
    const qty = Math.max(0, Math.round((Number(line.qty || 0) + direction * step) * 1000) / 1000);
    return { ...line, qty, baseQty: Math.max(0, Math.round(qty * Number(line.factor || 1) * 1000) / 1000) };
  }).filter(line => line.qty > 0));
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
      const step = Math.max(0.001, Number(line.quantityStep || 1));
      const requestedQty = Math.min(Number(selections[line.lineId] || 0), Number(line.qty));
      const splitQty = Math.round(requestedQty / step) * step;
      if (splitQty > 0) splitItems.push({ ...line, qty: splitQty, baseQty: (line.baseQty / line.qty) * splitQty });
      const remainQty = Math.round((line.qty - splitQty) * 1000) / 1000;
      if (remainQty > 0) remaining.push({ ...line, qty: remainQty, baseQty: (line.baseQty / line.qty) * remainQty });
    }
    if (!splitItems.length) throw new Error('Pilih minimal satu item untuk dipisah.');
    holdSale({ name, customerId, customerName: customer?.name || 'Umum', saleType, globalDiscount: 0, pointsRedeemed: 0, note: `Hasil split dari ${heldSaleId || 'keranjang'}`, items: splitItems });
    setCart(remaining); setSplitOpen(false);
  };

  const finalizePayment = async (payments, approval = null) => {
    const paid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const credit = payments.find(item => item.type === 'credit');
    if (paid < totals.total) throw new Error('Jumlah pembayaran belum mencukupi.');
    if (credit && !credit.dueDate) throw new Error('Pembayaran tempo wajib memiliki tanggal jatuh tempo.');
    const sale = completeSale({
      items: cart.map(line => ({ ...line, netUnitPrice: Math.max(0, line.price - Number(line.itemDiscount || 0) / Math.max(0.001, Number(line.qty) || 1)) })),
      customerId: customer?.id, customerName: customer?.name || 'Umum', customerPhone: customer?.phone || '', cashierName: currentUser?.name || 'Kasir', saleType, notes, globalDiscount: Number(globalDiscount || 0),
      promoDiscount: 0, appliedPromos: [],
      loyaltyDiscount: totals.loyaltyDiscount, subtotal: Math.round(totals.subtotal), tax: totals.tax, service: totals.service, rounding: totals.rounding, total: totals.total,
      payments, change: Math.max(0, paid - totals.total), heldSaleId, pointsRedeemed: Number(pointsRedeemed || 0),
      approvedBy: approval?.user?.id || '', approvedByName: approval?.user?.name || '', approvalToken: approval?.approvalToken || ''
    });
    setReceipt(sale); setPaymentOpen(false); setDiscountApproval(null); setMobileCart(false); clear();
  };

  const processPayment = async payments => {
    const totalDiscount = cart.reduce((sum, line) => sum + Number(line.itemDiscount || 0), 0) + Number(globalDiscount || 0);
    const discountPercent = totals.subtotal > 0 ? (totalDiscount / totals.subtotal) * 100 : 0;
    const limit = currentUser?.role === 'kasir' ? Number(db.configs.cashierMaxDiscountPercent ?? 5) : Number(db.configs.managerMaxDiscountPercent ?? 20);
    if (currentUser?.role !== 'owner' && discountPercent > limit) {
      setPaymentOpen(false);
      setDiscountApproval({ payments, discountPercent, limit, amount: totalDiscount });
      return;
    }
    await finalizePayment(payments);
  };

  const cartPanel = (
    <div className="h-full flex flex-col bg-white card-element">
      <div className="p-3 border-b border-gray-100 space-y-2">
        <div className="flex gap-2"><Select value={customerId} onChange={event => setCustomerId(event.target.value)} className="text-sm"><option value="">Pelanggan Umum</option>{scoped.customers.filter(item => item.active !== false).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select value={saleType} onChange={event => setSaleType(event.target.value)} className="w-32 text-sm"><option value="retail">Eceran</option><option value="wholesale">Grosir</option><option value="project">Proyek</option></Select></div>
        <Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Catatan pesanan / alamat pengiriman..." className="min-h-[58px] text-sm"/>
        {db.configs.loyaltyEnabled && customer && customer.name !== 'Umum (Non-Member)' && <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-yellow-50 border border-yellow-100 text-xs"><span className="font-bold text-yellow-800">Poin tersedia: {customer.points || 0}</span><div className="flex items-center gap-1"><span>Tukar</span><Input type="number" min="0" max={customer.points || 0} value={pointsRedeemed} onChange={event => setPointsRedeemed(Math.min(Number(customer.points || 0), Math.max(0, Number(event.target.value || 0))))} className="w-20 min-h-[36px] py-1 text-right"/></div></div>}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-gray-400"><ShoppingCart size={48} className="mb-3 opacity-40"/><p className="font-bold">Keranjang kosong</p><p className="text-xs mt-1">Pilih produk untuk mulai transaksi</p></div> : cart.map(line => <Card key={line.lineId} className="p-3 bg-gray-50 input-element"><div className="flex justify-between gap-2"><div className="min-w-0"><p className="font-bold text-xs text-gray-800 line-clamp-2">{line.name}</p><p className="text-[10px] text-gray-500">{line.variant ? `${line.variant} · ` : ''}{line.unit} · {formatRp(line.price)}</p>{line.note && <p className="text-[10px] text-blue-600 mt-1">Catatan: {line.note}</p>}</div><p className="font-bold text-xs shrink-0">{formatRp(line.price * line.qty - line.itemDiscount)}</p></div><div className="flex items-center justify-between mt-3"><div className="flex gap-1"><button onClick={() => setEditingLine(line)} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><SlidersHorizontal size={16}/></button><button onClick={() => setCart(previous => previous.filter(item => item.lineId !== line.lineId))} className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center"><Trash2 size={16}/></button></div><div className="flex items-center gap-2 bg-white border rounded-xl p-1"><button onClick={() => changeQty(line.lineId,-1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Minus size={14}/></button><span className="min-w-10 text-center font-bold text-sm">{formatQuantity(line.qty)}</span><button onClick={() => changeQty(line.lineId,1)} className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Plus size={14}/></button></div></div></Card>)}
      </div>
      <div className="p-4 border-t border-gray-100 shadow-[0_-4px_15px_rgba(0,0,0,.04)] space-y-2 pb-safe">
        <div className="flex justify-between text-sm"><span>Subtotal</span><b>{formatRp(totals.subtotal)}</b></div>
        <div className="flex items-center justify-between gap-2 text-sm"><span>Diskon Transaksi</span><MoneyInput max={Math.max(0, totals.subtotal)} value={globalDiscount} onValueChange={setGlobalDiscount} className="w-32 min-h-[40px] py-1 text-right"/></div>
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
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-bold text-gray-500 desktop-shortcut-strip"><span>Shortcut:</span><kbd>F2</kbd><span>Cari</span><kbd>F4</kbd><span>Bayar</span><kbd>F8</kbd><span>Tahan</span><kbd>F9</kbd><span>Scan</span><kbd>Esc</kbd><span>Tutup</span></div>
          <div className="flex gap-2">
            <SearchBox
              value={search}
              onChange={setSearch}
              inputProps={{ ref: searchInputRef }}
              placeholder="Cari nama, SKU, atau barcode..."
              onKeyDown={event => {
                if (event.key !== 'Enter') return;
                const exact = findProductByCode(scoped.products, search);
                if (!exact) return;
                event.preventDefault();
                addCodeToCart(search);
              }}
            />
            <Button variant="secondary" onClick={() => setScannerOpen(true)} className="px-3" aria-label="Buka pemindai barcode"><ScanLine size={20}/></Button>
            <Button variant="secondary" onClick={() => setCustomOpen(true)} className="px-3" aria-label="Tambah item manual"><Plus size={20}/></Button>
          </div>
          {scanNotice && <div className={`text-xs font-bold px-3 py-2 rounded-xl ${scanNotice.includes('tidak ditemukan') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>{scanNotice}</div>}
          <div className="flex gap-2 overflow-x-auto no-scrollbar"><button onClick={() => setFavoritesOnly(value => !value)} className={`min-h-[40px] px-3 rounded-full border font-bold text-xs flex items-center gap-1 ${favoritesOnly ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-white text-gray-600 border-gray-200'}`}><Star size={15} fill={favoritesOnly?'currentColor':'none'}/> Favorit</button>{['Semua', ...db.categories].map(item => <button key={item} onClick={() => setCategory(item)} className={`min-h-[40px] px-4 rounded-full border font-bold text-xs whitespace-nowrap ${category === item ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-white text-gray-600 border-gray-200'}`}>{item}</button>)}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar pb-28 md:pb-4"><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">{filtered.map(product => <button key={product.id} onClick={() => (product.allowFractional || product.variants?.length > 1 || product.conversions?.length > 0) ? setChoosingProduct(product) : addProduct(product)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-left card-element active:scale-[.98]"><div className="aspect-square rounded-xl bg-gray-100 img-placeholder flex items-center justify-center mb-2 relative"><Package size={30} className="text-gray-400"/>{product.favorite && <Star size={16} fill="currentColor" className="absolute top-2 right-2 text-yellow-500"/>}{product.bundleItems?.length > 0 && <Badge tone="purple">Paket</Badge>}</div><p className="font-bold text-xs text-gray-800 line-clamp-2 min-h-[32px]">{product.name}</p><p className="font-bold text-emerald-600 mt-2">{formatRp(priceFor(product,saleType))}</p><div className="flex justify-between text-[10px] text-gray-500 mt-1"><span>{formatQuantity(product.stock)} {product.baseUnit}</span><span>{product.rack}</span></div></button>)}</div></div>
        {cart.length > 0 && !mobileCart && <div className="md:hidden absolute left-4 right-4 bottom-[76px] z-30"><button onClick={() => setMobileCart(true)} className="w-full bg-emerald-800 text-white min-h-[64px] rounded-2xl shadow-xl px-4 flex justify-between items-center"><div className="flex gap-3 items-center"><ShoppingCart/><div className="text-left"><p className="text-[10px] text-emerald-200">{cart.reduce((sum,line)=>sum+line.qty,0)} item</p><p className="font-bold">{formatRp(totals.total)}</p></div></div><span className="font-bold text-sm">Lihat Keranjang</span></button></div>}
      </div>
      <div className="hidden md:block w-[340px] lg:w-[390px] border-l border-gray-200 shrink-0">{cartPanel}</div>
      {mobileCart && <div className="md:hidden absolute inset-0 z-40 bg-white flex flex-col"><div className="p-3 border-b flex items-center justify-between"><Button variant="ghost" onClick={() => setMobileCart(false)}>← Produk</Button><b>Keranjang</b><span/></div><div className="flex-1 min-h-0">{cartPanel}</div></div>}

      {choosingProduct && <ProductChoiceModal product={choosingProduct} saleType={saleType} onClose={() => setChoosingProduct(null)} onAdd={options => { addProduct(choosingProduct, options); setChoosingProduct(null); }}/>}      
      {editingLine && <LineEditModal line={editingLine} product={scoped.products.find(item => item.id === editingLine.productId)} saleType={saleType} onClose={() => setEditingLine(null)} onSave={line => { updateLine(line); setEditingLine(null); }}/>}      
      {paymentOpen && <PaymentModal total={totals.total} methods={activePaymentMethods} configs={paymentDisplayConfig} onClose={() => setPaymentOpen(false)} onConfirm={processPayment}/>}      
      {discountApproval && <DiscountApprovalModal approval={discountApproval} onClose={() => setDiscountApproval(null)} onApprove={async pin => { const approval = await authorizeManagerPin(pin, 'SALE_DISCOUNT'); await finalizePayment(discountApproval.payments, approval); }}/>}      
      {splitOpen && <SplitBillModal cart={cart} onClose={() => setSplitOpen(false)} onSplit={splitBill}/>}      
      {holdOpen && <HoldModal defaultName={customer?.name || ''} onClose={() => setHoldOpen(false)} onSave={saveBill}/>}      
      {scannerOpen && <BarcodeScannerModal title="Scan Barcode Kasir" allowContinuous onClose={() => setScannerOpen(false)} onDetected={addCodeToCart} helperText="Kamera mendukung pemilihan lensa depan/belakang, flash, zoom, dan scan dari foto. Untuk kasir cepat, aktifkan Mode Scan Cepat agar kamera tetap terbuka setelah barang masuk."/>}      
      {barcodeChoices && <VariantBarcodeChoiceModal code={barcodeChoices.code} matches={barcodeChoices.matches} saleType={saleType} onClose={() => setBarcodeChoices(null)} onSelect={match => { addProduct(match.product, match.options || {}); setBarcodeChoices(null); setScanNotice(`${match.product.name} ditambahkan ke keranjang.`); }}/>}      
      {customOpen && <CustomItemModal onClose={() => setCustomOpen(false)} onAdd={line => { setCart(previous => [...previous, line]); setCustomOpen(false); }}/>}      
      {receipt && <ReceiptModal sale={receipt} configs={receiptDisplayConfig} onClose={() => setReceipt(null)}/>}      
    </div>
  );
}


function DiscountApprovalModal({ approval, onClose, onApprove }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError('');
    try { await onApprove(pin); }
    catch (approvalError) { setError(approvalError.message || 'Approval gagal.'); }
    finally { setBusy(false); }
  };
  return <Modal title="Persetujuan Diskon" onClose={onClose} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit} disabled={busy || pin.length !== 4}>{busy ? 'Memeriksa...' : 'Setujui Diskon'}</Button></>}>
    <div className="space-y-4"><Card className="p-4 bg-orange-50 border-orange-200"><p className="font-black text-orange-900">Diskon {approval.discountPercent.toFixed(1)}%</p><p className="text-sm text-orange-800 mt-1">Batas akun ini {approval.limit}%. Nilai diskon {formatRp(approval.amount)} memerlukan PIN Owner atau Store Manager.</p></Card><Field label="PIN Owner / Store Manager"><Input type="password" inputMode="numeric" maxLength="4" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g,'').slice(0,4))} placeholder="••••" autoFocus/></Field>{error&&<p className="text-sm font-bold text-red-600">{error}</p>}</div>
  </Modal>;
}


function VariantBarcodeChoiceModal({ code, matches, saleType, onClose, onSelect }) {
  return <Modal title="Pilih Varian Produk" onClose={onClose} size="md">
    <div className="space-y-3">
      <Card className="p-3 bg-blue-50 border-blue-100"><p className="text-xs text-blue-700">Barcode kemasan bersama</p><p className="font-black text-blue-900 font-mono">{code}</p><p className="text-xs text-blue-700 mt-1">Pilih watt, ukuran, atau warna yang sedang dijual. Scan barcode internal/SKU untuk masuk langsung tanpa pilihan.</p></Card>
      <div className="space-y-2 max-h-[55vh] overflow-y-auto custom-scrollbar">
        {matches.map(match => {
          const product = match.product;
          const price = priceFor(product, saleType);
          const low = Number(product.stock || 0) <= Number(product.minStock || 0);
          return <button key={product.id} type="button" onClick={() => onSelect(match)} disabled={product.trackStock !== false && Number(product.stock || 0) <= 0} className="w-full rounded-2xl border bg-white p-4 text-left hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-black text-gray-900">{product.variantName || product.name}</p><p className="text-xs text-gray-500 mt-1">{product.parentName || product.name} · SKU {product.sku}</p><p className="text-[11px] text-gray-400 mt-1">Barcode internal {product.barcode}</p></div><div className="text-right shrink-0"><p className="font-black text-emerald-700">{formatRp(price)}</p><p className={`text-xs font-bold mt-1 ${low ? 'text-red-600' : 'text-blue-600'}`}>Stok {formatQuantity(product.stock)} {product.baseUnit}</p></div></div>
          </button>;
        })}
      </div>
    </div>
  </Modal>;
}

function ProductChoiceModal({ product, saleType, onClose, onAdd }) {
  const [variant, setVariant] = useState(product.variants?.[0]?.name || '');
  const [unit, setUnit] = useState(product.baseUnit);
  const [qty, setQty] = useState(product.allowFractional ? normalizeQuantityStep(product.quantityStep, true) : 1);
  const units = saleUnitOptions(product, saleType);
  const selectedUnit = units.find(item => item.unit === unit) || units[0];
  const factor = Number(selectedUnit?.factor || 1);
  const step = unit === product.baseUnit ? normalizeQuantityStep(product.quantityStep, product.allowFractional === true) : 1;
  const price = Number(selectedUnit?.price || priceForSaleUnit(product, unit, saleType));
  const safeQty = normalizeQuantity(qty, { allowFractional: step < 1, step, min: step });
  const baseQty = safeQty * factor;
  const quickOptions = quickQuantityOptions(step);
  const submit = () => onAdd({ variant, unit, price, qty: safeQty });
  return <Modal title="Pilih Jumlah & Satuan" onClose={onClose} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit} disabled={safeQty <= 0}>Tambah</Button></>}><div className="space-y-3"><div><p className="font-bold text-gray-800">{product.name}</p><p className="text-xs text-gray-500">Stok {formatQuantity(product.stock)} {product.baseUnit}</p></div>{product.variants?.length > 0 && <Field label="Varian"><Select value={variant} onChange={event => setVariant(event.target.value)}>{product.variants.map(item => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}</Select></Field>}<Field label="Satuan Jual"><Select value={unit} onChange={event => { const nextUnit = event.target.value; const nextStep = nextUnit === product.baseUnit && product.allowFractional ? normalizeQuantityStep(product.quantityStep, true) : 1; setUnit(nextUnit); setQty(nextStep); }}>{units.map(item => <option key={item.unit} value={item.unit}>{item.unit} · {item.factor === 1 ? `1 ${product.baseUnit}` : `${formatQuantity(item.factor)} ${product.baseUnit}`} · {formatRp(item.price)}</option>)}</Select></Field><Field label={`Jumlah (${unit})`} hint={step < 1 ? `${quantityStepLabel(step, unit)}. Jumlah yang diketik otomatis disesuaikan ke kelipatan ini.` : 'Gunakan jumlah satuan utuh.'}><Input type="number" inputMode="decimal" min={step} step={step} value={qty} onChange={event => setQty(event.target.value)} onBlur={() => setQty(safeQty)}/></Field>{step < 1 && <div><p className="text-[11px] font-bold text-gray-500 mb-2">Pilihan cepat</p><div className="grid grid-cols-3 gap-2">{quickOptions.map(value => <button key={value} type="button" onClick={() => setQty(value)} className={`min-h-[42px] rounded-xl border text-sm font-black ${Number(safeQty) === Number(value) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>{formatQuantity(value)} {unit}</button>)}</div></div>}<Card className="p-3 bg-emerald-50 text-center"><p className="text-xs text-emerald-700">{formatQuantity(safeQty)} {unit} = {formatQuantity(baseQty)} {product.baseUnit}</p><p className="text-xl font-black text-emerald-800">{formatRp(price * safeQty)}</p><p className="text-[11px] text-emerald-700">Harga per {unit}: {formatRp(price)}</p></Card></div></Modal>;
}

function LineEditModal({ line, product, saleType, onClose, onSave }) {
  const [form, setForm] = useState({ ...line, basePrice: line.basePrice ?? (line.price - Number(line.modifierAmount || 0)), modifierAmount: Number(line.modifierAmount || 0), modifierName: line.modifiers?.[0]?.name || '' });
  const changeUnit = unit => {
    const units = saleUnitOptions(product, saleType);
    const selectedUnit = units.find(item => item.unit === unit) || units[0];
    const factor = Number(selectedUnit?.factor || 1);
    const oldFactor = Number(form.factor || 1);
    setForm(previous => { const basePrice = Number(selectedUnit?.price || priceForSaleUnit(product, unit, saleType)); const quantityStep = unit === product?.baseUnit ? normalizeQuantityStep(product?.quantityStep, product?.allowFractional === true) : 1; const qty = normalizeQuantity(previous.qty, { allowFractional: quantityStep < 1, step: quantityStep, min: quantityStep }); return { ...previous, unit, factor, qty, quantityStep, allowFractional: unit === product?.baseUnit && product?.allowFractional === true, baseQty: qty * factor, basePrice, price: basePrice + Number(previous.modifierAmount || 0), modalPrice: Math.round(previous.modalPrice / oldFactor * factor) }; });
  };
  const save = () => {
    const step = Number(form.quantityStep || 1);
    const qty = normalizeQuantity(form.qty, { allowFractional: step < 1, step, min: step });
    onSave({ ...form, qty, baseQty: qty * Number(form.factor || 1) });
  };
  return <Modal title="Atur Item" onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={save}>Simpan</Button></>}><div className="space-y-4"><div><p className="font-bold text-gray-800">{line.name}</p><p className="text-xs text-gray-500">{line.sku}</p></div>{(product?.conversions?.length || 0) > 0 && <Field label="Satuan Jual"><Select value={form.unit} onChange={event => changeUnit(event.target.value)}>{saleUnitOptions(product, saleType).map(item => <option key={item.unit} value={item.unit}>{item.unit} · {formatQuantity(item.factor)} {product.baseUnit} · {formatRp(item.price)}</option>)}</Select></Field>}<div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Jumlah" hint={Number(form.quantityStep || 1) < 1 ? quantityStepLabel(form.quantityStep, form.unit) : ''}><Input type="number" inputMode="decimal" min={form.quantityStep || 1} step={form.quantityStep || 1} value={form.qty} onChange={event => setForm(previous => ({...previous, qty:event.target.value}))} onBlur={() => setForm(previous => { const qty = normalizeQuantity(previous.qty, { allowFractional: Number(previous.quantityStep || 1) < 1, step: previous.quantityStep || 1, min: previous.quantityStep || 1 }); return { ...previous, qty, baseQty: qty * Number(previous.factor || 1) }; })}/></Field><Field label="Harga per Satuan"><MoneyInput value={form.price} onValueChange={value => setForm(previous => ({...previous, price:value}))}/></Field></div><Field label="Diskon Item (Rp)"><MoneyInput max={Math.max(0, form.price * Number(form.qty || 0))} value={form.itemDiscount} onValueChange={value => setForm(previous => ({...previous,itemDiscount:value}))}/></Field><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Modifier/Tambahan"><Input value={form.modifierName || ''} onChange={event => setForm(previous => ({...previous,modifierName:event.target.value,modifiers:event.target.value?[{name:event.target.value,amount:Number(previous.modifierAmount||0)}]:[]}))} placeholder="Contoh: Potong kabel"/></Field><Field label="Biaya Tambahan"><MoneyInput value={form.modifierAmount || 0} onValueChange={amount => setForm(previous => ({...previous,modifierAmount:amount,price:Number(previous.basePrice||0)+amount,modifiers:previous.modifierName?[{name:previous.modifierName,amount}]:[]}))}/></Field></div><Field label="Catatan Item"><Textarea value={form.note} onChange={event => setForm(previous => ({...previous,note:event.target.value}))} placeholder="Contoh: potong 2 meter, warna putih..."/></Field></div></Modal>;
}

function PaymentModal({ total, methods, configs, onClose, onConfirm }) {
  const firstMethod = methods[0] || { id: 'cash', type: 'cash', name: 'Tunai', brand: 'cash' };
  const [payments, setPayments] = useState([{ id: generateId('PAYLINE'), methodId: firstMethod.id, type: firstMethod.type, name: firstMethod.name, brand: firstMethod.brand, amount: total, dueDate: '', reference: '' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const paid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const current = payments[0];

  const brandClass = {
    cash: 'payment-cash', qris: 'payment-qris', shopeepay: 'payment-shopeepay', ovo: 'payment-ovo',
    gopay: 'payment-gopay', dana: 'payment-dana', bank: 'payment-bank', card: 'payment-card', credit: 'payment-credit', other: 'payment-other'
  };
  const brandIcon = brand => {
    if (brand === 'cash') return Banknote;
    if (brand === 'qris') return QrCode;
    if (brand === 'bank') return WalletCards;
    if (brand === 'card') return CreditCard;
    return WalletCards;
  };

  const selectSingleMethod = method => {
    setError('');
    setPayments([{ id: generateId('PAYLINE'), methodId: method.id, type: method.type, name: method.name, brand: method.brand || method.id, amount: total, dueDate: '', reference: '' }]);
  };
  const add = () => {
    const method = methods.find(item => item.id === 'cash') || methods[0] || firstMethod;
    setPayments(previous => [...previous, {
      id: generateId('PAYLINE'), methodId: method.id, type: method.type, name: method.name, brand: method.brand || method.id,
      amount: Math.max(0, total - paid), dueDate: '', reference: ''
    }]);
  };
  const update = (id, patch) => setPayments(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item));
  const applyCashPreset = amount => update(current.id, { amount });

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

  const cashPresets = [...new Set([total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 20000) * 20000, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000])].filter(value => value >= total).slice(0, 5);
  return (
    <Modal title="Pembayaran Premium" onClose={submitting ? undefined : onClose} size="lg" footer={<><Button variant="secondary" onClick={onClose} disabled={submitting}>Batal</Button><Button variant="orange" onClick={submit} disabled={submitting}>{submitting ? 'Memproses...' : 'Selesaikan Transaksi'}</Button></>}>
      <div className="space-y-4">
        <Card className="premium-total-card p-5 text-center">
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-[.18em]">Total Tagihan</p>
          <p className="text-3xl md:text-4xl font-black text-emerald-800 mt-1">{formatRp(total)}</p>
          <p className={`text-sm font-bold mt-2 ${paid >= total ? 'text-emerald-700' : 'text-orange-600'}`}>Terbayar {formatRp(paid)} · Sisa {formatRp(Math.max(0, total - paid))}</p>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-2"><p className="font-black text-sm text-gray-800">Pilih pembayaran cepat</p><Badge tone="green">QR & E-Wallet</Badge></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {methods.map(method => { const Icon = brandIcon(method.brand || method.id); const active = payments.length === 1 && current?.methodId === method.id; return (
              <button key={method.id} onClick={() => selectSingleMethod(method)} className={`payment-method-card ${brandClass[method.brand || method.id] || 'payment-other'} ${active ? 'is-active' : ''}`}>
                <span className="payment-method-icon"><Icon size={21}/></span><span className="text-left min-w-0"><b className="block truncate">{method.name}</b><small>{method.type === 'digital' ? 'E-Wallet / QR' : method.type}</small></span>{active && <CheckCircle2 size={18} className="ml-auto shrink-0"/>}
              </button>
            )})}
          </div>
        </div>

        {error && <p className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-100">{error}</p>}

        {payments.length === 1 && current?.type === 'digital' && (
          <Card className="p-4 bg-gradient-to-br from-slate-950 to-emerald-950 text-white border-0 overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-emerald-400/20 blur-2xl"/>
            <div className="relative flex flex-col sm:flex-row items-center gap-4">
              <div className="w-40 h-40 bg-white rounded-2xl p-3 flex items-center justify-center shadow-xl shrink-0">
                {configs.qrisImage ? <img src={configs.qrisImage} alt="QRIS Bumi Makmur" className="w-full h-full object-contain rounded-xl"/> : <QrCode size={105} className="text-gray-900"/>}
              </div>
              <div className="text-center sm:text-left"><Badge tone="green">{current.name}</Badge><h3 className="font-black text-xl mt-2">{configs.qrisMerchantName || configs.companyName}</h3><p className="text-sm text-emerald-100 mt-2">{configs.qrisInstruction || 'Scan QR lalu konfirmasi pembayaran kepada kasir.'}</p><p className="text-xs text-white/60 mt-3">Nominal: {formatRp(current.amount)}</p></div>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {payments.map(payment => (
            <Card key={payment.id} className="p-3 premium-line-card">
              <div className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select value={payment.methodId} onChange={event => { const method = methods.find(item => item.id === event.target.value); if (method) update(payment.id, { methodId: method.id, type: method.type, name: method.name, brand: method.brand || method.id, amount: Math.max(0, total - (paid - payment.amount)), dueDate: method.type === 'credit' ? payment.dueDate : '', reference: '' }); }}>{methods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}</Select>
                  <MoneyInput value={payment.amount} onValueChange={amount => update(payment.id, { amount })} placeholder="Nominal"/>
                  {payment.type === 'credit' && <Input type="date" value={payment.dueDate} onChange={event => update(payment.id, { dueDate: event.target.value })}/>} 
                  {payment.type !== 'cash' && payment.type !== 'credit' && <Input value={payment.reference} onChange={event => update(payment.id, { reference: event.target.value })} placeholder="Nomor referensi / approval (opsional)"/>}
                </div>
                {payments.length > 1 && <button onClick={() => setPayments(previous => previous.filter(item => item.id !== payment.id))} disabled={submitting} className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><X size={18}/></button>}
              </div>
            </Card>
          ))}
        </div>

        {payments.length === 1 && current?.type === 'cash' && <div><p className="text-xs font-bold text-gray-500 mb-2">Nominal cepat</p><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{cashPresets.map(amount => <button key={amount} onClick={() => applyCashPreset(amount)} className={`min-h-[44px] rounded-xl border font-bold text-xs ${Number(current.amount) === amount ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200'}`}>{formatRp(amount)}</button>)}</div></div>}
        <Button variant="secondary" onClick={add} className="w-full" disabled={submitting}><Plus size={18}/> Split / Tambah Metode Pembayaran</Button>
        {payments.some(item => item.type === 'cash') && paid > total && <Card className="p-3 bg-orange-50 text-orange-700 text-center font-black border-orange-100">Kembalian: {formatRp(paid - total)}</Card>}
      </div>
    </Modal>
  );
}

function SplitBillModal({ cart, onClose, onSplit }) {
  const [name, setName] = useState('Tagihan Terpisah');
  const [selections, setSelections] = useState(Object.fromEntries(cart.map(line => [line.lineId, 0])));
  const submit = () => onSplit({ name, selections });
  const normalizeSelection = line => normalizeQuantity(selections[line.lineId], { allowFractional: Number(line.quantityStep || 1) < 1, step: line.quantityStep || 1, min: 0 });
  return <Modal title="Pisah Tagihan / Split Bill" onClose={onClose} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Simpan Tagihan Terpisah</Button></>}><Field label="Nama Tagihan"><Input value={name} onChange={event => setName(event.target.value)}/></Field><div className="mt-4 space-y-2">{cart.map(line => <Card key={line.lineId} className="p-3 grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3 items-center"><div><p className="font-bold text-sm">{line.name}</p><p className="text-xs text-gray-500">Tersedia di tagihan: {formatQuantity(line.qty)} {line.unit}</p>{Number(line.quantityStep || 1) < 1 && <p className="text-[11px] text-blue-600 font-bold">{quantityStepLabel(line.quantityStep, line.unit)}</p>}</div><Input type="number" inputMode="decimal" min="0" max={line.qty} step={line.quantityStep || 1} value={selections[line.lineId]} onChange={event => setSelections(previous => ({ ...previous, [line.lineId]: Math.min(line.qty, Math.max(0, Number(event.target.value || 0))) }))} onBlur={() => setSelections(previous => ({ ...previous, [line.lineId]: Math.min(line.qty, normalizeSelection(line)) }))}/></Card>)}</div></Modal>;
}

function CustomItemModal({ onClose, onAdd }) { const [name,setName]=useState('Item Kustom'); const [price,setPrice]=useState(0); return <Modal title="Nominal / Item Kustom" onClose={onClose} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={()=>onAdd({lineId:generateId('LINE'),productId:`CUSTOM-${Date.now()}`,name,category:'Kustom',sku:'CUSTOM',barcode:'',qty:1,baseQty:1,unit:'item',factor:1,price:Number(price),modalPrice:0,itemDiscount:0,note:'',variant:'',modifiers:[],bundleItems:[]})} disabled={!name||Number(price)<=0}>Tambah</Button></>}><div className="space-y-3"><Field label="Nama"><Input value={name} onChange={event=>setName(event.target.value)}/></Field><Field label="Nominal"><MoneyInput value={price} onValueChange={setPrice} autoFocus/></Field></div></Modal>; }

function ReceiptModal({ sale, configs, onClose }) {
  const receiptLogo = getReceiptLogo(configs);
  const [phone, setPhone] = useState(sale.customerPhone && sale.customerPhone !== '-' ? sale.customerPhone : '');
  const [notice, setNotice] = useState('');
  const print = () => window.print();
  const copy = async () => { try { await copyReceiptText(sale, configs); setNotice('Nota berhasil disalin.'); } catch { setNotice('Gagal menyalin nota.'); } };
  const whatsapp = async () => { try { const result=await openWhatsappReceipt(sale, configs, phone); setNotice(result.onlineReceiptUrl?'WhatsApp dibuka dengan link nota online.':'WhatsApp dibuka dengan nota teks.'); } catch { setNotice('Gagal membuka WhatsApp.'); } };
  const share = async () => { try { const native = await shareReceipt(sale, configs); setNotice(native ? 'Menu berbagi dibuka.' : 'Nota disalin karena menu berbagi tidak tersedia.'); } catch (error) { if (error?.name !== 'AbortError') setNotice('Gagal membuka menu berbagi.'); } };
  return (
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 receipt-overlay">
      <div className={`bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden print-area premium-receipt ${Number(configs.receiptPaperWidth)===58?'receipt-58':'receipt-80'}`}>
        <div className="receipt-premium-header p-5 text-center border-b border-dashed relative overflow-hidden">
          <div className="absolute inset-0 receipt-header-glow"/>
          <div className="relative">
            {receiptLogo && <img src={receiptLogo} alt="Logo BM" className="w-16 h-16 rounded-[1.15rem] object-contain bg-white shadow-xl ring-1 ring-emerald-100 mx-auto mb-3"/>}
            <p className="text-[10px] uppercase tracking-[.22em] font-bold text-emerald-700">{configs.receiptHeader || 'Nota Pembelian'}</p>
            <h3 className="font-black text-xl text-gray-900 mt-1">{configs.companyName}</h3>
            <p className="text-xs text-gray-600 mt-1">{configs.address}</p>
            {configs.receiptShowStorePhone !== false && configs.phone && <p className="text-xs text-gray-600">Telp: {configs.phone}</p>}
            <div className="mt-3 inline-flex px-3 py-1.5 rounded-full bg-white/80 border border-emerald-100 text-[10px] font-black text-emerald-800 shadow-sm">{sale.id}</div>
            <p className="text-[10px] text-gray-500 mt-2">{new Date(sale.createdAt).toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="p-5 text-sm max-h-[55vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
            {configs.receiptShowCustomer !== false && <div className="p-3 rounded-xl bg-gray-50"><span className="text-gray-500 block">Pelanggan</span><b className="text-gray-800">{sale.customerName}</b></div>}
            {configs.receiptShowCashier !== false && <div className="p-3 rounded-xl bg-gray-50"><span className="text-gray-500 block">Kasir</span><b className="text-gray-800">{sale.cashierName || '-'}</b></div>}
          </div>
          <div className="space-y-3">
            {sale.items.map(line => (
              <div key={line.lineId} className="flex justify-between gap-3 pb-2 border-b border-dashed border-gray-200">
                <div className="min-w-0"><p className="font-bold text-gray-900">{line.name}</p><p className="text-xs text-gray-500">{formatQuantity(line.qty)} {line.unit} × {formatRp(line.price)}{line.itemDiscount > 0 ? ` · diskon ${formatRp(line.itemDiscount)}` : ''}</p>{line.modifiers?.length > 0 && <p className="text-xs text-gray-500">+ {line.modifiers.map(modifier => modifier.name).join(', ')}</p>}</div>
                <b className="shrink-0 text-gray-900">{formatRp(line.price * line.qty - line.itemDiscount)}</b>
              </div>
            ))}
          </div>
          <div className="pt-3 mt-3 space-y-1 text-gray-700">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatRp(sale.subtotal)}</span></div>
            {sale.globalDiscount > 0 && <div className="flex justify-between text-emerald-700"><span>Diskon</span><span>-{formatRp(sale.globalDiscount)}</span></div>}
            {sale.promoDiscount > 0 && <div className="flex justify-between text-emerald-700"><span>Promo</span><span>-{formatRp(sale.promoDiscount)}</span></div>}
            {sale.loyaltyDiscount > 0 && <div className="flex justify-between text-yellow-700"><span>Reward Poin</span><span>-{formatRp(sale.loyaltyDiscount)}</span></div>}
            {sale.tax > 0 && <div className="flex justify-between"><span>Pajak</span><span>{formatRp(sale.tax)}</span></div>}
            {sale.service > 0 && <div className="flex justify-between"><span>Service</span><span>{formatRp(sale.service)}</span></div>}
            <div className="premium-receipt-total flex items-end justify-between gap-3 text-xl font-black mt-3 p-4 rounded-2xl"><div><span className="block text-[10px] tracking-[.18em] text-emerald-100">TOTAL PEMBAYARAN</span><span>TOTAL</span></div><span>{formatRp(sale.total)}</span></div>
          </div>
          {configs.receiptShowPayment !== false && <div className="border-t border-dashed mt-4 pt-3 space-y-1">{sale.payments.map(payment => <div key={payment.id} className="flex justify-between text-sm"><span>{payment.name}</span><b>{formatRp(payment.amount)}</b></div>)}</div>}
          <div className="text-center mt-5 pt-4 border-t border-dashed border-gray-200"><img src="/logo-bm.svg" alt="BM" className="w-7 h-7 rounded-lg mx-auto mb-2 opacity-90"/><p className="text-xs font-bold text-gray-800">{configs.receiptFooter}</p>{configs.receiptMessage && <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{configs.receiptMessage}</p>}<p className="text-[9px] text-gray-400 mt-2">Didukung Bumi Makmur POS · BM</p></div>
        </div>
        <div className="p-3 bg-gray-50 border-t print-controls space-y-2">
          {configs.whatsappReceiptEnabled !== false && <div className="flex gap-2"><Input value={phone} onChange={event => setPhone(event.target.value)} inputMode="tel" placeholder="Nomor WhatsApp pelanggan" className="min-h-[44px]"/><Button onClick={whatsapp} className="shrink-0 bg-[#25D366] hover:bg-[#20bd5a]"><MessageCircle size={18}/> WhatsApp</Button></div>}
          {notice && <p className="text-xs text-center font-bold text-emerald-700">{notice}</p>}
          <div className="grid grid-cols-4 gap-2">
            <Button variant="secondary" onClick={onClose} className="px-2">Tutup</Button>
            <Button variant="secondary" onClick={copy} className="px-2"><Copy size={17}/><span className="hidden sm:inline">Salin</span></Button>
            <Button variant="secondary" onClick={share} className="px-2"><Share2 size={17}/><span className="hidden sm:inline">Bagikan</span></Button>
            <Button onClick={print} className="px-2"><Printer size={17}/><span className="hidden sm:inline">Cetak</span></Button>
          </div>
        </div>
      </div>
    </div>
  );
}


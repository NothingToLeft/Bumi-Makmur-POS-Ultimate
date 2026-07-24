import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { APP_VERSION, DB_KEY, MAIN_BRANCH_ID, can, createSeedDb } from '../data/defaults.js';
import { createPinCredential, verifyPinCredential } from '../services/security.js';
import { generateId, safeJSONParse, downloadFile, localDateKey } from '../utils/helpers.js';

const PosContext = createContext(null);
const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const nowISO = () => new Date().toISOString();
const money = value => Math.max(0, Math.round(Number(value) || 0));

function migrateLegacy() {
  const seed = createSeedDb();
  try {
    const products = safeJSONParse(localStorage.getItem('bm_prod'), null);
    const users = safeJSONParse(localStorage.getItem('bm_users'), null);
    const branches = safeJSONParse(localStorage.getItem('bm_branches'), null);
    const transactions = safeJSONParse(localStorage.getItem('bm_tx'), null);
    const suppliers = safeJSONParse(localStorage.getItem('bm_supp'), null);
    const purchases = safeJSONParse(localStorage.getItem('bm_purch'), null);
    const movements = safeJSONParse(localStorage.getItem('bm_mov'), null);
    const customers = safeJSONParse(localStorage.getItem('bm_cust'), null);
    const expenses = safeJSONParse(localStorage.getItem('bm_exp'), null);
    const receivables = safeJSONParse(localStorage.getItem('bm_recv'), null);
    if (Array.isArray(products) && products.length) {
      seed.products = products.map(product => ({
        ...product,
        id: String(product.id), branchId: product.branchId || MAIN_BRANCH_ID,
        baseUnit: product.baseUnit || product.unit || 'pcs', minStock: product.minStock ?? 10,
        rack: product.rack || '-', prices: product.prices || {
          retail: product.price || 0,
          wholesale: product.wholesalePrice || product.price || 0,
          project: product.projectPrice || product.price || 0
        },
        variants: product.variants || [], conversions: product.conversions || [], bundleItems: product.bundleItems || [],
        favorite: Boolean(product.favorite), available: product.available !== false, active: product.active !== false,
        trackStock: product.trackStock !== false
      }));
    }
    if (Array.isArray(users) && users.length && users.every(user => user.pinHash)) seed.users = users;
    if (Array.isArray(branches) && branches.length) seed.branches = branches;
    if (Array.isArray(transactions)) seed.sales = transactions.map(sale => ({ ...sale, branchId: sale.branchId || MAIN_BRANCH_ID, status: sale.status || 'COMPLETED' }));
    if (Array.isArray(suppliers)) seed.suppliers = suppliers;
    if (Array.isArray(purchases)) seed.purchases = purchases;
    if (Array.isArray(movements)) seed.stockMovements = movements;
    if (Array.isArray(customers) && customers.length) seed.customers = customers;
    if (Array.isArray(expenses)) seed.expenses = expenses;
    if (Array.isArray(receivables)) seed.receivables = receivables;
  } catch (error) {
    console.warn('Migrasi data lama gagal, memakai data demo.', error);
  }
  return seed;
}

export function PosProvider({ children }) {
  const [db, setDb] = useState(() => {
    const saved = safeJSONParse(localStorage.getItem(DB_KEY), null);
    const base = saved?.meta?.version ? saved : migrateLegacy();
    const seed = createSeedDb();
    return {
      ...seed,
      ...base,
      configs: { ...seed.configs, ...(base.configs || {}) },
      promotions: Array.isArray(base.promotions) ? base.promotions : seed.promotions,
      auditLogs: Array.isArray(base.auditLogs) ? base.auditLogs : [],
      syncQueue: Array.isArray(base.syncQueue) ? base.syncQueue : []
    };
  });
  const dbRef = useRef(db);
  const [currentUser, setCurrentUser] = useState(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [customerDisplay, setCustomerDisplay] = useState({ cart: [], total: 0, customerName: 'Umum', message: '' });

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    dbRef.current = db;
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    document.documentElement.classList.toggle('dark', Boolean(db.configs.darkMode));
  }, [db]);

  const branchId = db.configs.activeBranchId || MAIN_BRANCH_ID;
  const branch = db.branches.find(item => item.id === branchId) || db.branches[0];

  const commit = useCallback((action, details, mutator, options = {}) => {
    const next = clone(dbRef.current);
    const result = mutator(next);
    const timestamp = nowISO();
    next.meta = { ...next.meta, version: APP_VERSION, updatedAt: timestamp };
    if (options.audit !== false) {
      next.auditLogs = next.auditLogs || [];
      next.auditLogs.unshift({
        id: generateId('AUD'), action, details: details || '', createdAt: timestamp,
        userId: currentUser?.id || 'SYSTEM', userName: currentUser?.name || 'Sistem', branchId: next.configs.activeBranchId
      });
      next.auditLogs = next.auditLogs.slice(0, 2000);
    }
    if (options.sync !== false) {
      next.syncQueue = next.syncQueue || [];
      next.syncQueue.unshift({
        id: generateId('SYNC'), action, entityId: result?.id || '', status: 'PENDING', attempts: 0,
        createdAt: timestamp, branchId: next.configs.activeBranchId
      });
      next.syncQueue = next.syncQueue.slice(0, 3000);
    }
    dbRef.current = next;
    setDb(next);
    return result;
  }, [currentUser]);

  const login = useCallback(async pin => {
    const activeUsers = db.users.filter(user => user.active !== false);
    for (const user of activeUsers) {
      if (await verifyPinCredential(pin, user)) {
        setCurrentUser(user);
        if (user.role !== 'owner' && user.branchId && user.branchId !== branchId) {
          setDb(previous => ({ ...previous, configs: { ...previous.configs, activeBranchId: user.branchId } }));
        }
        return { success: true, user };
      }
    }
    return { success: false, message: 'PIN tidak dikenali.' };
  }, [db.users, branchId]);

  const logout = () => setCurrentUser(null);
  const hasPermission = permission => can(currentUser, permission);

  const setConfig = (patch) => commit('SETTING_UPDATE', Object.keys(patch).join(', '), next => {
    next.configs = { ...next.configs, ...patch };
    return next.configs;
  });

  const setActiveBranch = id => {
    if (!db.branches.some(item => item.id === id)) return;
    commit('BRANCH_SWITCH', id, next => {
      next.configs.activeBranchId = id;
      return { id };
    }, { sync: false });
  };

  const addBranch = data => commit('BRANCH_CREATE', data.name, next => {
    const item = { id: generateId('BR'), name: data.name, address: data.address || '', phone: data.phone || '', status: 'Online', active: true };
    next.branches.push(item);
    const general = { id: generateId('CUS'), branchId: item.id, name: 'Umum (Non-Member)', phone: '-', email: '', type: 'Reguler', priceTier: 'retail', creditLimit: 0, points: 0, address: '', project: '', notes: '', active: true };
    next.customers.push(general);
    return item;
  });

  const saveProduct = data => commit(data.id ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE', data.name, next => {
    const existing = next.products.find(product => product.id === data.id);
    const item = {
      id: data.id || generateId('PRD'), branchId: data.branchId || next.configs.activeBranchId,
      name: data.name.trim(), category: data.category || 'Lainnya', sku: data.sku || generateId('SKU'),
      barcode: data.barcode || data.sku || '', baseUnit: data.baseUnit || 'pcs', stock: existing?.stock ?? money(data.stock),
      minStock: money(data.minStock || 0), rack: data.rack || '-', modalPrice: money(data.modalPrice),
      initialModalPrice: existing?.initialModalPrice ?? money(data.modalPrice),
      prices: {
        retail: money(data.prices?.retail ?? data.price),
        wholesale: money(data.prices?.wholesale ?? data.wholesalePrice ?? data.price),
        project: money(data.prices?.project ?? data.projectPrice ?? data.price)
      },
      variants: data.variants || [], conversions: data.conversions || [], bundleItems: data.bundleItems || [],
      favorite: Boolean(data.favorite), available: data.available !== false, active: data.active !== false,
      trackStock: data.trackStock !== false, updatedAt: nowISO()
    };
    if (existing) next.products = next.products.map(product => product.id === item.id ? item : product);
    else next.products.unshift(item);
    return item;
  });

  const archiveProduct = id => commit('PRODUCT_ARCHIVE', id, next => {
    const item = next.products.find(product => product.id === id);
    if (item) item.active = false;
    return item;
  });

  const toggleProduct = (id, field) => commit('PRODUCT_TOGGLE', `${id}:${field}`, next => {
    const item = next.products.find(product => product.id === id);
    if (item) item[field] = !item[field];
    return item;
  });

  const savePromotion = data => commit(data.id ? 'PROMOTION_UPDATE' : 'PROMOTION_CREATE', data.name, next => {
    const item = {
      id: data.id || generateId('PROMO'), branchId: data.branchId || next.configs.activeBranchId,
      name: data.name, type: data.type || 'percent', value: money(data.value), minPurchase: money(data.minPurchase),
      maxDiscount: money(data.maxDiscount), category: data.category || '', productId: data.productId || '',
      active: data.active !== false, startDate: data.startDate || '', endDate: data.endDate || ''
    };
    const index = next.promotions.findIndex(row => row.id === item.id);
    if (index >= 0) next.promotions[index] = item; else next.promotions.unshift(item);
    return item;
  });

  const saveSupplier = data => commit(data.id ? 'SUPPLIER_UPDATE' : 'SUPPLIER_CREATE', data.name, next => {
    const item = { id: data.id || generateId('SUP'), branchId: data.branchId || next.configs.activeBranchId, active: true, ...data };
    const index = next.suppliers.findIndex(row => row.id === item.id);
    if (index >= 0) next.suppliers[index] = item; else next.suppliers.unshift(item);
    return item;
  });

  const saveCustomer = data => commit(data.id ? 'CUSTOMER_UPDATE' : 'CUSTOMER_CREATE', data.name, next => {
    const existing = next.customers.find(customer => customer.id === data.id);
    const item = {
      id: data.id || generateId('CUS'), branchId: data.branchId || next.configs.activeBranchId,
      name: data.name, phone: data.phone || '-', email: data.email || '', type: data.type || 'Reguler',
      priceTier: data.priceTier || 'retail', creditLimit: money(data.creditLimit), points: existing?.points ?? money(data.points),
      address: data.address || '', project: data.project || '', notes: data.notes || '', active: data.active !== false
    };
    const index = next.customers.findIndex(row => row.id === item.id);
    if (index >= 0) next.customers[index] = item; else next.customers.unshift(item);
    return item;
  });

  const saveEmployee = async data => {
    const credential = data.pin ? await createPinCredential(data.pin) : null;
    return commit(data.id ? 'EMPLOYEE_UPDATE' : 'EMPLOYEE_CREATE', data.name, next => {
      const existing = next.users.find(user => user.id === data.id);
      const item = {
        ...(existing || {}), id: data.id || generateId('USR'), name: data.name, role: data.role,
        branchId: data.branchId || next.configs.activeBranchId, active: data.active !== false,
        permissions: data.permissions || [], ...(credential || {})
      };
      delete item.pin;
      const index = next.users.findIndex(row => row.id === item.id);
      if (index >= 0) next.users[index] = item; else next.users.unshift(item);
      return item;
    });
  };

  const findOpenShift = (targetBranchId = branchId) => db.shifts.find(item => item.branchId === targetBranchId && item.status === 'OPEN');

  const startShift = ({ startingCash, notes }) => commit('SHIFT_START', String(startingCash), next => {
    if (next.shifts.some(item => item.branchId === next.configs.activeBranchId && item.status === 'OPEN')) throw new Error('Masih ada shift aktif.');
    const shift = {
      id: generateId('SHIFT'), branchId: next.configs.activeBranchId, userId: currentUser.id, userName: currentUser.name,
      startAt: nowISO(), endAt: null, startingCash: money(startingCash), actualEndingCash: null,
      expectedEndingCash: null, difference: null, status: 'OPEN', notes: notes || ''
    };
    next.shifts.unshift(shift);
    next.cashMovements.unshift({ id: generateId('CASH'), branchId: shift.branchId, shiftId: shift.id, type: 'START', amount: shift.startingCash, note: 'Modal awal', createdAt: shift.startAt, userId: currentUser.id });
    return shift;
  });

  const addCashMovement = ({ type, amount, note }) => commit('CASH_MOVEMENT', `${type}:${amount}`, next => {
    const shift = next.shifts.find(item => item.branchId === next.configs.activeBranchId && item.status === 'OPEN');
    if (!shift) throw new Error('Tidak ada shift aktif.');
    const item = { id: generateId('CASH'), branchId: shift.branchId, shiftId: shift.id, type, amount: money(amount), note: note || '', createdAt: nowISO(), userId: currentUser.id };
    next.cashMovements.unshift(item);
    return item;
  });

  const endShift = ({ actualEndingCash, notes }) => commit('SHIFT_END', String(actualEndingCash), next => {
    const shift = next.shifts.find(item => item.branchId === next.configs.activeBranchId && item.status === 'OPEN');
    if (!shift) throw new Error('Tidak ada shift aktif.');
    const movements = next.cashMovements.filter(item => item.shiftId === shift.id);
    const expected = movements.reduce((sum, item) => {
      if (['START', 'SALE', 'CASH_IN', 'RECEIVABLE_PAYMENT'].includes(item.type)) return sum + item.amount;
      if (['EXPENSE', 'PURCHASE', 'REFUND', 'CASH_OUT'].includes(item.type)) return sum - item.amount;
      return sum;
    }, 0);
    shift.endAt = nowISO(); shift.actualEndingCash = money(actualEndingCash); shift.expectedEndingCash = expected;
    shift.difference = shift.actualEndingCash - expected; shift.status = 'CLOSED'; shift.endNotes = notes || '';
    return shift;
  });

  const resolveProductStockRows = (next, cartItem) => {
    const product = next.products.find(row => row.id === cartItem.productId && row.branchId === next.configs.activeBranchId);
    if (!product) throw new Error(`Produk ${cartItem.name} tidak ditemukan.`);
    if (product.bundleItems?.length) {
      return product.bundleItems.map(component => {
        const componentProduct = next.products.find(row => row.id === component.productId && row.branchId === next.configs.activeBranchId);
        if (!componentProduct) throw new Error(`Komponen paket ${component.productId} tidak ditemukan.`);
        return { product: componentProduct, qty: component.qty * cartItem.qty, sourceName: product.name };
      });
    }
    return [{ product, qty: cartItem.baseQty ?? cartItem.qty, sourceName: product.name }];
  };

  const holdSale = payload => commit('BILL_HOLD', payload.name || 'Open Bill', next => {
    const item = { id: payload.id || generateId('BILL'), branchId: next.configs.activeBranchId, createdAt: nowISO(), updatedAt: nowISO(), ...payload };
    const index = next.heldSales.findIndex(row => row.id === item.id);
    if (index >= 0) next.heldSales[index] = item; else next.heldSales.unshift(item);
    return item;
  });

  const deleteHeldSale = id => commit('BILL_DELETE', id, next => {
    next.heldSales = next.heldSales.filter(row => row.id !== id);
    return { id };
  });

  const completeSale = payload => commit('SALE_COMPLETE', payload.total, next => {
    if (!payload.items?.length) throw new Error('Keranjang kosong.');
    const activeShift = next.shifts.find(item => item.branchId === next.configs.activeBranchId && item.status === 'OPEN');
    const cashTotal = (payload.payments || []).filter(payment => payment.type === 'cash').reduce((sum, payment) => sum + money(payment.amount), 0);
    if (next.configs.requireShiftForCash && cashTotal > 0 && !activeShift) throw new Error('Mulai shift sebelum menerima pembayaran tunai.');
    const creditTotal = (payload.payments || []).filter(payment => payment.type === 'credit').reduce((sum, payment) => sum + money(payment.amount), 0);
    const creditCustomer = next.customers.find(item => item.id === payload.customerId);
    if (creditTotal > 0) {
      if (!creditCustomer || creditCustomer.name === 'Umum (Non-Member)') throw new Error('Pembayaran tempo wajib memilih pelanggan terdaftar.');
      const currentBalance = next.receivables.filter(item => item.customerId === creditCustomer.id && item.status === 'OPEN').reduce((sum, item) => sum + money(item.balance), 0);
      if (money(creditCustomer.creditLimit) > 0 && currentBalance + creditTotal > money(creditCustomer.creditLimit)) {
        throw new Error(`Batas kredit pelanggan terlampaui. Sisa limit Rp ${(money(creditCustomer.creditLimit) - currentBalance).toLocaleString('id-ID')}.`);
      }
    }

    const stockRows = payload.items.flatMap(item => resolveProductStockRows(next, item));
    for (const row of stockRows) {
      if (row.product.trackStock !== false && row.product.stock < row.qty) throw new Error(`Stok ${row.product.name} tidak cukup.`);
    }
    const saleId = payload.id || generateId('INV');
    for (const row of stockRows) {
      if (row.product.trackStock !== false) row.product.stock -= row.qty;
      next.stockMovements.unshift({
        id: generateId('MOV'), branchId: next.configs.activeBranchId, productId: row.product.id, productName: row.product.name,
        type: 'SALE', qtyChange: -row.qty, refId: saleId, note: row.sourceName, createdAt: nowISO(), userId: currentUser.id
      });
    }
    const sale = {
      ...payload, id: saleId, branchId: next.configs.activeBranchId, createdAt: nowISO(), status: 'COMPLETED',
      refundedTotal: 0, syncStatus: 'PENDING', createdBy: currentUser.id
    };
    next.sales.unshift(sale);
    if (payload.heldSaleId) next.heldSales = next.heldSales.filter(row => row.id !== payload.heldSaleId);

    for (const payment of payload.payments || []) {
      if (payment.type === 'cash' && activeShift) {
        next.cashMovements.unshift({ id: generateId('CASH'), branchId: sale.branchId, shiftId: activeShift.id, type: 'SALE', amount: money(payment.amount), note: sale.id, createdAt: sale.createdAt, userId: currentUser.id });
      }
      if (payment.type === 'credit' && money(payment.amount) > 0) {
        next.receivables.unshift({
          id: generateId('REC'), branchId: sale.branchId, saleId: sale.id, customerId: sale.customerId,
          customerName: sale.customerName, total: money(payment.amount), paid: 0, balance: money(payment.amount),
          dueDate: payment.dueDate || '', status: 'OPEN', payments: [], createdAt: sale.createdAt
        });
      }
    }
    const customer = next.customers.find(item => item.id === payload.customerId);
    if (customer && next.configs.loyaltyEnabled && customer.name !== 'Umum (Non-Member)') {
      const earned = Math.floor(money(payload.total) / Math.max(1, money(next.configs.pointRate)));
      customer.points = Math.max(0, money(customer.points) - money(payload.pointsRedeemed)) + earned;
      sale.pointsEarned = earned;
    }
    return sale;
  });

  const authorizeManagerPin = async pin => {
    for (const user of db.users.filter(item => item.active !== false && ['owner', 'manager'].includes(item.role))) {
      if (await verifyPinCredential(pin, user)) return user;
    }
    return null;
  };

  const refundSale = async payload => {
    const sale = db.sales.find(item => item.id === payload.saleId);
    if (!sale) throw new Error('Transaksi tidak ditemukan.');
    const amount = payload.items.reduce((sum, refundItem) => {
      const original = sale.items.find(item => item.lineId === refundItem.lineId || item.productId === refundItem.productId);
      return sum + (original ? money(original.netUnitPrice ?? original.price) * money(refundItem.qty) : 0);
    }, 0);
    if (currentUser.role === 'kasir' || amount >= money(db.configs.refundApprovalLimit)) {
      const approver = await authorizeManagerPin(payload.managerPin);
      if (!approver) throw new Error('PIN Manager/Owner tidak valid.');
      payload.approvedBy = approver.id;
      payload.approvedByName = approver.name;
    }
    return commit(payload.voidAll ? 'SALE_VOID' : 'SALE_REFUND', `${payload.saleId}:${amount}`, next => {
      const target = next.sales.find(item => item.id === payload.saleId);
      const refund = {
        id: generateId(payload.voidAll ? 'VOID' : 'REF'), branchId: target.branchId, saleId: target.id,
        items: payload.items, amount, reason: payload.reason, restock: payload.restock,
        method: payload.method || 'Tunai', createdAt: nowISO(), createdBy: currentUser.id,
        approvedBy: payload.approvedBy || currentUser.id, approvedByName: payload.approvedByName || currentUser.name,
        type: payload.voidAll ? 'VOID' : (payload.items.length === target.items.length ? 'FULL' : 'PARTIAL')
      };
      next.refunds.unshift(refund);
      target.refundedTotal = money(target.refundedTotal) + amount;
      if (payload.voidAll) target.status = 'VOIDED'; else if (target.refundedTotal >= target.total) target.status = 'REFUNDED'; else target.status = 'PARTIAL_REFUND';
      if (payload.restock) {
        for (const refundItem of payload.items) {
          const original = target.items.find(item => item.lineId === refundItem.lineId || item.productId === refundItem.productId);
          if (!original) continue;
          const rows = resolveProductStockRows(next, { ...original, qty: refundItem.qty, baseQty: (original.baseQty / original.qty) * refundItem.qty });
          for (const row of rows) {
            if (row.product.trackStock !== false) row.product.stock += row.qty;
            next.stockMovements.unshift({ id: generateId('MOV'), branchId: target.branchId, productId: row.product.id, productName: row.product.name, type: payload.voidAll ? 'VOID' : 'REFUND', qtyChange: row.qty, refId: refund.id, note: payload.reason, createdAt: refund.createdAt, userId: currentUser.id });
          }
        }
      }
      const activeShift = next.shifts.find(item => item.branchId === target.branchId && item.status === 'OPEN');
      if (activeShift && refund.method === 'Tunai') next.cashMovements.unshift({ id: generateId('CASH'), branchId: target.branchId, shiftId: activeShift.id, type: 'REFUND', amount, note: refund.id, createdAt: refund.createdAt, userId: currentUser.id });
      return refund;
    });
  };

  const savePurchase = payload => commit(payload.id ? 'PURCHASE_UPDATE' : 'PURCHASE_CREATE', payload.invoiceNo || '', next => {
    const existing = next.purchases.find(item => item.id === payload.id);
    const purchase = {
      ...(existing || {}), ...payload, id: payload.id || generateId('BUY'), branchId: next.configs.activeBranchId,
      createdAt: existing?.createdAt || nowISO(), updatedAt: nowISO(), inventoryApplied: existing?.inventoryApplied || false,
      status: payload.status || 'DRAFT'
    };
    if (purchase.status === 'RECEIVED' && !purchase.inventoryApplied) {
      for (const item of purchase.items) {
        const product = next.products.find(row => row.id === item.productId && row.branchId === purchase.branchId);
        if (!product) continue;
        item.previousModalPrice = product.modalPrice;
        product.stock += money(item.qty);
        product.modalPrice = money(item.price);
        next.stockMovements.unshift({ id: generateId('MOV'), branchId: purchase.branchId, productId: product.id, productName: product.name, type: 'PURCHASE', qtyChange: money(item.qty), refId: purchase.id, note: purchase.invoiceNo, createdAt: nowISO(), userId: currentUser.id });
      }
      purchase.inventoryApplied = true;
      const balance = Math.max(0, money(purchase.total) - money(purchase.paid));
      if (balance > 0) next.payables.unshift({ id: generateId('PAY'), branchId: purchase.branchId, purchaseId: purchase.id, supplierId: purchase.supplierId, supplierName: purchase.supplierName, total: balance, paid: 0, balance, dueDate: purchase.dueDate || '', status: 'OPEN', payments: [], createdAt: nowISO() });
      const activeShift = next.shifts.find(item => item.branchId === purchase.branchId && item.status === 'OPEN');
      if (activeShift && purchase.paymentMethod === 'Tunai' && money(purchase.paid) > 0) next.cashMovements.unshift({ id: generateId('CASH'), branchId: purchase.branchId, shiftId: activeShift.id, type: 'PURCHASE', amount: money(purchase.paid), note: purchase.id, createdAt: nowISO(), userId: currentUser.id });
    }
    const index = next.purchases.findIndex(row => row.id === purchase.id);
    if (index >= 0) next.purchases[index] = purchase; else next.purchases.unshift(purchase);
    return purchase;
  });

  const returnPurchase = payload => commit('PURCHASE_RETURN', payload.purchaseId, next => {
    const purchase = next.purchases.find(item => item.id === payload.purchaseId);
    if (!purchase) throw new Error('Pembelian tidak ditemukan.');
    let total = 0;
    for (const item of payload.items) {
      const product = next.products.find(row => row.id === item.productId && row.branchId === purchase.branchId);
      if (!product || product.stock < item.qty) throw new Error(`Stok ${item.name} tidak cukup untuk retur.`);
      product.stock -= money(item.qty);
      total += money(item.qty) * money(item.price);
      next.stockMovements.unshift({ id: generateId('MOV'), branchId: purchase.branchId, productId: product.id, productName: product.name, type: 'PURCHASE_RETURN', qtyChange: -money(item.qty), refId: purchase.id, note: payload.reason, createdAt: nowISO(), userId: currentUser.id });
    }
    purchase.returns = [...(purchase.returns || []), { id: generateId('PRET'), items: payload.items, total, reason: payload.reason, createdAt: nowISO() }];
    const payable = next.payables.find(item => item.purchaseId === purchase.id && item.status === 'OPEN');
    if (payable) { payable.balance = Math.max(0, payable.balance - total); payable.total = Math.max(payable.paid, payable.total - total); if (payable.balance === 0) payable.status = 'PAID'; }
    return { id: purchase.id, total };
  });

  const payReceivable = ({ id, amount, method = 'Tunai' }) => commit('RECEIVABLE_PAYMENT', `${id}:${amount}`, next => {
    const item = next.receivables.find(row => row.id === id);
    if (!item) throw new Error('Piutang tidak ditemukan.');
    const paid = Math.min(item.balance, money(amount));
    item.paid += paid; item.balance -= paid; item.payments.unshift({ id: generateId('RCP'), amount: paid, method, createdAt: nowISO(), userId: currentUser.id });
    if (item.balance <= 0) item.status = 'PAID';
    const activeShift = next.shifts.find(row => row.branchId === item.branchId && row.status === 'OPEN');
    if (activeShift && method === 'Tunai') next.cashMovements.unshift({ id: generateId('CASH'), branchId: item.branchId, shiftId: activeShift.id, type: 'RECEIVABLE_PAYMENT', amount: paid, note: item.id, createdAt: nowISO(), userId: currentUser.id });
    return item;
  });

  const payPayable = ({ id, amount, method = 'Tunai' }) => commit('PAYABLE_PAYMENT', `${id}:${amount}`, next => {
    const item = next.payables.find(row => row.id === id);
    if (!item) throw new Error('Hutang tidak ditemukan.');
    const paid = Math.min(item.balance, money(amount));
    item.paid += paid; item.balance -= paid; item.payments.unshift({ id: generateId('PPY'), amount: paid, method, createdAt: nowISO(), userId: currentUser.id });
    if (item.balance <= 0) item.status = 'PAID';
    const activeShift = next.shifts.find(row => row.branchId === item.branchId && row.status === 'OPEN');
    if (activeShift && method === 'Tunai') next.cashMovements.unshift({ id: generateId('CASH'), branchId: item.branchId, shiftId: activeShift.id, type: 'PURCHASE', amount: paid, note: item.id, createdAt: nowISO(), userId: currentUser.id });
    return item;
  });

  const addExpense = data => commit('EXPENSE_CREATE', data.note, next => {
    const item = { id: generateId('EXP'), branchId: next.configs.activeBranchId, category: data.category || 'Operasional', amount: money(data.amount), note: data.note || '', method: data.method || 'Tunai', createdAt: nowISO(), userId: currentUser.id };
    next.expenses.unshift(item);
    const activeShift = next.shifts.find(row => row.branchId === item.branchId && row.status === 'OPEN');
    if (activeShift && item.method === 'Tunai') next.cashMovements.unshift({ id: generateId('CASH'), branchId: item.branchId, shiftId: activeShift.id, type: 'EXPENSE', amount: item.amount, note: item.note, createdAt: item.createdAt, userId: currentUser.id });
    return item;
  });

  const adjustStock = data => commit('STOCK_ADJUST', data.reason, next => {
    const product = next.products.find(item => item.id === data.productId && item.branchId === next.configs.activeBranchId);
    if (!product) throw new Error('Produk tidak ditemukan.');
    const change = Number(data.qtyChange) || 0;
    if (product.stock + change < 0) throw new Error('Stok tidak boleh negatif.');
    product.stock += change;
    const adjustment = { id: generateId('ADJ'), branchId: product.branchId, productId: product.id, productName: product.name, qtyChange: change, reason: data.reason, createdAt: nowISO(), userId: currentUser.id };
    next.stockAdjustments.unshift(adjustment);
    next.stockMovements.unshift({ ...adjustment, type: 'ADJUSTMENT', refId: adjustment.id, note: data.reason });
    return adjustment;
  });

  const stockOpname = ({ counts, notes }) => commit('STOCK_OPNAME', notes, next => {
    const opname = { id: generateId('OPN'), branchId: next.configs.activeBranchId, createdAt: nowISO(), userId: currentUser.id, notes: notes || '', items: [] };
    for (const count of counts) {
      const product = next.products.find(item => item.id === count.productId && item.branchId === next.configs.activeBranchId);
      if (!product) continue;
      const difference = Number(count.actual) - product.stock;
      opname.items.push({ productId: product.id, productName: product.name, system: product.stock, actual: Number(count.actual), difference });
      if (difference !== 0) {
        product.stock = Number(count.actual);
        next.stockMovements.unshift({ id: generateId('MOV'), branchId: product.branchId, productId: product.id, productName: product.name, type: 'OPNAME', qtyChange: difference, refId: opname.id, note: notes, createdAt: opname.createdAt, userId: currentUser.id });
      }
    }
    next.stockOpnames.unshift(opname);
    return opname;
  });

  const transferStock = ({ productId, destinationBranchId, qty, notes }) => commit('STOCK_TRANSFER', `${productId}:${qty}`, next => {
    const source = next.products.find(item => item.id === productId && item.branchId === next.configs.activeBranchId);
    if (!source || source.stock < qty) throw new Error('Stok sumber tidak cukup.');
    let destination = next.products.find(item => item.sku === source.sku && item.branchId === destinationBranchId);
    if (!destination) {
      destination = { ...clone(source), id: generateId('PRD'), branchId: destinationBranchId, stock: 0 };
      next.products.push(destination);
    }
    source.stock -= money(qty); destination.stock += money(qty);
    const transfer = { id: generateId('TRF'), sourceBranchId: source.branchId, destinationBranchId, productId: source.id, productName: source.name, qty: money(qty), notes: notes || '', status: 'RECEIVED', createdAt: nowISO(), userId: currentUser.id };
    next.stockTransfers.unshift(transfer);
    next.stockMovements.unshift({ id: generateId('MOV'), branchId: source.branchId, productId: source.id, productName: source.name, type: 'TRANSFER_OUT', qtyChange: -money(qty), refId: transfer.id, note: destinationBranchId, createdAt: transfer.createdAt, userId: currentUser.id });
    next.stockMovements.unshift({ id: generateId('MOV'), branchId: destinationBranchId, productId: destination.id, productName: destination.name, type: 'TRANSFER_IN', qtyChange: money(qty), refId: transfer.id, note: source.branchId, createdAt: transfer.createdAt, userId: currentUser.id });
    return transfer;
  });

  const saveOnlineOrder = data => commit(data.id ? 'ORDER_UPDATE' : 'ORDER_CREATE', data.channel, next => {
    const item = { id: data.id || generateId('ORD'), branchId: data.branchId || next.configs.activeBranchId, createdAt: data.createdAt || nowISO(), status: data.status || 'NEW', ...data };
    const index = next.onlineOrders.findIndex(row => row.id === item.id);
    if (index >= 0) next.onlineOrders[index] = item; else next.onlineOrders.unshift(item);
    return item;
  });

  const convertOrderToBill = id => commit('ORDER_TO_BILL', id, next => {
    const order = next.onlineOrders.find(item => item.id === id);
    if (!order) throw new Error('Pesanan tidak ditemukan.');
    const bill = { id: generateId('BILL'), branchId: order.branchId, name: `${order.channel} ${order.id}`, customerId: order.customerId, customerName: order.customerName, items: order.items, saleType: order.saleType || 'retail', note: order.notes || '', createdAt: nowISO(), updatedAt: nowISO(), sourceOrderId: order.id };
    next.heldSales.unshift(bill); order.status = 'IN_POS';
    return bill;
  });

  const savePrinterProfile = data => commit(data.id ? 'PRINTER_UPDATE' : 'PRINTER_CREATE', data.name, next => {
    const item = { id: data.id || generateId('PRN'), active: true, ...data };
    if (item.active) next.printerProfiles.forEach(profile => { profile.active = false; });
    const index = next.printerProfiles.findIndex(row => row.id === item.id);
    if (index >= 0) next.printerProfiles[index] = item; else next.printerProfiles.unshift(item);
    return item;
  });

  const saveCampaign = data => commit(data.id ? 'CAMPAIGN_UPDATE' : 'CAMPAIGN_CREATE', data.title, next => {
    const item = { id: data.id || generateId('CMP'), active: true, ...data };
    const index = next.campaigns.findIndex(row => row.id === item.id);
    if (index >= 0) next.campaigns[index] = item; else next.campaigns.unshift(item);
    return item;
  });

  const saveFeedback = data => commit('FEEDBACK_CREATE', String(data.rating), next => {
    const item = { id: generateId('FDB'), branchId: next.configs.activeBranchId, createdAt: nowISO(), ...data };
    next.feedback.unshift(item);
    return item;
  });

  const redeemPoints = ({ customerId, points }) => commit('LOYALTY_REDEEM', `${customerId}:${points}`, next => {
    const customer = next.customers.find(item => item.id === customerId);
    if (!customer || customer.points < points) throw new Error('Poin tidak cukup.');
    customer.points -= money(points);
    return { id: customer.id, discount: money(points) * money(next.configs.pointValue) };
  });

  const exportBackup = () => {
    const snapshot = { ...db, meta: { ...db.meta, exportedAt: nowISO(), version: APP_VERSION } };
    downloadFile(`Bumi-Makmur-POS-backup-${localDateKey()}.json`, JSON.stringify(snapshot, null, 2));
    setDb(previous => ({ ...previous, meta: { ...previous.meta, lastBackupAt: nowISO() } }));
  };

  const importBackup = async file => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed?.meta || !Array.isArray(parsed.products) || !Array.isArray(parsed.sales)) throw new Error('File backup tidak valid.');
    setDb({ ...parsed, meta: { ...parsed.meta, version: APP_VERSION, restoredAt: nowISO() } });
  };

  const syncNow = () => commit('SYNC_MANUAL', 'Tandai antrean tersinkron', next => {
    const timestamp = nowISO();
    next.syncQueue = next.syncQueue.map(item => ({ ...item, status: 'SYNCED', syncedAt: timestamp }));
    next.meta.lastSyncAt = timestamp;
    return { id: 'SYNC', count: next.syncQueue.length };
  }, { sync: false });

  const resetDemo = () => {
    const seed = createSeedDb();
    setDb(seed); setCurrentUser(null); localStorage.setItem(DB_KEY, JSON.stringify(seed));
  };

  const scoped = useMemo(() => ({
    products: db.products.filter(item => item.branchId === branchId),
    promotions: (db.promotions || []).filter(item => item.branchId === branchId),
    suppliers: db.suppliers.filter(item => item.branchId === branchId),
    customers: db.customers.filter(item => item.branchId === branchId),
    sales: db.sales.filter(item => item.branchId === branchId),
    heldSales: db.heldSales.filter(item => item.branchId === branchId),
    purchases: db.purchases.filter(item => item.branchId === branchId),
    movements: db.stockMovements.filter(item => item.branchId === branchId),
    adjustments: db.stockAdjustments.filter(item => item.branchId === branchId),
    opnames: db.stockOpnames.filter(item => item.branchId === branchId),
    transfers: db.stockTransfers.filter(item => item.sourceBranchId === branchId || item.destinationBranchId === branchId),
    expenses: db.expenses.filter(item => item.branchId === branchId),
    receivables: db.receivables.filter(item => item.branchId === branchId),
    payables: db.payables.filter(item => item.branchId === branchId),
    refunds: db.refunds.filter(item => item.branchId === branchId),
    shifts: db.shifts.filter(item => item.branchId === branchId),
    cashMovements: db.cashMovements.filter(item => item.branchId === branchId),
    orders: db.onlineOrders.filter(item => item.branchId === branchId),
    feedback: db.feedback.filter(item => item.branchId === branchId)
  }), [db, branchId]);

  const value = {
    db, scoped, currentUser, online, branchId, branch, customerDisplay, setCustomerDisplay,
    login, logout, hasPermission, setConfig, setActiveBranch, addBranch, saveProduct, archiveProduct, toggleProduct,
    savePromotion, saveSupplier, saveCustomer, saveEmployee, findOpenShift, startShift, endShift, addCashMovement,
    holdSale, deleteHeldSale, completeSale, refundSale, authorizeManagerPin,
    savePurchase, returnPurchase, payReceivable, payPayable, addExpense, adjustStock, stockOpname, transferStock,
    saveOnlineOrder, convertOrderToBill, savePrinterProfile, saveCampaign, saveFeedback, redeemPoints,
    exportBackup, importBackup, syncNow, resetDemo
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) throw new Error('usePos harus dipakai di dalam PosProvider.');
  return context;
};

import { formatQuantity } from './fractionalUnits.js';
import { findSaleLine, isSameSaleLine } from './saleLines.js';

const money = value => Math.max(0, Math.round(Number(value) || 0));
const isStepAligned = (value, step) => Math.abs(Number(value) / Number(step) - Math.round(Number(value) / Number(step))) < 0.000001;

// Validasi + perhitungan refund dibuat murni agar dapat dijalankan dua kali: sekali sebelum
// meminta PIN Manager (umpan balik cepat) dan sekali lagi di dalam commit() terhadap state
// terbaru, sehingga klik ganda/retry tidak dapat membuat refund melebihi sisa transaksi.
export function computeRefundPlan(source, payload) {
  const sale = (source.sales || []).find(item => item.id === payload.saleId);
  if (!sale) throw new Error('Transaksi tidak ditemukan.');
  if (['REFUNDED', 'VOIDED', 'VOID'].includes(sale.status)) throw new Error('Transaksi ini sudah selesai direfund/dibatalkan.');
  const previousRefunds = (source.refunds || []).filter(item => item.saleId === sale.id);
  if (payload.voidAll && previousRefunds.length > 0) throw new Error('Transaksi yang sudah memiliki refund sebagian tidak dapat di-void penuh.');
  const refundedQtyFor = original => previousRefunds.reduce((sum, refund) => sum + (refund.items || []).filter(item => isSameSaleLine(original, item)).reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0);
  const alreadyRefundedSerialIds = new Set(previousRefunds.flatMap(refund => (refund.items || []).flatMap(item => item.serialIds || [])));
  const requestedRefundSerialIds = new Set();
  const requestedQtyByLine = new Map();
  for (const refundItem of payload.items) {
    const original = findSaleLine(sale.items, refundItem);
    if (!original) throw new Error(`Item ${refundItem.name || refundItem.productId} tidak ditemukan pada transaksi.`);
    const alreadyRefunded = refundedQtyFor(original);
    const requestedBefore = requestedQtyByLine.get(original) || 0;
    const remaining = Math.max(0, Number(original.qty || 0) - alreadyRefunded - requestedBefore);
    const refundQty = Number(refundItem.qty || 0);
    requestedQtyByLine.set(original, requestedBefore + refundQty);
    const refundStep = Math.max(0.001, Number(original.quantityStep || 1));
    if (refundQty <= 0 || refundQty > remaining) throw new Error(`Jumlah refund ${original.name} melebihi sisa yang dapat direfund (${remaining}).`);
    if (!isStepAligned(refundQty, refundStep)) throw new Error(`Jumlah refund ${original.name} harus kelipatan ${formatQuantity(refundStep)} ${original.unit || 'satuan'}.`);
    const originalSerialIds = Array.isArray(original.serialIds) ? original.serialIds : [];
    if (originalSerialIds.length > 0) {
      const basePerQty = Number(original.baseQty || original.qty || 0) / Math.max(0.000001, Number(original.qty || 0));
      const requiredSerials = Math.round(refundQty * basePerQty);
      const selectedSerialIds = Array.isArray(refundItem.serialIds) ? refundItem.serialIds.filter(Boolean) : [];
      if (selectedSerialIds.length !== requiredSerials) throw new Error(`Pilih tepat ${requiredSerials} serial ${original.name} yang direfund.`);
      for (const serialId of selectedSerialIds) {
        if (!originalSerialIds.includes(serialId)) throw new Error(`Serial refund ${original.name} tidak termasuk pada transaksi ini.`);
        if (alreadyRefundedSerialIds.has(serialId)) throw new Error('Salah satu serial sudah pernah direfund sebelumnya.');
        if (requestedRefundSerialIds.has(serialId)) throw new Error('Nomor serial yang sama dipilih lebih dari sekali pada refund.');
        const serial = (source.serialNumbers || []).find(row => row.id === serialId && row.branchId === sale.branchId);
        if (!serial || serial.status !== 'SOLD' || serial.saleId !== sale.id) throw new Error(`Serial ${serial?.serial || serialId} tidak berstatus SOLD pada transaksi ini.`);
        requestedRefundSerialIds.add(serialId);
      }
    }
  }
  if (payload.voidAll) {
    // Void penuh harus mencakup seluruh baris; void sebagian akan membuat laporan tidak konsisten.
    const incomplete = (sale.items || []).find(line => (requestedQtyByLine.get(line) || 0) + 0.000001 < Number(line.qty || 0));
    if (incomplete) throw new Error(`Void harus mencakup seluruh item transaksi (${incomplete.name} belum lengkap).`);
  }
  const itemNetTotal = sale.items.reduce((sum, item) => sum + Math.max(0, Number(item.netUnitPrice ?? item.price) || 0) * Number(item.qty || 0), 0);
  const saleAllocationRatio = itemNetTotal > 0 ? money(sale.total) / itemNetTotal : 0;
  const calculatedRefund = payload.items.reduce((sum, refundItem) => {
    const original = findSaleLine(sale.items, refundItem);
    if (!original) return sum;
    const base = Math.max(0, Number(original.netUnitPrice ?? original.price) || 0) * Number(refundItem.qty || 0);
    return sum + Math.round(base * saleAllocationRatio);
  }, 0);
  const amount = Math.min(Math.max(0, money(sale.total) - money(sale.refundedTotal)), calculatedRefund);
  if (amount <= 0) throw new Error('Nilai refund tidak valid atau transaksi sudah direfund penuh.');
  return { sale, amount };
}

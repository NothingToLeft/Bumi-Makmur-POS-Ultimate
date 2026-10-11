/**
 * Pencocokan baris transaksi untuk refund/void.
 *
 * Satu produk dapat muncul pada beberapa baris dalam satu transaksi (misalnya satuan
 * berbeda, atau baris yang diberi diskon/catatan). Karena itu `lineId` harus menjadi
 * identitas utama; `productId` hanya dipakai sebagai fallback untuk data lama yang
 * belum memiliki `lineId`.
 */
export function findSaleLine(items = [], ref = {}) {
  const list = Array.isArray(items) ? items : [];
  if (ref?.lineId) {
    const exact = list.find(line => line?.lineId === ref.lineId);
    if (exact) return exact;
    // Transaksi modern selalu memiliki lineId: jangan menebak lewat productId.
    if (list.some(line => line?.lineId)) return undefined;
  }
  if (!ref?.productId) return undefined;
  return list.find(line => line?.productId === ref.productId);
}

/** True bila `ref` (item refund/serial/dll.) merujuk ke baris transaksi `line` yang sama. */
export function isSameSaleLine(line, ref) {
  if (!line || !ref) return false;
  if (ref.lineId && line.lineId) return line.lineId === ref.lineId;
  return Boolean(ref.productId) && line.productId === ref.productId;
}

/** Sisa kuantitas suatu baris, termasuk kompatibilitas refund legacy tanpa lineId. */
export function remainingSaleLineQty(line, refunds = []) {
  const returned = (refunds || []).reduce((sum, refund) => sum + (refund.items || [])
    .filter(item => isSameSaleLine(line, item))
    .reduce((count, item) => count + Math.max(0, Number(item.qty) || 0), 0), 0);
  return Math.max(0, Number(line?.qty || 0) - returned);
}

/** Tambah bulan kalender tanpa overflow (31 Jan + 1 bulan => 28/29 Feb, bukan 3 Mar). */
export function addCalendarMonths(input, months) {
  const start = new Date(input);
  if (Number.isNaN(start.getTime())) return null;
  const count = Math.max(0, Math.round(Number(months) || 0));
  const result = new Date(start.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + count);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

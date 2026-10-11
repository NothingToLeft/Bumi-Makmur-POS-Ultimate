/** Kata kunci tambahan agar menu mudah ditemukan lewat istilah yang dipakai sehari-hari. */
export const MODULE_KEYWORDS = Object.freeze({
  dashboard: 'ringkasan beranda omzet hari ini',
  controlCenter: 'kontrol sinkron kesehatan sistem backup',
  pos: 'kasir jual bayar transaksi baru scan barcode',
  openBills: 'tagihan tahan meja bill',
  transactions: 'riwayat struk refund void retur batal cetak ulang',
  quotations: 'penawaran quotation sph',
  customers: 'pelanggan member piutang poin',
  products: 'produk stok barang barcode import harga opname kategori',
  purchases: 'pembelian po purchase order terima barang',
  suppliers: 'pemasok supplier hutang',
  warranty: 'garansi serial klaim',
  shifts: 'shift kas closing tutup buka modal',
  finance: 'keuangan biaya pengeluaran hutang piutang',
  reports: 'laporan analitik laba margin ekspor csv',
  orders: 'pesanan online order',
  branches: 'cabang toko',
  devices: 'printer perangkat struk bluetooth',
  customerDisplay: 'layar pelanggan display qris',
  settings: 'pengaturan setting ai gemini pajak pin'
});

const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const isSubsequence = (needle, haystack) => {
  let index = 0;
  for (const char of haystack) if (char === needle[index]) index += 1;
  return index === needle.length;
};

function scoreToken(token, label, group, keywords) {
  if (label.startsWith(token)) return 100;
  if (label.split(/\s+/).some(word => word.startsWith(token))) return 80;
  if (label.includes(token)) return 60;
  if (keywords.split(/\s+/).some(word => word.startsWith(token))) return 40;
  if (keywords.includes(token) || group.includes(token)) return 20;
  return token.length >= 3 && isSubsequence(token, label) ? 10 : 0;
}

/** Urutkan item { id, label, group, keywords } berdasarkan kecocokan dengan query. */
export function rankCommands(items = [], query = '') {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return items.map(item => ({ ...item, score: 0 }));
  const ranked = [];
  items.forEach((item, order) => {
    const label = normalize(item.label);
    const group = normalize(item.group);
    const keywords = normalize(item.keywords);
    let score = 0;
    for (const token of tokens) {
      const tokenScore = scoreToken(token, label, group, keywords);
      if (!tokenScore) return;
      score += tokenScore;
    }
    ranked.push({ ...item, score, order });
  });
  return ranked.sort((a, b) => b.score - a.score || a.order - b.order);
}

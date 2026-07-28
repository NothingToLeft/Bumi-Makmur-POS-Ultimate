const requiredArrays = ['branches', 'users', 'products', 'sales', 'purchases', 'stockMovements'];
const optionalArrays = ['customers', 'suppliers', 'refunds', 'stockTransfers', 'auditLogs', 'productPriceHistory'];

export function validateBackupPayload(payload) {
  const errors = [];
  const warnings = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) errors.push('Isi backup bukan objek database.');
  if (!payload?.meta || typeof payload.meta !== 'object') errors.push('Metadata backup tidak ditemukan.');
  if (!payload?.configs || typeof payload.configs !== 'object') errors.push('Pengaturan toko tidak ditemukan.');
  for (const key of requiredArrays) if (!Array.isArray(payload?.[key])) errors.push(`Bagian ${key} tidak ditemukan atau rusak.`);
  for (const key of optionalArrays) if (payload?.[key] != null && !Array.isArray(payload[key])) warnings.push(`Bagian ${key} bukan daftar dan akan dinormalisasi.`);
  const duplicate = (rows = [], label) => {
    const seen = new Set();
    for (const row of rows) {
      const id = String(row?.id || '');
      if (!id) warnings.push(`${label} memiliki data tanpa ID.`);
      else if (seen.has(id)) errors.push(`${label} memiliki ID ganda: ${id}.`);
      else seen.add(id);
    }
  };
  duplicate(payload?.products, 'Produk');
  duplicate(payload?.sales, 'Transaksi');
  duplicate(payload?.purchases, 'Pembelian');
  const counts = Object.fromEntries([...requiredArrays, ...optionalArrays].map(key => [key, Array.isArray(payload?.[key]) ? payload[key].length : 0]));
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    counts,
    version: String(payload?.meta?.version || 'tidak diketahui'),
    exportedAt: String(payload?.meta?.exportedAt || payload?.meta?.updatedAt || ''),
    companyName: String(payload?.configs?.companyName || '')
  };
}

export async function inspectBackupFile(file) {
  if (!file) throw new Error('Pilih file backup terlebih dahulu.');
  const text = await file.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch { throw new Error('File bukan JSON yang valid.'); }
  return { payload, report: validateBackupPayload(payload) };
}

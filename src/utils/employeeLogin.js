const textEncoder = new TextEncoder();

export function normalizeEmployeeLoginName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value) {
  if (!globalThis.crypto?.subtle) throw new Error('Perangkat tidak mendukung autentikasi karyawan yang aman.');
  return bytesToBase64Url(await globalThis.crypto.subtle.digest('SHA-256', textEncoder.encode(String(value))));
}

export async function employeeDirectoryId(storeId, branchId, loginName) {
  const normalizedName = normalizeEmployeeLoginName(loginName);
  if (!normalizedName) throw new Error('Nama login karyawan wajib diisi.');
  if (!branchId) throw new Error('Cabang login karyawan wajib dipilih.');
  return sha256(`bmpos-directory-v2:${String(storeId || '')}:${String(branchId)}:${normalizedName}`);
}

export function createEmployeeLoginAlias() {
  if (globalThis.crypto?.randomUUID) return `emp-${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
  const bytes = new Uint8Array(18);
  globalThis.crypto?.getRandomValues?.(bytes);
  const suffix = Array.from(bytes, item => item.toString(16).padStart(2, '0')).join('') || `${Date.now()}${Math.random().toString(36).slice(2)}`;
  return `emp-${suffix}`;
}

export async function deriveEmployeeAuthCredential({ storeId, storeCode, branchId, loginAlias, pin }) {
  const alias = String(loginAlias || '').trim().toLowerCase();
  const cleanPin = String(pin || '').replace(/\D/g, '');
  if (!alias) throw new Error('Identitas login karyawan belum tersedia.');
  if (!/^\d{4}$/.test(cleanPin)) throw new Error('PIN karyawan harus tepat 4 digit.');
  const digest = await sha256([
    'bmpos-employee-auth-v2',
    String(storeId || ''),
    String(storeCode || '').trim().toUpperCase(),
    alias,
    cleanPin,
    'BM-POS-SPARK-PEPPER-2026'
  ].join(':'));
  return {
    email: `${alias}@employee.bmpos.invalid`,
    password: `Bm!${digest}`
  };
}

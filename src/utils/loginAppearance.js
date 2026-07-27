export const DEFAULT_LOGIN_APPEARANCE = Object.freeze({
  headerText: '',
  subheaderTemplate: '{branch} · POS Professional v{version}',
  chooserTitle: 'Pilih jenis akun',
  chooserSubtitle: 'Owner dan karyawan memiliki alur login terpisah.',
  ownerTitle: 'Login Owner',
  ownerSubtitle: 'Seluruh cabang, laporan, pengaturan, dan hak akses.',
  employeeTitle: 'Login Karyawan',
  employeeSubtitle: 'Pilih cabang, masukkan nama, lalu PIN 4 digit.',
  onlineTitle: 'Internet tersedia',
  onlineSubtitle: 'Login cloud dan sinkronisasi siap digunakan.',
  offlineTitle: 'Mode offline aktif',
  offlineSubtitle: 'Login offline tersedia untuk akun yang sebelumnya sudah tersimpan pada perangkat ini.',
  footerLead: 'Firebase Spark gratis.',
  footerText: 'Karyawan cukup memakai nama dan PIN setelah akun dibuat Owner atau Store Manager.'
});

const LIMITS = Object.freeze({
  headerText: 80,
  subheaderTemplate: 140,
  chooserTitle: 60,
  chooserSubtitle: 160,
  ownerTitle: 60,
  ownerSubtitle: 180,
  employeeTitle: 60,
  employeeSubtitle: 180,
  onlineTitle: 60,
  onlineSubtitle: 180,
  offlineTitle: 60,
  offlineSubtitle: 180,
  footerLead: 80,
  footerText: 220
});

const cleanText = (value, fallback, maxLength, allowEmpty = false) => {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return allowEmpty ? '' : fallback;
  return normalized.slice(0, maxLength);
};

export function normalizeLoginAppearance(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const result = {};
  for (const [key, fallback] of Object.entries(DEFAULT_LOGIN_APPEARANCE)) {
    result[key] = cleanText(source[key], fallback, LIMITS[key] || 180, key === 'headerText');
  }
  return result;
}

export function renderLoginTemplate(template, values = {}) {
  const safeTemplate = String(template || DEFAULT_LOGIN_APPEARANCE.subheaderTemplate);
  const replacements = {
    branch: String(values.branch || 'Pilih cabang'),
    version: String(values.version || ''),
    business: String(values.business || 'BUMI MAKMUR')
  };
  return safeTemplate.replace(/\{(branch|version|business)\}/gi, (_, key) => replacements[key.toLowerCase()] || '');
}

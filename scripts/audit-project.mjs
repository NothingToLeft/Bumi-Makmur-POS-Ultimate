import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const notices = [];

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'android', 'release', '.git'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(full));
    else output.push(full);
  }
  return output;
}

function relative(file) { return path.relative(root, file).replaceAll('\\', '/'); }

async function resolveImport(file, specifier) {
  const base = path.resolve(path.dirname(file), specifier);
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, path.join(base, 'index.js'), path.join(base, 'index.jsx')];
  for (const candidate of candidates) {
    try { if ((await stat(candidate)).isFile()) return true; } catch {}
  }
  return false;
}

const required = [
  'package.json', 'src/App.jsx', 'src/store/PosContext.jsx', 'src/services/firebase.js',
  'firestore.rules', 'firestore.indexes.json', 'public/manifest.webmanifest', 'public/sw.js',
  'public/_redirects', 'public/_headers', '.github/workflows/build-android.yml', '.github/workflows/build-windows.yml', 'electron/main.cjs', 'electron/preload.cjs',
  'src/screens/BusinessToolsScreen.jsx', 'src/utils/businessInsights.js', 'RELEASE-NOTES-Bumi-Makmur-POS-v5.8.0.md'
];
for (const item of required) {
  try { await access(path.join(root, item)); } catch { errors.push(`File wajib hilang: ${item}`); }
}

for (const forbidden of ['functions', 'storage.rules']) {
  try { await access(path.join(root, forbidden)); errors.push(`Ketergantungan berbayar masih ada: ${forbidden}`); } catch {}
}

const allFiles = await walk(root);
const sourceFiles = allFiles.filter(file => /\.(?:js|jsx|mjs|cjs)$/.test(file));
for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  if (!file.endsWith('.jsx')) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) errors.push(`${relative(file)}: syntax error — ${(result.stderr || result.stdout).trim()}`);
  }
  const importPattern = /(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+|import\()(['"])(\.[^'"]+)\1/g;
  for (const match of source.matchAll(importPattern)) {
    if (!await resolveImport(file, match[2])) errors.push(`${relative(file)}: import tidak ditemukan ${match[2]}`);
  }
}

for (const file of allFiles.filter(file => file.endsWith('.json'))) {
  try { JSON.parse(await readFile(file, 'utf8')); } catch (error) { errors.push(`${relative(file)}: JSON invalid — ${error.message}`); }
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |)PRIVATE KEY-----/,
  /"private_key"\s*:\s*"-----BEGIN/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /ANDROID_KEYSTORE_BASE64\s*=\s*[A-Za-z0-9+/]{100,}/
];
for (const file of allFiles.filter(file => !/\.(?:png|jpg|jpeg|webp|zip|jks|aab|apk)$/.test(file))) {
  const source = await readFile(file, 'utf8').catch(() => '');
  for (const pattern of secretPatterns) {
    if (pattern.test(source)) errors.push(`${relative(file)}: kemungkinan secret/private key terdeteksi`);
  }
}

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (pkg.version !== '5.8.0') errors.push(`Versi package harus 5.8.0, ditemukan ${pkg.version}`);
if (!pkg.dependencies?.firebase) errors.push('Dependency firebase hilang');

const rules = await readFile(path.join(root, 'firestore.rules'), 'utf8');
for (const collection of ['products', 'sales', 'purchases', 'purchaseOrders', 'customers', 'receivables', 'payables', 'refunds', 'publicReceipts', 'branchPaymentProfiles', 'supplierPriceHistory', 'quotations', 'serialNumbers', 'warrantyClaims']) {
  if (!rules.includes(collection)) errors.push(`Firestore rules belum mencakup ${collection}`);
}

notices.push(`${sourceFiles.length} file JS/JSX/MJS diperiksa`);
notices.push(`${allFiles.filter(file => file.endsWith('.json')).length} file JSON valid`);
notices.push('Relative imports, required files, forbidden paid services, dan secret scan diperiksa');

if (errors.length) {
  console.error('\nAUDIT GAGAL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('AUDIT LULUS');
for (const notice of notices) console.log(`- ${notice}`);

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
  'src/screens/BusinessToolsScreen.jsx', 'src/utils/businessInsights.js', 'src/services/customerDisplayBridge.js', 'RELEASE-NOTES-Bumi-Makmur-POS-v6.0.3.md', 'RELEASE-NOTES-Bumi-Makmur-POS-v6.1.0.md', 'RELEASE-NOTES-Bumi-Makmur-POS-v6.1.1.md', 'RELEASE-NOTES-Bumi-Makmur-POS-v6.2.0.md', 'RELEASE-NOTES-Bumi-Makmur-POS-v6.3.0.md', 'functions/api/product-image-search.js'
];
for (const item of required) {
  try { await access(path.join(root, item)); } catch { errors.push(`File wajib hilang: ${item}`); }
}

for (const forbidden of ['storage.rules']) {
  try { await access(path.join(root, forbidden)); errors.push(`Konfigurasi Firebase di luar Spark-only masih ada: ${forbidden}`); } catch {}
}

const allFiles = await walk(root);
const sourceFiles = allFiles.filter(file => /\.(?:js|jsx|mjs|cjs)$/.test(file));
let esbuildTransform = null;
try {
  ({ transform: esbuildTransform } = await import('esbuild'));
} catch {
  notices.push('Parser esbuild tidak tersedia di environment lokal; CI setelah npm install akan memvalidasi JSX dengan esbuild.');
}
for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  if (esbuildTransform && /\.(?:js|jsx|mjs)$/.test(file)) {
    try {
      const loader = file.endsWith('.jsx') ? 'jsx' : 'js';
      await esbuildTransform(source, { loader, sourcefile: relative(file), jsx: 'automatic', format: 'esm' });
    } catch (error) {
      errors.push(`${relative(file)}: esbuild syntax error — ${error.message}`);
    }
  } else if (!file.endsWith('.jsx')) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) errors.push(`${relative(file)}: syntax error — ${(result.stderr || result.stdout).trim()}`);
  }
  if (file.endsWith('.jsx')) {
    // Heuristik ringan untuk menangkap komponen JSX yang dipakai tetapi tidak
    // di-import/dideklarasikan. Ini sengaja ada sebagai guard tambahan saat
    // parser penuh belum tersedia; bug CloudUpload v6.0.3 R2 akan tertangkap di sini.
    const defined = new Set(['React', 'Fragment', 'Icon']);
    for (const match of source.matchAll(/import\s+([^;]+?)\s+from\s+['"][^'"]+['"]/gs)) {
      const clause = match[1].trim();
      if (clause && !clause.startsWith('{') && !clause.startsWith('*')) defined.add(clause.split(',')[0].trim());
      for (const named of clause.matchAll(/\{([^}]+)\}/gs)) {
        for (const item of named[1].split(',')) {
          const clean = item.trim();
          if (clean) defined.add(clean.split(/\s+as\s+/).pop().trim());
        }
      }
      const namespace = clause.match(/\*\s+as\s+(\w+)/);
      if (namespace) defined.add(namespace[1]);
    }
    for (const pattern of [/function\s+([A-Z]\w*)\s*\(/g, /class\s+([A-Z]\w*)/g, /(?:const|let|var)\s+([A-Z]\w*)\s*=/g]) {
      for (const match of source.matchAll(pattern)) defined.add(match[1]);
    }
    const tags = new Set([...source.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)].map(match => match[1]));
    for (const tag of tags) if (!defined.has(tag)) errors.push(`${relative(file)}: komponen JSX ${tag} dipakai tetapi tidak di-import/dideklarasikan`);
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
if (pkg.version !== '6.3.0') errors.push(`Versi package harus 6.3.0, ditemukan ${pkg.version}`);
if (pkg.dependencies?.['firebase-functions']) errors.push('Dependency firebase-functions tidak boleh digunakan; backend Firebase harus tetap Spark-only.');
if (!pkg.dependencies?.firebase) errors.push('Dependency firebase hilang');

const firebaseJson = JSON.parse(await readFile(path.join(root, 'firebase.json'), 'utf8'));
if (Object.prototype.hasOwnProperty.call(firebaseJson, 'functions')) errors.push('firebase.json tidak boleh mengaktifkan Firebase Functions.');
if (Object.prototype.hasOwnProperty.call(firebaseJson, 'storage')) errors.push('firebase.json tidak boleh mengaktifkan Firebase Storage.');

const imageSearchFunction = await readFile(path.join(root, 'functions/api/product-image-search.js'), 'utf8');
const productMedia = await readFile(path.join(root, 'src/services/productMedia.js'), 'utf8');
if (!productMedia.includes('google_search') || !productMedia.includes('generativelanguage.googleapis.com')) errors.push('Pencarian foto produk belum memakai Gemini Google Search grounding langsung dari perangkat.');
if (/generativelanguage\.googleapis\.com|google_search|body\?\.apiKey|apiKey\s*=/.test(imageSearchFunction)) errors.push('Cloudflare Pages Function tidak boleh menerima/menyimpan/meneruskan Gemini API key atau memanggil Gemini.');
if (/firebase-functions|firebase\/functions/.test(imageSearchFunction)) errors.push('Cloudflare Pages Function tidak boleh bergantung Firebase Functions.');
if (!/safeFetch|127\.0\.0\.1|localhost|isBlockedHostname/i.test(imageSearchFunction)) errors.push('Cloudflare Pages image helper belum menunjukkan SSRF/private-network guard.');

const indexes = JSON.parse(await readFile(path.join(root, 'firestore.indexes.json'), 'utf8'));
for (const fieldPath of ['posImage.dataUrl', 'groupPosImage.dataUrl']) {
  const exemption = (indexes.fieldOverrides || []).find(item => item.collectionGroup === 'products' && item.fieldPath === fieldPath && Array.isArray(item.indexes) && item.indexes.length === 0);
  if (!exemption) errors.push(`Firestore index exemption hilang untuk products.${fieldPath}`);
}

const rules = await readFile(path.join(root, 'firestore.rules'), 'utf8');

const deployWorkflow = await readFile(path.join(root, '.github/workflows/deploy-firebase.yml'), 'utf8');
if (!deployWorkflow.includes('BUMI_MAKMUR_RULESET_VERSION=6.1.0')) errors.push('Workflow deploy Firebase belum memverifikasi marker ruleset v6.1.0');
if (!deployWorkflow.includes('firestore:rules,firestore:indexes')) errors.push('Workflow deploy Firebase tidak dibatasi ke Firestore Rules/Indexes');
if (/--only[^\n]*(?:functions|storage)|firebase deploy[^\n]*(?:functions|storage)/i.test(deployWorkflow)) errors.push('Workflow Firebase mencoba deploy layanan di luar Spark-only Firestore');
for (const collection of ['products', 'sales', 'purchases', 'purchaseOrders', 'customers', 'receivables', 'payables', 'refunds', 'publicReceipts', 'branchPaymentProfiles', 'supplierPriceHistory', 'quotations', 'serialNumbers', 'warrantyClaims', 'shifts', 'cashMovements', 'feedback']) {
  if (!rules.includes(collection)) errors.push(`Firestore rules belum mencakup ${collection}`);
}

notices.push(`${sourceFiles.length} file JS/JSX/MJS diperiksa`);
notices.push(`${allFiles.filter(file => file.endsWith('.json')).length} file JSON valid`);
notices.push('Relative imports, required files, Firebase Spark-only, Cloudflare Pages Free function, secret scan, dan parser JSX/esbuild CI diperiksa');

if (errors.length) {
  console.error('\nAUDIT GAGAL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('AUDIT LULUS');
for (const notice of notices) console.log(`- ${notice}`);

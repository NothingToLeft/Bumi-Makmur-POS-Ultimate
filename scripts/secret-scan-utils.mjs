const FIREBASE_WEB_API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{30,}/g;
const PRIVATE_KEY_PATTERNS = [
  /-----BEGIN (?:RSA |EC |)PRIVATE KEY-----/g,
  /"private_key"\s*:\s*"-----BEGIN/g,
  /ANDROID_KEYSTORE_BASE64\s*=\s*[A-Za-z0-9+/]{100,}/g,
];

const RUNTIME_ENV_ALLOWED_KEYS = new Set([
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_STORE_ID',
  'VITE_FIREBASE_STORE_CODE',
  'VITE_PUBLIC_APP_URL',
]);

function getLineAt(source, index) {
  const start = source.lastIndexOf('\n', Math.max(0, index - 1)) + 1;
  const endIndex = source.indexOf('\n', index);
  const end = endIndex === -1 ? source.length : endIndex;
  return source.slice(start, end).replace(/\r$/, '');
}

function isRuntimeEnvFile(relativePath) {
  if (relativePath === '.env.example') return false;
  return /^\.env(?:\.[A-Za-z0-9_-]+)*$/.test(relativePath);
}

function isAllowedFirebaseWebApiKeyOccurrence(relativePath, source, index, value) {
  if (!isRuntimeEnvFile(relativePath)) return false;
  const line = getLineAt(source, index).trim();
  const match = line.match(/^VITE_FIREBASE_API_KEY\s*=\s*(?:\"([^\"]+)\"|'([^']+)'|([^\s#]+))\s*$/);
  const configuredValue = match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
  return configuredValue === value;
}

export function validateRuntimeEnvFile(relativePath, source) {
  if (!isRuntimeEnvFile(relativePath)) return [];

  const issues = [];
  const seen = new Set();
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) {
      issues.push(`baris ${index + 1} pada ${relativePath} tidak valid`);
      continue;
    }

    const key = line.slice(0, separator).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      issues.push(`nama variabel ${key || '(kosong)'} pada ${relativePath} tidak valid`);
      continue;
    }
    if (!RUNTIME_ENV_ALLOWED_KEYS.has(key)) {
      issues.push(`variabel ${key} tidak diizinkan pada ${relativePath}`);
      continue;
    }
    if (seen.has(key)) issues.push(`variabel ${key} terduplikasi pada ${relativePath}`);
    seen.add(key);
  }

  return issues;
}

export function scanTextForPotentialSecrets(relativePath, source) {
  const issues = [...validateRuntimeEnvFile(relativePath, source)];

  for (const pattern of PRIVATE_KEY_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) {
      issues.push('kemungkinan private key/keystore secret terdeteksi');
    }
  }

  FIREBASE_WEB_API_KEY_PATTERN.lastIndex = 0;
  for (const match of source.matchAll(FIREBASE_WEB_API_KEY_PATTERN)) {
    const value = match[0];
    if (isAllowedFirebaseWebApiKeyOccurrence(relativePath, source, match.index ?? 0, value)) continue;
    issues.push('kemungkinan Google API key terdeteksi di luar VITE_FIREBASE_API_KEY runtime');
  }

  return [...new Set(issues)];
}

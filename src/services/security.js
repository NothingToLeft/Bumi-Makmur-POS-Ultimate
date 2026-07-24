const bytesToHex = bytes => Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
const hexToBytes = hex => new Uint8Array((hex.match(/.{1,2}/g) || []).map(byte => parseInt(byte, 16)));

const legacyHashPin = async pin => {
  const normalized = String(pin || '').trim();
  if (!normalized) return '';
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    return bytesToHex(new Uint8Array(digest));
  }
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fallback-${(hash >>> 0).toString(16)}`;
};

export const createPinCredential = async (pin, existingSalt = '', iterations = 120000) => {
  const normalized = String(pin || '').trim();
  if (!/^\d{4}$/.test(normalized)) throw new Error('PIN harus 4 digit.');
  if (!globalThis.crypto?.subtle) {
    return {
      pinHash: await legacyHashPin(normalized), pinSalt: '', pinIterations: 0,
      pinAlgorithm: 'SHA-256-LEGACY'
    };
  }
  const salt = existingSalt ? hexToBytes(existingSalt) : globalThis.crypto.getRandomValues(new Uint8Array(16));
  const key = await globalThis.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(normalized), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256
  );
  return {
    pinHash: bytesToHex(new Uint8Array(bits)), pinSalt: bytesToHex(salt),
    pinIterations: iterations, pinAlgorithm: 'PBKDF2-SHA256'
  };
};

export const verifyPinCredential = async (pin, user) => {
  if (user.pinSalt && user.pinHash) {
    const credential = await createPinCredential(pin, user.pinSalt, user.pinIterations || 120000);
    return credential.pinHash === user.pinHash;
  }
  return (await legacyHashPin(pin)) === user.pinHash;
};

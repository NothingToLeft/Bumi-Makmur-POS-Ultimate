import { validateQrisPayload } from '../utils/qrisDynamic.js';

function fileToObjectUrl(file) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  return URL.createObjectURL(file);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar QRIS tidak dapat dibaca.'));
    image.src = source;
  });
}

async function decodeImageElement(image) {
  const { BrowserQRCodeReader } = await import('@zxing/browser');
  const reader = new BrowserQRCodeReader();
  const result = await reader.decodeFromImageElement(image);
  const text = String(result?.getText?.() || result?.text || '').trim();
  if (!text) throw new Error('Simbol QR terdeteksi tetapi payload QRIS kosong.');
  return text;
}

export async function decodeQrisFromFile(file) {
  if (!file) throw new Error('File QRIS belum dipilih.');
  const objectUrl = fileToObjectUrl(file);
  if (!objectUrl) throw new Error('Perangkat tidak mendukung pembacaan file QRIS lokal.');
  try {
    const image = await loadImage(objectUrl);
    const payload = await decodeImageElement(image);
    const validation = validateQrisPayload(payload, { requireStatic: true });
    if (!validation.valid) throw new Error(validation.errors[0] || 'QR pada gambar bukan QRIS statis yang valid.');
    return { payload, validation };
  } catch (error) {
    if (/QRIS|payload|CRC|tag|merchant|statis/i.test(String(error?.message || ''))) throw error;
    throw new Error('Data QRIS statis belum dapat dibaca dari gambar ini. Gunakan gambar QR yang lebih tajam atau tempel payload QRIS secara manual.');
  } finally {
    try { URL.revokeObjectURL(objectUrl); } catch {}
  }
}

export async function decodeQrisFromDataUrl(dataUrl) {
  const source = String(dataUrl || '').trim();
  if (!source.startsWith('data:image/')) throw new Error('Gambar QRIS tersimpan tidak valid.');
  try {
    const image = await loadImage(source);
    const payload = await decodeImageElement(image);
    const validation = validateQrisPayload(payload, { requireStatic: true });
    if (!validation.valid) throw new Error(validation.errors[0] || 'QR tersimpan bukan QRIS statis yang valid.');
    return { payload, validation };
  } catch (error) {
    if (/QRIS|payload|CRC|tag|merchant|statis/i.test(String(error?.message || ''))) throw error;
    throw new Error('QRIS tersimpan belum dapat dibaca otomatis. Unggah ulang QR yang lebih tajam atau tempel payload QRIS secara manual.');
  }
}

export const ASSET_PROFILES = Object.freeze({
  qris: Object.freeze({
    kind: 'qris',
    label: 'QRIS',
    maxSourceBytes: 24 * 1024 * 1024,
    targetBytes: 330_000,
    hardLimitBytes: 420_000,
    minimumSide: 320,
    preserveSharpEdges: true,
    whiteBackground: true,
    autoCrop: true,
    quietZoneRatio: 0.045,
    attempts: [
      { maxDimension: 1800, mimeType: 'image/png', quality: 1, mode: 'color' },
      { maxDimension: 1500, mimeType: 'image/png', quality: 1, mode: 'color' },
      { maxDimension: 1280, mimeType: 'image/png', quality: 1, mode: 'color' },
      { maxDimension: 1100, mimeType: 'image/png', quality: 1, mode: 'color' },
      { maxDimension: 960, mimeType: 'image/png', quality: 1, mode: 'color' },
      { maxDimension: 1100, mimeType: 'image/webp', quality: 0.94, mode: 'color' },
      { maxDimension: 960, mimeType: 'image/webp', quality: 0.91, mode: 'color' },
      { maxDimension: 840, mimeType: 'image/webp', quality: 0.88, mode: 'color' },
      { maxDimension: 720, mimeType: 'image/webp', quality: 0.84, mode: 'color' },
      { maxDimension: 640, mimeType: 'image/webp', quality: 0.80, mode: 'color' },
      { maxDimension: 560, mimeType: 'image/webp', quality: 0.76, mode: 'color' },
      { maxDimension: 640, mimeType: 'image/png', quality: 1, mode: 'monochrome' },
      { maxDimension: 560, mimeType: 'image/png', quality: 1, mode: 'monochrome' },
      { maxDimension: 512, mimeType: 'image/png', quality: 1, mode: 'monochrome' },
      { maxDimension: 480, mimeType: 'image/png', quality: 1, mode: 'monochrome' }
    ]
  }),
  logo: Object.freeze({
    kind: 'logo',
    label: 'logo',
    maxSourceBytes: 12 * 1024 * 1024,
    targetBytes: 170_000,
    hardLimitBytes: 190_000,
    minimumSide: 256,
    preserveSharpEdges: false,
    whiteBackground: false,
    autoCrop: false,
    quietZoneRatio: 0,
    attempts: [
      { maxDimension: 900, mimeType: 'image/webp', quality: 0.92, mode: 'color' },
      { maxDimension: 720, mimeType: 'image/webp', quality: 0.88, mode: 'color' },
      { maxDimension: 560, mimeType: 'image/webp', quality: 0.84, mode: 'color' },
      { maxDimension: 420, mimeType: 'image/webp', quality: 0.80, mode: 'color' },
      { maxDimension: 320, mimeType: 'image/webp', quality: 0.76, mode: 'color' }
    ]
  })
});

export function formatAssetBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function dataUrlByteLength(dataUrl) {
  const value = String(dataUrl || '');
  const comma = value.indexOf(',');
  if (comma < 0) return new TextEncoder().encode(value).length;
  const header = value.slice(0, comma);
  const payload = value.slice(comma + 1);
  if (!/;base64/i.test(header)) return new TextEncoder().encode(decodeURIComponent(payload)).length;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(payload.length * 3 / 4) - padding);
}

export function buildCompressionPlan(kind, width, height) {
  const profile = ASSET_PROFILES[kind] || ASSET_PROFILES.logo;
  const sourceMax = Math.max(1, Number(width) || 1, Number(height) || 1);
  return profile.attempts.map(attempt => ({
    ...attempt,
    maxDimension: Math.min(sourceMax, attempt.maxDimension)
  })).filter((attempt, index, rows) => {
    if (index === 0) return true;
    const previous = rows[index - 1];
    return attempt.maxDimension !== previous.maxDimension
      || attempt.quality !== previous.quality
      || attempt.mimeType !== previous.mimeType
      || attempt.mode !== previous.mode;
  });
}

export function validateStoreAsset(file, kind) {
  const profile = ASSET_PROFILES[kind] || ASSET_PROFILES.logo;
  if (!file) throw new Error('File belum dipilih.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('File harus berupa gambar PNG, JPG, atau WebP.');
  if (Number(file.size || 0) <= 0) throw new Error('File gambar kosong atau rusak.');
  if (Number(file.size || 0) > profile.maxSourceBytes) {
    throw new Error(`${profile.label} terlalu besar. Maksimal ${formatAssetBytes(profile.maxSourceBytes)} sebelum optimasi.`);
  }
  return profile;
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Hasil optimasi gambar tidak dapat dibaca.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    const fail = () => reject(new Error('Format gambar tidak didukung atau file rusak.'));

    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const objectUrl = URL.createObjectURL(file);
      image.onerror = () => { URL.revokeObjectURL(objectUrl); fail(); };
      image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
      image.src = objectUrl;
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File gambar tidak dapat dibaca.'));
    reader.onload = () => {
      image.onerror = fail;
      image.onload = () => resolve(image);
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Browser gagal mengompresi gambar.')), mimeType, quality);
  });
}

function fullBounds(width, height) {
  return { x: 0, y: 0, width, height, cropped: false, cropStrategy: 'full-image' };
}

function normalizeQrBounds(rect, sourceWidth, sourceHeight, strategy = 'qr-detector') {
  if (!rect || !sourceWidth || !sourceHeight) return null;
  const rawWidth = Math.max(0, Number(rect.width || 0));
  const rawHeight = Math.max(0, Number(rect.height || 0));
  if (rawWidth < 32 || rawHeight < 32) return null;
  const ratio = rawWidth / Math.max(1, rawHeight);
  if (ratio < 0.72 || ratio > 1.38) return null;
  const centerX = Number(rect.x || 0) + (rawWidth / 2);
  const centerY = Number(rect.y || 0) + (rawHeight / 2);
  const square = Math.max(rawWidth, rawHeight);
  const left = Math.max(0, Math.floor(centerX - (square / 2)));
  const top = Math.max(0, Math.floor(centerY - (square / 2)));
  const right = Math.min(sourceWidth, Math.ceil(centerX + (square / 2)));
  const bottom = Math.min(sourceHeight, Math.ceil(centerY + (square / 2)));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  if (Math.min(width, height) < 160) return null;
  return { x: left, y: top, width, height, cropped: true, cropStrategy: strategy };
}

async function detectQrBounds(image, profile) {
  const sourceWidth = Number(image.naturalWidth || image.width || 0);
  const sourceHeight = Number(image.naturalHeight || image.height || 0);
  if (!sourceWidth || !sourceHeight) return fullBounds(sourceWidth, sourceHeight);

  // Chromium/Android can expose BarcodeDetector. Its boundingBox is the most
  // accurate way to retain only the QR symbol while the output renderer adds
  // a fresh white quiet-zone around it.
  try {
    if (typeof globalThis.BarcodeDetector === 'function') {
      const detector = new globalThis.BarcodeDetector({ formats: ['qr_code'] });
      const detections = await detector.detect(image);
      const candidate = detections?.find(row => row?.boundingBox);
      const bounds = normalizeQrBounds(candidate?.boundingBox, sourceWidth, sourceHeight, 'barcode-detector');
      if (bounds) return bounds;
    }
  } catch {}

  // Fallback to the bundled ZXing QR reader. Result points are finder-pattern
  // centres, so expand their square before adding the final quiet-zone.
  try {
    const { BrowserQRCodeReader } = await import('@zxing/browser');
    const reader = new BrowserQRCodeReader();
    const result = await reader.decodeFromImageElement(image);
    const points = result?.getResultPoints?.() || result?.resultPoints || [];
    if (points.length >= 3) {
      const xs = points.map(point => Number(point?.getX?.() ?? point?.x)).filter(Number.isFinite);
      const ys = points.map(point => Number(point?.getY?.() ?? point?.y)).filter(Number.isFinite);
      if (xs.length >= 3 && ys.length >= 3) {
        const minX = Math.min(...xs); const maxX = Math.max(...xs);
        const minY = Math.min(...ys); const maxY = Math.max(...ys);
        const pointSpan = Math.max(maxX - minX, maxY - minY);
        const expandedSize = pointSpan * 1.28;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const bounds = normalizeQrBounds({ x: centerX - expandedSize / 2, y: centerY - expandedSize / 2, width: expandedSize, height: expandedSize }, sourceWidth, sourceHeight, 'zxing-qr-points');
        if (bounds) return bounds;
      }
    }
  } catch {}

  const fallback = detectContentBounds(image, profile);
  return { ...fallback, cropStrategy: fallback.cropped ? 'content-fallback' : 'full-image-fallback' };
}

function detectContentBounds(image, profile) {
  const sourceWidth = Number(image.naturalWidth || image.width || 0);
  const sourceHeight = Number(image.naturalHeight || image.height || 0);
  if (!profile.autoCrop || !sourceWidth || !sourceHeight) return fullBounds(sourceWidth, sourceHeight);

  const analysisMax = 960;
  const scale = Math.min(1, analysisMax / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!context) return fullBounds(sourceWidth, sourceHeight);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  let pixels;
  try { pixels = context.getImageData(0, 0, width, height).data; }
  catch {
    canvas.width = 1; canvas.height = 1;
    return fullBounds(sourceWidth, sourceHeight);
  }

  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  const step = Math.max(1, Math.floor(Math.max(width, height) / 900));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];
      const nonWhite = alpha > 12 && (red < 246 || green < 246 || blue < 246);
      if (!nonWhite) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  canvas.width = 1;
  canvas.height = 1;
  if (right < left || bottom < top) return fullBounds(sourceWidth, sourceHeight);

  const margin = Math.max(8, Math.round(Math.max(right - left + 1, bottom - top + 1) * 0.025));
  left = Math.max(0, left - margin);
  top = Math.max(0, top - margin);
  right = Math.min(width - 1, right + margin);
  bottom = Math.min(height - 1, bottom + margin);

  const mapped = {
    x: Math.max(0, Math.floor(left / scale)),
    y: Math.max(0, Math.floor(top / scale)),
    width: Math.min(sourceWidth, Math.ceil((right - left + 1) / scale)),
    height: Math.min(sourceHeight, Math.ceil((bottom - top + 1) / scale)),
    cropped: true,
    cropStrategy: 'content-bounds'
  };
  mapped.width = Math.min(mapped.width, sourceWidth - mapped.x);
  mapped.height = Math.min(mapped.height, sourceHeight - mapped.y);

  const retainedArea = (mapped.width * mapped.height) / Math.max(1, sourceWidth * sourceHeight);
  if (retainedArea > 0.97 || mapped.width < profile.minimumSide || mapped.height < profile.minimumSide) {
    return fullBounds(sourceWidth, sourceHeight);
  }
  return mapped;
}

function applyMonochrome(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    const luminance = (pixels[index] * 0.2126) + (pixels[index + 1] * 0.7152) + (pixels[index + 2] * 0.0722);
    const value = alpha < 24 || luminance >= 188 ? 255 : 0;
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
    pixels[index + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
}

function drawAsset(image, attempt, profile, bounds) {
  const crop = bounds || fullBounds(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const quietRatio = profile.whiteBackground ? Math.max(0, Number(profile.quietZoneRatio || 0)) : 0;
  const contentLimit = attempt.maxDimension / Math.max(1, 1 + (quietRatio * 2));
  const scale = Math.min(1, contentLimit / Math.max(crop.width, crop.height));
  const contentWidth = Math.max(1, Math.round(crop.width * scale));
  const contentHeight = Math.max(1, Math.round(crop.height * scale));
  const quiet = quietRatio > 0 ? Math.max(12, Math.round(Math.max(contentWidth, contentHeight) * quietRatio)) : 0;
  const width = contentWidth + (quiet * 2);
  const height = contentHeight + (quiet * 2);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: !profile.whiteBackground, willReadFrequently: attempt.mode === 'monochrome' });
  if (!context) throw new Error('Perangkat tidak menyediakan pengolah gambar Canvas.');
  if (profile.whiteBackground) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingEnabled = !profile.preserveSharpEdges;
  if (context.imageSmoothingEnabled) context.imageSmoothingQuality = 'high';
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, quiet, quiet, contentWidth, contentHeight);
  if (attempt.mode === 'monochrome') applyMonochrome(context, width, height);
  return { canvas, width, height, cropped: Boolean(crop.cropped), quietZone: quiet };
}

async function finalizeCandidate(candidate, file, kind, image, bounds, profile, nearLimit = false) {
  const dataUrl = await readBlobAsDataUrl(candidate.blob);
  return {
    dataUrl,
    meta: {
      kind,
      originalName: String(file.name || `${kind}.png`).slice(0, 120),
      originalBytes: Number(file.size || 0),
      outputBytes: candidate.outputBytes,
      originalWidth: Number(image.naturalWidth || image.width || 0),
      originalHeight: Number(image.naturalHeight || image.height || 0),
      width: candidate.width,
      height: candidate.height,
      mimeType: candidate.mimeType,
      reductionPercent: Math.max(0, Math.round((1 - (candidate.outputBytes / Math.max(1, Number(file.size || 1)))) * 100)),
      optimizedAt: new Date().toISOString(),
      pipeline: candidate.mode === 'monochrome' ? 'high-contrast-fallback' : 'adaptive-color',
      cropped: Boolean(bounds?.cropped),
      cropStrategy: String(bounds?.cropStrategy || (bounds?.cropped ? 'content-bounds' : 'full-image')),
      quietZone: candidate.quietZone || 0,
      nearLimit: Boolean(nearLimit),
      targetBytes: profile.targetBytes
    }
  };
}

export async function processStoreAsset(file, kind = 'logo') {
  const profile = validateStoreAsset(file, kind);
  const image = await loadImage(file);
  const originalWidth = Number(image.naturalWidth || image.width || 0);
  const originalHeight = Number(image.naturalHeight || image.height || 0);
  if (!originalWidth || !originalHeight) throw new Error('Dimensi gambar tidak dapat dibaca.');
  if (kind === 'qris' && Math.min(originalWidth, originalHeight) < profile.minimumSide) {
    throw new Error(`Resolusi QRIS terlalu kecil. Gunakan gambar minimal ${profile.minimumSide} × ${profile.minimumSide} piksel agar tetap mudah dipindai.`);
  }

  const bounds = kind === 'qris' ? await detectQrBounds(image, profile) : detectContentBounds(image, profile);
  const plan = buildCompressionPlan(kind, bounds.width, bounds.height);
  let smallest = null;
  for (const attempt of plan) {
    const rendered = drawAsset(image, attempt, profile, bounds);
    const blob = await canvasToBlob(rendered.canvas, attempt.mimeType, attempt.quality);
    const candidate = {
      blob,
      width: rendered.width,
      height: rendered.height,
      mimeType: blob.type || attempt.mimeType,
      quality: attempt.quality,
      mode: attempt.mode || 'color',
      quietZone: rendered.quietZone,
      outputBytes: blob.size
    };
    rendered.canvas.width = 1;
    rendered.canvas.height = 1;
    if (!smallest || candidate.outputBytes < smallest.outputBytes) smallest = candidate;
    if (candidate.outputBytes <= profile.targetBytes) {
      return finalizeCandidate(candidate, file, kind, image, bounds, profile, false);
    }
  }

  if (smallest && smallest.outputBytes <= profile.hardLimitBytes) {
    return finalizeCandidate(smallest, file, kind, image, bounds, profile, true);
  }

  const smallestLabel = smallest ? formatAssetBytes(smallest.outputBytes) : 'tidak diketahui';
  throw new Error(`${profile.label} belum dapat dioptimalkan ke batas aman ${formatAssetBytes(profile.hardLimitBytes)}. Hasil terkecil ${smallestLabel}. Potong bagian foto yang bukan QR lalu coba lagi.`);
}

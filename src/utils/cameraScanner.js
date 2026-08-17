export const normalizeScannerCode = value => String(value ?? '').trim();

const FRONT_PATTERN = /(front|user|selfie|depan|facetime)/i;
const BACK_PATTERN = /(back|rear|environment|belakang|utama|world)/i;

export function cameraFacingKind(device, index = 0, total = 0) {
  const label = String(device?.label || '');
  if (FRONT_PATTERN.test(label)) return 'user';
  if (BACK_PATTERN.test(label)) return 'environment';
  if (total === 2) return index === 0 ? 'user' : 'environment';
  return 'unknown';
}

export function cameraDisplayLabel(device, index = 0, total = 0) {
  const kind = cameraFacingKind(device, index, total);
  const clean = String(device?.label || '').replace(/\s+/g, ' ').trim();
  const prefix = kind === 'environment' ? 'Belakang' : kind === 'user' ? 'Depan' : `Kamera ${index + 1}`;
  if (!clean) return prefix;
  if (new RegExp(prefix, 'i').test(clean)) return clean;
  return `${prefix} · ${clean}`;
}

export function pickPreferredCamera(devices = [], { preferredDeviceId = '', facingMode = 'environment' } = {}) {
  if (!Array.isArray(devices) || devices.length === 0) return null;
  const exact = devices.find(device => device.deviceId === preferredDeviceId);
  if (exact) return exact;
  const preferredIndex = devices.findIndex((device, index) => cameraFacingKind(device, index, devices.length) === facingMode);
  if (preferredIndex >= 0) return devices[preferredIndex];
  return facingMode === 'environment' ? devices[devices.length - 1] : devices[0];
}

export function nextCameraDevice(devices = [], currentDeviceId = '') {
  if (!Array.isArray(devices) || devices.length < 2) return devices[0] || null;
  const index = Math.max(0, devices.findIndex(device => device.deviceId === currentDeviceId));
  return devices[(index + 1) % devices.length];
}

export function clampCameraZoom(value, capabilities = {}) {
  const zoom = capabilities?.zoom;
  const min = Number(zoom?.min ?? 1);
  const max = Number(zoom?.max ?? min);
  const step = Number(zoom?.step ?? 0.1) || 0.1;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  const clamped = Math.min(max, Math.max(min, numeric));
  return Math.round(clamped / step) * step;
}

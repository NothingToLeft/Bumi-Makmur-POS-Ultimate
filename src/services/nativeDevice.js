import { Capacitor, registerPlugin } from '@capacitor/core';

const NativeDevice = registerPlugin('BumiMakmurNative');

export const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const normalizePermission = value => {
  const state = String(value || 'unknown').toLowerCase();
  if (state === 'granted') return 'granted';
  if (state === 'prompt' || state === 'prompt-with-rationale') return state;
  if (state === 'denied') return 'denied';
  return 'unknown';
};

export async function checkCameraPermission() {
  if (isNativeAndroid()) {
    try {
      const result = await NativeDevice.checkCameraPermission();
      return { state: normalizePermission(result?.state), granted: Boolean(result?.granted) };
    } catch (error) {
      return { state: 'unknown', granted: false, error: error?.message || String(error) };
    }
  }

  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'camera' });
      return { state: normalizePermission(status.state), granted: status.state === 'granted' };
    }
  } catch (error) {
    // Tidak semua browser mengizinkan query permission kamera.
  }
  return { state: 'unknown', granted: false };
}

export async function requestCameraPermission() {
  if (isNativeAndroid()) {
    try {
      const result = await NativeDevice.requestCameraPermission();
      return { state: normalizePermission(result?.state), granted: Boolean(result?.granted) };
    } catch (error) {
      return { state: 'unknown', granted: false, error: error?.message || String(error) };
    }
  }
  return checkCameraPermission();
}

export async function requestStartupCameraPermission() {
  if (!isNativeAndroid()) return { state: 'web', granted: false, skipped: true };
  const current = await checkCameraPermission();
  if (current.granted || current.state === 'denied') return current;
  return requestCameraPermission();
}

export async function openNativeAppSettings() {
  if (!isNativeAndroid()) return { opened: false };
  try {
    return await NativeDevice.openAppSettings();
  } catch (error) {
    return { opened: false, error: error?.message || String(error) };
  }
}

export async function getBiometricAvailability() {
  if (!isNativeAndroid()) {
    return { available: false, status: 'web', message: 'Biometrik native tersedia pada APK Android.' };
  }
  try {
    return await NativeDevice.biometricAvailability();
  } catch (error) {
    return { available: false, status: 'error', message: error?.message || String(error) };
  }
}

export async function authenticateBiometric({ title, subtitle } = {}) {
  if (!isNativeAndroid()) {
    return { success: false, error: 'Biometrik hanya tersedia pada APK Android.' };
  }
  try {
    return await NativeDevice.authenticateBiometric({
      title: title || 'Buka Bumi Makmur POS',
      subtitle: subtitle || 'Gunakan sidik jari atau pengenalan wajah perangkat.'
    });
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
}

const fileToBase64 = async file => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  return btoa(binary);
};

export async function recognizeTextFromImage(dataUrl) {
  if (!isNativeAndroid()) return { success: false, text: '', status: 'not-native' };
  try {
    const result = await NativeDevice.recognizeText({ dataUrl: String(dataUrl || '') });
    return { success: Boolean(result?.success), text: String(result?.text || ''), status: result?.status || 'ok' };
  } catch (error) {
    return { success: false, text: '', status: 'error', error: error?.message || String(error) };
  }
}

export async function shareNativePdf(file, { title = 'Bagikan PDF', text = '', preferWhatsApp = false } = {}) {
  if (!isNativeAndroid()) return { shared: false, status: 'not-native' };
  try {
    const base64 = await fileToBase64(file);
    return await NativeDevice.sharePdf({ filename: file.name || 'laporan.pdf', base64, title, text, preferWhatsApp: Boolean(preferWhatsApp) });
  } catch (error) {
    return { shared: false, status: 'error', error: error?.message || String(error) };
  }
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Flashlight, ImagePlus, Keyboard, RefreshCw, ScanLine, Volume2, VolumeX, ZoomIn } from 'lucide-react';
import { Button, Field, Input, Modal, Select } from './ui.jsx';
import { openNativeAppSettings, requestCameraPermission } from '../services/nativeDevice.js';
import {
  cameraDisplayLabel, cameraFacingKind, clampCameraZoom, nextCameraDevice, normalizeScannerCode, pickPreferredCamera
} from '../utils/cameraScanner.js';

const PREF_KEY = 'bmpos-barcode-scanner-preferences-v1';

const defaultPrefs = {
  facingMode: 'environment',
  deviceId: '',
  sound: true,
  vibrate: true,
  rapid: false
};

function loadPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return { ...defaultPrefs, ...stored };
  } catch {
    return { ...defaultPrefs };
  }
}

function savePrefs(patch) {
  try {
    const next = { ...loadPrefs(), ...patch };
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
  } catch {
    // Penyimpanan preferensi scanner bersifat best-effort.
  }
}

function scannerFeedback({ sound, vibrate }) {
  if (vibrate && navigator.vibrate) navigator.vibrate(70);
  if (!sound) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 980;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.09);
    oscillator.addEventListener('ended', () => void context.close(), { once: true });
  } catch {
    // Beep tidak wajib untuk keberhasilan scan.
  }
}

function outcomeFrom(result) {
  if (typeof result === 'string') return { ok: false, message: result };
  if (result === false) return { ok: false, message: 'Barcode tidak dapat digunakan.' };
  if (result && typeof result === 'object') return { ok: result.ok !== false, message: result.message || '', close: result.close === true };
  return { ok: true, message: '' };
}

export default function BarcodeScannerModal({
  title = 'Scan Barcode',
  onClose,
  onDetected,
  allowContinuous = false,
  helperText = 'Arahkan barcode ke area pemindaian. Scanner USB/Bluetooth tetap dapat dipakai melalui kolom manual.',
  manualPlaceholder = 'Ketik/scan barcode atau SKU'
}) {
  const initialPrefs = useMemo(loadPrefs, []);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(initialPrefs.deviceId || '');
  const [facingMode, setFacingMode] = useState(initialPrefs.facingMode || 'environment');
  const [sound, setSound] = useState(initialPrefs.sound !== false);
  const [vibrate, setVibrate] = useState(initialPrefs.vibrate !== false);
  const [rapidMode, setRapidMode] = useState(Boolean(allowContinuous && initialPrefs.rapid));
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomCaps, setZoomCaps] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [scanCount, setScanCount] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const controlsRef = useRef(null);
  const trackRef = useRef(null);
  const runIdRef = useRef(0);
  const lastDetectionRef = useRef({ code: '', at: 0 });
  const fileRef = useRef(null);

  const stopCamera = () => {
    runIdRef.current += 1;
    try { controlsRef.current?.stop?.(); } catch {}
    controlsRef.current = null;
    streamRef.current?.getTracks?.().forEach(track => track.stop());
    streamRef.current = null;
    trackRef.current = null;
    setTorchSupported(false);
    setTorchOn(false);
    setZoomCaps(null);
  };

  const handleDetection = async (rawValue, source = 'camera') => {
    const normalized = normalizeScannerCode(rawValue);
    if (!normalized) return false;
    const now = Date.now();
    const previous = lastDetectionRef.current;
    const duplicateCooldown = source === 'camera' ? 1600 : 180;
    if (previous.code === normalized && now - previous.at < duplicateCooldown) return false;
    lastDetectionRef.current = { code: normalized, at: now };
    setCode(normalized);
    setError('');

    let result;
    try {
      result = await onDetected?.(normalized);
    } catch (detectionError) {
      result = detectionError?.message || 'Barcode gagal diproses.';
    }
    const outcome = outcomeFrom(result);
    if (!outcome.ok) {
      setError(outcome.message || 'Barcode tidak dapat digunakan.');
      return false;
    }

    scannerFeedback({ sound, vibrate });
    setScanCount(count => count + 1);
    setNotice(outcome.message || `Barcode ${normalized} terbaca.`);
    if (!allowContinuous || !rapidMode || outcome.close) {
      stopCamera();
      onClose?.();
    }
    return true;
  };

  const refreshDeviceList = async (BrowserCodeReader, currentTrack) => {
    let videoDevices = [];
    try {
      videoDevices = await BrowserCodeReader.listVideoInputDevices();
    } catch {
      const enumerated = await navigator.mediaDevices?.enumerateDevices?.();
      videoDevices = (enumerated || []).filter(device => device.kind === 'videoinput');
    }
    setDevices(videoDevices);
    const currentId = currentTrack?.getSettings?.().deviceId || '';
    const picked = pickPreferredCamera(videoDevices, { preferredDeviceId: currentId || selectedDeviceId, facingMode });
    const activeDeviceId = currentId || picked?.deviceId || '';
    if (activeDeviceId && activeDeviceId !== selectedDeviceId) {
      setSelectedDeviceId(activeDeviceId);
      savePrefs({ deviceId: activeDeviceId });
    }
  };

  const startCamera = async ({ deviceId = selectedDeviceId, nextFacing = facingMode } = {}) => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    stopCamera();
    runIdRef.current = runId;
    setError('');
    setNotice('');
    setCameraStatus('starting');
    try {
      const permission = await requestCameraPermission();
      if (permission.state === 'denied') throw new Error('Izin kamera ditolak. Buka Pengaturan Aplikasi lalu izinkan Kamera.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera perangkat tidak tersedia.');

      const [{ BrowserMultiFormatReader, BrowserCodeReader }] = await Promise.all([import('@zxing/browser')]);
      const baseVideo = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 }
      };
      const constraints = deviceId
        ? { video: { ...baseVideo, deviceId: { exact: deviceId } }, audio: false }
        : { video: { ...baseVideo, facingMode: { ideal: nextFacing } }, audio: false };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstError) {
        if (!deviceId) throw firstError;
        stream = await navigator.mediaDevices.getUserMedia({ video: { ...baseVideo, facingMode: { ideal: nextFacing } }, audio: false });
      }
      if (runIdRef.current !== runId) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const settings = track?.getSettings?.() || {};
      if (settings.facingMode === 'user' || settings.facingMode === 'environment') {
        setFacingMode(settings.facingMode);
        savePrefs({ facingMode: settings.facingMode });
      }
      const capabilities = track?.getCapabilities?.() || {};
      if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
        try { await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch {}
      }
      setTorchSupported(Boolean(capabilities.torch));
      if (capabilities.zoom && Number.isFinite(Number(capabilities.zoom.min)) && Number.isFinite(Number(capabilities.zoom.max))) {
        setZoomCaps(capabilities.zoom);
        const currentZoom = Number(settings.zoom ?? capabilities.zoom.min ?? 1);
        setZoom(clampCameraZoom(currentZoom, capabilities));
      }
      await refreshDeviceList(BrowserCodeReader, track);

      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromStream(stream, videoRef.current, (result) => {
        if (!result || runIdRef.current !== runId) return;
        const value = typeof result.getText === 'function' ? result.getText() : result.text;
        void handleDetection(value, 'camera');
      });
      if (runIdRef.current !== runId) return;
      setCameraStatus('active');
    } catch (cameraError) {
      if (runIdRef.current !== runId) return;
      stopCamera();
      setCameraStatus('error');
      setError(cameraError?.message || 'Kamera tidak dapat dibuka.');
    }
  };

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
    // Scanner sengaja start sekali saat modal dibuka; pergantian kamera memanggil startCamera manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseCamera = async deviceId => {
    const index = devices.findIndex(device => device.deviceId === deviceId);
    const nextFacing = cameraFacingKind(devices[index], index, devices.length);
    const normalizedFacing = nextFacing === 'unknown' ? facingMode : nextFacing;
    setSelectedDeviceId(deviceId);
    setFacingMode(normalizedFacing);
    savePrefs({ deviceId, facingMode: normalizedFacing });
    await startCamera({ deviceId, nextFacing: normalizedFacing });
  };

  const switchCamera = async () => {
    if (devices.length > 1) {
      const next = nextCameraDevice(devices, selectedDeviceId || trackRef.current?.getSettings?.().deviceId || '');
      if (next?.deviceId) return chooseCamera(next.deviceId);
    }
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedDeviceId('');
    savePrefs({ deviceId: '', facingMode: nextFacing });
    return startCamera({ deviceId: '', nextFacing });
  };

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      try {
        await controlsRef.current?.switchTorch?.();
        setTorchOn(next);
      } catch {
        setError('Lampu flash tidak dapat dikendalikan pada kamera ini.');
      }
    }
  };

  const changeZoom = async value => {
    const track = trackRef.current;
    if (!track || !zoomCaps) return;
    const next = clampCameraZoom(value, { zoom: zoomCaps });
    setZoom(next);
    try {
      await track.applyConstraints({ advanced: [{ zoom: next }] });
    } catch {
      setError('Zoom kamera tidak didukung pada perangkat ini.');
    }
  };

  const scanFromImage = async file => {
    if (!file) return;
    setError('');
    setNotice('Membaca barcode dari foto...');
    const url = URL.createObjectURL(file);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const image = new Image();
      image.src = url;
      await image.decode();
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageElement(image);
      const value = typeof result?.getText === 'function' ? result.getText() : result?.text;
      if (!value) throw new Error('Barcode tidak ditemukan pada foto.');
      await handleDetection(value, 'image');
    } catch (imageError) {
      setError(imageError?.message || 'Barcode tidak dapat dibaca dari foto.');
      setNotice('');
    } finally {
      URL.revokeObjectURL(url);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const currentDeviceLabel = useMemo(() => {
    const index = devices.findIndex(device => device.deviceId === selectedDeviceId);
    if (index < 0) return facingMode === 'environment' ? 'Kamera belakang' : 'Kamera depan';
    return cameraDisplayLabel(devices[index], index, devices.length);
  }, [devices, selectedDeviceId, facingMode]);

  return <Modal title={title} onClose={() => { stopCamera(); onClose?.(); }} size="lg">
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black aspect-video ring-1 ring-black/10">
        <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}/>
        {cameraStatus !== 'active' && <div className="absolute inset-0 flex items-center justify-center text-white/85 text-sm gap-2"><Camera size={18}/>{cameraStatus === 'error' ? 'Kamera gagal dibuka' : 'Mempersiapkan kamera...'}</div>}
        {cameraStatus === 'active' && <>
          <div className="absolute inset-[14%] border-2 border-white/75 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,.16)] pointer-events-none"/>
          <div className="absolute left-[18%] right-[18%] top-1/2 h-0.5 bg-red-500 shadow-[0_0_14px_rgba(239,68,68,.95)] pointer-events-none"/>
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/55 text-white text-[11px] font-bold backdrop-blur">{currentDeviceLabel}</div>
          {scanCount > 0 && <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-600/90 text-white text-[11px] font-black">{scanCount} scan</div>}
        </>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button variant="secondary" onClick={() => void switchCamera()}><RefreshCw size={17}/> Depan / Belakang</Button>
        <Button variant="secondary" onClick={() => void toggleTorch()} disabled={!torchSupported}><Flashlight size={17}/> {torchOn ? 'Matikan Flash' : 'Nyalakan Flash'}</Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}><ImagePlus size={17}/> Scan dari Foto</Button>
        <Button variant="secondary" onClick={() => void startCamera()}><ScanLine size={17}/> Scan Ulang</Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => void scanFromImage(event.target.files?.[0])}/>
      </div>

      {devices.length > 1 && <Field label="Pilih Kamera" hint="Pada HP multi-kamera, pilih lensa yang fokusnya paling cepat untuk barcode."><Select value={selectedDeviceId} onChange={event => void chooseCamera(event.target.value)}>{devices.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{cameraDisplayLabel(device, index, devices.length)}</option>)}</Select></Field>}

      {zoomCaps && <Field label={`Zoom Kamera · ${Number(zoom).toFixed(1)}×`}><div className="flex items-center gap-3"><ZoomIn size={18} className="text-gray-500"/><input type="range" className="w-full accent-emerald-600" min={zoomCaps.min} max={zoomCaps.max} step={zoomCaps.step || 0.1} value={zoom} onChange={event => void changeZoom(event.target.value)}/></div></Field>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button type="button" onClick={() => { const next = !sound; setSound(next); savePrefs({ sound: next }); }} className={`rounded-xl border px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 ${sound ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'}`}>{sound ? <Volume2 size={16}/> : <VolumeX size={16}/>} Bunyi Scan</button>
        <button type="button" onClick={() => { const next = !vibrate; setVibrate(next); savePrefs({ vibrate: next }); }} className={`rounded-xl border px-3 py-2 text-xs font-bold ${vibrate ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'}`}>Getar: {vibrate ? 'Aktif' : 'Mati'}</button>
        {allowContinuous && <button type="button" onClick={() => { const next = !rapidMode; setRapidMode(next); savePrefs({ rapid: next }); }} className={`rounded-xl border px-3 py-2 text-xs font-bold ${rapidMode ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}>Mode Scan Cepat: {rapidMode ? 'Aktif' : 'Mati'}</button>}
      </div>

      <p className="text-xs text-gray-500">{helperText}</p>
      {allowContinuous && rapidMode && <p className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl p-3">Mode Scan Cepat aktif: barang yang berhasil terbaca langsung diproses dan kamera tetap terbuka. Scan barcode yang sama berulang akan menambah jumlah barang.</p>}

      <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex gap-3 text-blue-900"><Keyboard className="shrink-0"/><div className="min-w-0 flex-1"><p className="font-black text-sm">Scanner USB / Bluetooth</p><p className="text-xs mt-1">Scanner fisik tetap didukung. Klik kolom, scan barcode, lalu Enter.</p><div className="flex gap-2 mt-2"><Input value={code} onChange={event => setCode(event.target.value)} onKeyDown={event => event.key === 'Enter' && void handleDetection(code, 'manual')} placeholder={manualPlaceholder}/><Button onClick={() => void handleDetection(code, 'manual')}>Pakai</Button></div></div></div>

      {notice && <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{notice}</p>}
      {error && <div className="text-sm font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl p-3"><p>{error}</p>{cameraStatus === 'error' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3"><Button variant="secondary" onClick={() => void startCamera()}>Coba Lagi</Button><Button variant="secondary" onClick={() => void openNativeAppSettings()}>Buka Pengaturan Izin</Button></div>}</div>}
    </div>
  </Modal>;
}

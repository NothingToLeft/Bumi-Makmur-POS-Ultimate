import React, { useEffect, useRef, useState } from 'react';
import { Fingerprint, Loader2, Package, ScanFace, ShieldCheck, Trash2 } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { authenticateBiometric, getBiometricAvailability } from '../services/nativeDevice.js';

export default function LoginScreen() {
  const { login, loginWithBiometric, deviceSettings } = usePos();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Memeriksa PIN...');
  const [biometric, setBiometric] = useState({ available: false, status: 'checking' });
  const autoPromptedRef = useRef(false);

  const biometricEnabled = Boolean(
    deviceSettings.biometricEnabled &&
    deviceSettings.biometricUserId &&
    biometric.available
  );

  useEffect(() => {
    let active = true;
    void getBiometricAvailability().then(result => {
      if (active) setBiometric(result || { available: false, status: 'unknown' });
    });
    return () => { active = false; };
  }, []);

  const runBiometric = async () => {
    if (!biometricEnabled || busy) return;
    setBusy(true);
    setBusyLabel('Menunggu verifikasi biometrik...');
    setError('');
    try {
      const result = await authenticateBiometric({
        title: 'Buka Bumi Makmur POS',
        subtitle: 'Gunakan sidik jari atau pengenalan wajah perangkat.'
      });
      if (!result?.success) {
        if (result?.cancelled) return;
        setError(result?.error || 'Biometrik tidak berhasil. Gunakan PIN.');
        return;
      }
      const loginResult = loginWithBiometric(deviceSettings.biometricUserId);
      if (!loginResult.success) setError(loginResult.message || 'Akun biometrik tidak tersedia.');
    } catch (biometricError) {
      setError(biometricError?.message || 'Biometrik gagal. Gunakan PIN.');
    } finally {
      setBusy(false);
      setBusyLabel('Memeriksa PIN...');
    }
  };

  useEffect(() => {
    if (!biometricEnabled || !deviceSettings.biometricAutoPrompt || autoPromptedRef.current) return undefined;
    autoPromptedRef.current = true;
    const timer = window.setTimeout(() => { void runBiometric(); }, 450);
    return () => window.clearTimeout(timer);
  }, [biometricEnabled, deviceSettings.biometricAutoPrompt]);

  useEffect(() => {
    if (pin.length !== 4) return undefined;
    let cancelled = false;

    const verify = async () => {
      setBusy(true);
      setBusyLabel('Memeriksa PIN...');
      setError('');
      try {
        const result = await login(pin);
        if (cancelled) return;
        if (!result.success) {
          setError(result.message || 'PIN tidak dikenali.');
          setPin('');
        }
      } catch (loginError) {
        if (!cancelled) {
          setError(loginError?.message || 'Login gagal. Silakan coba lagi.');
          setPin('');
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    void verify();
    return () => { cancelled = true; };
  }, [pin, login]);

  const press = value => {
    if (pin.length < 4 && !busy) {
      setPin(previous => previous + value);
      setError('');
    }
  };

  const erase = () => {
    if (busy) return;
    setPin(value => value.slice(0, -1));
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-7 text-center relative overflow-hidden">
        {busy && (
          <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={42}/>
            <p className="font-bold mt-3 text-gray-700">{busyLabel}</p>
            <p className="text-xs text-gray-500 mt-1">Mohon tunggu sebentar</p>
          </div>
        )}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package size={34}/></div>
        <h1 className="font-black text-2xl tracking-tight text-gray-800">BUMI MAKMUR</h1>
        <p className="text-sm text-gray-500 mb-5">POS Ultimate v3.3</p>
        <div className="flex justify-center gap-4 mb-5">{[0,1,2,3].map(index => <span key={index} className={`w-3 h-3 rounded-full ${index < pin.length ? 'bg-emerald-600' : 'bg-gray-200'}`}/>)}</div>
        {error && <p className="text-sm font-bold text-red-600 mb-3" role="alert">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map(value => <button key={value} disabled={busy} onClick={() => press(String(value))} className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-xl font-bold active:bg-emerald-100 disabled:opacity-60">{value}</button>)}
          <div/>
          <button disabled={busy} onClick={() => press('0')} className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-xl font-bold active:bg-emerald-100 disabled:opacity-60">0</button>
          <button disabled={busy} onClick={erase} className="h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center disabled:opacity-60"><Trash2 size={22}/></button>
        </div>
        {biometricEnabled && (
          <button onClick={() => void runBiometric()} disabled={busy} className="mt-4 w-full min-h-[54px] rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-center gap-3 active:bg-emerald-100 disabled:opacity-60">
            <Fingerprint size={24}/><ScanFace size={24}/><span>Buka dengan Biometrik</span>
          </button>
        )}
        <div className="mt-5 p-3 rounded-2xl bg-blue-50 border border-blue-100 text-left text-xs text-blue-800 flex gap-2"><ShieldCheck size={18} className="shrink-0"/><div><p className="font-bold">PIN demo</p><p>Owner 1608 · Manager 2468 · Kasir 1234</p></div></div>
      </div>
    </div>
  );
}

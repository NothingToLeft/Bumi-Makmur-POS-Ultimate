import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Cloud,
  Fingerprint,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  Package,
  ScanFace,
  ShieldCheck,
  Trash2,
  WifiOff
} from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { authenticateBiometric, getBiometricAvailability } from '../services/nativeDevice.js';

export default function LoginScreen() {
  const {
    login,
    loginWithEmail,
    loginWithBiometric,
    deviceSettings,
    cloudConfigured,
    cloudError,
    online
  } = usePos();
  const [mode, setMode] = useState(deviceSettings.hasLinkedAccount ? 'pin' : 'email');
  const [pin, setPin] = useState('');
  const [form, setForm] = useState({
    email: deviceSettings.linkedEmail || '',
    password: '',
    pin: '',
    confirmPin: ''
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Memeriksa akun...');
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
        if (!result?.cancelled) setError(result?.error || 'Biometrik tidak berhasil. Gunakan PIN.');
        return;
      }
      const loginResult = await loginWithBiometric(deviceSettings.biometricUserId);
      if (!loginResult.success) setError(loginResult.message || 'Akun biometrik tidak tersedia.');
    } catch (biometricError) {
      setError(biometricError?.message || 'Biometrik gagal. Gunakan PIN.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (mode !== 'pin' || !biometricEnabled || !deviceSettings.biometricAutoPrompt || autoPromptedRef.current) return undefined;
    autoPromptedRef.current = true;
    const timer = window.setTimeout(() => { void runBiometric(); }, 450);
    return () => window.clearTimeout(timer);
  }, [mode, biometricEnabled, deviceSettings.biometricAutoPrompt]);

  useEffect(() => {
    if (mode !== 'pin' || pin.length !== 4) return undefined;
    let cancelled = false;
    const verify = async () => {
      setBusy(true);
      setBusyLabel(online ? 'Membuka aplikasi dan memeriksa sinkronisasi...' : 'Membuka data offline...');
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
  }, [mode, pin, login, online]);

  const submitEmail = async event => {
    event.preventDefault();
    if (!online) return setError('Login Email & Password memerlukan internet. Gunakan PIN untuk mode offline.');
    if (!cloudConfigured) return setError('Konfigurasi Firebase belum tersedia pada aplikasi ini.');
    if (!form.email.trim()) return setError('Email wajib diisi.');
    if (!form.password) return setError('Password Firebase wajib diisi.');
    if (!/^\d{4}$/.test(form.pin)) return setError('PIN perangkat harus 4 digit.');
    if (form.pin !== form.confirmPin) return setError('Konfirmasi PIN tidak sama.');
    setBusy(true);
    setBusyLabel('Menghubungkan akun Firebase dan menyiapkan data offline...');
    setError('');
    try {
      await loginWithEmail({ email: form.email, password: form.password, pin: form.pin });
    } catch (loginError) {
      const code = String(loginError?.code || '');
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        setError('Email atau password Firebase tidak benar.');
      } else if (code.includes('too-many-requests')) {
        setError('Terlalu banyak percobaan login. Tunggu sebentar lalu coba lagi.');
      } else {
        setError(loginError?.message || 'Akun gagal dihubungkan.');
      }
    } finally {
      setBusy(false);
    }
  };

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
          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center px-6">
            <Loader2 className="animate-spin text-emerald-600" size={42}/>
            <p className="font-bold mt-3 text-gray-700">{busyLabel}</p>
            <p className="text-xs text-gray-500 mt-1">Jangan tutup aplikasi</p>
          </div>
        )}

        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package size={34}/></div>
        <h1 className="font-black text-2xl tracking-tight text-gray-800">BUMI MAKMUR</h1>
        <p className="text-sm text-gray-500 mb-4">POS Spark Free Hybrid v4.2</p>

        <div className={`mb-4 p-3 rounded-2xl border text-left flex gap-2 ${online ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
          {online ? <Cloud size={18} className="shrink-0"/> : <WifiOff size={18} className="shrink-0"/>}
          <div>
            <p className="font-bold text-xs">{online ? 'Internet tersedia' : 'Mode offline aktif'}</p>
            <p className="text-[11px]">{online ? 'Perubahan akan dikirim langsung ke Firestore.' : 'Transaksi tetap tersimpan di perangkat dan otomatis dikirim saat tersambung.'}</p>
          </div>
        </div>

        {(error || cloudError) && <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl mb-3" role="alert">{error || cloudError}</p>}

        {mode === 'email' ? (
          <form onSubmit={submitEmail} className="text-left space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Email Firebase</label>
              <div className="relative"><Mail className="absolute left-3 top-3.5 text-gray-400" size={19}/><input type="email" autoComplete="username" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-emerald-500" placeholder="email@contoh.com"/></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Password Firebase</label>
              <div className="relative"><KeyRound className="absolute left-3 top-3.5 text-gray-400" size={19}/><input type="password" autoComplete="current-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-emerald-500" placeholder="Password akun"/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Buat PIN</label><input type="password" inputMode="numeric" maxLength={4} value={form.pin} onChange={event => setForm({ ...form, pin: event.target.value.replace(/\D/g, '').slice(0, 4) })} className="w-full min-h-[48px] px-4 text-center tracking-[.35em] rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-emerald-500" placeholder="••••"/></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Ulangi PIN</label><input type="password" inputMode="numeric" maxLength={4} value={form.confirmPin} onChange={event => setForm({ ...form, confirmPin: event.target.value.replace(/\D/g, '').slice(0, 4) })} className="w-full min-h-[48px] px-4 text-center tracking-[.35em] rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-emerald-500" placeholder="••••"/></div>
            </div>
            <button type="submit" className="w-full min-h-[54px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2"><LogIn size={20}/> Hubungkan Perangkat</button>
            {deviceSettings.hasLinkedAccount && <button type="button" onClick={() => { setMode('pin'); setError(''); }} className="w-full min-h-[46px] rounded-xl bg-gray-100 text-gray-700 font-bold flex items-center justify-center gap-2"><ArrowLeft size={18}/> Kembali ke PIN</button>}
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-800 flex gap-2"><ShieldCheck size={18} className="shrink-0"/><p>Password hanya digunakan Firebase. PIN 4 digit disimpan sebagai PBKDF2 terenkripsi di perangkat untuk login cepat dan offline.</p></div>
          </form>
        ) : (
          <>
            <p className="text-xs font-bold text-gray-500 mb-4">Masukkan PIN perangkat</p>
            <div className="flex justify-center gap-4 mb-5">{[0,1,2,3].map(index => <span key={index} className={`w-3 h-3 rounded-full ${index < pin.length ? 'bg-emerald-600' : 'bg-gray-200'}`}/>)}</div>
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3,4,5,6,7,8,9].map(value => <button key={value} disabled={busy} onClick={() => press(String(value))} className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-xl font-bold active:bg-emerald-100 disabled:opacity-40">{value}</button>)}
              <button onClick={() => { setMode('email'); setError(''); setPin(''); }} className="h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">Ganti<br/>Akun</button>
              <button disabled={busy} onClick={() => press('0')} className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-xl font-bold active:bg-emerald-100 disabled:opacity-40">0</button>
              <button disabled={busy} onClick={erase} className="h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center disabled:opacity-60"><Trash2 size={22}/></button>
            </div>
            {biometricEnabled && <button onClick={() => void runBiometric()} disabled={busy} className="mt-4 w-full min-h-[54px] rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-center gap-3 active:bg-emerald-100 disabled:opacity-60"><Fingerprint size={24}/><ScanFace size={24}/><span>Buka dengan Biometrik</span></button>}
            <button onClick={() => { setMode('email'); setError(''); }} className="mt-4 w-full min-h-[46px] rounded-xl text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 flex items-center justify-center gap-2"><Mail size={18}/> Login Email & Password</button>
          </>
        )}
      </div>
    </div>
  );
}

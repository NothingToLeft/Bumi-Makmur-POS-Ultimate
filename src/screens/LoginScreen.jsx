import React, { useEffect, useRef, useState } from 'react';
import { Cloud, Fingerprint, Loader2, ScanFace, ServerCog, ShieldCheck, Trash2, WifiOff, X } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { authenticateBiometric, getBiometricAvailability } from '../services/nativeDevice.js';

export default function LoginScreen() {
  const {
    login, loginWithBiometric, bootstrapStore, deviceSettings, updateDeviceSettings,
    cloudConfigured, cloudError, online
  } = usePos();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Memeriksa PIN ke cloud...');
  const [biometric, setBiometric] = useState({ available: false, status: 'checking' });
  const [showSetup, setShowSetup] = useState(false);
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
        title: 'Buka Bumi Makmur POS Cloud',
        subtitle: 'Gunakan sidik jari atau pengenalan wajah perangkat.'
      });
      if (!result?.success) {
        if (result?.cancelled) return;
        setError(result?.error || 'Biometrik tidak berhasil. Gunakan PIN.');
        return;
      }
      const loginResult = await loginWithBiometric(deviceSettings.biometricUserId);
      if (!loginResult.success) setError(loginResult.message || 'Akun biometrik tidak tersedia.');
    } catch (biometricError) {
      setError(biometricError?.message || 'Biometrik gagal. Gunakan PIN.');
    } finally {
      setBusy(false);
      setBusyLabel(online ? 'Memeriksa PIN dan sinkronisasi...' : 'Memeriksa PIN offline...');
    }
  };

  useEffect(() => {
    if (!biometricEnabled || !deviceSettings.biometricAutoPrompt || autoPromptedRef.current) return undefined;
    autoPromptedRef.current = true;
    const timer = window.setTimeout(() => { void runBiometric(); }, 450);
    return () => window.clearTimeout(timer);
  }, [biometricEnabled, deviceSettings.biometricAutoPrompt, online]);

  useEffect(() => {
    if (pin.length !== 4) return undefined;
    let cancelled = false;
    const verify = async () => {
      setBusy(true);
      setBusyLabel(online ? 'Memeriksa PIN dan sinkronisasi...' : 'Memeriksa PIN offline...');
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
          setError(loginError?.message || 'Login cloud gagal. Silakan coba lagi.');
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
            <p className="text-xs text-gray-500 mt-1">Jangan tutup aplikasi</p>
          </div>
        )}
        <img src="/logo-bm.svg" alt="Logo BM" className="w-20 h-20 rounded-[1.4rem] shadow-xl ring-1 ring-emerald-100 mx-auto mb-4"/>
        <h1 className="font-black text-2xl tracking-tight text-gray-800">BUMI MAKMUR</h1>
        <p className="text-sm text-gray-500 mb-4">POS Hybrid Enterprise v4.2</p>

        <div className={`mb-4 p-3 rounded-2xl border text-left flex gap-2 ${online ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {online ? <Cloud size={18} className="shrink-0"/> : <WifiOff size={18} className="shrink-0"/>}
          <div><p className="font-bold text-xs">{online ? 'Terhubung ke internet' : 'Internet terputus'}</p><p className="text-[11px]">{online ? 'Firebase aktif. Cache perangkat juga disiapkan untuk keadaan darurat.' : 'Mode offline aktif. Login memakai cache aman dan perubahan akan dikirim otomatis saat internet kembali.'}</p></div>
        </div>

        <label className="block text-left text-[11px] font-bold text-gray-500 mb-1">Kode Toko Cloud</label>
        <input
          value={deviceSettings.storeCode || ''}
          onChange={event => updateDeviceSettings({ storeCode: event.target.value.toUpperCase().replace(/\s+/g, '') })}
          className="w-full min-h-[48px] px-4 rounded-xl bg-gray-50 border border-gray-200 font-bold tracking-wider outline-none focus:border-emerald-500 mb-4"
          placeholder="BUMIMAKMUR"
          autoCapitalize="characters"
          disabled={busy}
        />

        <div className="flex justify-center gap-4 mb-5">{[0,1,2,3].map(index => <span key={index} className={`w-3 h-3 rounded-full ${index < pin.length ? 'bg-emerald-600' : 'bg-gray-200'}`}/>)}</div>
        {(error || cloudError) && <p className="text-sm font-bold text-red-600 mb-3" role="alert">{error || cloudError}</p>}
        {!cloudConfigured && <p className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-100 p-3 rounded-xl mb-3">Konfigurasi Firebase belum tersedia di file .env.</p>}
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map(value => <button key={value} disabled={busy} onClick={() => press(String(value))} className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-xl font-bold active:bg-emerald-100 disabled:opacity-40">{value}</button>)}
          <div/>
          <button disabled={busy} onClick={() => press('0')} className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-xl font-bold active:bg-emerald-100 disabled:opacity-40">0</button>
          <button disabled={busy} onClick={erase} className="h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center disabled:opacity-60"><Trash2 size={22}/></button>
        </div>
        {biometricEnabled && (
          <button onClick={() => void runBiometric()} disabled={busy} className="mt-4 w-full min-h-[54px] rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-center gap-3 active:bg-emerald-100 disabled:opacity-60">
            <Fingerprint size={24}/><ScanFace size={24}/><span>Buka dengan Biometrik</span>
          </button>
        )}
        <button onClick={() => setShowSetup(true)} disabled={busy || !online || !cloudConfigured} className="mt-4 w-full min-h-[48px] rounded-xl text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 flex items-center justify-center gap-2 disabled:opacity-40"><ServerCog size={18}/> Setup cloud pertama kali</button>
        <div className="mt-4 p-3 rounded-2xl bg-blue-50 border border-blue-100 text-left text-xs text-blue-800 flex gap-2"><ShieldCheck size={18} className="shrink-0"/><div><p className="font-bold">Hybrid aman</p><p>Saat online PIN diverifikasi Cloud Functions. Setelah login pertama, perangkat menyimpan verifier terenkripsi dan database lokal untuk operasional offline.</p></div></div>
      </div>
      {showSetup && <BootstrapModal onClose={() => setShowSetup(false)} onBootstrap={bootstrapStore} configured={cloudConfigured} />}
    </div>
  );
}

function BootstrapModal({ onClose, onBootstrap, configured }) {
  const [form, setForm] = useState({ storeCode: 'BUMIMAKMUR', businessName: 'BUMI MAKMUR', branchName: 'Bumi Makmur Pusat', branchAddress: '', branchPhone: '', ownerName: 'Bapak Owner', ownerPin: '', bootstrapSecret: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!configured) return setError('Isi konfigurasi Firebase di .env terlebih dahulu.');
    if (form.ownerPin.length !== 4) return setError('PIN Owner harus 4 digit.');
    setBusy(true); setError('');
    try {
      await onBootstrap(form);
      onClose();
    } catch (setupError) {
      setError(setupError?.message || 'Setup cloud gagal.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
      <div className="p-5 border-b flex justify-between items-center"><div><p className="font-black text-lg">Setup Firebase Pertama</p><p className="text-xs text-gray-500">Hanya dijalankan sekali untuk toko baru.</p></div><button onClick={onClose} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><X/></button></div>
      <div className="p-5 space-y-3">
        {error && <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
        <Field label="Kode Toko"><input value={form.storeCode} onChange={e=>setForm({...form,storeCode:e.target.value.toUpperCase().replace(/\s+/g,'')})} className="setup-input"/></Field>
        <Field label="Nama Usaha"><input value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} className="setup-input"/></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Nama Cabang Utama"><input value={form.branchName} onChange={e=>setForm({...form,branchName:e.target.value})} className="setup-input"/></Field><Field label="Telepon Cabang"><input value={form.branchPhone} onChange={e=>setForm({...form,branchPhone:e.target.value})} className="setup-input" inputMode="tel"/></Field></div>
        <Field label="Alamat Cabang Utama"><input value={form.branchAddress} onChange={e=>setForm({...form,branchAddress:e.target.value})} className="setup-input"/></Field>
        <Field label="Nama Owner"><input value={form.ownerName} onChange={e=>setForm({...form,ownerName:e.target.value})} className="setup-input"/></Field>
        <Field label="PIN Owner 4 Digit"><input type="password" inputMode="numeric" maxLength={4} value={form.ownerPin} onChange={e=>setForm({...form,ownerPin:e.target.value.replace(/\D/g,'').slice(0,4)})} className="setup-input"/></Field>
        <Field label="Bootstrap Secret"><input type="password" value={form.bootstrapSecret} onChange={e=>setForm({...form,bootstrapSecret:e.target.value})} className="setup-input" placeholder="Sesuai Firebase Functions secret"/></Field>
        <button onClick={submit} disabled={busy} className="w-full min-h-[54px] rounded-2xl bg-emerald-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">{busy&&<Loader2 className="animate-spin" size={18}/>} Buat Database Cloud</button>
      </div>
    </div>
  </div>;
}

function Field({ label, children }) { return <label className="block"><span className="block text-xs font-bold text-gray-500 mb-1">{label}</span>{children}</label>; }

import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud, Fingerprint, KeyRound, Link2, Loader2, Mail, ScanFace,
  ServerCog, ShieldCheck, Trash2, UserRoundPlus, WifiOff, X
} from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { authenticateBiometric, getBiometricAvailability } from '../services/nativeDevice.js';
import { Field, Input } from '../components/ui.jsx';

export default function LoginScreen() {
  const {
    login, connectAccount, loginWithBiometric, bootstrapStore,
    deviceSettings, updateDeviceSettings, cloudConfigured, cloudError, online
  } = usePos();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Memeriksa PIN perangkat...');
  const [biometric, setBiometric] = useState({ available: false, status: 'checking' });
  const [showSetup, setShowSetup] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
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
      setBusyLabel('Memeriksa PIN perangkat...');
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
      setBusyLabel(online ? 'Membuka POS dan menyiapkan sinkronisasi...' : 'Membuka data offline...');
      setError('');
      try {
        const result = await login(pin);
        if (!cancelled && !result.success) {
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
  }, [pin, login, online]);

  const press = value => {
    if (pin.length < 4 && !busy) {
      setPin(previous => previous + value);
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-7 text-center relative overflow-hidden">
        {busy && <BusyOverlay label={busyLabel}/>} 
        <img src="/logo-bm.svg" alt="Logo BM" className="w-20 h-20 rounded-[1.4rem] shadow-xl ring-1 ring-emerald-100 mx-auto mb-4"/>
        <h1 className="font-black text-2xl tracking-tight text-gray-800">BUMI MAKMUR</h1>
        <p className="text-sm text-gray-500 mb-4">POS FreeSync v4.3 · Android · Web · PC</p>

        <div className={`mb-4 p-3 rounded-2xl border text-left flex gap-2 ${online ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
          {online ? <Cloud size={18} className="shrink-0"/> : <WifiOff size={18} className="shrink-0"/>}
          <div>
            <p className="font-bold text-xs">{online ? 'Internet tersedia' : 'Mode offline aktif'}</p>
            <p className="text-[11px]">{online ? 'Perubahan lokal akan dikirim ke Firestore secara otomatis.' : 'Transaksi tetap tersimpan di perangkat dan dikirim saat internet kembali.'}</p>
          </div>
        </div>

        <label className="block text-left text-[11px] font-bold text-gray-500 mb-1">Kode Toko</label>
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
        {!cloudConfigured && <p className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-100 p-3 rounded-xl mb-3">Firebase belum dikonfigurasi. Mode demo lokal masih dapat digunakan.</p>}

        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map(value => <button key={value} disabled={busy} onClick={() => press(String(value))} className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-xl font-bold active:bg-emerald-100 disabled:opacity-40">{value}</button>)}
          <div/>
          <button disabled={busy} onClick={() => press('0')} className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-xl font-bold active:bg-emerald-100 disabled:opacity-40">0</button>
          <button disabled={busy} onClick={() => { setPin(value => value.slice(0, -1)); setError(''); }} className="h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center disabled:opacity-60"><Trash2 size={22}/></button>
        </div>

        {biometricEnabled && <button onClick={() => void runBiometric()} disabled={busy} className="mt-4 w-full min-h-[54px] rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-center gap-3 active:bg-emerald-100 disabled:opacity-60"><Fingerprint size={24}/><ScanFace size={24}/><span>Buka dengan Biometrik</span></button>}

        <button onClick={() => setShowConnect(true)} disabled={busy || !online || !cloudConfigured} className="mt-4 w-full min-h-[48px] rounded-xl text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 flex items-center justify-center gap-2 disabled:opacity-40"><Link2 size={18}/> Hubungkan Akun Cloud</button>
        <button onClick={() => setShowSetup(true)} disabled={busy || !online || !cloudConfigured} className="mt-2 w-full min-h-[48px] rounded-xl text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 flex items-center justify-center gap-2 disabled:opacity-40"><ServerCog size={18}/> Setup Toko Pertama Kali</button>

        <div className="mt-4 p-3 rounded-2xl bg-blue-50 border border-blue-100 text-left text-xs text-blue-800 flex gap-2">
          <ShieldCheck size={18} className="shrink-0"/>
          <div><p className="font-bold">Firebase Spark gratis</p><p>Akun email/password dipakai sekali pada perangkat baru. Pemakaian harian menggunakan PIN atau biometrik lokal.</p></div>
        </div>
      </div>

      {showConnect && <ConnectAccountModal onClose={() => setShowConnect(false)} onConnect={connectAccount}/>} 
      {showSetup && <BootstrapModal onClose={() => setShowSetup(false)} onBootstrap={bootstrapStore} configured={cloudConfigured}/>} 
    </div>
  );
}

function BusyOverlay({ label }) {
  return <div className="absolute inset-0 bg-white/92 z-20 flex flex-col items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={42}/><p className="font-bold mt-3 text-gray-700 px-6">{label}</p></div>;
}

function ConnectAccountModal({ onClose, onConnect }) {
  const [form, setForm] = useState({ email: '', password: '', pin: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!form.email || !form.password) return setError('Email dan password cloud wajib diisi.');
    if (!/^\d{4}$/.test(form.pin)) return setError('Buat PIN perangkat 4 digit.');
    setBusy(true); setError('');
    try { await onConnect(form); onClose(); }
    catch (connectError) { setError(connectError?.message || 'Akun cloud gagal dihubungkan.'); }
    finally { setBusy(false); }
  };
  return <ModalShell title="Hubungkan Akun Cloud" subtitle="Dilakukan sekali pada perangkat baru" onClose={onClose}>
    {error && <ErrorBox text={error}/>} 
    <Field label="Email Karyawan"><Input type="email" autoComplete="username" value={form.email} onChange={event => setForm({...form,email:event.target.value})}/></Field>
    <Field label="Password Firebase"><Input type="password" autoComplete="current-password" value={form.password} onChange={event => setForm({...form,password:event.target.value})}/></Field>
    <Field label="Buat PIN 4 Digit di Perangkat Ini"><Input type="password" inputMode="numeric" maxLength="4" value={form.pin} onChange={event => setForm({...form,pin:event.target.value.replace(/\D/g,'')})}/></Field>
    <button onClick={submit} disabled={busy} className="w-full min-h-[52px] bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy?<Loader2 className="animate-spin"/>:<KeyRound size={18}/>} Hubungkan & Masuk</button>
  </ModalShell>;
}

function BootstrapModal({ onClose, onBootstrap, configured }) {
  const [form, setForm] = useState({
    storeCode: 'BUMIMAKMUR', businessName: 'BUMI MAKMUR', branchName: 'Bumi Makmur Pusat',
    branchAddress: '', branchPhone: '', ownerName: 'Bapak Owner', ownerEmail: '', ownerPassword: '', ownerPin: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!configured) return setError('Konfigurasi Firebase belum tersedia.');
    if (!form.ownerEmail) return setError('Email Owner wajib diisi.');
    if (form.ownerPassword.length < 6) return setError('Password Owner minimal 6 karakter.');
    if (!/^\d{4}$/.test(form.ownerPin)) return setError('PIN Owner harus 4 digit.');
    setBusy(true); setError('');
    try { await onBootstrap(form); onClose(); }
    catch (setupError) { setError(setupError?.message || 'Setup toko cloud gagal.'); }
    finally { setBusy(false); }
  };
  return <ModalShell title="Setup Toko Pertama" subtitle="Hanya dijalankan sekali oleh Owner" onClose={onClose} wide>
    {error && <ErrorBox text={error}/>} 
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Kode Toko"><Input value={form.storeCode} onChange={event=>setForm({...form,storeCode:event.target.value.toUpperCase().replace(/\s+/g,'')})}/></Field>
      <Field label="Nama Usaha"><Input value={form.businessName} onChange={event=>setForm({...form,businessName:event.target.value})}/></Field>
      <Field label="Nama Cabang"><Input value={form.branchName} onChange={event=>setForm({...form,branchName:event.target.value})}/></Field>
      <Field label="Telepon Cabang"><Input value={form.branchPhone} onChange={event=>setForm({...form,branchPhone:event.target.value})}/></Field>
      <Field label="Alamat Cabang" className="md:col-span-2"><Input value={form.branchAddress} onChange={event=>setForm({...form,branchAddress:event.target.value})}/></Field>
      <Field label="Nama Owner"><Input value={form.ownerName} onChange={event=>setForm({...form,ownerName:event.target.value})}/></Field>
      <Field label="Email Owner"><Input type="email" value={form.ownerEmail} onChange={event=>setForm({...form,ownerEmail:event.target.value})}/></Field>
      <Field label="Password Owner (min. 6)"><Input type="password" value={form.ownerPassword} onChange={event=>setForm({...form,ownerPassword:event.target.value})}/></Field>
      <Field label="PIN Harian 4 Digit"><Input type="password" inputMode="numeric" maxLength="4" value={form.ownerPin} onChange={event=>setForm({...form,ownerPin:event.target.value.replace(/\D/g,'')})}/></Field>
    </div>
    <button onClick={submit} disabled={busy} className="w-full mt-4 min-h-[52px] bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy?<Loader2 className="animate-spin"/>:<UserRoundPlus size={18}/>} Buat Toko & Owner</button>
  </ModalShell>;
}

function ModalShell({ title, subtitle, onClose, wide = false, children }) {
  return <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className={`bg-white w-full ${wide?'max-w-2xl':'max-w-md'} rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col`}>
      <div className="p-5 border-b flex justify-between items-center shrink-0"><div><p className="font-black text-lg">{title}</p><p className="text-xs text-gray-500">{subtitle}</p></div><button onClick={onClose} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><X/></button></div>
      <div className="p-5 space-y-3 overflow-y-auto">{children}</div>
    </div>
  </div>;
}

function ErrorBox({ text }) { return <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{text}</p>; }

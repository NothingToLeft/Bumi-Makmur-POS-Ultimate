import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, BriefcaseBusiness, Cloud, Fingerprint, KeyRound, Link2, Loader2,
  ScanFace, ServerCog, ShieldCheck, Store, Trash2, UserRound, UserRoundPlus,
  UsersRound, WifiOff, X
} from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { APP_VERSION } from '../data/defaults.js';
import { authenticateBiometric, getBiometricAvailability } from '../services/nativeDevice.js';
import { Field, Input } from '../components/ui.jsx';
import { friendlyCloudError } from '../utils/cloudErrors.js';

const ROLE_CONFIG = {
  owner: {
    title: 'Login Owner',
    subtitle: 'Akses penuh, pengaturan toko, laporan, dan akun karyawan.',
    icon: BriefcaseBusiness,
    accent: 'emerald',
    expectedRole: 'owner'
  },
  employee: {
    title: 'Login Karyawan',
    subtitle: 'Untuk Store Manager dan Kasir menggunakan PIN perangkat.',
    icon: UsersRound,
    accent: 'blue',
    expectedRole: 'employee'
  }
};

export default function LoginScreen() {
  const {
    login, connectAccount, loginWithBiometric, bootstrapStore,
    deviceSettings, updateDeviceSettings, cloudConfigured, online,
    clearCloudError
  } = usePos();
  const [mode, setMode] = useState('choose');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Memeriksa PIN perangkat...');
  const [biometric, setBiometric] = useState({ available: false, status: 'checking' });
  const [showSetup, setShowSetup] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const autoPromptedRef = useRef('');

  const activeRole = ROLE_CONFIG[mode] || null;
  const biometricEnabled = Boolean(
    deviceSettings.biometricEnabled &&
    deviceSettings.biometricUserId &&
    biometric.available
  );
  const biometricMatchesMode = !deviceSettings.biometricRole || deviceSettings.biometricRole === mode;

  useEffect(() => {
    let active = true;
    void getBiometricAvailability().then(result => {
      if (active) setBiometric(result || { available: false, status: 'unknown' });
    });
    return () => { active = false; };
  }, []);

  const selectMode = nextMode => {
    clearCloudError?.();
    setMode(nextMode);
    setPin('');
    setError('');
  };

  const goBack = () => {
    setMode('choose');
    setPin('');
    setError('');
  };

  const runBiometric = async () => {
    if (!activeRole || !biometricEnabled || busy) return;
    setBusy(true);
    setBusyLabel('Menunggu verifikasi biometrik...');
    setError('');
    try {
      const result = await authenticateBiometric({
        title: activeRole.title,
        subtitle: 'Gunakan sidik jari atau pengenalan wajah perangkat.'
      });
      if (!result?.success) {
        if (!result?.cancelled) setError(result?.error || 'Biometrik tidak berhasil. Gunakan PIN.');
        return;
      }
      const loginResult = await loginWithBiometric(deviceSettings.biometricUserId, activeRole.expectedRole);
      if (!loginResult.success) setError(loginResult.message || 'Akun biometrik tidak tersedia untuk halaman ini.');
    } catch (biometricError) {
      setError(biometricError?.message || 'Biometrik gagal. Gunakan PIN.');
    } finally {
      setBusy(false);
      setBusyLabel('Memeriksa PIN perangkat...');
    }
  };

  useEffect(() => {
    if (
      mode === 'choose' || !biometricEnabled || !biometricMatchesMode ||
      !deviceSettings.biometricAutoPrompt || autoPromptedRef.current === mode
    ) return undefined;
    autoPromptedRef.current = mode;
    const timer = window.setTimeout(() => { void runBiometric(); }, 450);
    return () => window.clearTimeout(timer);
  }, [mode, biometricEnabled, biometricMatchesMode, deviceSettings.biometricAutoPrompt]);

  useEffect(() => {
    if (!activeRole || pin.length !== 4) return undefined;
    let cancelled = false;
    const verify = async () => {
      setBusy(true);
      setBusyLabel(online ? `Membuka ${activeRole.title.replace('Login ', '')}...` : 'Membuka data offline...');
      setError('');
      try {
        const result = await login(pin, activeRole.expectedRole);
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
  }, [pin, activeRole, login, online]);

  const press = value => {
    if (pin.length < 4 && !busy) {
      setPin(previous => previous + value);
      setError('');
    }
  };

  return (
    <div className="login-page-shell min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 flex items-center justify-center p-3 sm:p-5">
      <div className="login-card bg-white w-full max-w-md rounded-[2rem] shadow-2xl relative overflow-hidden">
        {busy && <BusyOverlay label={busyLabel}/>} 
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo-bm.svg" alt="Logo Bumi Makmur" className="w-16 h-16 rounded-[1.25rem] shadow-xl ring-1 ring-emerald-100"/>
            <div className="text-left min-w-0">
              <h1 className="font-black text-2xl tracking-tight text-gray-900">BUMI MAKMUR</h1>
              <p className="text-xs text-gray-500">POS Professional v{APP_VERSION}</p>
            </div>
          </div>

          <ConnectionStatus online={online}/>

          {mode === 'choose' ? (
            <LoginChooser onSelect={selectMode} cloudConfigured={cloudConfigured}/>
          ) : (
            <RoleLogin
              mode={mode}
              role={activeRole}
              pin={pin}
              error={error}
              busy={busy}
              storeCode={deviceSettings.storeCode || ''}
              onStoreCodeChange={value => updateDeviceSettings({ storeCode: value.toUpperCase().replace(/\s+/g, '') })}
              onPress={press}
              onErase={() => { setPin(value => value.slice(0, -1)); setError(''); }}
              onBack={goBack}
              biometricEnabled={biometricEnabled && biometricMatchesMode}
              onBiometric={() => void runBiometric()}
              onConnect={() => setShowConnect(true)}
              onSetup={() => setShowSetup(true)}
              online={online}
              cloudConfigured={cloudConfigured}
            />
          )}
        </div>

        <div className="px-5 sm:px-7 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 flex gap-2">
          <ShieldCheck size={18} className="text-emerald-700 shrink-0"/>
          <p><b className="text-slate-800">Firebase Spark gratis.</b> Transaksi tetap dapat berjalan offline setelah perangkat berhasil dihubungkan sekali.</p>
        </div>
      </div>

      {showConnect && activeRole && (
        <ConnectAccountModal
          mode={mode}
          role={activeRole}
          onClose={() => setShowConnect(false)}
          onConnect={connectAccount}
        />
      )}
      {showSetup && (
        <BootstrapModal
          onClose={() => setShowSetup(false)}
          onBootstrap={bootstrapStore}
          configured={cloudConfigured}
          initialStoreCode={deviceSettings.storeCode || 'BUMIMAKMUR'}
        />
      )}
    </div>
  );
}

function ConnectionStatus({ online }) {
  return (
    <div className={`mb-5 p-3 rounded-2xl border text-left flex gap-3 ${online ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
      {online ? <Cloud size={20} className="shrink-0"/> : <WifiOff size={20} className="shrink-0"/>}
      <div>
        <p className="font-bold text-sm">{online ? 'Internet tersedia' : 'Mode offline aktif'}</p>
        <p className="text-xs leading-relaxed">{online ? 'Login cloud dan sinkronisasi siap digunakan.' : 'Gunakan PIN akun yang sebelumnya sudah tersimpan di perangkat ini.'}</p>
      </div>
    </div>
  );
}

function LoginChooser({ onSelect, cloudConfigured }) {
  return (
    <div>
      <div className="text-center mb-4">
        <h2 className="font-black text-xl text-gray-900">Masuk sebagai siapa?</h2>
        <p className="text-sm text-gray-500 mt-1">Owner dan karyawan memakai halaman login yang berbeda.</p>
      </div>
      <div className="space-y-3">
        <button onClick={() => onSelect('owner')} className="login-role-card owner-card w-full text-left">
          <span className="login-role-icon"><BriefcaseBusiness size={26}/></span>
          <span className="flex-1 min-w-0">
            <b className="block text-base">Login Owner</b>
            <small>Pengaturan, laporan, karyawan, cabang, dan seluruh data toko.</small>
          </span>
          <Store size={21} className="shrink-0 opacity-60"/>
        </button>
        <button onClick={() => onSelect('employee')} className="login-role-card employee-card w-full text-left">
          <span className="login-role-icon"><UsersRound size={26}/></span>
          <span className="flex-1 min-w-0">
            <b className="block text-base">Login Karyawan</b>
            <small>Store Manager atau Kasir dengan PIN 4 digit dan biometrik.</small>
          </span>
          <UserRound size={21} className="shrink-0 opacity-60"/>
        </button>
      </div>
      {!cloudConfigured && (
        <p className="mt-4 text-xs font-bold text-orange-800 bg-orange-50 border border-orange-100 p-3 rounded-xl">
          Konfigurasi Firebase belum terpasang pada build ini. Mode lokal tetap tersedia untuk pengujian.
        </p>
      )}
    </div>
  );
}

function RoleLogin({
  mode, role, pin, error, busy, storeCode, onStoreCodeChange, onPress, onErase,
  onBack, biometricEnabled, onBiometric, onConnect, onSetup, online, cloudConfigured
}) {
  const RoleIcon = role.icon;
  const isOwner = mode === 'owner';
  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-2 min-h-[42px] text-sm font-bold text-gray-600 mb-2">
        <ArrowLeft size={18}/> Pilih jenis login
      </button>

      <div className={`rounded-2xl p-4 mb-4 flex gap-3 ${isOwner ? 'bg-emerald-50 text-emerald-900' : 'bg-blue-50 text-blue-900'}`}>
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isOwner ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}><RoleIcon size={23}/></span>
        <div><h2 className="font-black text-lg">{role.title}</h2><p className="text-xs leading-relaxed mt-0.5">{role.subtitle}</p></div>
      </div>

      <Field label="Kode Toko">
        <Input
          value={storeCode}
          onChange={event => onStoreCodeChange(event.target.value)}
          placeholder="BUMIMAKMUR"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck="false"
          className="font-bold tracking-wider uppercase"
          disabled={busy}
        />
      </Field>

      <div className="mt-4 text-center">
        <p className="text-xs font-bold text-gray-500 mb-3">Masukkan PIN 4 digit {isOwner ? 'Owner' : 'Karyawan'}</p>
        <div className="flex justify-center gap-4 mb-4" aria-label={`${pin.length} dari 4 digit PIN terisi`}>
          {[0, 1, 2, 3].map(index => <span key={index} className={`w-3 h-3 rounded-full ${index < pin.length ? (isOwner ? 'bg-emerald-600' : 'bg-blue-600') : 'bg-gray-200'}`}/>)}
        </div>
        {error && <ErrorBox text={error}/>} 
        <PinPad onPress={onPress} onErase={onErase} busy={busy} accent={isOwner ? 'emerald' : 'blue'}/>
      </div>

      {biometricEnabled && (
        <button onClick={onBiometric} disabled={busy} className={`mt-4 w-full min-h-[54px] rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-60 ${isOwner ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
          <Fingerprint size={23}/><ScanFace size={23}/><span>Buka dengan Biometrik</span>
        </button>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button onClick={onConnect} disabled={busy || !online || !cloudConfigured} className="w-full min-h-[50px] rounded-xl text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 flex items-center justify-center gap-2 disabled:opacity-40">
          <Link2 size={18}/> {isOwner ? 'Masuk Owner dengan Email' : 'Hubungkan Perangkat Karyawan'}
        </button>
        {isOwner && (
          <button onClick={onSetup} disabled={busy || !online || !cloudConfigured} className="mt-2 w-full min-h-[48px] rounded-xl text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 flex items-center justify-center gap-2 disabled:opacity-40">
            <ServerCog size={18}/> Setup Toko Pertama Kali
          </button>
        )}
        <p className="text-[11px] text-gray-500 mt-2 text-center leading-relaxed">
          {isOwner
            ? 'Email Owner digunakan saat perangkat baru atau sesi cloud perlu dihubungkan ulang.'
            : 'Karyawan memakai email dan password sementara satu kali, lalu membuat PIN perangkat sendiri.'}
        </p>
      </div>
    </div>
  );
}

function PinPad({ onPress, onErase, busy, accent }) {
  const activeClass = accent === 'blue' ? 'active:bg-blue-100' : 'active:bg-emerald-100';
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1,2,3,4,5,6,7,8,9].map(value => (
        <button key={value} disabled={busy} onClick={() => onPress(String(value))} className={`pin-key ${activeClass}`}>{value}</button>
      ))}
      <div aria-hidden="true"/>
      <button disabled={busy} onClick={() => onPress('0')} className={`pin-key ${activeClass}`}>0</button>
      <button disabled={busy} onClick={onErase} aria-label="Hapus digit terakhir" className="pin-key bg-orange-50 border-orange-100 text-orange-600"><Trash2 size={22}/></button>
    </div>
  );
}

function BusyOverlay({ label }) {
  return <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-6 text-center"><Loader2 className="animate-spin text-emerald-600" size={42}/><p className="font-bold mt-3 text-gray-700">{label}</p></div>;
}

function ConnectAccountModal({ mode, role, onClose, onConnect }) {
  const isOwner = mode === 'owner';
  const [form, setForm] = useState({ email: '', password: '', pin: '', confirmPin: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!form.email || !form.password) return setError('Email dan password wajib diisi.');
    if (!/^\d{4}$/.test(form.pin)) return setError('Buat PIN perangkat 4 digit.');
    if (form.pin !== form.confirmPin) return setError('Konfirmasi PIN tidak sama.');
    setBusy(true); setError('');
    try {
      await onConnect({ ...form, expectedRole: role.expectedRole });
      onClose();
    } catch (connectError) {
      setError(friendlyCloudError(connectError, 'Akun cloud gagal dihubungkan.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell
      title={isOwner ? 'Masuk Owner dengan Email' : 'Hubungkan Perangkat Karyawan'}
      subtitle={isOwner ? 'Gunakan akun Owner Firebase' : 'Gunakan akun yang dibuat Owner dari menu Pengaturan'}
      onClose={onClose}
    >
      {error && <ErrorBox text={error}/>} 
      <Field label={isOwner ? 'Email Owner' : 'Email Karyawan'}><Input type="email" autoComplete="username" value={form.email} onChange={event => setForm({...form,email:event.target.value})} placeholder="nama@contoh.com"/></Field>
      <Field label="Password Firebase"><Input type="password" autoComplete="current-password" value={form.password} onChange={event => setForm({...form,password:event.target.value})}/></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="PIN Perangkat"><Input type="password" inputMode="numeric" maxLength="4" value={form.pin} onChange={event => setForm({...form,pin:event.target.value.replace(/\D/g,'')})} placeholder="4 digit"/></Field>
        <Field label="Ulangi PIN"><Input type="password" inputMode="numeric" maxLength="4" value={form.confirmPin} onChange={event => setForm({...form,confirmPin:event.target.value.replace(/\D/g,'')})} placeholder="4 digit"/></Field>
      </div>
      <div className="p-3 rounded-xl bg-slate-50 border text-xs text-slate-600 flex gap-2"><KeyRound size={17} className="shrink-0"/><p>PIN hanya disimpan secara aman pada perangkat ini. Password tidak ditampilkan di halaman login harian.</p></div>
      <button onClick={submit} disabled={busy} className="w-full min-h-[52px] bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
        {busy ? <Loader2 className="animate-spin"/> : <KeyRound size={18}/>} Hubungkan & Masuk
      </button>
    </ModalShell>
  );
}

function BootstrapModal({ onClose, onBootstrap, configured, initialStoreCode }) {
  const [form, setForm] = useState({
    storeCode: initialStoreCode || 'BUMIMAKMUR', businessName: 'BUMI MAKMUR', branchName: 'Bumi Makmur Pusat',
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
    catch (setupError) { setError(friendlyCloudError(setupError, 'Setup toko cloud gagal.')); }
    finally { setBusy(false); }
  };
  return <ModalShell title="Setup Toko Pertama" subtitle="Hanya dijalankan satu kali oleh Owner" onClose={onClose} wide>
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
    <button onClick={submit} disabled={busy} className="w-full mt-4 min-h-[52px] bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
      {busy ? <Loader2 className="animate-spin"/> : <UserRoundPlus size={18}/>} Buat Toko & Owner
    </button>
  </ModalShell>;
}

function ModalShell({ title, subtitle, onClose, wide = false, children }) {
  return <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
    <div className={`bg-white w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col`}>
      <div className="p-5 border-b flex justify-between items-center shrink-0"><div className="pr-3"><p className="font-black text-lg">{title}</p><p className="text-xs text-gray-500 mt-0.5">{subtitle}</p></div><button onClick={onClose} aria-label="Tutup" className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><X/></button></div>
      <div className="p-5 space-y-3 overflow-y-auto pb-safe">{children}</div>
    </div>
  </div>;
}

function ErrorBox({ text }) {
  return <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl mb-3" role="alert">{text}</p>;
}

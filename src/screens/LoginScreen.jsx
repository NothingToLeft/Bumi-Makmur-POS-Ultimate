import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, BriefcaseBusiness, Cloud, Fingerprint, KeyRound, Link2, Loader2,
  ScanFace, ServerCog, ShieldCheck, Store, Trash2, UserRound, UserRoundPlus,
  UsersRound, WifiOff, X
} from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { APP_VERSION, MAIN_BRANCH_ID } from '../data/defaults.js';
import { authenticateBiometric, getBiometricAvailability } from '../services/nativeDevice.js';
import { Field, Input, Select } from '../components/ui.jsx';
import { friendlyCloudError } from '../utils/cloudErrors.js';
import { normalizeLoginAppearance, renderLoginTemplate } from '../utils/loginAppearance.js';

const ROLE_CONFIG = {
  owner: { icon: BriefcaseBusiness, expectedRole: 'owner' },
  employee: { icon: UsersRound, expectedRole: 'employee' }
};

export default function LoginScreen() {
  const {
    login, loginEmployee, connectAccount, loginWithBiometric, bootstrapStore,
    deviceSettings, updateDeviceSettings, cloudConfigured, online, clearCloudError,
    loginDirectory, loginDirectoryLoading, refreshLoginDirectory,
    loginEmployeesByBranch, loginEmployeesLoading, refreshLoginEmployees
  } = usePos();
  const [mode, setMode] = useState('choose');
  const [pin, setPin] = useState('');
  const [employeeLoginName, setEmployeeLoginName] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(deviceSettings.activeBranchId || MAIN_BRANCH_ID);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Memeriksa akun...');
  const [biometric, setBiometric] = useState({ available: false, status: 'checking' });
  const [showSetup, setShowSetup] = useState(false);
  const [showOwnerConnect, setShowOwnerConnect] = useState(false);
  const [directoryChecked, setDirectoryChecked] = useState(false);

  const branches = useMemo(() => {
    const rows = (loginDirectory?.branches || []).filter(item => item?.id && item.active !== false);
    return rows.length ? rows : [{ id: MAIN_BRANCH_ID, name: 'Pusat BUMI MAKMUR', active: true }];
  }, [loginDirectory]);
  const employees = useMemo(() => (loginEmployeesByBranch?.[selectedBranchId] || [])
    .filter(item => item?.loginName && item.active !== false)
    .sort((first, second) => String(first.name || first.loginName).localeCompare(String(second.name || second.loginName), 'id')), [loginEmployeesByBranch, selectedBranchId]);
  const loginAppearance = useMemo(() => normalizeLoginAppearance(loginDirectory?.loginAppearance), [loginDirectory?.loginAppearance]);
  const selectedBranchName = branches.find(branch => branch.id === selectedBranchId)?.name || 'Pilih cabang';
  const loginHeader = loginAppearance.headerText || loginDirectory?.businessName || 'BUMI MAKMUR';
  const loginSubheader = renderLoginTemplate(loginAppearance.subheaderTemplate, {
    branch: mode === 'employee' ? selectedBranchName : 'Akses seluruh cabang',
    version: APP_VERSION,
    business: loginDirectory?.businessName || 'BUMI MAKMUR'
  });
  const activeRole = useMemo(() => ROLE_CONFIG[mode]
    ? {
        ...ROLE_CONFIG[mode],
        title: mode === 'owner' ? loginAppearance.ownerTitle : loginAppearance.employeeTitle,
        subtitle: mode === 'owner' ? loginAppearance.ownerSubtitle : loginAppearance.employeeSubtitle
      }
    : null, [mode, loginAppearance]);
  const activationModeRequested = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('activate') === '1';
  const setupAvailable = Boolean(activationModeRequested && directoryChecked && !loginDirectoryLoading && (loginDirectory?.branches || []).length === 0);
  const biometricEnabled = Boolean(deviceSettings.biometricEnabled && deviceSettings.biometricUserId && biometric.available);
  const biometricMatchesMode = !deviceSettings.biometricRole || deviceSettings.biometricRole === mode;

  useEffect(() => {
    let active = true;
    void refreshLoginDirectory().finally(() => { if (active) setDirectoryChecked(true); });
    void getBiometricAvailability().then(result => {
      if (active) setBiometric(result || { available: false, status: 'unknown' });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!branches.some(branch => branch.id === selectedBranchId)) setSelectedBranchId(branches[0]?.id || MAIN_BRANCH_ID);
  }, [branches, selectedBranchId]);

  useEffect(() => {
    if (!selectedBranchId) return;
    void refreshLoginEmployees(selectedBranchId);
  }, [selectedBranchId, online]);

  useEffect(() => {
    const remembered = deviceSettings.lastEmployeeLoginByBranch?.[selectedBranchId] || '';
    if (remembered && employees.some(item => item.loginName === remembered)) {
      setEmployeeLoginName(remembered);
      return;
    }
    if (!employees.some(item => item.loginName === employeeLoginName)) setEmployeeLoginName(employees[0]?.loginName || '');
  }, [selectedBranchId, employees]);

  const selectMode = nextMode => {
    clearCloudError?.();
    setMode(nextMode);
    setPin('');
    setError('');
    if (nextMode === 'employee') void refreshLoginEmployees(selectedBranchId);
  };

  const goBack = () => {
    setMode('choose');
    setPin('');
    setError('');
  };

  const runBiometric = async () => {
    if (!activeRole || !biometricEnabled || !biometricMatchesMode || busy) return;
    setBusy(true);
    setBusyLabel('Menunggu sidik jari atau pengenalan wajah...');
    setError('');
    try {
      const result = await authenticateBiometric({
        title: activeRole.title,
        subtitle: 'Verifikasi biometrik hanya dimulai setelah tombol ini ditekan.'
      });
      if (!result?.success) {
        if (!result?.cancelled) setError(result?.error || 'Biometrik tidak berhasil. Gunakan PIN.');
        return;
      }
      const loginResult = await loginWithBiometric(
        deviceSettings.biometricUserId,
        activeRole.expectedRole,
        mode === 'employee' ? { branchId: selectedBranchId } : {}
      );
      if (!loginResult.success) setError(loginResult.message || 'Akun biometrik tidak tersedia untuk halaman ini.');
    } catch (biometricError) {
      setError(biometricError?.message || 'Biometrik gagal. Gunakan PIN.');
    } finally {
      setBusy(false);
      setBusyLabel('Memeriksa akun...');
    }
  };

  useEffect(() => {
    if (!activeRole || pin.length !== 4) return undefined;
    if (mode === 'employee' && !employeeLoginName) return undefined;
    let cancelled = false;
    const verify = async () => {
      setBusy(true);
      setBusyLabel(online ? `Membuka ${activeRole.title.replace('Login ', '')}...` : 'Membuka data offline...');
      setError('');
      try {
        const result = mode === 'employee'
          ? await loginEmployee({ loginName: employeeLoginName, pin, branchId: selectedBranchId })
          : await login(pin, 'owner');
        if (!cancelled && !result.success) {
          setError(result.message || 'Data login tidak dikenali.');
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
  }, [pin, mode, employeeLoginName, selectedBranchId, activeRole, login, loginEmployee, online]);

  const press = value => {
    if (pin.length < 4 && !busy) {
      setPin(previous => previous + value);
      setError('');
    }
  };

  const chooseBranch = value => {
    setSelectedBranchId(value);
    setEmployeeLoginName('');
    updateDeviceSettings({ activeBranchId: value });
    setPin('');
    setError('');
    void refreshLoginEmployees(value);
  };

  return (
    <div className="login-page-shell min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 flex items-center justify-center p-3 sm:p-5">
      <div className="login-card bg-white w-full max-w-md rounded-[2rem] shadow-2xl relative overflow-hidden">
        {busy && <BusyOverlay label={busyLabel}/>} 
        <div className="p-4 sm:p-7">
          <div className="flex flex-col items-center text-center gap-2 mb-3 sm:flex-row sm:items-center sm:text-left sm:gap-3 sm:mb-4">
            <img src="/logo-bm.svg" alt="Logo Bumi Makmur" className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] shadow-xl ring-1 ring-emerald-100 shrink-0"/>
            <div className="text-center sm:text-left min-w-0">
              <h1 className="font-black text-xl sm:text-2xl tracking-tight text-gray-900 leading-tight break-words">{loginHeader}</h1>
              <p className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">{loginSubheader}</p>
            </div>
          </div>

          <ConnectionStatus online={online} appearance={loginAppearance}/>

          {mode === 'choose' ? (
            <LoginChooser onSelect={selectMode} cloudConfigured={cloudConfigured} appearance={loginAppearance}/>
          ) : (
            <RoleLogin
              mode={mode}
              role={activeRole}
              pin={pin}
              error={error}
              busy={busy}
              branches={branches}
              selectedBranchId={selectedBranchId}
              onBranchChange={chooseBranch}
              directoryLoading={loginDirectoryLoading}
              employees={employees}
              employeesLoading={loginEmployeesLoading}
              employeeLoginName={employeeLoginName}
              onReloadEmployees={() => void refreshLoginEmployees(selectedBranchId)}
              onEmployeeChange={value => {
                setEmployeeLoginName(value);
                updateDeviceSettings({ lastEmployeeLoginByBranch: { ...(deviceSettings.lastEmployeeLoginByBranch || {}), [selectedBranchId]: value } });
                setPin('');
                setError('');
              }}
              onPress={press}
              onErase={() => { setPin(value => value.slice(0, -1)); setError(''); }}
              onBack={goBack}
              biometricEnabled={biometricEnabled && biometricMatchesMode}
              onBiometric={() => void runBiometric()}
              onOwnerConnect={() => setShowOwnerConnect(true)}
              onSetup={() => setShowSetup(true)}
              setupAvailable={setupAvailable}
              online={online}
              cloudConfigured={cloudConfigured}
            />
          )}
        </div>

        <div className="px-5 sm:px-7 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 flex gap-2">
          <ShieldCheck size={18} className="text-emerald-700 shrink-0"/>
          <p><b className="text-slate-800">{loginAppearance.footerLead}</b>{loginAppearance.footerText ? ` ${loginAppearance.footerText}` : ''}</p>
        </div>
      </div>

      {showOwnerConnect && (
        <ConnectOwnerModal
          onClose={() => setShowOwnerConnect(false)}
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

function ConnectionStatus({ online, appearance }) {
  return (
    <div className={`mb-5 p-3 rounded-2xl border text-left flex gap-3 ${online ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
      {online ? <Cloud size={20} className="shrink-0"/> : <WifiOff size={20} className="shrink-0"/>}
      <div>
        <p className="font-bold text-sm">{online ? appearance.onlineTitle : appearance.offlineTitle}</p>
        <p className="text-xs leading-relaxed">{online ? appearance.onlineSubtitle : appearance.offlineSubtitle}</p>
      </div>
    </div>
  );
}

function LoginChooser({ onSelect, cloudConfigured, appearance }) {
  return (
    <div>
      <div className="text-center mb-4">
        <h2 className="font-black text-xl text-gray-900">{appearance.chooserTitle}</h2>
        <p className="text-sm text-gray-500 mt-1">{appearance.chooserSubtitle}</p>
      </div>
      <div className="space-y-3">
        <button onClick={() => onSelect('owner')} className="login-role-card owner-card w-full text-left">
          <span className="login-role-icon"><BriefcaseBusiness size={26}/></span>
          <span className="flex-1 min-w-0"><b className="block text-base">{appearance.ownerTitle}</b><small>{appearance.ownerSubtitle}</small></span>
          <Store size={21} className="shrink-0 opacity-60"/>
        </button>
        <button onClick={() => onSelect('employee')} className="login-role-card employee-card w-full text-left">
          <span className="login-role-icon"><UsersRound size={26}/></span>
          <span className="flex-1 min-w-0"><b className="block text-base">{appearance.employeeTitle}</b><small>{appearance.employeeSubtitle}</small></span>
          <UserRound size={21} className="shrink-0 opacity-60"/>
        </button>
      </div>
      {!cloudConfigured && <p className="mt-4 text-xs font-bold text-orange-800 bg-orange-50 border border-orange-100 p-3 rounded-xl">Konfigurasi Firebase belum terpasang pada build ini. Mode lokal hanya untuk pengujian.</p>}
    </div>
  );
}

function RoleLogin({
  mode, role, pin, error, busy, branches, selectedBranchId, onBranchChange, directoryLoading,
  employees, employeesLoading, employeeLoginName, onEmployeeChange, onReloadEmployees, onPress, onErase, onBack, biometricEnabled,
  onBiometric, onOwnerConnect, onSetup, setupAvailable, online, cloudConfigured
}) {
  const RoleIcon = role.icon;
  const isOwner = mode === 'owner';
  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-2 min-h-[42px] text-sm font-bold text-gray-600 mb-2"><ArrowLeft size={18}/> Pilih jenis login</button>
      <div className={`rounded-2xl p-4 mb-4 flex gap-3 ${isOwner ? 'bg-emerald-50 text-emerald-900' : 'bg-blue-50 text-blue-900'}`}>
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isOwner ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}><RoleIcon size={23}/></span>
        <div><h2 className="font-black text-lg">{role.title}</h2><p className="text-xs leading-relaxed mt-0.5">{role.subtitle}</p></div>
      </div>

      {!isOwner && <Field label="Toko / Cabang" hint={directoryLoading ? 'Memuat daftar cabang...' : 'Cabang menentukan data, stok, dan daftar karyawan yang dibuka.'}>
        <Select value={selectedBranchId} onChange={event => onBranchChange(event.target.value)} disabled={busy || directoryLoading}>
          {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </Select>
      </Field>}

      {isOwner && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
        <p className="font-black">Satu akun Owner untuk seluruh cabang</p>
        <p className="text-xs mt-1 leading-relaxed">Owner tidak perlu memilih cabang saat login. Setelah masuk, cabang aktif dapat diganti dari pemilih cabang di bagian atas aplikasi.</p>
      </div>}

      {!isOwner && (
        <Field label="Nama Karyawan" hint={employeesLoading ? 'Memuat daftar karyawan aktif...' : 'Daftar mengikuti cabang yang dipilih dan diperbarui otomatis oleh Owner/Manager.'}>
          <Select value={employeeLoginName} onChange={event => onEmployeeChange(event.target.value)} disabled={busy || employeesLoading || employees.length === 0}>
            {employees.length === 0 && <option value="">Belum ada karyawan aktif di cabang ini</option>}
            {employees.map(employee => <option key={employee.loginName} value={employee.loginName}>{employee.name} — {employee.role === 'manager' ? 'Store Manager' : 'Kasir'}</option>)}
          </Select>
          {!employeesLoading && employees.length === 0 && <p className="text-xs text-orange-700 font-bold mt-2">Buat atau aktifkan akun dari Pengaturan → Karyawan, lalu tekan muat ulang daftar.</p>}
          <button type="button" onClick={onReloadEmployees} disabled={busy || employeesLoading} className="mt-2 min-h-[40px] px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold disabled:opacity-50">Muat Ulang Daftar Karyawan</button>
        </Field>
      )}

      <div className="mt-4 text-center">
        <p className="text-xs font-bold text-gray-500 mb-3">Masukkan PIN 4 digit {isOwner ? 'Owner' : 'Karyawan'}</p>
        <div className="flex justify-center gap-4 mb-4" aria-label={`${pin.length} dari 4 digit PIN terisi`}>
          {[0,1,2,3].map(index => <span key={index} className={`w-3 h-3 rounded-full ${index < pin.length ? (isOwner ? 'bg-emerald-600' : 'bg-blue-600') : 'bg-gray-200'}`}/>)}
        </div>
        {error && <ErrorBox text={error}/>} 
        <PinPad onPress={onPress} onErase={onErase} busy={busy || (!isOwner && !employeeLoginName)} accent={isOwner ? 'emerald' : 'blue'}/>
      </div>

      {biometricEnabled && (
        <button onClick={onBiometric} disabled={busy} className={`mt-4 w-full min-h-[54px] rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-60 ${isOwner ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
          <Fingerprint size={23}/><ScanFace size={23}/><span>Masuk dengan Sidik Jari / Face ID</span>
        </button>
      )}
      <p className="text-[11px] text-center text-gray-500 mt-2">Biometrik tidak akan muncul otomatis. Verifikasi hanya dimulai setelah tombol ditekan.</p>

      {isOwner && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button onClick={onOwnerConnect} disabled={busy || !online || !cloudConfigured} className="w-full min-h-[50px] rounded-xl text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 flex items-center justify-center gap-2 disabled:opacity-40"><Link2 size={18}/> Masuk Owner dengan Email</button>
          {setupAvailable&&<button onClick={onSetup} disabled={busy || !online || !cloudConfigured} className="mt-2 w-full min-h-[48px] rounded-xl text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 flex items-center justify-center gap-2 disabled:opacity-40"><ServerCog size={18}/> Aktivasi Toko Baru</button>}
          <p className="text-[11px] text-gray-500 mt-2 text-center leading-relaxed">Email Owner hanya diperlukan pada perangkat baru atau saat sesi cloud perlu dihubungkan ulang. Aktivasi toko baru disembunyikan dari login normal dan hanya tersedia melalui mode pemulihan khusus.</p>
        </div>
      )}
    </div>
  );
}

function PinPad({ onPress, onErase, busy, accent }) {
  const activeClass = accent === 'blue' ? 'active:bg-blue-100' : 'active:bg-emerald-100';
  return <div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6,7,8,9].map(value => <button key={value} disabled={busy} onClick={() => onPress(String(value))} className={`pin-key ${activeClass}`}>{value}</button>)}<div aria-hidden="true"/><button disabled={busy} onClick={() => onPress('0')} className={`pin-key ${activeClass}`}>0</button><button disabled={busy} onClick={onErase} aria-label="Hapus digit terakhir" className="pin-key bg-orange-50 border-orange-100 text-orange-600"><Trash2 size={22}/></button></div>;
}

function BusyOverlay({ label }) {
  return <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-6 text-center"><Loader2 className="animate-spin text-emerald-600" size={42}/><p className="font-bold mt-3 text-gray-700">{label}</p></div>;
}

function ConnectOwnerModal({ onClose, onConnect }) {
  const [form, setForm] = useState({ email: '', password: '', pin: '', confirmPin: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!form.email || !form.password) return setError('Email dan password Owner wajib diisi.');
    if (!/^\d{4}$/.test(form.pin)) return setError('Buat PIN Owner 4 digit pada perangkat ini.');
    if (form.pin !== form.confirmPin) return setError('Konfirmasi PIN tidak sama.');
    setBusy(true); setError('');
    try { await onConnect(form); onClose(); }
    catch (connectError) { setError(friendlyCloudError(connectError, 'Akun Owner gagal dihubungkan.')); }
    finally { setBusy(false); }
  };
  return <ModalShell title="Masuk Owner dengan Email" subtitle="Digunakan sekali pada perangkat baru" onClose={onClose}>
    {error && <ErrorBox text={error}/>} 
    <Field label="Email Owner"><Input type="email" autoComplete="username" value={form.email} onChange={event => setForm({...form,email:event.target.value})} placeholder="owner@contoh.com"/></Field>
    <Field label="Password Firebase"><Input type="password" autoComplete="current-password" value={form.password} onChange={event => setForm({...form,password:event.target.value})}/></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="PIN Owner"><Input type="password" inputMode="numeric" maxLength="4" value={form.pin} onChange={event => setForm({...form,pin:event.target.value.replace(/\D/g,'')})} placeholder="4 digit"/></Field><Field label="Ulangi PIN"><Input type="password" inputMode="numeric" maxLength="4" value={form.confirmPin} onChange={event => setForm({...form,confirmPin:event.target.value.replace(/\D/g,'')})} placeholder="4 digit"/></Field></div>
    <div className="p-3 rounded-xl bg-slate-50 border text-xs text-slate-600 flex gap-2"><KeyRound size={17} className="shrink-0"/><p>PIN Owner disimpan aman pada perangkat untuk login harian. Password Firebase tidak ditampilkan kembali.</p></div>
    <button onClick={submit} disabled={busy} className="w-full min-h-[52px] bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="animate-spin"/> : <KeyRound size={18}/>} Hubungkan & Masuk</button>
  </ModalShell>;
}

function BootstrapModal({ onClose, onBootstrap, configured, initialStoreCode }) {
  const [form, setForm] = useState({ storeCode: initialStoreCode || 'BUMIMAKMUR', businessName: 'BUMI MAKMUR', branchName: 'Bumi Makmur Pusat', branchAddress: '', branchPhone: '', ownerName: 'Bapak Owner', ownerEmail: '', ownerPassword: '', ownerPin: '' });
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
    <button onClick={submit} disabled={busy} className="w-full mt-4 min-h-[52px] bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="animate-spin"/> : <UserRoundPlus size={18}/>} Buat Toko & Owner</button>
  </ModalShell>;
}

function ModalShell({ title, subtitle, onClose, wide = false, children }) {
  return <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"><div className={`bg-white w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col`}><div className="p-5 border-b flex justify-between items-center shrink-0"><div className="pr-3"><p className="font-black text-lg">{title}</p><p className="text-xs text-gray-500 mt-0.5">{subtitle}</p></div><button onClick={onClose} aria-label="Tutup" className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><X/></button></div><div className="p-5 space-y-3 overflow-y-auto pb-safe">{children}</div></div></div>;
}

function ErrorBox({ text }) {
  return <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl mb-3" role="alert">{text}</p>;
}

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, KeyRound, Mail, MapPin, Plus, RefreshCw, Shield,
  Store, UserCog, UserRoundCheck, WifiOff
} from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { ROLE_PERMISSIONS } from '../data/defaults.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui.jsx';

export function EmployeesScreen() {
  return (
    <div className="h-full flex flex-col bg-gray-50 generic-bg">
      <PageHeader title="Karyawan & Hak Akses" subtitle="Kelola akun Store Manager dan Kasir langsung dari aplikasi"/>
      <div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">
        <EmployeeManagementPanel/>
      </div>
    </div>
  );
}

export function EmployeeManagementPanel() {
  const { db, currentUser, online, cloudReady, saveEmployee, resetEmployeePassword } = usePos();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const employees = useMemo(() => (db.users || []).filter(user => user.role !== 'owner'), [db.users]);
  const ownerReady = currentUser?.role === 'owner';

  const openNew = () => {
    setMessage(null);
    setEditing({
      name: '', email: '', temporaryPassword: '', role: 'kasir',
      branchId: db.configs.activeBranchId || db.branches[0]?.id || '',
      active: true, permissions: []
    });
  };

  const save = async data => {
    setBusy(true);
    setMessage(null);
    try {
      const profile = await saveEmployee(data);
      setEditing(null);
      setMessage({ tone: 'success', text: `Akun ${profile.name} berhasil disimpan dan langsung tersedia di daftar karyawan.` });
    } catch (error) {
      setMessage({ tone: 'error', text: error?.message || 'Akun karyawan belum berhasil disimpan.' });
    } finally {
      setBusy(false);
    }
  };

  if (!ownerReady) {
    return <Card className="p-5 border-orange-200 bg-orange-50"><p className="font-black text-orange-900">Khusus Owner</p><p className="text-sm text-orange-800 mt-1">Akun karyawan hanya dapat dibuat dan diubah setelah masuk melalui Login Owner.</p></Card>;
  }

  return <div className="space-y-4 max-w-6xl">
    <Card className="p-5 bg-gradient-to-br from-emerald-950 to-slate-950 text-white border-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0"><UserRoundCheck size={29}/></div>
        <div className="flex-1">
          <p className="font-black text-lg">Akun Karyawan Firebase</p>
          <p className="text-sm text-emerald-100 mt-1">Owner membuat akun di sini. Pada perangkat baru, karyawan masuk satu kali memakai email dan password sementara, lalu membuat PIN 4 digit lokal.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge tone={online ? 'green' : 'orange'}>{online ? 'Internet aktif' : 'Offline'}</Badge>
            <Badge tone={cloudReady ? 'green' : 'orange'}>{cloudReady ? 'Cloud terhubung' : 'Cloud belum siap'}</Badge>
            <Badge tone="blue">{employees.length} karyawan</Badge>
          </div>
        </div>
        <Button onClick={openNew} disabled={!online || busy}><Plus size={17}/> Karyawan Baru</Button>
      </div>
    </Card>

    {!online && <Notice tone="warning" icon={WifiOff} text="Pembuatan atau perubahan akun karyawan memerlukan internet. Data lain tetap dapat digunakan offline."/>}
    {message && <Notice tone={message.tone} icon={message.tone === 'success' ? CheckCircle2 : Shield} text={message.text}/>} 

    {employees.length === 0 ? (
      <EmptyState icon={UserCog} title="Belum ada karyawan" subtitle="Tekan Karyawan Baru untuk membuat akun Store Manager atau Kasir." action={<Button onClick={openNew} disabled={!online}><Plus size={17}/> Buat Karyawan Pertama</Button>}/>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {employees.map(user => (
          <Card key={user.id} className="p-4" onClick={() => { setMessage(null); setEditing({...user, temporaryPassword: ''}); }}>
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">{String(user.name || '?').charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 flex gap-1 items-center"><Shield size={13}/>{user.role === 'manager' ? 'Store Manager' : 'Kasir'}</p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1"><Mail size={12}/>{user.email || 'Email belum ada'}</p>
                <p className="text-xs text-gray-500">{db.branches.find(branch => branch.id === user.branchId)?.name || user.branchId || 'Cabang belum dipilih'}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-between gap-2 items-center">
              <Badge tone={user.active !== false ? 'green' : 'red'}>{user.active !== false ? 'Aktif' : 'Nonaktif'}</Badge>
              <span className="text-xs text-gray-500">{user.permissions?.length ? `${user.permissions.length} izin khusus` : 'Izin bawaan role'}</span>
            </div>
          </Card>
        ))}
      </div>
    )}

    {editing && (
      <EmployeeForm
        data={editing}
        branches={db.branches}
        busy={busy}
        onClose={() => !busy && setEditing(null)}
        onResetPassword={resetEmployeePassword}
        onSave={save}
      />
    )}
  </div>;
}

function Notice({ tone, icon: Icon, text }) {
  const classes = tone === 'success'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : tone === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-red-50 border-red-200 text-red-800';
  return <div className={`p-4 rounded-2xl border flex gap-3 items-start ${classes}`}><Icon size={20} className="shrink-0"/><p className="text-sm font-semibold leading-relaxed">{text}</p></div>;
}

function EmployeeForm({ data, branches, busy, onClose, onSave, onResetPassword }) {
  const [form, setForm] = useState(data);
  const [resetting, setResetting] = useState(false);
  const [localError, setLocalError] = useState('');
  const togglePermission = permission => setForm(previous => ({
    ...previous,
    permissions: (previous.permissions || []).includes(permission)
      ? previous.permissions.filter(item => item !== permission)
      : [...(previous.permissions || []), permission]
  }));
  const rolePermissions = (ROLE_PERMISSIONS[form.role] || []).filter(permission => permission !== '*');
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '');
  const validNew = Boolean(form.id) || (validEmail && (form.temporaryPassword || '').length >= 6);

  const submit = () => {
    if (!String(form.name || '').trim()) return setLocalError('Nama karyawan wajib diisi.');
    if (!form.id && !validEmail) return setLocalError('Email karyawan belum valid.');
    if (!form.id && (form.temporaryPassword || '').length < 6) return setLocalError('Password sementara minimal 6 karakter.');
    if (!form.branchId) return setLocalError('Cabang karyawan wajib dipilih.');
    setLocalError('');
    void onSave(form);
  };

  const resetPassword = async () => {
    setResetting(true);
    setLocalError('');
    try {
      await onResetPassword(form.email);
      alert('Email reset password sudah dikirim kepada karyawan.');
    } catch (error) {
      setLocalError(error?.message || 'Email reset password gagal dikirim.');
    } finally {
      setResetting(false);
    }
  };

  return <Modal title={form.id ? 'Edit Akun Karyawan' : 'Karyawan Baru'} onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button><Button onClick={submit} disabled={busy || !validNew}>{busy ? <RefreshCw size={17} className="animate-spin"/> : null}{busy ? 'Menyimpan...' : 'Simpan Akun'}</Button></>}>
    {localError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-bold text-red-700 mb-4">{localError}</div>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Nama Lengkap"><Input value={form.name} onChange={event => setForm({...form, name:event.target.value})} placeholder="Contoh: Andi Pratama"/></Field>
      <Field label="Email Firebase"><Input type="email" disabled={Boolean(form.id)} value={form.email || ''} onChange={event => setForm({...form, email:event.target.value})} placeholder="karyawan@contoh.com"/></Field>
      {!form.id && <Field label="Password Sementara" hint="Minimal 6 karakter. Karyawan dapat menggantinya melalui email reset."><Input type="password" value={form.temporaryPassword || ''} onChange={event => setForm({...form, temporaryPassword:event.target.value})}/></Field>}
      <Field label="Peran"><Select value={form.role} onChange={event => setForm({...form, role:event.target.value, permissions:[]})}><option value="manager">Store Manager</option><option value="kasir">Kasir</option></Select></Field>
      <Field label="Cabang"><Select value={form.branchId} onChange={event => setForm({...form, branchId:event.target.value})}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field>
      <label className="md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 border rounded-xl"><input type="checkbox" className="w-5 h-5" checked={form.active !== false} onChange={event => setForm({...form, active:event.target.checked})}/><span><b className="text-sm block">Akun aktif</b><small className="text-gray-500">Akun nonaktif tidak dapat login atau sinkronisasi.</small></span></label>
      {form.id && form.email && <div className="md:col-span-2"><Button variant="secondary" onClick={resetPassword} disabled={resetting}><Mail size={17}/>{resetting ? 'Mengirim...' : 'Kirim Email Reset Password'}</Button></div>}
      <div className="md:col-span-2">
        <p className="field-label">Hak Akses Khusus</p>
        <p className="text-xs text-gray-500 mb-3">Kosongkan untuk memakai izin bawaan role. Memilih izin khusus akan membatasi akun hanya pada izin yang dicentang.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {rolePermissions.map(permission => <label key={permission} className="flex gap-2 items-center p-3 rounded-xl bg-gray-50 border text-xs"><input type="checkbox" checked={(form.permissions || []).includes(permission)} onChange={() => togglePermission(permission)}/><span className="break-all">{permission}</span></label>)}
        </div>
      </div>
      <div className="md:col-span-2 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800 flex gap-3"><KeyRound size={20} className="shrink-0"/><p>PIN 4 digit dibuat oleh karyawan saat menghubungkan perangkat pertama kali melalui halaman <b>Login Karyawan</b>. PIN tidak dikirim melalui cloud.</p></div>
    </div>
  </Modal>;
}

export function BranchesScreen(){
 const {db,branchId,setActiveBranch,addBranch}=usePos();const[formOpen,setFormOpen]=useState(false);
 return <div className="h-full flex flex-col bg-gray-50 generic-bg"><PageHeader title="Cabang Toko" subtitle="Pemisahan stok, transaksi, pembelian, karyawan, dan laporan per cabang" actions={<Button onClick={()=>setFormOpen(true)}><Plus size={17}/> Cabang Baru</Button>}/><div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{db.branches.map(branch=><Card key={branch.id} className={`p-5 ${branch.id===branchId?'border-emerald-500 ring-1 ring-emerald-500':''}`}><div className="flex gap-3"><div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Store size={28}/></div><div className="min-w-0"><div className="flex gap-2 items-center"><p className="font-bold text-gray-800 truncate">{branch.name}</p>{branch.id===branchId&&<Badge tone="green">Aktif</Badge>}</div><p className="text-xs text-gray-500 flex gap-1 mt-1"><MapPin size={13}/>{branch.address||'-'}</p><p className="text-xs text-gray-500">ID: {branch.id}</p></div></div>{branch.id!==branchId&&<Button variant="secondary" className="w-full mt-4" onClick={()=>setActiveBranch(branch.id)}><CheckCircle2 size={17}/> Jadikan Cabang Aktif</Button>}</Card>)}</div></div>{formOpen&&<BranchForm onClose={()=>setFormOpen(false)} onSave={data=>{addBranch(data);setFormOpen(false)}}/>}</div>;
}
function BranchForm({onClose,onSave}){const[form,setForm]=useState({name:'',address:'',phone:''});return <Modal title="Cabang Baru" onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={()=>onSave(form)} disabled={!form.name}>Simpan</Button></>}><div className="space-y-3"><Field label="Nama Cabang"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Telepon"><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Alamat"><Textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field></div></Modal>}

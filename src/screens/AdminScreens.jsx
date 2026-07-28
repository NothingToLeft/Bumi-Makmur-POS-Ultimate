import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, KeyRound, LockKeyhole, MapPin, Plus, RefreshCw, Shield,
  Pencil, Store, Trash2, UserCog, UserRoundCheck, WifiOff
} from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { ROLE_PERMISSIONS } from '../data/defaults.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui.jsx';

export function EmployeesScreen() {
  return <div className="h-full flex flex-col bg-gray-50 generic-bg"><PageHeader title="Karyawan & Hak Akses" subtitle="Kelola Store Manager dan Kasir langsung dari aplikasi"/><div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6"><EmployeeManagementPanel/></div></div>;
}

export function EmployeeManagementPanel() {
  const { db, currentUser, online, cloudReady, hasPermission, saveEmployee, deleteEmployee } = usePos();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletePin, setDeletePin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const canManage = hasPermission('employees.manage');
  const isOwner = currentUser?.role === 'owner';
  const isManager = currentUser?.role === 'manager';
  const employees = useMemo(() => (db.users || []).filter(user => {
    if (user.role === 'owner') return false;
    if (isManager) return user.role === 'kasir' && user.branchId === currentUser.branchId;
    return true;
  }), [db.users, isManager, currentUser?.branchId]);

  const defaultBranchId = isManager
    ? currentUser.branchId
    : (db.configs.activeBranchId || db.branches[0]?.id || '');

  const openNew = () => {
    setMessage(null);
    setEditing({
      name: '', loginName: '', pin: '', confirmPin: '', currentPin: '', newPin: '', confirmNewPin: '',
      role: 'kasir', branchId: defaultBranchId, active: true, permissions: []
    });
  };

  const save = async data => {
    setBusy(true);
    setMessage(null);
    try {
      const profile = await saveEmployee(data);
      setEditing(null);
      setMessage({ tone: 'success', text: `Akun ${profile.name} berhasil disimpan. Login karyawan sekarang memakai cabang, nama login, dan PIN.` });
    } catch (error) {
      setMessage({ tone: 'error', text: error?.message || 'Akun karyawan belum berhasil disimpan.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await deleteEmployee({ id: deleting.id, pin: deletePin });
      setDeleting(null);
      setDeletePin('');
      setEditing(null);
      setMessage({
        tone: result.authCleanupWarning ? 'warning' : 'success',
        text: result.authCleanupWarning
          ? `Akun ${deleting.name} sudah dihapus dari POS. ${result.authCleanupWarning}`
          : `Akun ${deleting.name} berhasil dihapus permanen dari POS dan Firebase Authentication.`
      });
    } catch (error) {
      setMessage({ tone: 'error', text: error?.message || 'Akun karyawan belum berhasil dihapus.' });
    } finally {
      setBusy(false);
    }
  };

  if (!canManage || (!isOwner && !isManager)) {
    return <Card className="p-5 border-orange-200 bg-orange-50"><p className="font-black text-orange-900">Akses terbatas</p><p className="text-sm text-orange-800 mt-1">Menu ini hanya tersedia untuk Owner dan Store Manager yang mempunyai izin mengelola karyawan.</p></Card>;
  }

  return <div className="space-y-4 max-w-6xl">
    <Card className="p-5 bg-gradient-to-br from-emerald-950 to-slate-950 text-white border-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0"><UserRoundCheck size={29}/></div>
        <div className="flex-1">
          <p className="font-black text-lg">Karyawan, Manager & PIN Login</p>
          <p className="text-sm text-emerald-100 mt-1">{isOwner ? 'Owner dapat membuat Manager dan Kasir untuk cabang mana pun.' : 'Store Manager dapat membuat dan mengelola Kasir pada cabangnya sendiri.'}</p>
          <div className="flex flex-wrap gap-2 mt-3"><Badge tone={online ? 'green' : 'orange'}>{online ? 'Internet aktif' : 'Offline'}</Badge><Badge tone={cloudReady ? 'green' : 'orange'}>{cloudReady ? 'Cloud terhubung' : 'Cloud belum siap'}</Badge><Badge tone="blue">{employees.length} karyawan</Badge></div>
        </div>
        <Button onClick={openNew} disabled={!online || busy}><Plus size={17}/> Karyawan Baru</Button>
      </div>
    </Card>

    {!online && <Notice tone="warning" icon={WifiOff} text="Pembuatan, perubahan, dan penghapusan akun karyawan memerlukan internet. Operasional kasir lainnya tetap dapat digunakan offline."/>}
    {message && <Notice tone={message.tone} icon={message.tone === 'success' ? CheckCircle2 : Shield} text={message.text}/>} 

    {employees.length === 0 ? (
      <EmptyState icon={UserCog} title="Belum ada karyawan" subtitle={isOwner ? 'Buat Store Manager atau Kasir pertama.' : 'Buat Kasir pertama untuk cabang ini.'} action={<Button onClick={openNew} disabled={!online}><Plus size={17}/> Buat Karyawan</Button>}/>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {employees.map(user => (
          <Card key={user.id} className="p-4 cursor-pointer" onClick={() => { setMessage(null); setEditing({...user, pin:'', confirmPin:'', currentPin:'', newPin:'', confirmNewPin:''}); }}>
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">{String(user.name || '?').charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 flex gap-1 items-center"><Shield size={13}/>{user.role === 'manager' ? 'Store Manager' : 'Kasir'}</p>
                <p className="text-xs text-blue-700 truncate flex items-center gap-1"><KeyRound size={12}/>Login: {user.loginName || 'Belum dimigrasikan'}</p>
                <p className="text-xs text-gray-500">{db.branches.find(branch => branch.id === user.branchId)?.name || user.branchId || 'Cabang belum dipilih'}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-between gap-2 items-center"><Badge tone={user.active !== false ? 'green' : 'red'}>{user.active !== false ? 'Aktif' : 'Nonaktif'}</Badge><span className="text-xs text-gray-500">{user.permissions?.length ? `${user.permissions.length} izin khusus` : 'Izin bawaan role'}</span></div>
          </Card>
        ))}
      </div>
    )}

    {editing && <EmployeeForm data={editing} branches={db.branches} currentUser={currentUser} busy={busy} onClose={() => !busy && setEditing(null)} onDelete={editing.id ? () => { setDeletePin(''); setDeleting(editing); } : null} onSave={save}/>} 

    {deleting && <Modal title="Hapus Akun Karyawan" onClose={() => !busy && setDeleting(null)} size="md" footer={<><Button variant="secondary" onClick={() => setDeleting(null)} disabled={busy}>Batal</Button><Button variant="danger" onClick={remove} disabled={busy}>{busy ? <RefreshCw size={17} className="animate-spin"/> : <Trash2 size={17}/>} Hapus Permanen</Button></>}>
      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800"><b>{deleting.name}</b> akan dihapus dari daftar login dan tidak dapat mengakses data POS lagi. Riwayat transaksi tetap menyimpan nama karyawan.</div>
      <Field label="PIN Karyawan Saat Ini (opsional)" hint="Masukkan PIN agar identitas Firebase Authentication ikut dihapus. Tanpa PIN, akses POS tetap dicabut dan identitas lama diisolasi."><Input type="password" inputMode="numeric" maxLength="4" value={deletePin} onChange={event => setDeletePin(event.target.value.replace(/\D/g,''))} placeholder="4 digit"/></Field>
    </Modal>}
  </div>;
}

function Notice({ tone, icon: Icon, text }) {
  const classes = tone === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : tone === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800';
  return <div className={`p-4 rounded-2xl border flex gap-3 items-start ${classes}`}><Icon size={20} className="shrink-0"/><p className="text-sm font-semibold leading-relaxed">{text}</p></div>;
}

function EmployeeForm({ data, branches, currentUser, busy, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(data);
  const [localError, setLocalError] = useState('');
  const isOwner = currentUser?.role === 'owner';
  const legacyAccount = Boolean(form.id && (!form.loginAlias || !String(form.authMode || '').startsWith('name-pin')));
  const togglePermission = permission => setForm(previous => ({ ...previous, permissions: (previous.permissions || []).includes(permission) ? previous.permissions.filter(item => item !== permission) : [...(previous.permissions || []), permission] }));
  const effectiveRole = isOwner ? form.role : 'kasir';
  const rolePermissions = (ROLE_PERMISSIONS[effectiveRole] || []).filter(permission => permission !== '*');

  const submit = () => {
    const loginName = String(form.loginName || form.name || '').trim();
    if (!String(form.name || '').trim()) return setLocalError('Nama lengkap karyawan wajib diisi.');
    if (!loginName) return setLocalError('Nama login karyawan wajib diisi.');
    if (!form.branchId) return setLocalError('Cabang karyawan wajib dipilih.');
    if (!form.id || legacyAccount) {
      if (!/^\d{4}$/.test(String(form.pin || form.newPin || ''))) return setLocalError('PIN awal harus tepat 4 digit.');
      if ((form.pin || form.newPin) !== (form.confirmPin || form.confirmNewPin)) return setLocalError('Konfirmasi PIN tidak sama.');
    }
    if (form.newPin) {
      if (!/^\d{4}$/.test(String(form.currentPin || ''))) return setLocalError('Masukkan PIN saat ini sebelum mengganti PIN.');
      if (!/^\d{4}$/.test(String(form.newPin))) return setLocalError('PIN baru harus tepat 4 digit.');
      if (form.newPin !== form.confirmNewPin) return setLocalError('Konfirmasi PIN baru tidak sama.');
    }
    setLocalError('');
    void onSave({ ...form, loginName, role: effectiveRole, branchId: isOwner ? form.branchId : currentUser.branchId, pin: form.pin || form.newPin });
  };

  return <Modal title={form.id ? 'Edit Akun Karyawan' : 'Karyawan Baru'} onClose={onClose} size="xl" footer={<div className="flex w-full gap-2 justify-between">{onDelete ? <Button variant="danger" onClick={onDelete} disabled={busy}><Trash2 size={17}/> Hapus</Button> : <span/>}<div className="flex gap-2"><Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button><Button onClick={submit} disabled={busy}>{busy ? <RefreshCw size={17} className="animate-spin"/> : null}{busy ? 'Menyimpan...' : 'Simpan Akun'}</Button></div></div>}>
    {localError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-bold text-red-700 mb-4">{localError}</div>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Nama Lengkap"><Input value={form.name || ''} onChange={event => setForm({...form, name:event.target.value, loginName: form.loginName || event.target.value})} placeholder="Contoh: Andi Pratama"/></Field>
      <Field label="Nama Login" hint="Dipakai bersama pilihan cabang dan PIN pada halaman Login Karyawan."><Input value={form.loginName || ''} onChange={event => setForm({...form, loginName:event.target.value})} placeholder="Contoh: andi kasir"/></Field>
      {isOwner ? <Field label="Peran"><Select value={effectiveRole} onChange={event => setForm({...form, role:event.target.value, permissions:[]})}><option value="manager">Store Manager</option><option value="kasir">Kasir</option></Select></Field> : <Field label="Peran"><Input value="Kasir" disabled/></Field>}
      {isOwner ? <Field label="Cabang"><Select value={form.branchId || ''} onChange={event => setForm({...form, branchId:event.target.value})}>{branches.filter(branch => branch.active !== false).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field> : <Field label="Cabang"><Input value={branches.find(branch => branch.id === currentUser.branchId)?.name || currentUser.branchId} disabled/></Field>}

      {(!form.id || legacyAccount) && <><Field label={legacyAccount ? 'PIN Baru untuk Migrasi' : 'PIN Awal 4 Digit'}><Input type="password" inputMode="numeric" maxLength="4" value={form.pin || ''} onChange={event => setForm({...form,pin:event.target.value.replace(/\D/g,'')})}/></Field><Field label="Ulangi PIN"><Input type="password" inputMode="numeric" maxLength="4" value={form.confirmPin || ''} onChange={event => setForm({...form,confirmPin:event.target.value.replace(/\D/g,'')})}/></Field></>}
      {form.id && !legacyAccount && <><Field label="PIN Saat Ini" hint="Hanya diperlukan bila PIN ingin diganti."><Input type="password" inputMode="numeric" maxLength="4" value={form.currentPin || ''} onChange={event => setForm({...form,currentPin:event.target.value.replace(/\D/g,'')})}/></Field><Field label="PIN Baru"><Input type="password" inputMode="numeric" maxLength="4" value={form.newPin || ''} onChange={event => setForm({...form,newPin:event.target.value.replace(/\D/g,'')})}/></Field><Field label="Ulangi PIN Baru" className="md:col-span-2"><Input type="password" inputMode="numeric" maxLength="4" value={form.confirmNewPin || ''} onChange={event => setForm({...form,confirmNewPin:event.target.value.replace(/\D/g,'')})}/></Field></>}

      <label className="md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 border rounded-xl"><input type="checkbox" className="w-5 h-5" checked={form.active !== false} onChange={event => setForm({...form, active:event.target.checked})}/><span><b className="text-sm block">Akun aktif</b><small className="text-gray-500">Akun nonaktif tidak dapat login atau sinkronisasi cloud.</small></span></label>
      <div className="md:col-span-2"><p className="field-label">Hak Akses Khusus</p><p className="text-xs text-gray-500 mb-3">Kosongkan untuk memakai izin bawaan role. Store Manager hanya dapat memberikan izin yang tersedia untuk Kasir.</p><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{rolePermissions.map(permission => <label key={permission} className="flex gap-2 items-center p-3 rounded-xl bg-gray-50 border text-xs"><input type="checkbox" checked={(form.permissions || []).includes(permission)} onChange={() => togglePermission(permission)}/><span className="break-all">{permission}</span></label>)}</div></div>
      <div className="md:col-span-2 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800 flex gap-3"><LockKeyhole size={20} className="shrink-0"/><p>Karyawan tidak perlu email atau password. Login harian cukup memilih cabang, memasukkan nama login, lalu PIN 4 digit.</p></div>
    </div>
  </Modal>;
}

function branchUsageSummary(db, branchId) {
 const sections = [
  ['barang', (db.products || []).filter(item => item.branchId === branchId).length],
  ['karyawan', (db.users || []).filter(item => item.role !== 'owner' && item.branchId === branchId).length],
  ['transaksi', (db.sales || []).filter(item => item.branchId === branchId).length],
  ['pembelian', (db.purchases || []).filter(item => item.branchId === branchId).length],
  ['pergerakan stok', (db.stockMovements || []).filter(item => item.branchId === branchId).length],
  ['transfer stok', (db.stockTransfers || []).filter(item => item.sourceBranchId === branchId || item.destinationBranchId === branchId).length],
  ['shift', (db.shifts || []).filter(item => item.branchId === branchId).length],
  ['piutang/utang', [...(db.receivables || []), ...(db.payables || [])].filter(item => item.branchId === branchId).length]
 ].filter(([, count]) => count > 0);
 return { count: sections.reduce((sum, [, count]) => sum + count, 0), sections };
}

export function BranchesScreen(){
 const {db,branchId,setActiveBranch,addBranch,updateBranch,deleteBranch,restoreBranch,hasPermission}=usePos();
 const[formOpen,setFormOpen]=useState(false);
 const[editing,setEditing]=useState(null);
 const[deleting,setDeleting]=useState(null);
 const[message,setMessage]=useState('');
 const canManage=hasPermission('branches.manage');
 const activeBranches=(db.branches||[]).filter(item=>item.active!==false);
 const archivedBranches=(db.branches||[]).filter(item=>item.active===false);
 const saveNew=data=>{try{addBranch(data);setFormOpen(false);setMessage('Cabang baru berhasil ditambahkan.')}catch(error){setMessage(error.message||'Cabang gagal ditambahkan.')}};
 const saveEdit=data=>{try{updateBranch(data);setEditing(null);setMessage('Identitas cabang berhasil diperbarui dan akan dipakai pada login serta tampilan cabang aktif.')}catch(error){setMessage(error.message||'Cabang gagal diperbarui.')}};
 const remove=branch=>{try{const result=deleteBranch(branch.id);setDeleting(null);setMessage(result?.mode==='archived'?'Cabang memiliki riwayat operasional sehingga diarsipkan dengan aman. Cabang tidak lagi muncul pada login karyawan.':'Cabang kosong berhasil dihapus permanen.');}catch(error){setMessage(error.message||'Cabang gagal dihapus.')}};
 const restore=branch=>{try{restoreBranch(branch.id);setMessage(`Cabang ${branch.name} berhasil diaktifkan kembali.`);}catch(error){setMessage(error.message||'Cabang gagal dipulihkan.')}};
 const renderCard=branch=>{const usage=branchUsageSummary(db,branch.id);const archived=branch.active===false;return <Card key={branch.id} className={`p-5 ${branch.id===branchId?'border-emerald-500 ring-1 ring-emerald-500':''} ${archived?'opacity-80 border-dashed':''}`}>
  <div className="flex gap-3"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${archived?'bg-gray-100 text-gray-500':'bg-emerald-100 text-emerald-700'}`}><Store size={28}/></div><div className="min-w-0 flex-1"><div className="flex gap-2 items-center flex-wrap"><p className="font-bold text-gray-800 break-words">{branch.name}</p>{branch.id===branchId&&<Badge tone="green">Aktif</Badge>}{archived&&<Badge>Diarsipkan</Badge>}</div><p className="text-xs text-gray-500 flex gap-1 mt-1"><MapPin size={13}/>{branch.address||'Alamat belum diisi'}</p><p className="text-xs text-gray-500 mt-1">Telp: {branch.phone||'-'}</p><p className="text-xs text-gray-400 mt-1">ID: {branch.id}</p>{usage.count>0&&<p className="text-[11px] text-blue-700 font-bold mt-2">Memiliki {usage.count} referensi operasional; penghapusan akan menjadi arsip aman.</p>}</div></div>
  {canManage&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">{!archived&&<Button variant="secondary" onClick={()=>setEditing(branch)}><Pencil size={16}/> Edit Cabang</Button>}{archived?<Button variant="outline" onClick={()=>restore(branch)}><RefreshCw size={16}/> Aktifkan Kembali</Button>:branch.id!==branchId?<Button variant="outline" onClick={()=>setActiveBranch(branch.id)}><CheckCircle2 size={17}/> Jadikan Aktif</Button>:<Button variant="outline" disabled><CheckCircle2 size={17}/> Cabang Aktif</Button>}<Button variant="danger" onClick={()=>setDeleting(branch)} disabled={!archived&&activeBranches.length<=1}><Trash2 size={16}/> {usage.count>0?'Arsip / Hapus':'Hapus Cabang'}</Button></div>}
 </Card>};
 return <div className="h-full flex flex-col bg-gray-50 generic-bg">
  <PageHeader title="Cabang Toko" subtitle="Kelola nama, alamat, telepon, stok, transaksi, karyawan, dan laporan per cabang" actions={canManage&&<Button onClick={()=>setFormOpen(true)}><Plus size={17}/> Cabang Baru</Button>}/>
  <div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">
   {message&&<div className={`mb-4 p-3 rounded-2xl border text-sm font-bold ${/gagal|tidak dapat|tidak bisa/i.test(message)?'bg-red-50 border-red-200 text-red-700':'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>{message}</div>}
   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{activeBranches.map(renderCard)}</div>
   {archivedBranches.length>0&&<div className="mt-8"><div className="mb-3"><p className="font-black text-gray-800">Cabang Diarsipkan</p><p className="text-xs text-gray-500">Tidak muncul pada login karyawan, tetapi riwayat laporan tetap aman dan dapat dipulihkan.</p></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{archivedBranches.map(renderCard)}</div></div>}
  </div>
  {formOpen&&canManage&&<BranchForm onClose={()=>setFormOpen(false)} onSave={saveNew}/>} 
  {editing&&canManage&&<BranchForm data={editing} onClose={()=>setEditing(null)} onSave={saveEdit}/>} 
  {deleting&&canManage&&<BranchDeleteModal branch={deleting} usage={branchUsageSummary(db,deleting.id)} activeCount={activeBranches.length} onClose={()=>setDeleting(null)} onDelete={()=>remove(deleting)}/>} 
 </div>;
}

function BranchDeleteModal({branch,usage,activeCount,onClose,onDelete}){
 const[confirmation,setConfirmation]=useState('');
 const archived=branch.active===false;
 const hasHistory=usage.count>0;
 const action=hasHistory&&!archived?'Arsipkan Cabang':'Hapus Permanen';
 const blocked=branch.active!==false&&activeCount<=1;
 const historyLocked=hasHistory&&archived;
 const footer=<><Button variant="secondary" onClick={onClose}>{historyLocked?'Tutup':'Batal'}</Button>{!historyLocked&&<Button variant="danger" onClick={onDelete} disabled={blocked||confirmation.trim()!==branch.name.trim()}><Trash2 size={16}/>{action}</Button>}</>;
 return <Modal title="Hapus / Arsipkan Cabang" onClose={onClose} size="md" footer={footer}>
  <div className="space-y-4"><div className={`p-4 rounded-2xl border ${hasHistory?'bg-amber-50 border-amber-200 text-amber-900':'bg-red-50 border-red-200 text-red-800'}`}><p className="font-black">{branch.name}</p><p className="text-sm mt-1">{hasHistory?archived?'Cabang ini memiliki riwayat operasional dan tidak dapat dihapus permanen. Anda dapat mengaktifkannya kembali.':'Cabang memiliki riwayat operasional. Sistem akan mengarsipkannya, bukan menghapus transaksi dan laporan.':'Cabang belum memiliki data operasional dan dapat dihapus permanen.'}</p></div>
  {usage.sections.length>0&&<div className="flex flex-wrap gap-2">{usage.sections.map(([label,count])=><Badge key={label} tone="blue">{count} {label}</Badge>)}</div>}
  {blocked&&<p className="text-sm font-bold text-red-700">Cabang terakhir yang aktif tidak boleh dihapus. Buat atau aktifkan cabang lain terlebih dahulu.</p>}
  {!blocked&&(!hasHistory||!archived)&&<Field label={`Ketik nama cabang untuk konfirmasi: ${branch.name}`}><Input value={confirmation} onChange={event=>setConfirmation(event.target.value)} placeholder={branch.name}/></Field>}
  {hasHistory&&archived&&<p className="text-sm text-gray-600">Gunakan tombol <b>Aktifkan Kembali</b> pada kartu cabang bila cabang ini akan dipakai lagi.</p>}</div>
 </Modal>;
}

function BranchForm({data,onClose,onSave}){
 const[form,setForm]=useState(data?{...data}:{name:'',address:'',phone:''});
 const isEditing=Boolean(data?.id);
 return <Modal title={isEditing?'Edit Identitas Cabang':'Cabang Baru'} onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={()=>onSave(form)} disabled={!String(form.name||'').trim()}>{isEditing?'Simpan Perubahan':'Simpan Cabang'}</Button></>}><div className="space-y-3"><Field label="Nama Cabang"><Input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Contoh: Bumi Makmur Utama" maxLength={80}/></Field><Field label="Telepon"><Input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Alamat"><Textarea value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></Field>{isEditing&&<div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">Nama dan alamat ini otomatis dipakai pada sidebar, halaman setelah login, nota, layar pelanggan, serta pilihan cabang login ketika cabang ini aktif.</div>}</div></Modal>;
}

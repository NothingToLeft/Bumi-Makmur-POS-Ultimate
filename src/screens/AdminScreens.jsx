import React, { useState } from 'react';
import { UserCog, Plus, Shield, Store, MapPin, CheckCircle2, Mail, KeyRound } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { MODULES, ROLE_PERMISSIONS } from '../data/defaults.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui.jsx';

export function EmployeesScreen(){
 const {db,saveEmployee,resetEmployeePassword}=usePos();const[editing,setEditing]=useState(null);
 const openNew=()=>setEditing({name:'',email:'',temporaryPassword:'',role:'kasir',branchId:db.configs.activeBranchId,active:true,permissions:[]});
 return <div className="h-full flex flex-col bg-gray-50 generic-bg"><PageHeader title="Karyawan & Hak Akses" subtitle="Akun Firebase per karyawan, role, cabang, dan permission" actions={<Button onClick={openNew}><Plus size={17}/> Karyawan Baru</Button>}/><div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">
  <Card className="p-4 mb-4 border-blue-200 bg-blue-50"><p className="font-bold text-blue-800 flex items-center gap-2"><KeyRound size={18}/> Login perangkat baru</p><p className="text-sm text-blue-700 mt-1">Karyawan menghubungkan perangkat satu kali memakai email dan password sementara. Setelah itu aplikasi dibuka setiap hari dengan PIN 4 digit atau biometrik lokal.</p></Card>
  {db.users.length===0?<EmptyState icon={UserCog}/>:<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{db.users.map(user=><Card key={user.id} className="p-4" onClick={()=>setEditing({...user,temporaryPassword:''})}><div className="flex gap-3"><div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">{user.name.charAt(0)}</div><div className="min-w-0"><p className="font-bold text-gray-800 truncate">{user.name}</p><p className="text-xs text-gray-500 flex gap-1 items-center"><Shield size={13}/>{user.role}</p><p className="text-xs text-gray-500 truncate flex items-center gap-1"><Mail size={12}/>{user.email||'Email belum ada'}</p><p className="text-xs text-gray-500">{db.branches.find(b=>b.id===user.branchId)?.name||user.branchId}</p></div></div><div className="mt-3 flex justify-between"><Badge tone={user.active!==false?'green':'red'}>{user.active!==false?'Aktif':'Nonaktif'}</Badge><span className="text-xs text-gray-500">{user.permissions?.length?`${user.permissions.length} izin khusus`:'Izin sesuai role'}</span></div></Card>)}</div>}
 </div>{editing&&<EmployeeForm data={editing} branches={db.branches} onClose={()=>setEditing(null)} onResetPassword={resetEmployeePassword} onSave={async data=>{try{await saveEmployee(data);setEditing(null)}catch(e){alert(e.message)}}}/>}</div>;
}
function EmployeeForm({data,branches,onClose,onSave,onResetPassword}){
 const[form,setForm]=useState(data);
 const togglePermission=permission=>setForm(previous=>({...previous,permissions:(previous.permissions||[]).includes(permission)?previous.permissions.filter(item=>item!==permission):[...(previous.permissions||[]),permission]}));
 const rolePermissions=form.role==='owner'?[]:(ROLE_PERMISSIONS[form.role]||[]).filter(permission=>permission!=='*');
 const validNew=form.id||(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email||'')&&(form.temporaryPassword||'').length>=6);
 return <Modal title={form.id?'Edit Karyawan':'Karyawan Baru'} onClose={onClose} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={()=>onSave(form)} disabled={!form.name||!validNew}>Simpan</Button></>}>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
   <Field label="Nama"><Input value={form.name} onChange={event=>setForm({...form,name:event.target.value})}/></Field>
   <Field label="Email Firebase"><Input type="email" disabled={Boolean(form.id)} value={form.email||''} onChange={event=>setForm({...form,email:event.target.value})}/></Field>
   {!form.id&&<Field label="Password Sementara (min. 6)"><Input type="password" value={form.temporaryPassword||''} onChange={event=>setForm({...form,temporaryPassword:event.target.value})}/></Field>}
   <Field label="Role"><Select value={form.role} onChange={event=>setForm({...form,role:event.target.value,permissions:[]})}><option value="owner">Owner</option><option value="manager">Store Manager</option><option value="kasir">Kasir</option></Select></Field>
   <Field label="Cabang"><Select value={form.branchId} onChange={event=>setForm({...form,branchId:event.target.value})}>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field>
   <label className="md:col-span-2 flex items-center gap-2 p-3 bg-gray-50 rounded-xl"><input type="checkbox" checked={form.active!==false} onChange={event=>setForm({...form,active:event.target.checked})}/><b className="text-sm">Akun aktif</b></label>
   {form.id&&form.email&&<div className="md:col-span-2"><Button variant="secondary" onClick={async()=>{try{await onResetPassword(form.email);alert('Email reset password sudah dikirim.')}catch(error){alert(error.message)}}}><Mail size={17}/> Kirim Reset Password</Button></div>}
   <div className="md:col-span-2">
    <p className="field-label">Hak Akses Khusus</p>
    {form.role==='owner'?<p className="text-xs text-gray-500 p-3 bg-emerald-50 rounded-xl">Owner selalu memiliki seluruh akses.</p>:<><p className="text-xs text-gray-500 mb-3">Kosongkan untuk memakai hak akses bawaan role. Daftar khusus hanya boleh mempersempit hak bawaan.</p><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{rolePermissions.map(permission=><label key={permission} className="flex gap-2 items-center p-3 rounded-xl bg-gray-50 text-xs"><input type="checkbox" checked={(form.permissions||[]).includes(permission)} onChange={()=>togglePermission(permission)}/>{permission}</label>)}</div></>}
   </div>
  </div>
 </Modal>;
}

export function BranchesScreen(){
 const {db,branchId,setActiveBranch,addBranch}=usePos();const[formOpen,setFormOpen]=useState(false);
 return <div className="h-full flex flex-col bg-gray-50 generic-bg"><PageHeader title="Cabang Toko" subtitle="Pemisahan stok, transaksi, pembelian, karyawan, dan laporan per cabang" actions={<Button onClick={()=>setFormOpen(true)}><Plus size={17}/> Cabang Baru</Button>}/><div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{db.branches.map(branch=><Card key={branch.id} className={`p-5 ${branch.id===branchId?'border-emerald-500 ring-1 ring-emerald-500':''}`}><div className="flex gap-3"><div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Store size={28}/></div><div className="min-w-0"><div className="flex gap-2 items-center"><p className="font-bold text-gray-800 truncate">{branch.name}</p>{branch.id===branchId&&<Badge tone="green">Aktif</Badge>}</div><p className="text-xs text-gray-500 flex gap-1 mt-1"><MapPin size={13}/>{branch.address||'-'}</p><p className="text-xs text-gray-500">ID: {branch.id}</p></div></div>{branch.id!==branchId&&<Button variant="secondary" className="w-full mt-4" onClick={()=>setActiveBranch(branch.id)}><CheckCircle2 size={17}/> Jadikan Cabang Aktif</Button>}</Card>)}</div></div>{formOpen&&<BranchForm onClose={()=>setFormOpen(false)} onSave={data=>{addBranch(data);setFormOpen(false)}}/>}</div>;
}
function BranchForm({onClose,onSave}){const[form,setForm]=useState({name:'',address:'',phone:''});return <Modal title="Cabang Baru" onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={()=>onSave(form)} disabled={!form.name}>Simpan</Button></>}><div className="space-y-3"><Field label="Nama Cabang"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Telepon"><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Alamat"><Textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field></div></Modal>}

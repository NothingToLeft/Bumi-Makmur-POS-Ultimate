import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Printer, Plus, Bluetooth, Usb, Wifi, FileText, MonitorSmartphone, Save, Upload, Download, RefreshCw, Database, WifiOff, Cloud, ScrollText, Trash2, Settings, QrCode, Camera, Fingerprint, ScanFace, ShieldCheck, ExternalLink, Image as ImageIcon, MessageCircle, WalletCards, Loader2, Maximize2, CircleCheck, AlertTriangle } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { APP_VERSION } from '../data/defaults.js';
import { formatRp, printHtmlDocument } from '../utils/helpers.js';
import { formatQuantity } from '../utils/fractionalUnits.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, MoneyInput, PageHeader, Select, StatusBadge, Textarea } from '../components/ui.jsx';
import { authenticateBiometric, checkCameraPermission, getBiometricAvailability, openNativeAppSettings, requestCameraPermission } from '../services/nativeDevice.js';
import { uploadStoreAsset } from '../services/cloudStore.js';
import { formatAssetBytes } from '../utils/assetProcessing.js';
import { EmployeeManagementPanel } from './AdminScreens.jsx';
import { DEFAULT_LOGIN_APPEARANCE, normalizeLoginAppearance, renderLoginTemplate } from '../utils/loginAppearance.js';

export function DevicesScreen(){
 const {db,branch,hasPermission,savePrinterProfile}=usePos();const[editing,setEditing]=useState(null);const canManage=hasPermission('devices.manage');const typeIcon={bluetooth:Bluetooth,usb:Usb,lan:Wifi,browser:FileText,pdf:FileText};
 const test=profile=>{alert(`Test print untuk ${profile.name}. Pada versi web digunakan dialog cetak browser; koneksi ${profile.type.toUpperCase()} native diaktifkan melalui adapter Capacitor.`);printHtmlDocument('Test Printer',`<div class="center"><h2>${branch?.name||db.configs.companyName||'BUMI MAKMUR'}</h2><p class="bold">TEST PRINT BERHASIL</p><p>${profile.name}</p><p>${profile.type.toUpperCase()} · ${profile.paperWidth} mm · ${profile.encoding}</p></div><div class="line"></div><p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p><p>1234567890</p><p>Rp 1.234.567</p>`,`${profile.paperWidth}mm`);};
 return <div className="h-full flex flex-col bg-gray-50 generic-bg"><PageHeader title="Printer & Perangkat" subtitle="Profil ESC/POS Bluetooth, USB, LAN, lebar 58/80 mm, auto-cut, laci kas, dan PDF" actions={canManage&&<Button onClick={()=>setEditing({name:'Printer Baru',type:'bluetooth',paperWidth:80,address:'',encoding:'CP437',autoCut:true,cashDrawer:false,active:false})}><Plus size={17}/> Profil Printer</Button>}/><div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6"><div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-sm text-orange-800 mb-4"><b>Catatan kompatibilitas:</b> setiap merek printer dapat memakai profil perintah yang berbeda. Proyek menyediakan lapisan profil dan test print; integrasi native penuh dilakukan melalui adapter Capacitor setelah model printer dipastikan.</div>{db.printerProfiles.length===0?<EmptyState icon={Printer}/>:<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{db.printerProfiles.map(profile=>{const Icon=typeIcon[profile.type]||Printer;return <Card key={profile.id} className={`p-4 ${profile.active?'border-emerald-500':''}`}><div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Icon/></div><div><div className="flex gap-2"><p className="font-bold">{profile.name}</p>{profile.active&&<Badge tone="green">Aktif</Badge>}</div><p className="text-xs text-gray-500">{profile.type.toUpperCase()} · {profile.paperWidth} mm · {profile.encoding}</p><p className="text-xs text-gray-500">{profile.address||'Alamat belum diatur'}</p></div></div><div className="grid grid-cols-2 gap-2 mt-4">{canManage&&<Button variant="secondary" onClick={()=>setEditing(profile)}>Edit</Button>}<Button onClick={()=>test(profile)} className={canManage?'':'col-span-2'}>Test Print</Button></div></Card>})}</div>}</div>{editing&&canManage&&<PrinterForm data={editing} onClose={()=>setEditing(null)} onSave={data=>{savePrinterProfile(data);setEditing(null)}}/>}</div>;
}
function PrinterForm({data,onClose,onSave}){const[form,setForm]=useState(data);return <Modal title={form.id?'Edit Profil Printer':'Profil Printer Baru'} onClose={onClose} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={()=>onSave(form)} disabled={!form.name}>Simpan</Button></>}><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Nama Profil"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Jenis Koneksi"><Select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="bluetooth">Bluetooth ESC/POS</option><option value="usb">USB ESC/POS</option><option value="lan">LAN/Wi-Fi</option><option value="browser">Browser Print</option><option value="pdf">PDF</option></Select></Field><Field label="Lebar Kertas"><Select value={form.paperWidth} onChange={e=>setForm({...form,paperWidth:Number(e.target.value)})}><option value="58">58 mm</option><option value="80">80 mm</option></Select></Field><Field label="Encoding"><Select value={form.encoding} onChange={e=>setForm({...form,encoding:e.target.value})}><option>CP437</option><option>CP850</option><option>Windows-1252</option><option>UTF-8</option></Select></Field><Field label="Alamat / MAC / IP" className="md:col-span-2"><Input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Contoh: 00:11:22:33:44:55 atau 192.168.1.50"/></Field><label className="flex gap-2 items-center p-3 bg-gray-50 rounded-xl"><input type="checkbox" checked={form.autoCut} onChange={e=>setForm({...form,autoCut:e.target.checked})}/> Auto-cut</label><label className="flex gap-2 items-center p-3 bg-gray-50 rounded-xl"><input type="checkbox" checked={form.cashDrawer} onChange={e=>setForm({...form,cashDrawer:e.target.checked})}/> Buka laci kas</label><label className="md:col-span-2 flex gap-2 items-center p-3 bg-emerald-50 rounded-xl"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Jadikan profil aktif</label></div></Modal>}

export function CustomerDisplayScreen(){
 const {customerDisplay,db,branchId,hasPermission,saveCampaign,saveFeedback}=usePos();
 const[editing,setEditing]=useState(null);const[displayNotice,setDisplayNotice]=useState('');
 const canManage=hasPermission('display.manage');const activeCampaign=db.campaigns.find(c=>c.active);const activeBranch=db.branches.find(item=>item.id===branchId);
 const openSecondDisplay=async()=>{try{if(window.bmDesktop?.openCustomerDisplay){const result=await window.bmDesktop.openCustomerDisplay();setDisplayNotice(result.externalMonitor?'Layar pelanggan dibuka pada monitor kedua.':'Layar pelanggan dibuka. Pindahkan jendela ke monitor kedua bila diperlukan.');return}const url=new URL(window.location.href);url.search='';url.searchParams.set('desktopDisplay','1');window.open(url.toString(),'bm-customer-display','popup=yes,width=1100,height=760');setDisplayNotice('Jendela layar pelanggan dibuka. Izinkan popup bila browser memblokirnya.')}catch(error){setDisplayNotice(error.message||'Layar pelanggan gagal dibuka.')}};
 const actions=<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={openSecondDisplay}><Maximize2 size={17}/> Buka Layar 2</Button>{canManage&&<Button onClick={()=>setEditing({title:'Pesan Baru',message:'',active:true})}><Plus size={17}/> Pesan Layar</Button>}</div>;
 return <div className="h-full flex flex-col bg-gray-50 generic-bg"><PageHeader title="Layar Pelanggan" subtitle="Preview keranjang, monitor kedua, pesan sambutan, konfirmasi total, dan feedback" actions={actions}/><div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">{displayNotice&&<div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-800">{displayNotice}</div>}<div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><Card className="p-6 bg-gradient-to-br from-emerald-950 to-emerald-700 text-white min-h-[480px] flex flex-col"><div className="flex justify-between"><div><p className="text-emerald-200 text-sm">{db.configs.companyName||'BUMI MAKMUR'}</p><h2 className="text-2xl font-black">{activeBranch?.name||db.configs.companyName||'BUMI MAKMUR'}</h2><p className="text-xs text-emerald-200 mt-1">Layar Pelanggan</p></div><MonitorSmartphone size={34}/></div><div className="flex-1 mt-6 bg-white/10 rounded-2xl p-4 overflow-y-auto">{customerDisplay.cart.length===0?<div className="h-full flex flex-col items-center justify-center text-emerald-100"><QrCode size={64} className="mb-3 opacity-70"/><p className="font-bold">Selamat Datang</p><p className="text-sm text-center mt-1">{activeCampaign?.message||'Silakan mulai transaksi di kasir.'}</p></div>:<div className="space-y-2">{customerDisplay.cart.map(line=><div key={line.lineId} className="flex justify-between border-b border-white/20 pb-2"><div><p className="font-bold text-sm">{line.name}</p><p className="text-xs text-emerald-100">{formatQuantity(line.qty)} {line.unit}</p></div><b>{formatRp(line.price*line.qty-line.itemDiscount)}</b></div>)}</div>}</div><div className="mt-4 flex justify-between items-end"><div><p className="text-sm text-emerald-200">Pelanggan</p><p className="font-bold">{customerDisplay.customerName}</p></div><div className="text-right"><p className="text-sm text-emerald-200">Total</p><p className="text-3xl font-black text-orange-300">{formatRp(customerDisplay.total)}</p></div></div></Card><div className="space-y-4"><Card className="p-4"><p className="font-bold mb-3">Pesan Layar Aktif</p>{db.campaigns.map(c=><div key={c.id} className="p-3 border rounded-xl mb-2 flex justify-between gap-3"><div><p className="font-bold text-sm">{c.title}</p><p className="text-xs text-gray-500">{c.message}</p></div><Badge tone={c.active?'green':'gray'}>{c.active?'Aktif':'Nonaktif'}</Badge></div>)}</Card><FeedbackForm onSave={saveFeedback}/></div></div></div>{editing&&canManage&&<CampaignForm data={editing} onClose={()=>setEditing(null)} onSave={data=>{saveCampaign(data);setEditing(null)}}/>}</div>;
}
function CampaignForm({data,onClose,onSave}){const[form,setForm]=useState(data);return <Modal title="Pesan Layar Pelanggan" onClose={onClose} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={()=>onSave(form)}>Simpan</Button></>}><Field label="Judul"><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label="Pesan"><Textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></Field><label className="flex gap-2 mt-3"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Aktif</label></Modal>}
function FeedbackForm({onSave}){const[rating,setRating]=useState(5);const[comment,setComment]=useState('');return <Card className="p-4"><p className="font-bold mb-3">Form Feedback Pelanggan</p><Select value={rating} onChange={e=>setRating(Number(e.target.value))}><option value="5">5 - Sangat Puas</option><option value="4">4 - Puas</option><option value="3">3 - Cukup</option><option value="2">2 - Kurang</option><option value="1">1 - Buruk</option></Select><Textarea className="mt-2" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Komentar"/><Button className="w-full mt-2" onClick={()=>{onSave({rating,comment,customerName:'Anonim'});setComment('')}}>Kirim Feedback</Button></Card>}

export function SettingsScreen(){
 const {db,branch,online,localReady,cloudReady,cloudSaving,cloudError,pendingSyncCount,syncConflictCount,lastSyncAttemptAt,currentUser,branchId,deviceSettings,updateDeviceSettings,setConfig,saveStoreIdentity,saveLoginAppearance,updateBranch,saveBranchPaymentProfile,exportBackup,importBackup,syncNow,resetDemo,signOutAccount,hasPermission}=usePos();
 const fileRef=useRef(null);const isOwner=currentUser?.role==='owner';const canManageEmployees=hasPermission('employees.manage');const canManagePayments=isOwner||hasPermission('payments.manage');
 const tabs=[...(isOwner?[['business','Toko']]:[]),...(canManagePayments?[['payment','Pembayaran']]:[]),['security','Keamanan'],...(canManageEmployees?[['employees','Karyawan']]:[]),['system','Cloud & Backup'],['audit','Audit Cloud'],['changelog','Changelog']];
 const[tab,setTab]=useState(isOwner?'business':canManageEmployees?'employees':'security');
 useEffect(()=>{if(!tabs.some(([id])=>id===tab))setTab(tabs[0]?.[0]||'security')},[isOwner,canManageEmployees,tab]);
 const config=db.configs; const patch=(key,value)=>{if(!isOwner){alert('Pengaturan toko global hanya dapat diubah oleh Owner.');return}setConfig({[key]:value})};
 const addPayment=()=>{if(!isOwner)return;const name=prompt('Nama metode pembayaran baru');if(name)patch('paymentMethods',[...config.paymentMethods,{id:`custom-${Date.now()}`,name,type:'other',active:true}])};
 return <div className="h-full flex flex-col bg-gray-50 generic-bg"><PageHeader title="Pengaturan Sistem" subtitle={`${branch?.name||config.companyName||'BUMI MAKMUR'} · ${config.companyName&&branch?.name!==config.companyName?`${config.companyName} · `:''}POS Desktop/Web/Android v${APP_VERSION} · Firebase Spark FreeSync`}/><div className="bg-white border-b px-4 md:px-6 flex overflow-x-auto no-scrollbar card-element">{tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`px-4 min-h-[52px] font-bold text-sm border-b-2 whitespace-nowrap ${tab===id?'border-emerald-600 text-emerald-700':'border-transparent text-gray-500'}`}>{label}</button>)}</div><div className="p-4 md:p-6 flex-1 overflow-y-auto pb-24 md:pb-6">{tab==='business'&&isOwner&&<BusinessSettings config={config} branch={branch} patch={patch} saveStoreIdentity={saveStoreIdentity} saveLoginAppearance={saveLoginAppearance} updateBranch={updateBranch}/>} {tab==='payment'&&canManagePayments&&<PaymentSettings db={db} config={config} patch={patch} addPayment={addPayment} currentUser={currentUser} branchId={branchId} saveBranchPaymentProfile={saveBranchPaymentProfile}/>} {tab==='security'&&<SecuritySettings config={config} patch={patch} currentUser={currentUser} deviceSettings={deviceSettings} updateDeviceSettings={updateDeviceSettings}/>} {tab==='employees'&&canManageEmployees&&<EmployeeManagementPanel/>} {tab==='system'&&<SystemSettings currentUser={currentUser} db={db} online={online} localReady={localReady} cloudReady={cloudReady} cloudSaving={cloudSaving} cloudError={cloudError} pendingSyncCount={pendingSyncCount} syncConflictCount={syncConflictCount} lastSyncAttemptAt={lastSyncAttemptAt} exportBackup={exportBackup} importBackup={importBackup} fileRef={fileRef} syncNow={syncNow} resetDemo={resetDemo} signOutAccount={signOutAccount}/>} {tab==='audit'&&<AuditSettings db={db} online={online} localReady={localReady} cloudReady={cloudReady} pendingSyncCount={pendingSyncCount} syncConflictCount={syncConflictCount} syncNow={syncNow}/>} {tab==='changelog'&&<ReleaseNotesSettings/>}</div></div>;
}


function LoginAppearanceSettings({config,branch,saveLoginAppearance}){
 const normalized=normalizeLoginAppearance(config.loginAppearance);
 const[form,setForm]=useState(normalized);
 const[state,setState]=useState({saving:false,message:'',tone:'success'});
 useEffect(()=>setForm(normalizeLoginAppearance(config.loginAppearance)),[config.loginAppearance]);
 const saved=normalizeLoginAppearance(config.loginAppearance);
 const dirty=JSON.stringify(form)!==JSON.stringify(saved);
 const setField=(key,value)=>{setForm(previous=>({...previous,[key]:value}));setState({saving:false,message:'',tone:'success'})};
 const save=async()=>{setState({saving:true,message:'',tone:'success'});try{await saveLoginAppearance(form);setState({saving:false,message:'Tampilan login tersimpan dan dipublikasikan ke Web, PC, HP, serta tablet.',tone:'success'});}catch(error){setState({saving:false,message:error.message||'Tampilan login gagal disimpan.',tone:'error'})}};
 const reset=()=>{setForm({...DEFAULT_LOGIN_APPEARANCE});setState({saving:false,message:'Nilai standar dimuat. Klik Simpan Tampilan Login untuk menerapkannya.',tone:'success'})};
 const branchName=branch?.name||'Pilih cabang';
 const header=form.headerText||config.companyName||'BUMI MAKMUR';
 const subheader=renderLoginTemplate(form.subheaderTemplate,{branch:branchName,version:APP_VERSION,business:config.companyName||'BUMI MAKMUR'});
 return <Card className="p-5 border-blue-200">
  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-5"><div><div className="flex items-center gap-2"><MonitorSmartphone size={21} className="text-blue-700"/><p className="font-black text-lg text-gray-900">Tampilan Halaman Login</p></div><p className="text-xs text-gray-500 mt-1 max-w-2xl">Bagian khusus untuk mengatur tulisan di luar aplikasi: header, teks di bawah header, pilihan akun, status internet, dan footer login.</p></div><Badge tone={dirty?'orange':'green'}>{dirty?'Belum disimpan':'Tersimpan'}</Badge></div>
  <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_.75fr] gap-5">
   <div className="space-y-4">
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
     <p className="font-black text-sm text-gray-900 mb-3">Bagian Header</p>
     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Judul Besar Login" hint="Kosongkan agar otomatis mengikuti Nama Brand / Grup Usaha."><Input value={form.headerText} onChange={e=>setField('headerText',e.target.value)} placeholder={config.companyName||'BUMI MAKMUR'} maxLength={80}/></Field>
      <Field label="Teks di Bawah Header" hint="Bisa memakai {branch}, {business}, dan {version}."><Input value={form.subheaderTemplate} onChange={e=>setField('subheaderTemplate',e.target.value)} maxLength={140}/></Field>
     </div>
    </div>
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
     <p className="font-black text-sm text-gray-900 mb-3">Pilihan Akun</p>
     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Judul Pilihan"><Input value={form.chooserTitle} onChange={e=>setField('chooserTitle',e.target.value)} maxLength={60}/></Field>
      <Field label="Keterangan Pilihan"><Input value={form.chooserSubtitle} onChange={e=>setField('chooserSubtitle',e.target.value)} maxLength={160}/></Field>
      <Field label="Judul Owner"><Input value={form.ownerTitle} onChange={e=>setField('ownerTitle',e.target.value)} maxLength={60}/></Field>
      <Field label="Keterangan Owner"><Textarea value={form.ownerSubtitle} onChange={e=>setField('ownerSubtitle',e.target.value)} maxLength={180}/></Field>
      <Field label="Judul Karyawan"><Input value={form.employeeTitle} onChange={e=>setField('employeeTitle',e.target.value)} maxLength={60}/></Field>
      <Field label="Keterangan Karyawan"><Textarea value={form.employeeSubtitle} onChange={e=>setField('employeeSubtitle',e.target.value)} maxLength={180}/></Field>
     </div>
    </div>
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
     <p className="font-black text-sm text-gray-900 mb-3">Status Koneksi & Footer</p>
     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Judul Saat Online"><Input value={form.onlineTitle} onChange={e=>setField('onlineTitle',e.target.value)} maxLength={60}/></Field>
      <Field label="Keterangan Saat Online"><Textarea value={form.onlineSubtitle} onChange={e=>setField('onlineSubtitle',e.target.value)} maxLength={180}/></Field>
      <Field label="Judul Saat Offline"><Input value={form.offlineTitle} onChange={e=>setField('offlineTitle',e.target.value)} maxLength={60}/></Field>
      <Field label="Keterangan Saat Offline"><Textarea value={form.offlineSubtitle} onChange={e=>setField('offlineSubtitle',e.target.value)} maxLength={180}/></Field>
      <Field label="Tulisan Tebal Footer"><Input value={form.footerLead} onChange={e=>setField('footerLead',e.target.value)} maxLength={80}/></Field>
      <Field label="Keterangan Footer"><Textarea value={form.footerText} onChange={e=>setField('footerText',e.target.value)} maxLength={220}/></Field>
     </div>
    </div>
   </div>
   <div>
    <p className="font-black text-sm text-gray-900 mb-3">Preview Langsung</p>
    <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-4 shadow-inner sticky top-4">
     <div className="bg-white rounded-[1.35rem] overflow-hidden shadow-xl">
      <div className="p-4">
       <div className="flex items-center gap-3"><img src={config.receiptLogo||'/logo-bm.svg'} alt="Preview logo" className="w-12 h-12 rounded-xl border object-contain"/><div className="min-w-0"><p className="font-black text-base text-gray-900 truncate">{header}</p><p className="text-[10px] text-gray-500 leading-relaxed">{subheader}</p></div></div>
       <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100"><p className="font-bold text-[11px] text-emerald-900">{form.onlineTitle}</p><p className="text-[9px] text-emerald-800 mt-0.5">{form.onlineSubtitle}</p></div>
       <div className="text-center my-3"><p className="font-black text-sm">{form.chooserTitle}</p><p className="text-[10px] text-gray-500">{form.chooserSubtitle}</p></div>
       <div className="space-y-2"><div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50"><p className="font-black text-xs text-emerald-900">{form.ownerTitle}</p><p className="text-[9px] text-emerald-800 mt-0.5">{form.ownerSubtitle}</p></div><div className="p-3 rounded-xl border border-blue-200 bg-blue-50"><p className="font-black text-xs text-blue-900">{form.employeeTitle}</p><p className="text-[9px] text-blue-800 mt-0.5">{form.employeeSubtitle}</p></div></div>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t text-[9px] text-slate-600"><b className="text-slate-800">{form.footerLead}</b>{form.footerText?` ${form.footerText}`:''}</div>
     </div>
    </div>
   </div>
  </div>
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5"><Button onClick={save} disabled={!dirty||state.saving}><Save size={17}/>{state.saving?'Menyimpan...':'Simpan Tampilan Login'}</Button><Button variant="secondary" onClick={reset} disabled={state.saving}>Kembalikan Teks Standar</Button>{state.message&&<p className={`text-xs font-bold ${state.tone==='error'?'text-red-600':'text-emerald-700'}`}>{state.message}</p>}</div>
 </Card>;
}

function SecuritySettings({config,patch,currentUser,deviceSettings,updateDeviceSettings}){
 const[camera,setCamera]=useState({state:'checking',granted:false});const[biometric,setBiometric]=useState({status:'checking',available:false});const[busy,setBusy]=useState('');
 const refresh=async()=>{const[cameraResult,biometricResult]=await Promise.all([checkCameraPermission(),getBiometricAvailability()]);setCamera(cameraResult);setBiometric(biometricResult)};
 useEffect(()=>{void refresh()},[]);
 const askCamera=async()=>{setBusy('camera');const result=await requestCameraPermission();setCamera(result);setBusy('')};
 const enableBiometric=async()=>{setBusy('biometric');try{const availability=await getBiometricAvailability();setBiometric(availability);if(!availability.available){alert(availability.message||'Biometrik belum tersedia atau belum didaftarkan pada perangkat.');return}const result=await authenticateBiometric({title:'Aktifkan Login Biometrik',subtitle:`Hubungkan sidik jari/wajah dengan akun ${currentUser.name}.`});if(!result?.success){if(!result?.cancelled)alert(result?.error||'Verifikasi biometrik gagal.');return}updateDeviceSettings({biometricEnabled:true,biometricUserId:currentUser.id,biometricRole:currentUser.role==='owner'?'owner':'employee',biometricAutoPrompt:false});alert('Login sidik jari/wajah berhasil diaktifkan untuk perangkat ini.')}finally{setBusy('')}};
 const disableBiometric=()=>updateDeviceSettings({biometricEnabled:false,biometricUserId:'',biometricRole:'',biometricAutoPrompt:false});
 const cameraLabel=camera.granted?'Diizinkan':camera.state==='denied'?'Ditolak':camera.state==='prompt'||camera.state==='prompt-with-rationale'?'Belum diminta':'Tidak diketahui';
 return <div className="max-w-3xl space-y-4"><Card className="p-4"><div className="flex gap-3 items-start"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${camera.granted?'bg-emerald-100 text-emerald-700':'bg-orange-100 text-orange-700'}`}><Camera/></div><div className="flex-1"><div className="flex flex-wrap gap-2 items-center"><p className="font-bold">Izin Kamera</p><Badge tone={camera.granted?'green':camera.state==='denied'?'red':'orange'}>{cameraLabel}</Badge></div><p className="text-sm text-gray-500 mt-1">Izin diminta saat APK pertama dibuka agar tombol Scan langsung menyalakan kamera belakang.</p></div></div><Toggle label="Minta izin kamera saat aplikasi dibuka" checked={config.cameraPermissionOnStartup!==false} onChange={v=>patch('cameraPermissionOnStartup',v)} description="Berlaku pada APK Android. Browser web tetap mengikuti aturan browser."/><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4"><Button onClick={askCamera} disabled={busy==='camera'}><Camera size={17}/>{busy==='camera'?'Meminta Izin...':'Minta Izin Kamera'}</Button><Button variant="secondary" onClick={()=>void openNativeAppSettings()}><ExternalLink size={17}/>Pengaturan Android</Button></div></Card><Card className="p-4"><div className="flex gap-3 items-start"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${biometric.available?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}><Fingerprint/></div><div className="flex-1"><div className="flex flex-wrap gap-2 items-center"><p className="font-bold">Sidik Jari / Pengenalan Wajah</p><Badge tone={biometric.available?'green':'gray'}>{biometric.available?'Tersedia':'Belum tersedia'}</Badge></div><p className="text-sm text-gray-500 mt-1">Menggunakan dialog biometrik resmi Android. Data sidik jari dan wajah tidak pernah dibaca atau disimpan aplikasi.</p></div></div>{deviceSettings.biometricEnabled?<div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl"><div className="flex gap-2 items-center text-emerald-800"><ShieldCheck size={19}/><b>Aktif untuk {currentUser.id===deviceSettings.biometricUserId?currentUser.name:'akun yang terhubung'}</b></div><p className="text-xs text-emerald-700 mt-2">Biometrik hanya muncul setelah tombol “Masuk dengan Sidik Jari / Face ID” ditekan. Aplikasi tidak akan membuka dialog biometrik secara tiba-tiba.</p><Button variant="danger" onClick={disableBiometric} className="w-full mt-3">Nonaktifkan Biometrik</Button></div>:<div className="mt-4"><Button onClick={enableBiometric} disabled={busy==='biometric'||!biometric.available} className="w-full"><Fingerprint size={18}/><ScanFace size={18}/>{busy==='biometric'?'Menunggu Verifikasi...':'Aktifkan untuk Akun Ini'}</Button><p className="text-xs text-gray-500 mt-2">Aktifkan setelah sidik jari atau pengenalan wajah sudah didaftarkan di pengaturan keamanan Android.</p></div>}</Card></div>
}

function Toggle({label,checked,onChange,description}){return <label className="flex items-center justify-between gap-3 p-4 border-b last:border-0 cursor-pointer"><div><p className="font-bold text-sm text-gray-800">{label}</p>{description&&<p className="text-xs text-gray-500">{description}</p>}</div><input type="checkbox" className="w-5 h-5" checked={checked} onChange={e=>onChange(e.target.checked)}/></label>}
function BusinessSettings({config,branch,patch,saveStoreIdentity,saveLoginAppearance,updateBranch}){
  const logoRef=useRef(null);
  const [branchIdentity,setBranchIdentity]=useState({id:branch?.id||'',name:branch?.name||'',address:branch?.address||'',phone:branch?.phone||''});
  const [brandName,setBrandName]=useState(config.companyName||'');
  const [identityState,setIdentityState]=useState({saving:false,message:'',tone:'success'});
  const [brandState,setBrandState]=useState({saving:false,message:'',tone:'success'});
  useEffect(()=>setBranchIdentity({id:branch?.id||'',name:branch?.name||'',address:branch?.address||'',phone:branch?.phone||''}),[branch?.id,branch?.name,branch?.address,branch?.phone]);
  useEffect(()=>setBrandName(config.companyName||''),[config.companyName]);
  const branchDirty=Boolean(branch?.id)&&(branchIdentity.name!==String(branch?.name||'')||branchIdentity.address!==String(branch?.address||'')||branchIdentity.phone!==String(branch?.phone||''));
  const brandDirty=brandName!==String(config.companyName||'');
  const saveBranchIdentity=async()=>{setIdentityState({saving:true,message:'',tone:'success'});try{await updateBranch(branchIdentity);setIdentityState({saving:false,message:'Identitas cabang aktif tersimpan. Nama ini sekarang dipakai setelah login, pada sidebar, nota, dan layar pelanggan.',tone:'success'});}catch(error){setIdentityState({saving:false,message:error.message||'Identitas cabang gagal disimpan.',tone:'error'});}};
  const saveBrand=async()=>{setBrandState({saving:true,message:'',tone:'success'});try{await saveStoreIdentity({companyName:brandName,address:config.address||'',phone:config.phone||''});setBrandState({saving:false,message:'Nama brand/grup usaha tersimpan.',tone:'success'});}catch(error){setBrandState({saving:false,message:error.message||'Nama brand gagal disimpan.',tone:'error'});}};
  const uploadLogo=async file=>{try{if(!file)return;const result=await uploadStoreAsset(file,'logo');patch('receiptLogo',result.dataUrl);}catch(error){alert(error.message)}};
  const displayName=branch?.name||config.companyName||'BUMI MAKMUR';
  const displayAddress=branch?.address||config.address||'';
  const displayPhone=branch?.phone||config.phone||'';
  return <div className="max-w-4xl space-y-4">
    <Card className="p-5 premium-settings-hero"><div className="flex flex-col md:flex-row gap-5 items-start"><div className="w-24 h-24 rounded-3xl bg-white shadow-lg border flex items-center justify-center overflow-hidden shrink-0"><img src={config.receiptLogo || '/logo-bm.svg'} alt="Logo BM" className="w-full h-full object-contain"/></div><div className="flex-1"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Identitas Cabang Aktif</p><h3 className="text-2xl font-black text-gray-900 mt-1">{displayName}</h3><p className="text-sm text-gray-600 mt-1">{displayAddress||'Alamat cabang belum diisi'}{displayPhone?` · ${displayPhone}`:''}</p><p className="text-xs text-gray-500 mt-2">Brand/grup usaha: {config.companyName||'BUMI MAKMUR'}</p><div className="flex flex-wrap gap-2 mt-4"><input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event=>uploadLogo(event.target.files?.[0])}/><Button onClick={()=>logoRef.current?.click()}><Upload size={17}/> Unggah Logo</Button>{config.receiptLogo && config.receiptLogo !== '/logo-bm.svg' && <Button variant="danger" onClick={()=>patch('receiptLogo','/logo-bm.svg')}><Trash2 size={17}/> Pakai Logo BM</Button>}</div></div></div></Card>

    <Card className="p-5 border-emerald-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4"><div><p className="font-black text-lg text-gray-900">Identitas Cabang Aktif</p><p className="text-xs text-gray-500 mt-1">Sesuai cabang yang dipilih saat login atau pada pemilih cabang di bagian atas aplikasi.</p></div><Badge tone={branchDirty?'orange':'green'}>{branchDirty?'Belum disimpan':'Tersimpan'}</Badge></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Nama Cabang / Nama Toko"><Input value={branchIdentity.name} onChange={e=>setBranchIdentity(previous=>({...previous,name:e.target.value}))} placeholder="Contoh: Bumi Makmur Utama" maxLength={80}/></Field><Field label="Telepon Cabang"><Input value={branchIdentity.phone} onChange={e=>setBranchIdentity(previous=>({...previous,phone:e.target.value}))}/></Field><Field label="Alamat Cabang" className="md:col-span-2"><Textarea value={branchIdentity.address} onChange={e=>setBranchIdentity(previous=>({...previous,address:e.target.value}))}/></Field></div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4"><Button onClick={saveBranchIdentity} disabled={!branchDirty||identityState.saving}><Save size={17}/>{identityState.saving?'Menyimpan...':'Simpan Identitas Cabang'}</Button>{identityState.message&&<p className={`text-xs font-bold ${identityState.tone==='error'?'text-red-600':'text-emerald-700'}`}>{identityState.message}</p>}</div>
    </Card>

    <Card className="p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4"><div><p className="font-black text-lg text-gray-900">Nama Brand / Grup Usaha</p><p className="text-xs text-gray-500 mt-1">Identitas global untuk direktori login. Tampilan operasional setelah login tetap mengikuti cabang aktif.</p></div><Badge tone={brandDirty?'orange':'green'}>{brandDirty?'Belum disimpan':'Tersimpan'}</Badge></div>
      <Field label="Nama Brand / Usaha"><Input value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="Contoh: Bumi Makmur" maxLength={80}/></Field>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4"><Button variant="secondary" onClick={saveBrand} disabled={!brandDirty||brandState.saving}><Save size={17}/>{brandState.saving?'Menyimpan...':'Simpan Nama Brand'}</Button>{brandState.message&&<p className={`text-xs font-bold ${brandState.tone==='error'?'text-red-600':'text-emerald-700'}`}>{brandState.message}</p>}</div>
    </Card>

    <LoginAppearanceSettings config={config} branch={branch} saveLoginAppearance={saveLoginAppearance}/>

    <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Judul Nota"><Input value={config.receiptHeader || ''} onChange={e=>patch('receiptHeader',e.target.value)} placeholder="NOTA PEMBELIAN"/></Field>
      <Field label="Footer Singkat"><Input value={config.receiptFooter || ''} onChange={e=>patch('receiptFooter',e.target.value)} placeholder="Terima kasih telah berbelanja"/></Field>
      <Field label="Pesan Khusus Toko" className="md:col-span-2"><Textarea value={config.receiptMessage || ''} onChange={e=>patch('receiptMessage',e.target.value)} placeholder="Kebijakan retur, garansi, atau pesan khusus..."/></Field>
      <Field label="Pesan Tambahan WhatsApp" className="md:col-span-2"><Textarea value={config.receiptWhatsappNote || ''} onChange={e=>patch('receiptWhatsappNote',e.target.value)} placeholder="Pesan yang ikut dikirim bersama nota digital..."/></Field>
      <Field label="Kode Negara WhatsApp"><Input value={config.whatsappCountryCode || '62'} onChange={e=>patch('whatsappCountryCode',e.target.value.replace(/\D/g,''))} inputMode="numeric"/></Field>
      <Field label="Lebar Nota"><Select value={config.receiptPaperWidth || 80} onChange={e=>patch('receiptPaperWidth',Number(e.target.value))}><option value="58">58 mm</option><option value="80">80 mm</option></Select></Field>
    </Card>

    <Card>
      <Toggle label="Tampilkan logo pada nota" checked={config.receiptShowLogo!==false} onChange={v=>patch('receiptShowLogo',v)}/>
      <Toggle label="Tampilkan pelanggan" checked={config.receiptShowCustomer!==false} onChange={v=>patch('receiptShowCustomer',v)}/>
      <Toggle label="Tampilkan nama kasir" checked={config.receiptShowCashier!==false} onChange={v=>patch('receiptShowCashier',v)}/>
      <Toggle label="Tampilkan rincian pembayaran" checked={config.receiptShowPayment!==false} onChange={v=>patch('receiptShowPayment',v)}/>
      <Toggle label="Aktifkan kirim nota via WhatsApp" checked={config.whatsappReceiptEnabled!==false} onChange={v=>patch('whatsappReceiptEnabled',v)} description="Tombol WhatsApp muncul setelah transaksi selesai."/>
      <Toggle label="Tema Gelap" checked={config.darkMode} onChange={v=>patch('darkMode',v)}/>
      <Toggle label="Cetak Struk Otomatis" checked={config.printAuto} onChange={v=>patch('printAuto',v)}/>
      <Toggle label="Loyalty / Poin" checked={config.loyaltyEnabled} onChange={v=>patch('loyaltyEnabled',v)}/>
      <Toggle label="Wajib Shift untuk Tunai" checked={config.requireShiftForCash} onChange={v=>patch('requireShiftForCash',v)}/>
    </Card>
    <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Belanja per 1 poin"><MoneyInput value={config.pointRate} onValueChange={value=>patch('pointRate',value)}/></Field><Field label="Nilai 1 poin"><MoneyInput value={config.pointValue} onValueChange={value=>patch('pointValue',value)}/></Field><Field label="Batas approval refund"><MoneyInput value={config.refundApprovalLimit} onValueChange={value=>patch('refundApprovalLimit',value)}/></Field></Card>
    <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Target Restock" hint="Saran pesan di Pusat Kontrol = kelipatan stok minimum."><Select value={config.reorderMultiplier||2} onChange={event=>patch('reorderMultiplier',Number(event.target.value))}><option value="1.5">1,5× stok minimum</option><option value="2">2× stok minimum</option><option value="2.5">2,5× stok minimum</option><option value="3">3× stok minimum</option></Select></Field><Field label="Peringatan Shift Terbuka" hint="Shift lebih lama dari batas ini masuk Pusat Kontrol."><Select value={config.shiftWarningHours||14} onChange={event=>patch('shiftWarningHours',Number(event.target.value))}><option value="10">10 jam</option><option value="12">12 jam</option><option value="14">14 jam</option><option value="18">18 jam</option><option value="24">24 jam</option></Select></Field></Card>
    <ReceiptSettingsPreview config={config} branch={branch}/>
  </div>
}

function ReceiptSettingsPreview({config,branch}){
 const logo=config.receiptShowLogo===false?'':(config.receiptLogo||'/logo-bm.svg');
 const displayName=branch?.name||config.companyName||'BUMI MAKMUR';
 const displayAddress=branch?.address||config.address||'Alamat toko';
 const displayPhone=branch?.phone||config.phone||'-';
 return <Card className="p-5"><div className="mb-4"><p className="font-black text-lg">Preview Nota Langsung</p><p className="text-xs text-gray-500">Perubahan judul, logo, pesan, dan lebar kertas terlihat tanpa membuat transaksi baru.</p></div><div className="mx-auto max-w-sm bg-white border border-gray-200 rounded-[1.75rem] overflow-hidden shadow-xl premium-receipt"><div className="receipt-premium-header p-5 text-center border-b border-dashed">{logo&&<img src={logo} alt="BM" className="w-16 h-16 rounded-2xl mx-auto shadow-lg"/>}<p className="text-[9px] mt-3 uppercase tracking-[.2em] font-black text-emerald-700">{config.receiptHeader||'NOTA PEMBELIAN'}</p><h3 className="font-black text-xl mt-1 text-gray-900">{displayName}</h3><p className="text-[10px] text-gray-500">{displayAddress}</p>{config.receiptShowStorePhone!==false&&<p className="text-[10px] text-gray-500">Telp: {displayPhone}</p>}<span className="inline-flex mt-3 px-3 py-1 rounded-full bg-white border border-emerald-100 text-[9px] font-black text-emerald-800">INV-PREVIEW-0001</span></div><div className="p-4 text-xs"><div className="grid grid-cols-2 gap-2 mb-3">{config.receiptShowCustomer!==false&&<div className="p-2 rounded-xl bg-gray-50"><span className="text-gray-400 block text-[9px]">Pelanggan</span><b>Pak Budi</b></div>}{config.receiptShowCashier!==false&&<div className="p-2 rounded-xl bg-gray-50"><span className="text-gray-400 block text-[9px]">Kasir</span><b>Kasir Satu</b></div>}</div><div className="space-y-2"><div className="flex justify-between border-b border-dashed pb-2"><div><b>Kabel NYM 2×1,5</b><p className="text-[9px] text-gray-500">5 meter × Rp9.000</p></div><b>Rp45.000</b></div><div className="flex justify-between border-b border-dashed pb-2"><div><b>Lampu LED 10W</b><p className="text-[9px] text-gray-500">2 pcs × Rp35.000</p></div><b>Rp70.000</b></div></div><div className="mt-3 space-y-1"><div className="flex justify-between"><span>Subtotal</span><span>Rp115.000</span></div><div className="flex justify-between text-emerald-700"><span>Diskon</span><span>-Rp5.000</span></div><div className="premium-receipt-total rounded-xl p-3 mt-2 flex justify-between font-black text-base"><span>TOTAL</span><span>Rp110.000</span></div></div>{config.receiptShowPayment!==false&&<div className="border-t border-dashed mt-3 pt-2 flex justify-between"><span>QRIS</span><b>Rp110.000</b></div>}<div className="text-center border-t border-dashed mt-4 pt-3"><img src="/logo-bm.svg" alt="BM" className="w-6 h-6 rounded-lg mx-auto mb-1"/><b>{config.receiptFooter||'Terima kasih telah berbelanja.'}</b><p className="text-[9px] text-gray-500 mt-1 leading-relaxed">{config.receiptMessage||''}</p></div></div></div></Card>
}

function PaymentSettings({db,config,patch,addPayment,currentUser,branchId,saveBranchPaymentProfile}){
  const isOwner=currentUser?.role==='owner';
  const availableBranches=(db.branches||[]).filter(item=>item.active!==false);
  const [selectedBranchId,setSelectedBranchId]=useState(isOwner?branchId:(currentUser?.branchId||branchId));
  const [draft,setDraft]=useState(null);
  const [assetState,setAssetState]=useState({status:'idle',message:'',tone:'success'});
  const [saving,setSaving]=useState(false);
  const [previewOpen,setPreviewOpen]=useState(false);
  const qrisRef=useRef(null);
  const activeProfile=(db.branchPaymentProfiles||[]).find(item=>item.branchId===selectedBranchId);
  const selectedBranch=availableBranches.find(item=>item.id===selectedBranchId);

  useEffect(()=>{
    const source=activeProfile||{
      id:selectedBranchId,branchId:selectedBranchId,merchantName:config.qrisMerchantName||config.companyName||'BUMI MAKMUR',
      qrisImage:config.qrisImage||'',qrisInstruction:config.qrisInstruction||'Scan QR lalu tunjukkan bukti pembayaran kepada kasir.',
      qrisAssetMeta:null,enabled:true
    };
    setDraft({...source,id:selectedBranchId,branchId:selectedBranchId});
    setAssetState({status:'idle',message:'',tone:'success'});
  },[selectedBranchId,activeProfile?.updatedAt,activeProfile?.qrisImage,config.companyName]);

  useEffect(()=>{
    if(!availableBranches.some(item=>item.id===selectedBranchId))setSelectedBranchId(availableBranches[0]?.id||branchId);
  },[availableBranches,selectedBranchId,branchId]);

  const updateDraft=patchValue=>setDraft(previous=>({...previous,...patchValue}));
  const uploadQris=async file=>{
    if(!file)return;
    setAssetState({status:'processing',message:'Menganalisis ketajaman dan mengoptimalkan QRIS...',tone:'success'});
    try{
      const result=await uploadStoreAsset(file,'qris');
      updateDraft({qrisImage:result.dataUrl,qrisAssetMeta:result.meta});
      const pipelineLabel=result.meta.pipeline==='high-contrast-fallback'?'mode kontras aman':result.meta.cropped?'auto-crop + warna':'warna adaptif';
      const limitNote=result.meta.nearLimit?' Hasil mendekati batas aman, tetapi masih dapat disimpan.':'';
      setAssetState({status:'success',tone:'success',message:`QRIS siap disimpan: ${formatAssetBytes(result.meta.originalBytes)} → ${formatAssetBytes(result.meta.outputBytes)} (${result.meta.width}×${result.meta.height}px, ${pipelineLabel}).${limitNote}`});
    }catch(error){
      setAssetState({status:'error',tone:'error',message:error.message||'QRIS gagal diproses.'});
    }finally{
      if(qrisRef.current)qrisRef.current.value='';
    }
  };
  const saveProfile=async()=>{
    if(!draft)return;
    setSaving(true);
    setAssetState(previous=>({...previous,status:previous.status==='error'?'error':'processing',message:'Menyimpan profil pembayaran cabang ke cache dan Firebase...'}));
    try{
      await Promise.resolve(saveBranchPaymentProfile(draft));
      setAssetState({status:'success',tone:'success',message:`Profil QRIS ${selectedBranch?.name||selectedBranchId} berhasil disimpan.`});
    }catch(error){
      setAssetState({status:'error',tone:'error',message:error.message||'Profil QRIS gagal disimpan.'});
    }finally{setSaving(false)}
  };
  const brandClass={cash:'payment-cash',qris:'payment-qris',shopeepay:'payment-shopeepay',ovo:'payment-ovo',gopay:'payment-gopay',dana:'payment-dana',bank:'payment-bank',card:'payment-card',credit:'payment-credit',other:'payment-other'};
  const meta=draft?.qrisAssetMeta;
  return <div className="max-w-5xl space-y-4">
    <Card className="p-4 border-emerald-200 bg-emerald-50/60">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <Field label="Profil Pembayaran Cabang" hint={isOwner?'Setiap cabang dapat memakai QRIS dan nama merchant berbeda.':'Store Manager hanya dapat mengatur cabangnya sendiri.'}>
          {isOwner?<Select value={selectedBranchId} onChange={event=>setSelectedBranchId(event.target.value)}>{availableBranches.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Select>:<Input value={selectedBranch?.name||currentUser?.branchId||'-'} disabled/>}
        </Field>
        <Badge tone="green">Firestore dokumen terpisah per cabang</Badge>
      </div>
    </Card>

    <Card className="p-5 bg-gradient-to-br from-slate-950 to-emerald-950 text-white border-0">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-center">
        <button type="button" onClick={()=>draft?.qrisImage&&setPreviewOpen(true)} className="w-52 h-52 bg-white rounded-3xl p-3 flex items-center justify-center shadow-xl mx-auto relative group" aria-label="Perbesar preview QRIS">
          {draft?.qrisImage?<img src={draft.qrisImage} alt={`QRIS ${selectedBranch?.name||''}`} className="w-full h-full object-contain rounded-2xl"/>:<QrCode size={132} className="text-gray-900"/>}
          {draft?.qrisImage&&<span className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-slate-950/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 size={18}/></span>}
        </button>
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-emerald-300 font-black">QRIS Adaptive v3</p>
          <h3 className="text-2xl font-black mt-1">QRIS tajam, ringan, dan aman untuk Firestore</h3>
          <p className="text-sm text-emerald-100 mt-2">Gambar hingga 24 MB diproses otomatis: ruang kosong dipangkas aman, quiet zone putih ditambahkan kembali, lalu ukuran diturunkan bertahap. Bila gambar sangat rumit, sistem memakai mode kontras tinggi agar tetap lolos batas Firestore tanpa popup gagal.</p>
          <input ref={qrisRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event=>void uploadQris(event.target.files?.[0])}/>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={()=>qrisRef.current?.click()} disabled={assetState.status==='processing'||saving}><Upload size={17}/> {draft?.qrisImage?'Ganti QRIS':'Unggah QRIS'}</Button>
            {draft?.qrisImage&&<Button variant="secondary" onClick={()=>setPreviewOpen(true)}><Maximize2 size={17}/> Preview Besar</Button>}
            {draft?.qrisImage&&<Button variant="danger" onClick={()=>{updateDraft({qrisImage:'',qrisAssetMeta:null});setAssetState({status:'success',tone:'success',message:'QRIS dihapus dari draft. Tekan Simpan Profil untuk menerapkan.'})}}><Trash2 size={17}/> Hapus</Button>}
          </div>
          {meta&&<div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center"><div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-emerald-200">Asli</p><b className="text-xs">{formatAssetBytes(meta.originalBytes)}</b></div><div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-emerald-200">Hasil</p><b className="text-xs">{formatAssetBytes(meta.outputBytes)}</b></div><div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-emerald-200">Resolusi</p><b className="text-xs">{meta.width}×{meta.height}</b></div><div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-emerald-200">Hemat</p><b className="text-xs">{meta.reductionPercent}%</b></div><div className="rounded-xl bg-white/10 p-2 col-span-2 sm:col-span-1"><p className="text-[10px] text-emerald-200">Mode</p><b className="text-[10px]">{meta.pipeline==='high-contrast-fallback'?'Kontras':meta.cropped?'Auto-crop':'Warna'}</b></div></div>}
        </div>
      </div>
    </Card>

    {assetState.message&&<div className={`p-4 rounded-2xl border flex gap-3 text-sm font-semibold ${assetState.status==='error'?'bg-red-50 border-red-200 text-red-800':assetState.status==='processing'?'bg-blue-50 border-blue-200 text-blue-800':'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>{assetState.status==='processing'?<Loader2 size={20} className="animate-spin shrink-0"/>:assetState.status==='error'?<AlertTriangle size={20} className="shrink-0"/>:<CircleCheck size={20} className="shrink-0"/>}<span>{assetState.message}</span></div>}

    <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Nama Merchant QRIS"><Input value={draft?.merchantName||''} onChange={event=>updateDraft({merchantName:event.target.value})} placeholder="BUMI MAKMUR"/></Field>
      <Field label="Petunjuk Pembayaran"><Input value={draft?.qrisInstruction||''} onChange={event=>updateDraft({qrisInstruction:event.target.value})} placeholder="Scan QR lalu tunjukkan bukti pembayaran..."/></Field>
      <label className="md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 border rounded-xl"><input type="checkbox" className="w-5 h-5" checked={draft?.enabled!==false} onChange={event=>updateDraft({enabled:event.target.checked})}/><span><b className="text-sm block">Aktifkan QRIS pada cabang ini</b><small className="text-gray-500">Bila dimatikan, kasir tetap dapat memakai metode digital lain tanpa menampilkan QRIS.</small></span></label>
      <Button className="md:col-span-2" onClick={saveProfile} disabled={saving||assetState.status==='processing'||!draft?.merchantName?.trim()}>{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} {saving?'Menyimpan...':'Simpan Profil QRIS Cabang'}</Button>
    </Card>

    {isOwner&&<>
      <Card className="p-4"><p className="font-black mb-1">Pengaturan Transaksi Global Owner</p><p className="text-xs text-gray-500 mb-3">Pajak, service, pembulatan, dan daftar metode berlaku ke seluruh cabang.</p><Toggle label="Pajak" checked={config.taxEnabled} onChange={v=>patch('taxEnabled',v)} description={`Tarif saat ini ${config.taxRate}%`}/><Toggle label="Service Charge / Gratuity" checked={config.serviceEnabled} onChange={v=>patch('serviceEnabled',v)} description={`Tarif saat ini ${config.serviceRate}%`}/></Card>
      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Tarif Pajak (%)"><Input type="number" min="0" max="100" value={config.taxRate} onChange={e=>patch('taxRate',Number(e.target.value))}/></Field><Field label="Service (%)"><Input type="number" min="0" max="100" value={config.serviceRate} onChange={e=>patch('serviceRate',Number(e.target.value))}/></Field><Field label="Pembulatan"><Select value={config.roundingStep} onChange={e=>patch('roundingStep',Number(e.target.value))}><option value="0">Tanpa pembulatan</option><option value="100">Rp100</option><option value="500">Rp500</option><option value="1000">Rp1.000</option></Select></Field></Card>
      <Card className="p-4"><div className="flex justify-between items-center mb-4"><div><p className="font-black">Metode Pembayaran Global</p><p className="text-xs text-gray-500">Aktifkan hanya metode yang dipakai seluruh jaringan toko.</p></div><Button size="sm" onClick={addPayment}><Plus size={15}/> Tambah</Button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{config.paymentMethods.map((method,index)=><label key={method.id} className={`payment-setting-card ${brandClass[method.brand||method.id]||'payment-other'} ${method.active?'is-enabled':''}`}><span className="payment-method-icon"><WalletCards size={20}/></span><span className="flex-1 min-w-0"><b className="block truncate">{method.name}</b><small>{method.type}</small></span><input type="checkbox" checked={method.active} onChange={e=>patch('paymentMethods',config.paymentMethods.map((row,i)=>i===index?{...row,active:e.target.checked}:row))}/></label>)}</div></Card>
    </>}

    {previewOpen&&draft?.qrisImage&&<Modal title={`Preview QRIS — ${selectedBranch?.name||selectedBranchId}`} onClose={()=>setPreviewOpen(false)} size="lg" footer={<Button onClick={()=>setPreviewOpen(false)}>Tutup</Button>}><div className="max-w-xl mx-auto text-center"><div className="bg-white p-4 rounded-3xl border shadow-sm"><img src={draft.qrisImage} alt="Preview QRIS ukuran besar" className="w-full max-h-[65vh] object-contain"/></div><p className="font-black text-xl mt-4">{draft.merchantName}</p><p className="text-sm text-gray-500 mt-1">{draft.qrisInstruction}</p><p className="text-xs text-emerald-700 font-bold mt-3">Uji pemindaian dengan aplikasi pembayaran sebelum dipakai pada transaksi sungguhan.</p></div></Modal>}
  </div>
}

function SystemSettings({currentUser,db,online,localReady,cloudReady,cloudSaving,cloudError,pendingSyncCount,syncConflictCount,lastSyncAttemptAt,exportBackup,importBackup,fileRef,syncNow,resetDemo,signOutAccount}){
 const [refreshing,setRefreshing]=useState(false);
 const refresh=async()=>{setRefreshing(true);try{const result=await syncNow();alert(`Sinkronisasi selesai. ${result.count||0} pembaruan terkirim, ${result.pending||0} tersisa.`);}catch(error){alert(error.message)}finally{setRefreshing(false)}};
 const statusText=!online
   ? `Mode offline aktif. ${pendingSyncCount} pembaruan tersimpan aman di perangkat.`
   : cloudSaving
     ? `Mengirim ${pendingSyncCount} pembaruan ke Firebase...`
     : cloudError || (pendingSyncCount ? `${pendingSyncCount} pembaruan menunggu sinkronisasi.` : cloudReady ? 'Firebase realtime dan cache lokal aktif.' : 'Data lokal aktif; menghubungkan Firebase...');
 return <div className="max-w-3xl space-y-4">
  <Card className="p-5 bg-gradient-to-br from-emerald-950 to-slate-950 text-white border-0"><div className="flex gap-4"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${online&&cloudReady?'bg-emerald-400/20 text-emerald-200':'bg-orange-400/20 text-orange-200'}`}>{online&&cloudReady?<Cloud size={28}/>:<Database size={28}/>}</div><div className="flex-1"><p className="font-black text-lg">Hybrid Local + Firebase</p><p className="text-sm text-emerald-100 mt-1">{statusText}</p><p className="text-xs text-emerald-300 mt-2">Cloud terakhir: {db.meta.lastSyncAt?new Date(db.meta.lastSyncAt).toLocaleString('id-ID'):'Belum tercatat'} · Percobaan sinkron: {lastSyncAttemptAt?new Date(lastSyncAttemptAt).toLocaleString('id-ID'):'Belum ada'}</p></div></div><button type="button" onClick={refresh} disabled={!online||refreshing} style={{backgroundColor:'#ffffff',color:'#064e3b'}} className="mt-4 w-full min-h-[52px] rounded-xl font-black inline-flex items-center justify-center gap-2 border border-white/70 shadow-sm disabled:opacity-60"><RefreshCw size={18} className={refreshing?'animate-spin':''}/><span>{refreshing?'Menyinkronkan...':'Sinkronkan Sekarang'}</span></button></Card>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Card className="p-4"><p className="text-xs text-gray-500">Cache Perangkat</p><p className={`text-xl font-black mt-2 ${localReady?'text-emerald-600':'text-red-600'}`}>{localReady?'SIAP':'BELUM SIAP'}</p></Card><Card className="p-4"><p className="text-xs text-gray-500">Antrean Offline</p><p className={`text-3xl font-black ${pendingSyncCount?'text-orange-600':'text-emerald-600'}`}>{pendingSyncCount}</p></Card><Card className="p-4"><p className="text-xs text-gray-500">Konflik Digabung</p><p className="text-3xl font-black text-blue-600">{syncConflictCount}</p></Card></div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Card className="p-4"><Download className="text-emerald-600"/><p className="font-bold mt-2">Backup Hybrid ke JSON</p><p className="text-sm text-gray-500 mb-3">Unduh database yang sedang tampil, termasuk transaksi yang belum tersinkron.</p><Button onClick={exportBackup} className="w-full">Unduh Backup</Button></Card>{currentUser?.role==='owner'&&<Card className="p-4"><Upload className="text-blue-600"/><p className="font-bold mt-2">Restore JSON ke Cloud</p><p className="text-sm text-gray-500 mb-3">Mengganti database Firebase. Wajib online, antrean harus kosong, dan hanya Owner.</p><input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async e=>{try{await importBackup(e.target.files[0]);alert('Database cloud dan cache lokal berhasil dipulihkan.')}catch(err){alert(err.message)}}}/><Button variant="blue" onClick={()=>fileRef.current?.click()} className="w-full" disabled={!online||pendingSyncCount>0}>Pilih File Backup</Button></Card>}</div>
  <Card className="p-4 border-orange-200"><p className="font-bold text-orange-800">Keluar Penuh dari Akun</p><p className="text-sm text-gray-500 mb-3">Kredensial offline perangkat ikut dihapus. Tombol dinonaktifkan bila masih ada antrean belum terkirim.</p><Button variant="secondary" disabled={pendingSyncCount>0} onClick={()=>window.confirm('Keluar penuh dan hapus kredensial offline dari perangkat ini?')&&signOutAccount().catch(error=>alert(error.message))} className="w-full">Keluar Penuh</Button></Card>
  {currentUser?.role==='owner'&&<Card className="p-4 border-red-200"><p className="font-bold text-red-700">Reset Database Cloud</p><p className="text-sm text-gray-500 mb-3">Mengembalikan data operasional ke seed awal. Wajib online dan antrean offline harus kosong.</p><Button variant="danger" disabled={!online||pendingSyncCount>0} onClick={()=>window.confirm('RESET DATABASE CLOUD? Data transaksi akan dihapus.')&&resetDemo().catch(error=>alert(error.message))}><Trash2 size={17}/> Reset Cloud</Button></Card>}
 </div>
}

function ReleaseNotesSettings(){
 const groups=[
  ['Purchase & Restock Layout Fix v5.2.3',['Merombak grid input Pembelian agar tombol Tambah ke Daftar tidak lagi menimpa panel Ringkasan.','Form memakai susunan dua baris yang stabil pada monitor desktop, laptop, tablet, dan layar sempit.','Panel Ringkasan kini memiliki lebar minimum aman, tidak tertimpa input, dan tetap mudah dibaca.','Menambahkan pengujian regresi khusus untuk mencegah overflow grid muncul kembali.']],
  ['Smart Inventory & Fractional Sales v5.2.2',['Login karyawan sekarang memilih cabang dan nama dari daftar, lalu memasukkan PIN 4 digit tanpa mengetik nama.','Produk dan Stok disatukan; barang baru dapat dibuat sekaligus dengan stok awal, barcode, harga, lokasi rak, dan stok minimum.','Menambahkan penjualan pecahan dan konversi satuan, misalnya 1 roll kabel = 50 meter serta checkout 2 atau 3,5 meter.','Pembelian, retur, penyesuaian, opname, transfer, refund, pesanan online, dan laporan memakai satuan dasar yang konsisten.','Menu Promo otomatis dihapus dari navigasi; histori promo transaksi lama tetap aman.','Menambahkan ringkasan nilai stok, filter stok rendah/kosong/pecahan, ekspor CSV, dan lembar hitung stok.','Memperbaiki identitas cabang pada sidebar desktop: nama panjang kini tampil utuh hingga dua baris dengan ukuran adaptif dan area sidebar yang lebih lega.']],
  ['Login Page Content Studio v5.1.3',['Menambahkan bagan khusus Pengaturan → Toko → Tampilan Halaman Login.','Owner dapat mengatur header, teks di bawah header, judul pilihan akun, deskripsi Owner/Karyawan, status online/offline, serta footer.','Mendukung placeholder dinamis {branch}, {business}, dan {version} serta preview langsung sebelum disimpan.','Tampilan yang disimpan otomatis dipublikasikan ke Web, PC, HP, dan tablet melalui direktori login publik yang aman.']],
  ['Desktop Windows v5.1',['Menambahkan installer Windows EXE dan MSI melalui GitHub Actions tanpa Android Studio.','Menambahkan layout desktop yang lebih padat, shortcut F2/F4/F8/F9, scanner USB, dan mode layar pelanggan kedua.','Menjalankan aplikasi desktop dalam Electron dengan context isolation, sandbox, serta Node integration dinonaktifkan.']],
  ['Identitas Toko Dinamis',['Owner dapat mengganti nama toko, alamat, dan telepon dari Pengaturan → Bisnis.','Nama baru tampil pada sidebar, login karyawan, judul aplikasi, nota, layar pelanggan, dan QRIS default yang sebelumnya mengikuti nama toko.','Perubahan identitas dipublikasikan ke direktori login seluruh perangkat tanpa membuat akun atau toko baru.']],
  ['Scan Barcode saat Input Produk',['Kolom barcode produk baru kini dapat diisi melalui kamera HP/tablet atau scanner USB/Bluetooth di PC.','Sistem memeriksa barcode ganda sebelum produk disimpan.','Izin kamera dapat dibuka langsung dari modal scanner dan input manual tetap tersedia sebagai cadangan.']],
  ['QRIS Adaptive v3 per Cabang',['Memperbaiki gambar QRIS besar dengan auto-crop, quiet zone, kompresi adaptif, dan fallback kontras hingga batas aman Firestore.','Menjaga latar putih dan tepi QR agar hasil tetap tajam serta mudah dipindai.','Menampilkan ukuran asli, ukuran hasil, resolusi, persentase penghematan, preview besar, dan status proses tanpa popup alert.','QRIS disimpan pada dokumen terpisah per cabang sehingga perubahan Cabang A tidak memicu konflik pengaturan Cabang B.']],
  ['Pusat Kontrol Operasional',['Menambahkan skor kesehatan operasional per cabang.','Menampilkan stok rendah/habis, saran jumlah restock, risiko margin, SKU/barcode ganda, piutang/utang jatuh tempo, dan shift terlalu lama.','Menambahkan ekspor CSV serta cetak daftar restock 80 mm.','Menambahkan nilai stok modal, potensi nilai retail, omzet bersih hari ini, dan temuan prioritas.']],
  ['Multi-Cabang & Store Manager',['Owner dapat memilih profil QRIS setiap cabang.','Store Manager dapat mengatur QRIS cabangnya sendiri tanpa akses ke pajak atau pengaturan global Owner.','Kasir otomatis menerima QRIS cabang yang dipilih saat login.','Cabang baru otomatis memperoleh profil pembayaran dasar dan muncul pada pilihan login.']],
  ['Login & Aktivasi Toko',['Menghapus tombol setup dari login normal setelah toko terdeteksi.','Aktivasi toko tidak tampil pada login normal; mode pemulihan khusus hanya dapat dibuka dengan parameter ?activate=1 dan tetap memeriksa bahwa belum ada toko.','Login Owner dan Karyawan tetap terpisah; karyawan memakai cabang, nama login, dan PIN.','Biometrik tetap hanya berjalan setelah tombol sidik jari/Face ID ditekan.']],
  ['Cloud FreeSync v5',['Memisahkan aset QRIS dari settings global untuk mengurangi konflik web–HP.','Mempertahankan rebase konflik, antrean offline, retry bertahap, cache IndexedDB, dan audit log idempotent.','Menambahkan koleksi branchPaymentProfiles dengan Firestore Rules per cabang.','Tetap memakai Firebase Auth + Firestore Spark tanpa Storage, Functions, Blaze, atau billing.']],
  ['Stabilitas & Kompatibilitas',['Mempertahankan seluruh modul kasir, open bill, refund, stok, pembelian, keuangan, laporan, printer, nota digital, PWA, dan Android.','Menambahkan regression test QRIS, Pusat Kontrol, role Manager, rules, versi, dan retensi fitur.','Dioptimalkan untuk Infinix Note 40 Pro+ serta Huawei MatePad SE 11 pada portrait dan landscape.']]
 ];
 return <div className="max-w-4xl space-y-4"><Card className="p-5 bg-gradient-to-br from-emerald-950 to-slate-950 text-white border-0"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">Major Release</p><h3 className="text-2xl font-black mt-1">Bumi Makmur POS v{APP_VERSION}</h3><p className="text-sm text-emerald-100 mt-2">Smart Inventory, penjualan pecahan, login karyawan lewat daftar nama, Desktop Windows, Identitas Cabang Dinamis, Professional Control Center, dan QRIS Adaptive per Cabang.</p></Card>{groups.map(([title,items])=><Card key={title} className="p-5"><p className="font-black text-gray-900 mb-3">{title}</p><div className="space-y-2">{items.map(item=><div key={item} className="flex gap-3 text-sm text-gray-600"><CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5"/><span>{item}</span></div>)}</div></Card>)}</div>;
}

function AuditSettings({db,online,localReady,cloudReady,pendingSyncCount,syncConflictCount,syncNow}){
 return <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Card className="p-4"><p className="text-xs text-gray-500">Mode</p><p className={`text-xl font-black mt-2 ${online&&cloudReady?'text-emerald-600':'text-orange-600'}`}>{online&&cloudReady?'REALTIME':localReady?'OFFLINE READY':'BELUM SIAP'}</p></Card><Card className="p-4"><p className="text-xs text-gray-500">Menunggu Sinkron</p><p className={`text-3xl font-black ${pendingSyncCount?'text-orange-600':'text-emerald-600'}`}>{pendingSyncCount}</p></Card><Card className="p-4"><p className="text-xs text-gray-500">Konflik Terselesaikan</p><p className="text-3xl font-black text-blue-600">{syncConflictCount}</p></Card><Card className="p-4"><p className="text-xs text-gray-500">Audit Log Cloud</p><p className="text-3xl font-black text-blue-600">{db.auditLogs.length}</p></Card></div><Button onClick={()=>syncNow().catch(error=>alert(error.message))} disabled={!online}><RefreshCw size={17}/> Sinkronkan & Refresh</Button><Card className="p-4"><p className="font-bold mb-3 flex gap-2"><ScrollText size={18}/> Audit Log Terpusat</p><div className="max-h-[65vh] overflow-y-auto">{db.auditLogs.slice(0,300).map(row=><div key={row.id} className="py-3 border-b"><div className="flex justify-between gap-3"><p className="font-bold text-xs">{row.action}</p><Badge tone="blue">{row.branchId||'GLOBAL'}</Badge></div><p className="text-[11px] text-gray-500 mt-1">{row.userName} · {new Date(row.createdAt).toLocaleString('id-ID')}</p><p className="text-xs text-gray-600 mt-1">{row.details}</p>{row.offlineCreatedAt&&<p className="text-[10px] text-orange-600 mt-1">Dibuat offline: {new Date(row.offlineCreatedAt).toLocaleString('id-ID')}</p>}</div>)}</div></Card></div>
}

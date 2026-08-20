import React, { useEffect, useMemo, useState } from 'react';
import { Menu, LogOut, X, WifiOff, Cloud, CloudUpload, DatabaseZap, AlertTriangle, Download } from 'lucide-react';
import { PosProvider, usePos } from './store/PosContext.jsx';
import { APP_VERSION, MODULES, can } from './data/defaults.js';
import LoginScreen from './screens/LoginScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import ControlCenterScreen from './screens/ControlCenterScreen.jsx';
import POSScreen from './screens/POSScreen.jsx';
import OpenBillsScreen from './screens/OpenBillsScreen.jsx';
import ProductsScreen from './screens/ProductsScreen.jsx';
import PurchasesScreen from './screens/PurchasesScreen.jsx';
import { SuppliersScreen, CustomersScreen } from './screens/PartnersScreens.jsx';
import { ShiftsScreen, FinanceScreen } from './screens/ShiftFinanceScreens.jsx';
import TransactionsScreen from './screens/TransactionsScreen.jsx';
import ReportsScreen from './screens/ReportsScreen.jsx';
import OrdersScreen from './screens/OrdersScreen.jsx';
import { EmployeesScreen, BranchesScreen } from './screens/AdminScreens.jsx';
import { CustomerDisplayScreen, DevicesScreen, SettingsScreen } from './screens/DeviceSettingsScreens.jsx';
import { requestStartupCameraPermission } from './services/nativeDevice.js';
import PublicReceiptScreen from './screens/PublicReceiptScreen.jsx';
import DesktopCustomerDisplayScreen from './screens/DesktopCustomerDisplayScreen.jsx';
import BusinessToolsScreen from './screens/BusinessToolsScreen.jsx';
import ScreenErrorBoundary from './components/ScreenErrorBoundary.jsx';

export default function App(){const params=new URLSearchParams(window.location.search);if(params.get('desktopDisplay')==='1')return <DesktopCustomerDisplayScreen/>;const match=window.location.pathname.match(/^\/receipt\/([^/]+)/);if(match)return <PublicReceiptScreen token={decodeURIComponent(match[1])}/>;return <PosProvider><AppShell/></PosProvider>}

function AppShell(){
 const {currentUser,db,logout,online,dataReady,cloudReady,initializingApp,cloudSaving,cloudError,clearCloudError,pendingSyncCount,activePendingSyncCount,otherUserPendingSyncCount,syncStatus,branchId,setActiveBranch,syncNow,exportSyncDiagnostics}=usePos();
 const requestedScreen=new URLSearchParams(window.location.search).get('screen');
 const activeBranch=db.branches.find(item=>item.id===branchId)||db.branches[0];
 const storeName=activeBranch?.name||db.configs.companyName||'BUMI MAKMUR';
 const [active,setActive]=useState(requestedScreen || (currentUser?.role==='kasir'?'pos':'dashboard')); const[more,setMore]=useState(false); const[cloudRetrying,setCloudRetrying]=useState(false); const[cloudRetryMessage,setCloudRetryMessage]=useState('');
 const allowed=useMemo(()=>currentUser?MODULES.filter(module=>can(currentUser,module.permission)):[],[currentUser]);
 useEffect(()=>{
  if(db.configs.cameraPermissionOnStartup!==false) void requestStartupCameraPermission();
 },[db.configs.cameraPermissionOnStartup]);
 useEffect(()=>{
  document.title=`${storeName} · POS Desktop`;
  document.body.classList.toggle('is-electron',Boolean(window.bmDesktop?.isDesktop));
  return()=>document.body.classList.remove('is-electron');
 },[storeName]);
 useEffect(() => {
  if (currentUser && !allowed.some(module => module.id === active)) setActive(allowed[0]?.id || 'pos');
 }, [currentUser, active, allowed]);
 if(!currentUser)return <LoginScreen/>;
 if(initializingApp&&!dataReady)return <CloudLoadingScreen storeName={storeName}/>;
 const navigate=id=>{setActive(id);setMore(false)};
 const retryCloud=async()=>{
  if(cloudRetrying||!online)return;
  setCloudRetrying(true);setCloudRetryMessage('');
  try{
   const result=await syncNow();
   const pending=Number(result?.pending||0);
   const deferred=Number(result?.deferredUserCount||0);
   setCloudRetryMessage(pending?`${pending} pembaruan akun ini masih menunggu.`:`Sinkronisasi akun ${currentUser.name} berhasil.${deferred?` ${deferred} pembaruan akun lain tetap aman.`:''}`);
  }catch(error){setCloudRetryMessage(String(error?.message||'Sinkronisasi belum berhasil. Data lokal tetap aman.'));}
  finally{setCloudRetrying(false);}
 };
 const content=()=>{switch(active){
  case'dashboard':return <DashboardScreen/>;case'controlCenter':return <ControlCenterScreen/>;case'pos':return <POSScreen/>;case'openBills':return <OpenBillsScreen onNavigate={navigate}/>;case'transactions':return <TransactionsScreen/>;case'quotations':return <BusinessToolsScreen initialTab="quotations" onNavigate={navigate}/>;case'warranty':return <BusinessToolsScreen initialTab="warranty" onNavigate={navigate}/>;case'products':return <ProductsScreen/>;case'inventory':return <ProductsScreen/>;case'promotions':return <ProductsScreen/>;case'purchases':return <PurchasesScreen/>;case'suppliers':return <SuppliersScreen/>;case'customers':return <CustomersScreen/>;case'shifts':return <ShiftsScreen/>;case'finance':return <FinanceScreen/>;case'reports':return <ReportsScreen/>;case'orders':return <OrdersScreen onNavigate={navigate}/>;case'employees':return <EmployeesScreen/>;case'branches':return <BranchesScreen/>;case'devices':return <DevicesScreen/>;case'customerDisplay':return <CustomerDisplayScreen/>;case'settings':return <SettingsScreen/>;default:return <POSScreen/>}}
 const bottomIds=['pos','transactions','products'];const bottom=bottomIds.map(id=>allowed.find(m=>m.id===id)).filter(Boolean).slice(0,4);const moreModules=allowed.filter(module=>!bottomIds.includes(module.id));
 return <div className={`h-screen flex overflow-hidden font-sans app-shell-premium ${db.configs.darkMode?'theme-dark':'theme-light'}`}>
  <aside className="hidden md:flex w-20 lg:w-[17.5rem] xl:w-72 bg-emerald-900 text-white flex-col shrink-0 sidebar-nav sidebar-premium">
   <div className="sidebar-brand border-b border-emerald-800 flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-5">
    <img src="/logo-bm.svg" alt="BM" className="w-11 h-11 rounded-2xl shadow-lg ring-1 ring-white/20 shrink-0"/>
    <div className="sidebar-brand-copy hidden lg:flex">
     <p className={`sidebar-store-name font-black tracking-tight ${storeName.length>20?'is-long':''}`} title={storeName}>{storeName}</p>
     <p className="sidebar-store-meta text-emerald-300">POS Hybrid <span>v{APP_VERSION}</span></p>
    </div>
   </div>
   <nav className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-3 custom-scrollbar">{Object.entries(allowed.reduce((groups,module)=>{(groups[module.group||'Menu']??=[]).push(module);return groups;},{})).map(([group,modules])=><div key={group}><p className="hidden lg:block px-3 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">{group}</p><div className="space-y-1">{modules.map(module=>{const Icon=module.icon;return <button key={module.id} title={module.label} onClick={()=>navigate(module.id)} className={`w-full min-h-[46px] rounded-xl flex items-center justify-center lg:justify-start gap-3 px-3 transition-colors ${active===module.id?'bg-emerald-600 text-white shadow-md':'text-emerald-100 hover:bg-emerald-800'}`}><Icon size={20}/><span className="hidden lg:block font-bold text-sm whitespace-nowrap">{module.label}</span></button>})}</div></div>)}</nav>
   <div className="p-2 lg:p-3 border-t border-emerald-800"><button onClick={logout} className="w-full min-h-[48px] rounded-xl bg-red-500/10 text-red-100 hover:bg-red-500 flex items-center justify-center lg:justify-start gap-3 px-3"><LogOut size={20}/><span className="hidden lg:block font-bold">Keluar</span></button></div>
  </aside>
  <main className="flex-1 min-w-0 h-full flex flex-col bg-gray-50 main-content-bg relative">
   {cloudSaving&&<div className="absolute top-2 left-1/2 -translate-x-1/2 z-[120] bg-emerald-900 text-white px-4 py-2 rounded-full shadow-xl text-xs font-bold flex items-center gap-2"><CloudUpload size={15} className="animate-pulse"/>Menyinkronkan {activePendingSyncCount>0?`${activePendingSyncCount} pembaruan akun aktif`:''}</div>}
   {!online&&<div className="absolute top-2 left-1/2 -translate-x-1/2 z-[119] bg-amber-500 text-white px-4 py-2 rounded-full shadow-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap"><WifiOff size={15}/>Mode offline · {pendingSyncCount} pembaruan menunggu</div>}
   {active!=='pos'&&<header className="md:hidden h-[62px] bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 header-mobile"><div className="flex items-center gap-2"><img src="/logo-bm.svg" alt="BM" className="w-9 h-9 rounded-xl"/><b className="truncate max-w-[210px]">{storeName}</b></div><div className="flex items-center gap-2">{online?<Cloud size={17} className={pendingSyncCount?'text-orange-500':'text-emerald-600'}/>:<WifiOff size={17} className="text-amber-600"/>}<button onClick={logout} className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center"><LogOut size={18}/></button></div></header>}
   <div className="hidden md:flex h-[46px] bg-white border-b border-gray-100 items-center justify-between px-4 shrink-0 card-element"><div className="flex items-center gap-2 text-xs">{online?<Cloud size={16} className={cloudError?'text-orange-500':activePendingSyncCount?'text-orange-500':otherUserPendingSyncCount?'text-blue-500':'text-emerald-600'}/>:<DatabaseZap size={16} className="text-amber-600"/>}<span className="text-gray-500" title={syncStatus?.detail}>{!online?`Offline · ${pendingSyncCount} pembaruan aman di perangkat`:cloudError?'Online · data lokal aktif · cloud perlu diperiksa':cloudReady?(otherUserPendingSyncCount?`Online · Firebase aktif · ${otherUserPendingSyncCount} pembaruan akun lain menunggu login`:'Online · Firebase Spark FreeSync · cache lokal aktif'):'Online · menyiapkan sinkronisasi'}</span></div><div className="flex items-center gap-3"><select value={branchId} disabled={currentUser.role!=='owner'} onChange={e=>setActiveBranch(e.target.value)} className="text-xs bg-gray-50 border rounded-lg px-3 py-1.5 outline-none input-element">{db.branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><span className="text-xs font-bold text-gray-700">{currentUser.name}</span></div></div>
   {active!=='settings'&&cloudError&&syncStatus?.code!=='queued'&&syncStatus?.code!=='offline'&&<div className="mx-3 mt-2 shrink-0 rounded-2xl border border-orange-200 bg-orange-50 text-orange-900 px-3 py-3 shadow-sm flex items-start gap-3"><AlertTriangle size={19} className="shrink-0 mt-0.5"/><div className="flex-1 min-w-0"><p className="text-xs font-black">Sinkronisasi cloud tertunda</p><p className="text-xs leading-relaxed mt-0.5">{allowed.some(module=>module.id==='settings')?'Data lokal tetap aman. Sistem terus mencoba otomatis; detail teknis tersedia untuk Owner/Manager.':'Data transaksi tetap aman di perangkat dan akan dikirim otomatis saat Firebase siap. Akun karyawan tidak memerlukan akses Pengaturan; kasir dapat tetap bekerja seperti biasa.'}</p><div className="flex flex-wrap gap-x-4 gap-y-1 mt-1"><button onClick={retryCloud} disabled={!online||cloudRetrying} className="text-xs font-black underline disabled:opacity-50">{cloudRetrying?'Mencoba...':'Coba Sinkron Lagi'}</button>{!allowed.some(module=>module.id==='settings')&&<button onClick={exportSyncDiagnostics} className="text-xs font-black underline inline-flex items-center gap-1 opacity-80"><Download size={12}/>Unduh Diagnostik</button>}{allowed.some(module=>module.id==='settings')&&<><button onClick={exportSyncDiagnostics} className="text-xs font-black underline inline-flex items-center gap-1"><Download size={12}/>Diagnostik</button><button onClick={()=>navigate('settings')} className="text-xs font-black underline">Detail Cloud</button></>}</div>{cloudRetryMessage&&<p className="text-[11px] mt-1.5 font-bold text-orange-800 break-words">{cloudRetryMessage}</p>}</div><button onClick={clearCloudError} aria-label="Tutup pemberitahuan" className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center shrink-0"><X size={16}/></button></div>}
   <div className="flex-1 min-h-0 overflow-hidden"><ScreenErrorBoundary resetKey={`${currentUser.id}:${active}`} onBack={()=>navigate('pos')}>{content()}</ScreenErrorBoundary></div>
   <nav className="md:hidden bg-white border-t border-gray-200 flex items-center justify-around px-1 pb-safe bottom-nav shrink-0 z-50">{bottom.map(module=>{const Icon=module.icon;return <button key={module.id} onClick={()=>navigate(module.id)} className={`min-h-[58px] flex-1 flex flex-col items-center justify-center gap-1 ${active===module.id&&!more?'text-emerald-600':'text-gray-500'}`}><Icon size={22}/><span className="text-[10px] font-bold">{module.label}</span></button>})}<button onClick={()=>setMore(true)} className={`min-h-[58px] flex-1 flex flex-col items-center justify-center gap-1 ${more?'text-emerald-600':'text-gray-500'}`}><Menu size={22}/><span className="text-[10px] font-bold">Lainnya</span></button></nav>
   {more&&<div className="md:hidden absolute inset-0 z-[90] flex flex-col"><button className="flex-1 bg-black/50 backdrop-blur-sm" onClick={()=>setMore(false)}/><div className="bg-white rounded-t-3xl p-4 max-h-[82vh] overflow-y-auto modal-bg"><div className="flex justify-between items-center mb-4"><div><p className="font-black text-lg">Menu Lainnya</p><p className="text-xs text-gray-500">{currentUser.name} · {currentUser.role}</p></div><button onClick={()=>setMore(false)} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><X/></button></div><div className="space-y-5 pb-safe">{Object.entries(moreModules.reduce((groups,module)=>{(groups[module.group||'Menu']??=[]).push(module);return groups;},{})).map(([group,modules])=><section key={group}><p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">{group}</p><div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4">{modules.map(module=>{const Icon=module.icon;return <button key={module.id} onClick={()=>navigate(module.id)} className="flex flex-col items-center gap-2 min-w-0"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${active===module.id?'bg-emerald-100 text-emerald-700':'bg-gray-50 text-gray-600 border border-gray-100'}`}><Icon size={23}/></div><span className="text-[10px] font-bold text-center leading-tight line-clamp-2">{module.label}</span></button>})}</div></section>)}</div></div></div>}
  </main>
 </div>
}


function CloudLoadingScreen({storeName='BUMI MAKMUR'}){return <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white flex flex-col items-center justify-center p-6 text-center"><div className="relative mb-6"><div className="absolute inset-0 rounded-[2rem] bg-emerald-300/25 blur-2xl"/><img src="/logo-bm.svg" alt="BM" className="relative w-24 h-24 rounded-[1.75rem] shadow-2xl ring-1 ring-white/20"/><div className="absolute -right-2 -bottom-2 w-9 h-9 rounded-full border-4 border-emerald-200 border-t-transparent animate-spin bg-emerald-900"/></div><h1 className="font-black text-2xl tracking-tight">Menyiapkan {storeName}</h1><p className="text-emerald-100/85 mt-2 max-w-sm text-sm leading-relaxed">Membuka data perangkat terlebih dahulu. Sinkronisasi Firestore berikutnya berjalan diam-diam tanpa menutup layar aplikasi.</p></div>}

import React, { useEffect, useMemo, useState } from 'react';
import { Menu, Package, LogOut, X, WifiOff, Cloud } from 'lucide-react';
import { PosProvider, usePos } from './store/PosContext.jsx';
import { MODULES, can } from './data/defaults.js';
import LoginScreen from './screens/LoginScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import POSScreen from './screens/POSScreen.jsx';
import OpenBillsScreen from './screens/OpenBillsScreen.jsx';
import ProductsScreen from './screens/ProductsScreen.jsx';
import PromotionsScreen from './screens/PromotionsScreen.jsx';
import InventoryScreen from './screens/InventoryScreen.jsx';
import PurchasesScreen from './screens/PurchasesScreen.jsx';
import { SuppliersScreen, CustomersScreen } from './screens/PartnersScreens.jsx';
import { ShiftsScreen, FinanceScreen } from './screens/ShiftFinanceScreens.jsx';
import TransactionsScreen from './screens/TransactionsScreen.jsx';
import ReportsScreen from './screens/ReportsScreen.jsx';
import OrdersScreen from './screens/OrdersScreen.jsx';
import { EmployeesScreen, BranchesScreen } from './screens/AdminScreens.jsx';
import { CustomerDisplayScreen, DevicesScreen, SettingsScreen } from './screens/DeviceSettingsScreens.jsx';

export default function App(){return <PosProvider><AppShell/></PosProvider>}

function AppShell(){
 const {currentUser,db,logout,online,branchId,setActiveBranch}=usePos();
 const [active,setActive]=useState(currentUser?.role==='kasir'?'pos':'dashboard'); const[more,setMore]=useState(false);
 const allowed=useMemo(()=>currentUser?MODULES.filter(module=>can(currentUser,module.permission)):[],[currentUser]);
 useEffect(() => {
  if (currentUser && !allowed.some(module => module.id === active)) setActive(allowed[0]?.id || 'pos');
 }, [currentUser, active, allowed]);
 if(!currentUser)return <LoginScreen/>;
 const navigate=id=>{setActive(id);setMore(false)};
 const content=()=>{switch(active){
  case'dashboard':return <DashboardScreen/>;case'pos':return <POSScreen/>;case'openBills':return <OpenBillsScreen onNavigate={navigate}/>;case'transactions':return <TransactionsScreen/>;case'products':return <ProductsScreen/>;case'promotions':return <PromotionsScreen/>;case'inventory':return <InventoryScreen/>;case'purchases':return <PurchasesScreen/>;case'suppliers':return <SuppliersScreen/>;case'customers':return <CustomersScreen/>;case'shifts':return <ShiftsScreen/>;case'finance':return <FinanceScreen/>;case'reports':return <ReportsScreen/>;case'orders':return <OrdersScreen onNavigate={navigate}/>;case'employees':return <EmployeesScreen/>;case'branches':return <BranchesScreen/>;case'devices':return <DevicesScreen/>;case'customerDisplay':return <CustomerDisplayScreen/>;case'settings':return <SettingsScreen/>;default:return <POSScreen/>}}
 const bottomIds=['pos','transactions','products','inventory'];const bottom=bottomIds.map(id=>allowed.find(m=>m.id===id)).filter(Boolean).slice(0,4);
 return <div className={`h-screen flex overflow-hidden font-sans ${db.configs.darkMode?'theme-dark':'theme-light'}`}>
  <aside className="hidden md:flex w-20 lg:w-64 bg-emerald-900 text-white flex-col shrink-0 sidebar-nav">
   <div className="h-[72px] border-b border-emerald-800 flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-5"><div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center"><Package/></div><div className="hidden lg:block"><p className="font-black tracking-tight">BUMI MAKMUR</p><p className="text-[10px] text-emerald-300">POS Ultimate v3.1</p></div></div>
   <nav className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-1 custom-scrollbar">{allowed.map(module=>{const Icon=module.icon;return <button key={module.id} title={module.label} onClick={()=>navigate(module.id)} className={`w-full min-h-[48px] rounded-xl flex items-center justify-center lg:justify-start gap-3 px-3 transition-colors ${active===module.id?'bg-emerald-600 text-white shadow-md':'text-emerald-100 hover:bg-emerald-800'}`}><Icon size={21}/><span className="hidden lg:block font-bold text-sm whitespace-nowrap">{module.label}</span></button>})}</nav>
   <div className="p-2 lg:p-3 border-t border-emerald-800"><button onClick={logout} className="w-full min-h-[48px] rounded-xl bg-red-500/10 text-red-100 hover:bg-red-500 flex items-center justify-center lg:justify-start gap-3 px-3"><LogOut size={20}/><span className="hidden lg:block font-bold">Keluar</span></button></div>
  </aside>
  <main className="flex-1 min-w-0 h-full flex flex-col bg-gray-50 main-content-bg relative">
   {active!=='pos'&&<header className="md:hidden h-[62px] bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 header-mobile"><div className="flex items-center gap-2"><Package className="text-emerald-700"/><b>BUMI MAKMUR</b></div><div className="flex items-center gap-2">{online?<Cloud size={17} className="text-emerald-600"/>:<WifiOff size={17} className="text-red-600"/>}<button onClick={logout} className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center"><LogOut size={18}/></button></div></header>}
   <div className="hidden md:flex h-[46px] bg-white border-b border-gray-100 items-center justify-between px-4 shrink-0 card-element"><div className="flex items-center gap-2 text-xs"><span className={`w-2 h-2 rounded-full ${online?'bg-emerald-500':'bg-red-500'}`}/><span className="text-gray-500">{online?'Online':'Offline - data tetap tersimpan lokal'}</span></div><div className="flex items-center gap-3"><select value={branchId} disabled={currentUser.role!=='owner'} onChange={e=>setActiveBranch(e.target.value)} className="text-xs bg-gray-50 border rounded-lg px-3 py-1.5 outline-none input-element">{db.branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><span className="text-xs font-bold text-gray-700">{currentUser.name}</span></div></div>
   <div className="flex-1 min-h-0 overflow-hidden">{content()}</div>
   <nav className="md:hidden bg-white border-t border-gray-200 flex items-center justify-around px-1 pb-safe bottom-nav shrink-0 z-50">{bottom.map(module=>{const Icon=module.icon;return <button key={module.id} onClick={()=>navigate(module.id)} className={`min-h-[58px] flex-1 flex flex-col items-center justify-center gap-1 ${active===module.id&&!more?'text-emerald-600':'text-gray-500'}`}><Icon size={22}/><span className="text-[10px] font-bold">{module.label}</span></button>})}<button onClick={()=>setMore(true)} className={`min-h-[58px] flex-1 flex flex-col items-center justify-center gap-1 ${more?'text-emerald-600':'text-gray-500'}`}><Menu size={22}/><span className="text-[10px] font-bold">Lainnya</span></button></nav>
   {more&&<div className="md:hidden absolute inset-0 z-[90] flex flex-col"><button className="flex-1 bg-black/50 backdrop-blur-sm" onClick={()=>setMore(false)}/><div className="bg-white rounded-t-3xl p-4 max-h-[82vh] overflow-y-auto modal-bg"><div className="flex justify-between items-center mb-4"><div><p className="font-black text-lg">Menu Lainnya</p><p className="text-xs text-gray-500">{currentUser.name} · {currentUser.role}</p></div><button onClick={()=>setMore(false)} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><X/></button></div><div className="grid grid-cols-4 gap-x-2 gap-y-5 pb-safe">{allowed.map(module=>{const Icon=module.icon;return <button key={module.id} onClick={()=>navigate(module.id)} className="flex flex-col items-center gap-2 min-w-0"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${active===module.id?'bg-emerald-100 text-emerald-700':'bg-gray-50 text-gray-600 border border-gray-100'}`}><Icon size={23}/></div><span className="text-[10px] font-bold text-center leading-tight line-clamp-2">{module.label}</span></button>})}</div></div></div>}
  </main>
 </div>
}

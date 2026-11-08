import { calculateNetHpp } from '../utils/accounting.js';
import { toEpochMs } from '../utils/temporal.js';

const ENDPOINT='https://zen.charisna-superapp.workers.dev/pos/push';
const KEY_PREFIX='bumi-makmur:superapp:v1:';
const monthOf=value=>{
  const time=toEpochMs(value);
  if(!time)return '';
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).formatToParts(new Date(time));
  const year=parts.find(part=>part.type==='year')?.value;
  const month=parts.find(part=>part.type==='month')?.value;
  return year&&month?`${year}-${month}`:'';
};
const idr=value=>{
  const rounded=Math.round(Number(value));
  if(!Number.isSafeInteger(rounded))throw Error('Nominal POS di luar batas aman.');
  return String(rounded);
};

export function buildPosSnapshot(db, now=new Date()){
  const month=monthOf(now);
  if(!month)throw Error('Bulan POS tidak valid.');
  const branches=(db?.branches||[]).map(branch=>{
    const sales=(db.sales||[]).filter(sale=>sale.branchId===branch.id&&monthOf(sale.createdAt||sale.date)===month&&!['VOID','VOIDED'].includes(String(sale.status||'').toUpperCase()));
    const saleIds=new Set(sales.map(sale=>sale.id));
    const refunds=(db.refunds||[]).filter(refund=>saleIds.has(refund.saleId));
    const expenses=(db.expenses||[]).filter(expense=>expense.branchId===branch.id&&monthOf(expense.createdAt||expense.date)===month);
    const revenue=sales.reduce((sum,sale)=>sum+Number(sale.total||0)-Number(sale.refundedTotal||0),0);
    const hpp=calculateNetHpp(sales,refunds);
    const expenseTotal=expenses.reduce((sum,expense)=>sum+Number(expense.amount||0),0);
    return {id:String(branch.id),name:String(branch.name||'Cabang'),revenue_idr:idr(revenue),transactions:sales.length,profit_estimate_idr:idr(revenue-hpp-expenseTotal)};
  });
  return {schema:1,month,branches};
}

export function posSyncStorageKey(user){return `${KEY_PREFIX}${user.storeId||'bumi-makmur'}:${user.id}`;}
export function getPosSyncKey(user){return user?.role==='owner'?localStorage.getItem(posSyncStorageKey(user))||'':'';}
export async function sendPosSnapshot({db,user,pairCode='',syncKey=getPosSyncKey(user),fetcher=fetch}){
  if(user?.role!=='owner')throw Error('Hanya Owner dapat menghubungkan SuperApp.');
  if(!syncKey&&!pairCode)throw Error('Buat kode penghubung di SuperApp dahulu.');
  const payload={snapshot:buildPosSnapshot(db),...(syncKey?{syncKey}:{pairCode:String(pairCode).trim().toUpperCase()})};
  const response=await fetcher(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
  if(!response.ok){
    if(response.status===401||response.status===403||response.status===409)throw Error('Koneksi ditolak. Buat kode baru di SuperApp, lalu hubungkan kembali.');
    throw Error('Ringkasan belum terkirim. Coba lagi setelah cloud POS sinkron.');
  }
  const data=await response.json();
  if(data.syncKey)localStorage.setItem(posSyncStorageKey(user),data.syncKey);
  return data;
}

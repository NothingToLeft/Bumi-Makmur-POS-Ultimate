import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildPosSnapshot,sendPosSnapshot} from '../src/services/superappSync.js';

test('POS summary separates branches and excludes void, refunds and expenses',()=>{
 const db={branches:[{id:'a',name:'Utama'},{id:'b',name:'Cabang Dua'}],
  sales:[{id:'s1',branchId:'a',createdAt:'2026-11-06T04:00:00Z',total:100000,refundedTotal:20000,items:[{qty:1,modalPrice:30000}]},{id:'s2',branchId:'a',createdAt:'2026-11-06T04:00:00Z',total:50000,status:'VOID'},{id:'s3',branchId:'b',createdAt:'2026-11-06T04:00:00Z',total:90000,items:[{qty:1,modalPrice:40000}]}],
  refunds:[{saleId:'s1',restock:false,items:[{lineId:'x',qty:1}]}],
  expenses:[{branchId:'a',createdAt:'2026-11-06T04:00:00Z',amount:10000}]};
 const result=buildPosSnapshot(db,new Date('2026-11-07T00:00:00Z'));
 assert.equal(result.month,'2026-11');assert.equal(result.branches.length,2);
 assert.deepEqual(result.branches.map(row=>row.revenue_idr),['80000','90000']);
 assert.deepEqual(result.branches.map(row=>row.transactions),[1,1]);
 assert.deepEqual(result.branches.map(row=>row.profit_estimate_idr),['40000','50000']);
});

test('employees cannot send POS figures',async()=>{
 await assert.rejects(sendPosSnapshot({db:{},user:{role:'kasir'},pairCode:'A'.repeat(24),fetcher:()=>{throw Error('network should not run');}}),/Hanya Owner/);
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

// Run against the loopback-only Vite server. Harness uses real components and fake business data.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(root, '../inspection/bumi-ui');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5187', '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
for (let attempt = 0; attempt < 40; attempt++) {
  try { await fetch('http://127.0.0.1:5187'); break; } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
}
await fs.mkdir(out, { recursive: true });
const html = path.join(root, 'qa-local.html');
const jsx = path.join(root, 'qa-local.jsx');
await fs.writeFile(html, '<html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/qa-local.jsx"></script></html>');
await fs.writeFile(jsx, `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {OrderForm} from '/src/screens/OrdersScreen.jsx';
import {AutomationSettings} from '/src/screens/DeviceSettingsScreens.jsx';
import '/src/index.css';
const products=[{id:'cable',name:'Kabel NYM 2x2.5 - produk contoh panjang',category:'Listrik',baseUnit:'meter',quantityStep:.5,allowFractional:true,stock:100,prices:{retail:19500},conversions:[]}];
const ai=new URLSearchParams(location.search).has('ai');
createRoot(document.getElementById('root')).render(ai?<div style={{padding:16}}><AutomationSettings config={{}} patch={(key,value)=>{window.synced=value}}/></div>:<OrderForm products={products} customers={[{id:'test-customer',name:'Pelanggan uji'}]} onClose={()=>{}} onSave={data=>{window.saved=data}}/>);
`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const results = [];
try {
  for (const [width, height] of [[360,800],[412,915],[768,1024],[1024,768],[1440,900],[1920,1080],[915,412]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5187/qa-local.html');
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByLabel('Pelanggan', { exact: true }).inputValue(), '');
    await page.getByRole('button', {name:'Tambah Barang',exact:true}).click();
    await page.getByRole('button', {name:'Simpan Pesanan',exact:true}).click();
    const saved = await page.evaluate(()=>window.saved);
    assert.equal(saved.total, 9750);
    assert.equal(saved.customerName, 'Umum');
    assert.equal(saved.items[0].baseQty, .5);
    await page.getByRole('button', {name:'Hapus',exact:true}).click();
    assert.equal(await page.getByRole('button', {name:'Simpan Pesanan',exact:true}).isDisabled(), true);
    // Check all horizontal scroll containers, including nested modal body.
    const overflow = await page.evaluate(()=>[...document.querySelectorAll('[role="dialog"], [role="dialog"] *')].filter(el=>el.clientWidth>0 && el.scrollWidth>el.clientWidth+2 && getComputedStyle(el).overflowX!=='hidden').map(el=>el.tagName+'.'+el.className));
    assert.deepEqual(overflow, [], `${width}: modal overflow`);
    await page.screenshot({path:path.join(out, 'order-'+width+'.png')});
    await page.goto('http://127.0.0.1:5187/qa-local.html?ai=1');
    await page.getByRole('button', {name:'Edit Koneksi saat ini',exact:true}).click();
    await page.getByLabel('Nama koneksi', {exact:true}).fill('Google toko');
    await page.getByLabel('API Key', {exact:true}).fill('test-google-only');
    await page.getByRole('button', {name:'Simpan Provider',exact:true}).click();
    await page.getByRole('button', {name:'Tambah Provider',exact:true}).click();
    await page.getByLabel('Nama koneksi', {exact:true}).fill('Router cadangan');
    await page.getByLabel('Provider AI', {exact:true}).selectOption('openai');
    await page.getByLabel('Base URL', {exact:true}).fill('https://openrouter.ai/api/v1');
    await page.getByLabel('Model', {exact:true}).fill('vision-test');
    await page.getByLabel('API Key', {exact:true}).fill('test-router-only');
    await page.getByRole('button', {name:'Simpan Provider',exact:true}).click();
    await page.reload();
    await page.getByRole('group', {name:'Router cadangan',exact:true}).getByRole('button',{name:'Gunakan',exact:true}).click();
    await page.getByRole('button',{name:'Edit Router cadangan',exact:true}).click();
    assert.equal(await page.getByLabel('API Key', {exact:true}).inputValue(),'test-router-only');
    await page.route('https://openrouter.ai/api/v1/chat/completions', route=>route.fulfill({json:{choices:[{message:{content:'BM-AI-OK'}}]}}));
    await page.getByRole('button', {name:'Tes Koneksi AI',exact:true}).click();
    await page.getByText(/Koneksi berhasil · BM-AI-OK/).waitFor();
    await page.getByLabel('Model', {exact:true}).fill('unsaved-draft');
    await page.getByRole('button', {name:'Batal',exact:true}).click();
    await page.getByRole('button',{name:'Edit Router cadangan',exact:true}).click();
    assert.equal(await page.getByLabel('Model', {exact:true}).inputValue(),'vision-test');
    // Changing hosts must immediately clear the previous host credential.
    await page.getByLabel('Base URL', {exact:true}).fill('https://other.example/v1');
    assert.equal(await page.getByLabel('API Key', {exact:true}).inputValue(),'');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.getByRole('group', {name:'Google toko',exact:true}).getByRole('button',{name:'Gunakan',exact:true}).click();
    await page.getByRole('button',{name:'Edit Google toko',exact:true}).click();
    assert.equal(await page.getByLabel('API Key', {exact:true}).inputValue(),'test-google-only');
    await page.getByRole('button', {name:'Batal',exact:true}).click();
    assert.equal(await page.evaluate(()=>JSON.stringify(window.synced).includes('test-google-only')),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    await page.screenshot({path:path.join(out,'ai-'+width+'.png'),fullPage:true});
    assert.deepEqual(errors, []);
    results.push({width,height,order:'pass',profiles:'pass',request:'mock pass',overflow:'none',errors});
    await context.close();
  }
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
  server.kill();
  await fs.rm(html,{force:true});
  await fs.rm(jsx,{force:true});
}

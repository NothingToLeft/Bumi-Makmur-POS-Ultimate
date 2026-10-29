import React, { useState } from 'react';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { Badge, Button, Field, Input, Modal, Select } from './ui.jsx';
import { AI_PROVIDERS, chatCompletionsUrl, describeProvider, testAiProviderConnection } from '../services/aiProvider.js';
import { connectionIdentity, deleteAiConnection, getAiConnections, saveAiConnection } from '../services/aiConnections.js';

export default function AiConnectionManager({ settings, onActivate }) {
  const [connections, setConnections] = useState(getAiConnections);
  const [draft, setDraft] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isActive = item => connectionIdentity(item) === connectionIdentity(settings) && item.model === settings.model && item.apiKey === settings.apiKey;
  const rows = connections.some(isActive) ? connections : [{ ...settings, id: '__current__', name: 'Koneksi saat ini' }, ...connections];
  const edit = item => { setDraft({ ...item, id: item.id === '__current__' ? '' : item.id }); setShowKey(false); setMessage(''); };
  const add = () => edit({ name: '', provider: 'gemini', model: describeProvider('gemini').defaultModel, apiKey: '', baseUrl: '', sendImageToAi: true });
  const update = patch => { setDraft(previous => ({ ...previous, ...patch })); setMessage(''); };
  const save = () => {
    try {
      if (!draft.model.trim()) throw new Error('Isi ID model terlebih dahulu.');
      if (draft.provider !== 'gemini') chatCompletionsUrl(draft.baseUrl);
      const previous = connections.find(item => item.id === draft.id);
      const saved = saveAiConnection(draft, draft.name, draft.id);
      setConnections(getAiConnections());
      if (!connections.length || (previous && isActive(previous)) || rows.find(item => item.id === '__current__') && !draft.id) onActivate(saved);
      setDraft(null);
      setMessage('Provider tersimpan pada perangkat ini.');
    } catch (error) { setMessage(error.message); }
  };
  const remove = item => {
    if (!window.confirm(`Hapus provider ${item.name}?`)) return;
    deleteAiConnection(item.id);
    if (isActive(item)) onActivate({ ...settings, apiKey: '' });
    setConnections(getAiConnections());
    setMessage('Provider dihapus dari perangkat ini.');
  };
  const test = async () => {
    setBusy(true); setMessage('Menguji koneksi...');
    try { const result = await testAiProviderConnection(draft); setMessage(`Koneksi berhasil · ${String(result).slice(0,80)}`); }
    catch (error) { setMessage(error.message || 'Koneksi gagal.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3" aria-label="Daftar provider AI">
    <div><h3 className="font-black text-lg">Provider AI</h3><p className="text-xs text-gray-500 mt-1">API key tidak masuk Firestore/backup. Kunci tetap lokal pada perangkat ini.</p></div>
    {rows.map(item => <div key={item.id} role="group" aria-label={item.name} className="rounded-2xl border p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm break-words">{item.name}</b><Badge tone={isActive(item)?'green':'gray'}>{isActive(item)?'Aktif':'Tersimpan'}</Badge></div><p className="text-xs text-gray-500 mt-1 break-all">{item.model || describeProvider(item.provider).label} · {item.apiKey?'Kunci tersedia':'Belum ada kunci'}</p></div>
      <div className="flex flex-wrap gap-1">{!isActive(item)&&<Button size="sm" variant="outline" onClick={()=>onActivate(item)}>Gunakan</Button>}<Button size="sm" variant="secondary" aria-label={`Edit ${item.name}`} onClick={()=>edit(item)}>Edit</Button>{item.id!=='__current__'&&<Button size="sm" variant="ghost" className="text-red-600" aria-label={`Hapus ${item.name}`} onClick={()=>remove(item)}>Hapus</Button>}</div>
    </div>)}
    <Button variant="outline" className="w-full border-dashed" onClick={add}><Plus size={17}/> Tambah Provider</Button>
    {!draft&&message&&<p role="status" className="text-xs text-gray-600">{message}</p>}
    {draft&&<Modal size="lg" title={draft.id?'Edit Provider':'Konfigurasi Provider'} onClose={()=>{if(!busy)setDraft(null);}} footer={<><Button variant="secondary" disabled={busy} onClick={()=>setDraft(null)}>Batal</Button><Button disabled={busy||!draft.name.trim()||!draft.model.trim()} onClick={save}>Simpan Provider</Button></>}>
      <fieldset disabled={busy} className="space-y-4 min-w-0">
        <Field label="Nama koneksi"><Input autoFocus value={draft.name} maxLength={80} placeholder="Contoh: Google, Sakelar AI, 9Router" onChange={event=>update({name:event.target.value})}/></Field>
        <Field label="Provider AI"><Select value={draft.provider} onChange={event=>{const provider=event.target.value;update({provider,model:describeProvider(provider).defaultModel,baseUrl:provider==='openai'?'https://api.openai.com':'',apiKey:''});}}>{AI_PROVIDERS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
        {draft.provider!=='gemini'&&<Field label="Base URL" hint="OpenAI-compatible: OpenRouter, Groq, DeepSeek, Sakelar, atau 9Router. Server harus mendukung CORS."><Input value={draft.baseUrl} onChange={event=>update({baseUrl:event.target.value,apiKey:''})} placeholder="https://gateway.example/v1"/></Field>}
        <Field label="API Key" hint="Penyimpanan lokal perangkat; tidak dienkripsi oleh aplikasi."><div className="flex gap-2"><Input type={showKey?'text':'password'} value={draft.apiKey} autoComplete="off" placeholder="Masukkan API key" onChange={event=>update({apiKey:event.target.value})}/><Button variant="secondary" type="button" aria-label={showKey?'Sembunyikan API key':'Tampilkan API key'} onClick={()=>setShowKey(value=>!value)}>{showKey?<EyeOff size={17}/>:<Eye size={17}/>}</Button></div></Field>
        <Field label="Model" hint="Masukkan ID model dari provider. Analisis foto memerlukan model vision."><Input value={draft.model} placeholder="ID model" onChange={event=>update({model:event.target.value})}/></Field>
        <label className="flex gap-3 items-center text-sm min-h-[44px]"><input type="checkbox" checked={draft.sendImageToAi!==false} onChange={event=>update({sendImageToAi:event.target.checked})}/>Kirim foto ke model ini</label>
        <Button variant="secondary" onClick={test} disabled={busy||!draft.apiKey||!draft.model}>{busy?'Menguji...':'Tes Koneksi AI'}</Button>
      </fieldset>
      {message&&<p role="status" className="mt-3 text-sm rounded-xl border p-3 break-words">{message}</p>}
    </Modal>}
  </section>;
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Camera, ImagePlus, Images, Loader2, Search, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Input } from './ui.jsx';
import {
  buildProductImageQuery, createCashierThumbnail, createCashierThumbnailFromDataUrl, fetchProductImageCandidateDataUrl,
  normalizePosImage, searchProductImageCandidates
} from '../services/productMedia.js';

function sourceLabel(image) {
  if (!image) return 'Belum ada foto';
  if (image.sourceType === 'ai-web') return image.sourceDomain ? `AI/Web · ${image.sourceDomain}` : 'AI/Web';
  if (image.sourceType === 'ai-capture') return 'Foto AI / Kamera';
  return 'Foto manual';
}

export default function ProductPosImageEditor({ value, onChange, product = {}, title = 'Foto Produk untuk Kasir', compact = false }) {
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const normalized = normalizePosImage(value);
  const [query, setQuery] = useState(() => buildProductImageQuery(product));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [candidates, setCandidates] = useState([]);
  const preview = normalized?.dataUrl || normalized?.url || '';
  const autoQuery = useMemo(() => buildProductImageQuery(product), [product.brand, product.name, product.parentName, product.variantName, product.model, product.specifications]);
  useEffect(() => { if (autoQuery) setQuery(autoQuery); }, [autoQuery]);

  const pickFile = async file => {
    if (!file) return;
    setBusy('photo'); setError(''); setNotice('Mengompres foto menjadi thumbnail ringan untuk Kasir...');
    try {
      const image = await createCashierThumbnail(file, { sourceType: 'manual', query: autoQuery || query });
      onChange?.(image);
      setCandidates([]);
      setNotice(`Foto siap untuk Kasir · ±${Math.max(1, Math.round(Number(image?.bytes || 0) / 1024))} KB.`);
    } catch (photoError) {
      setError(photoError.message || 'Foto produk gagal diproses.'); setNotice('');
    } finally { setBusy(''); }
  };

  const search = async () => {
    const finalQuery = String(query || autoQuery || '').trim();
    setBusy('search'); setError(''); setNotice('Gemini sedang mencari sumber produk yang paling sesuai melalui Google Search...'); setCandidates([]);
    try {
      const result = await searchProductImageCandidates(finalQuery);
      setCandidates(result.candidates || []);
      setNotice(result.note || `Ditemukan ${result.candidates?.length || 0} kandidat. Pilih foto yang benar sebelum disimpan.`);
    } catch (searchError) {
      setError(searchError.message || 'Foto produk tidak ditemukan.'); setNotice('');
    } finally { setBusy(''); }
  };

  const chooseCandidate = async candidate => {
    setBusy(candidate.id); setError(''); setNotice('Menyiapkan thumbnail kandidat untuk Kasir...');
    try {
      const sourceDataUrl = await fetchProductImageCandidateDataUrl(candidate);
      const image = await createCashierThumbnailFromDataUrl(sourceDataUrl, {
        sourceType: 'ai-web', sourcePageUrl: candidate.sourcePageUrl, sourceDomain: candidate.sourceDomain, query: query || autoQuery
      });
      if (!image) throw new Error('Kandidat foto tidak dapat diproses menjadi thumbnail Kasir.');
      onChange?.(image);
      setNotice(`Foto dipilih${candidate.sourceDomain ? ` dari ${candidate.sourceDomain}` : ''}.`);
    } catch (candidateError) {
      setError(candidateError.message || 'Kandidat foto gagal digunakan.'); setNotice('');
    } finally { setBusy(''); }
  };

  return <Card className={`border-sky-200 bg-sky-50/40 ${compact ? 'p-3' : 'p-4'}`}>
    <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-[150px_minmax(0,1fr)]' : 'lg:grid-cols-[190px_minmax(0,1fr)]'} gap-4`}>
      <div>
        <div className={`${compact ? 'h-36' : 'h-44'} rounded-2xl overflow-hidden border bg-white flex items-center justify-center relative`}>
          {preview ? <img src={preview} alt="Foto produk untuk Kasir" loading="lazy" className="w-full h-full object-contain"/> : <div className="text-center text-gray-400 px-3"><ImagePlus size={34} className="mx-auto"/><p className="text-xs font-bold mt-2">Belum ada foto Kasir</p></div>}
          {busy === 'photo' && <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center"><Loader2 className="animate-spin"/></div>}
        </div>
        <div className="flex flex-wrap gap-2 mt-2"><Badge tone={normalized ? 'blue' : 'gray'}>{sourceLabel(normalized)}</Badge>{normalized?.bytes > 0 && <Badge>{Math.max(1, Math.round(normalized.bytes / 1024))} KB</Badge>}</div>
      </div>
      <div className="min-w-0">
        <div><p className="font-black text-gray-900">{title}</p><p className="text-xs text-gray-600 mt-1">Foto ini hanya dipakai sebagai bantuan visual di halaman Kasir. Tidak dimasukkan ke struk, laporan, PDF, PO, atau histori transaksi.</p></div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button type="button" size="sm" variant="secondary" onClick={() => cameraRef.current?.click()} disabled={Boolean(busy)}><Camera size={16}/> Ambil Foto</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => galleryRef.current?.click()} disabled={Boolean(busy)}><Images size={16}/> Pilih Galeri</Button>
          {normalized && <Button type="button" size="sm" variant="danger" onClick={() => { onChange?.(null); setCandidates([]); setNotice('Foto Kasir dihapus.'); }} disabled={Boolean(busy)}><Trash2 size={16}/> Hapus</Button>}
        </div>
        <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={event => { void pickFile(event.target.files?.[0]); event.target.value = ''; }}/>
        <input ref={galleryRef} className="hidden" type="file" accept="image/*" onChange={event => { void pickFile(event.target.files?.[0]); event.target.value = ''; }}/>

        <div className="mt-4 rounded-2xl bg-white border p-3">
          <div className="flex gap-2 items-start"><Bot size={18} className="text-violet-600 shrink-0 mt-1"/><div className="min-w-0 flex-1"><p className="font-black text-sm">Cari Foto Otomatis</p><p className="text-[11px] text-gray-500 mt-1">Nama, merek, model, dan varian dirangkai otomatis. Gemini memakai Google Search untuk mencari sumber produk, lalu kamu tetap memilih kandidat agar watt/ukuran tidak salah.</p></div></div>
          <div className="mt-3 flex flex-col sm:flex-row gap-2"><Input value={query} onChange={event => setQuery(event.target.value)} placeholder={autoQuery || 'Contoh: Philips LED Bulb 10W E27 6500K'}/><Button type="button" variant="secondary" onClick={() => void search()} disabled={Boolean(busy) || !(query || autoQuery).trim()} className="shrink-0">{busy === 'search' ? <Loader2 size={16} className="animate-spin"/> : <Search size={16}/>} Cari Otomatis</Button></div>
          {!query && autoQuery && <button type="button" className="text-[11px] text-violet-700 font-bold mt-2" onClick={() => setQuery(autoQuery)}>Gunakan: {autoQuery}</button>}
        </div>
        {notice && <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-2 mt-3">{notice}</p>}
        {error && <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl p-2 mt-3">{error}</p>}
      </div>
    </div>
    {candidates.length > 0 && <div className="mt-4"><p className="font-black text-sm mb-2">Pilih foto yang paling sesuai</p><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">{candidates.map(candidate => {
      const candidateSrc = candidate.imageUrl;
      return <button type="button" key={candidate.id} onClick={() => void chooseCandidate(candidate)} disabled={Boolean(busy)} className="rounded-2xl border bg-white overflow-hidden text-left hover:border-violet-400 disabled:opacity-60">
        <div className="aspect-square bg-gray-50 flex items-center justify-center relative">{candidateSrc ? <img src={candidateSrc} alt={candidate.sourceTitle || 'Kandidat foto produk'} loading="lazy" className="w-full h-full object-contain"/> : <ImagePlus className="text-gray-300"/>}{busy === candidate.id && <div className="absolute inset-0 bg-black/45 text-white flex items-center justify-center"><Loader2 className="animate-spin"/></div>}</div>
        <div className="p-2"><p className="text-[11px] font-bold line-clamp-2">{candidate.sourceTitle || candidate.sourceDomain || 'Sumber produk'}</p><p className="text-[10px] text-gray-500 truncate mt-1">{candidate.sourceDomain || 'Web'}</p></div>
      </button>;
    })}</div></div>}
  </Card>;
}

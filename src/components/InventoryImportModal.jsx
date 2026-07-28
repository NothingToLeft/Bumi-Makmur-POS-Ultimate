import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, PackagePlus, Upload } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Modal, Select } from './ui.jsx';
import {
  buildInventoryImportPlan,
  buildInventoryTemplateCsv,
  buildInventoryTemplateWorkbook,
  parseInventoryFile
} from '../utils/inventoryImport.js';
import { downloadFile } from '../utils/helpers.js';
import { formatQuantity } from '../utils/fractionalUnits.js';

const toneFor = row => row.valid ? (row.action === 'create' ? 'green' : 'blue') : 'red';

export default function InventoryImportModal({ products = [], categories = [], branchId = '', onImport, onClose }) {
  const [rawRows, setRawRows] = useState([]);
  const [filename, setFilename] = useState('');
  const [mode, setMode] = useState('upsert');
  const [stockMode, setStockMode] = useState('replace');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  const plan = useMemo(() => buildInventoryImportPlan(rawRows, {
    products, categories, branchId, mode
  }), [rawRows, products, categories, branchId, mode]);

  const chooseFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setMessage(''); setResult(null);
    try {
      const rows = await parseInventoryFile(file);
      if (!rows.length) throw new Error('File tidak memiliki baris produk yang dapat dibaca.');
      setRawRows(rows);
      setFilename(file.name);
    } catch (error) {
      setRawRows([]);
      setFilename(file.name || '');
      setMessage(error.message || 'File gagal dibaca.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const downloadCsv = () => downloadFile('Template-Impor-Produk-dan-Stok-Bumi-Makmur.csv', buildInventoryTemplateCsv(), 'text/csv;charset=utf-8');
  const downloadXlsx = async () => {
    setBusy(true); setMessage('');
    try {
      const content = await buildInventoryTemplateWorkbook();
      downloadFile('Template-Impor-Produk-dan-Stok-Bumi-Makmur.xlsx', content, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (error) {
      setMessage(error.message || 'Template Excel gagal dibuat.');
    } finally { setBusy(false); }
  };

  const importRows = async () => {
    if (!plan.validRows.length) return;
    setBusy(true); setMessage('');
    try {
      const output = await onImport(plan.validRows, { branchId, stockMode });
      setResult(output || { created: plan.createCount, updated: plan.updateCount, categories: plan.categoriesToCreate });
    } catch (error) {
      setMessage(error.message || 'Impor gagal dijalankan.');
    } finally { setBusy(false); }
  };

  const footer = result
    ? <Button onClick={onClose}>Selesai</Button>
    : <><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={importRows} disabled={busy || !plan.validRows.length}><PackagePlus size={18}/> Impor {plan.validRows.length} Baris Valid</Button></>;

  return <Modal title="Impor Produk & Stok Awal" onClose={onClose} size="full" footer={footer}>
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-emerald-950 to-slate-950 text-white border-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center"><FileSpreadsheet/></div><div><p className="font-black text-lg">Masukkan ratusan barang tanpa mengetik satu per satu</p><p className="text-sm text-emerald-100 mt-1">Mendukung CSV dan Excel. Produk, stok awal, harga, kemasan, kategori, dan varian diperiksa sebelum disimpan.</p></div></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={downloadCsv}><Download size={17}/> Template CSV</Button><Button variant="outline" onClick={downloadXlsx} disabled={busy}><Download size={17}/> Template Excel</Button></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px_260px] gap-3 items-end">
        <Field label="File CSV / Excel" hint="Isi template, lalu pilih kembali file yang sudah disimpan.">
          <label className="field-input min-h-[56px] flex items-center gap-3 cursor-pointer border-dashed border-2 hover:border-emerald-400">
            <Upload size={20} className="text-emerald-600"/><span className="truncate">{filename || 'Pilih .csv, .xlsx, atau .xls'}</span>
            <input type="file" className="sr-only" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={chooseFile}/>
          </label>
        </Field>
        <Field label="Mode produk"><Select value={mode} onChange={event => setMode(event.target.value)}><option value="upsert">Tambah baru + perbarui SKU lama</option><option value="create-only">Hanya produk baru</option></Select></Field>
        <Field label="Cara menerapkan stok"><Select value={stockMode} onChange={event => setStockMode(event.target.value)}><option value="replace">Ganti dengan stok pada file</option><option value="add">Tambahkan ke stok sekarang</option></Select></Field>
      </div>

      {message && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex gap-2"><AlertTriangle size={18}/>{message}</div>}
      {result && <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900"><div className="flex gap-3"><CheckCircle2/><div><p className="font-black">Impor selesai</p><p className="text-sm mt-1">{result.created || 0} produk dibuat, {result.updated || 0} produk diperbarui, dan {(result.categories || []).length} kategori baru ditambahkan.</p></div></div></div>}

      {!rawRows.length && !result ? <EmptyState icon={FileSpreadsheet} title="Belum ada file" subtitle="Unduh template agar nama kolom dan contoh konversi kemasan langsung tersedia."/> : !result && <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Metric label="Baris Dibaca" value={plan.rows.length}/><Metric label="Produk Baru" value={plan.createCount} tone="green"/><Metric label="Diperbarui" value={plan.updateCount} tone="blue"/><Metric label="Peringatan" value={plan.warnings.length} tone="orange"/><Metric label="Gagal Validasi" value={plan.errors.length} tone="red"/>
        </div>
        {plan.categoriesToCreate.length > 0 && <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm"><b>Kategori baru otomatis:</b> {plan.categoriesToCreate.join(', ')}</div>}
        <div className="overflow-auto border rounded-2xl max-h-[48vh]">
          <table className="w-full text-sm min-w-[1050px]"><thead className="sticky top-0 bg-gray-100 z-10"><tr>{['Baris','Status','Nama','SKU','Barcode','Kategori','Stok','Satuan','Harga Eceran','Keterangan'].map(label => <th key={label} className="text-left p-3 border-b">{label}</th>)}</tr></thead><tbody>{plan.rows.slice(0, 250).map(row => <tr key={`${row.rowNumber}-${row.sku}`} className={row.valid ? 'bg-white' : 'bg-red-50'}><td className="p-3 border-b">{row.rowNumber}</td><td className="p-3 border-b"><Badge tone={toneFor(row)}>{row.valid ? (row.action === 'create' ? 'Buat' : 'Perbarui') : 'Ditolak'}</Badge></td><td className="p-3 border-b font-bold">{row.name || '-'}</td><td className="p-3 border-b font-mono text-xs">{row.sku || '-'}</td><td className="p-3 border-b font-mono text-xs">{row.barcode || row.sharedBarcode || '-'}</td><td className="p-3 border-b">{row.category || '-'}</td><td className="p-3 border-b tabular-nums">{formatQuantity(row.stock)} {row.baseUnit}</td><td className="p-3 border-b">{row.conversions?.length ? row.conversions.map(item => `${item.unit}=${item.factor}`).join(', ') : row.baseUnit}</td><td className="p-3 border-b tabular-nums">Rp {Number(row.prices?.retail || 0).toLocaleString('id-ID')}</td><td className="p-3 border-b text-xs"><div className="space-y-1">{row.errors?.map(error => <p key={error} className="text-red-700">• {error}</p>)}{row.warnings?.map(warning => <p key={warning} className="text-orange-700">• {warning}</p>)}{!row.errors?.length && !row.warnings?.length && <span className="text-emerald-700">Siap diimpor</span>}</div></td></tr>)}</tbody></table>
        </div>
        {plan.rows.length > 250 && <p className="text-xs text-gray-500">Preview menampilkan 250 baris pertama. Semua baris valid tetap akan diimpor.</p>}
      </>}
    </div>
  </Modal>;
}

function Metric({ label, value, tone = 'gray' }) {
  const tones = { gray: 'text-gray-800', green: 'text-emerald-700', blue: 'text-blue-700', orange: 'text-orange-700', red: 'text-red-700' };
  return <Card className="p-3"><p className="text-xs text-gray-500">{label}</p><p className={`text-2xl font-black mt-1 ${tones[tone]}`}>{value}</p></Card>;
}

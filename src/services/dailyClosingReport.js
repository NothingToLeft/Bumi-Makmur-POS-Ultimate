import { isNativeAndroid, shareNativePdf } from './nativeDevice.js';
import { formatRp } from '../utils/helpers.js';
import { buildClosingSummary } from '../utils/closingSummary.js';

export { buildClosingSummary } from '../utils/closingSummary.js';

const normalizeAscii = value => String(value ?? '')
  .replace(/[–—]/g, '-')
  .replace(/[×]/g, 'x')
  .replace(/[•]/g, '-')
  .replace(/[^\x20-\x7E]/g, '?');

function pdfEscape(value) { return normalizeAscii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }

function makePdfContent(summary) {
  const lines = [];
  const add = (text, options = {}) => lines.push({ text: normalizeAscii(text), ...options });
  add('BUMI MAKMUR POS', { size: 18, bold: true, gap: 2 });
  add(summary.branchName, { size: 14, bold: true, gap: 4 });
  if (summary.branchAddress) add(summary.branchAddress, { size: 9, gap: 8 });
  add('LAPORAN TUTUP HARIAN / SHIFT', { size: 13, bold: true, gap: 3 });
  add(`Shift: ${summary.shiftId}`, { size: 9 });
  add(`Kasir: ${summary.cashierName}`, { size: 9 });
  add(`Mulai: ${new Date(summary.startAt).toLocaleString('id-ID')}`, { size: 9 });
  add(`Selesai: ${new Date(summary.endAt).toLocaleString('id-ID')}`, { size: 9, gap: 8 });
  add('RINGKASAN PENJUALAN', { size: 11, bold: true, gap: 3 });
  add(`Transaksi bersih                  ${summary.transactionCount}`, { size: 10 });
  add(`Refund                            ${summary.refundCount || 0}`, { size: 10 });
  add(`Void                              ${summary.voidCount || 0}`, { size: 10 });
  add(`Item bersih                       ${Number(summary.itemQty || 0).toLocaleString('id-ID')}`, { size: 10 });
  add(`Omzet kotor                       ${formatRp(summary.grossSales)}`, { size: 10 });
  add(`Retur / refund                    ${formatRp(summary.refundTotal)}`, { size: 10 });
  add(`Omzet bersih                      ${formatRp(summary.netSales)}`, { size: 11, bold: true });
  add(`Diskon                            ${formatRp(summary.discounts)}`, { size: 10 });
  add(`HPP bersih                        ${formatRp(summary.estimatedCost)}`, { size: 10 });
  add(`Estimasi laba kotor               ${formatRp(summary.grossProfit)}`, { size: 11, bold: true, gap: 7 });
  add('PEMBAYARAN', { size: 11, bold: true, gap: 3 });
  Object.entries(summary.payments || {}).sort(([a], [b]) => a.localeCompare(b)).forEach(([name, amount]) => add(`${name.padEnd(32, ' ')} ${formatRp(amount)}`, { size: 10 }));
  if (!Object.keys(summary.payments || {}).length) add('Belum ada rincian pembayaran.', { size: 9 });
  add('', { gap: 5 });
  add('KAS & OPERASIONAL', { size: 11, bold: true, gap: 3 });
  add(`Modal awal                       ${formatRp(summary.startingCash)}`, { size: 10 });
  add(`Kas seharusnya                   ${formatRp(summary.expectedCash)}`, { size: 10 });
  add(`Kas aktual                       ${formatRp(summary.actualCash)}`, { size: 10 });
  add(`Selisih                          ${formatRp(summary.difference)}`, { size: 11, bold: true });
  add(`Pengeluaran operasional          ${formatRp(summary.expenses)}`, { size: 10 });
  add(`Piutang baru                     ${formatRp(summary.newReceivable)}`, { size: 10, gap: 7 });
  if (summary.notes) add(`Catatan: ${summary.notes}`, { size: 9, gap: 6 });
  add(`Dibuat otomatis oleh Bumi Makmur POS v6.0.3 pada ${new Date(summary.generatedAt).toLocaleString('id-ID')}.`, { size: 8 });
  return lines;
}

function buildSimplePdf(lines) {
  const pageWidth = 595.28; const pageHeight = 841.89; const margin = 52;
  const pages = []; let current = []; let y = pageHeight - margin;
  for (const line of lines) {
    const size = line.size || 10; const height = size * 1.45 + Number(line.gap || 0);
    if (y - height < margin) { pages.push(current); current = []; y = pageHeight - margin; }
    current.push({ ...line, y }); y -= height;
  }
  if (current.length || !pages.length) pages.push(current);

  const objects = []; const addObj = content => { objects.push(content); return objects.length; };
  const fontRegular = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pagesId = objects.length + 1; objects.push('PAGES_PLACEHOLDER');
  const pageIds = [];
  for (const pageLines of pages) {
    const stream = pageLines.map(line => {
      const font = line.bold ? 'F2' : 'F1';
      const size = line.size || 10;
      return `BT /${font} ${size} Tf 1 0 0 1 ${margin} ${line.y.toFixed(2)} Tm (${pdfEscape(line.text)}) Tj ET`;
    }).join('\n');
    const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObj(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([new TextEncoder().encode(pdf)], { type: 'application/pdf' });
}

export function createClosingPdfFile(summary) {
  const blob = buildSimplePdf(makePdfContent(summary));
  const day = new Date(summary.endAt || Date.now()).toISOString().slice(0, 10);
  const safeBranch = normalizeAscii(summary.branchName).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Bumi-Makmur';
  return new File([blob], `Tutup-Harian-${safeBranch}-${day}-${summary.shiftId}.pdf`, { type: 'application/pdf' });
}

export function buildClosingWhatsappText(summary) {
  return [
    `*Laporan Tutup Harian - ${summary.branchName}*`,
    `${new Date(summary.endAt).toLocaleString('id-ID')}`,
    `Kasir: ${summary.cashierName}`,
    '',
    `Omzet bersih: ${formatRp(summary.netSales)}`,
    `Transaksi: ${summary.transactionCount}`,
    `Estimasi laba kotor: ${formatRp(summary.grossProfit)}`,
    `Kas aktual: ${formatRp(summary.actualCash)}`,
    `Selisih kas: ${formatRp(summary.difference)}`,
    '',
    'PDF laporan lengkap terlampir.'
  ].join('\n');
}

export async function shareClosingPdf(summary) {
  const file = createClosingPdfFile(summary);
  const text = buildClosingWhatsappText(summary);
  if (isNativeAndroid()) {
    const result = await shareNativePdf(file, { title: `Tutup Harian ${summary.branchName}`, text, preferWhatsApp: true });
    if (result?.shared === false) throw new Error(result?.error || 'Android tidak dapat membuka aplikasi untuk membagikan PDF.');
    return { method: 'native', shared: true, file };
  }
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title: `Tutup Harian ${summary.branchName}`, text, files: [file] });
    return { method: 'web-share', shared: true, file };
  }
  downloadClosingPdf(summary, file);
  return { method: 'download', shared: false, file };
}

export function downloadClosingPdf(summary, existingFile = null) {
  const file = existingFile || createClosingPdfFile(summary);
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = file.name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return file;
}

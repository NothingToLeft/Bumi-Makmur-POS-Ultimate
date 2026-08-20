import { isNativeAndroid, shareNativePdf } from './nativeDevice.js';
import { formatRp } from '../utils/helpers.js';
import { buildClosingSummary } from '../utils/closingSummary.js';
import { formatDateTimeId, localDateKeyFromValue } from '../utils/temporal.js';
import { APP_VERSION } from '../data/defaults.js';

export { buildClosingSummary } from '../utils/closingSummary.js';

const BRAND_RED = '#D71920';
const BRAND_DARK = '#111827';
const BRAND_MUTED = '#64748B';
const BRAND_BORDER = '#E2E8F0';
const BRAND_SOFT = '#FFF5F5';
const BRAND_GREEN = '#047857';

const normalizeAscii = value => String(value ?? '')
  .replace(/[–—]/g, '-')
  .replace(/[×]/g, 'x')
  .replace(/[•]/g, '-')
  .replace(/[^\x20-\x7E]/g, '?');

function pdfEscape(value) {
  return normalizeAscii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function makeFallbackPdfContent(summary) {
  const lines = [];
  const add = (text, options = {}) => lines.push({ text: normalizeAscii(text), ...options });
  add('BUMI MAKMUR 2', { size: 18, bold: true, gap: 2 });
  add(summary.branchName, { size: 14, bold: true, gap: 4 });
  if (summary.branchAddress) add(summary.branchAddress, { size: 9, gap: 8 });
  add('LAPORAN TUTUP HARIAN / SHIFT', { size: 13, bold: true, gap: 3 });
  add(`Shift: ${summary.shiftId}`, { size: 9 });
  add(`Kasir: ${summary.cashierName}`, { size: 9 });
  add(`Mulai: ${formatDateTimeId(summary.startAt)}`, { size: 9 });
  add(`Selesai: ${formatDateTimeId(summary.endAt)}`, { size: 9, gap: 8 });
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
  Object.entries(summary.payments || {}).sort(([a], [b]) => a.localeCompare(b, 'id')).forEach(([name, amount]) => add(`${name.padEnd(32, ' ')} ${formatRp(amount)}`, { size: 10 }));
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
  add(`Dibuat otomatis oleh Bumi Makmur POS v${APP_VERSION} pada ${formatDateTimeId(summary.generatedAt)}.`, { size: 8 });
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

function roundRect(ctx, x, y, width, height, radius, fill, stroke = null) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function text(ctx, value, x, y, options = {}) {
  const { size = 28, weight = 500, color = BRAND_DARK, align = 'left', maxWidth } = options;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  if (maxWidth) ctx.fillText(String(value ?? ''), x, y, maxWidth);
  else ctx.fillText(String(value ?? ''), x, y);
}

function drawMetric(ctx, x, y, width, label, value, accent = BRAND_DARK) {
  roundRect(ctx, x, y, width, 126, 22, '#FFFFFF', BRAND_BORDER);
  ctx.fillStyle = accent; ctx.fillRect(x, y, 8, 126);
  text(ctx, label.toUpperCase(), x + 28, y + 40, { size: 19, weight: 800, color: BRAND_MUTED });
  text(ctx, value, x + 28, y + 91, { size: 34, weight: 900, color: accent, maxWidth: width - 52 });
}

function drawKeyValue(ctx, label, value, x, y, width, options = {}) {
  text(ctx, label, x, y, { size: options.size || 22, weight: options.boldLabel ? 800 : 500, color: options.labelColor || BRAND_MUTED, maxWidth: width * 0.56 });
  text(ctx, value, x + width, y, { size: options.size || 22, weight: options.boldValue ? 900 : 700, color: options.valueColor || BRAND_DARK, align: 'right', maxWidth: width * 0.42 });
}

async function loadLogo(url = '/logo-bm.svg') {
  if (typeof Image === 'undefined') return null;
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function canvasToJpegBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Gagal merender laporan menjadi gambar PDF.')), 'image/jpeg', 0.94);
  });
}

async function renderClosingCanvas(summary) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = BRAND_RED; ctx.fillRect(0, 0, canvas.width, 18);
  ctx.fillStyle = BRAND_DARK; ctx.fillRect(0, 18, canvas.width, 7);

  const margin = 72;
  const contentWidth = canvas.width - margin * 2;
  const logo = await loadLogo('/logo-bm.svg');
  if (logo) ctx.drawImage(logo, margin, 62, 110, 110);
  else {
    roundRect(ctx, margin, 62, 110, 110, 28, BRAND_RED);
    text(ctx, 'BM2', margin + 55, 130, { size: 32, weight: 900, color: '#FFFFFF', align: 'center' });
  }
  text(ctx, 'BUMI MAKMUR 2', margin + 142, 105, { size: 44, weight: 900 });
  text(ctx, 'JUAL ALAT-ALAT LISTRIK DAN BAHAN BANGUNAN', margin + 142, 141, { size: 19, weight: 800, color: BRAND_RED });
  text(ctx, summary.branchName || 'Bumi Makmur', margin + 142, 171, { size: 22, weight: 700, color: BRAND_MUTED });

  text(ctx, 'LAPORAN TUTUP HARIAN', canvas.width - margin, 94, { size: 28, weight: 900, align: 'right' });
  text(ctx, 'SHIFT / DAILY CLOSING', canvas.width - margin, 128, { size: 18, weight: 800, color: BRAND_RED, align: 'right' });
  text(ctx, `v${APP_VERSION}`, canvas.width - margin, 160, { size: 17, weight: 700, color: BRAND_MUTED, align: 'right' });

  ctx.strokeStyle = BRAND_BORDER; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(margin, 205); ctx.lineTo(canvas.width - margin, 205); ctx.stroke();

  roundRect(ctx, margin, 234, contentWidth, 154, 24, '#F8FAFC', BRAND_BORDER);
  text(ctx, 'INFORMASI SHIFT', margin + 28, 272, { size: 18, weight: 900, color: BRAND_RED });
  drawKeyValue(ctx, 'Nomor Shift', summary.shiftId || '-', margin + 28, 314, 470, { size: 20, boldValue: true });
  drawKeyValue(ctx, 'Kasir', summary.cashierName || '-', margin + 28, 352, 470, { size: 20, boldValue: true });
  drawKeyValue(ctx, 'Mulai', formatDateTimeId(summary.startAt), margin + 596, 314, 470, { size: 20, boldValue: true });
  drawKeyValue(ctx, 'Selesai', formatDateTimeId(summary.endAt), margin + 596, 352, 470, { size: 20, boldValue: true });

  const gap = 20; const metricWidth = (contentWidth - gap) / 2;
  drawMetric(ctx, margin, 418, metricWidth, 'Omzet Bersih', formatRp(summary.netSales), BRAND_RED);
  drawMetric(ctx, margin + metricWidth + gap, 418, metricWidth, 'Estimasi Laba Kotor', formatRp(summary.grossProfit), BRAND_GREEN);
  drawMetric(ctx, margin, 564, metricWidth, 'Transaksi Bersih', `${summary.transactionCount || 0} transaksi`, BRAND_DARK);
  drawMetric(ctx, margin + metricWidth + gap, 564, metricWidth, 'Selisih Kas', formatRp(summary.difference), Number(summary.difference || 0) === 0 ? BRAND_GREEN : BRAND_RED);

  const leftX = margin; const rightX = margin + 556; const sectionWidth = 540;
  roundRect(ctx, leftX, 720, sectionWidth, 416, 24, '#FFFFFF', BRAND_BORDER);
  text(ctx, 'RINGKASAN PENJUALAN', leftX + 26, 766, { size: 22, weight: 900 });
  ctx.fillStyle = BRAND_RED; ctx.fillRect(leftX + 26, 782, 86, 5);
  const salesRows = [
    ['Omzet kotor', formatRp(summary.grossSales)],
    ['Retur / refund', formatRp(summary.refundTotal)],
    ['Diskon', formatRp(summary.discounts)],
    ['HPP bersih', formatRp(summary.estimatedCost)],
    ['Item bersih', Number(summary.itemQty || 0).toLocaleString('id-ID')],
    ['Refund / Void', `${summary.refundCount || 0} / ${summary.voidCount || 0}`]
  ];
  salesRows.forEach(([label, value], index) => drawKeyValue(ctx, label, value, leftX + 26, 835 + index * 45, sectionWidth - 52, { size: 21 }));
  ctx.strokeStyle = BRAND_BORDER; ctx.beginPath(); ctx.moveTo(leftX + 26, 1091); ctx.lineTo(leftX + sectionWidth - 26, 1091); ctx.stroke();
  drawKeyValue(ctx, 'LABA KOTOR', formatRp(summary.grossProfit), leftX + 26, 1122, sectionWidth - 52, { size: 23, boldLabel: true, boldValue: true, valueColor: BRAND_GREEN, labelColor: BRAND_DARK });

  roundRect(ctx, rightX, 720, sectionWidth, 416, 24, '#FFFFFF', BRAND_BORDER);
  text(ctx, 'PEMBAYARAN & KAS', rightX + 26, 766, { size: 22, weight: 900 });
  ctx.fillStyle = BRAND_RED; ctx.fillRect(rightX + 26, 782, 86, 5);
  const paymentRows = Object.entries(summary.payments || {}).sort(([a], [b]) => a.localeCompare(b, 'id')).slice(0, 5);
  let py = 835;
  if (paymentRows.length) {
    for (const [name, amount] of paymentRows) {
      drawKeyValue(ctx, name, formatRp(amount), rightX + 26, py, sectionWidth - 52, { size: 20 });
      py += 39;
    }
  } else {
    text(ctx, 'Belum ada rincian pembayaran.', rightX + 26, py, { size: 19, color: BRAND_MUTED });
    py += 39;
  }
  const cashStartY = Math.max(1000, py + 8);
  ctx.strokeStyle = BRAND_BORDER; ctx.beginPath(); ctx.moveTo(rightX + 26, cashStartY - 27); ctx.lineTo(rightX + sectionWidth - 26, cashStartY - 27); ctx.stroke();
  drawKeyValue(ctx, 'Modal awal', formatRp(summary.startingCash), rightX + 26, cashStartY, sectionWidth - 52, { size: 20 });
  drawKeyValue(ctx, 'Kas seharusnya', formatRp(summary.expectedCash), rightX + 26, cashStartY + 39, sectionWidth - 52, { size: 20 });
  drawKeyValue(ctx, 'Kas aktual', formatRp(summary.actualCash), rightX + 26, cashStartY + 78, sectionWidth - 52, { size: 20 });
  drawKeyValue(ctx, 'Selisih', formatRp(summary.difference), rightX + 26, cashStartY + 117, sectionWidth - 52, { size: 21, boldLabel: true, boldValue: true, valueColor: Number(summary.difference || 0) === 0 ? BRAND_GREEN : BRAND_RED });

  roundRect(ctx, margin, 1170, contentWidth, 204, 24, BRAND_SOFT, '#FECACA');
  text(ctx, 'OPERASIONAL', margin + 28, 1213, { size: 21, weight: 900, color: BRAND_RED });
  drawKeyValue(ctx, 'Pengeluaran operasional', formatRp(summary.expenses), margin + 28, 1260, 485, { size: 20 });
  drawKeyValue(ctx, 'Piutang baru', formatRp(summary.newReceivable), margin + 28, 1302, 485, { size: 20 });
  drawKeyValue(ctx, 'Dana refund', formatRp(summary.refundPayout), margin + 588, 1260, 480, { size: 20 });
  drawKeyValue(ctx, 'Status kas', Number(summary.difference || 0) === 0 ? 'SESUAI' : 'PERLU CEK', margin + 588, 1302, 480, { size: 20, boldValue: true, valueColor: Number(summary.difference || 0) === 0 ? BRAND_GREEN : BRAND_RED });

  if (summary.notes) {
    roundRect(ctx, margin, 1405, contentWidth, 104, 20, '#F8FAFC', BRAND_BORDER);
    text(ctx, 'CATATAN', margin + 24, 1441, { size: 17, weight: 900, color: BRAND_MUTED });
    text(ctx, String(summary.notes).slice(0, 110), margin + 24, 1480, { size: 19, color: BRAND_DARK, maxWidth: contentWidth - 48 });
  }

  const footerY = 1585;
  ctx.strokeStyle = BRAND_BORDER; ctx.beginPath(); ctx.moveTo(margin, footerY); ctx.lineTo(canvas.width - margin, footerY); ctx.stroke();
  text(ctx, `Dokumen dibuat otomatis oleh Bumi Makmur POS v${APP_VERSION}`, margin, footerY + 43, { size: 17, weight: 700, color: BRAND_MUTED });
  text(ctx, formatDateTimeId(summary.generatedAt), canvas.width - margin, footerY + 43, { size: 17, weight: 700, color: BRAND_MUTED, align: 'right' });
  text(ctx, 'Data laporan berasal dari snapshot shift dan dapat dibuat ulang dari Riwayat Shift.', margin, footerY + 78, { size: 16, color: BRAND_MUTED });
  text(ctx, 'BUMI MAKMUR 2', canvas.width - margin, footerY + 78, { size: 17, weight: 900, color: BRAND_RED, align: 'right' });
  ctx.fillStyle = BRAND_RED; ctx.fillRect(0, canvas.height - 18, canvas.width, 18);
  ctx.fillStyle = BRAND_DARK; ctx.fillRect(0, canvas.height - 25, canvas.width, 7);
  return canvas;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.byteLength; }
  return output;
}

function buildJpegPdf(jpegBytes, imageWidth, imageHeight) {
  const enc = new TextEncoder();
  const parts = []; const offsets = [0]; let byteOffset = 0;
  const push = bytes => { const chunk = typeof bytes === 'string' ? enc.encode(bytes) : bytes; parts.push(chunk); byteOffset += chunk.byteLength; };
  const object = (id, before, binary = null, after = '') => {
    offsets[id] = byteOffset;
    push(`${id} 0 obj\n${before}`);
    if (binary) push(binary);
    push(`${after}\nendobj\n`);
  };
  push('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>\n');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
  object(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n');
  object(4, `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`, jpegBytes, '\nendstream');
  const content = enc.encode('q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n');
  object(5, `<< /Length ${content.byteLength} >>\nstream\n`, content, 'endstream');
  const xrefOffset = byteOffset;
  push('xref\n0 6\n0000000000 65535 f \n');
  for (let id = 1; id <= 5; id += 1) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob([concatBytes(parts)], { type: 'application/pdf' });
}

export async function createClosingPdfFile(summary) {
  let blob;
  try {
    const canvas = await renderClosingCanvas(summary);
    if (!canvas) throw new Error('Canvas PDF tidak tersedia.');
    const jpeg = await canvasToJpegBlob(canvas);
    blob = buildJpegPdf(new Uint8Array(await jpeg.arrayBuffer()), canvas.width, canvas.height);
  } catch (error) {
    console.warn('Renderer PDF profesional tidak tersedia; memakai renderer kompatibilitas.', error);
    blob = buildSimplePdf(makeFallbackPdfContent(summary));
  }
  const day = localDateKeyFromValue(summary.endAt, localDateKeyFromValue(summary.generatedAt, 'laporan'));
  const safeBranch = normalizeAscii(summary.branchName).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Bumi-Makmur';
  return new File([blob], `Tutup-Harian-${safeBranch}-${day}-${summary.shiftId}.pdf`, { type: 'application/pdf' });
}

export function buildClosingWhatsappText(summary) {
  return [
    `*Laporan Tutup Harian - ${summary.branchName}*`,
    formatDateTimeId(summary.endAt),
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
  const file = await createClosingPdfFile(summary);
  const textValue = buildClosingWhatsappText(summary);
  if (isNativeAndroid()) {
    const result = await shareNativePdf(file, { title: `Tutup Harian ${summary.branchName}`, text: textValue, preferWhatsApp: true });
    if (result?.shared === false) throw new Error(result?.error || 'Android tidak dapat membuka aplikasi untuk membagikan PDF.');
    return { method: 'native', shared: true, file };
  }
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title: `Tutup Harian ${summary.branchName}`, text: textValue, files: [file] });
    return { method: 'web-share', shared: true, file };
  }
  await downloadClosingPdf(summary, file);
  return { method: 'download', shared: false, file };
}

export async function downloadClosingPdf(summary, existingFile = null) {
  const file = existingFile || await createClosingPdfFile(summary);
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = file.name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return file;
}

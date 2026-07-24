import { formatRp } from '../utils/helpers.js';

export const normalizeWhatsappNumber = (value, defaultCountryCode = '62') => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits || digits === '0') return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `${defaultCountryCode}${digits.slice(1)}`;
  if (digits.startsWith(defaultCountryCode)) return digits;
  return digits;
};

export const buildReceiptText = (sale, configs = {}) => {
  const divider = '------------------------------';
  const items = (sale.items || []).flatMap(line => {
    const net = Number(line.price || 0) * Number(line.qty || 0) - Number(line.itemDiscount || 0);
    const detail = `${line.qty} ${line.unit || 'item'} x ${formatRp(line.price)}`;
    const extra = line.itemDiscount > 0 ? ` | diskon ${formatRp(line.itemDiscount)}` : '';
    return [`*${line.name}*`, `${detail}${extra}`, `= ${formatRp(net)}`];
  });
  const payments = (sale.payments || []).map(payment => `${payment.name}: ${formatRp(payment.amount)}`);
  const lines = [
    `*${configs.companyName || 'BUMI MAKMUR'}*`,
    configs.receiptHeader || 'Nota Pembelian',
    configs.address || '',
    configs.phone ? `Telp: ${configs.phone}` : '',
    divider,
    `No. Nota: ${sale.id}`,
    `Tanggal: ${new Date(sale.createdAt).toLocaleString('id-ID')}`,
    `Pelanggan: ${sale.customerName || 'Umum'}`,
    divider,
    ...items,
    divider,
    `Subtotal: ${formatRp(sale.subtotal)}`,
    sale.globalDiscount > 0 ? `Diskon: -${formatRp(sale.globalDiscount)}` : '',
    sale.promoDiscount > 0 ? `Promo: -${formatRp(sale.promoDiscount)}` : '',
    sale.loyaltyDiscount > 0 ? `Reward poin: -${formatRp(sale.loyaltyDiscount)}` : '',
    sale.tax > 0 ? `Pajak: ${formatRp(sale.tax)}` : '',
    sale.service > 0 ? `Service: ${formatRp(sale.service)}` : '',
    `*TOTAL: ${formatRp(sale.total)}*`,
    divider,
    ...payments,
    sale.change > 0 ? `Kembalian: ${formatRp(sale.change)}` : '',
    divider,
    configs.receiptMessage || configs.receiptFooter || 'Terima kasih telah berbelanja.',
    configs.receiptWhatsappNote || 'Simpan pesan ini sebagai bukti transaksi.'
  ];
  return lines.filter(Boolean).join('\n');
};

export const copyReceiptText = async (sale, configs) => {
  const text = buildReceiptText(sale, configs);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
};

export const openWhatsappReceipt = (sale, configs, phone = '') => {
  const number = normalizeWhatsappNumber(phone, configs.whatsappCountryCode || '62');
  const text = encodeURIComponent(buildReceiptText(sale, configs));
  const url = number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) window.location.href = url;
};

const loadImage = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = source;
});

const wrapCanvasText = (context, text, maxWidth) => {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !current) current = candidate;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
};

export const createReceiptImageFile = async (sale, configs = {}) => {
  if (typeof document === 'undefined') return null;
  const width = 900;
  const itemHeight = (sale.items || []).reduce((sum, line) => sum + 90 + Math.max(0, Math.ceil(String(line.name || '').length / 34) - 1) * 28, 0);
  const height = Math.max(1250, 760 + itemHeight + (sale.payments || []).length * 42);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#064e3b';
  context.fillRect(0, 0, width, 22);
  let y = 70;

  if (configs.receiptShowLogo !== false && configs.receiptLogo) {
    try {
      const logo = await loadImage(configs.receiptLogo);
      const size = 120;
      context.drawImage(logo, (width - size) / 2, y, size, size);
      y += 145;
    } catch {
      // Logo rusak tidak boleh menggagalkan pembuatan nota.
    }
  }

  context.textAlign = 'center';
  context.fillStyle = '#047857';
  context.font = '700 22px Arial';
  context.fillText(String(configs.receiptHeader || 'NOTA PEMBELIAN').toUpperCase(), width / 2, y);
  y += 42;
  context.fillStyle = '#111827';
  context.font = '900 42px Arial';
  context.fillText(configs.companyName || 'BUMI MAKMUR', width / 2, y);
  y += 38;
  context.fillStyle = '#4b5563';
  context.font = '22px Arial';
  for (const line of wrapCanvasText(context, configs.address || '', width - 160)) {
    context.fillText(line, width / 2, y);
    y += 28;
  }
  if (configs.phone) { context.fillText(`Telp: ${configs.phone}`, width / 2, y); y += 32; }
  context.strokeStyle = '#cbd5e1';
  context.setLineDash([10, 8]);
  context.beginPath(); context.moveTo(60, y); context.lineTo(width - 60, y); context.stroke();
  y += 42;

  context.textAlign = 'left';
  context.font = '700 22px Arial';
  context.fillStyle = '#111827';
  context.fillText(`No: ${sale.id}`, 60, y);
  context.textAlign = 'right';
  context.fillText(new Date(sale.createdAt).toLocaleString('id-ID'), width - 60, y);
  y += 36;
  context.textAlign = 'left';
  context.font = '22px Arial';
  context.fillStyle = '#374151';
  context.fillText(`Pelanggan: ${sale.customerName || 'Umum'}`, 60, y);
  y += 36;
  if (sale.cashierName) { context.fillText(`Kasir: ${sale.cashierName}`, 60, y); y += 36; }
  context.beginPath(); context.moveTo(60, y); context.lineTo(width - 60, y); context.stroke();
  y += 40;

  for (const item of sale.items || []) {
    context.textAlign = 'left';
    context.font = '700 24px Arial';
    context.fillStyle = '#111827';
    const nameLines = wrapCanvasText(context, item.name, 560);
    for (const line of nameLines) { context.fillText(line, 60, y); y += 30; }
    context.font = '21px Arial';
    context.fillStyle = '#6b7280';
    context.fillText(`${item.qty} ${item.unit || 'item'} × ${formatRp(item.price)}`, 60, y);
    context.textAlign = 'right';
    context.font = '700 23px Arial';
    context.fillStyle = '#111827';
    context.fillText(formatRp(Number(item.price || 0) * Number(item.qty || 0) - Number(item.itemDiscount || 0)), width - 60, y);
    y += 42;
  }

  context.beginPath(); context.moveTo(60, y); context.lineTo(width - 60, y); context.stroke();
  y += 40;
  const drawRow = (label, value, bold = false, color = '#111827') => {
    context.textAlign = 'left'; context.fillStyle = color; context.font = `${bold ? '900' : '400'} 23px Arial`; context.fillText(label, 60, y);
    context.textAlign = 'right'; context.fillText(value, width - 60, y); y += bold ? 48 : 36;
  };
  drawRow('Subtotal', formatRp(sale.subtotal));
  if (sale.globalDiscount > 0) drawRow('Diskon', `-${formatRp(sale.globalDiscount)}`, false, '#047857');
  if (sale.promoDiscount > 0) drawRow('Promo', `-${formatRp(sale.promoDiscount)}`, false, '#047857');
  if (sale.loyaltyDiscount > 0) drawRow('Reward Poin', `-${formatRp(sale.loyaltyDiscount)}`, false, '#a16207');
  if (sale.tax > 0) drawRow('Pajak', formatRp(sale.tax));
  if (sale.service > 0) drawRow('Service', formatRp(sale.service));
  context.fillStyle = '#064e3b'; context.fillRect(45, y - 10, width - 90, 74);
  context.fillStyle = '#ffffff'; context.font = '900 32px Arial'; context.textAlign = 'left'; context.fillText('TOTAL', 70, y + 38);
  context.textAlign = 'right'; context.fillText(formatRp(sale.total), width - 70, y + 38);
  y += 100;
  for (const payment of sale.payments || []) drawRow(payment.name, formatRp(payment.amount));
  if (sale.change > 0) drawRow('Kembalian', formatRp(sale.change), true, '#ea580c');
  y += 16;
  context.textAlign = 'center'; context.fillStyle = '#111827'; context.font = '700 22px Arial';
  for (const line of wrapCanvasText(context, configs.receiptFooter || 'Terima kasih telah berbelanja.', width - 140)) { context.fillText(line, width / 2, y); y += 30; }
  context.fillStyle = '#6b7280'; context.font = '19px Arial';
  for (const line of wrapCanvasText(context, configs.receiptMessage || '', width - 140)) { context.fillText(line, width / 2, y); y += 25; }
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob ? new File([blob], `Nota-${sale.id}.png`, { type: 'image/png' }) : null), 'image/png', 0.95));
};

export const shareReceipt = async (sale, configs) => {
  const text = buildReceiptText(sale, configs);
  if (navigator.share) {
    const file = await createReceiptImageFile(sale, configs);
    if (file && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: `Nota ${sale.id}`, text, files: [file] });
    } else {
      await navigator.share({ title: `Nota ${sale.id}`, text });
    }
    return true;
  }
  await copyReceiptText(sale, configs);
  return false;
};

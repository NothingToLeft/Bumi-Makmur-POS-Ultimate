import React from 'react';
import { formatRp } from '../utils/helpers.js';
import { formatQuantity } from '../utils/fractionalUnits.js';
import { getReceiptLogo, getReceiptPaymentSummary, receiptPaymentLabel } from '../services/receiptShare.js';
import { formatDateTimeId } from '../utils/temporal.js';

const dateText = value => formatDateTimeId(value, { fallback: '-' });

function MoneyRow({ label, value, strong = false, danger = false }) {
  return <div className={`receipt-pro-row ${strong ? 'is-strong' : ''} ${danger ? 'is-danger' : ''}`}>
    <span>{label}</span><b className="tabular-nums">{value}</b>
  </div>;
}

export default function ReceiptDocument({ sale = {}, configs = {}, compact = false, verified = false }) {
  const logo = getReceiptLogo(configs);
  const payment = getReceiptPaymentSummary(sale);
  const itemRows = sale.items || [];
  return <article className={`receipt-pro ${compact ? 'receipt-pro-compact' : ''}`}>
    <div className="receipt-pro-brandline"><span/><i/></div>
    <header className="receipt-pro-header">
      {logo && <img src={logo} alt="Logo Bumi Makmur 2" className="receipt-pro-logo"/>}
      <p className="receipt-pro-kicker">{String(configs.receiptHeader || 'Nota Pembelian').toUpperCase()}</p>
      <h2>{configs.companyName || 'BUMI MAKMUR'}</h2>
      {configs.address && <p>{configs.address}</p>}
      {configs.receiptShowStorePhone !== false && configs.phone && <p>Telp: {configs.phone}</p>}
      {verified && <div className="receipt-pro-verified">NOTA ONLINE TERVERIFIKASI</div>}
    </header>

    <section className="receipt-pro-identifiers">
      <div><span>No. Nota</span><b className="break-all">{sale.id || 'INV-PREVIEW-0001'}</b></div>
      <div><span>Tanggal</span><b>{dateText(sale.createdAt || new Date().toISOString())}</b></div>
      {configs.receiptShowCustomer !== false && <div><span>Pelanggan</span><b>{sale.customerName || 'Umum'}</b></div>}
      {configs.receiptShowCashier !== false && <div><span>Kasir</span><b>{sale.cashierName || '-'}</b></div>}
    </section>

    <section className="receipt-pro-section">
      <div className="receipt-pro-section-title"><span>Rincian Belanja</span><small>{itemRows.length} item</small></div>
      <div className="receipt-pro-items">
        {itemRows.map((line, index) => <div className="receipt-pro-item" key={line.lineId || line.id || index}>
          <div className="min-w-0">
            <b className="receipt-pro-item-name">{line.name || 'Item'}</b>
            <p>{formatQuantity(line.qty)} {line.unit || 'item'} × {formatRp(line.price)}</p>
            {Number(line.itemDiscount || 0) > 0 && <small>Diskon item -{formatRp(line.itemDiscount)}</small>}
          </div>
          <b className="receipt-pro-item-total tabular-nums">{formatRp(Number(line.price || 0) * Number(line.qty || 0) - Number(line.itemDiscount || 0))}</b>
        </div>)}
      </div>
    </section>

    <section className="receipt-pro-totals">
      <MoneyRow label="Subtotal" value={formatRp(sale.subtotal)}/>
      {Number(sale.globalDiscount || 0) > 0 && <MoneyRow danger label="Diskon" value={`-${formatRp(sale.globalDiscount)}`}/>} 
      {Number(sale.promoDiscount || 0) > 0 && <MoneyRow danger label="Promo" value={`-${formatRp(sale.promoDiscount)}`}/>} 
      {Number(sale.loyaltyDiscount || 0) > 0 && <MoneyRow label="Reward poin" value={`-${formatRp(sale.loyaltyDiscount)}`}/>} 
      {Number(sale.tax || 0) > 0 && <MoneyRow label="Pajak" value={formatRp(sale.tax)}/>} 
      {Number(sale.service || 0) > 0 && <MoneyRow label="Service" value={formatRp(sale.service)}/>} 
      <div className="receipt-pro-grand"><div><small>TOTAL TAGIHAN</small><b>TOTAL</b></div><strong className="tabular-nums">{formatRp(sale.total)}</strong></div>
    </section>

    {(configs.receiptShowPayment !== false || payment.hasChange) && <section className="receipt-pro-payment">
      <div className="receipt-pro-section-title"><span>Pembayaran</span><small>{payment.isPaid ? 'LUNAS' : 'BELUM LUNAS'}</small></div>
      {configs.receiptShowPayment !== false && <div className="receipt-pro-payment-rows">
        {payment.payments.map(row => <MoneyRow key={row.id} label={receiptPaymentLabel(row)} value={formatRp(row.amount)}/>) }
      </div>}
      {payment.hasChange ? <div className="receipt-pro-change">
        <span>KEMBALIAN</span>
        <strong className="tabular-nums">{formatRp(payment.change)}</strong>
        <small>Uang yang harus dikembalikan kepada pelanggan</small>
      </div> : payment.isPaid ? <div className="receipt-pro-paid">LUNAS · PEMBAYARAN PAS</div> : null}
    </section>}

    <footer className="receipt-pro-footer">
      <b>{configs.receiptFooter || 'Terima kasih telah berbelanja.'}</b>
      {configs.receiptMessage && <p>{configs.receiptMessage}</p>}
      <small>Bumi Makmur POS · Bukti transaksi digital</small>
    </footer>
  </article>;
}

import React, { useMemo } from 'react';
import { BarChart3, Clock3, Trophy, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { buildSalesInsights } from '../utils/salesInsights.js';
import { formatRp } from '../utils/helpers.js';
import { Card } from './ui.jsx';

const compactRp = value => {
  const number = Number(value) || 0;
  if (number >= 1e9) return `${(number / 1e9).toFixed(1).replace('.', ',')} M`;
  if (number >= 1e6) return `${(number / 1e6).toFixed(1).replace('.', ',')} jt`;
  if (number >= 1e3) return `${Math.round(number / 1e3)} rb`;
  return String(Math.round(number));
};

/** Wawasan penjualan 7 hari: tren, jam sibuk, produk terlaris, dan bauran pembayaran. */
export default function SalesInsightsPanel({ sales = [], refunds = [] }) {
  const insights = useMemo(() => buildSalesInsights(sales, refunds, { days: 7, hourDays: 30 }), [sales, refunds]);
  const maxRevenue = Math.max(1, ...insights.days.map(row => row.revenue));
  const change = insights.todayVsYesterday;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="p-5 xl:col-span-2">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div><h2 className="font-bold text-gray-800">Tren Penjualan 7 Hari</h2><p className="text-sm text-gray-500">Omzet neto setelah refund · rata-rata {formatRp(insights.averageTicket)} per transaksi</p></div>
          <BarChart3 className="text-emerald-600 shrink-0" />
        </div>
        <div className="flex items-end gap-2 h-36" role="img" aria-label="Grafik batang omzet 7 hari terakhir">
          {insights.days.map((row, position) => {
            const last = position === insights.days.length - 1;
            return (
              <div key={row.key} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1" title={`${row.key}: ${formatRp(row.revenue)} (${row.count} transaksi)`}>
                <span className="text-[10px] font-bold text-gray-500">{row.revenue > 0 ? compactRp(row.revenue) : ''}</span>
                <div className={`w-full rounded-t-lg ${last ? 'bg-emerald-600' : 'bg-emerald-200'}`} style={{ height: `${Math.max(row.revenue > 0 ? 6 : 2, (row.revenue / maxRevenue) * 100)}%` }} />
                <span className={`text-[11px] ${last ? 'font-black text-emerald-700' : 'text-gray-400'}`}>{row.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-gray-500">Total 7 hari <b className="text-gray-800">{formatRp(insights.periodRevenue)}</b></span>
          {change !== null && <span className={`inline-flex items-center gap-1 font-bold ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{change >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{change >= 0 ? '+' : ''}{change}% dibanding kemarin</span>}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><Clock3 size={18} className="text-blue-600" /><h3 className="font-bold text-gray-800">Jam Tersibuk</h3></div>
          {insights.peakHours.length === 0 ? <p className="text-sm text-gray-400">Belum cukup data (30 hari terakhir).</p> : <ul className="space-y-1.5">{insights.peakHours.map(row => <li key={row.hour} className="flex justify-between text-sm"><span className="font-bold text-gray-700">{String(row.hour).padStart(2, '0')}.00–{String((row.hour + 1) % 24).padStart(2, '0')}.00</span><span className="text-gray-500">{row.count} transaksi</span></li>)}</ul>}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><Trophy size={18} className="text-amber-500" /><h3 className="font-bold text-gray-800">Produk Terlaris</h3></div>
          {insights.topProducts.length === 0 ? <p className="text-sm text-gray-400">Belum ada penjualan 7 hari terakhir.</p> : <ol className="space-y-1.5">{insights.topProducts.map((row, position) => <li key={`${row.productId}-${position}`} className="flex justify-between gap-2 text-sm"><span className="truncate text-gray-700"><b className="text-gray-400 mr-1.5">{position + 1}</b>{row.name}</span><span className="shrink-0 font-bold text-gray-800">{formatRp(row.revenue)}</span></li>)}</ol>}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><CreditCard size={18} className="text-purple-600" /><h3 className="font-bold text-gray-800">Metode Pembayaran</h3></div>
          {insights.paymentMix.length === 0 ? <p className="text-sm text-gray-400">Belum ada pembayaran.</p> : <ul className="space-y-2">{insights.paymentMix.slice(0, 5).map(row => <li key={row.name} className="text-sm"><div className="flex justify-between"><span className="text-gray-700 truncate">{row.name}</span><b className="text-gray-800">{row.share}%</b></div><div className="h-1.5 rounded-full bg-gray-100 mt-1"><div className="h-full rounded-full bg-purple-500" style={{ width: `${row.share}%` }} /></div></li>)}</ul>}
        </Card>
      </div>
    </div>
  );
}

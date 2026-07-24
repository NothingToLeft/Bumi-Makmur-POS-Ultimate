import React, { useMemo } from 'react';
import { TrendingUp, ReceiptText, PackageSearch, WalletCards, AlertTriangle, Clock3, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { usePos } from '../store/PosContext.jsx';
import { isToday, formatRp } from '../utils/helpers.js';
import { Card, EmptyState, PageHeader, StatusBadge, SummaryCard } from '../components/ui.jsx';

export default function DashboardScreen() {
  const { scoped, currentUser, branch } = usePos();
  const stats = useMemo(() => {
    const sales = scoped.sales.filter(sale => isToday(sale.createdAt || sale.date) && !['VOIDED'].includes(sale.status));
    const revenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0) - Number(sale.refundedTotal || 0), 0);
    const hpp = sales.reduce((sum, sale) => sum + (sale.items || []).reduce((lineSum, line) => lineSum + Number(line.modalPrice || 0) * Number(line.baseQty || line.qty || 0), 0), 0);
    const expenses = scoped.expenses.filter(item => isToday(item.createdAt)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const lowStock = scoped.products.filter(product => product.active !== false && product.trackStock !== false && product.stock <= product.minStock);
    const openReceivables = scoped.receivables.filter(item => item.status === 'OPEN').reduce((sum, item) => sum + Number(item.balance || 0), 0);
    const openPayables = scoped.payables.filter(item => item.status === 'OPEN').reduce((sum, item) => sum + Number(item.balance || 0), 0);
    return { sales, revenue, hpp, expenses, lowStock, openReceivables, openPayables, profit: revenue - hpp - expenses };
  }, [scoped]);

  const activeShift = scoped.shifts.find(item => item.status === 'OPEN');
  const pendingOrders = scoped.orders.filter(item => ['NEW', 'PROCESSING'].includes(item.status));

  return (
    <div className="h-full overflow-y-auto bg-gray-50 generic-bg pb-24 md:pb-6">
      <PageHeader title={`Halo, ${currentUser.name}`} subtitle={`${branch?.name || 'Cabang'} · Ringkasan operasional hari ini`} />
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard title="Omzet Hari Ini" value={formatRp(stats.revenue)} icon={TrendingUp} tone="green" subtitle={`${stats.sales.length} transaksi`} />
          <SummaryCard title="Laba Kotor Hari Ini" value={formatRp(stats.profit)} icon={ArrowUpRight} tone={stats.profit >= 0 ? 'blue' : 'red'} subtitle="Setelah HPP & beban" />
          <SummaryCard title="Piutang Aktif" value={formatRp(stats.openReceivables)} icon={WalletCards} tone="orange" />
          <SummaryCard title="Hutang Pemasok" value={formatRp(stats.openPayables)} icon={PackageSearch} tone="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-gray-800">Transaksi Terbaru</h2><p className="text-sm text-gray-500">Aktivitas penjualan pada cabang aktif</p></div><ReceiptText className="text-emerald-600"/></div>
            {scoped.sales.length === 0 ? <EmptyState title="Belum ada transaksi" /> : <div className="divide-y divide-gray-100">{scoped.sales.slice(0,6).map(sale => <div key={sale.id} className="py-3 flex justify-between items-center gap-3"><div className="min-w-0"><p className="font-bold text-sm text-gray-800 truncate">{sale.id}</p><p className="text-xs text-gray-500 truncate">{sale.customerName || 'Umum'} · {new Date(sale.createdAt || sale.date).toLocaleString('id-ID')}</p></div><div className="text-right shrink-0"><p className="font-bold text-emerald-600">{formatRp(sale.total)}</p><StatusBadge status={sale.status}/></div></div>)}</div>}
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex gap-3"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeShift ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}><Clock3/></div><div><p className="font-bold text-gray-800">Status Shift</p><p className="text-sm text-gray-500">{activeShift ? `Aktif sejak ${new Date(activeShift.startAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}` : 'Belum ada shift aktif'}</p></div></div>
            </Card>
            <Card className="p-5">
              <div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center"><ShoppingBag/></div><div><p className="font-bold text-gray-800">Pesanan Online</p><p className="text-sm text-gray-500">{pendingOrders.length} perlu ditangani</p></div></div>
            </Card>
            <Card className="p-5">
              <div className="flex gap-3"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.lowStock.length ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}><AlertTriangle/></div><div><p className="font-bold text-gray-800">Stok Menipis</p><p className="text-sm text-gray-500">{stats.lowStock.length} produk perlu dibeli</p></div></div>
            </Card>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3"><AlertTriangle size={20} className="text-orange-500"/><h2 className="font-bold text-gray-800">Prioritas Stok</h2></div>
          {stats.lowStock.length === 0 ? <Card className="p-5 text-sm text-emerald-700 bg-emerald-50">Semua stok berada di atas batas minimum.</Card> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{stats.lowStock.slice(0,9).map(product => <Card key={product.id} className="p-4 flex items-center justify-between"><div className="min-w-0"><p className="font-bold text-sm text-gray-800 truncate">{product.name}</p><p className="text-xs text-gray-500">Rak {product.rack} · Minimum {product.minStock}</p></div><p className="font-black text-red-600 shrink-0">{product.stock} {product.baseUnit}</p></Card>)}</div>}
        </div>
      </div>
    </div>
  );
}

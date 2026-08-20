import React from 'react';
import { AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react';

export default class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorId: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
      errorId: `UI-${Date.now().toString(36).toUpperCase()}`
    };
  }

  componentDidCatch(error, info) {
    console.error('Bumi Makmur POS screen runtime error', error, info);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      // Navigasi ke modul lain harus selalu memulihkan area konten tanpa
      // memaksa reload seluruh POS atau membuang state transaksi lokal.
      this.setState({ error: null, errorId: '' });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = String(this.state.error?.message || 'Terjadi gangguan tampilan yang tidak terduga.');
    return <div className="h-full overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto rounded-3xl border border-red-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 bg-red-50 border-b border-red-100 flex gap-4 items-start">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0"><AlertTriangle size={24}/></div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.15em] text-red-600">Proteksi Tampilan Aktif</p>
            <h2 className="text-xl md:text-2xl font-black text-gray-950 mt-1">Halaman ini mengalami gangguan, tetapi aplikasi tetap aman</h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">Data lokal, transaksi, dan antrean sinkronisasi tidak dihapus. Gunakan tombol pemulihan di bawah atau pindah ke Kasir.</p>
          </div>
        </div>
        <div className="p-5 md:p-6 space-y-4">
          <div className="rounded-2xl bg-gray-50 border p-4">
            <p className="text-xs font-bold text-gray-500">Kode kejadian: {this.state.errorId}</p>
            <p className="text-sm text-gray-800 mt-2 break-words">{message}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => this.setState({ error: null, errorId: '' })} className="min-h-[48px] px-5 rounded-xl bg-gray-900 text-white font-black inline-flex items-center justify-center gap-2"><RefreshCw size={18}/> Coba Buka Lagi</button>
            {typeof this.props.onBack === 'function' && <button type="button" onClick={this.props.onBack} className="min-h-[48px] px-5 rounded-xl border bg-white text-gray-800 font-black inline-flex items-center justify-center gap-2"><ShoppingCart size={18}/> Kembali ke Kasir</button>}
            <button type="button" onClick={() => window.location.reload()} className="min-h-[48px] px-5 rounded-xl border bg-white text-gray-800 font-black">Muat Ulang Aplikasi</button>
          </div>
        </div>
      </div>
    </div>;
  }
}

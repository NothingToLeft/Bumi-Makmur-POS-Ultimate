import React from 'react';
import { X, Search, ChevronLeft, AlertCircle, CheckCircle2, Printer, Download } from 'lucide-react';
import { formatMoneyInput, formatRp, parseMoneyInput } from '../utils/helpers.js';

export function Button({ children, className = '', variant = 'primary', size = 'md', ...props }) {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300',
    orange: 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200',
    outline: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300',
    blue: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100'
  };
  const sizes = { sm: 'min-h-[40px] px-3 py-2 text-sm', md: 'min-h-[48px] px-4 py-2.5', lg: 'min-h-[56px] px-5 py-3 text-base' };
  return <button className={`rounded-xl font-bold transition-colors inline-flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
}

export function Field({ label, hint, children, className = '' }) {
  return <label className={`block ${className}`}><span className="field-label">{label}</span>{children}{hint && <span className="text-[11px] text-gray-400 mt-1 block">{hint}</span>}</label>;
}

export function Input(props) { return <input {...props} className={`field-input ${props.className || ''}`} />; }

const numericDraftValue = (value, zeroAsEmpty = false) => {
  if (value === '' || value === null || value === undefined) return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  if (zeroAsEmpty && number === 0) return '';
  return String(value);
};

export function NumberInput({
  value, onChange, onValueChange, onBlur, onFocus, className = '', min, max,
  allowNegative, allowEmpty = true, integer = false, zeroAsEmpty = false, inputMode = 'decimal', ...props
}) {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState(() => numericDraftValue(value, zeroAsEmpty));
  const permitsNegative = allowNegative ?? (min !== undefined && Number(min) < 0);

  React.useEffect(() => {
    if (!focused) setDraft(numericDraftValue(value, zeroAsEmpty));
  }, [value, focused, zeroAsEmpty]);

  const parseDraft = raw => {
    const normalized = String(raw ?? '').replace(',', '.');
    if (!normalized || normalized === '.' || normalized === '-' || normalized === '-.') return '';
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : '';
  };

  const handleChange = event => {
    const raw = event.target.value;
    const pattern = permitsNegative ? /^-?\d*(?:[.,]\d*)?$/ : /^\d*(?:[.,]\d*)?$/;
    if (!pattern.test(raw)) return;
    setDraft(raw);
    onChange?.(event);
    const parsed = parseDraft(raw);
    if (parsed === '') {
      if (allowEmpty) onValueChange?.('');
      return;
    }
    onValueChange?.(integer ? Math.trunc(parsed) : parsed);
  };

  const handleBlur = event => {
    setFocused(false);
    const parsed = parseDraft(draft);
    if (parsed === '') {
      if (!allowEmpty) {
        const fallback = Number.isFinite(Number(min)) ? Number(min) : 0;
        setDraft(String(fallback));
        onValueChange?.(fallback);
      } else {
        setDraft('');
        onValueChange?.('');
      }
      onBlur?.(event);
      return;
    }
    let committed = integer ? Math.trunc(parsed) : parsed;
    if (Number.isFinite(Number(min))) committed = Math.max(Number(min), committed);
    if (Number.isFinite(Number(max))) committed = Math.min(Number(max), committed);
    setDraft(zeroAsEmpty && committed === 0 ? '' : String(committed));
    onValueChange?.(committed);
    onBlur?.(event);
  };

  return <input
    {...props}
    type="text"
    inputMode={inputMode}
    value={draft}
    onChange={handleChange}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={handleBlur}
    aria-valuemin={min}
    aria-valuemax={max}
    className={`field-input tabular-nums ${className}`}
  />;
}

export function MoneyInput({ value, onValueChange, className = '', max = Number.MAX_SAFE_INTEGER, ...props }) {
  const displayValue = formatMoneyInput(value);
  const handleChange = event => {
    const parsed = Math.min(max, parseMoneyInput(event.target.value));
    onValueChange?.(parsed);
  };
  return <input {...props} type="text" inputMode="numeric" value={displayValue} onChange={handleChange} placeholder={props.placeholder ?? '0'} className={`field-input tabular-nums ${className}`} />;
}
export function Select(props) { return <select {...props} className={`field-input ${props.className || ''}`} />; }
export function Textarea(props) { return <textarea {...props} className={`field-input min-h-[96px] resize-y ${props.className || ''}`} />; }

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="bg-white border-b border-gray-100 p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm card-element premium-page-header flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {back && <button onClick={back} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><ChevronLeft /></button>}
        <div className="min-w-0"><h1 className="font-bold text-xl md:text-2xl text-gray-800 truncate">{title}</h1>{subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}</div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', onClick }) {
  return <div onClick={onClick} className={`bg-white border border-gray-100 rounded-2xl shadow-sm card-element ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}>{children}</div>;
}

export function Modal({ open = true, onClose, title, children, footer, size = 'lg', mobileSheet = true }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };
  return (
    <div className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center ${mobileSheet ? 'items-end md:items-center' : 'items-center'} p-0 md:p-4 animate-in fade-in`}>
      <div className={`bg-white w-full ${sizes[size]} ${mobileSheet ? 'rounded-t-3xl md:rounded-3xl' : 'rounded-3xl'} shadow-2xl max-h-[94vh] flex flex-col overflow-hidden modal-bg`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-lg text-gray-800">{title}</h2>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5">{children}</div>
        {footer && <div className="p-4 border-t border-gray-100 flex gap-2 justify-end flex-wrap shrink-0 pb-safe">{footer}</div>}
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700', green: 'bg-emerald-100 text-emerald-700', orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700', blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700', yellow: 'bg-yellow-100 text-yellow-700'
  };
  return <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-bold ${tones[tone] || tones.gray}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const map = {
    COMPLETED: ['Selesai', 'green'], PAID: ['Lunas', 'green'], LUNAS: ['Lunas', 'green'], OPEN: ['Aktif', 'blue'], NEW: ['Baru', 'blue'],
    RECEIVED: ['Diterima', 'green'], ORDERED: ['Dipesan', 'blue'], DRAFT: ['Draft', 'gray'], IN_POS: ['Di Kasir', 'purple'], PROCESSING: ['Diproses', 'orange'],
    PARTIAL_REFUND: ['Refund Sebagian', 'orange'], REFUNDED: ['Refund Penuh', 'red'], VOIDED: ['Dibatalkan', 'red'],
    CLOSED: ['Ditutup', 'gray'], PENDING: ['Menunggu', 'orange'], SYNCED: ['Tersinkron', 'green'], CANCELLED: ['Dibatalkan', 'red']
  };
  const [label, tone] = map[status] || [status || '-', 'gray'];
  return <Badge tone={tone}>{label}</Badge>;
}

export function SummaryCard({ title, value, icon: Icon, tone = 'green', subtitle }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700', orange: 'bg-orange-50 text-orange-700', blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700', purple: 'bg-purple-50 text-purple-700', gray: 'bg-gray-100 text-gray-700'
  };
  return <Card className="p-4 flex items-center gap-4 min-w-0"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon size={24}/></div><div className="min-w-0"><p className="text-xs text-gray-500 font-medium">{title}</p><p className="font-bold text-lg text-gray-800 truncate">{value}</p>{subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}</div></Card>;
}

export function EmptyState({ icon: Icon = AlertCircle, title = 'Belum ada data', subtitle, action }) {
  return <Card className="p-10 text-center flex flex-col items-center justify-center text-gray-400"><Icon size={48} className="mb-4 opacity-50"/><p className="font-bold text-gray-600">{title}</p>{subtitle && <p className="text-sm mt-1 max-w-md">{subtitle}</p>}{action && <div className="mt-4">{action}</div>}</Card>;
}

export function SearchBox({ value, onChange, placeholder = 'Cari...', ariaLabel, onKeyDown, className = '', inputProps = {} }) {
  return (
    <div className={`search-field flex-1 min-w-0 ${className}`}>
      <Search size={20} className="search-field-icon" aria-hidden="true"/>
      <input
        {...inputProps}
        type="search"
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        autoComplete="off"
        spellCheck="false"
        className={`field-input search-field-input ${inputProps.className || ''}`}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="search-field-clear" aria-label="Hapus pencarian">
          <X size={17}/>
        </button>
      )}
    </div>
  );
}

export function Money({ value, className = '' }) { return <span className={className}>{formatRp(value)}</span>; }

export function ConfirmBox({ title = 'Konfirmasi', message, onConfirm, onCancel, danger = false }) {
  return <Modal title={title} onClose={onCancel} size="sm" footer={<><Button variant="secondary" onClick={onCancel}>Batal</Button><Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>Ya, lanjutkan</Button></>}><div className="flex gap-3"><AlertCircle className={danger ? 'text-red-500' : 'text-orange-500'} /><p className="text-sm text-gray-600">{message}</p></div></Modal>;
}

export function ReceiptActions({ onPrint, onDownload }) {
  return <div className="flex gap-2"><Button variant="outline" onClick={onDownload}><Download size={18}/> Simpan</Button><Button onClick={onPrint}><Printer size={18}/> Cetak</Button></div>;
}

export function SuccessNotice({ children }) { return <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm flex gap-2"><CheckCircle2 size={18}/>{children}</div>; }

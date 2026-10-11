import React, { useMemo, useState } from 'react';
import { IDR_DENOMINATIONS, countDenominationPieces, normalizeDenominationCount, sumDenominations } from '../utils/cashDenominations.js';
import { formatRp } from '../utils/helpers.js';

/** Kalkulator pecahan uang untuk hitung kas fisik saat closing shift. */
export default function CashCounter({ onTotalChange }) {
  const [counts, setCounts] = useState({});
  const total = useMemo(() => sumDenominations(counts), [counts]);
  const pieces = useMemo(() => countDenominationPieces(counts), [counts]);
  const update = (denomination, raw) => {
    const next = { ...counts, [denomination]: raw === '' ? '' : normalizeDenominationCount(raw) };
    setCounts(next);
    onTotalChange?.(sumDenominations(next));
  };
  return (
    <div className="rounded-2xl border border-gray-200 p-3 mb-3" aria-label="Hitung kas per pecahan">
      <div className="grid grid-cols-2 gap-2">
        {IDR_DENOMINATIONS.map(denomination => (
          <label key={denomination} className="flex items-center justify-between gap-2 text-xs font-bold text-gray-600">
            <span className="shrink-0">{denomination.toLocaleString('id-ID')}</span>
            <span className="flex items-center gap-1">
              <span className="text-gray-400">×</span>
              <input
                type="number" inputMode="numeric" min="0" step="1"
                value={counts[denomination] ?? ''} placeholder="0"
                onChange={event => update(denomination, event.target.value)}
                className="field-input !w-20 !py-1.5 text-right"
                aria-label={`Jumlah lembar atau keping ${denomination}`}
              />
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-sm">
        <span className="text-gray-500">{pieces.toLocaleString('id-ID')} lembar/keping</span>
        <b className="text-emerald-700">{formatRp(total)}</b>
      </div>
    </div>
  );
}

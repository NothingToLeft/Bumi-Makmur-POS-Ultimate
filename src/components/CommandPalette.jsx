import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { MODULE_KEYWORDS, rankCommands } from '../utils/commandPalette.js';

/** Pencari menu cepat (Ctrl/Cmd + K): ketik nama menu atau istilah lalu Enter. */
export default function CommandPalette({ modules = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const items = useMemo(() => rankCommands(
    modules.map(module => ({ id: module.id, label: module.label, group: module.group || 'Menu', icon: module.icon, keywords: MODULE_KEYWORDS[module.id] || '' })),
    query
  ), [modules, query]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [index, items]);

  const onKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose?.(); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); setIndex(current => Math.min(items.length - 1, current + 1)); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); setIndex(current => Math.max(0, current - 1)); return; }
    if (event.key === 'Enter' && items[index]) { event.preventDefault(); onSelect?.(items[index].id); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4 bg-black/50 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div role="dialog" aria-modal="true" aria-label="Cari menu" className="w-full max-w-lg rounded-3xl bg-white modal-bg shadow-2xl overflow-hidden" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef} value={query} onChange={event => setQuery(event.target.value)}
            placeholder="Cari menu… (mis. refund, stok, closing)"
            className="flex-1 min-w-0 py-4 bg-transparent outline-none text-sm font-semibold"
            aria-label="Cari menu" role="combobox" aria-expanded="true" aria-controls="command-palette-list"
          />
          <kbd className="text-[10px] font-bold text-gray-400 border rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul id="command-palette-list" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-400">Menu tidak ditemukan.</li>}
          {items.map((item, position) => {
            const Icon = item.icon;
            const active = position === index;
            return (
              <li key={item.id} role="option" aria-selected={active} data-active={active}>
                <button
                  type="button" onClick={() => onSelect?.(item.id)} onMouseEnter={() => setIndex(position)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {Icon && <Icon size={18} className="shrink-0" />}
                  <span className="flex-1 min-w-0"><b className="block text-sm truncate">{item.label}</b><small className="text-gray-400">{item.group}</small></span>
                  {active && <CornerDownLeft size={14} className="text-emerald-600 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400 flex gap-3"><span>↑↓ pilih</span><span>Enter buka</span><span>Ctrl+K tutup/buka</span></div>
      </div>
    </div>
  );
}

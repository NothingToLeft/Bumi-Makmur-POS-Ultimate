import React, { useEffect, useState } from 'react';
import { Loader2, QrCode } from 'lucide-react';

export default function QrisCode({ payload, size = 260, className = '', alt = 'QRIS pembayaran', onDataUrl }) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const value = String(payload || '').trim();
      if (!value) { setDataUrl(''); setError(''); onDataUrl?.(''); return; }
      try {
        setError('');
        const module = await import('qrcode');
        const QRCode = module.default || module;
        const generated = await QRCode.toDataURL(value, {
          width: Math.max(180, Number(size) || 260),
          margin: 4,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        if (cancelled) return;
        setDataUrl(generated);
        onDataUrl?.(generated);
      } catch (err) {
        if (cancelled) return;
        setDataUrl('');
        setError(err?.message || 'QR pembayaran gagal dibuat.');
        onDataUrl?.('');
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [payload, size, onDataUrl]);

  if (error) return <div className={`flex flex-col items-center justify-center text-center bg-white text-red-700 p-4 ${className}`}><QrCode size={54}/><p className="text-xs font-bold mt-2">QR dinamis gagal dibuat</p></div>;
  if (!dataUrl) return <div className={`flex items-center justify-center bg-white text-gray-500 ${className}`}><Loader2 className="animate-spin" size={34}/></div>;
  return <img src={dataUrl} alt={alt} className={`object-contain bg-white ${className}`}/>;
}

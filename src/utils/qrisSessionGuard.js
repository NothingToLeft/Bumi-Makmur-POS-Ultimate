/**
 * Validation of QRIS session replay in one checkout and all locally known sales.
 * This guard complements (not replaces) merchant-bank verification and cross-device
 * atomic enforcement. It does not claim a merchant payment occurred.
 */
export function assertUniqueQrisSessions(payments = [], sales = []) {
  const used = new Set();
  for (const sale of sales || []) {
    for (const payment of sale?.payments || []) {
      const priorSession = String(payment?.qrisAssurance?.sessionId || '').trim();
      if (priorSession) used.add(priorSession);
    }
  }
  const checkoutSessions = new Set();
  for (const payment of payments || []) {
    if (payment?.methodId !== 'qris' && payment?.brand !== 'qris') continue;
    const session = String(payment?.qrisAssurance?.sessionId || '').trim();
    if (!session) throw new Error('Session ID assurance QRIS tidak tersedia.');
    if (checkoutSessions.has(session)) throw new Error('Sesi QRIS duplikat dalam transaksi ini. Buat sesi QRIS baru untuk setiap pembayaran.');
    if (used.has(session)) throw new Error('Sesi pembayaran QRIS ini sudah dipakai pada transaksi lain. Buka ulang pembayaran QRIS untuk transaksi baru.');
    checkoutSessions.add(session);
  }
  return true;
}

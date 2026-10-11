const MAX_AGE_MS = 3 * 60 * 1000;
export function createApprovalTickets({ generate, now = () => Date.now() } = {}) {
  if (typeof generate !== 'function') throw new Error('Generator tiket persetujuan wajib disediakan.');
  const tickets = new Map();
  const purge = () => { for (const [token, info] of tickets) if (now() > info.expiresAt) tickets.delete(token); };
  function issue({ userId, purpose }) {
    if (!userId || !purpose) throw new Error('Identitas dan tujuan approval wajib diisi.');
    purge();
    const token = generate();
    if (!token || tickets.has(token)) throw new Error('Token persetujuan tidak unik.');
    tickets.set(token, { userId: String(userId), purpose: String(purpose), expiresAt: now() + MAX_AGE_MS });
    return token;
  }
  function isValid({ token, userId, purpose }) {
    purge();
    const ticket = tickets.get(String(token || ''));
    return Boolean(ticket && ticket.userId === String(userId || '') && ticket.purpose === String(purpose || ''));
  }
  function consume(input) {
    if (!isValid(input)) throw new Error('Persetujuan Manager sudah kedaluwarsa atau tidak sesuai tindakan. Masukkan kembali PIN Manager.');
    tickets.delete(String(input.token));
    return true;
  }
  function discard(token) { tickets.delete(String(token || '')); }
  return { issue, isValid, consume, discard, clear: () => tickets.clear() };
}

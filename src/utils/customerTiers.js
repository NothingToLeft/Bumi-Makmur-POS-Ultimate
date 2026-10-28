// Tingkatan (tier) pelanggan untuk program loyalitas profesional.
// Modul ini murni perhitungan: tidak mengubah saldo poin, transaksi, atau
// aturan penukaran yang sudah berjalan. Dipakai untuk menampilkan status
// member dan progres menuju tier berikutnya.
export const CUSTOMER_TIERS = [
  { id: 'bronze', name: 'Bronze', minPoints: 0, benefit: 'Poin dasar' },
  { id: 'silver', name: 'Silver', minPoints: 1000, benefit: 'Prioritas antrean' },
  { id: 'gold', name: 'Gold', minPoints: 5000, benefit: 'Diskon member 2%' },
  { id: 'platinum', name: 'Platinum', minPoints: 15000, benefit: 'Diskon member 5%' }
];

const safePoints = value => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
};

export function resolveCustomerTier(points) {
  const balance = safePoints(points);
  let result = CUSTOMER_TIERS[0];
  for (const tier of CUSTOMER_TIERS) {
    if (balance >= tier.minPoints) result = tier;
  }
  return result;
}

export function nextCustomerTier(points) {
  const current = resolveCustomerTier(points);
  return CUSTOMER_TIERS.find(tier => tier.minPoints > current.minPoints) || null;
}

export function customerTierProgress(points) {
  const balance = safePoints(points);
  const current = resolveCustomerTier(balance);
  const next = nextCustomerTier(balance);
  if (!next) return { current, next: null, pointsToNext: 0, percent: 100 };
  const span = Math.max(1, next.minPoints - current.minPoints);
  const gained = Math.max(0, balance - current.minPoints);
  return {
    current,
    next,
    pointsToNext: Math.max(0, next.minPoints - balance),
    percent: Math.min(100, Math.round((gained / span) * 100))
  };
}

export function tierBadgeLabel(points) {
  const progress = customerTierProgress(points);
  return progress.next
    ? `${progress.current.name} · ${progress.pointsToNext} poin ke ${progress.next.name}`
    : `${progress.current.name} · tier tertinggi`;
}

export function formatPointsId(points) {
  return safePoints(points).toLocaleString('id-ID');
}

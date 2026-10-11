/** Pecahan uang Rupiah yang umum dipakai kasir, dari besar ke kecil. */
export const IDR_DENOMINATIONS = Object.freeze([100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100]);

export const normalizeDenominationCount = value => {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(number, 1000000);
};

/** Total uang dari peta { [pecahan]: jumlahLembar }. Pecahan tak dikenal diabaikan. */
export function sumDenominations(counts = {}, denominations = IDR_DENOMINATIONS) {
  return denominations.reduce((sum, denomination) => sum + denomination * normalizeDenominationCount(counts?.[denomination]), 0);
}

export const countDenominationPieces = (counts = {}, denominations = IDR_DENOMINATIONS) => (
  denominations.reduce((sum, denomination) => sum + normalizeDenominationCount(counts?.[denomination]), 0)
);

import { QRIS_MAX_AMOUNT, QRIS_MIN_AMOUNT, createDynamicQrisPayload, normalizeQrisAmount, qrisPayloadMeta } from '../utils/qrisDynamic.js';
import { generateId } from '../utils/helpers.js';

export const QRIS_ASSURANCE_SCHEMA_VERSION = 1;
export const QRIS_VERIFICATION_CONFIRMED = 'merchant-notification-confirmed';

export function isQrisPayment(payment) {
  return Boolean(payment && (payment.methodId === 'qris' || payment.brand === 'qris'));
}

export function validateQrisPaymentAmount(value) {
  try {
    return normalizeQrisAmount(value);
  } catch (error) {
    const message = error?.message || 'Nominal QRIS tidak valid.';
    if (/antara Rp/i.test(message)) throw new Error(`${message} Gunakan split payment bila nominal lebih besar.`);
    throw error;
  }
}

/**
 * Resolves what should be presented to the customer without changing merchant
 * account data. Dynamic generation stays local; static/physical QRIS remains a
 * fallback when the branch has not enabled or cannot generate dynamic QRIS.
 */
export function resolveQrisPresentation(payment, profile = {}, configs = {}) {
  if (!isQrisPayment(payment)) return null;
  const amount = validateQrisPaymentAmount(payment.amount);
  const merchantName = profile?.merchantName || configs?.qrisMerchantName || configs?.companyName || 'BUMI MAKMUR';
  const instruction = profile?.qrisInstruction || configs?.qrisInstruction || 'Scan QR lalu pastikan notifikasi pembayaran berhasil diterima kasir.';
  const sourcePayload = String(profile?.qrisPayload || '').trim();
  const staticImage = profile?.qrisImage || configs?.qrisImage || '';
  const dynamicRequested = profile?.qrisDynamicEnabled === true && profile?.qrisDynamicAcknowledged === true && Boolean(sourcePayload);

  if (dynamicRequested) {
    try {
      const payload = createDynamicQrisPayload(sourcePayload, amount);
      const sourceMeta = profile?.qrisPayloadMeta || qrisPayloadMeta(sourcePayload);
      return {
        mode: 'dynamic',
        amount,
        payload,
        staticImage,
        merchantName: sourceMeta?.merchantName || merchantName,
        merchantCity: sourceMeta?.merchantCity || '',
        sourceFingerprint: sourceMeta?.fingerprint || '',
        sourceCrc: sourceMeta?.crc || '',
        instruction,
        warning: ''
      };
    } catch (error) {
      return {
        mode: staticImage ? 'static-fallback' : 'physical-static-fallback',
        amount,
        payload: '',
        staticImage,
        merchantName,
        merchantCity: profile?.qrisPayloadMeta?.merchantCity || '',
        sourceFingerprint: profile?.qrisPayloadMeta?.fingerprint || '',
        sourceCrc: profile?.qrisPayloadMeta?.crc || '',
        instruction,
        warning: `QRIS dinamis tidak dapat dibuat: ${error?.message || 'payload sumber tidak valid'}. Gunakan QRIS statis dan tetap verifikasi notifikasi merchant.`
      };
    }
  }

  return {
    mode: staticImage ? 'static' : 'physical-static',
    amount,
    payload: '',
    staticImage,
    merchantName,
    merchantCity: profile?.qrisPayloadMeta?.merchantCity || '',
    sourceFingerprint: profile?.qrisPayloadMeta?.fingerprint || '',
    sourceCrc: profile?.qrisPayloadMeta?.crc || '',
    instruction,
    warning: profile?.qrisDynamicEnabled === true && profile?.qrisDynamicAcknowledged !== true
      ? 'QRIS dinamis belum diaktifkan karena hasil scan merchant belum diakui pada Pengaturan.'
      : ''
  };
}

export function buildQrisAssuranceRecord(payment, presentation, {
  cashierId = '', cashierName = '', branchId = '', now = new Date().toISOString()
} = {}) {
  if (!isQrisPayment(payment)) return null;
  if (!presentation) throw new Error('Presentasi QRIS tidak tersedia.');
  const amount = validateQrisPaymentAmount(payment.amount);
  const confirmed = payment.verification === QRIS_VERIFICATION_CONFIRMED;
  return {
    schemaVersion: QRIS_ASSURANCE_SCHEMA_VERSION,
    sessionId: payment.qrisSessionId || generateId('QRIS'),
    branchId,
    mode: presentation.mode,
    amount,
    merchantName: presentation.merchantName || '',
    merchantCity: presentation.merchantCity || '',
    sourceFingerprint: presentation.sourceFingerprint || '',
    sourceCrc: presentation.sourceCrc || '',
    generatedLocally: presentation.mode === 'dynamic',
    payloadStored: false,
    verification: {
      required: true,
      status: confirmed ? QRIS_VERIFICATION_CONFIRMED : 'not-confirmed',
      confirmedAt: confirmed ? (payment.confirmedAt || now) : '',
      confirmedBy: confirmed ? (payment.confirmedBy || cashierId) : '',
      confirmedByName: confirmed ? (payment.confirmedByName || cashierName) : '',
      reference: String(payment.reference || '').trim().slice(0, 120)
    },
    recordedAt: now
  };
}

export function sanitizePaymentForSale(payment, presentation, context = {}) {
  const base = {
    ...payment,
    amount: Number(payment.amount || 0),
    reference: String(payment.reference || '').trim().slice(0, 120)
  };
  delete base.qrisSessionId;
  delete base.qrisRequireConfirmation;
  delete base.confirmedAt;
  delete base.confirmedBy;
  delete base.confirmedByName;
  if (!isQrisPayment(payment)) {
    delete base.verification;
    return base;
  }
  base.qrisAssurance = buildQrisAssuranceRecord(payment, presentation, context);
  // Keep the compact verification marker for backward-compatible completeSale
  // guards while detailed audit data lives under qrisAssurance.
  base.verification = payment.verification || 'not-confirmed';
  return base;
}

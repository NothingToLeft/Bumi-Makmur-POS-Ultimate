const text = value => String(value ?? '').trim();
const safeDate = value => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export const SYNC_DIAGNOSTIC_LIMIT = 80;
export const FIRESTORE_RULESET_VERSION = '6.0.3';

export function normalizeSyncDiagnostics(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => ({
      ...item,
      id: text(item.id || `SYNC-DIAG-RECOVERED-${index}`),
      at: safeDate(item.at)?.toISOString() || new Date().toISOString(),
      level: ['error', 'warning', 'info'].includes(item.level) ? item.level : 'warning',
      category: text(item.category || 'network'),
      code: text(item.code || 'unknown'),
      message: text(item.message || 'Catatan sinkronisasi lama tidak memiliki pesan.'),
      action: text(item.action || 'Coba sinkronkan ulang.'),
      collection: text(item.collection),
      entityId: text(item.entityId),
      mutationId: text(item.mutationId),
      mutationAction: text(item.mutationAction),
      deviceId: text(item.deviceId),
      branchId: text(item.branchId),
      permanent: item.permanent === true,
      occurrences: Math.max(1, Number(item.occurrences || 1) || 1)
    }))
    .slice(0, SYNC_DIAGNOSTIC_LIMIT);
}

export function classifySyncError(error, context = {}) {
  const code = text(error?.code || context.code || 'unknown').replace(/^firestore\//, '');
  const message = text(error?.message || context.message || 'Gangguan sinkronisasi tidak dikenal.');
  const lower = `${code} ${message}`.toLowerCase();
  let category = 'network';
  let permanent = false;
  let action = 'Coba kembali saat koneksi stabil.';
  if (/permission-denied|insufficient permission|akses cloud ditolak|missing or insufficient/.test(lower)) {
    category = 'permission'; permanent = true; action = `Publikasikan Firestore Rules v${FIRESTORE_RULESET_VERSION} melalui workflow "Deploy Firebase Spark Rules". Jika masih ditolak, login ulang dengan akun pembuat mutation agar sesi/profil cocok. Data lokal tetap aman.`;
  } else if (/unauthenticated|auth\/|sesi|credential|kredensial/.test(lower)) {
    category = 'session'; permanent = true; action = 'Keluar lalu masuk kembali agar sesi cloud cocok dengan pengguna aktif.';
  } else if (/aborted|conflict|telah berubah|menggabungkan/.test(lower)) {
    category = 'conflict'; action = 'Perubahan akan digabungkan otomatis dan dicoba kembali.';
  } else if (/deadline|timeout|unavailable|network|offline|failed to fetch/.test(lower)) {
    category = 'network'; action = 'Data lokal tetap aman. Sambungkan internet lalu tekan Sinkronkan Sekarang.';
  } else if (/resource-exhausted|quota/.test(lower)) {
    category = 'quota'; permanent = true; action = 'Kurangi operasi besar dan periksa penggunaan Firebase Spark.';
  } else if (/invalid-argument|failed-precondition/.test(lower)) {
    category = 'data'; permanent = true; action = 'Periksa data yang terakhir diubah atau buka Audit Cloud.';
  }
  return {
    id: context.id || `SYNC-DIAG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: context.at || new Date().toISOString(),
    level: permanent ? 'error' : (category === 'conflict' ? 'info' : 'warning'),
    category,
    code,
    message,
    action,
    collection: text(context.collection || context.collectionName),
    entityId: text(context.entityId || context.idValue),
    mutationId: text(context.mutationId),
    mutationAction: text(context.mutationAction || context.actionName),
    deviceId: text(context.deviceId),
    branchId: text(context.branchId),
    permanent
  };
}

export function summarizePendingMutations(mutations = []) {
  const summary = { count: mutations.length, operations: 0, byAction: {}, byCollection: {}, oldestAt: '', newestAt: '' };
  const dates = [];
  for (const mutation of mutations) {
    const action = text(mutation?.action || 'UNKNOWN');
    summary.byAction[action] = (summary.byAction[action] || 0) + 1;
    summary.operations += Array.isArray(mutation?.operations) ? mutation.operations.length : 0;
    for (const operation of mutation?.operations || []) {
      const collection = text(operation?.collectionName || 'unknown');
      summary.byCollection[collection] = (summary.byCollection[collection] || 0) + 1;
    }
    const date = safeDate(mutation?.createdAt);
    if (date) dates.push(date);
  }
  dates.sort((a, b) => a - b);
  summary.oldestAt = dates[0]?.toISOString() || '';
  summary.newestAt = dates.at(-1)?.toISOString() || '';
  return summary;
}

export function buildSyncStatus({
  online = true,
  cloudReady = false,
  cloudSaving = false,
  pendingCount = 0,
  cloudError = '',
  authMatched = true,
  lastSuccessAt = '',
  lastAttemptAt = ''
} = {}) {
  const pending = Math.max(0, Number(pendingCount) || 0);
  if (!online) return {
    code: 'offline', tone: 'orange', title: 'Offline — data lokal aktif',
    detail: pending ? `${pending} pembaruan aman dan menunggu internet.` : 'Tidak ada pembaruan yang tertunda.',
    healthy: true, retryable: true, lastSuccessAt, lastAttemptAt
  };
  if (!authMatched) return {
    code: 'session-mismatch', tone: 'red', title: 'Sesi cloud perlu dihubungkan ulang',
    detail: 'Akun Firebase tidak cocok dengan pengguna POS yang aktif.', healthy: false, retryable: false, lastSuccessAt, lastAttemptAt
  };
  // Error cloud aktif harus menang atas status "sedang sinkron" atau antrean.
  // Sebelumnya permission-denied dapat terlihat sehat hanya karena masih ada queue.
  if (cloudError) return {
    code: 'degraded', tone: 'orange', title: 'Cloud perlu perhatian',
    detail: cloudError, healthy: false, retryable: true, lastSuccessAt, lastAttemptAt
  };
  if (cloudSaving) return {
    code: 'syncing', tone: 'blue', title: 'Menyinkronkan perubahan',
    detail: pending ? `${pending} pembaruan sedang diproses.` : 'Memeriksa data terbaru dari cloud.', healthy: true, retryable: false, lastSuccessAt, lastAttemptAt
  };
  if (pending > 0) return {
    code: 'queued', tone: 'orange', title: 'Menunggu sinkronisasi',
    detail: `${pending} pembaruan tersimpan lokal dan akan dikirim otomatis.`, healthy: true, retryable: true, lastSuccessAt, lastAttemptAt
  };
  if (cloudReady) return {
    code: 'synced', tone: 'green', title: 'Tersinkron',
    detail: lastSuccessAt ? `Cloud terakhir berhasil ${new Date(lastSuccessAt).toLocaleString('id-ID')}.` : 'Firebase dan cache lokal aktif.',
    healthy: true, retryable: false, lastSuccessAt, lastAttemptAt
  };
  return {
    code: 'local-only', tone: 'gray', title: 'Data lokal aktif',
    detail: 'Cloud belum tersambung, tetapi aplikasi tetap dapat digunakan.', healthy: true, retryable: true, lastSuccessAt, lastAttemptAt
  };
}

export function appendSyncDiagnostic(current = [], entry) {
  const safeCurrent = normalizeSyncDiagnostics(current);
  if (!entry) return safeCurrent;
  const signature = item => [
    item?.category, item?.code, item?.mutationAction, item?.collection,
    item?.entityId, item?.branchId
  ].map(text).join('|');
  const match = safeCurrent.find(item => signature(item) === signature(entry));
  if (match) {
    const merged = {
      ...match,
      ...entry,
      id: match.id,
      firstAt: match.firstAt || match.at,
      occurrences: Number(match.occurrences || 1) + 1
    };
    return [merged, ...safeCurrent.filter(item => item.id !== match.id)].slice(0, SYNC_DIAGNOSTIC_LIMIT);
  }
  const next = [{ ...entry, occurrences: 1 }, ...safeCurrent.filter(item => item.id !== entry.id)];
  return next.slice(0, SYNC_DIAGNOSTIC_LIMIT);
}

export function buildSyncDiagnosticsExport({ status, queue, queueOwnership, diagnostics, profile, deviceId, appVersion }) {
  return {
    exportedAt: new Date().toISOString(),
    appVersion,
    status,
    queue,
    queueOwnership: queueOwnership ? {
      totalCount: Number(queueOwnership.totalCount || 0),
      currentUserCount: Number(queueOwnership.currentUserCount || 0),
      otherUserCount: Number(queueOwnership.otherUserCount || 0),
      totalOperations: Number(queueOwnership.totalOperations || 0),
      currentUserOperations: Number(queueOwnership.currentUserOperations || 0),
      otherUserOperations: Number(queueOwnership.otherUserOperations || 0)
    } : null,
    profile: profile ? { id: profile.id, name: profile.name, role: profile.role, branchId: profile.branchId, storeId: profile.storeId } : null,
    deviceId: text(deviceId),
    diagnostics: normalizeSyncDiagnostics(diagnostics)
  };
}

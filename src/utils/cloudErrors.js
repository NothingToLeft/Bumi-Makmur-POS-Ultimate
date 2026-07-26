const normalize = value => String(value || '').trim();

export function cloudErrorCode(error) {
  return normalize(error?.code || error?.name).replace(/^firebase:/i, '').toLowerCase();
}

export function friendlyCloudError(error, fallback = 'Layanan cloud belum dapat digunakan. Data lokal tetap aman di perangkat.') {
  const code = cloudErrorCode(error);
  const message = normalize(error?.message).toLowerCase();

  if (code.includes('permission-denied') || /missing or insufficient permissions|insufficient permission/.test(message)) {
    return 'Akses cloud ditolak untuk akun ini. Masuk kembali melalui Login Owner atau Login Karyawan, lalu pastikan Firestore Rules terbaru sudah dipublikasikan.';
  }
  if (code.includes('unauthenticated') || code.includes('user-token-expired') || /requires recent authentication/.test(message)) {
    return 'Sesi cloud sudah berakhir. Silakan keluar lalu masuk kembali dengan email dan password akun ini.';
  }
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Email atau password tidak cocok. Periksa kembali akun Firebase yang digunakan.';
  }
  if (code.includes('email-already-in-use')) {
    return 'Email tersebut sudah dipakai akun lain. Gunakan email berbeda atau kirim reset password.';
  }
  if (code.includes('network-request-failed') || code.includes('unavailable') || /network|offline|failed to fetch/.test(message)) {
    return 'Koneksi ke Firebase terputus. Aplikasi tetap dapat digunakan offline dan akan mencoba sinkronisasi lagi otomatis.';
  }
  if (code.includes('deadline-exceeded') || /timeout|terlalu lama/.test(message)) {
    return 'Firebase terlalu lama merespons. Data lokal tetap aktif; coba sinkronkan kembali beberapa saat lagi.';
  }
  if (code.includes('quota-exceeded') || code.includes('resource-exhausted')) {
    return 'Batas penggunaan Firebase sementara tercapai. Data lokal tetap aman dan sinkronisasi akan dicoba kembali.';
  }
  if (code.includes('already-exists')) {
    return 'Data tersebut sudah tersedia di cloud. Muat ulang data sebelum mencoba lagi.';
  }
  if (code.includes('aborted') || /telah berubah di perangkat lain/.test(message)) {
    return 'Data berubah di perangkat lain. Sistem sedang menggabungkan perubahan dan akan mencoba kembali.';
  }

  // Pesan aplikasi yang sudah ramah boleh diteruskan, tetapi jangan tampilkan pesan mentah Firebase.
  const raw = normalize(error?.message);
  if (raw && !/firebase|firestore|missing or insufficient|permission-denied/i.test(raw)) return raw;
  return fallback;
}

export function isPermissionError(error) {
  const code = cloudErrorCode(error);
  const message = normalize(error?.message).toLowerCase();
  return code.includes('permission-denied') || /missing or insufficient permissions|insufficient permission/.test(message);
}

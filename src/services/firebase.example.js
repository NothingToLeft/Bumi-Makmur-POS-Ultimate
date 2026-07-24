/**
 * Adapter Firebase sengaja belum diaktifkan agar aplikasi tidak berpura-pura
 * melakukan sinkronisasi dan tidak menyimpan API key pengguna di repository.
 *
 * Saat Firebase siap, buat firebase.js dari file ini, instal firebase, lalu
 * implementasikan fungsi loadCloudSnapshot dan saveCloudSnapshot.
 */
export async function loadCloudSnapshot() {
  throw new Error('Firebase belum dikonfigurasi.');
}

export async function saveCloudSnapshot() {
  throw new Error('Firebase belum dikonfigurasi.');
}

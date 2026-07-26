# Audit & Bugfix Bumi Makmur POS FreeSync v4.4

## Masalah yang dilaporkan

1. Login Owner dan Karyawan berada pada satu layar dan tidak jelas.
2. Akun karyawan yang dibuat tidak terlihat tersimpan.
3. Halaman transaksi/karyawan menampilkan `Missing or insufficient permissions`.
4. Ikon pencarian bertumpuk dengan placeholder pada HP.
5. Pengelolaan karyawan seharusnya berada di dalam Pengaturan.

## Akar masalah

- Listener Firestore dapat mulai ketika profil PIN aktif tidak cocok dengan UID Firebase yang sedang login.
- Firestore Rules lama meminta `activeMember()` saat membaca profil sendiri dan bootstrap pertama, sehingga proses awal dapat saling bergantung.
- Komponen input memiliki padding global yang menimpa padding kiri khusus ikon pencarian.
- Alur pemasangan perangkat Owner dan karyawan menggunakan tombol umum yang sama.
- Pembuatan karyawan berada sebagai modul terpisah sehingga tidak terasa sebagai administrasi sistem.

## Perbaikan

- Login dipisahkan menjadi chooser Owner/Karyawan dengan validasi role end-to-end.
- Karyawan dibuat dari `Pengaturan → Karyawan` memakai secondary Firebase Auth app.
- Firestore Rules mengizinkan signed-in self-profile get dan bootstrap get, tetapi tetap melarang listing publik.
- Listener realtime memiliki UID guard sebelum membaca Firestore.
- Error Firebase diterjemahkan oleh `src/utils/cloudErrors.js`.
- SearchBox memakai struktur khusus dan CSS `padding-left: 3.1rem !important`.
- Restore/reset cloud hanya tampil untuk Owner.
- Changelog aplikasi dan test regresi v4.4 ditambahkan.

## Perlindungan data

- `DB_KEY` lokal v4.3 sengaja dipertahankan agar update APK tidak membuat database lokal baru.
- Package ID tetap `app.bumimakmur.pos`.
- Keystore lama harus tetap dipakai.
- Tidak ada fitur yang dihapus demi ukuran APK.
- Tidak ada Cloud Functions, Firebase Storage, Blaze, atau layanan berbayar.

## Verifikasi source

- Core tests: **65/65 lulus**.
- Static audit: **51 file JS/JSX/MJS**, 4 JSON, imports, secret scan, dan paid-service guard lulus.
- Parser sintaks JS/JSX/MJS: **0 error**.
- Build Vite/Android dilakukan oleh GitHub Actions `test-only` dan `android-release` setelah dependency registry tersedia.

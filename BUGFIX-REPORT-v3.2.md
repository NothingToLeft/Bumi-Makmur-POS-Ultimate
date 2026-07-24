# Bugfix Report v3.2

## Permintaan pengguna

- Permission kamera diminta sejak aplikasi pertama dibuka.
- Tombol Scan langsung dapat memakai kamera.
- Masalah tanda tangan APK diperbaiki agar update konsisten.
- Tambahkan login sidik jari atau pengenalan wajah.
- Audit ulang bug penting.

## Implementasi kamera

- Permission `android.permission.CAMERA` dipasang otomatis setelah project Capacitor Android dibuat.
- Plugin native memeriksa dan meminta runtime permission.
- App meminta permission saat startup sebelum layar login.
- Scanner meminta ulang izin sebelum `getUserMedia`, memilih kamera belakang, dan membersihkan stream saat modal ditutup.
- Error state menyediakan tombol Coba Lagi dan Pengaturan Android.

## Implementasi biometrik

- AndroidX Biometric ditambahkan saat build.
- BiometricPrompt sistem dipakai untuk sidik jari atau pengenalan wajah yang didukung perangkat.
- Aktivasi hanya dapat dilakukan setelah login PIN dan verifikasi biometrik.
- Mapping akun disimpan sebagai setting perangkat lokal; data biometrik tidak disimpan aplikasi.

## Release signing

- APK/AAB dibangun dengan release key tetap.
- Workflow pembuat key memakai format JKS dan menghasilkan secret sekali pakai.
- Build gagal dengan pesan jelas jika secrets belum dipasang.
- Signature diverifikasi dengan `apksigner` sebelum artifact diunggah.
- Version code berasal dari versi semantik: v3.2.0 → 30200.

## Audit stabilitas tambahan

- Nama produk dan karyawan wajib diisi.
- Karyawan baru wajib memiliki PIN dan PIN ganda ditolak.
- Kas masuk/keluar bernilai 0 ditolak.
- Transaksi ganda berdasarkan ID ditolak.
- Kelebihan pembayaran hanya boleh berasal dari tunai sebagai kembalian.
- Penukaran poin melebihi saldo ditolak.
- Refund wajib memiliki item dan alasan.
- Pembelian dihitung ulang di store, bukan mempercayai total dari UI.
- Nomor faktur ganda, item invalid, diskon berlebih, dan hutang tanpa jatuh tempo ditolak.
- Pembelian yang sudah diterima tidak dapat diedit; gunakan retur atau pembayaran hutang.
- Retur hanya berlaku pada pembelian yang sudah diterima dan wajib memiliki alasan.
- Stok opname kosong ditolak.

## Validasi

- 24 file JavaScript/JSX lolos transpile syntax check.
- Script Android lolos `node --check` dan diuji pada struktur Android mock.
- Manifest, dependency biometrik, MainActivity, plugin, signing hook, version code, dan version name berhasil diinjeksi.
- 14/14 pengujian Node lulus.
- Pembuatan, base64 encode/decode, dan pembacaan keystore JKS diuji berhasil.
- Full build dependency tidak dapat dijalankan lokal karena registry npm timeout; GitHub Actions menjadi verifikasi build Android final.

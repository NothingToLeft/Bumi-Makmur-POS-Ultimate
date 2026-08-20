# Implementation Notes — v6.2.0

## Architectural changes

### 1. Deterministic temporal normalization
`src/utils/temporal.js` menjadi sumber tunggal konversi timestamp dan comparator chronology. `normalizeDbShape()` menyortir collection timeline setelah setiap jalur masuk data: local cache, Firebase bootstrap, realtime listener, dan local commit.

Sort order tidak dianggap bagian dari identitas cloud; diff tetap berbasis entity ID sehingga normalisasi array tidak menghasilkan mutation palsu.

### 2. Explicit general customer selection
POS tidak lagi mengasumsikan index 0 sebagai pelanggan Umum. Resolver memilih `CUS-GENERAL`, lalu nama berawalan `Umum`, baru fallback kosong. Hal ini menghilangkan ketergantungan pada urutan snapshot Firestore.

### 3. Net payment accounting
Penerimaan pembayaran dipisahkan dari uang tender. Untuk cash payment, `sale.change` dikurangkan dari pembayaran Tunai sebelum analytics/closing. Refund mengurangi metode payout; VOID tidak diproses dua kali.

### 4. Closing PDF renderer
Renderer utama menggambar dokumen A4 ke Canvas menggunakan brand Bumi Makmur 2, kemudian menghasilkan JPEG dan membungkusnya ke PDF satu halaman menggunakan XObject DCTDecode. Renderer teks lama dipertahankan sebagai fallback kompatibilitas.

Tidak ada penyimpanan PDF di Firebase.

### 5. Firestore Timestamp compatibility
Date formatting dan perhitungan rentang shift menggunakan `toEpochMs()` sehingga mendukung `Timestamp`, bentuk serialisasi `{seconds,nanoseconds}`, ISO string, dan epoch.

## No destructive migration
Tidak ada perubahan Firestore schema atau rules. Existing queue/cache tetap dapat dibuka oleh normalizer v6.2.0.

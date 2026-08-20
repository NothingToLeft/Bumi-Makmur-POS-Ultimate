# Bumi Makmur POS v6.1.0 — Unified AutoSync

- Sinkronisasi dibuat transparan untuk kasir: bekerja offline bila perlu dan otomatis mengejar Firebase ketika online.
- Root cause `Missing or insufficient permissions` pada mutation receipt preflight Kasir diperbaiki.
- Semua data bisnis tetap cloud-backed; PDF, secret API key, cache, dan state sementara tidak memenuhi Firebase.
- Konfigurasi AI non-rahasia sekarang konsisten lintas perangkat.
- Seluruh fitur v6 sebelumnya tetap dipertahankan.

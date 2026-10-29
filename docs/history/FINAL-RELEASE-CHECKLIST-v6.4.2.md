# Final Release Checklist v6.4.2

- [x] Baseline Claude ditinjau; tidak menimpa file ZIP asal
- [x] Perbaikan refund modal per `lineId` dan tes perilaku
- [x] Proteksi QRIS duplikat dalam checkout dan tes perilaku
- [x] Tiket approval lokal purpose-bound dan single-use serta tes perilaku
- [x] CSV whitespace formula guard; impor dibatasi 10 MB
- [x] Versi package, APP_VERSION, VERSION.txt, PWA cache konsisten
- [ ] Install dependency dan commit `package-lock.json`
- [ ] Audit, tests, Vite build di CI online lengkap
- [ ] Build signed APK/AAB dan installer Windows
- [ ] Uji Firestore emulator, cloud/offline multi-device serta kebijakan server approval
- [ ] Evaluasi/migrasi library XLSX rentan
- [ ] Backup produksi, canary deploy, smoke-test dan rollback tervalidasi

# Update GitHub ke v4.5

1. Backup JSON dan pastikan antrean offline 0.
2. Ekstrak ZIP v4.5.
3. Upload seluruh isi ke repository lama dan timpa file yang sama.
4. Jangan upload `node_modules`, `.env`, JKS, APK, AAB, atau service-account JSON.
5. Commit:

```text
Bumi Makmur POS v4.5 professional login employee access UI audit
```

6. Jalankan berurutan:

```text
Build Bumi Makmur POS v4.5 → test-only
Deploy Firebase Spark Rules
Build Bumi Makmur POS v4.5 → android-release
```

Jangan membuat repository atau keystore baru.

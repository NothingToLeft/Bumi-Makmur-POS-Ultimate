# Update GitHub ke v4.3

1. Backup data aplikasi lama.
2. Ekstrak ZIP v4.3.
3. Upload seluruh isi ke repository lama dan timpa file yang sama.
4. Pastikan `.github/workflows/` berisi build, deploy rules, dan generate signing key.
5. Commit:

```text
Migrate to Spark FreeSync Web PC Android v4.3
```

Jalankan `test-only` dahulu. Jangan membuat repository atau keystore baru.

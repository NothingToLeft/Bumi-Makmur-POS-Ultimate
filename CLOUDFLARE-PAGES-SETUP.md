# Deploy Web & Aplikasi PC Gratis — Cloudflare Pages

Cloudflare Pages menjadi hosting utama karena project ini adalah React/Vite statis. Tidak diperlukan Cloud Functions, Firebase Storage, atau billing.

## 1. Hubungkan GitHub

Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → pilih repository Bumi Makmur POS.

## 2. Build settings

```text
Framework preset : Vite
Build command    : npm run build
Build output     : dist
Root directory   : /
Node version     : 22 (juga dikunci oleh file .node-version)
```

## 3. Environment variables

Masukkan variabel yang sama dengan `.env.example`:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_STORE_ID
VITE_FIREBASE_STORE_CODE
VITE_PUBLIC_APP_URL
```

Deploy pertama boleh memakai `VITE_PUBLIC_APP_URL` kosong. Setelah memperoleh URL `https://NAMA.pages.dev`, isi variabel tersebut dengan URL lengkap lalu **Retry deployment**.

## 4. Firebase Authorized Domain

Firebase Console → Authentication → Settings → Authorized domains → Add domain → masukkan domain `NAMA.pages.dev` tanpa `https://`.

## 5. Pasang di Windows

Buka URL melalui Edge/Chrome → menu aplikasi → **Install Bumi Makmur POS**. Aplikasi muncul di Start Menu/taskbar dan dibuka sebagai jendela standalone.

File `_redirects` dan `_headers` sudah disertakan agar route nota online, SPA, service worker, serta cache aset bekerja benar.

## Fallback gratis

- **Netlify**: `netlify.toml` disertakan; build `npm run build`, publish `dist`. Gunakan sebagai cadangan karena paket gratis memakai credit dan project dapat berhenti sementara saat kuota habis.
- **Firebase Hosting**: dapat dipakai pada Spark, tetapi kuota transfer gratis lebih sempit daripada Cloudflare Pages.
- **Vercel Hobby tidak dipilih** untuk POS toko karena paket Hobby ditujukan untuk penggunaan personal/non-komersial.

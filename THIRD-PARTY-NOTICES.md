# Third-Party Notices — QRIS Research for v6.4.0

Bumi Makmur POS v6.4.0 implements its QRIS runtime in its own JavaScript modules. The following open-source projects were reviewed as engineering references. They are not bundled as runtime dependencies.

## github.com/saquone/qris

Used as a reference for strict TLV failure behavior, CRC test vectors, and webhook SSRF-hardening patterns. A dummy merchant QRIS payload from its test fixture is reused in Bumi Makmur's regression test.

MIT License

Copyright (c) 2026 Saquone

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## verssache/qris-dinamis

Reviewed as a reference for static-to-dynamic QRIS workflow, metadata parsing, and local QR generation. MIT licensed, copyright (c) 2020 QRIS Dinamis. No source module from this project is shipped as a dependency.

## qbiz-qrisdinamis

Reviewed for invoice-state, webhook-signing, mutation-audit, and checkout UX concepts. MIT licensed, copyright (c) 2026 Ardian Ryan. Its unofficial Puppeteer/portal-scraping integration is explicitly excluded from Bumi Makmur POS.

## dynamic-qris / dyqris

Reviewed for idempotency, transaction expiry, orphan-payment, exact-amount collision and webhook-retry design. The archive's `package.json` declares MIT but does not contain a license file. No code from this archive is copied or bundled; concepts were independently reimplemented where appropriate.

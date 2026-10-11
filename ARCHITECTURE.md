# Bumi Makmur POS Architecture (v6.4.2 candidate)

Client applications share a React/Vite interface, packaged for Android via Capacitor and Windows via Electron. Cloudflare Pages serves Web/PWA; Firebase Authentication and Firestore are the configured Spark-only backend. Local browser/IndexedDB caches and mutation queue allow offline work and later sync. Source of truth for synchronized business records must be resolved by established cloud reconciliation logic, never replaced with stale local data.

The POS transaction path uses centralized `PosContext` operations for product, stock, sale, refund, shift and sync. Monetary refunds are validated in `computeRefundPlan` before and inside the state commit; displayed per-line refunds share `isSameSaleLine` logic. QRIS code construction is local and ledger records require an explicit merchant notification confirmation. QRIS session uniqueness is checked locally at each checkout but is **not bank authentication**.

A manager's locally verified PIN issues an ephemeral approval ticket (purpose/user-bound, 3 minutes, single-use). As the client is not trusted, this alone cannot replace cloud authorization for sensitive financial actions. Recommended future hardening: policy-driven Firestore rules and backend-verified workflow compatible with Spark or free alternatives, with offline conflict policy, threat model and emulator tests.

Schema, `DB_KEY`, Firestore rules and indexes remain unchanged from baseline. No new paid service is required.

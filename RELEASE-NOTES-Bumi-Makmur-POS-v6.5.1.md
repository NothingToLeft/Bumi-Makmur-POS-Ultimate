# Bumi Makmur POS v6.5.1

## Changes

- Online order modal uses bounded columns, a full-width product picker and add button, and a single column on phones/tablets. Forms and item names no longer force horizontal overflow on wide desktop viewports.
- New orders default to the general customer. Empty product catalogs disable Add. Failed saves keep the form open with an error message.
- Repeated conversion of an order reuses its existing open bill. Cancelled/completed/already-converted orders cannot create another bill locally. This is not a server-side concurrency guarantee.
- AI settings save multiple named connections locally, including model, endpoint, key and image preference. Selecting a connection activates it; the existing non-secret active preferences still sync across devices.
- Provider/endpoint changes no longer reuse another connection's API key. Cloud preferences cannot inject a key. Gemini-only web image search rejects other provider credentials before sending requests.
- OpenAI-compatible product analysis now receives the full expected JSON schema. Connection URLs reject embedded credentials, query strings and unsupported protocols.
- API key storage description now accurately states local storage, without claiming encryption. Keys and saved profiles are excluded from the cloud settings whitelist.
- Form labels link to their input controls. Product picker alignment and touch targets improved.
- Security updates: Capacitor 7.6.10, Electron 43.8.4, Vite 6.4.5, PostCSS 8.5.32 and official SheetJS 0.20.3. Business database keys and schemas remain unchanged.

## Validation and limits

See `docs/QA-v6.5.1.md` for commands and evidence. Actual provider keys, production writes, QRIS, real printers/scanners and physical Android devices require separate verification. Existing manager approval and cross-device QRIS replay limitations remain.

## Rollback

Restore previous source commit `7e748ca17399632cda1efaf1440ee90f36f7a414` and rebuild. No business-data migration is required. Keep browser/IndexedDB storage intact. Saved AI profiles are local to each device; enter keys separately on other devices.

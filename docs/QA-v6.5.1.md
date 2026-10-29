# QA v6.5.1 — 2026-10-29

## Baseline and scope

Reviewed public repository HEAD `7e748ca`, prior project conversation, supplied DeepSeek session archive and project engineering instructions. Repository already contained v6.5.0 single active-provider support. This update continues that source rather than reconstructing v6.4.2. Screenshots supplied by the user match the order-modal overflow and older Gemini-only settings.

## Automated checks

- Core regression suite: `node --test tests/*.test.mjs`.
- Production web build, JSX parsing, import checks, secret scan and Spark architecture checks: `npm run build`.
- Added behavior tests for multiple local profiles, credential isolation on cloud/provider changes, unsafe URLs, actual JSON response parsing, duplicate order conversion and SheetJS workbook export/import round trip.
- Responsive browser harness: `node scripts/qa-responsive.mjs`. Requires Playwright (`PLAYWRIGHT_MODULE` can point at an existing installation) and Chrome (`CHROME_PATH` overrides the default Windows path). Harness creates temporary files, uses fake inventory and mocked AI, and removes its temporary entry points afterward. No production business writes.
- Browser sizes: 360×800, 412×915, 768×1024, 1024×768, 1440×900, 1920×1080, 915×412. Checks add/save/delete order, decimal quantity and amount, default general customer, provider persistence across reload, switching keys, mocked connection test, secret exclusion, runtime errors and horizontal overflow. Screenshots/results generated outside the repository under `inspection/bumi-ui` in the parent workspace.

## Security findings

Initial `npm audit`: 12 package findings (2 critical, 9 high, 1 moderate). After compatible updates: 4 high, 0 critical, 0 moderate. Remaining chain: firebase → @firebase/firestore / compat → @grpc/grpc-js 1.9.16. Firestore pins `~1.9.0`; npm suggests an unsuitable Firebase downgrade. No forced override or downgrade applied. gRPC is part of the Node distribution; web builds use the browser implementation. This does not establish safety for future Node-side Firebase use.

SheetJS 0.20.3 uses the official distribution documented at https://docs.sheetjs.com/docs/getting-started/installation/nodejs/. OpenAI-compatible payload and Groq/OpenRouter endpoint formats were checked against official documentation.

## Known limits

- This suite does not prove all POS functions or all multi-device conflicts are bug-free.
- Saved AI keys are in local storage, accessible to scripts in the app origin. Profiles stay local; only active non-secret preferences sync. Changing provider on another device requires a matching saved local key or entering one.
- Custom APIs must accept browser CORS requests; image analysis requires a vision-capable model. Arbitrary provider protocols such as native Anthropic Messages are not supported; use an OpenAI-compatible gateway.
- No actual paid/provider request, production transaction, Firebase rules deployment or database migration was performed.
- Firestore emulator/rules behavior, actual Android installation, Windows installer execution, scanner, printer and real QRIS payment remain unverified.
- Existing client-generated manager approval and local-only QRIS replay checks remain architectural limitations.
- Main web bundle still exceeds Vite's 500 kB advisory. Bundle splitting was not mixed into this functional correction.

## Release evidence

Final command counts, clean-install result and remote pipeline status are recorded in `PROJECT_STATUS.md`. Do not interpret earlier release documents as current test evidence.

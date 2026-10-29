# Implementation Notes — v6.1.1 Sync Transaction Hardening

## Architectural decision

Firestore write authorization and offline conflict detection are separate concerns. A brand-new document does not have a remote version to compare against, so reading its target before CREATE is unnecessary and can conflict with branch-scoped read authorization.

`operationRequiresRemotePrecondition(operation)` is now the single source of truth:

- CREATE (`beforeData == null`) → no target pre-read
- UPDATE (`beforeData != null`) → remote precondition read
- DELETE → remote precondition read

The same policy is used both by `persistOperations()` and `refreshOperationsAgainstCloud()` so initial writes and conflict recovery behave consistently.

## Security properties retained

- Firebase Auth identity remains required.
- Firestore CREATE/UPDATE/DELETE Rules remain authoritative.
- `mutationReceipts` continues to provide mutation-level idempotency.
- `auditLogs` continues to store actor and device metadata.
- Cross-user offline queue ownership is retained.
- No `allow write: if signedIn()` fallback was introduced.

## Storage policy

Business data remains synchronized through Firestore. PDF files remain local/on-demand. Gemini API key, transient cache/session data, and device-only secrets remain local by design.

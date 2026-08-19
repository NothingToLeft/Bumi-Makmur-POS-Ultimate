# Folder Structure Delta v6.0.3

```text
src/
  services/
    customerDisplayBridge.js   # transport snapshot multi-channel Web/Desktop
    offlineStore.js             # queue ownership per user tanpa migrasi destruktif
  screens/
    DesktopCustomerDisplayScreen.jsx
    DeviceSettingsScreens.jsx
  store/
    PosContext.jsx             # user-scoped queue flush + cloud-health + display publishing
  utils/
    syncDiagnostics.js         # ruleset marker + status priority

electron/
  main.cjs                     # IPC customer display + latest snapshot
  preload.cjs                  # secure bridge API

firestore.rules                # BUMI_MAKMUR_RULESET_VERSION=6.0.3
.github/workflows/
  deploy-firebase.yml          # Spark-only rules/index deployment
```

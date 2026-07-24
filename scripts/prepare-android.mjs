import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url);
let manifest = await readFile(manifestPath, 'utf8');

const entries = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.INTERNET" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
  '<uses-feature android:name="android.hardware.usb.host" android:required="false" />',
  '<uses-feature android:name="android.hardware.camera.any" android:required="false" />'
];

for (const entry of entries) {
  const identifier = entry.match(/android:name="([^"]+)"/)?.[1];
  if (identifier && !manifest.includes(identifier)) {
    manifest = manifest.replace(/<manifest([^>]*)>/, `<manifest$1>
    ${entry}`);
  }
}

await writeFile(manifestPath, manifest);
console.log('Android permissions and optional hardware features prepared.');

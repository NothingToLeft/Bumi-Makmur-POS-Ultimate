import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = path.join(rootDir, 'android');
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
const appGradlePath = path.join(androidDir, 'app', 'build.gradle');
const versionPath = path.join(rootDir, 'VERSION.txt');

const read = file => readFile(file, 'utf8');
const versionName = (await read(versionPath)).trim();
const [major = 0, minor = 0, patch = 0] = versionName.split('.').map(value => Number.parseInt(value, 10) || 0);
const versionCode = major * 10000 + minor * 100 + patch;

async function findFile(dir, filename) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFile(fullPath, filename);
      if (found) return found;
    } else if (entry.name === filename) {
      return fullPath;
    }
  }
  return null;
}

function permissionStateJava() {
  return `
    private String permissionStateName(PermissionState state) {
        if (state == PermissionState.GRANTED) return "granted";
        if (state == PermissionState.DENIED) return "denied";
        if (state == PermissionState.PROMPT_WITH_RATIONALE) return "prompt-with-rationale";
        return "prompt";
    }

    private void resolveCameraPermission(PluginCall call) {
        PermissionState state = getPermissionState("camera");
        JSObject result = new JSObject();
        result.put("state", permissionStateName(state));
        result.put("granted", state == PermissionState.GRANTED);
        call.resolve(result);
    }
`;
}

const nativePluginSource = packageName => `package ${packageName};

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.concurrent.Executor;

@CapacitorPlugin(
    name = "BumiMakmurNative",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
    }
)
public class BumiMakmurNativePlugin extends Plugin {
${permissionStateJava()}
    @PluginMethod
    public void checkCameraPermission(PluginCall call) {
        resolveCameraPermission(call);
    }

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            resolveCameraPermission(call);
            return;
        }
        requestPermissionForAlias("camera", call, "cameraPermissionCallback");
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        resolveCameraPermission(call);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception exception) {
            JSObject result = new JSObject();
            result.put("opened", false);
            result.put("error", exception.getMessage());
            call.resolve(result);
        }
    }

    private int allowedAuthenticators() {
        return BiometricManager.Authenticators.BIOMETRIC_STRONG |
            BiometricManager.Authenticators.BIOMETRIC_WEAK;
    }

    private String biometricStatus(int code) {
        if (code == BiometricManager.BIOMETRIC_SUCCESS) return "available";
        if (code == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) return "none-enrolled";
        if (code == BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE) return "no-hardware";
        if (code == BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE) return "hardware-unavailable";
        if (code == BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED) return "security-update-required";
        if (code == BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED) return "unsupported";
        if (code == BiometricManager.BIOMETRIC_STATUS_UNKNOWN) return "unknown";
        return "unavailable";
    }

    private String biometricMessage(int code) {
        if (code == BiometricManager.BIOMETRIC_SUCCESS) return "Sidik jari atau pengenalan wajah siap digunakan.";
        if (code == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) return "Daftarkan sidik jari atau pengenalan wajah di Pengaturan Android terlebih dahulu.";
        if (code == BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE) return "Perangkat tidak memiliki sensor biometrik yang didukung.";
        if (code == BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE) return "Sensor biometrik sedang tidak tersedia.";
        return "Biometrik tidak tersedia pada perangkat ini.";
    }

    @PluginMethod
    public void biometricAvailability(PluginCall call) {
        int code = BiometricManager.from(getContext()).canAuthenticate(allowedAuthenticators());
        JSObject result = new JSObject();
        result.put("available", code == BiometricManager.BIOMETRIC_SUCCESS);
        result.put("status", biometricStatus(code));
        result.put("message", biometricMessage(code));
        call.resolve(result);
    }

    @PluginMethod
    public void authenticateBiometric(PluginCall call) {
        int code = BiometricManager.from(getContext()).canAuthenticate(allowedAuthenticators());
        if (code != BiometricManager.BIOMETRIC_SUCCESS) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("status", biometricStatus(code));
            result.put("error", biometricMessage(code));
            call.resolve(result);
            return;
        }

        FragmentActivity activity = (FragmentActivity) getActivity();
        Executor executor = ContextCompat.getMainExecutor(activity);
        activity.runOnUiThread(() -> {
            BiometricPrompt prompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult authenticationResult) {
                    super.onAuthenticationSucceeded(authenticationResult);
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("cancelled", false);
                    call.resolve(result);
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    super.onAuthenticationError(errorCode, errString);
                    boolean cancelled = errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                        errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                        errorCode == BiometricPrompt.ERROR_CANCELED;
                    JSObject result = new JSObject();
                    result.put("success", false);
                    result.put("cancelled", cancelled);
                    result.put("errorCode", errorCode);
                    result.put("error", errString == null ? "Biometrik gagal." : errString.toString());
                    call.resolve(result);
                }
            });

            String title = call.getString("title", "Buka Bumi Makmur POS");
            String subtitle = call.getString("subtitle", "Gunakan sidik jari atau pengenalan wajah perangkat.");
            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setAllowedAuthenticators(allowedAuthenticators())
                .setNegativeButtonText("Gunakan PIN")
                .setConfirmationRequired(false)
                .build();
            prompt.authenticate(promptInfo);
        });
    }
}
`;

let manifest = await read(manifestPath);
const manifestEntries = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.INTERNET" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.USE_BIOMETRIC" />',
  '<uses-permission android:name="android.permission.USE_FINGERPRINT" android:maxSdkVersion="28" />',
  '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
  '<uses-feature android:name="android.hardware.usb.host" android:required="false" />',
  '<uses-feature android:name="android.hardware.camera.any" android:required="false" />',
  '<uses-feature android:name="android.hardware.fingerprint" android:required="false" />'
];

for (const entry of manifestEntries) {
  const identifier = entry.match(/android:name="([^"]+)"/)?.[1];
  if (identifier && !manifest.includes(identifier)) {
    manifest = manifest.replace(/<manifest([^>]*)>/, `<manifest$1>\n    ${entry}`);
  }
}
await writeFile(manifestPath, manifest);

let appGradle = await read(appGradlePath);
appGradle = appGradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
appGradle = appGradle.replace(/versionName\s+["'][^"']+["']/, `versionName "${versionName}"`);
if (!appGradle.includes('androidx.biometric:biometric')) {
  appGradle = appGradle.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.biometric:biometric:1.1.0"');
}
if (!appGradle.includes("apply from: 'signing.gradle'")) {
  appGradle += "\napply from: 'signing.gradle'\n";
}
await writeFile(appGradlePath, appGradle);

const signingGradle = `def bmKeystorePath = System.getenv("BM_KEYSTORE_PATH")
if (bmKeystorePath) {
    android {
        signingConfigs {
            bmRelease {
                storeFile file(bmKeystorePath)
                storePassword System.getenv("BM_KEYSTORE_PASSWORD")
                keyAlias System.getenv("BM_KEY_ALIAS")
                keyPassword System.getenv("BM_KEY_PASSWORD")
            }
        }
        buildTypes {
            release {
                signingConfig signingConfigs.bmRelease
            }
        }
    }
}
`;
await writeFile(path.join(androidDir, 'app', 'signing.gradle'), signingGradle);

const mainActivityPath = await findFile(path.join(androidDir, 'app', 'src', 'main', 'java'), 'MainActivity.java');
if (!mainActivityPath) throw new Error('MainActivity.java tidak ditemukan setelah Capacitor Android dibuat.');
let mainActivity = await read(mainActivityPath);
const packageName = mainActivity.match(/package\s+([\w.]+);/)?.[1];
if (!packageName) throw new Error('Package MainActivity tidak dapat dibaca.');

if (!mainActivity.includes('registerPlugin(BumiMakmurNativePlugin.class)')) {
  if (!mainActivity.includes('import android.os.Bundle;')) {
    mainActivity = mainActivity.replace(/(package\s+[\w.]+;)/, '$1\n\nimport android.os.Bundle;');
  }
  const classPattern = /public class MainActivity extends BridgeActivity\s*\{\s*\}/;
  const classBody = `public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BumiMakmurNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}`;
  if (classPattern.test(mainActivity)) {
    mainActivity = mainActivity.replace(classPattern, classBody);
  } else {
    mainActivity = mainActivity.replace(/public class MainActivity extends BridgeActivity\s*\{/, `public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(BumiMakmurNativePlugin.class);\n        super.onCreate(savedInstanceState);\n    }`);
  }
  await writeFile(mainActivityPath, mainActivity);
}

const pluginPath = path.join(path.dirname(mainActivityPath), 'BumiMakmurNativePlugin.java');
await mkdir(path.dirname(pluginPath), { recursive: true });
await writeFile(pluginPath, nativePluginSource(packageName));

console.log(`Android camera permission, biometric plugin, release signing, and version ${versionName} (${versionCode}) prepared.`);

package com.wallgo.game;

import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    purgeStaleWebViewServiceWorkersAndCache();
    super.onCreate(savedInstanceState);
    try {
      if (this.bridge != null && this.bridge.getWebView() != null) {
        this.bridge.getWebView().clearCache(true);
      }
    } catch (Exception ignored) {
    }
  }

  private void purgeStaleWebViewServiceWorkersAndCache() {
    try {
      File dataDir = new File(getApplicationInfo().dataDir);
      File webViewDir = new File(dataDir, "app_webview");
      boolean upgraded = isAppUpgraded();

      if (webViewDir.exists()) {
        purgeMatchingWebViewDirs(webViewDir, upgraded);
      }
      if (upgraded) {
        deleteRecursive(getCacheDir());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          deleteRecursive(getCodeCacheDir());
        }
      }
    } catch (Exception ignored) {
    }
  }

  private boolean isAppUpgraded() {
    try {
      PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
      long currentVersionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
          ? pInfo.getLongVersionCode()
          : pInfo.versionCode;
      SharedPreferences prefs = getSharedPreferences("wallgo_native_prefs", MODE_PRIVATE);
      long lastVersionCode = prefs.getLong("last_version_code", -1L);
      if (lastVersionCode != currentVersionCode) {
        prefs.edit().putLong("last_version_code", currentVersionCode).apply();
        return true;
      }
    } catch (Exception ignored) {
    }
    return false;
  }

  private void purgeMatchingWebViewDirs(File dir, boolean includeHttpCache) {
    File[] children = dir.listFiles();
    if (children == null) return;
    for (File child : children) {
      if (!child.isDirectory()) continue;
      String name = child.getName();
      boolean isServiceWorkerDir =
          "Service Worker".equals(name) || "CacheStorage".equals(name);
      boolean isCacheDir =
          includeHttpCache &&
          ("Cache".equals(name) ||
           "Code Cache".equals(name) ||
           "GPUCache".equals(name) ||
           "ScriptCache".equals(name));
      if (isServiceWorkerDir || isCacheDir) {
        deleteRecursive(child);
      } else {
        purgeMatchingWebViewDirs(child, includeHttpCache);
      }
    }
  }

  private void deleteRecursive(File fileOrDir) {
    if (fileOrDir == null || !fileOrDir.exists()) return;
    if (fileOrDir.isDirectory()) {
      File[] children = fileOrDir.listFiles();
      if (children != null) {
        for (File child : children) {
          deleteRecursive(child);
        }
      }
    }
    fileOrDir.delete();
  }
}

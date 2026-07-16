# Cordova Android 15 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the project from `cordova-android` 7.1.4 to 15.0.0, preserve its legacy TensorFlow integration, and provide a reliable Windows launcher.

**Architecture:** Keep the Web App unchanged and replace only the generated Android platform and plugin set. Pin maintained plugins in `package.json`, vendor the unavailable TensorFlow plugin under `local-plugins/`, and let Cordova regenerate `platforms/` and `plugins/` from those declarations.

**Tech Stack:** Node.js `>=20.17.0 || >=22.9.0`, Cordova CLI 13.0.0, cordova-android 15.0.0, JDK 17, Android SDK / Build Tools 36, Gradle wrapper 8.14.2, Android Gradle Plugin 8.10.1, Windows batch.

## Global Constraints

- Minimum supported Android version is Android 7.0 (API 24).
- Keep Cordova CLI exactly at 13.0.0 and cordova-android exactly at 15.0.0.
- Use JDK 17 and Android SDK / Build Tools 36.
- Preserve the existing TensorFlow JavaScript API, model flow, JAR, and `armeabi-v7a` native library.
- Do not change application behavior, model initialization, camera flow, CSP, or allow-list policy in this upgrade.
- Do not add new runtime abstractions or dependencies beyond the Android platform and plugins listed below.
- Preserve existing file encodings and use minimal patches for existing files.

---

## File Map

- `package.json`: exact platform/plugin dependency declarations and Cordova restore metadata.
- `package-lock.json`: reproducible npm resolution for the exact dependency set.
- `config.xml`: explicit API 24 floor and removal of the deprecated whitelist plugin declaration.
- `local-plugins/cordova-plugin-tensorflow/`: canonical checked-in copy of the unavailable TensorFlow plugin and its native assets.
- `platforms/`: regenerated cordova-android 15 platform currently tracked by this repository.
- `plugins/`: regenerated installed plugin set currently tracked by this repository.
- `run.bat`: Windows JDK 17 setup and project-local Cordova launcher.
- `README.md`: supported toolchain and Windows run instructions.
- `history.md`: completed upgrade decisions, verification evidence, and remaining real-device check.

### Task 1: Make Android plugins reproducible

**Files:**
- Create: `local-plugins/cordova-plugin-tensorflow/LICENSE`
- Create: `local-plugins/cordova-plugin-tensorflow/package.json`
- Create: `local-plugins/cordova-plugin-tensorflow/plugin.xml`
- Create: `local-plugins/cordova-plugin-tensorflow/README.md`
- Create: `local-plugins/cordova-plugin-tensorflow/www/tensorflow.js`
- Create: `local-plugins/cordova-plugin-tensorflow/src/android/TensorFlow.java`
- Create: `local-plugins/cordova-plugin-tensorflow/src/android/tf_libs/Classifier.java`
- Create: `local-plugins/cordova-plugin-tensorflow/src/android/tf_libs/TensorFlowImageClassifier.java`
- Create: `local-plugins/cordova-plugin-tensorflow/src/android/tf_libs/libandroid_tensorflow_inference_java.jar`
- Create: `local-plugins/cordova-plugin-tensorflow/src/android/tf_libs/armeabi-v7a/libtensorflow_inference.so`
- Create: `local-plugins/cordova-plugin-tensorflow/src/ios/TensorFlow.h`
- Create: `local-plugins/cordova-plugin-tensorflow/src/ios/TensorFlow.mm`
- Create: `local-plugins/cordova-plugin-tensorflow/src/ios/tf_libs/ios_image_load.h`
- Create: `local-plugins/cordova-plugin-tensorflow/src/ios/tf_libs/ios_image_load.mm`
- Create: `local-plugins/cordova-plugin-tensorflow/src/ios/tf_libs/tensorflow_utils.h`
- Create: `local-plugins/cordova-plugin-tensorflow/src/ios/tf_libs/tensorflow_utils.mm`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `config.xml`

**Interfaces:**
- Consumes: the exact checked-in plugin at `plugins/cordova-plugin-tensorflow/`.
- Produces: `file:local-plugins/cordova-plugin-tensorflow`, plugin id `cordova-plugin-tensorflow`, and ABI output `armeabi-v7a` for Task 2.

- [ ] **Step 1: Run a manifest assertion that proves the old state fails**

```powershell
node -e "const a=require('node:assert/strict');const p=require('./package.json');a.equal(p.devDependencies['cordova-android'],'15.0.0');a.ok(!p.devDependencies['cordova-plugin-whitelist']);a.deepEqual(p.cordova.platforms,['android'])"
```

Expected: FAIL because `cordova-android` is not yet declared and the whitelist plugin is still present.

- [ ] **Step 2: Copy the TensorFlow plugin to its canonical local source**

```powershell
New-Item -ItemType Directory -Force -Path local-plugins | Out-Null
Copy-Item -LiteralPath plugins\cordova-plugin-tensorflow -Destination local-plugins\cordova-plugin-tensorflow -Recurse
```

Expected: all 16 source/native files exist under `local-plugins/cordova-plugin-tensorflow/`; the 9 MB JAR/SO files are copied byte-for-byte.

- [ ] **Step 3: Correct the vendored native ABI destination**

Change this exact line in `local-plugins/cordova-plugin-tensorflow/plugin.xml`:

```xml
<source-file src="src/android/tf_libs/armeabi-v7a/libtensorflow_inference.so" target-dir="libs/armeabi-v7a" />
```

Expected: cordova-android 15 maps the file to `app/src/main/jniLibs/armeabi-v7a/` instead of the obsolete `armeabi` ABI directory.

- [ ] **Step 4: Install and pin the supported platform/plugin packages**

```powershell
npm uninstall --save-dev cordova-plugin-whitelist
npm install --save-dev --save-exact cordova-android@15.0.0 cordova-plugin-camera-preview@0.14.0 cordova-plugin-file@8.1.3 cordova-plugin-file-transfer@2.0.0 cordova-plugin-zip@3.1.0 .\local-plugins\cordova-plugin-tensorflow
```

Expected: `package-lock.json` changes; `npm` reports no install error.

- [ ] **Step 5: Set the exact Cordova restore metadata in `package.json`**

The final `devDependencies` and `cordova` blocks must be:

```json
"devDependencies": {
    "cordova-android": "15.0.0",
    "cordova-plugin-camera-preview": "0.14.0",
    "cordova-plugin-file": "8.1.3",
    "cordova-plugin-file-transfer": "2.0.0",
    "cordova-plugin-tensorflow": "file:local-plugins/cordova-plugin-tensorflow",
    "cordova-plugin-zip": "3.1.0"
},
"cordova": {
    "plugins": {
        "cordova-plugin-camera-preview": {},
        "cordova-plugin-file": {},
        "cordova-plugin-file-transfer": {},
        "cordova-plugin-tensorflow": {},
        "cordova-plugin-zip": {}
    },
    "platforms": [
        "android"
    ]
}
```

Expected: no `cordova-plugin-whitelist` entry remains in `package.json`.

- [ ] **Step 6: Declare API 24 and remove the obsolete plugin from `config.xml`**

Delete:

```xml
<plugin name="cordova-plugin-whitelist" spec="1" />
```

Add immediately after `<content src="index.html" />`:

```xml
<preference name="android-minSdkVersion" value="24" />
```

Expected: existing access and intent rules remain byte-for-byte unchanged.

- [ ] **Step 7: Verify the reproducible dependency state**

```powershell
node -e "const a=require('node:assert/strict');const p=require('./package.json');a.equal(p.devDependencies['cordova-android'],'15.0.0');a.equal(p.devDependencies['cordova-plugin-tensorflow'],'file:local-plugins/cordova-plugin-tensorflow');a.ok(!p.devDependencies['cordova-plugin-whitelist']);a.deepEqual(p.cordova.platforms,['android'])"
npm ci --no-audit --no-fund
npm audit
git diff --check
```

Expected: assertions pass, clean install succeeds, audit reports `0 vulnerabilities`, and `git diff --check` reports no errors.

- [ ] **Step 8: Commit the reproducible plugin source**

```powershell
git add -- package.json package-lock.json config.xml local-plugins/cordova-plugin-tensorflow
git commit -m "Make Cordova Android plugins reproducible"
```

Expected: one commit containing dependency declarations and the preserved TensorFlow source/native assets.

### Task 2: Regenerate and build cordova-android 15

**Files:**
- Modify: `platforms/`
- Modify: `plugins/`

**Interfaces:**
- Consumes: exact package specs and `file:local-plugins/cordova-plugin-tensorflow` from Task 1.
- Produces: installed platform `android 15.0.0`, installed plugin versions listed below, and `platforms/android/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 1: Confirm the checked-in platform is still the failing baseline**

```powershell
npx cordova platform ls
```

Expected before regeneration: installed platform reports `android 7.1.4`.

- [ ] **Step 2: Remove the old Android platform using Cordova**

```powershell
npx cordova platform remove android --nosave
```

Expected: `platforms/android/` is removed while `package.json` still declares Android 15.0.0.

- [ ] **Step 3: Safely clear the generated plugin cache**

```powershell
$root = (Resolve-Path .).Path
$pluginsPath = (Resolve-Path .\plugins).Path
if ((Split-Path -Parent $pluginsPath) -ne $root) { throw "Refusing to remove plugins outside workspace" }
Remove-Item -LiteralPath $pluginsPath -Recurse -Force
```

Expected: only `D:\mytools\myTen\plugins` is removed; `local-plugins/` remains intact.

- [ ] **Step 4: Add Android 15 and the exact plugin set**

```powershell
npx cordova platform add android@15.0.0 --nosave
npx cordova plugin add cordova-plugin-camera-preview@0.14.0 --nosave
npx cordova plugin add cordova-plugin-file@8.1.3 --nosave
npx cordova plugin add cordova-plugin-file-transfer@2.0.0 --nosave
npx cordova plugin add cordova-plugin-zip@3.1.0 --nosave
npx cordova plugin add .\local-plugins\cordova-plugin-tensorflow --nosave
npx cordova prepare android
```

Expected: all commands exit 0; TensorFlow sees File Transfer and Zip as already installed dependencies.

- [ ] **Step 5: Assert platform, plugins, and TensorFlow ABI placement**

```powershell
$platforms = npx cordova platform ls
$plugins = npx cordova plugin ls
if ($platforms -notmatch 'android 15\.0\.0') { throw $platforms }
foreach ($line in @(
    'cordova-plugin-camera-preview 0.14.0',
    'cordova-plugin-file 8.1.3',
    'cordova-plugin-file-transfer 2.0.0',
    'cordova-plugin-tensorflow 0.0.1',
    'cordova-plugin-zip 3.1.0'
)) { if ($plugins -notmatch [regex]::Escape($line)) { throw "Missing plugin: $line" } }
if ($plugins -match 'cordova-plugin-whitelist') { throw 'Deprecated whitelist plugin is still installed' }
if (-not (Test-Path platforms\android\app\src\main\jniLibs\armeabi-v7a\libtensorflow_inference.so)) { throw 'TensorFlow armeabi-v7a library was not packaged' }
```

Expected: no output and exit code 0.

- [ ] **Step 6: Select JDK 17 and verify Android requirements**

```powershell
$env:CORDOVA_JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:JAVA_HOME = $env:CORDOVA_JAVA_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
npx cordova requirements android
```

Expected: Java JDK, Android SDK, Android target, and Gradle all report installed.

- [ ] **Step 7: Build the debug APK**

```powershell
npx cordova build android
if (-not (Test-Path platforms\android\app\build\outputs\apk\debug\app-debug.apk)) { throw 'Debug APK was not produced' }
```

Expected: Gradle reports `BUILD SUCCESSFUL` and the APK assertion passes.

- [ ] **Step 8: Commit the regenerated Android platform and plugins**

```powershell
git add -- platforms plugins
git commit -m "Upgrade Android platform to Cordova 15"
```

Expected: one commit replaces the Android 7.1.4 generated platform/plugin state with Android 15.0.0.

### Task 3: Add the Windows one-command launcher

**Files:**
- Modify: `run.bat`

**Interfaces:**
- Consumes: `%CORDOVA_JAVA_HOME%` when supplied, otherwise `%ProgramFiles%\Java\jdk-17`, plus the project-local `npx cordova` command.
- Produces: `run.bat [cordova run options]` with the same exit code returned by Cordova.

- [ ] **Step 1: Run a launcher-content check that proves the old script fails**

```powershell
$bat = Get-Content -Raw run.bat
if ($bat -notmatch 'CORDOVA_JAVA_HOME' -or $bat -notmatch 'npx cordova run android' -or $bat -notmatch '%ERRORLEVEL%') { exit 1 }
```

Expected: exit code 1 because the current script only contains `cordova run android`.

- [ ] **Step 2: Replace `run.bat` with the minimal JDK 17 launcher**

```bat
@echo off
setlocal
cd /d "%~dp0"

if not defined CORDOVA_JAVA_HOME set "CORDOVA_JAVA_HOME=%ProgramFiles%\Java\jdk-17"
if not exist "%CORDOVA_JAVA_HOME%\bin\java.exe" (
    echo JDK 17 not found: "%CORDOVA_JAVA_HOME%"
    exit /b 1
)

set "JAVA_HOME=%CORDOVA_JAVA_HOME%"
set "PATH=%JAVA_HOME%\bin;%PATH%"

call npx cordova run android %*
exit /b %ERRORLEVEL%
```

Expected: the script stays ASCII-compatible and uses Windows CRLF line endings.

- [ ] **Step 3: Verify both launcher branches without starting a device build**

```powershell
$bat = Get-Content -Raw run.bat
if ($bat -notmatch 'CORDOVA_JAVA_HOME' -or $bat -notmatch 'npx cordova run android' -or $bat -notmatch '%ERRORLEVEL%') { exit 1 }
cmd /d /c "set CORDOVA_JAVA_HOME=C:\missing-jdk-17&&run.bat --help"
if ($LASTEXITCODE -ne 1) { throw "Missing-JDK branch returned $LASTEXITCODE" }
cmd /d /c "run.bat --help"
if ($LASTEXITCODE -ne 0) { throw "Launcher help returned $LASTEXITCODE" }
```

Expected: the first invocation prints `JDK 17 not found`, and the second prints Cordova run help with exit code 0.

- [ ] **Step 4: Commit the launcher**

```powershell
git add -- run.bat
git commit -m "Add Windows Cordova Android launcher"
```

Expected: one commit changes only `run.bat`.

### Task 4: Document and re-verify the upgraded workflow

**Files:**
- Modify: `README.md`
- Modify: `history.md`

**Interfaces:**
- Consumes: verified versions and command results from Tasks 1–3.
- Produces: clone/install/run instructions and an accurate maintenance record.

- [ ] **Step 1: Update the project status and version table in `README.md`**

Replace the old-platform status with:

```markdown
目前 Android 建置基線已恢復：Node 依賴可乾淨安裝，`cordova-android` 已升至 15.0.0，Windows 可使用 `run.bat` 以 JDK 17 執行。TensorFlow 外掛仍使用舊版 32-bit `armeabi-v7a` 推論庫，需在支援 32-bit App 的 Android 實機完成分類 smoke test。
```

Use this exact table:

```markdown
| 項目 | 專案內版本 |
| --- | --- |
| Node.js | `>=20.17.0 || >=22.9.0` |
| JDK | 17 |
| Cordova CLI | 13.0.0 |
| cordova-android | 15.0.0 |
| Android compile / target SDK | 36 |
| Android Gradle Plugin | 8.10.1 |
| Gradle wrapper | 8.14.2 |
| TensorFlow Cordova plugin | 0.0.1（本地保存） |
| Camera Preview plugin | 0.14.0 |
```

Expected: README no longer claims Android 7.1.4 or API 27 is current.

- [ ] **Step 2: Replace the install/run section in `README.md`**

````markdown
## Windows 安裝與執行

需求：Node.js 20.17+（或 22.9+）、JDK 17、Android SDK Platform 36、Build Tools 36.0.0，以及可從 `PATH` 找到的 Gradle。

```powershell
npm ci
.\run.bat
```

`run.bat` 預設使用 `%ProgramFiles%\Java\jdk-17`。若 JDK 位於別處，先設定 `CORDOVA_JAVA_HOME`：

```powershell
$env:CORDOVA_JAVA_HOME = 'D:\path\to\jdk-17'
.\run.bat
```

額外的 Cordova run 參數可直接附在後面，例如 `run.bat --device`。
````

Expected: the documented default matches the batch file exactly.

- [ ] **Step 3: Record completion and remaining device risk in `history.md`**

Add a new `2026-07-16：cordova-android 15 升級` section containing these facts:

```markdown
### 已完成

- 將 `cordova-android` 由 7.1.4 直接升至 15.0.0，最低 Android 版本調整為 7.0（API 24）。
- 將 Camera Preview、File、File Transfer、Zip 升至已固定版本，移除已棄用的 Whitelist plugin。
- 將 TensorFlow 0.0.1 外掛與原生檔保存至 `local-plugins/`，並修正 `armeabi-v7a` 打包路徑。
- 新增 Windows `run.bat`，預設使用 JDK 17 與專案內 Cordova CLI。

### 驗證結果

- `npm ci --no-audit --no-fund`：成功。
- `npm audit`：0 件 vulnerability。
- `npx cordova requirements android`：JDK、Android SDK、Android target 與 Gradle 均通過。
- `npx cordova build android`：成功產生 `platforms/android/app/build/outputs/apk/debug/app-debug.apk`。
- `run.bat --help`：成功，且 JDK 路徑錯誤時會回傳 exit code 1。

### 尚待實機確認

- 在支援 32-bit App 的 Android 7.0+ 實機驗證相機預覽、模型下載、解壓縮、TensorFlow 載入與分類；目前原生推論庫只有 `armeabi-v7a`。
```

Mark the two P1 entries for the Android platform upgrade and reproducible plugin declarations as complete; leave the real-device smoke test open.

- [ ] **Step 4: Run the full final verification**

```powershell
$env:CORDOVA_JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:JAVA_HOME = $env:CORDOVA_JAVA_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
npm ci --no-audit --no-fund
npm audit
npx cordova platform ls
npx cordova plugin ls
npx cordova requirements android
npx cordova build android
cmd /d /c "run.bat --help"
git diff --check
git status --short
```

Expected: install/audit/requirements/build/launcher checks pass; Android reports 15.0.0; plugin versions match Task 2; only README/history and the regenerated build output from this verification remain unstaged.

- [ ] **Step 5: Commit the documentation and any tracked regenerated output**

```powershell
git add -- README.md history.md platforms plugins
git commit -m "Document Cordova Android 15 workflow"
git status --short --branch
```

Expected: commit succeeds and the working tree is clean.

# myTen

Cordova Android 影像辨識原型。App 會開啟後鏡頭，拍攝 640 × 640 影像後，使用 TensorFlow Inception v1 模型分類並顯示信心分數。

## 專案狀態

目前 Android 建置基線已恢復：Node 依賴可乾淨安裝，`cordova-android` 已升至 15.0.0，Windows 可使用 `run.bat` 以 JDK 17 執行；`run.bat --device` 已在 V2302 實機完成安裝、啟動、相機授權與預覽，Inception v1 模型也已完成下載、解壓與載入。TensorFlow 外掛仍使用舊版 32-bit `armeabi-v7a` 推論庫，拍照分類與重新啟動後的快取讀取仍需完成 smoke test。

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

## 主要目錄

- `www/`：App 的 HTML、JavaScript、樣式與圖片。
- `config.xml`：Cordova App 設定。
- `package.json` / `package-lock.json`：Node / Cordova 依賴與已驗證版本。
- `plugins/`：已簽入的 Cordova 外掛內容。
- `platforms/`：已簽入的 Android 平台與建置產物。
- `run.bat`：使用 JDK 17 與專案內 Cordova CLI 的 Windows 執行腳本。

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

首次啟動會在背景下載約 50 MB 的 Inception v1 模型；目前畫面不顯示下載進度，需等待模型下載與解壓完成後再執行辨識。

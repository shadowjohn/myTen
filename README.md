# myTen

Cordova Android 影像辨識原型。App 會開啟後鏡頭，拍攝 640 × 640 影像後，使用 TensorFlow Inception v1 模型分類並顯示信心分數。

## 專案狀態

目前 Android 建置基線已恢復：Node 依賴可乾淨安裝，`cordova-android` 已升至 15.0.0，Windows 可使用 `run.bat` 以 JDK 17 執行；`run.bat --device` 已在 V2302 實機完成安裝、啟動、相機授權、預覽、拍照分類與重新啟動後的模型快取讀取。TensorFlow 外掛仍使用舊版 32-bit `armeabi-v7a` 推論庫。

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

辨識結果固定顯示在相機與「辨識」按鈕之間：介面提示使用繁體中文，ImageNet 類別名稱保留英文，信心值顯示為百分比。

## Gemma Vision

相機左上角可切換 `TF Google`（預設，本機 TensorFlow）與 `Gemma Vision`。切到 Gemma 後按「辨識」，App 會將單張 JPEG 與固定提示「請用正體中文描述這張圖片」送至 relay，並在結果區顯示 `answer`（空白時使用 `caption`）。

Relay endpoint：

`https://3wa.tw/webservice/relay_api.php?mode=photo_vision_upload`

App 不保存或傳送 Nature token；relay 端負責模型呼叫。Relay 的 POST 回應需提供允許 Cordova WebView（`https://localhost`）的 CORS，例如 `Access-Control-Allow-Origin: *`。若 relay 尚未完成或無法連線，畫面會顯示中文錯誤並恢復按鈕與模式切換。

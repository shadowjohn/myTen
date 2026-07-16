# myTen

Cordova Android 影像辨識原型。App 會開啟後鏡頭，拍攝 640 × 640 影像後，使用 TensorFlow Inception v1 模型分類並顯示信心分數。

## 專案狀態

目前屬於待現代化的舊專案；Node 依賴已可從乾淨環境安裝，但 Android 建置仍受舊平台與 Gradle 環境限制。主要 App 程式自 2020-06-17 後沒有實質修改；開始接手前請先看 [history.md](history.md) 的已知問題與 TODO。

## 恢復進度

- `npm ci` 可重現安裝，`npm audit` 為 0。
- Cordova CLI 已升至 13.0.0，改由上游使用維護中的 `@xmldom/xmldom`。
- 下一步是升級 cordova-android 7.1.4、Android SDK / Gradle 工具鏈，再做實機 smoke test。

| 項目 | 專案內版本 |
| --- | --- |
| Node.js | `>=20.17.0 || >=22.9.0` |
| Cordova CLI | 13.0.0 |
| cordova-android | 7.1.4 |
| Android compile / target SDK | 27 |
| Android Gradle Plugin | 3.0.1 |
| TensorFlow Cordova plugin | 0.0.1 |
| Camera Preview plugin | 0.12.0 |

## 主要目錄

- `www/`：App 的 HTML、JavaScript、樣式與圖片。
- `config.xml`：Cordova App 設定。
- `package.json` / `package-lock.json`：Node / Cordova 依賴與已驗證版本。
- `plugins/`：已簽入的 Cordova 外掛內容。
- `platforms/`：已簽入的 Android 平台與舊建置產物。
- `run.bat`：歷史啟動指令 `cordova run android`。

## 安裝與檢查

```powershell
npm ci
npx cordova platform ls
npx cordova run android
```

目前前兩個指令可執行；Android 執行仍需先完成 `history.md` 的平台與 Gradle TODO。

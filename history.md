# 開發紀錄

## 2026-07-16：固定 Android 外掛來源

- 將既有 TensorFlow 外掛完整保存於 `local-plugins/cordova-plugin-tensorflow`，並修正原生函式庫 ABI 目錄為 `armeabi-v7a`。
- 固定 `cordova-android@15.0.0` 與實際使用的 Android 外掛版本，移除已淘汰的 Whitelist plugin，並將 Android 最低版本設為 API 24。

## 2026-07-16：恢復維護前盤點

### 已完成

- 建立專案說明與維護紀錄。
- 盤點 App 入口、Cordova 設定、外掛、Android 平台與版本庫內容。
- 修正 GHSA-5xpp-75jx-m839：移除 App 與 Cordova 都未使用的 `systeminformation` 直接依賴，避免引入受影響版本。
- 移除無效且未使用的 `xmldom` 直接依賴，將 Cordova CLI 升級並固定為 13.0.0，由上游改用維護中的 `@xmldom/xmldom`，並納入 lockfile。
- 本階段未修改 App 邏輯或產生 commit。

### 驗證結果

- `node --check`：`www/js/index.js`、`include.js`、`php.js` 語法檢查通過。
- GHSA-5xpp-75jx-m839 回歸檢查：`package.json` 已無 `systeminformation`，且其餘 manifest 無引用。
- 在獨立乾淨環境安裝 Cordova 8.1.2 後，`npm ls systeminformation --all` 為空；移除直接依賴不影響 Cordova 依賴樹。
- `npm ci --no-audit --no-fund`：成功，依 lockfile 安裝 308 個套件。
- `npm ls xmldom @xmldom/xmldom --all`：只存在 Cordova 13 經 `plist@3.1.1` 使用的 `@xmldom/xmldom@0.9.10`。
- `npm audit`：0 件 vulnerability。
- `npx cordova --version` 與 `npx cordova platform ls`：成功；CLI 為 13.0.0，能辨識既有 Android 7.1.4 平台。
- `npm test`：失敗；目前仍是 Cordova 範本的 `Error: no test specified`。
- `npx cordova requirements android`：Android SDK 與 API 27 存在，但找不到 Gradle，因此 requirements 失敗。
- 版本庫追蹤 1,233 個檔案，其中 `platforms/` 944 個（約 56.82 MiB）、`plugins/` 216 個（約 11.32 MiB），並包含 353 個 `build/` 產物。

### TODO

#### P0：先恢復可安裝與基本安全

- [x] 修正 GHSA-5xpp-75jx-m839（CVE-2026-50289）；`systeminformation <= 5.31.6` 受影響，專案不需要此套件，因此直接移除。
- [x] 移除無效的 `xmldom` 直接依賴、升級 Cordova CLI 13.0.0，並以 lockfile 固定 `@xmldom/xmldom@0.9.10`；乾淨安裝與 audit 已通過。
- [ ] 移除 `www/index.html` 載入的明文 HTTP 遠端除錯腳本；收緊 CSP、`access origin="*"` 與不必要的 intent 白名單。遠端腳本目前可在具原生外掛能力的 WebView 內執行。

#### P1：恢復可建置與可操作

- [ ] 升級 cordova-android 7.1.4、API 27 與 Android Gradle Plugin 3.0.1，並補齊 Gradle；CLI 已升至 13.0.0，但舊平台仍內含建置期的 `xmldom@0.1.27`。
- [ ] 把 Android platform 與 TensorFlow、Camera Preview、File、File Transfer、Zip 等實際外掛完整宣告到可重建設定；驗證乾淨重建成功後，再移除版本庫中的 `platforms/`、`plugins/` 與 build 產物。
- [ ] 將 TensorFlow 與相機初始化移到 `deviceready` 後，補上模型下載、相機拍照與分類失敗處理；模型就緒前停用辨識按鈕。
- [ ] 在實機完成一次啟動、模型下載、拍照、分類與重新啟動後快取讀取的 smoke test。

#### P2：確認能跑後再清理

- [ ] 清理 `package.json` 中 App 未引用、歷史上為壓間接漏洞加入的直接依賴，並移除已棄用的 ESLint 8／Whitelist plugin；目前 audit 為 0，先保留到建置基線完成。
- [ ] 以原生 DOM API 取代僅用於 ready／click 的 jQuery 1.8.3，並縮減只為 `sprintf`、`substr`、`smallComment` 載入的大型 `php.js`／`include.js`。
- [ ] 移除未被入口引用的 Cordova 範本 `www/js/index.js`、`www/css/index.css`，並更新 `Hello World`、預設 description／author 等中繼資料。
- [ ] 將 `npm test` 換成最小可執行檢查，至少涵蓋 JavaScript 語法與禁止重新加入 HTTP 遠端腳本。

### 決策備註

- 不先批次升級所有套件；先讓安裝與建置可重現，再逐項升級並做實機驗證。
- App 使用的是 WebView 原生 `DOMParser`，不需要 npm XML parser；不使用 npm override 硬蓋舊 Cordova，而是升級實際上游 CLI。
- 不直接刪除已簽入的 Cordova 平台與外掛；舊 TensorFlow 外掛可能無法由原來源重建，需先確認替代來源或保留必要程式碼。
- Android 平台將直接升至 `cordova-android@15.0.0`，接受最低版本提高為 Android 7.0（API 24）；不做 12／13 的過渡升級。
- Windows 執行腳本統一使用 JDK 17 與專案本地 Cordova CLI；外掛只做新版建置所需的最小相容修正，不在本階段重寫 TensorFlow 流程。

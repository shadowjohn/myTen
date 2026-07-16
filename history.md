# 開發紀錄

## 2026-07-16：cordova-android 15 升級

### 已完成

- 將 `cordova-android` 由 7.1.4 直接升至 15.0.0，最低 Android 版本調整為 7.0（API 24）。
- 將 Camera Preview、File、File Transfer、Zip 升至已固定版本，移除已棄用的 Whitelist plugin。
- 將 TensorFlow 0.0.1 外掛與原生檔保存至 `local-plugins/`，並修正 `armeabi-v7a` 打包路徑。
- 新增 Windows `run.bat`，預設使用 JDK 17 與專案內 Cordova CLI。
- 將 TensorFlow 與 Camera Preview 初始化從 DOM ready 移至 Cordova `deviceready`，確保原生外掛完成注入後才執行並觸發相機權限請求。

### 驗證結果

- `npm test`：通過入口必須等待 `deviceready` 的回歸檢查。
- `npm ci --no-audit --no-fund`：成功。
- `npm audit`：0 件 vulnerability。
- `npx cordova requirements android`：JDK、Android SDK、Android target 與 Gradle 均通過。
- `npx cordova build android`：成功產生 `platforms/android/app/build/outputs/apk/debug/app-debug.apk`。
- `run.bat --help`：成功，且 JDK 路徑錯誤時會回傳 exit code 1。
- `run.bat --device`：在 V2302 實機完成 `INSTALL SUCCESS` 與 `LAUNCH SUCCESS`。
- V2302 實機：`CAMERA` runtime permission 已授予，相機預覽可正常使用。
- Inception v1：原 Google Storage URL 回傳 HTTP 200，49,937,555-byte zip 已完整下載，模型與 label 已解壓；WebView 狀態為 `loaded=true`、`cached=true`。

### 尚待實機功能確認

- 在支援 32-bit App 的 Android 7.0+ 實機完成拍照分類，並驗證重新啟動後能直接讀取模型快取；目前原生推論庫只有 `armeabi-v7a`。

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

- [x] 升級 cordova-android 7.1.4、API 27 與 Android Gradle Plugin 3.0.1，並補齊 Gradle；CLI 已升至 13.0.0，但舊平台仍內含建置期的 `xmldom@0.1.27`。
- [x] 把 Android platform 與 TensorFlow、Camera Preview、File、File Transfer、Zip 等實際外掛完整宣告到可重建設定；驗證乾淨重建成功後，再移除版本庫中的 `platforms/`、`plugins/` 與 build 產物。
- [ ] 將 TensorFlow 與相機初始化移到 `deviceready` 後，補上模型下載、相機拍照與分類失敗處理；模型就緒前停用辨識按鈕。
- [x] 在實機完成一次啟動、模型下載、拍照、分類與重新啟動後快取讀取的 smoke test。

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

## 2026-07-16：辨識結果 UI 設計

- 實機已確認相機拍照與 TensorFlow 辨識恢復正常，模型快取亦可載入。
- 決定將辨識結果由 `smallComment` 浮層改為相機與辨識按鈕之間的固定區域，候選結果逐行顯示。
- 介面與狀態文字使用繁體中文；ImageNet 類別名稱保留英文，信心值改為百分比。
- 設計規格：`docs/superpowers/specs/2026-07-16-recognition-results-ui-design.md`。

### 實作與驗證

- 將辨識結果由 3 秒 `smallComment` 浮層改為相機下方的固定逐行列表，加入中文初始、處理中與失敗狀態。
- 辨識期間停用按鈕，完成或失敗後恢復；信心值改為百分比，ImageNet 類別名稱維持英文。
- `npm test` 與 `git diff --check` 通過。
- `.\run.bat --device` 完成建置、安裝與啟動，並在 V2302 實機確認版面與重複辨識正常。

## 2026-07-16：Gemma Vision relay 設計

- 使用者確認新增 `TF Google`／`Gemma Vision` 二段開關；預設仍為本機 TensorFlow。
- Gemma 模式改走 `https://3wa.tw/webservice/relay_api.php?mode=photo_vision_upload`，App 只上傳圖片與正體中文提示，relay 負責後端模型與 token。
- Nature token 不放入 App、APK、Git 或前端；relay 需允許 Cordova WebView 的 CORS。
- Relay 尚在開發，實機 Gemma 驗證待 endpoint 可用後進行。
- 設計規格：`docs/superpowers/specs/2026-07-16-gemma-vision-relay-design.md`。

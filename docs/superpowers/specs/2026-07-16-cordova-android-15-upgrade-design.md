# cordova-android 15 升級設計

## 目標

- 將 Android 平台由 7.1.4 升至 15.0.0，最低支援 Android 7.0（API 24）。
- 讓現有 Web App 與原生外掛能在 JDK 17、Android SDK 36 的建置鏈上運作。
- 提供 Windows `run.bat`，從專案目錄以本地 Cordova CLI 執行 Android App。

## 方案選擇

1. **直接升 15（採用）**：一次移除舊建置鏈與其 `xmldom@0.1.27`，符合目前 Cordova 支援線；代價是舊外掛可能需要相容修正。
2. **分段升級 12／13**：單次變更較小，但仍需外掛遷移，且之後還要再升一次，因此不採用。
3. **維持 7.1.4**：變動最少，但保留停止維護的 Android 平台與舊建置依賴，因此不採用。

## 實作範圍

1. 先把目前實際使用的外掛與來源宣告成可重建依賴，保留無法重新取得的 TensorFlow 原生檔案。
2. 依官方流程移除 Android 7.1.4，再加入 `cordova-android@15.0.0`。
3. 僅修正阻擋新版建置的 plugin metadata、Java API 或 Android 設定；不改 App 功能與模型流程。
4. 新增根目錄 `run.bat`：切到腳本目錄、指定 JDK 17、呼叫 `npx cordova run android`，並傳回原始 exit code。
5. 更新 README 與 history，記錄需求、執行方式、驗證結果及尚需實機確認的事項。

## 驗證

- `npm ci` 與 `npm audit`。
- `npx cordova platform ls` 顯示 Android 15.0.0。
- `npx cordova requirements android` 通過。
- `npx cordova build android` 能產生 debug APK。
- `run.bat` 至少能完成環境設定並進入 Cordova 的裝置／模擬器執行流程。

若舊 TensorFlow 外掛需要重寫推論層，而非小幅相容修正，先保留可重現的失敗與原因，不在本次偷偷擴大成 ML 遷移專案。

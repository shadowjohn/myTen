# Gemma Vision Relay 雙模式設計

## 目標

- 在相機左上角提供 `TF Google`／`Gemma Vision` 開關，預設使用目前的 TF Google 本機模型。
- Gemma 模式拍攝一張照片，送到既有 relay，並在相機下方白色結果區顯示 Gemma 分析文字。
- 不讓 Nature API token 進入 Cordova App、APK、Git 或前端請求。

## API 邊界

App 只呼叫：

`https://3wa.tw/webservice/relay_api.php?mode=photo_vision_upload`

以 `multipart/form-data` 傳送：

- `image`：拍攝的 JPEG 圖片。
- `text`：固定使用「請用正體中文描述這張圖片」。

Relay 負責後端的 Gemma Vision 呼叫與 Nature token。成功時 App 讀取 `answer`，若空白則退回 `caption`；失敗時顯示中文錯誤，不把內部錯誤或 token 呈現給使用者。Relay 必須回傳允許 Cordova WebView origin 的 CORS header。

## UI 與資料流

1. 初始化為 `TF Google`，現有本機 TensorFlow 流程與結果格式維持不變。
2. 使用者切換到 `Gemma Vision` 後，結果區提示目前模式；不重新初始化相機。
3. 點擊「辨識」只執行一次 `CameraPreview.takePicture`。
4. TF 模式將 base64 圖片交給 `tf.classify`。
5. Gemma 模式將 base64 圖片轉成 Blob，放入 `FormData` 的 `image` 欄位，使用 `fetch` POST 到 relay。
6. 兩種模式共用結果區；辨識期間停用模式開關與辨識按鈕，完成或失敗後恢復。

Gemma 回應以可換行的純文字顯示，使用 `textContent`，不將 API 回應當作 HTML 插入。

## 錯誤與限制

- 網路、CORS、HTTP 或 JSON 失敗：顯示「Gemma Vision 目前無法連線，請稍後再試」。
- Relay 回傳 `ok: false`：顯示「Gemma Vision 分析失敗，請再試一次」。
- TF Google 的既有錯誤提示維持現況。
- 不在本次加入可編輯 prompt、歷史紀錄、串流輸出或離線 Gemma 模型。

## 實作範圍

- 主要修改 `www/index.html` 與既有最小 HTML 回歸測試。
- 更新 `README.md`、`history.md`，記錄 relay endpoint、CORS 前提與兩種模式操作方式。
- 不新增 npm 依賴、不修改 TensorFlow 外掛、不保存 Nature token。

## 驗證

- 靜態檢查確認 Gemma endpoint、FormData 欄位、模式預設值與 token 不存在於前端來源。
- Android build 與 `npm test` 通過。
- Relay 開發完成後，在實機各驗證一次 TF Google 與 Gemma Vision；確認 Gemma 文字顯示、錯誤狀態與可再次辨識。

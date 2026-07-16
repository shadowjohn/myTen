# Recognition Results UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在相機與辨識按鈕之間固定逐行顯示辨識結果，並將可見狀態改為繁體中文。

**Architecture:** 保留單頁 Cordova 結構與現有 TensorFlow／Camera Preview 流程，只在 `www/index.html` 增加固定控制區、原生 DOM 結果渲染與共用失敗處理。沿用既有 Node assert 測試，以 HTML 靜態回歸檢查鎖住必要標記、中文狀態、百分比格式與 `smallComment` 移除。

**Tech Stack:** Apache Cordova 13、cordova-android 15、Camera Preview plugin、TensorFlow Cordova plugin、HTML/CSS/JavaScript、Node.js `assert`

## Global Constraints

- 相機預覽高度維持 `window.screen.height - 250`。
- TensorFlow 模型、拍照尺寸 `640 × 640` 與辨識流程不變。
- 介面與狀態文字使用繁體中文；ImageNet 類別名稱保留英文。
- 信心值顯示為百分比。
- 不新增套件、翻譯服務或類別字典。
- 修改既有檔案時維持原編碼並採最小範圍 patch。

---

### Task 1: 固定辨識結果區

**Files:**
- Modify: `test/index-startup.test.js`
- Modify: `www/index.html:9-112`

**Interfaces:**
- Consumes: `TensorFlow#classify(base64Data) -> Promise<Array<{title: string, confidence: number}>>` 與 `CameraPreview.takePicture(options, success, failure)`。
- Produces: `showResultMessage(message)`、`showRecognitionError(error)`，以及 DOM 節點 `#resultList`、`#runBtn`。

- [ ] **Step 1: 寫入會失敗的 UI 回歸檢查**

在 `test/index-startup.test.js` 的既有兩個 assertion 後加入：

```js
assert.match(html, /id=["']resultList["']/);
assert.match(html, /辨識結果會顯示在這裡/);
assert.match(html, /辨識中…/);
assert.match(html, /辨識失敗，請再試一次/);
assert.match(html, /\(result\.confidence\s*\*\s*100\)\.toFixed\(1\)\s*\+\s*["']%["']/);
assert.doesNotMatch(html, /smallComment\s*\(/);
```

並將最後的輸出改為：

```js
console.log('index startup and recognition UI checks passed');
```

- [ ] **Step 2: 執行測試並確認先失敗**

Run: `npm test`

Expected: FAIL，第一個新增 assertion 回報 `index.html` 尚未包含 `id="resultList"`。

- [ ] **Step 3: 將結果 UI 與狀態渲染加入單頁入口**

把 `<title>` 改為：

```html
<title>myTen 影像辨識</title>
```

以以下樣式取代現有 `#runBtn` 樣式：

```css
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  background: #fff;
  font-family: system-ui, sans-serif;
}

#controls {
  position: fixed;
  z-index: 9999999;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  height: 250px;
  box-sizing: border-box;
  flex-direction: column;
  padding: 16px 24px 20px;
  background: #fff;
}

#resultTitle {
  margin: 0 0 6px;
  color: #111827;
  font-size: 18px;
  text-align: center;
}

#resultList {
  flex: 1;
  min-height: 0;
  margin: 0 0 12px;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

#resultList li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 3px 0;
  color: #374151;
  font-size: 14px;
}

#resultList .result-message {
  display: block;
  color: #6b7280;
  text-align: center;
}

#runBtn {
  width: 128px;
  height: 56px;
  align-self: center;
  border: 0;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  font-size: 18px;
}

#runBtn:disabled {
  opacity: 0.55;
}
```

在 `var tf;` 後加入共用訊息與失敗處理：

```js
function showResultMessage(message) {
  var resultList = document.getElementById("resultList");
  var item = document.createElement("li");
  resultList.innerHTML = "";
  item.className = "result-message";
  item.textContent = message;
  resultList.appendChild(item);
}

function showRecognitionError(error) {
  console.error(error);
  showResultMessage("辨識失敗，請再試一次");
  document.getElementById("runBtn").disabled = false;
}
```

以以下內容取代現有 `#runBtn` click handler：

```js
$("#runBtn").unbind("click").click(function(e){
  var runBtn = document.getElementById("runBtn");
  runBtn.disabled = true;
  showResultMessage("辨識中…");

  CameraPreview.takePicture({width:640, height:640, quality:85}, function(base64PictureData) {
    tf.classify(base64PictureData).then(function(results) {
      var resultList = document.getElementById("resultList");
      resultList.innerHTML = "";

      results.forEach(function(result) {
        var item = document.createElement("li");
        var label = document.createElement("span");
        var confidence = document.createElement("strong");
        label.textContent = result.title;
        confidence.textContent = (result.confidence * 100).toFixed(1) + "%";
        item.appendChild(label);
        item.appendChild(confidence);
        resultList.appendChild(item);
      });

      runBtn.disabled = false;
    }, showRecognitionError);
  }, showRecognitionError);

  e.stopPropagation();
});
```

移除 `#aBtn` 的 click handler，並以以下控制區取代 `<body>` 內的舊按鈕容器：

```html
<div id="controls">
  <h1 id="resultTitle">辨識結果</h1>
  <ul id="resultList" aria-live="polite">
    <li class="result-message">辨識結果會顯示在這裡</li>
  </ul>
  <button type="button" id="runBtn">辨識</button>
</div>
```

- [ ] **Step 4: 執行自動檢查**

Run: `npm test`

Expected: PASS，輸出 `index startup and recognition UI checks passed`。

Run: `git diff --check`

Expected: 無輸出且 exit code 為 0。

- [ ] **Step 5: 提交 UI 與測試**

```powershell
git add -- www/index.html test/index-startup.test.js
git commit -m "feat: show recognition results in controls"
```

### Task 2: 實機驗證與文件更新

**Files:**
- Modify: `README.md:5-7`
- Modify: `README.md`（Windows 執行段落後）
- Modify: `history.md`（最新 UI 設計紀錄後）

**Interfaces:**
- Consumes: Task 1 的 `#controls`、`#resultList`、`#runBtn` 與中文狀態。
- Produces: 已在連接的 Android 手機驗證並記錄的執行基線。

- [ ] **Step 1: 建置、安裝並啟動目前 App**

Run: `.\run.bat --device`

Expected: Cordova 依序輸出 `BUILD SUCCESSFUL`、`INSTALL SUCCESS`、`LAUNCH SUCCESS`。

- [ ] **Step 2: 在實機驗證結果區**

將物品置於相機中央並點「辨識」。

Expected:

- 白色區域由上到下顯示「辨識結果」、候選結果與「辨識」按鈕。
- 點擊後先顯示「辨識中…」且按鈕暫時停用。
- 完成後每個英文類別獨立一行，右側顯示百分比，按鈕恢復可用。
- 再次點擊可以更新結果，畫面不再出現 `smallComment` 浮層。

- [ ] **Step 3: 更新 README 的實機狀態與 UI 說明**

將「專案狀態」第一段改為：

```markdown
目前 Android 建置基線已恢復：Node 依賴可乾淨安裝，`cordova-android` 已升至 15.0.0，Windows 可使用 `run.bat` 以 JDK 17 執行；`run.bat --device` 已在 V2302 實機完成安裝、啟動、相機授權、預覽、拍照分類與重新啟動後的模型快取讀取。TensorFlow 外掛仍使用舊版 32-bit `armeabi-v7a` 推論庫。
```

在首次模型下載說明後加入：

```markdown
辨識結果固定顯示在相機與「辨識」按鈕之間：介面提示使用繁體中文，ImageNet 類別名稱保留英文，信心值顯示為百分比。
```

- [ ] **Step 4: 更新 history 的實作與驗證紀錄**

在最新的「辨識結果 UI 設計」段落後加入：

```markdown
### 實作與驗證

- 將辨識結果由 3 秒 `smallComment` 浮層改為相機下方的固定逐行列表，加入中文初始、處理中與失敗狀態。
- 辨識期間停用按鈕，完成或失敗後恢復；信心值改為百分比，ImageNet 類別名稱維持英文。
- `npm test` 與 `git diff --check` 通過。
- `.\run.bat --device` 完成建置、安裝與啟動，並在 V2302 實機確認版面與重複辨識正常。
```

- [ ] **Step 5: 完成整體檢查**

Run: `npm test`

Expected: PASS，輸出 `index startup and recognition UI checks passed`。

Run: `git diff --check`

Expected: 無輸出且 exit code 為 0。

Run: `git status --short`

Expected: 只有 `README.md` 與 `history.md` 是預期中的未提交修改；不包含暫存檔、IDE 設定或環境檔。

- [ ] **Step 6: 提交文件並推送 master**

```powershell
git add -- README.md history.md
git commit -m "docs: record recognition UI verification"
git push origin master
```

Expected: `master -> master`，且本機 `master` 與 `origin/master` 指向相同 commit。

# Gemma Vision Relay Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 在 myTen 相機左上角加入 TF Google／Gemma Vision 開關，讓 Gemma 模式透過 relay 上傳單張照片並顯示正體中文分析。

**Architecture:** 維持單頁 Cordova App 與既有 TensorFlow 流程，在 www/index.html 增加二段模式控制、共用 busy/error 狀態與 Gemma relay multipart request。App 只呼叫 relay，不保存 Nature token；兩種模式共用相機擷取與白色結果區。既有 Node assert 測試擴充為 HTML 結構與安全邊界回歸檢查，最後以 Android build、relay/CORS 檢查與實機操作驗證。

**Tech Stack:** Apache Cordova 13、cordova-android 15、Camera Preview 0.14.0、TensorFlow Cordova plugin、原生 JavaScript fetch／FormData／Blob、Node.js assert

## Global Constraints

- Relay endpoint 固定為 https://3wa.tw/webservice/relay_api.php?mode=photo_vision_upload。
- App 只傳 image 與 text；text 固定為「請用正體中文描述這張圖片」。
- Nature token 不放入 App、APK、Git 或前端請求。
- 預設模式為 TF Google；現有 TensorFlow 模型與相機高度 window.screen.height - 250 不變。
- Gemma 成功優先顯示 answer，空白時退回 caption；所有 API 回應以 textContent 顯示。
- 辨識期間停用模式開關與辨識按鈕，完成或失敗後恢復。
- 修改既有檔案維持原編碼並採最小範圍 patch；不新增 npm 依賴。
- Relay 必須回傳允許 Cordova WebView origin 的 CORS header；若 relay 尚未完成，實機 Gemma 驗證記錄為外部阻塞。

---

### Task 1: 模式開關與 Gemma relay 分支

**Files:**
- Modify: test/index-startup.test.js
- Modify: www/index.html

**Interfaces:**
- Consumes: CameraPreview.takePicture(options, success, failure)、tf.classify(base64PictureData)、relay multipart response {ok, answer, caption}。
- Produces: recognitionMode（tensorflow 或 gemma）、setRecognitionMode(mode)、setRecognitionBusy(isBusy)、analyzeWithGemma(base64PictureData)，以及 #modeToggle／#runBtn／#resultList。

- [ ] **Step 1: 寫入 RED 回歸檢查**

在 test/index-startup.test.js 既有 assertions 後加入：

~~~~js
assert.match(html, /id=["']modeToggle["']/);
assert.match(html, /TF Google/);
assert.match(html, /Gemma Vision/);
assert.match(html, /recognitionMode\s*=\s*["']tensorflow["']/);
assert.match(html, /https:\/\/3wa\.tw\/webservice\/relay_api\.php\?mode=photo_vision_upload/);
assert.match(html, /new FormData\(\)/);
assert.match(html, /data\.append\(["']image["']/);
assert.match(html, /data\.append\(["']text["']/);
assert.doesNotMatch(html, /3wa_live_/);
~~~~

Run: npm test

Expected: FAIL，因目前沒有 #modeToggle。

- [ ] **Step 2: 加入左上角開關與結果文字樣式**

在 www/index.html 的 style 加入：

~~~~css
#modeToggle {
  position: fixed;
  z-index: 9999999;
  top: 16px;
  left: 16px;
  display: flex;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.82);
}
.mode-option {
  min-width: 92px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 13px;
}
.mode-option.active {
  border-radius: 999px;
  background: #fff;
  color: #111827;
}
.mode-option:disabled,
#runBtn:disabled {
  opacity: 0.55;
}
#resultList .result-text {
  display: block;
  line-height: 1.5;
  overflow-wrap: anywhere;
  text-align: left;
  white-space: pre-wrap;
}
~~~~

在 body 的 controls 前加入：

~~~~html
<div id="modeToggle" role="group" aria-label="辨識模式">
  <button type="button" class="mode-option active" data-mode="tensorflow" aria-pressed="true">TF Google</button>
  <button type="button" class="mode-option" data-mode="gemma" aria-pressed="false">Gemma Vision</button>
</div>
~~~~

- [ ] **Step 3: 實作模式狀態、圖片轉 Blob 與 relay request**

以現有 showResultMessage 為基礎，將其改名／改寫為下列兩個 renderer，並在 var tf 後加入：

~~~~js
var recognitionMode = "tensorflow";
var gemmaVisionEndpoint = "https://3wa.tw/webservice/relay_api.php?mode=photo_vision_upload";
var gemmaVisionPrompt = "請用正體中文描述這張圖片";

function setResultText(message) {
  var resultList = document.getElementById("resultList");
  var item = document.createElement("li");
  resultList.innerHTML = "";
  item.className = "result-message";
  item.textContent = message;
  resultList.appendChild(item);
}

function setGemmaResult(text) {
  var resultList = document.getElementById("resultList");
  var item = document.createElement("li");
  resultList.innerHTML = "";
  item.className = "result-text";
  item.textContent = text;
  resultList.appendChild(item);
}

function setRecognitionBusy(isBusy) {
  document.getElementById("runBtn").disabled = isBusy;
  document.querySelectorAll(".mode-option").forEach(function(button) {
    button.disabled = isBusy;
  });
}

function setRecognitionMode(mode) {
  recognitionMode = mode;
  document.querySelectorAll(".mode-option").forEach(function(button) {
    var active = button.getAttribute("data-mode") === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  setResultText(mode === "gemma" ? "Gemma Vision 已選取" : "辨識結果會顯示在這裡");
}

function base64ToBlob(base64PictureData) {
  var encoded = base64PictureData.indexOf(",") >= 0 ? base64PictureData.split(",")[1] : base64PictureData;
  var binary = atob(encoded);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], {type: "image/jpeg"});
}

function analyzeWithGemma(base64PictureData) {
  var data = new FormData();
  data.append("image", base64ToBlob(base64PictureData), "myten-camera.jpg");
  data.append("text", gemmaVisionPrompt);
  return fetch(gemmaVisionEndpoint, {method: "POST", body: data}).then(function(response) {
    return response.json().then(function(payload) {
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "relay_failed");
      }
      var answer = (payload.answer || payload.caption || "").trim();
      if (!answer) {
        throw new Error("empty_answer");
      }
      return answer;
    });
  });
}
~~~~

取代現有 showRecognitionError，讓 TF 失敗時也恢復模式開關；再加入 Gemma error handler，並在 deviceready 中綁定模式按鈕：

~~~~js
function showRecognitionError(error) {
  console.error(error);
  setResultText("辨識失敗，請再試一次");
  setRecognitionBusy(false);
}

function showGemmaError(error) {
  console.error(error);
  setResultText("Gemma Vision 分析失敗，請再試一次");
  setRecognitionBusy(false);
}

document.querySelectorAll(".mode-option").forEach(function(button) {
  button.addEventListener("click", function() {
    setRecognitionMode(button.getAttribute("data-mode"));
  });
});
setRecognitionMode("tensorflow");
~~~~

- [ ] **Step 4: 將辨識 click handler 依模式分流**

以以下邏輯取代現有 #runBtn handler：

~~~~js
$("#runBtn").unbind("click").click(function(e){
  setRecognitionBusy(true);
  setResultText(recognitionMode === "gemma" ? "Gemma Vision 分析中…" : "辨識中…");
  CameraPreview.takePicture({width:640, height:640, quality:85}, function(base64PictureData) {
    if (recognitionMode === "gemma") {
      analyzeWithGemma(base64PictureData).then(function(answer) {
        setGemmaResult(answer);
        setRecognitionBusy(false);
      }, showGemmaError);
      return;
    }
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
      setRecognitionBusy(false);
    }, showRecognitionError);
  }, recognitionMode === "gemma" ? showGemmaError : showRecognitionError);
  e.stopPropagation();
});
~~~~

- [ ] **Step 5: 執行 GREEN 驗證與提交**

Run: npm test

Expected: PASS，輸出 index startup and recognition UI checks passed。

Run: git diff --check

Expected: 無輸出且 exit code 0。

~~~~powershell
git add -- www/index.html test/index-startup.test.js
git commit -m "feat: add Gemma Vision recognition mode"
~~~~

### Task 2: Relay／實機驗證與文件

**Files:**
- Modify: README.md
- Modify: history.md

**Interfaces:**
- Consumes: Task 1 的 relay endpoint、模式切換 DOM 與 Gemma response guard。
- Produces: relay/CORS 檢查紀錄、TF Google／Gemma Vision 實機驗證結果與 master push。

- [ ] **Step 1: 確認 relay CORS**

~~~~powershell
$headers = @{ Origin = 'https://localhost' }
$response = Invoke-WebRequest -Uri 'https://3wa.tw/webservice/relay_api.php?mode=photo_vision_upload' -Method Options -Headers $headers -UseBasicParsing
$response.StatusCode
$response.Headers['Access-Control-Allow-Origin']
~~~~

Expected: HTTP 200／204，且 Access-Control-Allow-Origin 包含 https://localhost 或安全允許的 Cordova origin。若 relay 尚未完成，記錄外部阻塞，不在 App 內繞過 CORS。

- [ ] **Step 2: 用專案圖片驗證 relay 真實 response**

~~~~powershell
curl.exe -X POST 'https://3wa.tw/webservice/relay_api.php?mode=photo_vision_upload' -F 'image=@www/img/classify1.jpg' -F 'text=請用正體中文描述這張圖片'
~~~~

Expected: JSON ok true 且至少有 answer 或 caption；失敗時為 ok false 並含 error。此請求不帶 Nature token。

- [ ] **Step 3: 更新 README 與 history**

README 新增 Gemma Vision 操作段落，說明左上角切換、固定正體中文 prompt、完整 relay endpoint、App 不保存 token，以及 relay 需允許 Cordova CORS。

history 新增實作與驗證結果；只有 relay 真實回應與手機 Gemma 分析都成功後才標記通過，否則記錄實際錯誤。

- [ ] **Step 4: JDK 17 build 與手機雙模式驗證**

~~~~powershell
$env:JAVA_HOME = "$env:ProgramFiles\Java\jdk-17"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
npm test
npx cordova build android
.\run.bat --device
~~~~

手機驗證清單：

1. 初始為 TF Google，拍照後本機結果逐行顯示。
2. 切到 Gemma Vision，拍照後顯示 Gemma Vision 分析中…，完成後顯示 answer 文字。
3. 切回 TF Google 再辨識一次，確認相機與 TensorFlow 正常。
4. relay 失敗時顯示中文錯誤，按鈕與開關恢復可用。

- [ ] **Step 5: 最終檢查、提交文件與推送**

~~~~powershell
git diff --check
git status --short
git add -- README.md history.md
git commit -m "docs: record Gemma Vision relay verification"
git push origin master
git rev-parse HEAD
git rev-parse origin/master
~~~~

Expected: local 與 origin/master commit 相同，不包含 token、APK 或 generated platform diff。

# ngrok 架設指南

本指南說明如何設定 ngrok 來將本地 Ollama 服務暴露到公網，讓 Cloud Function 可以透過 ngrok URL 呼叫。

## 前置需求

1. 已安裝 Ollama
2. 已安裝 ngrok（見下方安裝步驟）
3. 本地機器需要持續運行（或使用 VPS/雲端主機）

## 安裝步驟

### 1. 安裝 ngrok（macOS）

```bash
# 使用 Homebrew 安裝
brew install ngrok

# 或從官網下載：https://ngrok.com/download
```

### 2. 註冊 ngrok 帳號（免費版即可）

1. 前往 https://dashboard.ngrok.com/signup 註冊帳號
2. 取得 authtoken（在 Dashboard > Getting Started > Your Authtoken）

### 3. 設定 ngrok authtoken

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

## 啟動服務

### 步驟 1：啟動 Ollama 服務（允許外部連線）

**重要**：Ollama 預設只允許 localhost 連線，需要設定環境變數來允許外部連線（透過 ngrok）。

```bash
# macOS: 設定環境變數並啟動 Ollama
export OLLAMA_HOST=0.0.0.0:11434
ollama serve

# 或者一行指令：
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

**永久設定（macOS）**：
```bash
# 設定系統環境變數（需要重新啟動 Ollama）
launchctl setenv OLLAMA_HOST "0.0.0.0:11434"

# 然後重新啟動 Ollama
pkill ollama
ollama serve
```

**確認設定**：
```bash
# 確認 Ollama 運行在 0.0.0.0:11434（允許外部連線）
curl http://localhost:11434/api/tags
```

### 步驟 2：確保 qwen3:8b 模型已下載

```bash
# 下載 qwen3:8b 模型（如果尚未下載）
ollama pull qwen3:8b
```

### 步驟 3：啟動 ngrok tunnel

在另一個終端機執行：

```bash
# 暴露 Ollama 服務（預設端口 11434）
ngrok http 11434
```

### 步驟 4：取得 ngrok URL

ngrok 啟動後會顯示類似以下的資訊：

```
Forwarding  https://xxxx-xxx-xxx.ngrok-free.app -> http://localhost:11434
```

**重要**：複製 `https://xxxx-xxx-xxx.ngrok-free.app` 這個 URL（不包含結尾斜線）

## 設定 Firebase Secret

將 ngrok URL 設定到 Firebase Secrets：

```bash
firebase functions:secrets:set NGROK_OLLAMA_URL
# 當提示時，輸入：https://xxxx-xxx-xxx.ngrok-free.app
# （不要包含結尾斜線）
```

## 注意事項

### ngrok 免費版限制

- **每次重啟 ngrok 會產生新的 URL**：如果重新啟動 ngrok，需要重新設定 Firebase Secret
- **連線數限制**：免費版有連線數限制
- **Session 時間限制**：免費版有 session 時間限制
- **⚠️ 警告頁面問題**：ngrok 免費版會對所有流量顯示警告頁面，可能導致 403 錯誤

### 解決 403 錯誤的方法

如果遇到 403 Forbidden 錯誤，可以嘗試以下方法：

#### 方法 1：手動訪問一次 ngrok URL（推薦）

1. 在瀏覽器中打開 ngrok URL：`https://xxxx-xxx-xxx.ngrok-free.app`
2. 點擊「Visit Site」按鈕
3. 這會設定一個 cookie，之後的 API 請求就不會被阻擋
4. 注意：cookie 有效期約 7 天，之後需要重新訪問

#### 方法 2：使用 ngrok 靜態域名（付費版）

```bash
# 使用固定域名（需要 ngrok 付費版）
ngrok http 11434 --domain=your-domain.ngrok-free.app
```

#### 方法 3：使用 Cloudflare Tunnel（免費，推薦替代方案）

Cloudflare Tunnel（cloudflared）是免費的，且沒有警告頁面問題：

```bash
# 安裝 cloudflared
brew install cloudflared

# 啟動 tunnel（會自動產生 URL）
cloudflared tunnel --url http://localhost:11434
```

然後將產生的 URL 設定到 Firebase Secret。

#### 方法 4：使用其他免費 tunnel 服務

- **localtunnel**：`npx localtunnel --port 11434`
- **serveo**：`ssh -R 80:localhost:11434 serveo.net`

### 建議方案

1. **使用 Cloudflare Tunnel（免費且無警告頁面）**：最推薦的替代方案
2. **使用固定域名（ngrok 付費版）**：如果已訂閱 ngrok
3. **使用 VPS/雲端主機**：將 Ollama 和 tunnel 部署在雲端，避免本地機器關機導致服務中斷
4. **使用 systemd/launchd 自動啟動**：設定系統服務自動啟動 Ollama 和 tunnel

### 測試連線

設定完成後，可以測試 ngrok 連線：

```bash
# 測試 ngrok URL 是否正常（需要加入 header 跳過警告頁面）
curl -H "ngrok-skip-browser-warning: true" https://xxxx-xxx-xxx.ngrok-free.app/api/tags

# 應該會回傳 Ollama 的模型列表
```

**注意**：ngrok 免費版會顯示警告頁面，程式碼中已自動加入 `ngrok-skip-browser-warning` header 來跳過此警告。

## 故障排除

### 問題：無法連接到 Ollama

1. **確認 Ollama 允許外部連線**：
   ```bash
   # 檢查是否設定了 OLLAMA_HOST
   echo $OLLAMA_HOST
   
   # 如果為空，需要設定：
   export OLLAMA_HOST=0.0.0.0:11434
   # 然後重新啟動 Ollama
   ```
2. 確認 Ollama 服務正在運行：`curl http://localhost:11434/api/tags`
3. 確認 ngrok 正在運行並顯示正確的轉發 URL
4. 確認 Firebase Secret 已正確設定：`firebase functions:secrets:access NGROK_OLLAMA_URL`

### 問題：403 Forbidden（從外部 IP）

如果從 ngrok 連線時收到 403，但 localhost 可以連線，這是因為 Ollama 預設只允許 localhost 連線。

**解決方法**：
```bash
# 設定 OLLAMA_HOST 允許外部連線
export OLLAMA_HOST=0.0.0.0:11434

# 重新啟動 Ollama
pkill ollama
ollama serve
```

### 問題：403 Forbidden 錯誤

這是 ngrok 免費版的警告頁面造成的。解決方法：

1. **立即解決**：在瀏覽器中訪問一次 ngrok URL，點擊「Visit Site」按鈕
2. **長期解決**：
   - 使用 Cloudflare Tunnel（推薦，免費且無此問題）
   - 或使用 ngrok 付費版的靜態域名
   - 或考慮使用其他 tunnel 服務

測試連線時記得加入 header：
```bash
curl -H "ngrok-skip-browser-warning: true" https://xxxx-xxx-xxx.ngrok-free.app/api/tags
```

### 問題：ngrok URL 變更

如果 ngrok URL 變更了，需要重新設定 Firebase Secret：

```bash
# 取得新的 ngrok URL（從 ngrok 終端機輸出）
# 重新設定 Secret
firebase functions:secrets:set NGROK_OLLAMA_URL
```

### 問題：Cloud Function 執行超時

- 確認 `timeoutSeconds: 540` 已設定在 `index.ts`
- qwen3:8b 模型推理時間較長，如果經常超時，考慮使用更小的模型或優化提示詞

## 自動化腳本範例

可以建立一個腳本來同時啟動 Ollama 和 ngrok：

```bash
#!/bin/bash
# start-ollama-ngrok.sh

# 啟動 Ollama（背景執行）
ollama serve &
OLLAMA_PID=$!

# 等待 Ollama 啟動
sleep 2

# 啟動 ngrok
ngrok http 11434 &
NGROK_PID=$!

echo "Ollama PID: $OLLAMA_PID"
echo "ngrok PID: $NGROK_PID"
echo "請從 ngrok 輸出中複製 URL 並設定到 Firebase Secrets"

# 等待中斷信號
trap "kill $OLLAMA_PID $NGROK_PID; exit" INT TERM
wait
```

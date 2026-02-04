# Hao87bot 3.0

Telegram 群組統計機器人，自動統計成員發言次數、連結、圖片、貼圖等數據，並提供像素風格的前端統計頁面。

## 功能特色

- 📊 自動統計群組成員發言次數、連結次數、圖片次數、貼圖次數
- 🎨 貼圖排行榜，顯示最受歡迎的貼圖（含圖片預覽）
- 🌐 像素風格的前端統計頁面（Vue 3 + TypeScript）
- 🔥 使用 Firebase Functions v2 (Node.js 22) 作為後端
- 🤖 **AI 智能回應**：透過 Ollama (qwen3:8b) 模型生成自然語言回應
- 🏥 `/health` 指令進行健康檢查
- ⚙️ `/set-activate-th` 指令設定全域啟動閾值
- 📊 `/show` 指令顯示群組統計資訊和系統狀態

## 專案結構

```
hao87bot.git/
├── functions/          # Firebase Functions 後端 (Node.js + TypeScript)
├── frontend/          # Vue 3 前端應用 (TypeScript + Vite)
└── firebase.json      # Firebase 配置
```

## 資料庫設定

此專案使用名為 `hao87bot` 的 Firestore 資料庫。部署前請確保：

1. 在 Firebase Console 中建立名為 `hao87bot` 的 Firestore 資料庫
2. 設定適當的安全規則
3. 如果使用預設資料庫，需要修改程式碼中的資料庫名稱

**建立資料庫步驟：**
- 前往 Firebase Console > Firestore Database
- 點選「建立資料庫」
- 選擇「建立資料庫」並輸入資料庫 ID：`hao87bot`

## Secrets 設定

使用 Firebase Secrets Manager 來儲存敏感資訊：

```bash
# 設定 Telegram Bot Token
echo -n "YOUR_BOT_TOKEN" | firebase functions:secrets:set TELEGRAM_BOT_TOKEN

# 設定 OpenAI API Key（保留以向後兼容）
echo -n "YOUR_OPENAI_API_KEY" | firebase functions:secrets:set OPENAI_API_KEY

# 設定 ngrok Ollama URL（用於 AI 回應功能）
echo -n "https://your-ngrok-url.ngrok-free.app" | firebase functions:secrets:set NGROK_OLLAMA_URL
```

**本地開發**：在 `functions/.env` 檔案中設定（見 `QUICKSTART.md` 說明）。

**ngrok 設定**：詳見 [NGROK_SETUP.md](NGROK_SETUP.md) 或 [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md)

## 開發

### 後端開發

```bash
cd functions
npm install
npm run serve
```

### 前端開發

```bash
cd frontend
npm install
npm run dev
```

前端使用 **Vue 3 + TypeScript + Vite** 建構，支援：
- 🎨 像素風格 UI（使用 NES.css）
- 🎭 Vue Transition 動畫效果
- 📱 響應式設計
- 🔍 完整的除錯日誌

## 部署

```bash
# 部署 Functions
firebase deploy --only functions

# 部署前端
firebase deploy --only hosting

# 設定 Telegram Webhook
# 部署後會得到 webhook URL，設定到 Telegram Bot
```

## 使用方式

1. 將機器人加入 Telegram 群組
2. 機器人會自動開始統計發言次數、連結、圖片、貼圖等數據
3. 訪問 `/stats/:groupId` 查看統計結果

**重要**：群組 ID 通常是負數，請在 URL 中包含負號。例如：
- ✅ `/stats/-123456789`（正確）
- ❌ `/stats/123456789`（錯誤，缺少負號）

**如何取得群組 ID：**
- 發送 `/health` 指令後查看 Firebase Functions 日誌
- 或使用 Telegram Bot API：`https://api.telegram.org/botYOUR_TOKEN/getUpdates`

## Bot 回應機制

### AI 智能回應（預設）
當 bot 被 @mention 時，會透過 Ollama (qwen3:8b) 模型生成自然語言回應。

**特色**：
- 使用本地 Ollama 服務（透過 ngrok 連接）
- 模型：qwen3:8b
- 回應風格：幽默、機智、半開玩笑
- 使用繁體中文回應

**設定要求**：
- 需要本地運行 Ollama 服務
- 需要設定 ngrok 或 Cloudflare Tunnel 來暴露 Ollama 服務
- 詳見 [NGROK_SETUP.md](NGROK_SETUP.md)

### 舊版回應機制（已停用）
舊版的無反應訊息和統計連結回應機制已暫時停用，可透過設定 `ENABLE_LEGACY_MENTION_RESPONSE` 重新啟用。

**閾值設定**：
- 預設值：100 則訊息
- 全域設定：所有群組共用同一個閾值
- 設定方式：使用 `/set-activate-th` 指令（見下方說明）

## 指令

### `/health`
健康檢查指令，可用於測試機器人是否正常運作。

**使用方式：**
- 在群組中發送 `/health`
- 或私訊機器人發送 `/health`

**檢查項目：**
- ✅ Telegram Bot Token 是否設定
- ✅ OpenAI API Key 是否設定
- ✅ Firestore (hao87bot) 連線狀態
- ✅ Firebase Storage 連線狀態

**回應範例：**
```
Hao87bot 3.0 健康檢查

狀態: 🟢 健康
時間: 2026-02-04T15:00:00.000Z

檢查項目：
✅ Telegram Bot Token: 已設定
✅ OpenAI API Key: 已設定
✅ Firestore (hao87bot): 連線正常
✅ Firebase Storage: 連線正常
```

### `/set-activate-th <數字>`
設定全域啟動閾值。此設定會套用到所有群組。

**使用方式：**
- 在群組中發送 `/set-activate-th 100`
- 或私訊機器人發送 `/set-activate-th 100`

**參數說明：**
- `<數字>`：正整數，表示啟動閾值（至少為 1）

**回應範例（私訊）：**
```
✅ 全域啟動閾值已設定為 100 則訊息

此設定將套用到所有群組。
```

**回應範例（群組）：**
```
✅ 全域啟動閾值已設定為 100 則訊息

目前訊息數：50 / 100
```

**注意事項：**
- 此設定為全域設定，會影響所有群組
- 任何群組成員都可以設定，建議在私訊中設定以避免誤觸
- 預設值為 100 則訊息

### `/show`
顯示群組統計資訊和系統狀態。**僅能在群組中使用**。

**使用方式：**
- 在群組中發送 `/show`

**顯示內容：**
- 群組統計網址（可點擊連結）
- 群組統計資料（訊息數、連結數、圖片數、貼圖數）
- 活躍成員 Top 5
- 系統狀態（上次重啟時間）

**回應範例：**
```
📊 群組統計資訊

🔗 查看完整統計

群組統計：
📝 訊息數：1234
🔗 連結數：56
📷 圖片數：78
😊 貼圖數：234

🏆 活躍成員 Top 5：
1. 張三：456 則訊息
2. 李四：234 則訊息
3. 王五：123 則訊息
4. 趙六：89 則訊息
5. 錢七：67 則訊息

🔄 系統狀態：
上次重啟：2 小時前（2026/2/4 下午9:30:00）
```

## 統計功能

### 群組統計
- 總訊息數
- 活躍成員數
- 連結次數
- 圖片次數
- 貼圖次數

### 成員排行榜
顯示發言次數最多的成員，包含：
- 排名
- 成員名稱（優先顯示 username，其次 firstName）
- 發言次數

### 貼圖排行榜
顯示最受歡迎的貼圖（前 10 名），包含：
- 排名
- 貼圖圖片（可點擊放大）
- 使用次數

**貼圖顯示功能：**
- 自動載入貼圖圖片
- 滑鼠懸停時放大 2.5 倍
- 如果圖片載入失敗，會顯示 emoji 作為備用

## AI 回應功能

### 架構
- **模型**：qwen3:8b（透過 Ollama）
- **連接方式**：ngrok 或 Cloudflare Tunnel
- **回應時間**：Cloud Function 執行時間上限為 540 秒（9 分鐘）

### 設定步驟
1. **安裝並啟動 Ollama**
   ```bash
   # 安裝 Ollama（macOS）
   brew install ollama
   
   # 啟動 Ollama（允許外部連線）
   export OLLAMA_HOST=0.0.0.0:11434
   ollama serve
   
   # 下載模型
   ollama pull qwen3:8b
   ```

2. **設定 Tunnel（選擇其一）**
   
   **選項 A：ngrok**
   ```bash
   # 安裝 ngrok
   brew install ngrok
   
   # 啟動 tunnel
   ngrok http 11434
   ```
   詳見 [NGROK_SETUP.md](NGROK_SETUP.md)
   
   **選項 B：Cloudflare Tunnel（推薦）**
   ```bash
   # 安裝 cloudflared
   brew install cloudflared
   
   # 啟動 tunnel
   cloudflared tunnel --url http://localhost:11434
   ```
   詳見 [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md)

3. **設定 Firebase Secret**
   ```bash
   firebase functions:secrets:set NGROK_OLLAMA_URL
   # 輸入 tunnel URL（例如：https://xxxx-xxx-xxx.ngrok-free.app）
   ```

### 系統提示詞
Bot 使用以下系統提示詞：
- 身份：hao87bot，Telegram 群組的 AI 機器人助手
- 個性：幽默、機智、半開玩笑
- 語言：繁體中文
- 回應長度：簡潔有力（通常 1-3 句話）

### 未來計劃
- [ ] Context Management：保存對話歷史，讓 bot 理解群組討論脈絡
- [ ] 對話記錄：記錄每次 @bot 的問答，用於分析和優化
- [ ] 智能截斷：處理 context window 限制

詳見 [CONTEXT_MANAGEMENT_PLAN.md](CONTEXT_MANAGEMENT_PLAN.md)

## 技術架構

### 後端
- Firebase Functions v2 (Node.js 22)
- Firestore 資料庫（名為 `hao87bot`）
- Telegram Bot API
- Ollama (qwen3:8b) 用於 AI 回應

### 前端
- Vue 3 + TypeScript + Vite
- Firebase SDK
- NES.css（像素風格 UI）

### 資料結構
- `groups/{groupId}`: 群組統計資料
- `groups/{groupId}/members/{userId}`: 成員統計資料
- `groups/{groupId}/stickers/{fileUniqueId}`: 貼圖統計
- `settings/global`: 全域設定（閾值、重啟時間等）

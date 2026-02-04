# Hao87bot 3.0

Telegram 群組統計機器人，自動統計成員發言次數、連結、圖片、貼圖等數據，並提供像素風格的前端統計頁面。

## 功能特色

- 📊 自動統計群組成員發言次數、連結次數、圖片次數、貼圖次數
- 🎨 貼圖排行榜，顯示最受歡迎的貼圖（含圖片預覽）
- 🌐 像素風格的前端統計頁面（Vue 3 + TypeScript）
- 🔥 使用 Firebase Functions v2 (Node.js 22) 作為後端
- 🏥 `/health` 指令進行健康檢查
- ⚙️ `/set-activate-th` 指令設定全域啟動閾值
- 🤖 智能回應機制：未達閾值時回覆無反應訊息，超過閾值時回覆統計連結

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

# 設定 OpenAI API Key
echo -n "YOUR_OPENAI_API_KEY" | firebase functions:secrets:set OPENAI_API_KEY
```

**本地開發**：在 `functions/.env` 檔案中設定（見 `QUICKSTART.md` 說明）。

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

### 未達閾值時
當群組訊息數未超過設定的閾值，且 bot 被呼叫（使用指令或 @mention）時，bot 會隨機回覆 50 種無反應訊息之一，例如：
- `(毫無反應...)`
- `(靜悄悄...)`
- `(一片寂靜...)`
- 等等

### 超過閾值時
當群組訊息數超過設定的閾值，且 bot 被呼叫時，bot 會隨機回覆 50 種有趣或模仿詐騙訊息的文字之一，並在文字中隱藏統計網頁連結。連結會以可點擊的文字形式呈現，點擊後會開啟該群組的統計頁面。

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

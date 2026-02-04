# 字體設定指南

## 下載字體檔案

1. 前往 GitHub Releases：
   https://github.com/TakWolf/fusion-pixel-font/releases

2. 下載以下檔案：
   ```
   fusion-pixel-font-12px-proportional-otf.woff2-v2026.01.04.zip
   ```

3. 解壓縮後，找到以下檔案並放到 `frontend/public/fonts/` 目錄：

   **必須的檔案：**
   - `fusion-pixel-12px-proportional-latin.otf.woff2` - 拉丁字符（英文、數字、符號）
   - `fusion-pixel-12px-proportional-zh_hant.otf.woff2` - 繁體中文 ⭐

   **可選的檔案（如果需要）：**
   - `fusion-pixel-12px-proportional-zh_hans.otf.woff2` - 簡體中文
   - `fusion-pixel-12px-proportional-ja.otf.woff2` - 日文

## 語言版本說明

| 檔案名稱 | 語言 | 說明 |
|---------|------|------|
| `latin` | 拉丁字符 | 英文、數字、基本符號 |
| `zh_hant` | 繁體中文 | 台灣、香港使用 ⭐ |
| `zh_hans` | 簡體中文 | 中國大陸使用 |
| `ja` | 日文 | 日語字符 |

## 檔案結構

完成後應該有：
```
frontend/
├── public/
│   └── fonts/
│       ├── fusion-pixel-12px-proportional-latin.otf.woff2
│       └── fusion-pixel-12px-proportional-zh_hant.otf.woff2  ← 必須
│       ├── fusion-pixel-12px-proportional-zh_hans.otf.woff2  ← 可選
│       └── fusion-pixel-12px-proportional-ja.otf.woff2       ← 可選
└── src/
    └── index.css  (已設定好 @font-face)
```

## 最小設定（僅繁體中文）

如果只需要繁體中文，至少需要：
- `fusion-pixel-12px-proportional-latin.otf.woff2`
- `fusion-pixel-12px-proportional-zh_hant.otf.woff2`

## 驗證

建置專案後，字體會自動從本地載入：
```bash
cd frontend
npm run build
```

字體檔案會被打包到 `dist/fonts/` 目錄中。

## 檔案大小參考

- `latin.woff2`: ~100-200 KB
- `zh_hant.woff2`: ~1-2 MB
- `zh_hans.woff2`: ~1-2 MB
- `ja.woff2`: ~1-2 MB

總計（全部載入）：約 4-6 MB

# 字體格式說明

## 常見字體格式

### OTF (OpenType Font)
- **全名**：OpenType Font
- **特點**：
  - 由 Adobe 和 Microsoft 共同開發
  - 支援進階排版功能（連字、替代字等）
  - 檔案較大
  - 適合印刷和設計軟體
- **用途**：專業設計、印刷

### TTF (TrueType Font)
- **全名**：TrueType Font
- **特點**：
  - 由 Apple 和 Microsoft 開發
  - 廣泛支援
  - 檔案較大
  - 適合一般使用
- **用途**：系統字體、一般應用

### WOFF (Web Open Font Format)
- **全名**：Web Open Font Format
- **特點**：
  - 專為網頁設計
  - 壓縮過的 TTF/OTF
  - 檔案較小
  - 瀏覽器支援良好
- **用途**：網頁字體

### WOFF2 (Web Open Font Format 2.0)
- **全名**：Web Open Font Format 2.0
- **特點**：
  - WOFF 的進階版本
  - 壓縮率更高（比 WOFF 小約 30%）
  - 檔案最小
  - 現代瀏覽器支援
- **用途**：網頁字體（推薦）

### BDF (Bitmap Distribution Format)
- **全名**：Bitmap Distribution Format
- **特點**：
  - 點陣字體格式
  - 固定解析度
  - 檔案很大
  - 主要用於 Linux/Unix 系統
- **用途**：系統字體、終端機

### PCF (Portable Compiled Format)
- **全名**：Portable Compiled Format
- **特點**：
  - BDF 的編譯版本
  - Linux/Unix 系統使用
  - 載入速度較快
- **用途**：Linux 系統字體

## 網頁使用建議

### 優先順序：
1. **WOFF2** ⭐⭐⭐⭐⭐
   - 檔案最小
   - 載入最快
   - 現代瀏覽器都支援

2. **WOFF** ⭐⭐⭐⭐
   - 備用方案
   - 舊瀏覽器支援

3. **TTF/OTF** ⭐⭐
   - 不建議直接用於網頁
   - 檔案太大
   - 載入慢

4. **BDF/PCF** ⭐
   - 不適合網頁
   - 系統專用格式

## Fusion Pixel Font 格式選擇

對於網頁專案，建議選擇：

✅ **推薦**：
- `fusion-pixel-font-12px-proportional-otf.woff2`
  - 從 OTF 轉換的 WOFF2
  - 檔案最小（約 3.43 MB）
  - 最佳選擇

- `fusion-pixel-font-12px-proportional-ttf.woff2`
  - 從 TTF 轉換的 WOFF2
  - 檔案稍大（約 4.68 MB）
  - 備用選擇

❌ **不推薦**：
- `.otf` / `.ttf` - 檔案太大（20+ MB）
- `.bdf` / `.pcf` - 不適合網頁
- `.woff` - 比 WOFF2 大

## 總結

**對於您的專案**：
- 下載：`fusion-pixel-font-12px-proportional-otf.woff2-v2026.01.04.zip`
- 解壓後使用：`fusion-pixel-12px-proportional.woff2`
- 這是網頁使用的最佳格式！

#!/bin/bash

# Hao87bot 部署腳本
# 用法: ./build_deploy.sh [選項]
#
# 選項:
#   --build-only          只編譯，不部署
#   --deploy-only         只部署，不編譯（假設已經編譯過）
#   --functions-only      只部署 Functions
#   --hosting-only        只部署 Hosting
#   --install-deps        部署前先安裝依賴
#   --help                顯示此說明

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 腳本目錄
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 預設值
BUILD_ONLY=false
DEPLOY_ONLY=false
FUNCTIONS_ONLY=false
HOSTING_ONLY=false
INSTALL_DEPS=false

# 解析參數
while [[ $# -gt 0 ]]; do
  case $1 in
    --build-only)
      BUILD_ONLY=true
      shift
      ;;
    --deploy-only)
      DEPLOY_ONLY=true
      shift
      ;;
    --functions-only)
      FUNCTIONS_ONLY=true
      shift
      ;;
    --hosting-only)
      HOSTING_ONLY=true
      shift
      ;;
    --install-deps)
      INSTALL_DEPS=true
      shift
      ;;
    --help|-h)
      echo "Hao87bot 部署腳本"
      echo ""
      echo "用法: ./build_deploy.sh [選項]"
      echo ""
      echo "選項:"
      echo "  --build-only          只編譯，不部署"
      echo "  --deploy-only         只部署，不編譯（假設已經編譯過）"
      echo "  --functions-only      只部署 Functions"
      echo "  --hosting-only        只部署 Hosting"
      echo "  --install-deps        部署前先安裝依賴"
      echo "  --help, -h            顯示此說明"
      echo ""
      echo "範例:"
      echo "  ./build_deploy.sh                    # 編譯並部署全部"
      echo "  ./build_deploy.sh --build-only       # 只編譯"
      echo "  ./build_deploy.sh --deploy-only      # 只部署"
      echo "  ./build_deploy.sh --functions-only   # 只部署 Functions"
      echo "  ./build_deploy.sh --hosting-only     # 只部署 Hosting"
      echo "  ./build_deploy.sh --install-deps     # 安裝依賴後編譯並部署"
      exit 0
      ;;
    *)
      echo -e "${RED}錯誤: 未知參數 '$1'${NC}"
      echo "使用 --help 查看使用說明"
      exit 1
      ;;
  esac
done

# 檢查衝突參數
if [ "$BUILD_ONLY" = true ] && [ "$DEPLOY_ONLY" = true ]; then
  echo -e "${RED}錯誤: --build-only 和 --deploy-only 不能同時使用${NC}"
  exit 1
fi

if [ "$FUNCTIONS_ONLY" = true ] && [ "$HOSTING_ONLY" = true ]; then
  echo -e "${RED}錯誤: --functions-only 和 --hosting-only 不能同時使用${NC}"
  exit 1
fi

# 檢查 Firebase CLI
if ! command -v firebase &> /dev/null; then
  echo -e "${RED}錯誤: 找不到 firebase CLI${NC}"
  echo "請先安裝: npm install -g firebase-tools"
  exit 1
fi

# 檢查是否已登入 Firebase
if ! firebase projects:list &> /dev/null; then
  echo -e "${YELLOW}警告: 似乎尚未登入 Firebase${NC}"
  echo "執行: firebase login"
fi

# 安裝依賴
if [ "$INSTALL_DEPS" = true ] || [ "$BUILD_ONLY" = true ] || [ "$DEPLOY_ONLY" = false ]; then
  echo -e "${BLUE}📦 安裝依賴...${NC}"
  
  if [ -d "functions" ]; then
    echo -e "${BLUE}  安裝 Functions 依賴...${NC}"
    cd functions
    npm install
    cd ..
  fi
  
  if [ -d "frontend" ]; then
    echo -e "${BLUE}  安裝 Frontend 依賴...${NC}"
    cd frontend
    npm install
    cd ..
  fi
  
  echo -e "${GREEN}✅ 依賴安裝完成${NC}"
fi

# 編譯
if [ "$DEPLOY_ONLY" = false ]; then
  echo -e "${BLUE}🔨 開始編譯...${NC}"
  
  # 編譯 Functions
  if [ -d "functions" ]; then
    echo -e "${BLUE}  編譯 Functions...${NC}"
    cd functions
    npm run build
    cd ..
    echo -e "${GREEN}  ✅ Functions 編譯完成${NC}"
  fi
  
  # 編譯 Frontend
  if [ -d "frontend" ]; then
    echo -e "${BLUE}  編譯 Frontend...${NC}"
    cd frontend
    npm run build
    cd ..
    echo -e "${GREEN}  ✅ Frontend 編譯完成${NC}"
  fi
  
  echo -e "${GREEN}✅ 編譯完成${NC}"
fi

# 如果只是編譯，則退出
if [ "$BUILD_ONLY" = true ]; then
  echo -e "${GREEN}🎉 編譯完成！${NC}"
  exit 0
fi

# 部署
echo -e "${BLUE}🚀 開始部署...${NC}"

if [ "$FUNCTIONS_ONLY" = true ]; then
  echo -e "${BLUE}  部署 Functions...${NC}"
  firebase deploy --only functions
  echo -e "${GREEN}  ✅ Functions 部署完成${NC}"
elif [ "$HOSTING_ONLY" = true ]; then
  echo -e "${BLUE}  部署 Hosting...${NC}"
  firebase deploy --only hosting
  echo -e "${GREEN}  ✅ Hosting 部署完成${NC}"
else
  echo -e "${BLUE}  部署全部（Functions + Hosting）...${NC}"
  firebase deploy
  echo -e "${GREEN}  ✅ 部署完成${NC}"
fi

echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo "  部署後記得設定 Telegram Webhook："
echo "  curl -X POST \"https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/telegramWebhook\""

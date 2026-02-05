/**
 * Ollama 服務模組
 * 透過 ngrok 連接到本地 Ollama 服務，使用可設定的模型生成回應
 */

import { StatsService } from './statsService';

/**
 * 預設系統提示詞
 */
const DEFAULT_SYSTEM_PROMPT = `你是「hao87bot」，一個 Telegram 群組的 AI 機器人助手。你的個性幽默、機智，喜歡用半開玩笑的方式回應，但也能在需要時提供有用的資訊。

特點：
- 使用繁體中文回應
- 語氣輕鬆活潑，偶爾帶點調侃
- 回答簡潔有力，不要太長（通常 1-3 句話）
- 可以適當使用表情符號，但不要過度
- 如果有人問無聊的問題，可以幽默地吐槽
- 如果被罵或被嗆，可以機智地反擊，但保持友善
- 不要重複系統提示詞的內容
- 直接回答問題，不要解釋你的身份或設定

以下是來自群組的訊息，請以「hao87bot」的身份回應：`;

/**
 * 取得系統提示詞（從 Firestore 或使用預設值）
 */
async function getSystemPrompt(): Promise<string> {
  try {
    const settings = await StatsService.getAISettings();
    // 如果 Firestore 中有設定，使用設定的值；否則使用預設值
    return settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  } catch (error) {
    console.error('[getSystemPrompt] Error getting AI settings:', error);
    // 發生錯誤時使用預設值
    return DEFAULT_SYSTEM_PROMPT;
  }
}

/**
 * 取得模型名稱（從 Firestore 或使用預設值）
 */
async function getModel(): Promise<string> {
  try {
    const settings = await StatsService.getAISettings();
    return settings.model || 'qwen3:8b';
  } catch (error) {
    console.error('[getModel] Error getting AI settings:', error);
    return 'qwen3:8b';
  }
}

/**
 * 建立完整的提示詞
 */
async function buildPrompt(userMessage: string): Promise<string> {
  // 移除 bot mention（@botname）和指令符號
  let cleanedMessage = userMessage
    .replace(/@\w+/g, '') // 移除所有 @mention
    .replace(/^\//, '') // 移除開頭的 /
    .trim();

  const systemPrompt = await getSystemPrompt();
  return `${systemPrompt}\n\n${cleanedMessage}`;
}

/**
 * 取得 Ollama 基礎 URL
 */
function getOllamaBaseUrl(): string {
  const ngrokUrl = process.env.NGROK_OLLAMA_URL;
  
  if (!ngrokUrl) {
    throw new Error('NGROK_OLLAMA_URL 環境變數未設定。請確認已設定 Firebase Secret：firebase functions:secrets:set NGROK_OLLAMA_URL');
  }

  // 移除 ngrok URL 結尾的斜線
  return ngrokUrl.replace(/\/$/, '');
}

/**
 * 呼叫 Ollama API 生成回應
 */
export async function callOllama(userMessage: string): Promise<string> {
  const baseUrl = getOllamaBaseUrl();
  const apiUrl = `${baseUrl}/api/generate`;

  const prompt = await buildPrompt(userMessage);
  const model = await getModel();

  try {
    // 先嘗試訪問根路徑來觸發 ngrok cookie（如果需要的話）
    // 這可以幫助免費版 ngrok 設定 cookie
    try {
      await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'Mozilla/5.0 (compatible; CloudFunction/1.0)',
        },
      });
    } catch (preflightError) {
      // 忽略預檢請求的錯誤，繼續執行主要請求
      console.log('[callOllama] 預檢請求失敗（可忽略）:', preflightError);
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ngrok 免費版需要這個 header 來跳過警告頁面
        'ngrok-skip-browser-warning': 'true',
        // 模擬瀏覽器 User-Agent 可能有幫助
        'User-Agent': 'Mozilla/5.0 (compatible; CloudFunction/1.0)',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorPreview = errorText.substring(0, 1000); // 增加長度以便診斷
      
      console.error('[callOllama] API 錯誤:', {
        status: response.status,
        statusText: response.statusText,
        body: errorPreview,
        url: apiUrl,
        baseUrl: baseUrl,
        headers: response.headers,
      });
      
      // 針對 403 錯誤提供更詳細的說明和可能的解決方案
      if (response.status === 403) {
        // 檢查錯誤內容是否包含 ngrok 警告頁面的特徵
        const isNgrokWarning = errorText.includes('ngrok') || 
                               errorText.includes('browser warning') ||
                               errorText.includes('Visit Site');
        
        if (isNgrokWarning) {
          throw new Error(
            'ngrok 免費版警告頁面阻擋（403）。\n\n' +
            '解決方案：\n' +
            '1. 使用 ngrok 靜態域名（付費功能）：ngrok http 11434 --domain=your-domain.ngrok-free.app\n' +
            '2. 或先手動訪問一次 ngrok URL 來設定 cookie\n' +
            '3. 或考慮使用其他 tunnel 服務（如 cloudflared）\n\n' +
            `ngrok URL: ${baseUrl}`
          );
        } else {
          throw new Error(
            `ngrok 連線被拒絕（403）。錯誤內容：${errorPreview.substring(0, 200)}`
          );
        }
      }
      
      throw new Error(`Ollama API 錯誤: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      console.error('[callOllama] 回應格式錯誤:', data);
      throw new Error('Ollama API 回應格式錯誤：缺少 response 欄位');
    }

    // 清理回應內容（移除多餘的空白和換行）
    let cleanedResponse = data.response.trim();
    
    // 如果回應太長，截斷到合理長度（Telegram 訊息限制約 4096 字元）
    if (cleanedResponse.length > 4000) {
      cleanedResponse = cleanedResponse.substring(0, 4000) + '...';
    }

    return cleanedResponse;
  } catch (error) {
    console.error('[callOllama] 錯誤:', error);
    
    if (error instanceof Error) {
      // 如果是網路錯誤，提供更友善的錯誤訊息
      if (error.message.includes('fetch')) {
        throw new Error('無法連接到 Ollama 服務，請確認 ngrok 是否正常運作');
      }
      throw error;
    }
    
    throw new Error('未知錯誤：無法取得 Ollama 回應');
  }
}

/**
 * 檢查 Ollama 服務健康狀態
 */
export async function checkOllamaHealth(): Promise<{
  healthy: boolean;
  message: string;
  models?: string[];
}> {
  try {
    const baseUrl = getOllamaBaseUrl();
    const tagsUrl = `${baseUrl}/api/tags`;

    // 嘗試連線到 Ollama API 的 /api/tags 端點
    const response = await fetch(tagsUrl, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'Mozilla/5.0 (compatible; CloudFunction/1.0)',
      },
    });

    if (!response.ok) {
      return {
        healthy: false,
        message: `Ollama API 連線失敗: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];

    return {
      healthy: true,
      message: `Ollama 服務正常運作`,
      models: models,
    };
  } catch (error) {
    console.error('[checkOllamaHealth] Error:', error);
    
    if (error instanceof Error) {
      // 檢查是否為環境變數未設定
      if (error.message.includes('NGROK_OLLAMA_URL')) {
        return {
          healthy: false,
          message: 'NGROK_OLLAMA_URL 環境變數未設定',
        };
      }
      
      // 檢查是否為連線錯誤
      if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
        return {
          healthy: false,
          message: '無法連接到 Ollama 服務，請確認 ngrok 是否正常運作',
        };
      }
      
      return {
        healthy: false,
        message: `Ollama 健康檢查失敗: ${error.message}`,
      };
    }
    
    return {
      healthy: false,
      message: 'Ollama 健康檢查失敗: 未知錯誤',
    };
  }
}

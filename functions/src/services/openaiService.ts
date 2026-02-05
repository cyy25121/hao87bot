/**
 * OpenAI 服務模組
 * 使用 OpenAI Chat Completions API 生成回應
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
    return settings.model || 'gpt-4o-mini';
  } catch (error) {
    console.error('[getModel] Error getting AI settings:', error);
    return 'gpt-4o-mini';
  }
}

/**
 * 清理使用者訊息
 */
function cleanUserMessage(userMessage: string): string {
  // 移除 bot mention（@botname）和指令符號
  return userMessage
    .replace(/@\w+/g, '') // 移除所有 @mention
    .replace(/^\//, '') // 移除開頭的 /
    .trim();
}

/**
 * 取得 OpenAI API Key
 */
function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 環境變數未設定。請確認已設定 Firebase Secret：firebase functions:secrets:set OPENAI_API_KEY');
  }

  return apiKey;
}

/**
 * 呼叫 OpenAI API 生成回應
 */
export async function callOpenAI(userMessage: string): Promise<string> {
  const apiKey = getOpenAIApiKey();
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const systemPrompt = await getSystemPrompt();
  const model = await getModel();
  const cleanedMessage = cleanUserMessage(userMessage);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanedMessage },
        ],
        temperature: 0.7,
        max_tokens: 500, // 限制回應長度
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      
      console.error('[callOpenAI] API 錯誤:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
      });

      // 處理常見錯誤
      if (response.status === 401) {
        throw new Error('OpenAI API Key 無效或已過期');
      } else if (response.status === 429) {
        throw new Error('OpenAI API 配額已用完或達到速率限制');
      } else if (response.status === 500) {
        throw new Error('OpenAI 服務暫時無法使用，請稍後再試');
      }

      throw new Error(`OpenAI API 錯誤: ${errorMessage}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[callOpenAI] 回應格式錯誤:', data);
      throw new Error('OpenAI API 回應格式錯誤：缺少 choices 或 message 欄位');
    }

    // 取得回應內容
    let responseText = data.choices[0].message.content || '';
    
    // 清理回應內容（移除多餘的空白和換行）
    responseText = responseText.trim();
    
    // 如果回應太長，截斷到合理長度（Telegram 訊息限制約 4096 字元）
    if (responseText.length > 4000) {
      responseText = responseText.substring(0, 4000) + '...';
    }

    return responseText;
  } catch (error) {
    console.error('[callOpenAI] 錯誤:', error);
    
    if (error instanceof Error) {
      // 如果是網路錯誤，提供更友善的錯誤訊息
      if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
        throw new Error('無法連接到 OpenAI 服務，請檢查網路連線');
      }
      throw error;
    }
    
    throw new Error('未知錯誤：無法取得 OpenAI 回應');
  }
}

/**
 * 檢查 OpenAI 服務健康狀態
 */
export async function checkOpenAIHealth(): Promise<{
  healthy: boolean;
  message: string;
  model?: string;
}> {
  try {
    const apiKey = getOpenAIApiKey();
    const apiUrl = 'https://api.openai.com/v1/models';

    // 嘗試列出可用模型來測試 API Key
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          healthy: false,
          message: 'OpenAI API Key 無效或已過期',
        };
      } else if (response.status === 429) {
        return {
          healthy: false,
          message: 'OpenAI API 配額已用完或達到速率限制',
        };
      }
      
      return {
        healthy: false,
        message: `OpenAI API 連線失敗: ${response.status} ${response.statusText}`,
      };
    }

    // 驗證 API 回應格式（不需要實際使用資料）
    await response.json();
    
    // 取得目前設定的模型
    const currentModel = await getModel();

    return {
      healthy: true,
      message: `OpenAI 服務正常運作`,
      model: currentModel,
    };
  } catch (error) {
    console.error('[checkOpenAIHealth] Error:', error);
    
    if (error instanceof Error) {
      // 檢查是否為環境變數未設定
      if (error.message.includes('OPENAI_API_KEY')) {
        return {
          healthy: false,
          message: 'OPENAI_API_KEY 環境變數未設定',
        };
      }
      
      // 檢查是否為連線錯誤
      if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
        return {
          healthy: false,
          message: '無法連接到 OpenAI 服務，請檢查網路連線',
        };
      }
      
      return {
        healthy: false,
        message: `OpenAI 健康檢查失敗: ${error.message}`,
      };
    }
    
    return {
      healthy: false,
      message: 'OpenAI 健康檢查失敗: 未知錯誤',
    };
  }
}

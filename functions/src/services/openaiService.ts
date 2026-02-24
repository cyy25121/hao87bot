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
 * 回應格式後綴：指示 AI 使用 Markdown 格式回應
 */
const RESPONSE_FORMAT_SUFFIX = `

回應格式要求：
- 使用標準 Markdown 格式（粗體用 **文字**、斜體用 *文字*、程式碼用 \`code\` 或 \`\`\`code block\`\`\`）
- 回應控制在 2000 字以內`;

/**
 * 取得系統提示詞（從 Firestore 或使用預設值）
 */
async function getSystemPrompt(): Promise<string> {
  try {
    const settings = await StatsService.getAISettings();
    // 如果 Firestore 中有設定，使用設定的值；否則使用預設值
    const basePrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    return basePrompt + RESPONSE_FORMAT_SUFFIX;
  } catch (error) {
    console.error('[getSystemPrompt] Error getting AI settings:', error);
    // 發生錯誤時使用預設值
    return DEFAULT_SYSTEM_PROMPT + RESPONSE_FORMAT_SUFFIX;
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
 * 判斷是否為推理模型（o 系列、gpt-5 系列），這些模型使用 reasoning tokens，
 * 不支援 temperature、top_p 等取樣參數，且需使用 developer role 取代 system role
 */
function isReasoningModel(model: string): boolean {
  return /^(o1|o3|o4|gpt-5)/.test(model);
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
export async function callOpenAI(userMessage: string, conversationContext?: string): Promise<string> {
  const apiKey = getOpenAIApiKey();
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const systemPrompt = await getSystemPrompt();
  const model = await getModel();
  const cleanedMessage = cleanUserMessage(userMessage);

  console.warn(`[callOpenAI] 開始呼叫 model=${model}, cleanedMessage="${cleanedMessage.substring(0, 80)}", hasContext=${!!conversationContext}`);

  // 如果有上下文，將其附加到系統提示詞
  const fullSystemPrompt = conversationContext
    ? `${systemPrompt}\n\n${conversationContext}`
    : systemPrompt;

  try {
    const reasoning = isReasoningModel(model);

    // 推理模型使用 developer role，一般模型使用 system role
    const systemRole = reasoning ? 'developer' : 'system';

    // 推理模型的 max_completion_tokens 包含思考 token + 回應 token，需要更大的值
    const maxTokens = reasoning ? 4096 : 500;

    const requestBody: Record<string, unknown> = {
      model: model,
      messages: [
        { role: systemRole, content: fullSystemPrompt },
        { role: 'user', content: cleanedMessage },
      ],
      max_completion_tokens: maxTokens,
    };

    console.warn(`[callOpenAI] 送出請求 model=${model}, role=${systemRole}, reasoning=${reasoning}, maxTokens=${maxTokens}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
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

    console.warn(`[callOpenAI] 收到回應 finishReason=${data.choices?.[0]?.finish_reason}, contentType=${typeof data.choices?.[0]?.message?.content}, contentLength=${data.choices?.[0]?.message?.content?.length}, usage=${JSON.stringify(data.usage)}`);
    console.warn(`[callOpenAI] 回應內容前200字: ${(data.choices?.[0]?.message?.content || '(null)').substring(0, 200)}`);
    console.warn(`[callOpenAI] message keys: ${data.choices?.[0]?.message ? Object.keys(data.choices[0].message).join(',') : 'N/A'}`);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[callOpenAI] 回應格式錯誤:', JSON.stringify(data).substring(0, 500));
      throw new Error('OpenAI API 回應格式錯誤：缺少 choices 或 message 欄位');
    }

    const msg = data.choices[0].message;

    // 處理模型拒絕回應的情況
    if (msg.refusal) {
      console.warn('[callOpenAI] 模型拒絕回應:', msg.refusal);
      return '🤖 抱歉，我無法回應這個問題。';
    }

    // 取得回應內容（推理模型的 content 可能為 null）
    let responseText = (msg.content || '').trim();

    console.warn(`[callOpenAI] 最終回應 length=${responseText.length}, isEmpty=${responseText.length === 0}, 前100字="${responseText.substring(0, 100)}"`);
    
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

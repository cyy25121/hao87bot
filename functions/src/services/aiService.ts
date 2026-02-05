/**
 * 統一的 AI 服務入口
 * 根據設定的 provider 選擇呼叫 Ollama 或 OpenAI
 */

import { callOllama, checkOllamaHealth } from './ollamaService';
import { callOpenAI, checkOpenAIHealth } from './openaiService';
import { StatsService } from './statsService';

/**
 * 取得 AI Provider（從 Firestore 或使用預設值）
 */
async function getAIProvider(): Promise<'ollama' | 'openai'> {
  try {
    const settings = await StatsService.getAISettings();
    return (settings.provider as 'ollama' | 'openai') || 'ollama';
  } catch (error) {
    console.error('[getAIProvider] Error getting AI settings:', error);
    return 'ollama'; // 預設使用 Ollama
  }
}

/**
 * 統一的 AI 呼叫介面
 */
export async function callAI(userMessage: string): Promise<string> {
  const provider = await getAIProvider();

  if (provider === 'openai') {
    return await callOpenAI(userMessage);
  } else {
    return await callOllama(userMessage);
  }
}

/**
 * 統一的 AI 健康檢查介面
 */
export async function checkAIHealth(): Promise<{
  healthy: boolean;
  message: string;
  provider: 'ollama' | 'openai';
  models?: string[];
  model?: string;
}> {
  const provider = await getAIProvider();

  if (provider === 'openai') {
    const health = await checkOpenAIHealth();
    return {
      ...health,
      provider: 'openai',
    };
  } else {
    const health = await checkOllamaHealth();
    return {
      ...health,
      provider: 'ollama',
    };
  }
}

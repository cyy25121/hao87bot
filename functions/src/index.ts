import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { handleWebhook } from './telegram/webhook';
import { TelegramUpdate } from './types';

initializeApp();

// 定義需要的 secrets
const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN');
const openaiApiKey = defineSecret('OPENAI_API_KEY');
const ngrokOllamaUrl = defineSecret('NGROK_OLLAMA_URL');

// Telegram Webhook
export const telegramWebhook = onRequest(
  { 
    secrets: [telegramBotToken, openaiApiKey, ngrokOllamaUrl],
    timeoutSeconds: 540, // Cloud Functions v2 HTTP 觸發最高 9 分鐘（540 秒）
  },
  async (req, res) => {
    // 只接受 POST 請求
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const update = req.body as TelegramUpdate;
      await handleWebhook(update);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[Webhook] Error processing update:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// API: 取得貼圖 URL
export const getStickerUrl = onRequest(
  { secrets: [telegramBotToken] },
  async (req, res) => {
    // 設定 CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const fileId = req.query.file_id as string;
    if (!fileId) {
      res.status(400).json({ error: 'file_id is required' });
      return;
    }

    try {
      const botToken = telegramBotToken.value();
      if (!botToken) {
        res.status(500).json({ error: 'Bot token not configured' });
        return;
      }

      // 呼叫 Telegram getFile API
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
      const data = await response.json();

      if (data.ok && data.result) {
        const filePath = data.result.file_path;
        const url = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        res.json({ url });
      } else {
        console.error('[getStickerUrl] Telegram API error:', data);
        res.status(404).json({ error: 'File not found', details: data });
      }
    } catch (error) {
      console.error('[getStickerUrl] Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

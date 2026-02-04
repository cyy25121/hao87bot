import OpenAI from 'openai';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GeneratedImage } from '../types';
import { StatsService } from './statsService';

// 延遲初始化 Firestore 和 Storage，避免在模組載入時就存取
// 使用指定的資料庫名稱 'hao87bot'
function getDb() {
  return getFirestore(admin.app(), 'hao87bot');
}

function getStorage() {
  return admin.storage();
}

export class ImageService {
  private static openai: OpenAI;

  static initialize(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * 根據群組訊息生成像素風格圖片
   */
  static async generatePixelArt(groupId: number, messages: string[]): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // 從訊息中提取關鍵字或主題
    const prompt = this.buildPrompt(messages);

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      });

      const imageData = response.data?.[0];
      if (!imageData?.url) {
        throw new Error('Failed to generate image');
      }
      const imageUrl = imageData.url;

      // 下載圖片並上傳到 Firebase Storage
      const storageUrl = await this.uploadToStorage(groupId, imageUrl);

      // 儲存圖片記錄
      await this.saveImageRecord(groupId, prompt, storageUrl);

      return storageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  /**
   * 建立像素風格的 prompt
   */
  private static buildPrompt(messages: string[]): string {
    // 從訊息中提取關鍵字（簡化實作）
    const keywords = this.extractKeywords(messages);
    
    return `Pixel art style, 8-bit retro game aesthetic, ${keywords.join(', ')}. Colorful, vibrant, nostalgic video game sprite art.`;
  }

  /**
   * 從訊息中提取關鍵字
   */
  private static extractKeywords(messages: string[]): string[] {
    // 簡化實作：取前幾個訊息的前幾個字
    const keywords: string[] = [];
    const maxKeywords = 5;

    for (const msg of messages.slice(0, 10)) {
      const words = msg
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 2);
      keywords.push(...words);
      if (keywords.length >= maxKeywords) break;
    }

    return keywords.slice(0, maxKeywords);
  }

  /**
   * 上傳圖片到 Firebase Storage
   */
  private static async uploadToStorage(groupId: number, imageUrl: string): Promise<string> {
    const storage = getStorage();
    const bucket = storage.bucket();
    const fileName = `groups/${groupId}/images/${Date.now()}.png`;
    const file = bucket.file(fileName);

    // 下載圖片
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // 上傳到 Storage
    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
      },
    });

    // 設定公開讀取權限
    await file.makePublic();

    // 返回公開 URL
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  }

  /**
   * 儲存圖片記錄到 Firestore
   */
  private static async saveImageRecord(
    groupId: number,
    prompt: string,
    url: string
  ): Promise<void> {
    const group = await StatsService.getGroupStats(groupId);
    if (!group) return;

    const imageRecord: GeneratedImage = {
      url,
      prompt,
      generatedAt: admin.firestore.Timestamp.now(),
      messageCountSnapshot: group.messageCount,
    };

    const db = getDb();
    await db
      .collection('groups')
      .doc(groupId.toString())
      .collection('images')
      .add(imageRecord);
  }

  /**
   * 取得群組的歷史圖片
   */
  static async getGroupImages(groupId: number): Promise<GeneratedImage[]> {
    const db = getDb();
    const imagesSnapshot = await db
      .collection('groups')
      .doc(groupId.toString())
      .collection('images')
      .orderBy('generatedAt', 'desc')
      .limit(20)
      .get();

    return imagesSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as GeneratedImage);
  }
}

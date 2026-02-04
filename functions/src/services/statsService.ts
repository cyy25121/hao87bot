import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GroupStats, MemberStats, StoredMessage, StickerStats } from '../types';

// 延遲初始化 Firestore，避免在模組載入時就存取
// 使用指定的資料庫名稱 'hao87bot'
function getDb() {
  return getFirestore(admin.app(), 'hao87bot');
}

export class StatsService {
  /**
   * 初始化或取得群組統計資料
   */
  static async getOrCreateGroup(groupId: number, title: string): Promise<GroupStats> {
    try {
      const db = getDb();
      const groupRef = db.collection('groups').doc(groupId.toString());
      const groupDoc = await groupRef.get();

      if (groupDoc.exists) {
        return groupDoc.data() as GroupStats;
      }

      const newGroup: GroupStats = {
        groupId,
        title,
        messageCount: 0,
        linkCount: 0,
        photoCount: 0,
        stickerCount: 0,
        lastImageAt: 0,
        threshold: 100, // 保留欄位以向後兼容，實際使用全域閾值
        createdAt: admin.firestore.Timestamp.now(),
      };

      await groupRef.set(newGroup);
      return newGroup;
    } catch (error) {
      console.error(`[StatsService] Error in getOrCreateGroup:`, error);
      throw error;
    }
  }

  /**
   * 更新群組訊息計數
   */
  static async incrementMessageCount(groupId: number): Promise<number> {
    try {
      const db = getDb();
      const groupRef = db.collection('groups').doc(groupId.toString());
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        // 如果群組不存在，建立一個新的
        await this.getOrCreateGroup(groupId, 'Unknown Group');
        const newDoc = await groupRef.get();
        const newCount = (newDoc.data()?.messageCount || 0) + 1;
        await groupRef.update({ messageCount: newCount });
        return newCount;
      }

      const currentCount = groupDoc.data()?.messageCount || 0;
      const newCount = currentCount + 1;
      await groupRef.update({ messageCount: newCount });
      return newCount;
    } catch (error) {
      console.error(`[StatsService] Error in incrementMessageCount:`, error);
      throw error;
    }
  }

  /**
   * 更新群組連結計數
   */
  static async incrementLinkCount(groupId: number): Promise<void> {
    try {
      const db = getDb();
      const groupRef = db.collection('groups').doc(groupId.toString());
      const groupDoc = await groupRef.get();

      if (groupDoc.exists) {
        const currentCount = groupDoc.data()?.linkCount || 0;
        await groupRef.update({ linkCount: currentCount + 1 });
      }
    } catch (error) {
      console.error(`[StatsService] Error in incrementLinkCount:`, error);
      throw error;
    }
  }

  /**
   * 更新群組圖片計數
   */
  static async incrementPhotoCount(groupId: number): Promise<void> {
    try {
      const db = getDb();
      const groupRef = db.collection('groups').doc(groupId.toString());
      const groupDoc = await groupRef.get();

      if (groupDoc.exists) {
        const currentCount = groupDoc.data()?.photoCount || 0;
        await groupRef.update({ photoCount: currentCount + 1 });
      }
    } catch (error) {
      console.error(`[StatsService] Error in incrementPhotoCount:`, error);
      throw error;
    }
  }

  /**
   * 更新群組貼圖計數
   */
  static async incrementStickerCount(groupId: number): Promise<void> {
    try {
      const db = getDb();
      const groupRef = db.collection('groups').doc(groupId.toString());
      const groupDoc = await groupRef.get();

      if (groupDoc.exists) {
        const currentCount = groupDoc.data()?.stickerCount || 0;
        await groupRef.update({ stickerCount: currentCount + 1 });
      }
    } catch (error) {
      console.error(`[StatsService] Error in incrementStickerCount:`, error);
      throw error;
    }
  }

  /**
   * 新增成員最近訊息（最多保留 100 則）
   */
  static async addRecentMessage(
    groupId: number,
    userId: number,
    message: StoredMessage
  ): Promise<void> {
    try {
      const db = getDb();
      const memberRef = db
        .collection('groups')
        .doc(groupId.toString())
        .collection('members')
        .doc(userId.toString());

      const memberDoc = await memberRef.get();
      const currentMessages: StoredMessage[] = memberDoc.data()?.recentMessages || [];

      // 加入新訊息，保持最多 100 則
      const updatedMessages = [...currentMessages, message].slice(-100);

      await memberRef.update({
        recentMessages: updatedMessages,
      });
    } catch (error) {
      console.error(`[StatsService] Error in addRecentMessage:`, error);
      throw error;
    }
  }

  /**
   * 更新成員統計
   */
  static async updateMemberStats(
    groupId: number,
    userId: number,
    username: string | undefined,
    firstName: string | undefined,
    messageText: string,
    messageType: 'text' | 'photo' | 'sticker' | 'link' = 'text'
  ): Promise<void> {
    try {
      const db = getDb();
      const memberRef = db
        .collection('groups')
        .doc(groupId.toString())
        .collection('members')
        .doc(userId.toString());

      const memberDoc = await memberRef.get();
      const now = admin.firestore.Timestamp.now();

      // 建立訊息記錄
      const storedMessage: StoredMessage = {
        text: messageText,
        timestamp: now,
        type: messageType,
      };

      if (memberDoc.exists) {
        const data = memberDoc.data()!;
        const currentCount = data.messageCount || 0;
        const currentLinkCount = data.linkCount || 0;
        const currentPhotoCount = data.photoCount || 0;
        const currentStickerCount = data.stickerCount || 0;

        const updates: any = {
          messageCount: currentCount + 1,
          lastMessage: messageText,
          lastActiveAt: now,
          username: username || data.username,
          firstName: firstName || data.firstName,
        };

        // 根據訊息類型更新對應計數
        if (messageType === 'link') {
          updates.linkCount = currentLinkCount + 1;
        } else if (messageType === 'photo') {
          updates.photoCount = currentPhotoCount + 1;
        } else if (messageType === 'sticker') {
          updates.stickerCount = currentStickerCount + 1;
        }

        await memberRef.update(updates);

        // 儲存訊息到歷史記錄
        await this.addRecentMessage(groupId, userId, storedMessage);
      } else {
        const newMember: MemberStats = {
          userId,
          username,
          firstName,
          messageCount: 1,
          linkCount: messageType === 'link' ? 1 : 0,
          photoCount: messageType === 'photo' ? 1 : 0,
          stickerCount: messageType === 'sticker' ? 1 : 0,
          lastMessage: messageText,
          recentMessages: [storedMessage],
          lastActiveAt: now,
        };
        await memberRef.set(newMember);
      }
    } catch (error) {
      console.error(`[StatsService] Error in updateMemberStats:`, error);
      throw error;
    }
  }

  /**
   * 取得群組統計資料（用於 API）
   */
  static async getGroupStats(groupId: number): Promise<GroupStats | null> {
    const db = getDb();
    const groupRef = db.collection('groups').doc(groupId.toString());
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) {
      return null;
    }
    
    const data = groupDoc.data() as GroupStats;
    
    // 確保新欄位存在（處理舊資料的相容性）
    if (data.linkCount === undefined || data.photoCount === undefined || data.stickerCount === undefined) {
      const updates: any = {};
      if (data.linkCount === undefined) updates.linkCount = 0;
      if (data.photoCount === undefined) updates.photoCount = 0;
      if (data.stickerCount === undefined) updates.stickerCount = 0;
      
      // 更新資料庫
      await groupRef.update(updates);
      
      // 更新返回的資料
      return {
        ...data,
        linkCount: data.linkCount ?? 0,
        photoCount: data.photoCount ?? 0,
        stickerCount: data.stickerCount ?? 0,
      };
    }
    
    return data;
  }

  /**
   * 取得群組成員列表（用於 API）
   */
  static async getGroupMembers(groupId: number): Promise<MemberStats[]> {
    const db = getDb();
    const membersSnapshot = await db
      .collection('groups')
      .doc(groupId.toString())
      .collection('members')
      .orderBy('messageCount', 'desc')
      .get();

    return membersSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as MemberStats);
  }

  /**
   * 更新上次生成圖片的訊息數
   */
  static async updateLastImageAt(groupId: number, messageCount: number): Promise<void> {
    const db = getDb();
    await db
      .collection('groups')
      .doc(groupId.toString())
      .update({ lastImageAt: messageCount });
  }

  /**
   * 取得成員最近的訊息內容（用於生成圖片）
   */
  static async getRecentMessages(groupId: number, userId: number, limit: number = 100): Promise<StoredMessage[]> {
    try {
      const db = getDb();
      const memberRef = db
        .collection('groups')
        .doc(groupId.toString())
        .collection('members')
        .doc(userId.toString());

      const memberDoc = await memberRef.get();
      if (!memberDoc.exists) {
        return [];
      }

      const recentMessages: StoredMessage[] = memberDoc.data()?.recentMessages || [];
      return recentMessages.slice(-limit);
    } catch (error) {
      console.error(`[StatsService] Error in getRecentMessages:`, error);
      return [];
    }
  }

  /**
   * 記錄貼圖使用
   */
  static async recordStickerUsage(
    groupId: number,
    userId: number,
    sticker: {
      file_unique_id: string;
      file_id: string;
      emoji?: string;
      set_name?: string;
    }
  ): Promise<void> {
    try {
      const db = getDb();
      const stickerRef = db
        .collection('groups')
        .doc(groupId.toString())
        .collection('stickers')
        .doc(sticker.file_unique_id);

      const stickerDoc = await stickerRef.get();
      const now = admin.firestore.Timestamp.now();

      if (stickerDoc.exists) {
        const currentCount = stickerDoc.data()?.count || 0;
        await stickerRef.update({
          count: currentCount + 1,
          lastUsedAt: now,
          lastUsedBy: userId,
          fileId: sticker.file_id || stickerDoc.data()?.fileId,
          emoji: sticker.emoji || stickerDoc.data()?.emoji,
          setName: sticker.set_name || stickerDoc.data()?.setName,
        });
      } else {
        const newSticker: StickerStats = {
          fileUniqueId: sticker.file_unique_id,
          fileId: sticker.file_id,
          emoji: sticker.emoji,
          setName: sticker.set_name,
          count: 1,
          lastUsedAt: now,
          lastUsedBy: userId,
        };
        await stickerRef.set(newSticker);
      }
    } catch (error) {
      console.error(`[StatsService] Error in recordStickerUsage:`, error);
      throw error;
    }
  }

  /**
   * 取得熱門貼圖排行榜
   */
  static async getTopStickers(groupId: number, limit: number = 10): Promise<StickerStats[]> {
    try {
      const db = getDb();
      const stickersSnapshot = await db
        .collection('groups')
        .doc(groupId.toString())
        .collection('stickers')
        .orderBy('count', 'desc')
        .limit(limit)
        .get();

      return stickersSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as StickerStats);
    } catch (error) {
      console.error(`[StatsService] Error in getTopStickers:`, error);
      return [];
    }
  }

  /**
   * 取得全域啟動閾值
   */
  static async getGlobalThreshold(): Promise<number> {
    try {
      const db = getDb();
      const settingsRef = db.collection('settings').doc('global');
      const settingsDoc = await settingsRef.get();

      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        return data?.threshold || 100; // 預設值為 100
      }

      // 如果不存在，建立預設設定
      await settingsRef.set({ threshold: 100 });
      return 100;
    } catch (error) {
      console.error(`[StatsService] Error in getGlobalThreshold:`, error);
      return 100; // 發生錯誤時返回預設值
    }
  }

  /**
   * 設定全域啟動閾值
   */
  static async setGlobalThreshold(threshold: number): Promise<void> {
    try {
      const db = getDb();
      const settingsRef = db.collection('settings').doc('global');
      await settingsRef.set({ threshold }, { merge: true });
    } catch (error) {
      console.error(`[StatsService] Error in setGlobalThreshold:`, error);
      throw error;
    }
  }

  /**
   * 設定群組啟動閾值（已廢棄，保留以向後兼容）
   * @deprecated 請使用 setGlobalThreshold 設定全域閾值
   */
  static async setThreshold(groupId: number, threshold: number): Promise<void> {
    // 轉換為設定全域閾值
    await this.setGlobalThreshold(threshold);
  }
}

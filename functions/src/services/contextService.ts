/**
 * 上下文記憶服務
 * 管理群組的上下文模式啟動/檢查，以及聊天歷史的存取與格式化
 */

import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ChatHistoryEntry } from '../types';
import { StatsService } from './statsService';

const CONTEXT_DURATION_MS = 60 * 60 * 1000; // 1 小時

function getDb() {
  return getFirestore(admin.app(), 'hao87bot');
}

/**
 * 啟動群組的上下文記憶模式（持續 1 小時）
 * 若上次記憶已過期，先清空舊的聊天歷史
 */
export async function activateContext(groupId: number): Promise<void> {
  const db = getDb();
  const groupRef = db.collection('groups').doc(groupId.toString());

  // 檢查上次是否還在有效期內
  const isActive = await isContextActive(groupId);
  if (!isActive) {
    await clearChatHistory(groupId);
  }

  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + CONTEXT_DURATION_MS);
  await groupRef.update({ contextActiveUntil: expiresAt });
}

/**
 * 關閉群組的上下文記憶模式，並清空聊天歷史
 */
export async function deactivateContext(groupId: number): Promise<void> {
  const db = getDb();
  const groupRef = db.collection('groups').doc(groupId.toString());
  await groupRef.update({ contextActiveUntil: null });
  await clearChatHistory(groupId);
}

/**
 * 清空群組的聊天歷史
 */
async function clearChatHistory(groupId: number): Promise<void> {
  const db = getDb();
  const historyRef = db
    .collection('groups')
    .doc(groupId.toString())
    .collection('chatHistory');

  const snapshot = await historyRef.get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

/**
 * 檢查群組的上下文記憶模式是否啟動中
 */
export async function isContextActive(groupId: number): Promise<boolean> {
  const db = getDb();
  const groupRef = db.collection('groups').doc(groupId.toString());
  const doc = await groupRef.get();

  if (!doc.exists) return false;

  const data = doc.data();
  const contextActiveUntil = data?.contextActiveUntil as FirebaseFirestore.Timestamp | null | undefined;

  if (!contextActiveUntil) return false;

  return contextActiveUntil.toMillis() > Date.now();
}

/**
 * 儲存一則訊息到群組聊天歷史
 */
export async function storeChatHistory(
  groupId: number,
  entry: Omit<ChatHistoryEntry, 'timestamp'>
): Promise<void> {
  const db = getDb();
  const historyRef = db
    .collection('groups')
    .doc(groupId.toString())
    .collection('chatHistory');

  // 新增訊息
  await historyRef.add({
    ...entry,
    timestamp: FieldValue.serverTimestamp(),
  });

  // 清理超過上限的舊訊息
  const { maxChatHistory } = await StatsService.getAISettings();
  const snapshot = await historyRef.orderBy('timestamp', 'desc').offset(maxChatHistory).get();
  if (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

/**
 * 取得群組最近的聊天歷史
 */
export async function getRecentGroupMessages(
  groupId: number,
  limit: number = 20
): Promise<ChatHistoryEntry[]> {
  const db = getDb();
  const historyRef = db
    .collection('groups')
    .doc(groupId.toString())
    .collection('chatHistory');

  const snapshot = await historyRef
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  // 反轉為時間順序（舊到新）
  return snapshot.docs.reverse().map((doc) => doc.data() as ChatHistoryEntry);
}

/**
 * 將聊天歷史格式化為 AI prompt 可用的上下文字串
 */
export async function buildConversationContext(groupId: number): Promise<string | undefined> {
  const { contextMessageLimit } = await StatsService.getAISettings();
  const messages = await getRecentGroupMessages(groupId, contextMessageLimit);

  if (messages.length === 0) return undefined;

  const lines = messages.map((msg) => `[${msg.userName}]: ${msg.text}`);

  return `以下是群組最近的對話：\n${lines.join('\n')}`;
}

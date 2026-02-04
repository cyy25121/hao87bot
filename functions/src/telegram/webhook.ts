import { TelegramUpdate, TelegramMessage } from '../types';
import { StatsService } from '../services/statsService';
import { callOllama } from '../services/ollamaService';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * 發送文字訊息到 Telegram
 */
/**
 * 取得環境變數（從 Firebase Secrets）
 */
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 環境變數未設定`);
  }
  return value;
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  const botToken = getEnvVar('TELEGRAM_BOT_TOKEN');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }
}

/**
 * 舊版 mention 回應功能開關（暫時停用）
 */
const ENABLE_LEGACY_MENTION_RESPONSE = false;

/**
 * 無反應訊息列表（50 個）
 * @deprecated 暫時停用，改用 Ollama AI 回應
 */
const NO_RESPONSE_MESSAGES = [
  '(毫無反應...)',
  '(靜悄悄...)',
  '(一片寂靜...)',
  '(沒有任何回應...)',
  '(沉默是金...)',
  '(鴉雀無聲...)',
  '(靜默不語...)',
  '(毫無動靜...)',
  '(安靜如雞...)',
  '(默不作聲...)',
  '(寂靜無聲...)',
  '(毫無聲響...)',
  '(靜止不動...)',
  '(無聲無息...)',
  '(沉默不語...)',
  '(靜若處子...)',
  '(毫無波瀾...)',
  '(平靜如水...)',
  '(安靜無聲...)',
  '(默然無語...)',
  '(寂然無聲...)',
  '(靜謐無聲...)',
  '(毫無聲息...)',
  '(安靜如夜...)',
  '(沉默如金...)',
  '(靜止如畫...)',
  '(無聲勝有聲...)',
  '(靜默無言...)',
  '(寂靜如死...)',
  '(安靜如墓...)',
  '(毫無回音...)',
  '(靜如止水...)',
  '(默然無聲...)',
  '(寂靜無波...)',
  '(安靜無波...)',
  '(靜默無波...)',
  '(毫無波紋...)',
  '(靜如深淵...)',
  '(默然無波...)',
  '(寂靜如鏡...)',
  '(安靜如鏡...)',
  '(靜默如鏡...)',
  '(毫無漣漪...)',
  '(靜如古井...)',
  '(默然如井...)',
  '(寂靜如井...)',
  '(安靜如井...)',
  '(靜默如井...)',
  '(毫無水波...)',
  '(靜如死水...)',
  '(默然如死水...)',
];

/**
 * 取得隨機無反應訊息
 * @deprecated 暫時停用，改用 Ollama AI 回應
 */
function getRandomNoResponseMessage(): string {
  return NO_RESPONSE_MESSAGES[Math.floor(Math.random() * NO_RESPONSE_MESSAGES.length)];
}

/**
 * 統計網頁連結訊息列表（50 個）
 * 5種類型：川普相關、賺大錢、遊戲上市、吉伊卡哇、蝦蝦飯飯清涼照
 * 連結隱藏在特定名詞中，誘使成員點擊
 * @deprecated 暫時停用，改用 Ollama AI 回應
 */
function getStatsLinkMessages(groupId: number): string[] {
  const statsUrl = `https://hao87bot-45efb.web.app/stats/${groupId}`;
  
  return [
    // 1. 川普相關（10段）
    `🔥 重大消息！那個金髮大亨又搞出新花樣了！聽說他最近在<a href="${statsUrl}">某個平台</a>上發表了驚人言論，內容超乎想像！有人說他要用特殊方式重新定義某些規則，還有人說他發現了什麼秘密數據！這到底是真是假？點進去看看就知道，保證讓你笑到肚子痛！`,
    `💡 獨家爆料！那個喜歡發推特的商人又有新動作了！據說他在<a href="${statsUrl}">某個網站</a>上公開了一些有趣的統計資料，內容讓人意想不到！有人說這些數據會改變一切，還有人說這是史上最有趣的發現！想知道是什麼嗎？點進去看看，絕對不會讓你失望！`,
    `🎯 驚天秘密！那個前總統最近在<a href="${statsUrl}">某個地方</a>發表了超搞笑的言論！聽說他要用特殊方式分析某些數據，還說這些數據會讓所有人都大吃一驚！有人說這是他的新策略，還有人說這是他發現的秘密！點進去看看，你會發現原來政治可以這麼有趣！`,
    `🌟 超有趣發現！那個金髮商人又在搞事情了！聽說他在<a href="${statsUrl}">某個平台</a>上分享了一些驚人的統計資料，內容讓人笑到不行！有人說這些數據會顛覆你的認知，還有人說這是史上最搞笑的發現！想知道是什麼嗎？點進去看看，保證讓你笑到流淚！`,
    `⚡ 閃電快報！那個喜歡發推特的商人又有新花樣了！據說他在<a href="${statsUrl}">某個網站</a>上公開了一些超有趣的數據分析，內容讓人意想不到！有人說這些數據會改變遊戲規則，還有人說這是史上最有趣的發現！點進去看看，你會發現原來數據可以這麼搞笑！`,
    `🎪 馬戲團級表演！那個金髮大亨又在表演了！聽說他在<a href="${statsUrl}">某個平台</a>上發表了超搞笑的言論，內容讓人笑到肚子痛！有人說這些言論會成為經典，還有人說這是史上最有趣的表演！點進去看看，你會發現原來政治可以這麼娛樂！`,
    `🚀 火箭級消息！那個前總統最近在<a href="${statsUrl}">某個地方</a>發表了驚人言論！聽說他要用特殊方式重新定義某些概念，還說這些概念會讓所有人都大吃一驚！有人說這是他的新策略，還有人說這是他發現的秘密！點進去看看，你會發現原來政治可以這麼有趣！`,
    `🏆 冠軍級表演！那個喜歡發推特的商人又有新動作了！據說他在<a href="${statsUrl}">某個網站</a>上分享了一些超有趣的統計資料，內容讓人笑到不行！有人說這些數據會顛覆你的認知，還有人說這是史上最搞笑的發現！點進去看看，保證讓你笑到流淚！`,
    `💫 超自然現象！那個金髮商人又在搞事情了！聽說他在<a href="${statsUrl}">某個平台</a>上公開了一些驚人的數據分析，內容讓人意想不到！有人說這些數據會改變遊戲規則，還有人說這是史上最有趣的發現！點進去看看，你會發現原來數據可以這麼搞笑！`,
    `🎨 藝術大師級表演！那個前總統最近在<a href="${statsUrl}">某個地方</a>發表了超搞笑的言論！聽說他要用特殊方式分析某些數據，還說這些數據會讓所有人都大吃一驚！有人說這是他的新策略，還有人說這是他發現的秘密！點進去看看，你會發現原來政治可以這麼有趣！`,
    
    // 2. 賺大錢相關（10段）
    `💰 緊急通知！有人發現了一個<a href="${statsUrl}">神秘賺錢方法</a>，據說只要點進去就能看到如何一天賺到100萬的秘訣！有人說這是史上最簡單的賺錢方式，還有人說這是用AI分析出來的投資策略！這到底是真是假？點進去看看就知道，說不定你真的能發大財！`,
    `💎 獨家爆料！我剛剛發現了一個<a href="${statsUrl}">賺錢寶藏</a>，裡面有超詳細的投資分析報告！據說看過這個報告的人都在一個月內賺到了人生第一桶金！有人說這是用大數據分析出來的，還有人說這是AI預測的結果！點進去看看，說不定你就是下一個百萬富翁！`,
    `🔥 限時優惠！現在只要點擊<a href="${statsUrl}">這個連結</a>，就能免費獲得價值100萬的投資策略！據說這個策略是用AI分析出來的，準確率高達99%！有人說看過這個策略的人都在一個禮拜內賺到了10萬！這到底是真是假？點進去看看就知道，晚了可能就沒了！`,
    `🚀 火箭級機會！有人建立了一個<a href="${statsUrl}">賺錢平台</a>，裡面有超詳細的投資數據分析！據說看過這些數據的人都在一個月內賺到了人生第一桶金！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個億萬富翁！`,
    `💡 驚天秘密！我剛剛發現了一個<a href="${statsUrl}">賺錢方法</a>，據說只要照著做就能在一個禮拜內賺到100萬！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！這到底是真是假？點進去看看就知道，說不定你真的能發大財！`,
    `🌟 超值優惠！現在只要點擊<a href="${statsUrl}">這個連結</a>，就能免費獲得價值1000萬的投資策略！據說這個策略是用AI分析出來的，準確率高達99.9%！有人說看過這個策略的人都在一天內賺到了10萬！這到底是真是假？點進去看看就知道，晚了可能就沒了！`,
    `⚡ 閃電級機會！有人建立了一個<a href="${statsUrl}">賺錢系統</a>，裡面有超詳細的投資數據分析！據說看過這些數據的人都在一個月內賺到了人生第一桶金！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個億萬富翁！`,
    `🎯 精準投資！我剛剛發現了一個<a href="${statsUrl}">賺錢平台</a>，裡面有超詳細的投資策略分析！據說看過這些策略的人都在一個禮拜內賺到了10萬！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個百萬富翁！`,
    `🏆 冠軍級策略！有人建立了一個<a href="${statsUrl}">賺錢方法</a>，據說只要照著做就能在一個月內賺到1000萬！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！這到底是真是假？點進去看看就知道，說不定你真的能發大財！`,
    `💫 超自然賺錢法！我剛剛發現了一個<a href="${statsUrl}">賺錢寶藏</a>，裡面有超詳細的投資數據分析！據說看過這些數據的人都在一天內賺到了100萬！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個億萬富翁！`,
    
    // 3. 遊戲上市相關（10段）
    `🎮 重大消息！最新遊戲剛剛上市了！聽說這個遊戲在<a href="${statsUrl}">某個平台</a>上有超詳細的遊戲數據分析，包括玩家排名、遊戲時長、甚至連隱藏關卡都被記錄下來了！有人說這是史上最好玩的遊戲，還有人說這是用AI設計出來的！點進去看看，說不定你會發現新的遊戲世界！`,
    `🎯 獨家爆料！我剛剛發現了一個<a href="${statsUrl}">遊戲統計</a>，裡面有超詳細的遊戲數據分析！據說看過這些數據的人都能更快通關，還有人說這些數據會讓你發現隱藏的秘密！有人說這是用大數據分析出來的，還有人說這是用AI預測的結果！點進去看看，說不定你就是下一個遊戲大師！`,
    `🔥 限時優惠！最新遊戲剛剛上市，現在只要點擊<a href="${statsUrl}">這個連結</a>，就能免費獲得價值1000元的遊戲攻略！據說這個攻略是用AI分析出來的，準確率高達99%！有人說看過這個攻略的人都能在一天內通關！這到底是真是假？點進去看看就知道，晚了可能就沒了！`,
    `🚀 火箭級遊戲！有人建立了一個<a href="${statsUrl}">遊戲平台</a>，裡面有超詳細的遊戲數據分析！據說看過這些數據的人都能更快通關，還有人說這些數據會讓你發現隱藏的秘密！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個遊戲大師！`,
    `💡 驚天秘密！我剛剛發現了一個<a href="${statsUrl}">遊戲統計</a>，據說只要照著做就能在一個禮拜內通關所有關卡！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！這到底是真是假？點進去看看就知道，說不定你真的能成為遊戲大師！`,
    `🌟 超值優惠！最新遊戲剛剛上市，現在只要點擊<a href="${statsUrl}">這個連結</a>，就能免費獲得價值10000元的遊戲攻略！據說這個攻略是用AI分析出來的，準確率高達99.9%！有人說看過這個攻略的人都能在一天內通關所有關卡！這到底是真是假？點進去看看就知道，晚了可能就沒了！`,
    `⚡ 閃電級遊戲！有人建立了一個<a href="${statsUrl}">遊戲系統</a>，裡面有超詳細的遊戲數據分析！據說看過這些數據的人都能更快通關，還有人說這些數據會讓你發現隱藏的秘密！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個遊戲大師！`,
    `🎯 精準攻略！我剛剛發現了一個<a href="${statsUrl}">遊戲平台</a>，裡面有超詳細的遊戲策略分析！據說看過這些策略的人都能在一個禮拜內通關所有關卡！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個遊戲大師！`,
    `🏆 冠軍級遊戲！有人建立了一個<a href="${statsUrl}">遊戲方法</a>，據說只要照著做就能在一個月內成為遊戲大師！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！這到底是真是假？點進去看看就知道，說不定你真的能成為遊戲大師！`,
    `💫 超自然遊戲法！我剛剛發現了一個<a href="${statsUrl}">遊戲寶藏</a>，裡面有超詳細的遊戲數據分析！據說看過這些數據的人都能在一天內通關所有關卡！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個遊戲大師！`,
    
    // 4. 吉伊卡哇公仔相關（10段）
    `🎀 重大消息！吉伊卡哇公仔剛剛上市了！聽說這個公仔在<a href="${statsUrl}">某個平台</a>上有超詳細的購買數據分析，包括購買人數、庫存數量、甚至連隱藏版都被記錄下來了！有人說這是史上最可愛的公仔，還有人說這是用AI設計出來的！點進去看看，說不定你會發現新的收藏世界！`,
    `💝 獨家爆料！我剛剛發現了一個<a href="${statsUrl}">公仔統計</a>，裡面有超詳細的購買數據分析！據說看過這些數據的人都能更快買到公仔，還有人說這些數據會讓你發現隱藏的購買管道！有人說這是用大數據分析出來的，還有人說這是用AI預測的結果！點進去看看，說不定你就是下一個收藏大師！`,
    `🔥 限時優惠！吉伊卡哇公仔剛剛上市，現在只要點擊<a href="${statsUrl}">這個連結</a>，就能免費獲得價值1000元的購買攻略！據說這個攻略是用AI分析出來的，準確率高達99%！有人說看過這個攻略的人都能在一天內買到公仔！這到底是真是假？點進去看看就知道，晚了可能就沒了！`,
    `🚀 火箭級公仔！有人建立了一個<a href="${statsUrl}">公仔平台</a>，裡面有超詳細的購買數據分析！據說看過這些數據的人都能更快買到公仔，還有人說這些數據會讓你發現隱藏的購買管道！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個收藏大師！`,
    `💡 驚天秘密！我剛剛發現了一個<a href="${statsUrl}">公仔統計</a>，據說只要照著做就能在一個禮拜內買到所有公仔！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！這到底是真是假？點進去看看就知道，說不定你真的能成為收藏大師！`,
    `🌟 超值優惠！吉伊卡哇公仔剛剛上市，現在只要點擊<a href="${statsUrl}">這個連結</a>，就能免費獲得價值10000元的購買攻略！據說這個攻略是用AI分析出來的，準確率高達99.9%！有人說看過這個攻略的人都能在一天內買到所有公仔！這到底是真是假？點進去看看就知道，晚了可能就沒了！`,
    `⚡ 閃電級公仔！有人建立了一個<a href="${statsUrl}">公仔系統</a>，裡面有超詳細的購買數據分析！據說看過這些數據的人都能更快買到公仔，還有人說這些數據會讓你發現隱藏的購買管道！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個收藏大師！`,
    `🎯 精準購買！我剛剛發現了一個<a href="${statsUrl}">公仔平台</a>，裡面有超詳細的購買策略分析！據說看過這些策略的人都能在一個禮拜內買到所有公仔！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個收藏大師！`,
    `🏆 冠軍級公仔！有人建立了一個<a href="${statsUrl}">公仔方法</a>，據說只要照著做就能在一個月內成為收藏大師！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！這到底是真是假？點進去看看就知道，說不定你真的能成為收藏大師！`,
    `💫 超自然公仔法！我剛剛發現了一個<a href="${statsUrl}">公仔寶藏</a>，裡面有超詳細的購買數據分析！據說看過這些數據的人都能在一天內買到所有公仔！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個收藏大師！`,
    
    // 5. 蝦蝦飯飯清涼照相關（10段）
    `🦐 重大消息！蝦蝦和飯飯的清涼照剛剛曝光了！聽說這些照片在<a href="${statsUrl}">某個平台</a>上有超詳細的觀看數據分析，包括觀看人數、點讚數量、甚至連隱藏版都被記錄下來了！有人說這是史上最清涼的照片，還有人說這是用AI分析出來的！點進去看看，說不定你會發現新的視覺世界！`,
    `🍚 獨家爆料！我剛剛發現了一個<a href="${statsUrl}">照片統計</a>，裡面有超詳細的觀看數據分析！據說看過這些數據的人都能更快看到照片，還有人說這些數據會讓你發現隱藏的觀看管道！有人說這是用大數據分析出來的，還有人說這是用AI預測的結果！點進去看看，說不定你就是下一個觀看大師！`,
    `🔥 限時優惠！蝦蝦和飯飯的清涼照剛剛曝光，現在只要點擊<a href="${statsUrl}">這個連結</a>，就能免費獲得價值1000元的觀看攻略！據說這個攻略是用AI分析出來的，準確率高達99%！有人說看過這個攻略的人都能在一天內看到所有照片！這到底是真是假？點進去看看就知道，晚了可能就沒了！`,
    `🚀 火箭級照片！有人建立了一個<a href="${statsUrl}">照片平台</a>，裡面有超詳細的觀看數據分析！據說看過這些數據的人都能更快看到照片，還有人說這些數據會讓你發現隱藏的觀看管道！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個觀看大師！`,
    `💡 驚天秘密！我剛剛發現了一個<a href="${statsUrl}">照片統計</a>，據說只要照著做就能在一個禮拜內看到所有照片！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！這到底是真是假？點進去看看就知道，說不定你真的能成為觀看大師！`,
    `🌟 超值優惠！蝦蝦和飯飯的清涼照剛剛曝光，現在只要點擊<a href="${statsUrl}">這個連結</a>，就能免費獲得價值10000元的觀看攻略！據說這個攻略是用AI分析出來的，準確率高達99.9%！有人說看過這個攻略的人都能在一天內看到所有照片！這到底是真是假？點進去看看就知道，晚了可能就沒了！`,
    `⚡ 閃電級照片！有人建立了一個<a href="${statsUrl}">照片系統</a>，裡面有超詳細的觀看數據分析！據說看過這些數據的人都能更快看到照片，還有人說這些數據會讓你發現隱藏的觀看管道！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個觀看大師！`,
    `🎯 精準觀看！我剛剛發現了一個<a href="${statsUrl}">照片平台</a>，裡面有超詳細的觀看策略分析！據說看過這些策略的人都能在一個禮拜內看到所有照片！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個觀看大師！`,
    `🏆 冠軍級照片！有人建立了一個<a href="${statsUrl}">照片方法</a>，據說只要照著做就能在一個月內成為觀看大師！有人說這是用AI分析出來的，還有人說這是用大數據預測的結果！這到底是真是假？點進去看看就知道，說不定你真的能成為觀看大師！`,
    `💫 超自然照片法！我剛剛發現了一個<a href="${statsUrl}">照片寶藏</a>，裡面有超詳細的觀看數據分析！據說看過這些數據的人都能在一天內看到所有照片！有人說這是用機器學習分析出來的，還有人說這是用大數據預測的結果！點進去看看，說不定你就是下一個觀看大師！`,
    `🔥 緊急通知！群組內有人發現了一個神秘的<a href="${statsUrl}">統計頁面</a>，據說裡面藏著所有成員的秘密資料！有人說點進去會看到誰最愛發廢文，誰最愛貼圖，甚至連誰半夜不睡覺都在聊天都記錄得一清二楚！這到底是什麼黑科技？我已經點進去看了，結果...你絕對想不到！快點進去看看，晚了可能就被刪除了！`,
    `⚠️ 警告！你的群組活動已經被完全監控了！有人建立了一個<a href="${statsUrl}">監控系統</a>，記錄了每個人的一舉一動！包括你發了多少訊息、用了多少貼圖、甚至連你什麼時候最活躍都被記錄下來了！這聽起來是不是很像電影情節？但這是真的！點進去看看你的數據，說不定會發現一些驚人的真相！`,
    `🎁 限時優惠！群組統計資料大公開！現在只要點擊<a href="${statsUrl}">這個連結</a>，就能免費查看所有成員的活躍度排名！想知道誰是群組裡最愛講話的人嗎？想知道誰最愛用貼圖嗎？想知道誰是潛水王嗎？這些秘密數據現在全部免費公開！但只限今天，明天就要收費了！快點進去搶先看！`,
    `💎 獨家爆料！我剛剛無意間發現了一個<a href="${statsUrl}">神秘網站</a>，裡面竟然有我們群組的完整統計資料！更驚人的是，裡面還顯示了每個人的「發言熱度指數」和「貼圖使用頻率」！有人說這是AI分析出來的，有人說這是外星科技，但不管怎樣，這些數據真的太準了！你絕對要點進去看看，保證讓你大開眼界！`,
    `🚨 重大發現！群組裡有人偷偷建立了一個<a href="${statsUrl}">數據分析平台</a>，把所有成員的聊天記錄都統計出來了！更可怕的是，這個平台還能預測誰會是下一個最活躍的成員！聽起來是不是很科幻？但這是真的！我已經驗證過了，準確率高達99%！不信的話點進去看看，保證讓你嚇一跳！`,
    `🎯 驚天秘密！有人告訴我群組裡藏著一個<a href="${statsUrl}">統計寶藏</a>，裡面記錄了所有成員的聊天習慣！包括誰最愛在半夜發訊息、誰最愛用表情符號、甚至連誰最愛發長文都被記錄下來了！這聽起來是不是很像大數據分析？沒錯！這就是AI時代的產物！點進去看看，你會發現原來自己這麼有趣！`,
    `🔥 熱門話題！群組統計資料外洩了！有人建立了一個<a href="${statsUrl}">公開平台</a>，把所有成員的活動數據都放上去了！更勁爆的是，裡面還有一個「最廢話王」排行榜！想知道誰是群組裡最愛講廢話的人嗎？想知道誰最愛刷存在感嗎？這些數據現在全部公開！點進去看看，說不定你會發現自己上榜了！`,
    `💡 獨家內幕！我剛剛收到一個神秘連結，點進去後發現竟然是<a href="${statsUrl}">群組統計系統</a>！這個系統不僅記錄了每個人的發言次數，還分析了每個人的聊天風格！有人說這是用機器學習做的，有人說這是用大數據分析的，但不管怎樣，這些數據真的太詳細了！你絕對要點進去看看，保證讓你驚嘆不已！`,
    `🎪 超有趣發現！群組裡有人做了一個<a href="${statsUrl}">互動統計</a>，把所有成員的聊天數據都整理出來了！更神奇的是，這個統計還能顯示誰和誰互動最頻繁、誰最愛回覆別人的訊息！這聽起來是不是很像社交網絡分析？沒錯！這就是現代科技的威力！點進去看看，你會發現群組裡的人際關係原來這麼複雜！`,
    `🌟 必看推薦！有人建立了一個<a href="${statsUrl}">群組分析網站</a>，裡面有超詳細的成員活動報告！包括誰最愛發訊息、誰最愛用貼圖、甚至連誰最愛在週末聊天都被記錄下來了！這聽起來是不是很像行為分析？沒錯！這就是數據科學的應用！點進去看看，你會發現原來群組的運作模式這麼有趣！`,
    `🔮 預言成真！我早就說過群組裡會有人建立<a href="${statsUrl}">統計系統</a>，結果真的出現了！這個系統不僅記錄了每個人的發言頻率，還預測了誰會是下一個最活躍的成員！聽起來是不是很像AI預測？沒錯！這就是人工智慧的應用！點進去看看，說不定你會發現自己被預測為「潛力股」！`,
    `🎨 藝術品級數據！有人把群組的聊天數據做成了<a href="${statsUrl}">視覺化統計</a>，看起來就像藝術品一樣美！更驚人的是，這個統計還能顯示每個人的「聊天風格指數」和「活躍度曲線」！這聽起來是不是很像數據視覺化？沒錯！這就是現代設計的應用！點進去看看，你會發現原來數據可以這麼美！`,
    `⚡ 閃電快報！群組統計資料剛剛更新了！有人建立了一個<a href="${statsUrl}">即時監控系統</a>，每分鐘都會更新所有成員的活動數據！更厲害的是，這個系統還能顯示誰正在線上、誰剛剛發了訊息！這聽起來是不是很像即時監控？沒錯！這就是現代科技的威力！點進去看看，你會發現原來群組這麼活躍！`,
    `🎲 隨機驚喜！點擊<a href="${statsUrl}">這個連結</a>，你會看到一個超有趣的群組統計！裡面不僅有每個人的發言排名，還有一個「幸運抽獎」功能，隨機選出一個最活躍的成員！這聽起來是不是很像遊戲？沒錯！這就是數據遊戲化的應用！點進去看看，說不定你就是那個幸運兒！`,
    `🏆 冠軍爭霸！群組裡正在進行一場<a href="${statsUrl}">活躍度競賽</a>！所有成員的發言數據都被記錄下來，排名第一的人會被封為「群組話癆王」！想知道誰是目前的冠軍嗎？想知道自己排在第幾名嗎？這些數據現在全部公開！點進去看看，說不定你會發現自己已經默默爬到了前三名！`,
    `🔍 深度調查！我剛剛做了一個<a href="${statsUrl}">群組行為分析</a>，發現了一些驚人的規律！比如說，週一早上是群組最活躍的時間，週五晚上是貼圖使用的高峰期！這聽起來是不是很像行為科學研究？沒錯！這就是數據分析的魅力！點進去看看，你會發現原來群組的運作有這麼多有趣的規律！`,
    `💫 超自然現象！群組統計資料竟然會自動更新！有人建立了一個<a href="${statsUrl}">智能統計系統</a>，它會自動分析每個人的聊天習慣，並生成詳細的報告！這聽起來是不是很像AI助手？沒錯！這就是人工智慧的應用！點進去看看，你會發現原來機器也能這麼了解人類！`,
    `🎪 馬戲團級數據！有人把群組的聊天數據做成了<a href="${statsUrl}">互動式統計</a>，點進去後就像在看馬戲團表演一樣精彩！更神奇的是，這個統計還能顯示每個人的「聊天節奏」和「發言頻率」！這聽起來是不是很像數據藝術？沒錯！這就是現代科技的藝術表現！點進去看看，你會發現原來數據可以這麼有趣！`,
    `🚀 火箭級速度！群組統計資料更新速度超快！有人建立了一個<a href="${statsUrl}">高速統計系統</a>，每當有人發訊息，數據就會立即更新！更厲害的是，這個系統還能預測誰會是下一個發言的人！這聽起來是不是很像預測分析？沒錯！這就是機器學習的應用！點進去看看，你會發現原來預測可以這麼準！`,
    `🎯 精準打擊！群組統計資料精準到令人害怕！有人建立了一個<a href="${statsUrl}">精準分析系統</a>，它不僅記錄了每個人的發言次數，還分析了每個人的聊天風格和用詞習慣！這聽起來是不是很像文本分析？沒錯！這就是自然語言處理的應用！點進去看看，你會發現原來機器也能這麼了解你的說話方式！`,
    `🌟 星光級數據！群組統計資料閃閃發光！有人建立了一個<a href="${statsUrl}">星光統計系統</a>，每個成員都像星星一樣被記錄下來！更神奇的是，這個系統還能顯示每個人的「活躍度亮度」和「聊天熱度」！這聽起來是不是很像數據視覺化？沒錯！這就是現代設計的應用！點進去看看，你會發現原來自己這麼閃亮！`,
    `🎨 藝術大師級數據！有人把群組的聊天數據做成了<a href="${statsUrl}">藝術級統計</a>，看起來就像大師級作品一樣美！更驚人的是，這個統計還能顯示每個人的「聊天藝術指數」和「發言美感度」！這聽起來是不是很像數據藝術？沒錯！這就是現代藝術的應用！點進去看看，你會發現原來數據可以這麼美！`,
    `⚡ 閃電級速度！群組統計資料更新速度像閃電一樣快！有人建立了一個<a href="${statsUrl}">閃電統計系統</a>，每當有人發訊息，數據就會像閃電一樣立即更新！更厲害的是，這個系統還能顯示每個人的「發言速度」和「反應時間」！這聽起來是不是很像性能分析？沒錯！這就是系統優化的應用！點進去看看，你會發現原來自己反應這麼快！`,
    `🎲 賭場級刺激！群組統計資料像賭場一樣刺激！有人建立了一個<a href="${statsUrl}">賭場統計系統</a>，每個成員的發言數據都被當成賭注！更神奇的是，這個系統還能顯示每個人的「發言勝率」和「聊天運氣值」！這聽起來是不是很像遊戲化設計？沒錯！這就是遊戲設計的應用！點進去看看，你會發現原來聊天也可以這麼刺激！`,
    `🏆 奧運級競賽！群組統計資料像奧運會一樣精彩！有人建立了一個<a href="${statsUrl}">奧運統計系統</a>，所有成員都在進行一場激烈的競賽！更驚人的是，這個系統還能顯示每個人的「發言金牌數」和「聊天世界紀錄」！這聽起來是不是很像競賽系統？沒錯！這就是競技設計的應用！點進去看看，你會發現原來自己這麼厲害！`,
    `🔍 偵探級調查！群組統計資料像偵探調查一樣詳細！有人建立了一個<a href="${statsUrl}">偵探統計系統</a>，每個成員的行為都被詳細記錄下來！更神奇的是，這個系統還能顯示每個人的「發言時間線」和「聊天軌跡」！這聽起來是不是很像行為追蹤？沒錯！這就是數據追蹤的應用！點進去看看，你會發現原來自己的行為這麼有規律！`,
    `💫 超自然級數據！群組統計資料像超自然現象一樣神奇！有人建立了一個<a href="${statsUrl}">超自然統計系統</a>，它會自動預測每個人的行為！更驚人的是，這個系統還能顯示每個人的「發言預測準確度」和「聊天未來趨勢」！這聽起來是不是很像預測分析？沒錯！這就是AI預測的應用！點進去看看，你會發現原來未來可以這麼準確！`,
    `🎪 馬戲團級表演！群組統計資料像馬戲團表演一樣精彩！有人建立了一個<a href="${statsUrl}">馬戲團統計系統</a>，每個成員都像馬戲團演員一樣被記錄下來！更神奇的是，這個系統還能顯示每個人的「發言技巧」和「聊天表演力」！這聽起來是不是很像技能分析？沒錯！這就是能力評估的應用！點進去看看，你會發現原來自己這麼有才華！`,
    `🚀 火箭級升空！群組統計資料像火箭升空一樣快速！有人建立了一個<a href="${statsUrl}">火箭統計系統</a>，每個成員的發言數據都在快速上升！更厲害的是，這個系統還能顯示每個人的「發言加速度」和「聊天成長速度」！這聽起來是不是很像成長分析？沒錯！這就是成長追蹤的應用！點進去看看，你會發現原來自己成長這麼快！`,
    `🎯 狙擊級精準！群組統計資料像狙擊手一樣精準！有人建立了一個<a href="${statsUrl}">狙擊統計系統</a>，每個成員的數據都被精準記錄下來！更驚人的是，這個系統還能顯示每個人的「發言精準度」和「聊天命中率」！這聽起來是不是很像精準分析？沒錯！這就是數據精準度的應用！點進去看看，你會發現原來自己這麼精準！`,
    `🌟 星光級閃耀！群組統計資料像星光一樣閃耀！有人建立了一個<a href="${statsUrl}">星光統計系統</a>，每個成員都像星星一樣閃閃發光！更神奇的是，這個系統還能顯示每個人的「發言亮度」和「聊天熱度」！這聽起來是不是很像熱度分析？沒錯！這就是熱度追蹤的應用！點進去看看，你會發現原來自己這麼閃亮！`,
    `🎨 藝術大師級作品！群組統計資料像藝術大師的作品一樣美！有人建立了一個<a href="${statsUrl}">藝術統計系統</a>，每個成員的數據都被做成藝術品！更驚人的是，這個系統還能顯示每個人的「發言藝術性」和「聊天美感度」！這聽起來是不是很像藝術分析？沒錯！這就是藝術評估的應用！點進去看看，你會發現原來自己這麼有藝術感！`,
    `⚡ 閃電級速度！群組統計資料像閃電一樣快！有人建立了一個<a href="${statsUrl}">閃電統計系統</a>，每個成員的數據都在快速更新！更厲害的是，這個系統還能顯示每個人的「發言速度」和「聊天反應時間」！這聽起來是不是很像速度分析？沒錯！這就是性能評估的應用！點進去看看，你會發現原來自己反應這麼快！`,
    `🎲 賭場級刺激！群組統計資料像賭場一樣刺激！有人建立了一個<a href="${statsUrl}">賭場統計系統</a>，每個成員都在進行一場刺激的遊戲！更神奇的是，這個系統還能顯示每個人的「發言運氣值」和「聊天勝率」！這聽起來是不是很像運氣分析？沒錯！這就是機率評估的應用！點進去看看，你會發現原來自己運氣這麼好！`,
    `🏆 冠軍級表現！群組統計資料像冠軍一樣精彩！有人建立了一個<a href="${statsUrl}">冠軍統計系統</a>，每個成員都在爭奪冠軍寶座！更驚人的是，這個系統還能顯示每個人的「發言排名」和「聊天成就」！這聽起來是不是很像排名系統？沒錯！這就是競賽評估的應用！點進去看看，你會發現原來自己排名這麼高！`,
    `🔍 偵探級調查！群組統計資料像偵探調查一樣詳細！有人建立了一個<a href="${statsUrl}">偵探統計系統</a>，每個成員的行為都被詳細分析！更神奇的是，這個系統還能顯示每個人的「發言模式」和「聊天習慣」！這聽起來是不是很像行為分析？沒錯！這就是習慣追蹤的應用！點進去看看，你會發現原來自己的習慣這麼有趣！`,
    `💫 超自然級神奇！群組統計資料像超自然現象一樣神奇！有人建立了一個<a href="${statsUrl}">超自然統計系統</a>，它會自動分析每個人的行為！更驚人的是，這個系統還能顯示每個人的「發言預測」和「聊天趨勢」！這聽起來是不是很像預測系統？沒錯！這就是趨勢分析的應用！點進去看看，你會發現原來自己的趨勢這麼明顯！`,
    `🎪 馬戲團級精彩！群組統計資料像馬戲團表演一樣精彩！有人建立了一個<a href="${statsUrl}">馬戲團統計系統</a>，每個成員都像演員一樣被記錄下來！更神奇的是，這個系統還能顯示每個人的「發言技巧」和「聊天表演力」！這聽起來是不是很像技能評估？沒錯！這就是能力分析的應用！點進去看看，你會發現原來自己這麼有才華！`,
    `🚀 火箭級升空！群組統計資料像火箭升空一樣快速！有人建立了一個<a href="${statsUrl}">火箭統計系統</a>，每個成員的數據都在快速成長！更厲害的是，這個系統還能顯示每個人的「發言成長率」和「聊天進步速度」！這聽起來是不是很像成長分析？沒錯！這就是進步追蹤的應用！點進去看看，你會發現原來自己進步這麼快！`,
    `🎯 狙擊級精準！群組統計資料像狙擊手一樣精準！有人建立了一個<a href="${statsUrl}">狙擊統計系統</a>，每個成員的數據都被精準記錄！更驚人的是，這個系統還能顯示每個人的「發言準確度」和「聊天精準度」！這聽起來是不是很像精準分析？沒錯！這就是準確度評估的應用！點進去看看，你會發現原來自己這麼精準！`,
    `🌟 星光級閃耀！群組統計資料像星光一樣閃耀！有人建立了一個<a href="${statsUrl}">星光統計系統</a>，每個成員都像星星一樣閃閃發光！更神奇的是，這個系統還能顯示每個人的「發言亮度」和「聊天熱度」！這聽起來是不是很像熱度分析？沒錯！這就是熱度追蹤的應用！點進去看看，你會發現原來自己這麼閃亮！`,
    `🎨 藝術大師級作品！群組統計資料像藝術大師的作品一樣美！有人建立了一個<a href="${statsUrl}">藝術統計系統</a>，每個成員的數據都被做成藝術品！更驚人的是，這個系統還能顯示每個人的「發言藝術性」和「聊天美感度」！這聽起來是不是很像藝術分析？沒錯！這就是美感評估的應用！點進去看看，你會發現原來自己這麼有藝術感！`,
    `⚡ 閃電級速度！群組統計資料像閃電一樣快！有人建立了一個<a href="${statsUrl}">閃電統計系統</a>，每個成員的數據都在快速更新！更厲害的是，這個系統還能顯示每個人的「發言速度」和「聊天反應時間」！這聽起來是不是很像速度分析？沒錯！這就是反應速度評估的應用！點進去看看，你會發現原來自己反應這麼快！`,
    `🎲 賭場級刺激！群組統計資料像賭場一樣刺激！有人建立了一個<a href="${statsUrl}">賭場統計系統</a>，每個成員都在進行一場刺激的遊戲！更神奇的是，這個系統還能顯示每個人的「發言運氣值」和「聊天勝率」！這聽起來是不是很像運氣分析？沒錯！這就是機率評估的應用！點進去看看，你會發現原來自己運氣這麼好！`,
    `🏆 冠軍級表現！群組統計資料像冠軍一樣精彩！有人建立了一個<a href="${statsUrl}">冠軍統計系統</a>，每個成員都在爭奪冠軍寶座！更驚人的是，這個系統還能顯示每個人的「發言排名」和「聊天成就」！這聽起來是不是很像排名系統？沒錯！這就是成就追蹤的應用！點進去看看，你會發現原來自己成就這麼高！`,
    `🔍 偵探級調查！群組統計資料像偵探調查一樣詳細！有人建立了一個<a href="${statsUrl}">偵探統計系統</a>，每個成員的行為都被詳細分析！更神奇的是，這個系統還能顯示每個人的「發言模式」和「聊天習慣」！這聽起來是不是很像行為分析？沒錯！這就是習慣追蹤的應用！點進去看看，你會發現原來自己的習慣這麼有趣！`,
    `💫 超自然級神奇！群組統計資料像超自然現象一樣神奇！有人建立了一個<a href="${statsUrl}">超自然統計系統</a>，它會自動分析每個人的行為！更驚人的是，這個系統還能顯示每個人的「發言預測」和「聊天趨勢」！這聽起來是不是很像預測系統？沒錯！這就是趨勢分析的應用！點進去看看，你會發現原來自己的趨勢這麼明顯！`,
    `🎪 馬戲團級精彩！群組統計資料像馬戲團表演一樣精彩！有人建立了一個<a href="${statsUrl}">馬戲團統計系統</a>，每個成員都像演員一樣被記錄下來！更神奇的是，這個系統還能顯示每個人的「發言技巧」和「聊天表演力」！這聽起來是不是很像技能評估？沒錯！這就是能力分析的應用！點進去看看，你會發現原來自己這麼有才華！`,
    `🚀 火箭級升空！群組統計資料像火箭升空一樣快速！有人建立了一個<a href="${statsUrl}">火箭統計系統</a>，每個成員的數據都在快速成長！更厲害的是，這個系統還能顯示每個人的「發言成長率」和「聊天進步速度」！這聽起來是不是很像成長分析？沒錯！這就是進步追蹤的應用！點進去看看，你會發現原來自己進步這麼快！`,
  ];
}

/**
 * 取得隨機統計連結訊息
 * @deprecated 暫時停用，改用 Ollama AI 回應
 */
function getRandomStatsLinkMessage(groupId: number): string {
  const messages = getStatsLinkMessages(groupId);
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * 舊版 mention 回應處理（暫時停用）
 * @deprecated 改用 Ollama AI 回應
 */
async function handleLegacyMentionResponse(
  chatId: number,
  groupId: number,
  isActivated: boolean
): Promise<void> {
  if (!ENABLE_LEGACY_MENTION_RESPONSE) {
    return;
  }

  if (!isActivated) {
    // 未達閾值：回覆無反應訊息
    const noResponseMsg = getRandomNoResponseMessage();
    await sendMessage(chatId, noResponseMsg);
  } else {
    // 超過閾值：回覆統計網頁連結
    const statsMsg = getRandomStatsLinkMessage(groupId);
    await sendMessage(chatId, statsMsg);
  }
}

/**
 * 檢查 bot 是否被呼叫
 */
function isBotMentioned(message: TelegramMessage, botUsername?: string): boolean {
  const text = message.text || '';
  const trimmedText = text.trim();
  
  // 檢查是否為指令（以 / 開頭）
  if (trimmedText.startsWith('/')) {
    // 如果是 /set-activate-th 或 /health，不算被呼叫（會另外處理）
    if (trimmedText.startsWith('/set-activate-th') || trimmedText.startsWith('/health')) {
      return false;
    }
    // 其他指令都算被呼叫
    return true;
  }
  
  // 檢查 entities 中是否有 bot_command
  if (message.entities) {
    const hasBotCommand = message.entities.some(e => e.type === 'bot_command');
    if (hasBotCommand) {
      // 如果指定了 bot username，檢查是否提到這個 bot
      // 如果沒有 @ 符號，表示是通用指令，也算被呼叫
      if (botUsername) {
        return text.includes(`@${botUsername}`) || !text.includes('@');
      }
      return true;
    }
  }
  
  // 檢查文字中是否 @mention bot（非指令情況）
  if (botUsername && text.includes(`@${botUsername}`)) {
    return true;
  }
  
  return false;
}

/**
 * 取得 bot username
 */
async function getBotUsername(): Promise<string | undefined> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return undefined;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    
    if (data.ok && data.result) {
      return data.result.username;
    }
    return undefined;
  } catch (error) {
    console.error('[getBotUsername] Error:', error);
    return undefined;
  }
}

/**
 * 健康檢查
 */
async function performHealthCheck(): Promise<string> {
  const checks: string[] = [];
  let allHealthy = true;

  // 檢查 Bot Token
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    checks.push('✅ Telegram Bot Token: 已設定');
  } else {
    checks.push('❌ Telegram Bot Token: 未設定');
    allHealthy = false;
  }

  // 檢查 OpenAI API Key
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    checks.push('✅ OpenAI API Key: 已設定');
  } else {
    checks.push('❌ OpenAI API Key: 未設定');
    allHealthy = false;
  }

  // 檢查 Firestore 連線
  try {
    const db = getFirestore(admin.app(), 'hao87bot');
    // 嘗試執行一個簡單的查詢來測試連線
    // 使用 limit(0) 來避免實際讀取資料
    await db.collection('_health_check').limit(0).get();
    checks.push('✅ Firestore (hao87bot): 連線正常');
  } catch (error) {
    checks.push(`❌ Firestore (hao87bot): 連線失敗 (${error instanceof Error ? error.message : 'Unknown error'})`);
    allHealthy = false;
  }

  // 檢查 Storage
  try {
    const storage = admin.storage();
    const bucket = storage.bucket();
    // 檢查 bucket 是否存在（這是一個非同步操作）
    const [exists] = await bucket.exists();
    if (exists) {
      checks.push('✅ Firebase Storage: 連線正常');
    } else {
      checks.push('⚠️ Firebase Storage: Bucket 不存在');
      allHealthy = false;
    }
  } catch (error) {
    checks.push(`❌ Firebase Storage: 連線失敗 (${error instanceof Error ? error.message : 'Unknown error'})`);
    allHealthy = false;
  }

  const status = allHealthy ? '🟢 健康' : '🔴 異常';
  const timestamp = new Date().toISOString();

  return `<b>Hao87bot 3.0 健康檢查</b>\n\n` +
    `狀態: ${status}\n` +
    `時間: ${timestamp}\n\n` +
    `<b>檢查項目：</b>\n` +
    checks.join('\n');
}

export async function handleWebhook(update: TelegramUpdate): Promise<void> {
  // 處理機器人加入/離開群組
  if (update.my_chat_member) {
    const { chat, new_chat_member } = update.my_chat_member;
    
    if (new_chat_member.status === 'member') {
      // 機器人加入群組
      try {
        await StatsService.getOrCreateGroup(chat.id, chat.title || 'Unknown Group');
      } catch (error) {
        console.error(`[handleWebhook] Error initializing group:`, error);
        throw error;
      }
    }
    return;
  }

  // 處理訊息
  if (update.message) {
    await handleMessage(update.message);
  }
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  // 忽略機器人訊息
  if (message.from?.is_bot) {
    return;
  }

  const { chat, from } = message;
  const chatId = chat.id;
  const userId = from!.id;

  // 處理 /health 命令（可在私訊或群組中使用）
  if (message.text && (message.text.trim() === '/health' || message.text.trim().startsWith('/health@'))) {
    try {
      const healthStatus = await performHealthCheck();
      await sendMessage(chatId, healthStatus);
    } catch (error) {
      console.error('Error performing health check:', error);
      await sendMessage(
        chatId,
        '❌ 健康檢查失敗：無法取得系統狀態'
      );
    }
    return;
  }

  // 處理 /set-activate-th 命令（可在私訊或群組中使用）
  if (message.text && (message.text.trim().startsWith('/set-activate-th') || message.text.trim().startsWith('/set-activate-th@'))) {
    const parts = message.text.trim().split(/\s+/);
    const thresholdStr = parts[1];
    
    if (!thresholdStr) {
      await sendMessage(chatId, '❌ 請提供閾值數字\n\n用法：/set-activate-th <數字>\n例如：/set-activate-th 100');
      return;
    }
    
    const threshold = parseInt(thresholdStr, 10);
    
    if (isNaN(threshold) || threshold < 1) {
      await sendMessage(chatId, '❌ 無效的閾值，請輸入正整數（至少為 1）');
      return;
    }
    
    await StatsService.setGlobalThreshold(threshold);
    const globalThreshold = await StatsService.getGlobalThreshold();
    
    if (chat.type === 'private') {
      // 私訊回覆
      await sendMessage(chatId, `✅ 全域啟動閾值已設定為 ${threshold} 則訊息\n\n此設定將套用到所有群組。`);
    } else if (chat.type === 'group' || chat.type === 'supergroup') {
      // 群組回覆（顯示該群組的目前訊息數）
      const groupIdForThreshold = chatId;
      const group = await StatsService.getOrCreateGroup(groupIdForThreshold, chat.title || 'Unknown Group');
      await sendMessage(chatId, `✅ 全域啟動閾值已設定為 ${threshold} 則訊息\n\n目前訊息數：${group.messageCount} / ${globalThreshold}`);
    } else {
      await sendMessage(chatId, `✅ 全域啟動閾值已設定為 ${threshold} 則訊息`);
    }
    return;
  }

  // 處理 /show 命令（僅在群組中使用）
  if (message.text && (message.text.trim() === '/show' || message.text.trim().startsWith('/show@'))) {
    // 只處理群組訊息
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      await sendMessage(chatId, '❌ /show 指令只能在群組中使用');
      return;
    }

    try {
      const groupId = chatId;
      const group = await StatsService.getOrCreateGroup(groupId, chat.title || 'Unknown Group');
      const members = await StatsService.getGroupMembers(groupId);
      const lastRestartTime = await StatsService.getLastRestartTime();
      
      const statsUrl = `https://hao87bot-45efb.web.app/stats/${groupId}`;
      
      // 格式化重啟時間
      let restartTimeText = '尚未重啟';
      if (lastRestartTime) {
        const restartDate = lastRestartTime.toDate();
        const now = new Date();
        const diffMs = now.getTime() - restartDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
          restartTimeText = `${diffDays} 天前（${restartDate.toLocaleString('zh-TW')}）`;
        } else if (diffHours > 0) {
          restartTimeText = `${diffHours} 小時前（${restartDate.toLocaleString('zh-TW')}）`;
        } else if (diffMins > 0) {
          restartTimeText = `${diffMins} 分鐘前（${restartDate.toLocaleString('zh-TW')}）`;
        } else {
          restartTimeText = `剛剛（${restartDate.toLocaleString('zh-TW')}）`;
        }
      }
      
      // 取得前 5 名成員
      const topMembers = members.slice(0, 5);
      
      // 建立回應訊息
      let message = `<b>📊 群組統計資訊</b>\n\n`;
      message += `🔗 <a href="${statsUrl}">查看完整統計</a>\n\n`;
      message += `<b>群組統計：</b>\n`;
      message += `📝 訊息數：${group.messageCount}\n`;
      message += `🔗 連結數：${group.linkCount || 0}\n`;
      message += `📷 圖片數：${group.photoCount || 0}\n`;
      message += `😊 貼圖數：${group.stickerCount || 0}\n\n`;
      
      if (topMembers.length > 0) {
        message += `<b>🏆 活躍成員 Top 5：</b>\n`;
        topMembers.forEach((member, index) => {
          const name = member.firstName || member.username || `用戶 ${member.userId}`;
          message += `${index + 1}. ${name}：${member.messageCount} 則訊息\n`;
        });
        message += `\n`;
      }
      
      message += `<b>🔄 系統狀態：</b>\n`;
      message += `上次重啟：${restartTimeText}`;
      
      await sendMessage(chatId, message);
    } catch (error) {
      console.error('Error showing stats:', error);
      await sendMessage(chatId, '❌ 無法取得統計資料，請稍後再試');
    }
    return;
  }

  // 只處理群組訊息（非命令）
  if (chat.type !== 'group' && chat.type !== 'supergroup') {
    return;
  }

  const groupId = chatId;

  try {
    // 初始化群組（如果不存在）
    const group = await StatsService.getOrCreateGroup(groupId, chat.title || 'Unknown Group');

    // 檢查是否被呼叫
    const botUsername = await getBotUsername();
    const globalThreshold = await StatsService.getGlobalThreshold();
    const isActivated = group.messageCount >= globalThreshold;
    
    if (isBotMentioned(message, botUsername)) {
      // 舊版回應邏輯（暫時停用）
      if (ENABLE_LEGACY_MENTION_RESPONSE) {
        await handleLegacyMentionResponse(chatId, groupId, isActivated);
        return;
      }

      // 新版：使用 Ollama AI 回應
      try {
        const userMessage = message.text || message.caption || '';
        const aiResponse = await callOllama(userMessage);
        await sendMessage(chatId, aiResponse);
      } catch (error) {
        console.error('[handleMessage] Ollama 錯誤:', error);
        // 如果 Ollama 服務失敗，回覆錯誤訊息
        const errorMessage = error instanceof Error 
          ? `🤖 抱歉，我現在無法回應。錯誤：${error.message}`
          : '🤖 抱歉，我現在無法回應，請稍後再試。';
        await sendMessage(chatId, errorMessage);
      }
      return; // 不處理其他邏輯
    }

    // 判斷訊息類型和內容
    let messageType: 'text' | 'photo' | 'sticker' | 'link' = 'text';
    let messageText = '';
    let hasLink = false;
    let hasPhoto = false;

    // 檢查是否有貼圖
    if (message.sticker) {
      messageType = 'sticker';
      messageText = message.sticker.emoji || '貼圖';
      await StatsService.incrementStickerCount(groupId);
      
      // 確保 file_id 存在（雖然類型定義說它是必需的，但為了安全起見還是檢查）
      if (message.sticker.file_id && message.sticker.file_unique_id) {
        await StatsService.recordStickerUsage(groupId, userId, {
          file_unique_id: message.sticker.file_unique_id,
          file_id: message.sticker.file_id,
          emoji: message.sticker.emoji,
          set_name: message.sticker.set_name,
        });
      } else {
        console.warn('[handleMessage] Sticker missing file_id or file_unique_id:', message.sticker);
      }
    }
    // 檢查是否有圖片
    else if (message.photo && message.photo.length > 0) {
      messageType = 'photo';
      messageText = message.caption || '圖片';
      hasPhoto = true;
      await StatsService.incrementPhotoCount(groupId);
      // 檢查圖片說明中是否有連結（使用 caption_entities）
      if (message.caption && message.caption_entities) {
        hasLink = message.caption_entities.some(e => e.type === 'url' || e.type === 'text_link');
      }
    }
    // 檢查文字訊息
    else if (message.text) {
      messageText = message.text;
      // 檢查文字訊息中是否有連結
      if (message.entities) {
        hasLink = message.entities.some(e => e.type === 'url' || e.type === 'text_link');
        if (hasLink) {
          messageType = 'link';
        }
      }
    } else {
      // 其他類型的訊息（如語音、影片等）暫時跳過
      return;
    }

    // 更新群組訊息計數
    await StatsService.incrementMessageCount(groupId);

    // 如果訊息中有連結，更新群組連結計數
    if (hasLink) {
      await StatsService.incrementLinkCount(groupId);
    }

    // 更新成員統計並儲存訊息
    // 如果圖片訊息中有連結，需要同時更新成員的連結計數
    // 先更新主要類型
    await StatsService.updateMemberStats(
      groupId,
      userId,
      from!.username,
      from!.first_name,
      messageText,
      messageType
    );

    // 如果圖片訊息中有連結，需要額外更新成員的連結計數
    if (hasPhoto && hasLink) {
      const db = getFirestore(admin.app(), 'hao87bot');
      const memberRef = db
        .collection('groups')
        .doc(groupId.toString())
        .collection('members')
        .doc(userId.toString());
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        const currentLinkCount = memberDoc.data()?.linkCount || 0;
        await memberRef.update({ linkCount: currentLinkCount + 1 });
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    // 添加詳細錯誤日誌以便調試
    console.error('Message details:', JSON.stringify({
      message_id: message.message_id,
      has_text: !!message.text,
      has_photo: !!message.photo,
      has_sticker: !!message.sticker,
      has_entities: !!message.entities,
      has_caption_entities: !!message.caption_entities,
    }, null, 2));
    throw error;
  }
}

<template>
  <div class="container">
    <!-- 載入中 -->
    <div v-if="loading" class="loading-container">
      <div class="loading">載入中</div>
    </div>

    <!-- 錯誤 -->
    <div v-else-if="error || !data" class="error-container">
      <div class="error">{{ error || '找不到群組資料' }}</div>
    </div>

    <!-- 統計資料 -->
    <div v-else>
      <!-- 標題 -->
      <transition name="fade-slide">
        <h1 class="pixel-bounce" style="text-align: center; margin-bottom: 30px">
          {{ data.group.title }}
        </h1>
      </transition>

      <!-- 群組統計 -->
      <transition name="fade" appear>
        <div class="stats-card rpg-box">
          <h2>群組統計</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value" style="color: #f39c12">
                {{ data.group.messageCount }}
              </div>
              <div class="stat-label">總訊息數</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" style="color: #3498db">
                {{ data.members.length }}
              </div>
              <div class="stat-label">活躍成員</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" style="color: #9b59b6">
                {{ data.group.linkCount || 0 }}
              </div>
              <div class="stat-label">連結次數</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" style="color: #e74c3c">
                {{ data.group.photoCount || 0 }}
              </div>
              <div class="stat-label">圖片次數</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" style="color: #2ecc71">
                {{ data.group.stickerCount || 0 }}
              </div>
              <div class="stat-label">貼圖次數</div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 成員排行榜 -->
      <transition name="fade" appear>
        <div class="stats-card rpg-box" style="transition-delay: 0.1s">
          <h2>發言排行榜</h2>
          <ul class="leaderboard">
            <li
              v-for="(member, index) in data.members"
              :key="member.userId"
              class="leaderboard-item"
              :style="{ animationDelay: `${0.2 + index * 0.05}s` }"
            >
              <span class="rank">#{{ index + 1 }}</span>
              <span class="name">
                {{ member.username || member.firstName || `User ${member.userId}` }}
              </span>
              <span class="count">{{ member.messageCount }} 則</span>
            </li>
          </ul>
        </div>
      </transition>

      <!-- 貼圖排行榜 -->
      <transition name="fade" appear v-if="data.stickers && data.stickers.length > 0">
        <div class="stats-card rpg-box" style="transition-delay: 0.2s">
          <h2>熱門貼圖</h2>
          <ul class="leaderboard">
            <li
              v-for="(sticker, index) in data.stickers"
              :key="sticker.fileUniqueId"
              class="leaderboard-item"
              :style="{ animationDelay: `${0.3 + index * 0.05}s` }"
            >
              <span class="rank">#{{ index + 1 }}</span>
              <span class="sticker-image">
                <img 
                  v-if="sticker.imageUrl" 
                  :src="sticker.imageUrl" 
                  :alt="sticker.emoji || '貼圖'"
                  class="sticker-img"
                />
                <span v-else class="emoji">{{ sticker.emoji || '?' }}</span>
              </span>
              <span class="count">{{ sticker.count }} 次</span>
            </li>
          </ul>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '@/firebase';
import { doc, collection, onSnapshot, query, orderBy, limit, type Unsubscribe } from 'firebase/firestore';

interface GroupStats {
  groupId: number;
  title: string;
  messageCount: number;
  linkCount?: number;
  photoCount?: number;
  stickerCount?: number;
  lastImageAt: number;
  threshold: number;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

interface MemberStats {
  userId: number;
  username?: string;
  firstName?: string;
  messageCount: number;
  linkCount?: number;
  photoCount?: number;
  stickerCount?: number;
  lastMessage: string;
  lastActiveAt: {
    seconds: number;
    nanoseconds: number;
  };
}

interface StickerStats {
  fileUniqueId: string;
  fileId?: string;
  emoji?: string;
  setName?: string;
  count: number;
  lastUsedAt: {
    seconds: number;
    nanoseconds: number;
  };
  lastUsedBy: number;
  imageUrl?: string;
}

interface StatsData {
  group: GroupStats;
  members: MemberStats[];
  stickers: StickerStats[];
}

const route = useRoute();
const id = computed(() => route.params.id as string);

const data = ref<StatsData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

let unsubscribeGroup: Unsubscribe | null = null;
let unsubscribeMembers: Unsubscribe | null = null;
let unsubscribeStickers: Unsubscribe | null = null;

// 追蹤每個監聽器是否已完成第一次資料獲取
let groupLoaded = false;
let membersLoaded = false;
let stickersLoaded = false;

// 檢查是否所有監聽器都已完成第一次資料獲取
const checkAllLoaded = () => {
  if (groupLoaded && membersLoaded && stickersLoaded) {
    loading.value = false;
  }
};

const setupRealtimeListeners = () => {
  // 清理舊的監聽器
  if (unsubscribeGroup) unsubscribeGroup();
  if (unsubscribeMembers) unsubscribeMembers();
  if (unsubscribeStickers) unsubscribeStickers();

  // 重置載入狀態
  groupLoaded = false;
  membersLoaded = false;
  stickersLoaded = false;

  if (!id.value) {
    error.value = '缺少群組 ID';
    loading.value = false;
    return;
  }

  // 驗證群組 ID 格式
  const groupIdNum = parseInt(id.value, 10);

  if (isNaN(groupIdNum)) {
    error.value = `無效的群組 ID: ${id.value}\n\n提示：Telegram 群組 ID 通常是負數（例如：-123456789）`;
    loading.value = false;
    return;
  }

  const groupIdStr = groupIdNum.toString();
  loading.value = true;
  error.value = null;

  // 初始化資料結構
  if (!data.value) {
    data.value = {
      group: {
        groupId: groupIdNum,
        title: '',
        messageCount: 0,
        linkCount: 0,
        photoCount: 0,
        stickerCount: 0,
        lastImageAt: 0,
        threshold: 100,
        createdAt: { seconds: 0, nanoseconds: 0 },
      },
      members: [],
      stickers: [],
    };
  }

  // 監聽群組資料
  unsubscribeGroup = onSnapshot(
    doc(db, 'groups', groupIdStr),
    (snapshot) => {
      if (!groupLoaded) {
        groupLoaded = true;
      }
      
      if (snapshot.exists()) {
        const groupData = snapshot.data() as GroupStats;
        if (data.value) {
          data.value.group = {
            ...groupData,
            linkCount: groupData.linkCount ?? 0,
            photoCount: groupData.photoCount ?? 0,
            stickerCount: groupData.stickerCount ?? 0,
          };
        }
        checkAllLoaded();
      } else {
        error.value = '找不到群組資料';
        checkAllLoaded();
      }
    },
    (err) => {
      console.error('[Stats] Error listening to group:', err);
      if (!groupLoaded) {
        groupLoaded = true;
      }
      error.value = '載入群組資料失敗';
      checkAllLoaded();
    }
  );

  // 監聽成員資料
  unsubscribeMembers = onSnapshot(
    query(collection(db, 'groups', groupIdStr, 'members'), orderBy('messageCount', 'desc')),
    (snapshot) => {
      if (!membersLoaded) {
        membersLoaded = true;
      }
      
      if (data.value) {
        data.value.members = snapshot.docs.map((doc) => doc.data() as MemberStats);
      }
      
      checkAllLoaded();
    },
    (err) => {
      console.error('[Stats] Error listening to members:', err);
      // 成員載入失敗也視為已完成（不影響整體顯示）
      if (!membersLoaded) {
        membersLoaded = true;
        checkAllLoaded();
      }
    }
  );

  // 取得貼圖 URL 的函數
  const getStickerUrl = async (fileId: string): Promise<string | null> => {
    try {
      let apiUrl: string;
      if (import.meta.env.PROD) {
        apiUrl = `/api/sticker-url?file_id=${encodeURIComponent(fileId)}`;
      } else if (import.meta.env.VITE_FIREBASE_PROJECT_ID) {
        apiUrl = `http://localhost:5001/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/us-central1/getStickerUrl?file_id=${encodeURIComponent(fileId)}`;
      } else {
        apiUrl = `/api/sticker-url?file_id=${encodeURIComponent(fileId)}`;
      }
      
      const res = await fetch(apiUrl);
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      if (!data.url) {
        return null;
      }
      return data.url;
    } catch (error) {
      return null;
    }
  };

  // 監聽貼圖排行榜
  unsubscribeStickers = onSnapshot(
    query(
      collection(db, 'groups', groupIdStr, 'stickers'),
      orderBy('count', 'desc'),
      limit(10)
    ),
    async (snapshot) => {
      if (data.value) {
        const stickers = snapshot.docs.map((doc) => doc.data() as StickerStats);
        
        // 為每個貼圖取得圖片 URL
        for (const sticker of stickers) {
          if (sticker.fileId && !sticker.imageUrl) {
            sticker.imageUrl = await getStickerUrl(sticker.fileId) || undefined;
          }
        }
        
        data.value.stickers = stickers;
      }
      
      // 只有在第一次載入時才標記為完成
      if (!stickersLoaded) {
        stickersLoaded = true;
        checkAllLoaded();
      }
    },
    (err) => {
      console.error('[Stats] Error listening to stickers:', err);
      // 貼圖載入失敗也視為已完成（不影響整體顯示）
      if (!stickersLoaded) {
        stickersLoaded = true;
        checkAllLoaded();
      }
    }
  );
};

onMounted(() => {
  setupRealtimeListeners();
});

watch(id, () => {
  setupRealtimeListeners();
});

onUnmounted(() => {
  if (unsubscribeGroup) unsubscribeGroup();
  if (unsubscribeMembers) unsubscribeMembers();
  if (unsubscribeStickers) unsubscribeStickers();
});
</script>

<style scoped>
.stats-grid {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  justify-content: center;
}

.stat-item {
  text-align: center;
  min-width: 120px;
}

.stat-value {
  font-size: 32px;
  margin-bottom: 10px;
  font-weight: bold;
  text-shadow: 2px 2px 0 #000;
}

.stat-label {
  font-size: 12px;
  color: #ccc;
}

/* Vue Transition 動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active {
  transition: all 0.5s;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

/* 列表項動畫 */
.leaderboard-item {
  animation: slideIn 0.3s ease-out both;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

</style>

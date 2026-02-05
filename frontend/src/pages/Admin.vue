<template>
  <div class="container">
    <!-- 標題和登出按鈕 -->
    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 1200px; margin-bottom: 20px">
      <h1 class="pixel-bounce">管理介面</h1>
      <button @click="handleLogout" class="nes-btn is-error pixel-button">
        登出
      </button>
    </div>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading">載入中...</div>
    </div>

    <!-- 錯誤訊息 -->
    <div v-if="error" class="error-message rpg-box" style="max-width: 1200px; width: 100%">
      {{ error }}
    </div>

    <!-- 管理介面內容 -->
    <div v-else style="width: 100%; max-width: 1200px">
      <!-- 系統設定管理 -->
      <transition name="fade" appear>
        <div class="admin-card rpg-box">
          <h2>系統設定</h2>
          <div class="settings-form">
            <div class="form-group">
              <label for="threshold">全域啟動閾值</label>
              <div style="display: flex; gap: 10px; align-items: center">
                <input
                  id="threshold"
                  v-model.number="threshold"
                  type="number"
                  min="1"
                  class="nes-input"
                  :disabled="isSavingSettings"
                  style="flex: 1"
                />
                <button
                  @click="saveSettings"
                  class="nes-btn is-primary pixel-button"
                  :disabled="isSavingSettings"
                >
                  {{ isSavingSettings ? '儲存中...' : '儲存' }}
                </button>
              </div>
              <p style="font-size: 10px; color: #ccc; margin-top: 5px">
                設定機器人開始統計的訊息數閾值
              </p>
            </div>
          </div>
        </div>
      </transition>

      <!-- 群組統計總覽 -->
      <transition name="fade" appear style="transition-delay: 0.1s">
        <div class="admin-card rpg-box">
          <h2>群組統計總覽</h2>
          <div v-if="groups.length === 0" class="empty-state">
            目前沒有任何群組資料
          </div>
          <div v-else class="groups-grid">
            <div
              v-for="group in groups"
              :key="group.groupId"
              class="group-card rpg-box"
            >
              <div class="group-header">
                <h3>{{ group.title || `群組 ${group.groupId}` }}</h3>
                <button
                  @click="deleteGroup(group.groupId)"
                  class="nes-btn is-error"
                  :disabled="isDeleting === group.groupId"
                  style="font-size: 10px; padding: 6px 12px"
                >
                  {{ isDeleting === group.groupId ? '刪除中...' : '刪除' }}
                </button>
              </div>
              <div class="group-stats">
                <div class="group-stat-item">
                  <span class="stat-label">訊息數</span>
                  <span class="stat-value">{{ group.messageCount || 0 }}</span>
                </div>
                <div class="group-stat-item">
                  <span class="stat-label">連結</span>
                  <span class="stat-value">{{ group.linkCount || 0 }}</span>
                </div>
                <div class="group-stat-item">
                  <span class="stat-label">圖片</span>
                  <span class="stat-value">{{ group.photoCount || 0 }}</span>
                </div>
                <div class="group-stat-item">
                  <span class="stat-label">貼圖</span>
                  <span class="stat-value">{{ group.stickerCount || 0 }}</span>
                </div>
              </div>
              <div class="group-footer">
                <a
                  :href="`/stats/${group.groupId}`"
                  target="_blank"
                  class="nes-btn is-primary"
                  style="font-size: 10px; padding: 6px 12px; text-decoration: none"
                >
                  查看詳細統計
                </a>
                <span class="group-id">ID: {{ group.groupId }}</span>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 系統日誌 -->
      <transition name="fade" appear style="transition-delay: 0.2s">
        <div class="admin-card rpg-box">
          <h2>系統資訊</h2>
          <div class="system-info">
            <div class="info-item">
              <span class="info-label">總群組數</span>
              <span class="info-value">{{ groups.length }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">總訊息數</span>
              <span class="info-value">{{ totalMessages }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">最後更新</span>
              <span class="info-value">{{ lastUpdateTime || '無資料' }}</span>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { logout } = useAuth();

// 狀態
const isLoading = ref(true);
const error = ref<string | null>(null);
const groups = ref<any[]>([]);
const threshold = ref<number>(100);
const isSavingSettings = ref(false);
const isDeleting = ref<number | null>(null);

// 監聽器
let unsubscribeGroups: (() => void) | null = null;
let unsubscribeSettings: (() => void) | null = null;

// 計算屬性
const totalMessages = computed(() => {
  return groups.value.reduce((sum, group) => sum + (group.messageCount || 0), 0);
});

const lastUpdateTime = computed(() => {
  if (groups.value.length === 0) return null;
  
  const timestamps = groups.value
    .map((g) => {
      if (g.createdAt) {
        const ts = g.createdAt as Timestamp;
        return ts.toDate();
      }
      return null;
    })
    .filter((d): d is Date => d !== null);
  
  if (timestamps.length === 0) return null;
  
  const latest = new Date(Math.max(...timestamps.map((d) => d.getTime())));
  return latest.toLocaleString('zh-TW');
});

// 載入系統設定
const loadSettings = () => {
  const settingsRef = doc(db, 'settings', 'global');
  
  unsubscribeSettings = onSnapshot(
    settingsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        threshold.value = data?.threshold || 100;
      } else {
        // 如果不存在，建立預設設定
        threshold.value = 100;
      }
    },
    (err) => {
      console.error('[Admin] Error loading settings:', err);
      error.value = '載入系統設定失敗';
    }
  );
};

// 儲存系統設定
const saveSettings = async () => {
  if (threshold.value < 1) {
    error.value = '閾值必須大於 0';
    return;
  }

  try {
    isSavingSettings.value = true;
    error.value = null;

    const settingsRef = doc(db, 'settings', 'global');
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      await updateDoc(settingsRef, { threshold: threshold.value });
    } else {
      // 如果不存在，建立新文件
      await setDoc(settingsRef, { threshold: threshold.value });
    }

    // 成功訊息（可以加入 toast 通知）
    console.log('[Admin] Settings saved successfully');
  } catch (err: any) {
    console.error('[Admin] Error saving settings:', err);
    error.value = '儲存設定失敗：' + (err.message || '未知錯誤');
  } finally {
    isSavingSettings.value = false;
  }
};

// 載入群組列表
const loadGroups = () => {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, orderBy('messageCount', 'desc'));

  unsubscribeGroups = onSnapshot(
    q,
    (snapshot) => {
      groups.value = snapshot.docs.map((doc) => ({
        groupId: parseInt(doc.id),
        ...doc.data(),
      }));
      isLoading.value = false;
    },
    (err) => {
      console.error('[Admin] Error loading groups:', err);
      error.value = '載入群組資料失敗';
      isLoading.value = false;
    }
  );
};

// 刪除群組
const deleteGroup = async (groupId: number) => {
  if (!confirm(`確定要刪除群組「${groupId}」的所有資料嗎？此操作無法復原。`)) {
    return;
  }

  try {
    isDeleting.value = groupId;
    error.value = null;

    const groupRef = doc(db, 'groups', groupId.toString());
    await deleteDoc(groupRef);

    // 成功訊息
    console.log(`[Admin] Group ${groupId} deleted successfully`);
  } catch (err: any) {
    console.error('[Admin] Error deleting group:', err);
    error.value = '刪除群組失敗：' + (err.message || '未知錯誤');
  } finally {
    isDeleting.value = null;
  }
};

// 登出
const handleLogout = async () => {
  try {
    await logout();
    router.push('/login');
  } catch (err) {
    console.error('[Admin] Logout error:', err);
  }
};

// 初始化
onMounted(() => {
  loadSettings();
  loadGroups();
});

onUnmounted(() => {
  if (unsubscribeGroups) unsubscribeGroups();
  if (unsubscribeSettings) unsubscribeSettings();
});
</script>

<style scoped>
.admin-card {
  margin-bottom: 20px;
  padding: 20px;
}

.admin-card h2 {
  font-size: 16px;
  margin-bottom: 15px;
  color: #fff;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.group-card {
  padding: 15px;
  background: #1a1a2e;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.group-header h3 {
  font-size: 14px;
  color: #fff;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.group-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: #34495e;
  border: 2px solid #fff;
}

.group-stat-item .stat-label {
  font-size: 10px;
  color: #ccc;
  margin-bottom: 5px;
}

.group-stat-item .stat-value {
  font-size: 18px;
  color: #f39c12;
  font-weight: bold;
}

.group-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 2px solid #444;
}

.group-id {
  font-size: 10px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

.system-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  padding: 15px;
  background: #34495e;
  border: 2px solid #fff;
  text-align: center;
}

.info-label {
  font-size: 12px;
  color: #ccc;
  margin-bottom: 8px;
}

.info-value {
  font-size: 20px;
  color: #f39c12;
  font-weight: bold;
}

.error-message {
  padding: 15px;
  background: #e74c3c;
  color: #fff;
  border: 3px solid #fff;
  font-size: 12px;
  text-align: center;
  margin-bottom: 20px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.loading {
  font-size: 14px;
  color: #fff;
  animation: pixel-bounce 1s ease-in-out infinite;
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
</style>

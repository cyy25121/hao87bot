<template>
  <div class="container">
    <div class="login-card rpg-box">
      <h1 class="pixel-bounce" style="text-align: center; margin-bottom: 30px">
        管理介面登入
      </h1>

      <!-- 載入中 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading">載入中...</div>
      </div>

      <!-- 登入表單 -->
      <div v-else class="login-form">
        <!-- 說明文字 -->
        <p style="text-align: center; margin-bottom: 20px; font-size: 12px; color: #ccc">
          請使用 Google 帳號登入<br />
          僅限管理員帳號可存取
        </p>

        <!-- 錯誤訊息 -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- Google 登入按鈕 -->
        <button
          @click="handleLogin"
          class="nes-btn is-primary pixel-button google-login-btn"
          :disabled="isSubmitting"
          style="width: 100%; margin-top: 20px"
        >
          <span v-if="!isSubmitting">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              style="vertical-align: middle; margin-right: 8px"
            >
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            使用 Google 登入
          </span>
          <span v-else>登入中...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { login, isAuthenticated, isLoading, error } = useAuth();

const isSubmitting = ref(false);

// 如果已登入，自動導向管理介面
onMounted(() => {
  if (isAuthenticated.value) {
    router.push('/admin');
  }
});

// 處理登入
const handleLogin = async () => {
  try {
    isSubmitting.value = true;
    await login();

    // 登入成功，導向管理介面
    router.push('/admin');
  } catch (err) {
    // 錯誤已由 useAuth 處理，這裡不需要額外處理
    console.error('[Login] Login failed:', err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.login-card {
  max-width: 400px;
  width: 100%;
  padding: 40px;
  margin: 0 auto;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.google-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  padding: 15px 24px;
}

.google-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-login-btn svg {
  display: inline-block;
}

.error-message {
  padding: 12px;
  background: #e74c3c;
  color: #fff;
  border: 3px solid #fff;
  font-size: 12px;
  text-align: center;
  image-rendering: pixelated;
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
</style>

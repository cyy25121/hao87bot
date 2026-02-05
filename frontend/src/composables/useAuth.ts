import { ref, computed } from 'vue';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';

// Email 白名單
const ALLOWED_EMAILS = ['cyy25121@gmail.com'];

// 響應式狀態
const user = ref<User | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

// 認證狀態監聽器（保留以備將來清理使用）
// @ts-expect-error - 保留以備將來清理使用，目前未使用但需要儲存引用
let _unsubscribe: (() => void) | null = null;
let isInitialized = false;

// 初始化認證狀態監聽（只執行一次）
function initAuth() {
  if (isInitialized) return; // 避免重複訂閱
  isInitialized = true;

  _unsubscribe = onAuthStateChanged(
    auth,
    async (firebaseUser) => {
      isLoading.value = true;
      error.value = null;

      if (firebaseUser) {
        // 檢查 email 是否符合白名單
        const email = firebaseUser.email;
        if (!isEmailAllowed(email)) {
          // 不符合白名單，立即登出
          error.value = '此帳號沒有權限存取管理介面';
          await signOut(auth);
          user.value = null;
        } else {
          user.value = firebaseUser;
        }
      } else {
        user.value = null;
      }

      isLoading.value = false;
    },
    (err) => {
      console.error('[useAuth] Auth state error:', err);
      error.value = '認證狀態檢查失敗';
      isLoading.value = false;
    }
  );
}

// 檢查 email 是否符合白名單
function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

// 立即初始化（應用啟動時）
initAuth();

export function useAuth() {
  // Google Auth Provider
  const googleProvider = new GoogleAuthProvider();

  // 登入（使用 Google Provider）
  const login = async (): Promise<void> => {
    try {
      error.value = null;
      isLoading.value = true;

      const userCredential = await signInWithPopup(auth, googleProvider);

      // 檢查 email 是否符合白名單
      const email = userCredential.user.email;
      if (!isEmailAllowed(email)) {
        // 不符合白名單，立即登出
        await signOut(auth);
        throw new Error('此帳號沒有權限存取管理介面');
      }

      // 登入成功，user 會透過 onAuthStateChanged 更新
    } catch (err: any) {
      console.error('[useAuth] Login error:', err);
      
      // 處理使用者取消登入的情況
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        error.value = null; // 使用者取消登入，不顯示錯誤
        isLoading.value = false;
        return;
      }

      error.value =
        err.code === 'auth/popup-blocked'
          ? '彈出視窗被阻擋，請允許彈出視窗後重試'
          : err.code === 'auth/popup-closed-by-user'
          ? '登入已取消'
          : err.message || '登入失敗，請稍後再試';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 登出
  const logout = async (): Promise<void> => {
    try {
      error.value = null;
      await signOut(auth);
      // user 會透過 onAuthStateChanged 自動更新為 null
    } catch (err: any) {
      console.error('[useAuth] Logout error:', err);
      error.value = '登出失敗，請稍後再試';
      throw err;
    }
  };

  // 計算屬性
  const isAuthenticated = computed(() => {
    return user.value !== null && isEmailAllowed(user.value.email);
  });

  return {
    user: computed(() => user.value),
    isAuthenticated,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    login,
    logout,
    isEmailAllowed,
  };
}

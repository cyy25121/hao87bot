import { createRouter, createWebHistory } from 'vue-router';
import Stats from '../pages/Stats.vue';
import Home from '../pages/Home.vue';
import Login from '../pages/Login.vue';
import Admin from '../pages/Admin.vue';
import { useAuth } from '../composables/useAuth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/stats/:id',
      name: 'Stats',
      component: Stats,
    },
    {
      path: '/:id(\\-?\\d+)',
      name: 'StatsRedirect',
      redirect: (to) => `/stats${to.path}`,
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { requiresAuth: false },
    },
    {
      path: '/admin',
      name: 'Admin',
      component: Admin,
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      name: 'Home',
      component: Home,
    },
  ],
});

// 路由守衛
router.beforeEach(async (to, _from, next) => {
  const { isAuthenticated, isLoading } = useAuth();

  // 等待認證狀態初始化完成（最多等待 3 秒）
  if (isLoading.value) {
    let attempts = 0;
    const maxAttempts = 30; // 3 秒 (30 * 100ms)
    
    await new Promise<void>((resolve) => {
      const checkAuth = setInterval(() => {
        attempts++;
        if (!isLoading.value || attempts >= maxAttempts) {
          clearInterval(checkAuth);
          resolve();
        }
      }, 100);
    });
  }

  // 檢查路由是否需要認證
  if (to.meta.requiresAuth) {
    if (!isAuthenticated.value) {
      // 未登入，導向登入頁
      next({ name: 'Login', query: { redirect: to.fullPath } });
    } else {
      // 已登入，允許存取
      next();
    }
  } else if (to.name === 'Login' && isAuthenticated.value) {
    // 已登入但訪問登入頁，導向管理介面
    next({ name: 'Admin' });
  } else {
    // 不需要認證的路由，直接允許
    next();
  }
});

// Router configured

export default router;

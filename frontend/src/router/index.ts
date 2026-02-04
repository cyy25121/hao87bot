import { createRouter, createWebHistory } from 'vue-router';
import Stats from '../pages/Stats.vue';
import Home from '../pages/Home.vue';

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
      path: '/',
      name: 'Home',
      component: Home,
    },
  ],
});

// Router configured

export default router;

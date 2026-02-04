import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './index.css';

try {
  const app = createApp(App);
  app.use(router);
  app.mount('#root');
} catch (error) {
  console.error('[Main] Fatal error:', error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: monospace; background: #f0f0f0;">
        <h1>應用程式載入失敗</h1>
        <p>錯誤訊息: ${error instanceof Error ? error.message : String(error)}</p>
        <p>請檢查瀏覽器 Console 查看詳細錯誤</p>
      </div>
    `;
  }
}

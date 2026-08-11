import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 备份文件要记录导出它的 App 版本。从 package.json 读而不是在代码里再写一遍，
// 否则两处迟早不一致，而不一致的版本号比没有版本号更误导人。
const { version: appVersion } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon-180.png'],

      manifest: {
        name: '智慧学习',
        short_name: '智慧学习',
        description: '一年级数学·拼音·英语的自适应练习',
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        // standalone 让「添加到主屏幕」后全屏运行，没有 Safari 地址栏
        display: 'standalone',
        // iOS 会忽略 manifest 的 orientation，强制横屏做不到，
        // 因此设为 any 并由布局自行适配 iPad 横屏与 iPhone 竖屏
        orientation: 'any',
        theme_color: '#FFB84D',
        background_color: '#FFF8E7',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,mp3}'],
        cleanupOutdatedCaches: true,
        // ⚠️ 刻意不启用 skipWaiting/clientsClaim：
        // 新版本立即接管会在孩子答题途中刷新页面，当前会话的题目存在内存里会全部丢失。
        // 让新 Service Worker 等到下次冷启动再生效——自用场景每天打开一次，完全够用。
        skipWaiting: false,
        clientsClaim: false,
      },

      devOptions: {
        // 开发时不启用 SW，避免缓存干扰热更新
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    // `npm run dev -- --host` 后 iPad 可通过局域网地址实时预览
    port: 5173,
  },

  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
})

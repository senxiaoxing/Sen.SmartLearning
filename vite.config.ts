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

/**
 * 站点根路径。GitHub Pages 把仓库部署在 `/<仓库名>/` 子路径下，
 * 所有资源引用都必须带这个前缀，否则打包产物全部 404、页面纯白。
 *
 * ⚠️ 写死而不是用环境变量：Windows 的 npm script 传环境变量要用 cmd 的
 * `set VAR=x&&` 语法，`&&` 前多一个空格就会把空格带进变量值，
 * 而这个项目只往一个地方部署，不值得为此引入 cross-env 依赖。
 *
 * 代价是本地开发地址也带上了这一段：
 *   http://localhost:5173/Sen.SmartLearning/
 * 换来的是 dev / preview / 线上三者路径完全一致 ——
 * 不会出现「本地好好的、线上白屏」这类只在生产环境复现的问题。
 *
 * 将来换自定义域名或换回 Cloudflare Pages（根路径部署）时，改回 '/' 即可。
 */
const BASE = '/Sen.SmartLearning/'

export default defineConfig({
  base: BASE,

  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon-180.png'],

      manifest: {
        name: '希恩爱学习',
        short_name: '希恩爱学习',
        description: '一年级数学·拼音·英语的自适应练习',
        lang: 'zh-CN',
        // ⚠️ 必须是子路径而不是 '/'：写 '/' 的话 iOS 会认为 PWA 的作用域是
        // github.io 整个域名，「添加到主屏幕」后点开会跳到 github.io 首页
        start_url: BASE,
        scope: BASE,
        // standalone 让「添加到主屏幕」后全屏运行，没有 Safari 地址栏
        display: 'standalone',
        // iOS 会忽略 manifest 的 orientation，强制横屏做不到，
        // 因此设为 any 并由布局自行适配 iPad 横屏与 iPhone 竖屏
        orientation: 'any',
        // 与 index.html 的 <meta name="theme-color"> 和果冻岛皮肤的 canvas 色保持一致，
        // 三处对不上的话启动画面会闪一下旧配色
        theme_color: '#FFF3E2',
        background_color: '#FFF3E2',
        // 相对路径。manifest 本身位于 BASE 下，浏览器会按它解析出正确的绝对地址；
        // 写成 '/icons/…' 会跳过 BASE 直接指向域名根，在 GitHub Pages 上必 404
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // ⚠️ wav 不能漏：6 个音效（tap/correct/wrong/complete/levelUp/place）全是 wav，
        // 只写 mp3 的话它们不进预缓存，装到主屏幕后**离线时音效全部失效**——
        // 而「每次交互必有视觉 + 音效双反馈」是硬要求（design/03 §5.2），
        // 答错时那声柔和提示音尤其不能少。
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,mp3,wav}'],
        // ⭐ 音频的「补录层」。预缓存是 install 期一次性的：装到一半断网、
        // 或某次更新没下完，缺的文件不会自己补上——表现是那句话降级成机器音。
        // 这条 CacheFirst 路由让启动自检门（VoiceCacheGate）能主动把缺的拉回来：
        // 页面 fetch 一条，SW 就缓存一条，下次离线照样有。
        //
        // ⚠️ 预缓存命中的文件走预缓存路由（带版本修订、更新时自动换新），
        // 这条路由只接「预缓存没有」的漏网文件——CacheFirst 不会让正常文件变陈旧。
        runtimeCaching: [
          {
            urlPattern: /\/audio\/(voice|sfx)\/[^/]+\.(mp3|wav)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'audio-repair' },
          },
        ],
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

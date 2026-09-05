import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

// 备份文件要记录导出它的 App 版本。从 package.json 读而不是在代码里再写一遍，
// 否则两处迟早不一致，而不一致的版本号比没有版本号更误导人。
const { version: appVersion } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string }

/**
 * 本次构建的时间戳。
 *
 * ⚠️ 必须**只算一次**，由 `define`（注入进代码）和 `version.json`（发到线上）共用。
 * 各自 `new Date()` 会差出几毫秒，于是同一份构建自己跟自己都对不上，
 * 家长区永远显示「有新版本」。
 */
const builtAt = new Date().toISOString()

/**
 * 在产物根目录写一份 `version.json`，供家长区「版本检查」比对线上是否已更新。
 *
 * 不手写 `public/version.json` 的理由同上面 `appVersion`：
 * 版本号有两处来源就迟早对不上，而对不上的版本号比没有更误导人。
 *
 * ⭐ `builtAt` 才是实际判据。`npm run deploy` 只是 build + gh-pages，
 * **不会**自动 bump package.json 的 version——只比版本号的话，连续部署十次
 * 都显示「已是最新」，这个功能等于不存在。版本号仍然照常发出去，用于显示。
 *
 * ⚠️ 扩展名 `.json` 是刻意的：Workbox 的 globPatterns 不含 json，
 * 它因此不会进预缓存。否则 Service Worker 会拿缓存里的旧文件回答
 * 「线上是哪个版本」——那就成了自己问自己，永远一致。
 */
function emitVersionManifest(): Plugin {
  return {
    name: 'emit-version-manifest',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: appVersion, builtAt }),
      })
    },
  }
}

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
    __APP_BUILT_AT__: JSON.stringify(builtAt),
  },

  plugins: [
    react(),
    emitVersionManifest(),
    VitePWA({
      /**
       * ⭐ `prompt` 而不是 `autoUpdate` —— 由 App 自己挑时机接管，见 platform/appUpdate.ts。
       *
       * 这里原先是 `autoUpdate` 配 `skipWaiting: false`，那是一对**自相矛盾**的设置，
       * 也是「iPad 上点开图标，更新死活下不来」的根本原因：
       * autoUpdate 生成的注册脚本只负责周期性 `registration.update()`，
       * 把新 Service Worker 下载到 **waiting** 就完事了；而真正让它上任的
       * `skipWaiting()` 被关掉了，于是新版本永远排在队里不接管。
       *
       * 当时以为「等下次冷启动自然就生效」——并不会。waiting 的 SW 要等到
       * **所有**受控页面全部关闭才激活，而 iOS 上 PWA 只是转入后台、
       * 页面并没有真正销毁，这个条件常年不成立。
       *
       * 关掉 skipWaiting 的初衷（别在孩子答题途中刷新页面）是对的，
       * 现在由 App 在会话空闲时主动调用来满足，而不是靠一个永远不发生的时机。
       */
      registerType: 'prompt',
      // 注册与更新时机全部由 platform/appUpdate.ts 掌握，不要再注入一份自动脚本
      injectRegister: null,
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
        // ⭐ 语音进预缓存的是 **8 个 .bin 语音包**，不是 764 个 mp3。
        //
        // 首次安装要把全部语音下到本机，而 764 个 ~15KB 的小文件时间几乎全花在
        // 「发请求、等响应」上——GitHub Pages 从国内访问延迟高，实测要等好几分钟。
        // 合并成包后请求数降到个位数，同样的字节按带宽跑满。见 scripts/bundle-voices.mjs。
        //
        // ⚠️ mp3 **刻意排除**：它们仍在 dist 里（包损坏时的单文件兜底、也是打包的原料），
        // 但绝不能进预缓存——那等于把同样的 12.6MB 下两遍。
        // ⚠️ wav 不能漏：6 个音效（tap/correct/wrong/complete/levelUp/place）全是 wav，
        // 不进预缓存的话装到主屏幕后**离线时音效全部失效**，
        // 而「每次交互必有视觉 + 音效双反馈」是硬要求（design/03 §5.2）。
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,wav,bin}'],
        // ⭐ 人工校验页**不进预缓存**：`*-check.html` 那几个（笔顺、古诗、情境题、拼音）
        // 是给**家长核对内容**用的一次性工具，孩子的 App 一次都不会打开它们。
        //
        // 它们仍留在 dist 里（`npm run dev` 或线上直接输 URL 照常打得开），
        // 只是不该塞进首装——笔顺三辑各 200~280KB，加起来 875KB，
        // 而首装体积正是 §2.5d 花大力气从「几百个请求」压下来的那件事。
        //
        // ⚠️ 别写成 `**/*.html` 之类的宽模式：`index.html` 必须留在预缓存里，
        // 否则装到主屏幕后离线打不开。
        globIgnores: ['**/*-check.html', '**/*-check-vol*.html', '**/pinyin-record.html'],
        // ⚠️ 默认上限 2MiB 会把 3MB 的 poem0.bin **静默**排除在预缓存外。
        // 打包脚本的分卷上限是 3MB，这里留到 4MB
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // ⭐ 音频的「补录层」。预缓存是 install 期一次性的：装到一半断网、
        // 或某次更新没下完，缺的文件不会自己补上——表现是那句话降级成机器音。
        // 这条 CacheFirst 路由让启动自检门（VoiceCacheGate）能主动把缺的拉回来：
        // 页面 fetch 一个包，SW 就缓存一个，下次离线照样有。
        //
        // ⚠️ 预缓存命中的文件走预缓存路由（带版本修订、更新时自动换新），
        // 这条路由只接「预缓存没有」的漏网文件——CacheFirst 不会让正常文件变陈旧。
        // mp3 也留在这条路由里：兜底路径取过的单文件同样值得缓存下来。
        runtimeCaching: [
          {
            urlPattern: /\/audio\/(bundles\/[^/]+\.bin|(voice|sfx)\/[^/]+\.(mp3|wav))$/,
            handler: 'CacheFirst',
            options: { cacheName: 'audio-repair' },
          },
        ],
        cleanupOutdatedCaches: true,
        // ⚠️ 不自动 skipWaiting：新版本立即接管会在孩子答题途中刷新页面，
        // 当前会话的题目存在内存里会全部丢失。
        //
        // ⭐ 但「不自动」不等于「不发生」——`registerType: 'prompt'` 会在 SW 里装上
        // SKIP_WAITING 消息监听，App 在会话空闲时发一条消息就能让新版本立刻上任。
        // 见 platform/appUpdate.ts。少了那一步，新版本会永远排在 waiting 里。
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

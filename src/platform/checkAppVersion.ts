/**
 * @file 版本检查 —— 本机跑的这份，和线上最新那份是不是同一个
 * @layer platform  浏览器 API 封装，不含业务逻辑
 * @see vite.config.ts  emitVersionManifest()，version.json 是怎么产生的
 * @see src/features/parent/VersionCheck.tsx  家长区里的展示
 * @see src/platform/appUpdate.ts  发现新版本后由谁、在什么时机装上
 *
 * ## 为什么不问 Service Worker
 *
 * SW 能告诉你「有个新版本在 waiting」，却**说不出它是哪一版**——版本号编译在
 * 新的 JS 包里，在它接管之前页面读不到。而这里要回答的恰恰是「我部署的那一版，
 * iPad 上到底收到没有」，需要具体版本号。所以绕开 SW，直接向线上要一份清单。
 *
 * ## ⚠️ 别拿语音自检当版本依据
 *
 * `voiceCacheAudit.ts` 查的是语音包在不在缓存里，更新期间旧条目仍然健在
 * （Workbox 要到 activate 才清理），它会照常报「全部就位」。
 * 那个是「离线能不能出声」，这个是「版本新不新」，两回事。
 */

import { assetUrl } from '@/platform/assetUrl'

/** 构建期注入，见 vite.config.ts 的 `define`。同 `data/db.ts` 的 APP_VERSION 同源 */
declare const __APP_VERSION__: string
declare const __APP_BUILT_AT__: string

/**
 * 请求超时。断网时 fetch 会立刻 reject，用不上它；
 * 它防的是「连着 WiFi 但出不了外网」——那种情况下 fetch 会一直悬着，
 * 家长区的按钮就永远停在「检查中…」。
 */
const VERSION_CHECK_TIMEOUT_MS = 8000

/** 一次构建的身份。`builtAt` 缺失只可能出现在没跑 `define` 替换的环境（如单测） */
export interface BuildStamp {
  version: string
  builtAt: string | null
}

/**
 * - `latest` 本机就是线上最新
 * - `outdated` 线上有更新的构建（可能版本号相同但重新部署过）
 * - `unreachable` 拿不到线上清单：断网、或开发预览没有 version.json
 */
export type VersionCheckStatus = 'latest' | 'outdated' | 'unreachable'

export interface VersionCheckResult {
  status: VersionCheckStatus
  /** 此刻正在运行的这份构建 */
  current: BuildStamp
  /** 线上最新那份；`unreachable` 时为 null */
  latest: BuildStamp | null
}

/**
 * 当前运行中这份构建的身份。
 *
 * 兜底成 `'0.0.0-dev'` 的理由同 `data/db.ts` 的 APP_VERSION：万一某个工具链
 * 没跑 `define` 替换，直接引用裸标识符会抛 ReferenceError。
 */
export const CURRENT_BUILD: BuildStamp = {
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev',
  builtAt: typeof __APP_BUILT_AT__ === 'string' ? __APP_BUILT_AT__ : null,
}

/** 从线上清单里挑出两个字段，任何形状不对的都当作没拿到 */
function parseStamp(raw: unknown): BuildStamp | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { version, builtAt } = raw as { version?: unknown; builtAt?: unknown }
  if (typeof version !== 'string') return null
  return { version, builtAt: typeof builtAt === 'string' ? builtAt : null }
}

/**
 * 取线上 `version.json`，和本机这份比对。
 *
 * 两道防缓存是**都需要**的，各挡一层：
 * - `cache: 'no-store'` 挡浏览器自己的 HTTP 缓存
 * - `?t=` 时间戳挡 GitHub Pages 的边缘缓存（默认 `max-age=600`，
 *   刚 deploy 完的十分钟内不加它就可能拿到上一版）
 *
 * 判据是 `builtAt` 而非版本号：`npm run deploy` 不会自动 bump package.json 的
 * version，同一个版本号重新部署是这个项目的常态，只比版本号会漏报。
 *
 * @returns 比对结果。任何失败（断网、404、JSON 损坏）都收敛成 `unreachable`，
 *          不抛异常——这是家长区的一个信息展示，不值得让页面崩掉
 *
 * @example
 * await checkAppVersion()
 * // 线上重新部署过（版本号没动）：
 * // { status: 'outdated',
 * //   current: { version: '0.1.1', builtAt: '2026-08-20T06:30:00.000Z' },
 * //   latest:  { version: '0.1.1', builtAt: '2026-08-21T01:12:00.000Z' } }
 */
export async function checkAppVersion(): Promise<VersionCheckResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT_MS)

  try {
    const res = await fetch(`${assetUrl('version.json')}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) return { status: 'unreachable', current: CURRENT_BUILD, latest: null }

    const latest = parseStamp(await res.json())
    if (latest === null) return { status: 'unreachable', current: CURRENT_BUILD, latest }

    return { status: isSameBuild(CURRENT_BUILD, latest) ? 'latest' : 'outdated', current: CURRENT_BUILD, latest }
  } catch {
    return { status: 'unreachable', current: CURRENT_BUILD, latest: null }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 两份构建是否同一个。
 *
 * 双方都有 `builtAt` 时**只看它**：版本号相同但重新部署过，本机那份仍是旧的。
 * 线上清单缺 `builtAt`（老版本的 version.json）时退回比版本号，
 * 宁可漏报也不要因为一个缺失字段就天天提示「有新版本」。
 */
function isSameBuild(a: BuildStamp, b: BuildStamp): boolean {
  if (a.builtAt !== null && b.builtAt !== null) return a.builtAt === b.builtAt
  return a.version === b.version
}

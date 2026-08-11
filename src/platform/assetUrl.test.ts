/**
 * @file 静态资源 URL 测试 —— 守一个「只在线上错」的 bug
 * @layer platform
 * @see src/platform/assetUrl.ts
 *
 * ⭐ 这个文件守的是**线上无声**。
 *
 * 站点部署在 `/Sen.SmartLearning/` 子路径下，代码里写 `fetch('/audio/...')`
 * 请求的却是域名根，一律 404。而它**在开发机上完全正常**——
 * Vite 的 dev server 会顺便在根路径伺服 `public/`。
 *
 * 上线后的表现：语音全部降级成机械的系统合成音（iPad 男声、手机女声），
 * 音效一声都没有。不报错、不白屏，孩子不会告状，家长以为是 iOS 的毛病。
 * 已经这样发布过一次，所以用测试钉死。
 */

import { readFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assetUrl } from '@/platform/assetUrl'

describe('assetUrl', () => {
  it('永远带上部署前缀', () => {
    expect(assetUrl('audio/voice/num.9.mp3')).toBe(
      `${import.meta.env.BASE_URL}audio/voice/num.9.mp3`,
    )
  })

  it('传了开头的斜杠也不会拼出双斜杠 —— 双斜杠在部分 CDN 上是另一个资源', () => {
    expect(assetUrl('/audio/sfx/tap.wav')).toBe(assetUrl('audio/sfx/tap.wav'))
    expect(assetUrl('///audio/sfx/tap.wav')).not.toContain('//audio')
  })

  it('结果绝不以 `//` 开头 —— 那会被当成协议相对 URL，跳去别的域名', () => {
    expect(assetUrl('audio/x.mp3').startsWith('//')).toBe(false)
  })
})

/** 去掉注释，避免文件头里举的反例被当成真代码 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('⭐ 源码里不许写死 public/ 的根绝对路径', () => {
  it('没有任何 `"/audio/…"` 或 `"/icons/…"` 这类写法', async () => {
    const root = join(process.cwd(), 'src')
    const offenders: string[] = []

    for await (const entry of glob('**/*.{ts,tsx}', { cwd: root })) {
      const file = join(root, entry)
      // 测试文件不会打包进浏览器，写死路径也不会造成线上 404；
      // 而它们（比如这一条）本来就要举反例
      if (/\.test\.tsx?$/.test(entry)) continue
      // assetUrl 自己就是解药，它的 JSDoc 里必须能举反例
      if (entry.replace(/\\/g, '/').endsWith('platform/assetUrl.ts')) continue

      const code = stripComments(readFileSync(file, 'utf-8'))
      for (const [, hit] of code.matchAll(/['"`](\/(?:audio|icons)\/[^'"`]*)['"`]/g)) {
        offenders.push(`${entry}: ${hit}`)
      }
    }

    expect(
      offenders,
      '这些路径在 GitHub Pages 的子路径下会 404，且只在线上错。改用 assetUrl()',
    ).toEqual([])
  })
})

/**
 * @file 静态资源 URL —— `public/` 下的文件该怎么引用
 * @layer platform  浏览器 API 封装
 * @see vite.config.ts  `BASE` 的定义与为什么是子路径
 * @see src/platform/speechClips.ts  语音片段
 * @see src/platform/audio.ts        音效
 *
 * ## ⭐⭐ 这个文件存在的唯一理由：一个已经上线过一次的 bug
 *
 * GitHub Pages 把站点部署在 **`/Sen.SmartLearning/`** 子路径下。
 * 代码里写 `fetch('/audio/voice/num.9.mp3')` 看起来天经地义，实际请求的却是
 * `https://senxiaoxing.github.io/audio/voice/num.9.mp3` —— 域名根，404。
 *
 * 更阴的是它**在开发机上完全正常**：Vite 的 dev server 会同时在根路径伺服
 * `public/`，所以本地怎么测都是对的。上线之后：
 *
 * ```
 * 语音片段全部 404 → 每一句降级为 Web Speech → iPad 男声、手机女声，机械音
 * 音效全部 404     → 「叮」和答错的提示音一声都没有
 * ```
 *
 * 而这两条都不会报错、不会白屏，只是「声音怪怪的」——
 * 孩子不会告状，家长以为是 iOS 的毛病。`index.html` 里早就为图标写过同样的警告
 * （`icons/` 用相对路径），音频这两处漏掉了。
 *
 * 所以：**`public/` 下的任何文件都必须经由这里取 URL，不要手写路径。**
 */

/**
 * 拼出 `public/` 下某个文件的 URL。
 *
 * 用 `import.meta.env.BASE_URL` 而不是写死前缀：它由 Vite 在构建时替换成
 * `vite.config.ts` 里的 `base`，dev / preview / 线上三者自动一致。
 * 将来换自定义域名（`base` 改回 `'/'`）时，这里一个字都不用动。
 *
 * @param path - 相对 `public/` 的路径，如 `'audio/voice/num.9.mp3'`。
 *               带不带开头的 `/` 都行，会被规范化——调用方少一个记忆负担
 * @returns 可直接喂给 `fetch` / `<img src>` / Howler 的 URL
 *
 * @example
 * assetUrl('audio/voice/num.9.mp3')    // '/Sen.SmartLearning/audio/voice/num.9.mp3'
 * assetUrl('/audio/sfx/tap.wav')       // '/Sen.SmartLearning/audio/sfx/tap.wav'
 */
export function assetUrl(path: string): string {
  // BASE_URL 一定以 '/' 结尾（Vite 保证），所以这里只需处理 path 那一侧，
  // 否则会拼出 `//audio/...`——在部分 CDN 上是另一个资源
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

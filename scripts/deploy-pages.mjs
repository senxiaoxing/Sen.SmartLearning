/**
 * @file 部署到 GitHub Pages —— 把 dist 推到 gh-pages 分支
 * @see design/04-部署与上机.md §2
 *
 * ## ⚠️ 为什么不用 `gh-pages` 这个包
 *
 * 它在清理旧文件时，会把 glob 展开出来的**每一个路径**都拼进同一条
 * `git rm` 命令行（`lib/git.js` 的 `Git.prototype.rm`）。
 * 本项目光音频就有 1300 多个文件，命令行长度直接撞上 Windows 的 32767 字符上限：
 *
 * ```
 * Error: spawn ENAMETOOLONG   at Git.rm (gh-pages/lib/git.js:146)
 * ```
 *
 * ⭐ 这不是偶发故障，是**文件数涨过某条线之后必然发生**，而且只在 Windows 上撞得到
 * （开发机只有 Windows，见 CLAUDE.md 硬约束第 1 条），所以只能自己来。
 *
 * 换成 git worktree 之后，删除旧文件只需要 `git rm -r -f -- .` 一个 pathspec，
 * 与文件数无关；语音包再翻十倍也不会碰到这条限制。
 *
 * ## 顺带修掉的历史残留
 *
 * `gh-pages` 包的删除步骤用 globby 匹配，而 globby 默认**不匹配点文件**，
 * 于是 gh-pages 分支上一直躺着一个从没被清理过的 `.gitignore`
 * （main 分支的那份，在这里毫无意义）和一个 `public/` 目录。
 * 本脚本的 `git rm -r` 不区分点文件，它们随第一次部署一起消失。
 *
 * 用法：`npm run deploy`（先 build 再跑这里）。单独重推已有产物用 `node scripts/deploy-pages.mjs`。
 */

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REMOTE = 'origin'
const BRANCH = 'gh-pages'
const DIST = 'dist'

/**
 * 产物文件数的下限。
 *
 * ⭐ 这是**防线不是校验**：脚本会先把分支上的文件全删光再放新的，
 * 万一 dist 是空的或只剩残渣，推上去就是一个白屏的线上站点，
 * 而 PWA 还会把那个白屏缓存到孩子的 iPad 上。
 * 正常产物有 1300+ 个文件（含音频），50 这条线只拦「明显不对」的情况。
 */
const MIN_DIST_FILES = 50

/** 跑一条 git 命令，失败即抛。⚠️ 用数组传参不走 shell，路径含空格也安全 */
function git(args, cwd = process.cwd()) {
  const result = spawnSync('git', args, { cwd, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} 失败（退出码 ${result.status}）`)
  }
}

/** 跑一条 git 命令并取回输出（不打印） */
function gitOut(args, cwd = process.cwd()) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf-8' })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} 失败：${result.stderr?.trim()}`)
  }
  return result.stdout.trim()
}

/** 递归数文件，用于产物完整性检查 */
function countFiles(dir) {
  let count = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    count += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1
  }
  return count
}

/**
 * 确认 dist 确实是一次完整构建的产物。
 *
 * `version.json` 由 vite 的 emitVersionManifest 插件写出（见 vite.config.ts），
 * 它同时是「这次构建是什么时候」的唯一事实源——commit message 直接用它，
 * 于是 gh-pages 的历史里每一条都能对上线上的版本号。
 */
function readBuildInfo() {
  if (!existsSync(DIST)) {
    throw new Error(`没有 ${DIST}/ 目录。先跑 npm run build（npm run deploy 会自动跑）`)
  }
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error(`${DIST}/ 里没有 index.html，这不像一次完整构建`)
  }

  const fileCount = countFiles(DIST)
  if (fileCount < MIN_DIST_FILES) {
    throw new Error(
      `${DIST}/ 只有 ${fileCount} 个文件，少于下限 ${MIN_DIST_FILES}。` +
        `疑似构建不完整，已中止——推上去会让线上变成白屏`,
    )
  }

  const { version } = JSON.parse(readFileSync('package.json', 'utf-8'))
  const { builtAt } = JSON.parse(readFileSync(join(DIST, 'version.json'), 'utf-8'))
  return { version, builtAt, fileCount }
}

function assertBranchExists() {
  const heads = gitOut(['ls-remote', '--heads', REMOTE, BRANCH])
  if (heads.length > 0) return

  throw new Error(
    `${REMOTE} 上没有 ${BRANCH} 分支。先手工建一次空分支再来：\n` +
      `  git switch --orphan ${BRANCH}\n` +
      `  git commit --allow-empty -m "init"\n` +
      `  git push -u ${REMOTE} ${BRANCH}\n` +
      `  git switch main`,
  )
}

const build = readBuildInfo()
console.log(`产物：${build.fileCount} 个文件，版本 ${build.version}，构建于 ${build.builtAt}`)

assertBranchExists()
console.log(`拉取 ${REMOTE}/${BRANCH}…`)
git(['fetch', REMOTE, BRANCH])

// ⚠️ 建在系统临时目录而不是项目里：放项目内会被 vite、测试、git 各自看见一遍
const worktree = mkdtempSync(join(tmpdir(), 'sen-gh-pages-'))

try {
  git(['worktree', 'add', '--detach', worktree, `${REMOTE}/${BRANCH}`])

  /**
   * ⭐ 整条方案的关键就是这一行：pathspec 只有一个 `.`。
   *
   * `gh-pages` 包在这里传的是展开后的完整文件列表，1300 多个路径拼成一条命令，
   * 于是在 Windows 上必然 ENAMETOOLONG。交给 git 自己去递归，长度就与文件数无关了。
   *
   * `--ignore-unmatch` 是给空分支留的（首次部署时分支里没有文件）。
   */
  console.log('清空分支上的旧文件…')
  git(['rm', '-r', '-f', '-q', '--ignore-unmatch', '--', '.'], worktree)

  console.log('复制产物…')
  // ⚠️ 必须连点文件一起复制：dist/.nojekyll 少了的话，GitHub Pages 会用 Jekyll
  // 处理站点，而 Jekyll 会**忽略下划线开头的目录**
  cpSync(DIST, worktree, { recursive: true, force: true })

  git(['add', '-A'], worktree)

  const staged = gitOut(['status', '--porcelain'], worktree)
  if (staged.length === 0) {
    console.log('\n内容与线上完全一致，无需部署。')
  } else {
    const changed = staged.split('\n').length
    console.log(`\n${changed} 个文件有变化，提交并推送…`)
    git(['commit', '-q', '-m', `Deploy ${build.version} (${build.builtAt})`], worktree)
    git(['push', REMOTE, `HEAD:${BRANCH}`], worktree)
    console.log('\n✅ 已上线：https://senxiaoxing.github.io/Sen.SmartLearning/')
    console.log('   iPad 上要等 Service Worker 更新提示，或杀掉 App 再开一次。')
  }
} finally {
  // ⚠️ 失败路径也要清：留下的 worktree 会让下次 `git worktree add` 报「已存在」
  spawnSync('git', ['worktree', 'remove', worktree, '--force'], { stdio: 'ignore' })
  rmSync(worktree, { recursive: true, force: true })
}

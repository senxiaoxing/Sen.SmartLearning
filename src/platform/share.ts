/**
 * @file 文件保存与选取 —— 把备份交给 iOS，以及从 iOS 拿回来
 * @layer platform  浏览器 API 封装，不含任何业务逻辑
 * @see design/02-数据库Schema.md §4.2 导出实现（iOS 友好）
 *
 * ⚠️ **两个函数都必须在用户手势（click）里调用**，且调用前不要 await 长耗时操作。
 * iOS Safari 只在「短暂用户激活」窗口内允许调起分享面板和文件选择器，
 * 中间插一次 IndexedDB 查询就可能超时，表现为点了按钮什么都没发生。
 * 正确做法：进页面时就把备份内容准备好，点击时只负责递出去。
 */

/** 备份文件的 MIME 类型 */
const JSON_MIME = 'application/json'

/** 保存结果，UI 据此给出不同的后续提示 */
export type SaveOutcome =
  /** 走了 iOS 分享面板（可 AirDrop / 存 iCloud / 发微信） */
  | 'shared'
  /** 走了浏览器下载（文件进「文件」App 的下载目录） */
  | 'downloaded'
  /** 用户在分享面板上取消了 —— ⚠️ 这不算成功，不能更新 lastExportAt */
  | 'cancelled'

/**
 * 保存或分享一段 JSON 文本。
 *
 * 优先 Web Share API：它直接调起 iOS 分享面板，家长可以 AirDrop 到新 iPad、
 * 存进 iCloud Drive 或发给自己——换设备时这是最顺的一条路。
 * 不支持时降级为普通下载，iOS Safari 会把文件存进「文件」App。
 *
 * @param fileName - 含扩展名的文件名，见 `data/backup/buildBackup.ts` 的 `backupFileName`
 * @param json - 文件内容
 * @returns 实际走了哪条路。⚠️ `'cancelled'` 表示家长取消了，调用方**不应**当作成功
 *
 * @example
 * const outcome = await saveJsonFile('希恩爱学习_小恩宝_2026-08-06.json', json)
 * if (outcome !== 'cancelled') await markExported()
 */
export async function saveJsonFile(fileName: string, json: string): Promise<SaveOutcome> {
  const blob = new Blob([json], { type: JSON_MIME })

  const file = new File([blob], fileName, { type: JSON_MIME })
  if (navigator.canShare?.({ files: [file] }) === true) {
    try {
      await navigator.share({ files: [file], title: '学习进度备份' })
      return 'shared'
    } catch (error) {
      // 用户点「取消」时 iOS 抛 AbortError。这是正常操作而非故障，
      // 但也**不是成功**——若当成成功更新了备份时间，家长会以为存好了，
      // 而实际上什么都没保存，这正是备份功能最不能出的错。
      if (isAbort(error)) return 'cancelled'
      // 其他失败（如 iPadOS 偶发的 NotAllowedError）继续走下载兜底
    }
  }

  downloadBlob(blob, fileName)
  return 'downloaded'
}

/** 分享面板被用户取消，而非真的出错 */
function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * 触发浏览器下载。
 *
 * 用完立刻 `revokeObjectURL`：备份文件可能有十几 MB，
 * 不释放的话每点一次导出就在内存里留一份，多点几次页面就卡了。
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // 立即撤销会让部分浏览器来不及开始下载，推迟到下一轮事件循环
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * 弹出系统文件选择器，读取用户选中的 JSON 文本。
 *
 * @returns 文件内容；用户没选文件则为 `null`
 *
 * @throws 文件读取失败时抛错（文件被删除、权限问题等）
 *
 * @example
 * const text = await pickJsonFile()
 * if (text === null) return          // 家长取消了，静默返回
 * const verdict = validateBackup(JSON.parse(text), SCHEMA_VERSION)
 */
export async function pickJsonFile(): Promise<string | null> {
  const input = document.createElement('input')
  input.type = 'file'
  // 同时给 MIME 和扩展名：iOS 的「文件」App 对 JSON 的 MIME 识别并不稳定，
  // 只写 application/json 会让备份文件显示为灰色不可选。
  input.accept = `${JSON_MIME},.json`
  input.style.display = 'none'
  document.body.append(input)

  try {
    const file = await pickOne(input)
    return file === null ? null : await file.text()
  } finally {
    input.remove()
  }
}

/**
 * 等待用户选完文件。
 *
 * ⚠️ 取消选择时 iOS Safari **不会**触发任何事件，因此这里额外监听
 * `window.focus`：页面重新拿到焦点却仍然没有文件，就当作取消。
 * 少了这一步，家长点了取消之后界面会永远停在「读取中」。
 */
function pickOne(input: HTMLInputElement): Promise<File | null> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (file: File | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('focus', onFocus)
      resolve(file)
    }

    const onFocus = () => {
      // 选择器关闭到 change 事件派发之间有几十毫秒的间隙，等一等再判定取消
      setTimeout(() => finish(input.files?.[0] ?? null), 500)
    }

    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true })
    window.addEventListener('focus', onFocus)
    input.click()
  })
}

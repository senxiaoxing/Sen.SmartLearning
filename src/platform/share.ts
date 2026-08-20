/**
 * @file 文件保存 —— 把备份交给 iOS
 * @layer platform  浏览器 API 封装，不含任何业务逻辑
 * @see design/02-数据库Schema.md §4.2 导出实现（iOS 友好）
 *
 * ⚠️ **必须在用户手势（click）里调用**，且调用前不要 await 长耗时操作。
 * iOS Safari 只在「短暂用户激活」窗口内允许调起分享面板，
 * 中间插一次 IndexedDB 查询就可能超时，表现为点了按钮什么都没发生。
 * 正确做法：进页面时就把备份内容准备好，点击时只负责递出去。
 *
 * 反方向（选文件读回来）不在这里，原因见文件末尾。
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
 * ⛔ 这里**刻意没有** `pickJsonFile()`。
 *
 * 曾经有过：临时插一个 `<input type="file">`，再靠监听 `window.focus`
 * 猜「家长是不是取消了」。那个猜测在 iPad 上是错的——文件选择器是浮动面板，
 * 宿主页面并不真正失去焦点，面板弹出的瞬间 window 就可能收到 focus，
 * 于是代码判定「取消」、退回初始态、注销 change 监听，
 * 家长随后真的选中的文件再也没人接。**恢复功能因此静默失效。**
 *
 * 选文件必须由持有 `<input>` 的 React 组件自己做，只认 `change` 事件，
 * 取消则什么都不做。见 `features/parent/RestoreBackup.tsx` 的说明。
 */

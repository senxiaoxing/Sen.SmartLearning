/**
 * @file 皮肤偏好 —— 读写并应用到 <html data-skin>
 * @layer platform  浏览器 API 封装，不含业务逻辑
 * @see src/styles/tokens.css  两套皮肤的实际配色
 *
 * 皮肤不进 Dexie，只走 localStorage：它是**设备偏好**而不是学习数据，
 * 不该被导出到备份文件里，换了 iPad 也不该被恢复过来。
 */

export type SkinId = 'jelly' | 'star' | 'meadow'

/**
 * ⚠️ 必须与 index.html `<head>` 里那段内联脚本使用的 key 保持一致。
 * 那段脚本负责在首帧之前打上 data-skin —— 少了它，选了星际皮肤的用户
 * 每次冷启动都会先看到一帧奶油色闪光，在深色皮肤下尤其刺眼。
 */
const STORAGE_KEY = 'sen.skin'

interface SkinMeta {
  id: SkinId
  /** 家长区切换器上显示的名字 */
  label: string
  /** 一句话说明，帮家长判断给孩子选哪套 */
  hint: string
  /** PWA 状态栏色。⚠️ iOS 只在启动时读，切换后要下次冷启动才生效 */
  themeColor: string
  /**
   * 切换器上的预览色：[底色, 主色, 答对色]。
   * ⚠️ 这里必须写死十六进制，不能引用 CSS 变量——切换器要**同屏**展示两套皮肤，
   * 而变量在任一时刻只解析出当前那一套的值。
   */
  swatch: readonly [string, string, string]
}

export const SKINS: readonly SkinMeta[] = [
  {
    id: 'jelly',
    label: '果冻岛',
    hint: '暖奶油底，明亮活泼',
    themeColor: '#FFF3E2',
    swatch: ['#FFF3E2', '#FF9330', '#23C9A0'],
  },
  {
    id: 'star',
    label: '星际学院',
    hint: '深色夜空，暗处不刺眼，看起来更「大孩子」',
    themeColor: '#131A2E',
    swatch: ['#131A2E', '#FFC94A', '#3DDCFF'],
  },
  {
    id: 'meadow',
    label: '清晨草地',
    hint: '淡绿配奶油，最清淡的一套，长时间做题不累眼',
    themeColor: '#F0F6EA',
    swatch: ['#F0F6EA', '#3B7F62', '#3E9B72'],
  },
]

const DEFAULT_SKIN: SkinId = 'jelly'

function isSkinId(value: string | null): value is SkinId {
  return SKINS.some((s) => s.id === value)
}

/**
 * 读取当前皮肤。存储损坏或首次使用时回落到果冻岛。
 *
 * @returns 当前皮肤 id
 *
 * @example
 * const skin = currentSkin() // 'jelly'
 */
export function currentSkin(): SkinId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return isSkinId(saved) ? saved : DEFAULT_SKIN
  } catch {
    // 隐私模式下 localStorage 会抛异常。皮肤读不到不该让 App 起不来
    return DEFAULT_SKIN
  }
}

/**
 * 应用皮肤并持久化。整站配色由 `<html data-skin>` 一个属性驱动，
 * 不需要重新渲染任何 React 组件。
 *
 * @param skin - 目标皮肤 id
 *
 * @example
 * applySkin('star') // 立即变成深色夜空，并记住选择
 */
export function applySkin(skin: SkinId): void {
  document.documentElement.dataset.skin = skin

  const meta = SKINS.find((s) => s.id === skin)
  if (meta !== undefined) {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', meta.themeColor)
  }

  try {
    localStorage.setItem(STORAGE_KEY, skin)
  } catch {
    // 存不下就只在本次会话生效，不打断使用
  }
}

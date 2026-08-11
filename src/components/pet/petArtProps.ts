/**
 * @file 三只宠物形象组件的共用入参契约
 * @layer components
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 单独成文件是因为 PenguinArt / DragonArt / PandaArt 三方都要它，
 * 放进任何一方都会让另外两个反向依赖它。
 */

/**
 * 细节层级。容器越小能留的细节越少——48px 下腹甲纹路、竹节、镜片反光
 * 只会糊成几团脏点，去掉反而更清楚。
 *
 * 由 `PetAvatar` 从 size 推导，通过 `lod1` / `lod2` / `lod3` 类名
 * 交给 CSS 控制 `.d-fine` 与 `.d-mid` 的显隐。
 */
export type ArtLod = 1 | 2 | 3

export interface PetArtProps {
  /** 0 蛋 / 1 破壳 / 2–5 完整体。形体本身随它变（火焰大小、翅膀有无） */
  stageIndex: number
  /** 配饰 kind 集合，取自 `PetStageAppearance.accessories` */
  accessories: ReadonlySet<string>
  lod: ArtLod
  /** 列表里关掉省性能；宠物页与小结页开启 */
  animated: boolean
  /**
   * 睡眠态：科目内容还没做好时用。
   *
   * ⚠️ 表现为闭眼 + 呼吸放慢 + 飘 z，**绝不做灰度或半透明**——
   * 那读起来是「生病 / 失效」，而实际原因是 App 还没做完，
   * 不该让孩子觉得是自己没养好。见 CLAUDE.md 产品红线。
   */
  asleep: boolean
}

/**
 * 配饰组件的入参。
 *
 * `layer` 是这套形象的核心：披风、围巾后圈、翅膀、斗篷都画在**身体之前**，
 * 靠身体自己遮掉中段，只在轮廓两侧留下边缘——「绕过去了 / 披在背后」
 * 全靠这个遮挡关系，整块都画出来就只是贴了张贴纸。
 */
export interface PetGearProps {
  /** under = 身体之前（被身体遮住中段）；over = 身体之后（完整可见） */
  layer: 'under' | 'over'
  accessories: ReadonlySet<string>
  animated: boolean
}

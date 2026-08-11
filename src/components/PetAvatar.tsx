/**
 * @file 宠物形象入口 —— 按科目选角色、按尺寸定细节层级
 * @layer components  纯渲染
 * @see design/06-宠物系统.md §6 形象方向
 * @see src/data/seed/pets.ts 形态与配饰定义
 *
 * 三只的形体各自在 `components/pet/*Art.tsx` 里，这里只做调度。
 * 换美术（换成位图、换成别的画法）只需改这一层与三个 Art 组件，
 * 成长逻辑 `domain/pet/growth.ts` 完全不受影响。
 */

import { motion } from 'framer-motion'
import { DragonArt } from '@/components/pet/DragonArt'
import { PandaArt } from '@/components/pet/PandaArt'
import { PenguinArt } from '@/components/pet/PenguinArt'
import type { ArtLod } from '@/components/pet/petArtProps'
import type { PetDefinition } from '@/data/seed/pets'
import type { Subject } from '@/domain/types'
import '@/components/pet/petArt.css'

interface PetAvatarProps {
  def: PetDefinition
  /** 第几个形态，来自 `levelProgress(exp).stage` */
  stageIndex: number
  size?: 'sm' | 'md' | 'lg'
  /** 是否播放待机动画。宠物页开启，列表里关掉省性能 */
  animated?: boolean
  /** 睡眠态：科目内容还没做好时用，明确表示「不是你没养好」 */
  asleep?: boolean
  /**
   * 过节态：右上角挂一个蛋糕。目前只在孩子生日当天用。
   *
   * 做成叠加的贴纸而不是改三个 Art 组件里的 SVG：一年只出现一天，
   * 不值得让形象层多背一个状态；而且以后要加别的节日也只换这一个 emoji。
   */
  festive?: boolean
}

/** 过节态挂的东西。⚠️ 只在真的值得庆祝时出现，否则它会迅速贬值 */
const FESTIVE_BADGE = '🎂'

const BASE_SIZE = { sm: 48, md: 88, lg: 140 }

/**
 * 尺寸到细节层级的映射。
 *
 * 48px 的列表头像与 140px 的宠物页主图不该画同样多的东西——
 * 小尺寸下的细线只会变成脏点，反而降低辨识度。
 */
const LOD_BY_SIZE: Record<'sm' | 'md' | 'lg', ArtLod> = { sm: 1, md: 2, lg: 3 }

const ART_BY_SUBJECT = {
  math: PenguinArt,
  pinyin: DragonArt,
  english: PandaArt,
} as const satisfies Record<Subject, unknown>

/**
 * 渲染一只宠物。
 *
 * @param def - 宠物定义，决定画哪一只
 * @param stageIndex - 形态序号 0–5
 * @param asleep - 睡眠态。⚠️ 表现为闭眼＋慢呼吸＋飘 z，**绝不做灰度**——
 *                 灰掉读起来是「生病」，而实际是课程还没做好
 *
 * @example
 * <PetAvatar def={penguinG1} stageIndex={4} size="lg" animated />
 */
export function PetAvatar({
  def,
  stageIndex,
  size = 'md',
  animated = true,
  asleep = false,
  festive = false,
}: PetAvatarProps) {
  const base = BASE_SIZE[size]
  const stage = def.stages[stageIndex]
  if (stage === undefined) return null

  const Art = ART_BY_SUBJECT[def.subject]
  const accessories = new Set(stage.accessories.map((a) => a.kind))
  // 形态越高整体越大，成长在尺寸上也看得见
  const box = base * 1.4 * stage.scale

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: box, height: box }}
      role="img"
      aria-label={asleep ? `${def.defaultName}还在睡觉` : stage.label}
    >
      <motion.div
        // 只用 scale（GPU 合成属性），保证 iPad 上不掉帧
        initial={false}
        animate={{ scale: 1 }}
        className="h-full w-full"
      >
        <Art
          stageIndex={stageIndex}
          accessories={accessories}
          lod={LOD_BY_SIZE[size]}
          animated={animated}
          asleep={asleep}
        />
      </motion.div>

      {festive && (
        // 只动 scale / rotate（GPU 合成属性），不碰布局属性 —— CLAUDE.md 性能红线
        <motion.span
          aria-hidden
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.2 }}
          className="pointer-events-none absolute -right-1 -top-1 text-2xl"
        >
          {FESTIVE_BADGE}
        </motion.span>
      )}
    </div>
  )
}

interface PetLevelBarProps {
  level: number
  ratio: number
  isMax: boolean
  color: string
}

/**
 * 等级进度条。
 *
 * 显示「离下一级还有多远」而不是累计经验总数——
 * 孩子关心的是「还差多少就能变身」，不是自己攒了多少分。
 */
export function PetLevelBar({ level, ratio, isMax, color }: PetLevelBarProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <span
        className="shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        Lv{level}
      </span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink/10">
        {/*
          ⚠️ 用 scaleX 而不是动画 width：动 width 触发 layout，必掉帧
          （CLAUDE.md 性能红线）。这条在小结页升级时和宠物形象一起动，
          正是最不能掉帧的一刻。
          内部条不加圆角 —— 外层 overflow-hidden 已裁出左端半圆，
          再加圆角会被 scaleX 拉成椭圆。
        */}
        <motion.div
          className="h-full w-full origin-left"
          style={{ backgroundColor: color }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isMax ? 1 : ratio }}
          transition={{ type: 'spring', stiffness: 180, damping: 26 }}
        />
      </div>
    </div>
  )
}

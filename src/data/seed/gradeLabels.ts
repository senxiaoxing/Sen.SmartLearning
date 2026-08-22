/**
 * @file 年级的显示信息 —— 数字徽记与中文名
 * @layer data  静态内容
 * @see src/components/VolumePicker.tsx  用这两个字段渲染切换条
 *
 * ⭐ **孩子认的是那个数字，不是「三年级」三个字**。
 *
 * 1️⃣~6️⃣ 这套图她在识字第一辑第二组就学过，数学题和首页也天天见；
 * 而识字墙、诗单的分辑切换用的正是同一套徽记 + 同一个 `VolumePicker`。
 * 她在那两处学会的「按数字换一批」这个动作，到这里要能原样再用一次。
 */

import type { GradeLevel } from '@/domain/types'

/** ⭐ 孩子真正认的东西 */
export const GRADE_BADGE: Record<GradeLevel, string> = {
  G1: '1️⃣',
  G2: '2️⃣',
  G3: '3️⃣',
  G4: '4️⃣',
  G5: '5️⃣',
  G6: '6️⃣',
}

/** 年级中文名，给家长看，也进读屏文本 */
export const GRADE_NAME: Record<GradeLevel, string> = {
  G1: '一年级',
  G2: '二年级',
  G3: '三年级',
  G4: '四年级',
  G5: '五年级',
  G6: '六年级',
}

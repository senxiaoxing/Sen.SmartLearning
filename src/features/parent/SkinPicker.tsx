/**
 * @file 皮肤切换 —— 家长区里的界面外观选择
 * @layer features
 * @see src/platform/skin.ts     皮肤的读写与应用
 * @see src/styles/tokens.css    两套皮肤的实际配色
 *
 * ## 为什么放在家长区而不是孩子界面
 *
 * 先在这里验证。孩子那句「像幼儿园小朋友做的题目」是流失前兆
 * （design/05-孩子反馈与响应.md），星际皮肤正是对它的回答——
 * 但到底是不是这个问题，得看她换上之后还愿不愿意继续用。
 *
 * 换皮肤**不影响任何学习数据**，不写进 Dexie，也不进备份文件：
 * 它是设备偏好，换台 iPad 不该被恢复过来。
 */

import { useState } from 'react'
import { applySkin, currentSkin, SKINS, type SkinId } from '@/platform/skin'

export function SkinPicker() {
  const [skin, setSkin] = useState<SkinId>(currentSkin)

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold">界面外观</h2>
        <p className="text-sm text-ink/50">立即生效，不影响学习进度</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {SKINS.map((meta) => {
          const active = meta.id === skin
          return (
            <button
              key={meta.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                applySkin(meta.id)
                setSkin(meta.id)
              }}
              className={[
                'flex flex-1 items-center gap-3 rounded-blob p-4 text-left transition-opacity',
                active ? 'bg-surface shadow-card' : 'bg-surface/50 opacity-70',
              ].join(' ')}
            >
              {/* 三个色块给的是「这套皮肤长什么样」的直观预览，
                  比任何文字描述都快 */}
              <span className="flex shrink-0 overflow-hidden rounded-full border border-ink/10">
                {meta.swatch.map((color) => (
                  <span
                    key={color}
                    className="h-9 w-4"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                ))}
              </span>

              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2 font-bold">
                  {meta.label}
                  {active && <span className="text-sm font-normal text-ink/40">使用中</span>}
                </span>
                <span className="text-sm leading-snug text-ink/50">{meta.hint}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

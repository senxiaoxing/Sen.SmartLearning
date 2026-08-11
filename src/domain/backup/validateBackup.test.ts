/**
 * @file 备份校验与校验和的单测
 * @layer domain
 * @see design/02-数据库Schema.md §4.3 导入策略
 *
 * 这些用例守的是导入的**闸门**：什么必须拒绝、什么只该警告。
 * 拒绝得太松会覆盖掉孩子的进度，拒绝得太严会把她唯一的备份挡在门外，
 * 两个方向的代价都很高。
 */

import { describe, expect, it } from 'vitest'
import { checksumMatches, checksumOf } from '@/domain/backup/checksum'
import { applyBackupMigrations, BACKUP_MIGRATIONS } from '@/domain/backup/migrateBackup'
import { validateBackup } from '@/domain/backup/validateBackup'
import type { BackupFile, IsoDateTime, Profile, Settings } from '@/domain/types'

const CURRENT_VERSION = 3

function makeBackup(overrides: Partial<BackupFile> = {}): BackupFile {
  const now = '2026-08-06T02:00:00.000Z' as IsoDateTime
  const profile: Profile = {
    id: 'profile-1',
    name: '小豆',
    avatarId: 'default',
    grade: '1A',
    createdAt: now,
    updatedAt: now,
  }
  const settings: Settings = {
    profileId: 'profile-1',
    dailySessionLimit: 3,
    sessionDurationMin: 15,
    breakDurationMin: 5,
    bgmEnabled: false,
    bgmVolume: 0.4,
    sfxEnabled: true,
    sfxVolume: 0.8,
    ttsRate: 0.85,
    subjectsEnabled: ['math'],
    dailyTargetItems: 20,
    autoReadStem: true,
    reducedMotion: false,
    updatedAt: now,
  }
  const data: BackupFile['data'] = {
    attempts: [],
    mastery: [],
    sessions: [],
    dailyTasks: [],
    petState: [],
    ledger: [],
    collections: [],
    achievements: [],
    assessments: [],
  }

  return {
    format: 'smartlearning-backup',
    schemaVersion: CURRENT_VERSION,
    appVersion: '0.1.0',
    contentVersion: 1,
    exportedAt: now,
    installId: 'install-1',
    profile,
    settings,
    data,
    stats: {
      totalAttempts: 0,
      masteredCount: 0,
      profileName: '小豆',
      petNames: ['圆圆'],
    },
    checksum: checksumOf(data),
    ...overrides,
  }
}

describe('checksumOf', () => {
  it('同样输入得到同样输出', () => {
    expect(checksumOf({ a: 1, b: [2, 3] })).toBe(checksumOf({ a: 1, b: [2, 3] }))
  })

  it('内容变了校验和就变', () => {
    expect(checksumOf({ a: 1 })).not.toBe(checksumOf({ a: 2 }))
  })

  it('带算法前缀，将来换算法时能分辨老文件', () => {
    expect(checksumOf({})).toMatch(/^fnv1a32:[0-9a-f]{8}$/)
  })

  it('中文内容也稳定', () => {
    const payload = { name: '数学小企鹅', note: '凑十法' }
    expect(checksumOf(payload)).toBe(checksumOf(JSON.parse(JSON.stringify(payload))))
  })

  it('checksumMatches 对未知算法前缀返回 false 而不抛错', () => {
    expect(checksumMatches({ a: 1 }, 'sha256:deadbeef')).toBe(false)
  })
})

describe('validateBackup 拒绝的情况', () => {
  it('不是对象', () => {
    const verdict = validateBackup('随便一段文字', CURRENT_VERSION)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('not_an_object')
  })

  it('数组也不行', () => {
    const verdict = validateBackup([1, 2, 3], CURRENT_VERSION)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('not_an_object')
  })

  it('别的 App 的 JSON', () => {
    const verdict = validateBackup({ format: 'something-else' }, CURRENT_VERSION)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('wrong_format')
  })

  it('⭐ 版本高于当前一律拒绝 —— 降级导入会永久丢字段', () => {
    const verdict = validateBackup(makeBackup({ schemaVersion: 99 }), CURRENT_VERSION)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.reason).toBe('schema_too_new')
      expect(verdict.message).toContain('更新')
    }
  })

  it('缺少数据表', () => {
    const backup = makeBackup()
    const broken = { ...backup, data: { ...backup.data, mastery: undefined } }
    const verdict = validateBackup(broken, CURRENT_VERSION)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.reason).toBe('malformed')
      expect(verdict.message).toContain('mastery')
    }
  })

  it('缺少档案', () => {
    const verdict = validateBackup(makeBackup({ profile: undefined }), CURRENT_VERSION)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('malformed')
  })

  it('拒绝理由是给家长看的中文，不是英文错误码', () => {
    const verdict = validateBackup({ format: 'nope' }, CURRENT_VERSION)
    if (!verdict.ok) expect(verdict.message).toMatch(/[一-龥]/)
  })
})

describe('validateBackup 接受的情况', () => {
  it('版本一致且校验和正确', () => {
    const verdict = validateBackup(makeBackup(), CURRENT_VERSION)
    expect(verdict.ok).toBe(true)
    if (verdict.ok) {
      expect(verdict.checksumMatched).toBe(true)
      expect(verdict.migratedFrom).toBeUndefined()
    }
  })

  it('⭐ 校验和不匹配只警告不拒绝 —— 孩子可能只有这一份备份', () => {
    const verdict = validateBackup(makeBackup({ checksum: 'fnv1a32:00000000' }), CURRENT_VERSION)
    expect(verdict.ok, '仍然可导入，由 UI 让家长确认').toBe(true)
    if (verdict.ok) expect(verdict.checksumMatched).toBe(false)
  })

  it('校验和字段缺失同样只警告', () => {
    const verdict = validateBackup(makeBackup({ checksum: undefined }), CURRENT_VERSION)
    expect(verdict.ok).toBe(true)
    if (verdict.ok) expect(verdict.checksumMatched).toBe(false)
  })

  it('经过 JSON 序列化往返后校验和依然匹配', () => {
    const text = JSON.stringify(makeBackup())
    const verdict = validateBackup(JSON.parse(text), CURRENT_VERSION)
    expect(verdict.ok).toBe(true)
    if (verdict.ok) expect(verdict.checksumMatched).toBe(true)
  })
})

describe('备份迁移', () => {
  it('迁移表现在是空的 —— 备份功能在 v3 才上线，不存在 v1/v2 的备份文件', () => {
    expect(Object.keys(BACKUP_MIGRATIONS)).toHaveLength(0)
  })

  it('已是目标版本时原样返回', () => {
    const backup = makeBackup()
    expect(applyBackupMigrations(backup, CURRENT_VERSION)).toBe(backup)
  })

  it('⭐ 缺少迁移链时抛错，绝不静默跳过', () => {
    // 静默跳过意味着把缺字段的记录写进库，之后表现为难以定位的怪异故障
    expect(() => applyBackupMigrations(makeBackup({ schemaVersion: 1 }), CURRENT_VERSION)).toThrow(
      /缺少备份迁移/,
    )
  })

  it('低版本备份走到 validateBackup 会被迁移链拦下并给出说明', () => {
    const verdict = validateBackup(makeBackup({ schemaVersion: 1 }), CURRENT_VERSION)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('malformed')
  })
})

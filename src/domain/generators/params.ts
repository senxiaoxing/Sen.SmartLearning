/**
 * @file 生成器参数的类型安全读取 —— 把 `Record<string, unknown>` 转成可用的值
 * @layer domain  纯函数
 * @see design/02-数据库Schema.md §3.6 ItemTemplate.params
 *
 * `ItemTemplate.params` 存在 IndexedDB 里，取出来是 `unknown`。
 * 若每个生成器各自写 `params.x as number`，一处配错就会静默产出荒谬的题目
 * （如「-3 + 999」），而这类错误在 UI 上看起来只是「题目怪怪的」，极难定位。
 * 本文件让参数缺失或类型不符时**立刻抛错**，问题暴露在开发期而不是孩子面前。
 */

/**
 * 读取数值参数。
 *
 * @param params - 生成器参数对象
 * @param key - 参数名
 * @param fallback - 缺失时的默认值。不传则视为必填
 * @throws 参数存在但不是有限数值时抛错
 *
 * @example
 * readNumber({ addendA: 9 }, 'addendA')        // 9
 * readNumber({}, 'addendA', 9)                 // 9（用默认值）
 * readNumber({}, 'addendA')                    // 抛错：缺少必填参数
 */
export function readNumber(
  params: Record<string, unknown>,
  key: string,
  fallback?: number,
): number {
  const raw = params[key]
  if (raw === undefined) {
    if (fallback === undefined) {
      throw new Error(`生成器参数缺失: ${key}`)
    }
    return fallback
  }
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new Error(`生成器参数 ${key} 应为数值，实际为 ${JSON.stringify(raw)}`)
  }
  return raw
}

/**
 * 读取数值区间参数 `[min, max]`。
 *
 * @throws 不是长度为 2 的数值数组，或 min > max 时抛错
 *
 * @example
 * readRange({ addendBRange: [2, 9] }, 'addendBRange')   // [2, 9]
 */
export function readRange(
  params: Record<string, unknown>,
  key: string,
  fallback?: [number, number],
): [number, number] {
  const raw = params[key]
  if (raw === undefined) {
    if (fallback === undefined) {
      throw new Error(`生成器参数缺失: ${key}`)
    }
    return fallback
  }
  if (
    !Array.isArray(raw) ||
    raw.length !== 2 ||
    typeof raw[0] !== 'number' ||
    typeof raw[1] !== 'number'
  ) {
    throw new Error(`生成器参数 ${key} 应为 [min, max]，实际为 ${JSON.stringify(raw)}`)
  }
  if (raw[0] > raw[1]) {
    throw new Error(`生成器参数 ${key} 的 min(${raw[0]}) 大于 max(${raw[1]})`)
  }
  return [raw[0], raw[1]]
}

/**
 * 读取数值数组参数（如「可选的被加数集合」）。
 *
 * @throws 不是非空数值数组时抛错
 *
 * @example
 * readNumberList({ addends: [9, 8, 7] }, 'addends')   // [9, 8, 7]
 */
export function readNumberList(
  params: Record<string, unknown>,
  key: string,
  fallback?: number[],
): number[] {
  const raw = params[key]
  if (raw === undefined) {
    if (fallback === undefined) {
      throw new Error(`生成器参数缺失: ${key}`)
    }
    return fallback
  }
  if (!Array.isArray(raw) || raw.length === 0 || raw.some((v) => typeof v !== 'number')) {
    throw new Error(`生成器参数 ${key} 应为非空数值数组，实际为 ${JSON.stringify(raw)}`)
  }
  return raw as number[]
}

/**
 * 读取枚举参数，值必须在 `allowed` 之内。
 *
 * @throws 值不在允许集合中时抛错并列出合法取值
 *
 * @example
 * readEnum({ op: 'add' }, 'op', ['add', 'sub', 'mixed'] as const, 'add')   // 'add'
 * readEnum({ op: 'mul' }, 'op', ['add', 'sub'] as const, 'add')            // 抛错
 */
export function readEnum<T extends string>(
  params: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = params[key]
  if (raw === undefined) return fallback
  if (typeof raw !== 'string' || !allowed.includes(raw as T)) {
    throw new Error(
      `生成器参数 ${key} 应为 ${allowed.join(' | ')}，实际为 ${JSON.stringify(raw)}`,
    )
  }
  return raw as T
}

/**
 * 读取布尔参数。
 *
 * @example
 * readBoolean({ allowZero: true }, 'allowZero', false)   // true
 */
export function readBoolean(
  params: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const raw = params[key]
  if (raw === undefined) return fallback
  if (typeof raw !== 'boolean') {
    throw new Error(`生成器参数 ${key} 应为布尔值，实际为 ${JSON.stringify(raw)}`)
  }
  return raw
}

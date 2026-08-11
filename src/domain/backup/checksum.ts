/**
 * @file 备份文件校验和 —— 检测备份是否在传输/存储途中损坏
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §4.1 BackupFile.checksum
 * @see design/02-数据库Schema.md §4.3 校验和不匹配时警告但允许强制继续
 */

/**
 * FNV-1a 32 位的标准初始偏移量。取自算法定义，不是可调参数。
 * @see http://www.isthe.com/chongo/tech/comp/fnv/
 */
const FNV_OFFSET_BASIS = 0x811c9dc5

/** FNV-1a 32 位的标准质数。同样取自算法定义。 */
const FNV_PRIME = 0x01000193

/**
 * 算法标识前缀。写进校验和字符串里，将来换算法时能一眼分辨旧文件用的是哪种，
 * 而不是拿新算法去校验老文件得到「全部损坏」的假警报。
 */
const CHECKSUM_ALGORITHM = 'fnv1a32'

/**
 * 计算备份数据的校验和。
 *
 * **为什么不用设计文档里写的 SHA-256**（这是个有意的偏离，三条理由）：
 *
 * 1. ⭐ `crypto.subtle` **只在安全上下文（HTTPS / localhost）可用**。
 *    本项目日常调试走 `npm run dev -- --host`，iPad 打开的是
 *    `http://192.168.x.x:5173` —— 非安全上下文，`crypto.subtle` 是 `undefined`。
 *    备份恰恰是最需要在真机上反复验证的功能，用一个在验证环境里必然崩溃的 API
 *    是本末倒置。
 * 2. `crypto.subtle.digest` 是异步的，会把这个纯函数染成 `async`，
 *    连带 `validateBackup` 也得变异步，白白污染整条调用链。
 * 3. 用途只是「文件有没有被截断或改坏」，**不是防篡改**——
 *    纯自用 App，备份文件从自己的 iPad 传到自己的 iPad，不存在攻击者。
 *    抗碰撞性在这里没有意义，抗随机损坏才有。
 *
 * @param payload - 待校验的数据（实际传入的是 `BackupFile.data`）
 * @returns 形如 `'fnv1a32:1a2b3c4d'` 的校验和字符串
 *
 * @example
 * checksumOf({ attempts: [], mastery: [] })   // 'fnv1a32:...'
 * checksumOf({ attempts: [], mastery: [] })   // 同样输入必得同样输出
 */
export function checksumOf(payload: unknown): string {
  // JSON.parse 保留原文的键顺序，因此「导出时算」与「导入时重算」得到的
  // 序列化字符串完全一致，往返校验稳定。
  const json = JSON.stringify(payload)

  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i)
    // Math.imul 做 32 位整数乘法。直接用 `*` 会在超过 2^53 时丢精度，
    // 得到的哈希在不同引擎上可能不一致。
    hash = Math.imul(hash, FNV_PRIME)
  }

  // `>>> 0` 转成无符号，否则高位为 1 时 toString(16) 会带负号
  return `${CHECKSUM_ALGORITHM}:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

/**
 * 校验和是否匹配。
 *
 * 算法前缀不同（老备份用了别的算法）时返回 `false` 而非抛错——
 * 调用方会把它当作「可能损坏」提示给用户并允许强制继续，
 * 这比直接拒绝导入更安全：宁可让家长确认一次，也不能因为校验和格式变了
 * 就把孩子唯一的备份挡在门外。
 *
 * @param payload - 待校验的数据
 * @param expected - 备份文件里记录的校验和
 *
 * @example
 * checksumMatches(data, 'fnv1a32:1a2b3c4d')   // true / false
 * checksumMatches(data, 'sha256:...')         // false —— 算法不认识
 */
export function checksumMatches(payload: unknown, expected: string): boolean {
  return checksumOf(payload) === expected
}

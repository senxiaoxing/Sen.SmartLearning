/**
 * @file Vitest 全局设置 —— 在 Node 环境里提供 IndexedDB
 * @layer 测试基础设施
 *
 * Dexie 需要真实的 IndexedDB 才能工作。`fake-indexeddb/auto` 会把
 * 符合规范的内存实现挂到全局，让数据层可以在 Node 里被完整测试，
 * 不必依赖浏览器环境。
 */

import 'fake-indexeddb/auto'

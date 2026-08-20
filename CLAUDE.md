# Sen.SmartLearning — 希恩爱学习 App

给一年级孩子（2026 年 9 月入学）的学习 App。数学 + 汉语拼音 + 英语启蒙，带宠物养成。
**纯自用**，不上架、不分发。

---

## 目录约定

| 目录 | 用途 |
|---|---|
| `docs/` | ⛔ **用户存放提示词的目录，AI 禁止在此创建或修改任何文件**（已 gitignore） |
| `design/` | ✅ 设计文档，生成的文档一律放这里 |
| `src/` | 源码 |

**生成任何文档前，先确认路径不是 `docs/`。**

---

## 设计文档（动手前必读对应章节）

| 文档 | 内容 |
|---|---|
| [design/01-知识点图谱.md](design/01-知识点图谱.md) | 113 个知识点、前置依赖、认知误区（misconception）定义、摸底测评 |
| [design/02-数据库Schema.md](design/02-数据库Schema.md) | 16 张表、掌握度算法、导出导入格式、迁移机制 |
| [design/03-技术方案.md](design/03-技术方案.md) | 架构、目录结构、核心模块契约、PWA 配置、性能规范 |
| [design/04-部署与上机.md](design/04-部署与上机.md) | 部署步骤、iPad 添加到主屏幕、故障排查、当前已知限制 |
| [design/05-孩子反馈与响应.md](design/05-孩子反馈与响应.md) | ⭐ 真实试用反馈与对应调整。**改调度器或轮次前必读** |
| [design/06-宠物系统.md](design/06-宠物系统.md) | 三只科目伙伴的成长曲线、性格设计、美术替换方式 |

---

## 硬约束（决定了所有技术选型，不可推翻）

1. **开发机只有 Windows，没有 Mac** → iOS 原生不可行（Xcode 仅 macOS）
2. **不买 Apple 开发者账号** → 无 TestFlight、无上架
3. **交付形态是 PWA**，iPad/iPhone「添加到主屏幕」全屏运行
4. **纯本地存储，不上云**，无登录、无后端、无账号体系
5. **必须在 iPad 上流畅**（60fps）

> 不要提议改用 React Native / Flutter / Capacitor / 小程序，也不要引入任何需要服务端的方案。
> 这些都已评估并排除过。

---

## 技术栈

```
React 18 + TypeScript 5 + Vite 5
Tailwind CSS · Framer Motion · lottie-web · Zustand · React Router 6
Dexie.js (IndexedDB) · Howler.js · Web Speech API
vite-plugin-pwa · Vitest
```

**不引入**：Redux、Next.js、任何 UI 组件库（MUI/AntD 等）、任何需要服务端的依赖。
新增依赖前先问。

---

## 架构铁律

### 1. 类型先行
动手写功能前，先在 `src/domain/types.ts` 定义类型。类型是契约，没契约结构就会漂。

### 2. `domain/` 必须是纯函数
```
❌ domain/ 下禁止 import React / Dexie / 任何浏览器 API
✅ 只做计算，无副作用，100% 可单测
```
所有核心逻辑（出题调度、掌握度、题目生成、积分、宠物状态）都归 `domain/`。
数据库访问只允许出现在 `data/repositories/`。

### 3. 分层
```
features/ 组件  →  stores/ Zustand  →  domain/ 纯函数
                                    →  data/ 仓储  →  Dexie
                   platform/ 浏览器 API 封装
```

### 4. 随机数必须注入
生成器一律用 `ctx.rng()`，**禁止直接 `Math.random()`**——否则无法写测试。

---

## 目录与文件规范

> 本项目全程 AI 辅助编码。以下规范的唯一目的是：**让 AI 打开任意单个文件就能理解全部上下文，
> 不需要在多个文件间跳转拼凑。** 这直接决定生成代码的质量，请严格执行。

### 目录：扁平 + 职责单一

```
✅ src/ 下最大嵌套 3 层：src/domain/generators/addWithCarry.ts
❌ 超过 3 层一律拒绝：src/features/learning/items/choice/ChoiceImage.tsx
```

**每个目录只承担一种职责**，目录名即职责，看名字就知道里面放什么：

| 目录 | 只放 | 不放 |
|---|---|---|
| `domain/` | 纯函数业务逻辑 | 任何 React / Dexie / 浏览器 API |
| `data/` | Dexie 访问、仓储、seed 数据 | 业务计算 |
| `platform/` | 浏览器 API 封装 | 业务逻辑 |
| `stores/` | Zustand 状态编排 | 业务计算（应调 domain） |
| `features/` | 页面级 UI，按功能分 | 跨功能复用的组件 |
| `components/` | 跨功能复用的 UI 原子 | 任何业务逻辑 |

### 三条禁令

```
⛔ 禁止创建 utils/ helpers/ common/ misc/ 等垃圾桶目录
   任何函数都能找到它真正归属的领域目录。找不到说明职责没想清楚。

⛔ 禁止 barrel file（index.ts 批量 re-export）
   它让 AI 无法定位真实实现文件，也拖慢 Vite 冷启动。
   一律从真实路径 import：
   ✅ import { addWithCarry } from '@/domain/generators/addWithCarry'
   ❌ import { addWithCarry } from '@/domain/generators'
   例外：domain/generators/index.ts 作为生成器注册表（有实际逻辑，非纯 re-export）

⛔ 禁止「万能文件」
   一个文件只有一个主导出（一个组件 / 一个纯函数 / 一个 store）。
```

### 文件规模上限（超出即拆分）

| 类型 | 上限 | 超出时怎么拆 |
|---|---|---|
| React 组件 | **200 行** | 抽子组件到同目录，或把逻辑提到 hook / domain |
| domain 纯函数模块 | **150 行** | 按职责拆成多个文件 |
| Zustand store | **150 行** | 按领域拆分 store |
| 类型定义 | 不限 | — |

行数按**总行数**算（含空行与注释）。

#### 已登记的例外：`stores/sessionStore.ts`

约 440 行，是唯一超标的文件，**不要拆，也不要因为它去调高上表的上限**。

它是全 App 唯一的会话状态机，十来个 action 全部围绕同一条主线
（`idle → active → feedback → finished`），职责单一，不是万能文件。
按「启动 / 进行」拆成两个 store，会让「一次会话从头到尾发生了什么」
散落到多个文件，并引入 store 之间互相写状态的依赖——
那恰恰制造了本规范想消除的「跨文件拼凑」，比一个长文件更糟。

**重新审视的信号不是行数，而是这两条**：

- 出现与会话生命周期无关的职责（那部分该搬走）
- 单个 action 超过 80 行（那个 action 内部该拆）

### 命名

```
domain / data / platform / stores   camelCase 文件名，与主导出同名
                                    selectNextItems.ts → export function selectNextItems
组件                                 PascalCase，与组件同名
                                    ChoiceImage.tsx → export function ChoiceImage
测试                                 与被测文件同名同目录相邻
                                    addWithCarry.ts / addWithCarry.test.ts
```

❌ 禁止 `helper.ts` `utils.ts` `common.ts` `index.ts`(纯导出) `temp.ts` 这类无信息量的文件名。

### ⭐ 文件头注释块（每个文件必须有）

这是让 AI 理解上下文最有效的手段——**打开文件第一眼就知道自己在哪一层、能 import 什么、对应哪份设计文档**：

```ts
/**
 * @file 出题调度器 —— 决定一次学习会话出哪些题、按什么顺序出
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/03-技术方案.md §4.1  配比策略与关键规则
 * @see design/01-知识点图谱.md §1.4  掌握度状态机
 */
```

`@layer` 取值：`domain` | `data` | `platform` | `stores` | `features` | `components`

---

## 注释与 JSDoc 规范

### 核心原则：注释写「**为什么**」，代码写「**是什么**」

```ts
❌ // 设置掌握度分数
   const masteryScore = ...

✅ // EMA 权重 0.3：低于此值对孩子的进步反应太迟钝（要 10 题才看出变化），
   //   高于此值又会因一次手滑答错而大幅回退，打击积极性。实测 0.3 手感最好。
   const ALPHA = 0.3
```

### 魔法数字必须有常量名 + 来源说明

```ts
/** 状态值硬下限。见 design/03-技术方案.md §4.5 宠物红线第 2 条：
 *  宠物状态不得低于此值，且不影响任何学习功能——它只驱动互动欲望，绝不构成惩罚。 */
const PET_STATE_FLOOR = 30
```

### 所有核心业务逻辑必须有完整 JSDoc

**核心业务逻辑 = `domain/` 下全部导出函数 + `data/backup/` + 任何涉及产品红线的代码。**

必备标签：`@param` `@returns` `@example`，涉及业务规则时加 `@see` 指向设计文档。

**标准示例（照这个格式写）：**

```ts
/**
 * 生成一道 20 以内进位加法题（M5.2 「9 加几」）。
 *
 * 干扰项按**认知误区**生成而非随机数——这是本项目自适应能力的核心机制：
 * 孩子选了哪个错误选项，就能定位她卡在凑十法的哪一步，从而给出针对性补救。
 * 退化成随机干扰项等于废掉整个诊断系统。
 *
 * @param ctx - 生成上下文。`ctx.rng` 必须使用注入的随机源，
 *              禁止直接调用 `Math.random()`，否则测试无法固定种子。
 * @returns 含 4 个选项的题目，每个错误选项都带 `misconceptionTag`
 *
 * @example
 * const item = addWithCarry({ difficulty: 2, params: { addendA: 9, addendBRange: [2, 9] }, rng })
 * // 当 a=9, b=5 时：
 * //   14 → 正确
 * //   13 → no_carry     忘记进位（当成 9+4）
 * //   10 → carry_lost   凑十后忘记加剩余的 4
 * //    4 → sub_instead  做成了减法
 *
 * @see design/03-技术方案.md §4.2  干扰项铁律
 * @see design/01-知识点图谱.md §M5  进位加法认知误区清单
 */
export const addWithCarry: Generator = (ctx) => { ... }
```

### 组件的 JSDoc

说明**用途 + 关键交互约束**，尤其是一年级孩子不识字带来的无障碍要求：

```tsx
/**
 * 看图选择题。题干为图片，选项为图片或大字文字。
 *
 * 无障碍约束（一年级孩子不识字，见 CLAUDE.md 代码规范要点）：
 * - 挂载后自动朗读题干，无需用户操作
 * - 每个选项可单独点击朗读
 * - 选项触控区最小 88×88 pt
 *
 * @param item - 题目数据，`item.stem.imageKey` 必填
 * @param onAnswer - 作答回调，参数含选中项与响应耗时（用于掌握度的 quality 推导）
 */
```

### 什么时候**不要**写注释

```
❌ 不要给显而易见的代码加注释（// 循环遍历数组）
❌ 不要写「这里做了 XX 修改」这类过程性注释——那是 git 的职责
❌ 不要保留被注释掉的死代码，直接删
```

---

## 产品红线（AI 最容易"顺手"违反的地方）

### 宠物系统
按**科目 × 年级**划分，12 级 / **6 个形态（每 2 级一变）**。
一年级：语文小飞龙 · 数学小企鹅 · 英语小熊猫。详见 [design/06-宠物系统.md](design/06-宠物系统.md)

```
1. 宠物永远不会死亡、不会掉级、不会因疏于照顾受到任何损害
2. 久未登录 → "我有点想你"   ❌ 绝不是责备或"快饿死了"
3. ⭐ 三只宠物之间绝不比较：不排名、不并列进度、不写"最高级的是…"
4. 未开放科目的宠物显示"还在睡觉，等课程准备好就醒来"，
   ❌ 不能一直停在蛋阶段——那看起来像孩子没养好，实际是 App 还没做完
5. 经验只增不减；等级与形态由 exp 推导，不存冗余的 level 字段
6. ❌ 不做随机奖励（抽卡/开箱）——成长必须确定、努力可预期
7. 升级提示放小结页，不在答题中途弹窗打断学习流
8. 成长曲线两端都要守住：**第二轮就能变身**，且**满级 ≈ 学完一个年级**
   （由 growth.test.ts 用知识点题量实际校验）
```
原因：孩子几天没玩回来看到宠物惨状，产生的是负罪感和回避，不是动力；
而把三只的差距摆上台面，等于惩罚她对某个科目的兴趣。

### 每日任务
```
❌ 绝不设置"全对才有奖励"的任务 —— 会让孩子专挑简单题刷
✅ 奖励过程：订正错题 +1 分，挑战难题 +5 分
```

### 干扰项必须有诊断性 ⭐
```
❌ 随机数干扰项 —— 提供零信息
✅ 按认知误区生成，每个错误选项带 misconceptionTag
```
`9 + 5 = ?` → `14`(正确) / `13`(no_carry) / `10`(carry_lost) / `4`(sub_instead)
选 `13` 说明凑十丢了 1，选 `10` 说明凑十后忘记加——**补救路径完全不同**。
这是整个系统的核心价值，退化成随机干扰项等于废掉了自适应能力。

### 昵称只出现在正向语境 ⭐
App 用孩子的昵称称呼她（默认「小恩宝」，家长区可设多个、随机轮换）。

```
✅ 问候「小恩宝，早上好呀，今天想学点什么？」· 答对「小恩宝，太棒了」
✅ 小结「小恩宝，全部答对」· 宠物见面「小恩宝，我有点想你」
❌ 答错时叫名字 ——「小恩宝，再看看」听起来像点名
❌ 宠物每句台词都喊名字 —— 会从「它记得我」变成「它只会喊我名字」
```
实现：`domain/encourage/`（纯函数）+ `data/seed/nicknamePresets.ts`（有专属语音的昵称）。
昵称**只能从预设里挑**（家长区无自由输入）；旧档案遗留的清单外昵称整句降级为 TTS，
**绝不做「片段 + TTS 混播」**，
也绝不为了保住音色而在语音里省掉名字——见 design/07-音频方案.md §2.5b。

**轮换的粒度是一句话，不是一次会话**：答对逐题换称呼，
但首页标题在这次停留里必须固定（用 `useMemo` 锁住），否则会自己跳字。

### 一次只说一句话 ⭐
同一屏里**绝不能有两个组件各自调 `say()`**。它是打断式的，
React 先跑子组件 effect 再跑父组件，后者必然把前者掐掉。

升级横幅就踩过：「团团变身啦」被小结语打断，从来没被听全过。
现在升级那半句由 `summaryLine(nickname, stats, levelUp)` 拼进同一句话，
横幅纯展示、不发声。**要加新播报就往那句话里拼，不要新开一个 effect。**

### 生日不给奖励
生日当天只换一句问候、给伙伴挂个蛋糕（`domain/encourage/birthdayLine.ts`）。
❌ 不加积分、不送经验、不解锁内容——挂上奖励它就从「今天是你的日子」
变成又一个每日任务，第二年孩子会记得来领。

### 家长留言只留最新一条
`Profile.parentMessage`。攒成收件箱就变成任务列表，
而它的价值恰恰在于「随手写一句」。改了内容自动变回未读。

### 答错反馈要温和
```
✅ 轻微摇动 + 柔和提示音 + "再看看～"
❌ 红叉、刺耳音效、"错误"字样
```

### ⭐ 内容难度绝不能低于孩子的实际水平
孩子实测原话：**「像幼儿园小朋友做的题目」**。
这句话的潜台词不是「给我难一点的」，而是「这个 App 不适合我」——**它是流失前兆**。

```
✅ 新内容从「学习前沿」（已掌握内容里最靠后的）往后开
✅ 巩固题只用最近学会的（confidence 池截断到 5 个）
❌ 按全局教学顺序从图谱最前面开新内容
❌ 用任何远低于当前水平的内容做暖场或巩固
```
相关实现：`domain/scheduler/selectNextItems.ts` 的 `frontier`、`MAX_CONFIDENCE_POOL`；
起点定位见 `domain/assessment/placement.ts`。

### 一轮题量要短
孩子实测反馈「怎么还没做完啊」。**一轮 10 题**（原为 25），
做完问「还要再来一轮吗」——让「完成」频繁发生，而不是一次漫长跋涉。
每日总量靠多轮累计，不靠单轮堆长。

### ⭐ 语文三块是「教」不是「练」
拼音乐园 · 识字 300 · 古诗 20（与字母乐园同类）都是**浏览页**，不是题库。

```
✅ 全部可点（没学到的也能听）· 没有对错判定 · 随时可走
❌ 不出题、不落 attempts、不记 mastery、不给积分、不影响宠物经验
❌ 不要给识字/古诗建知识点 —— 没题库的知识点会在报告里显示成一片永远 0%，
   那看起来像孩子什么都没学会
❌ 不要加收藏星标或「今日 N 字」 —— 没有客观判据时，
   它记录的是「她点过什么」而不是「她认识什么」，会让家长误读
```
拼音墙的高亮圈是例外，因为拼音**有**题库，那是真实作答产出的 mastery。
详见 [design/03-技术方案.md](design/03-技术方案.md) §4.7。

#### 识字加内容：新开一辑，别把墙接长 ⭐
识字是 **3 辑 × 10 组 × 10 字**（`hanziCards.ts`），顶部按钮切换，一次只摆一辑。

```
✅ 加内容 = 追加第四辑，滚动长度永远是 10 组
❌ 接在现有辑后面 —— 新字埋在滚三屏之后，她看到的永远是已经会了的那批
❌ 重排辑或组的顺序 —— 她记的是「小动物在第一辑最后」这种位置
```
加辑要同步改三处数量断言：`hanziCards.test.ts` · `generate-voices.mjs` 的
`EXPECTED_HANZI_COUNT` · design/07 §3.5 的条数，然后 `npm run voices`。

组词是**朗读句式的一部分**（念「天。蓝天的天。」），且多音字全靠它锁读音——
「自行车的行」xíng、「学校的校」xiào、「快乐的乐」lè。换组词前先看那个字有没有别的音。
⛔ 轻声字（的/了/们/子）不进字表：卡片要显示带调拼音，测试会拦。

---

## 代码规范要点

### ID
```ts
用户数据（attempts / mastery / ledger …）  → crypto.randomUUID()
静态内容（知识点 / 题库 / 成就定义）        → 语义 ID：'M5.2'、'P3.3-L2-0007'
⛔ 任何情况下都不使用自增整数主键
```

### 时间
```ts
createdAt: string   // ISO 8601 UTC，用于精确排序
localDate: string   // 'YYYY-MM-DD' 本地时区，用于按天统计，写入时冻结、永不重算
```
只存 UTC 会导致晚上做的题算到第二天。

### 一年级孩子不识字 —— 这条决定整个 UI
```
每道题自动朗读题干，并且可以反复重听
触控目标最小 88×88 pt（不是成人的 44pt）
主要功能不超过 2 层；全程无键盘（宠物起名也是从预录名单里点选，见 PetNamePicker）
```
⛔ **点击选项不朗读**。那一下是提交答案、不是试听，紧接着就响反馈语，
两个声音会叠在一起（iOS 的 `speechSynthesis.cancel()` 拦不干净）。
她既然点得下去就说明看懂了——要听的是题干。见 `items/OptionButton.tsx`。

### 语音要在点击之前就准备好
片段是「fetch + 解码」两步，等按下去才开始，那一下就是「按了没反应」。
`App.tsx` 挂载时即 `prefetchClips(WARMUP_CLIPS)`，字母乐园进页面时预取自己那 26 条。

⚠️ iOS 只禁止无手势的**播放**，`decodeAudioData` 在 suspended 的 AudioContext 上照常工作。
所以「预取」和「解锁」是两件事：前者越早越好，后者必须留在手势里。
❌ 首屏**无法**自动播放问候语——这是 iOS 硬限制，标题做成可点击就是对它的回答。

### 性能
```
✅ 动画只用 transform / opacity（GPU 合成）
❌ 禁止动画 width / height / top / left / margin（触发 layout，必掉帧）
❌ 禁止在渲染路径中做 IndexedDB 查询（预取到 store）
✅ 会话开始前预加载本段全部题目资源
```

### iOS 音频
```
必须在用户手势（首屏「开始学习」按钮的 click）中调用 audio.unlock()
否则后续所有音频静默失败，App 等于报废。
⚠️ iOS Safari 不支持 Vibration API，haptics 做空实现，用音效补偿。
```

### iOS 会在后台关掉 IndexedDB 连接 ⭐
```
Dexie 被动关闭后不会自己重开，之后每次读写都抛 DatabaseClosedError，
直到整页重载 —— 表现是「App 看着好好的，写进去的东西全没了」。
```
`App.tsx` 已通过 `platform/onPageResume.ts` 在回到前台时统一 `ensureOpen()` 兜底。
但**任何跨越「离开 App 再回来」的流程，必须自己先 `await ensureOpen()`**——
兜底跑在 React effect 里，不保证赶在你那次写入之前。
恢复备份就是这样一条路（要去「文件」App 挑文件），见 design/02 §4.3a。

### 积分
余额从 `ledger` 流水推导（取最新一条的 `balanceAfter`），**不设独立可变余额字段**。

---

## 必须写单测的模块

逻辑错了在 iPad 上肉眼看不出来的部分：

- `domain/generators/*` —— 干扰项策略、数值范围、固定种子下输出稳定
- `domain/mastery/*` —— 掌握度公式、状态跃迁、SM-2 间隔
- `domain/scheduler/*` —— 配比、难度调节、防挫败规则
- `data/backup/*` —— ⭐ **导出 → 清空 → 导入 → 完全还原**，数据丢失不可接受

---

## 常用命令

### 日常开发

```powershell
npm run dev -- --host    # 局域网调试，iPad 用 Network 地址实时预览
npm run typecheck        # tsc --noEmit
npm run test             # vitest run
npm run build            # 产出 dist/（含 Service Worker 与 manifest）
npm run preview          # 本地预览生产构建，验证 PWA 是否生效
npm run deploy           # ⭐ 上线：build + gh-pages 推到 gh-pages 分支
```

**部署固定走 GitHub Pages**，没有特别指定时就用它，不要提议换托管：
线上地址 https://senxiaoxing.github.io/Sen.SmartLearning/ ，
`vite.config.ts` 的 `BASE = '/Sen.SmartLearning/'` 必须与仓库名一致。
详见 [design/04-部署与上机.md](design/04-部署与上机.md) §2。

### 资源生成（构建期联网，运行时纯本地）

产物都随包发布，App 跑起来不碰网络。**改了内容表就要重跑对应命令**，
否则表里改了、播出来还是旧的。

```powershell
npm run voices           # 生成语音 mp3 → public/audio/voice/，并重新打包语音包
                         #   改了 voiceManifest.ts / englishWords.ts / pinyinSyllables.ts
                         #   / hanziCards.ts / poems.ts / pets.ts / explainers.ts 后必跑
                         #   只补缺失的，以及「念的文本变了」的那些（有台账）
npm run voices -- --force              # 全部重生成（换音色后必须）
npm run voices -- --voice-en=en-GB-MaisieNeural   # 换英语音色
npm run voices:bundle    # 只重新打包（988 条 mp3 → 10 个 .bin 语音包 + 索引）
                         #   ⭐ 首装靠它从「几百个请求」降到个位数，见 design/07 §2.5d
                         #   npm run build 会自动跑，正常不用手动执行
npm run sfx              # 合成 6 个音效 → public/audio/sfx/
npm run icons            # 重新生成 PWA 图标（改了图标设计后跑）
npm run pinyin:check     # 生成拼音试听页，人工复核发音（机器验不了声调）
npm run pinyin:record    # 生成录音页，补录没有汉字载体的音节
```

> 音色：中文 `zh-CN-XiaoyiNeural`（少女声），英语 `en-US-AnaNeural`（儿童声）。
> 脚本按 `en.` 前缀自动切换——用中文音色念 `apple` 会教错发音。
> 详见 [design/07-音频方案.md](design/07-音频方案.md)。

---

## 协作方式

一次只做一个模块。任务描述里给出：**目标文件路径 + 类型契约位置 + 对应设计文档章节 + 要写的测试**。
不要一次性"把答题功能做完"。

改动完成后自行运行 `typecheck` 和 `test`，失败就修，不要报告未验证的完成。

---

## 提交前自检

**业务正确性**
- [ ] 用户数据用 `crypto.randomUUID()`，无自增 ID
- [ ] 同时写了 `createdAt`(UTC) 和 `localDate`(本地)
- [ ] `attempts` 表只增不改（append-only）
- [ ] 数学生成题写了 `itemSnapshot`
- [ ] 每个错误选项都有 `misconceptionTag`，不是随机数
- [ ] 宠物逻辑无死亡 / 掉阶 / 惩罚
- [ ] 导出文件含 `schemaVersion`，且未导出静态表
- [ ] 动画没有用 width/height/top/left

**结构与可读性**
- [ ] `src/` 下嵌套未超过 3 层
- [ ] 没有 `utils/` `helpers/` `common/` 目录，没有纯 re-export 的 `index.ts`
- [ ] 一个文件只有一个主导出；组件 ≤200 行、domain 模块 ≤150 行
- [ ] 文件名与主导出同名，无 `helper.ts` 之类无信息量命名
- [ ] 每个文件都有 `@file` + `@layer` 头注释块
- [ ] `domain/` 下没有 import React / Dexie / 浏览器 API
- [ ] `domain/` 所有导出函数有完整 JSDoc（含 `@example`）
- [ ] 魔法数字都提取为具名常量并注释了取值来源
- [ ] 注释解释的是「为什么」，没有 `// 设置 xxx` 这类废话注释
- [ ] 无被注释掉的死代码

**环境**
- [ ] 没有在 `docs/` 下创建文件
- [ ] `npm run typecheck` 与 `npm run test` 均通过

/**
 * Tailwind 配置 —— 全部视觉值都指向 src/styles/tokens.css 里的变量。
 *
 * ⚠️ 这里**不允许写死任何颜色**。写死一个色，皮肤切换就在那个位置漏一块。
 *    色名是语义化的（primary / correct / alert），不是描述性的（honey / mint / coral）——
 *    因为 `mint`（薄荷绿）在星际皮肤下其实是霓虹青，描述性色名会骗人。
 *
 * @see src/styles/tokens.css  变量定义与「为什么存裸通道值」
 */

/** 颜色 token 转 Tailwind 色值。
 *  `<alpha-value>` 是 Tailwind 的占位符，`text-ink/50` 这类写法靠它工作。 */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** 页面底色。⚠️ 不是白色 —— 护眼要求见 design/03 §5.2 */
        canvas: token('canvas'),
        /** 卡片/按钮面。果冻岛是白，星际是深蓝面 —— 所以代码里不该再出现 bg-white */
        surface: {
          DEFAULT: token('surface'),
          2: token('surface-2'),
          /** 只用于那道 6px 实心下沉边，不要用作背景 */
          deep: token('surface-deep'),
        },
        ink: token('ink'),

        primary: { DEFAULT: token('primary'), deep: token('primary-deep') },
        /** 叠在 primary 上的文字色。果冻岛白字、星际深字，绝不能写死 text-white */
        'on-primary': token('on-primary'),

        correct: { DEFAULT: token('correct'), deep: token('correct-deep') },
        'on-correct': token('on-correct'),

        /** 温和提示。语义是「再看看」，不是「错误」 */
        alert: { DEFAULT: token('alert'), deep: token('alert-deep') },
        'on-alert': token('on-alert'),

        info: token('info'),
        accent: token('accent'),
      },

      fontSize: {
        /** 题干。clamp 一条顶掉四个断点：iPhone 上 32px，桌面上 52px，中间连续过渡 */
        stem: ['clamp(2rem, 1.4rem + 2.6vw, 3.25rem)', { lineHeight: '1.15', fontWeight: '800' }],
      },

      /** 一年级孩子的触控目标下限，远大于成人的 44pt */
      minHeight: { touch: '88px' },
      minWidth: { touch: '88px' },

      borderRadius: {
        blob: 'var(--r-blob)',
        card: 'var(--r-card)',
      },

      /**
       * ⚠️ 阴影**整条**交给皮肤，而不是只换颜色。
       *
       * 阴影的形态本身就是皮肤性格的一部分：果冻岛靠 `0 6px 0` 的硬下沉做出
       * 「能按下去的糖」，清晨草地靠柔和漫射做出清淡感，两者不是同一个公式换色能得到的。
       * 早先把 `0 6px 0 …` 写死在这里，等于规定了所有皮肤都必须是硬下沉风格。
       */
      boxShadow: {
        'drop-primary': 'var(--sh-drop-primary)',
        'drop-correct': 'var(--sh-drop-correct)',
        'drop-alert': 'var(--sh-drop-alert)',
        'drop-surface': 'var(--sh-drop-surface)',
        card: 'var(--sh-card)',
      },

      backgroundImage: {
        /** 页面背景装饰层，由 AppShell 铺在最底层 */
        deco: 'var(--deco)',
      },

      /**
       * ⚠️ sm 从默认的 640 下调到 480：640 落在 iPad 竖屏和 iPhone 之间，
       * 对这个 App 没有意义。四个断点对应四种真实持握姿势。
       */
      screens: {
        sm: '480px', // iPhone 横屏
        md: '768px', // iPad 竖屏
        lg: '1024px', // iPad 横屏 —— 侧栏舞台布局从这里开始
        xl: '1280px', // 桌面
      },
    },
  },
  plugins: [],
}

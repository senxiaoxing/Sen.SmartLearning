/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8E7',
        honey: '#FFB84D',
        coral: '#FF7A6B',
        mint: '#5FD3A6',
        sky: '#63B3F2',
        grape: '#A78BFA',
        ink: '#3D3A38',
      },
      fontSize: {
        stem: ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
      },
      minHeight: { touch: '88px' },
      minWidth: { touch: '88px' },
      borderRadius: { blob: '28px' },
    },
  },
  plugins: [],
}

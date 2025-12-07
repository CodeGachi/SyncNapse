/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animations: {},
      colors: {
        // 기존 색상 유지 (하위 호환)
        white: '#FFFFFF',
        black: '#000000',
        green: '#AFC02B',
        red: '#DE4646',

        // CSS 변수 기반 테마 색상
        background: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
          deep: 'var(--bg-deep)',
          sidebar: 'var(--bg-sidebar)',
          modal: 'var(--bg-modal)',
        },
        foreground: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        brand: {
          DEFAULT: 'var(--brand-primary)',
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          hover: 'var(--brand-hover)',
        },
        btn: {
          face: 'var(--btn-face)',
          inner: 'var(--btn-inner)',
        },
        status: {
          error: 'var(--status-error)',
          success: 'var(--status-success)',
          info: 'var(--status-info)',
        },

        // 기존 색상 (레거시 지원)
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        panels: {
          bg: 'var(--bg-elevated)',
          stroke: {
            subtle: 'var(--border-subtle)',
            strong: 'var(--border-strong)',
          },
        },
      },
    },
  },
  plugins: [],
};

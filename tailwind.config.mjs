// Emerald Cybernetic 테마 설정
// - 시안 기준: Base #0B0E11, Surface #1A1D23, Elevated #2E323A, Primary #00FF9D
// - 폰트: Inter (영문) / Noto Sans KR (한글) 폴백 단일
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 표면 계층 (Surface tiers)
        base: '#0B0E11',
        surface: '#1A1D23',
        'surface-alt': '#191C1F',
        'surface-container': '#1D2024',
        elevated: '#2E323A',

        // 브랜드 에메랄드
        emerald: {
          DEFAULT: '#00FF9D',
          soft: '#00BFA5',
          dim: '#00E38B',
        },

        // 기능 컬러
        danger: '#FFB4AB',
        warn: '#FFD600',

        // 텍스트
        muted: '#9BA3AF',
        outline: '#8B9199',

        // 시안 HTML 이 쓰는 Tailwind config 별칭 (Tailwind class 호환용)
        primary: '#00FF9D',
        'on-primary': '#003920',
        'on-surface': '#E1E3E4',
        'on-surface-variant': '#C1C7CE',
        error: '#FFB4AB',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        unit: '8px',
        gutter: '24px',
        'stack-sm': '4px',
        'stack-md': '12px',
        'stack-lg': '24px',
        'container-padding': '24px',
      },
      fontFamily: {
        // Inter 단일 운영. 별칭들은 시안의 class 명 호환
        sans: ['"Inter"', '"Noto Sans KR"', 'sans-serif'],
        mono: ['"Inter"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        'mono-data': ['"Inter"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        'body-md': ['"Inter"', '"Noto Sans KR"', 'sans-serif'],
        'body-lg': ['"Inter"', '"Noto Sans KR"', 'sans-serif'],
        'display-lg': ['"Inter"', '"Noto Sans KR"', 'sans-serif'],
        'display-xl': ['"Inter"', '"Noto Sans KR"', 'sans-serif'],
        'headline-md': ['"Inter"', '"Noto Sans KR"', 'sans-serif'],
        'label-sm': ['"Inter"', '"Noto Sans KR"', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '500' }],
        'mono-data': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      boxShadow: {
        // 네온 glow — DESIGN.md 의 "Neon Inner-Glows"
        'neon-sm': '0 4px 12px rgba(0, 255, 157, 0.1)',
        neon: '0 0 8px rgba(0, 255, 157, 0.3)',
        'glow-emerald': '0 0 20px -5px rgba(0, 255, 157, 0.25)',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: token('ink-950'),
          900: token('ink-900'),
          850: token('ink-850'),
          800: token('ink-800'),
          700: token('ink-700'),
          600: token('ink-600'),
          500: token('ink-500'),
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        signal: {
          fraud: token('signal-fraud'),
          high: token('signal-high'),
          medium: token('signal-medium'),
          low: token('signal-low'),
          info: token('signal-info'),
          cyan: token('signal-cyan'),
        },
        amber: {
          400: token('amber-400'),
          500: token('amber-500'),
        },
        zinc: {
          50: token('zinc-50'),
          100: token('zinc-100'),
          200: token('zinc-200'),
          300: token('zinc-300'),
          400: token('zinc-400'),
          500: token('zinc-500'),
          600: token('zinc-600'),
          700: token('zinc-700'),
          800: token('zinc-800'),
          900: token('zinc-900'),
          950: token('zinc-950'),
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.02em',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 0 1px rgba(255,59,71,0.25), 0 0 20px rgba(255,59,71,0.15)',
      },
    },
  },
  plugins: [],
}

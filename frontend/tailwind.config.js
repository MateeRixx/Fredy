/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070b',
          900: '#0a0e14',
          850: '#0d121a',
          800: '#111721',
          700: '#1a2230',
          600: '#243046',
          500: '#34445f',
        },
        line: {
          DEFAULT: '#1e2836',
          strong: '#2b3a4f',
        },
        signal: {
          fraud: '#ff3b47',
          high: '#ff7a2a',
          medium: '#f5b83d',
          low: '#26d9a0',
          info: '#4aa8ff',
          cyan: '#2bd8d0',
        },
        amber: {
          400: '#f5b83d',
          500: '#e8a72e',
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
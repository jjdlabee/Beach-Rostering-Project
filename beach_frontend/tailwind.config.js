/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary ocean teal
        ocean: {
          50:  '#eff9fb',
          100: '#d7f1f5',
          200: '#b4e3ec',
          300: '#80cedf',
          400: '#45b0c9',
          500: '#2993ae',
          600: '#247693',
          700: '#225f78',
          800: '#234f63',
          900: '#0f4c5c',
          950: '#0a3040',
        },
        // Warm sand accent
        sand: {
          50:  '#fdf8f0',
          100: '#faeedd',
          200: '#f4d9b5',
          300: '#ecbe83',
          400: '#e49e4f',
          500: '#de832c',
          600: '#cf6b21',
          700: '#ac531d',
          800: '#89431f',
          900: '#6f381c',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
}

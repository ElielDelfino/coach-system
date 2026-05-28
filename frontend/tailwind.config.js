/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Marca primária — hot magenta "pulse"
        brand: {
          DEFAULT: '#FF1E73',
          dark: '#C70E55', // pressed / deep fill
          light: '#FF4D93', // hover / hot highlight
          dim: '#7A1242', // fill de baixa ênfase
        },
        // Acento secundário — acid lime (dados, estrutura, links)
        accent: {
          DEFAULT: '#C2FF36',
          dark: '#8BC400',
          light: '#D6FF6B',
          dim: '#4A5E12',
        },
        // Superfícies — preto profundo, sobem em luminância (nunca chegam ao cinza claro)
        surface: {
          DEFAULT: '#07070B', // void / página
          base: '#0C0C12', // canvas base
          card: '#13131C', // cards, painéis
          elevated: '#1B1B26', // cards elevados, inputs, hover rows
          pop: '#242431', // popovers, menus, estados ativos
          border: '#26263212', // hairline (usado via /opacity quando preciso)
          input: '#1B1B26',
        },
        // Status semântico, neon-tuned
        ok: { DEFAULT: '#2BE07A', dark: '#1FA85B' },
        warn: { DEFAULT: '#FFC23D', dark: '#C9941F' },
        danger: { DEFAULT: '#FF3347', dark: '#C71F2F' },
      },
      fontFamily: {
        // UI + prose
        sans: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
        // Display / impacto (headings, labels tracked, numerais hero)
        display: ['Saira', 'Arial Narrow', 'sans-serif'],
        // Dados / métricas (timers, contagens, IDs, dinheiro)
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        widest: '0.16em',
      },
      boxShadow: {
        'glow-magenta': '0 0 24px rgba(255,30,115,0.55), 0 0 4px rgba(255,30,115,0.8)',
        'glow-magenta-sm': '0 0 12px rgba(255,30,115,0.45)',
        'glow-lime': '0 0 24px rgba(194,255,54,0.50), 0 0 4px rgba(194,255,54,0.7)',
        'glow-lime-sm': '0 0 12px rgba(194,255,54,0.40)',
        'glow-ok': '0 0 16px rgba(43,224,122,0.45)',
      },
      backgroundImage: {
        'grad-brand': 'linear-gradient(105deg, #FF1E73 0%, #FF5BA0 55%, #C2FF36 140%)',
        'grad-magenta': 'linear-gradient(160deg, #FF4D93 0%, #C70E55 100%)',
        'grad-surface': 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)',
        'grad-spot':
          'radial-gradient(120% 90% at 50% -10%, rgba(255,30,115,0.18) 0%, rgba(255,30,115,0) 55%)',
      },
      keyframes: {
        'pulse-breathe': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'pulse-breathe': 'pulse-breathe 2s cubic-bezier(0.16,1,0.3,1) infinite',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f97316',
          dark: '#ea6c0a',
          light: '#fed7aa',
        },
        surface: {
          DEFAULT: '#0a0a0a',
          card: '#111111',
          elevated: '#161616',
          border: '#1f1f1f',
          input: '#1a1a1a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest: '0.15em',
      },
    },
  },
  plugins: [],
};

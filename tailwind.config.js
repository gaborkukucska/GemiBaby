/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        gem: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          accent: '#38bdf8', // Sky blue
          glow: '#818cf8',   // Indigo
          danger: '#f43f5e',
          success: '#10b981'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  },
  plugins: [],
}
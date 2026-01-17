/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'br-bg': '#0a0a0f',
        'br-panel': '#0f141c',
        'br-card': 'rgba(12, 16, 24, 0.9)',
        'br-text': '#e6edf3',
        'br-dim': 'rgba(230, 237, 243, 0.6)',
        'br-hot': '#ff0080',
        'br-accent': '#00ff88',
        'br-info': '#0088ff',
      },
      fontFamily: {
        'jetbrains': ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        'orbitron': ['Orbitron', 'sans-serif'],
        'rajdhani': ['Rajdhani', 'sans-serif'],
      },
      keyframes: {
        timerPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        dotBlink: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        codeReveal: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        timerPulse: 'timerPulse 1s ease-in-out infinite',
        dotBlink: 'dotBlink 1.4s ease-in-out infinite',
        slideIn: 'slideIn 0.3s ease',
        codeReveal: 'codeReveal 0.5s ease-out',
      },
    },
  },
  plugins: [],
}

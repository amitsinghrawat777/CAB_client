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
        'br-hot': '#ff4d6d',
        'br-accent': '#00ff88',
        'br-info': '#61dafb',
      },
      fontFamily: {
        'jetbrains': ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        'orbitron': ['Orbitron', 'sans-serif'],
        'rajdhani': ['Rajdhani', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

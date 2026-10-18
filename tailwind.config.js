
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        threatPulse: {
          '0%, 100%': { transform: 'translate(-50%, -50%) scale(0.95)', opacity: '0.9' },
          '50%': { transform: 'translate(-50%, -50%) scale(1.15)', opacity: '1' },
        },
        penteGrow: {
          '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: '0' },
          '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '1' },
        },
        penteShrink: {
          '0%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(-50%, -50%) scale(0)', opacity: '0' },
        }
      },
      animation: {
        threatPulse: 'threatPulse 1.2s ease-in-out infinite',
        penteGrow: 'penteGrow 1.5s ease-out',
        penteShrink: 'penteShrink 1.5s ease-in forwards',
      }
    },
  },
  plugins: [],
}

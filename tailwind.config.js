/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#000000',
        'surface': '#1A1A1A',
        'overlay': '#2C2C2C',
        'text-primary': '#FFFFFF',
        'text-secondary': '#B3B3B3',
        'glow-cyan': '#00FFFF',
        'glow-magenta': '#FF00FF',
        'glow-lime': '#00FF00',
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size':'200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size':'200% 200%',
            'background-position': 'right center'
          }
        }
      }
    },
  },
  plugins: [],
}

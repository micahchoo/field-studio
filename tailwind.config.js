/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./ui/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist colors used dynamically in toolbars
  safelist: [
    'text-green-400',
    'text-blue-400',
    'text-amber-400',
    'text-pink-400',
    'text-yellow-400',
    'text-yellow-100',
    'text-white',
    'text-slate-300',
    'bg-slate-800',
    'bg-yellow-900/50',
    'border-slate-700',
    'border-yellow-700',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'iiif-blue': '#005596',
        'iiif-red': '#E31C24',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

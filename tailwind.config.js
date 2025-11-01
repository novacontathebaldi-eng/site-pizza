/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./{src,components}/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-green-700': '#2C5633',
        'brand-olive-600': '#596D44',
        'brand-green-500': '#7C977D',
        'brand-green-300': '#B2C4AC',
        'brand-ivory-50': '#EDF5E8',
        'brand-gold-600': '#A28438',
        'text-on-dark': '#EDF5E8',
        'text-on-light': '#2C5633',
        'accent': '#A28438',
      }
    },
  },
  plugins: [],
}
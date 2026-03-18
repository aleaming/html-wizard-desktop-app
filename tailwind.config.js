/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          850: '#1a1d23',
          750: '#2d3039',
        }
      }
    }
  },
  plugins: []
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-cyan': '#009ACD',
        'primary-dark-blue': '#0A2540',
        'accent-ochre': '#F5D19B',
      },
    },
  },
  plugins: [],
}

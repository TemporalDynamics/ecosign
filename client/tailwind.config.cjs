/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // EcoSign Minimal Design System
        'accent': '#0A66C2',        // Azul petróleo - Color de acento principal
        'accent-dark': '#0E4B8B',   // Azul petróleo oscuro - Hover states
        'accent-light': '#1478D4',  // Azul petróleo claro - Estados activos
        
        // Legacy colors (mantener por compatibilidad temporal)
        'primary-cyan': '#009ACD',
        'primary-dark-blue': '#0A2540',
        'accent-ochre': '#F5D19B',
      },
    },
  },
  plugins: [],
}

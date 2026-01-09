// tailwind.config.js
export default {
  darkMode: 'class', // Enables toggling via a CSS class
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,html}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        worksans: ['"Work Sans"', 'sans-serif'],
        sfProRounded: ['SF Pro Rounded', 'sans-serif'],
        robotoMono: ['"Roboto Mono"', 'monospace'],
      },
      animation: {
        gradient: 'gradient 4s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      colors: {
        'gradient-start': '#ff7e5f',
        'gradient-end': '#feb47b',
        'gradient-start-2': '#6a11cb',
        'gradient-end-2': '#2575fc',
        'gradient-start-3': '#f12711',
        'gradient-end-3': '#f5af19',
      },
    },
  },
  plugins: [],
};

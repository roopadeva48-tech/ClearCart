/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          900: '#060d1a',
          800: '#0d1829',
          700: '#0f1f38',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
      }
    },
  },
  plugins: [],
};

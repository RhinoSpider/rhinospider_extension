/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cream': '#FAF9F6',
        'peach': {
          100: '#FFD8B4',
          200: '#FFC090',
        },
      },
    },
  },
  plugins: [],
}

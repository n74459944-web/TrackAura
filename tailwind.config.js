/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'trackaura-blue': '#3B82F6', // For Lucide TrendingUp icons
        'trackaura-gradient': 'linear-gradient(to right, #3B82F6, #8B5CF6)', // Price history bg
      },
    },
  },
  plugins: [],
}
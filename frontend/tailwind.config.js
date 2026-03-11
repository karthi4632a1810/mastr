/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Classic blue palette for professional look
        classic: {
          blue: '#1e40af',
          'blue-light': '#3b82f6',
          'blue-dark': '#1e3a8a',
          gray: '#6b7280',
          'gray-light': '#9ca3af',
          'gray-dark': '#374151',
        },
      },
    },
  },
  plugins: [],
  // Purge unused styles in production for smaller bundle
  future: {
    hoverOnlyWhenSupported: true,
  },
}

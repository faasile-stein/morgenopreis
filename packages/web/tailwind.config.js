/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#cdd9fd',
          300: '#9fb8fb',
          400: '#6b8ef7',
          500: '#667eea',
          600: '#4c5dd8',
          700: '#3c4ab6',
          800: '#343d93',
          900: '#2d3570',
        },
        secondary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      animation: {
        'spin-slow': 'spin 10s linear infinite',
        'bounce-slow': 'bounce 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

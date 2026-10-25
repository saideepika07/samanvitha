/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#F9F3E7',   // Base warm ivory / cream
          100: '#F3ECE0',  // Subtle surface
          200: '#E7DDD0',  // Borders and dividers
          300: '#D9CDBE',
          400: '#C5B6A1',
          500: '#A9967E',
          600: '#897760',
          700: '#695A48',
          800: '#4B4033',
          900: '#2E271F',
        },
        olive: {
          50: '#F4F5F1',
          100: '#E5E8DD',
          200: '#CCD3BE',
          300: '#AEBA99',
          400: '#8C9D74',
          500: '#6E8055',
          600: '#54633E',
          700: '#414D30',
          800: '#313B24',  // Deep olive-green matching reference
          900: '#242C1A',  // Darkest olive
        },
        gold: {
          300: '#D9C8A8',
          400: '#C8B490',
          500: '#B8A179',  // Subtle muted gold for divider and circular accent
          600: '#A28C65',
        },
        sage: {
          50: '#F3F6F4',
          100: '#E3EBE5',
          200: '#C7D7CB',
          300: '#A6BEAC',
          400: '#7E9F86',
          500: '#5F8267',
          600: '#4A6B53',
          700: '#3A5441',
          800: '#2C4032',
          900: '#1D2A21',
        },
        terracotta: {
          50: '#FCF6F2',
          100: '#F8ECE4',
          200: '#F1D7C7',
          300: '#E5BBA5',
          400: '#D79B7F',
          500: '#C87D55',
          600: '#B0643E',
          700: '#8D4E2F',
          800: '#6B3A23',
          900: '#4A2717',
        },
        charcoal: {
          50: '#F5F6F6',
          100: '#E6E7E9',
          200: '#CDD0D4',
          300: '#A7ADB5',
          400: '#7D8590',
          500: '#5C636D',
          600: '#444A52',
          700: '#34383F',
          800: '#25282D',
          900: '#191B1E',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', '"Cormorant Garamond"', 'Georgia', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'Cinzel', 'Georgia', 'serif'],
        serif: ['"Cormorant Garamond"', 'Cinzel', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'tagline-gap': '96px',
        '24': '96px',
      },
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(37, 40, 45, 0.04), 0 1px 2px rgba(37, 40, 45, 0.02)',
        'soft': '0 4px 12px rgba(37, 40, 45, 0.04), 0 2px 4px rgba(37, 40, 45, 0.02)',
        'soft-md': '0 10px 25px -3px rgba(37, 40, 45, 0.05), 0 4px 6px -2px rgba(37, 40, 45, 0.02)',
        'soft-lg': '0 20px 30px -5px rgba(37, 40, 45, 0.06), 0 8px 10px -5px rgba(37, 40, 45, 0.03)',
      },
    },
  },
  plugins: [],
}

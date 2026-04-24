/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0c111d',
          900: '#121a28',
          800: '#1a2638',
        },
        sand: {
          50: '#fbf6ee',
          100: '#f4ebdc',
          200: '#ead8bb',
        },
        tide: {
          300: '#75d7d0',
          400: '#3cbeb7',
          500: '#129d97',
          600: '#0d7d79',
        },
        ember: {
          400: '#ff9d6c',
          500: '#ff7a45',
          600: '#e55722',
        },
        pine: {
          400: '#6cd3a5',
          500: '#2fb87f',
        },
        rose: {
          400: '#ff8b93',
          500: '#f45b69',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
        body: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        glow: '0 20px 60px rgba(18, 157, 151, 0.18)',
      },
      backgroundImage: {
        haze:
          'radial-gradient(circle at top left, rgba(18,157,151,0.22), transparent 28%), radial-gradient(circle at top right, rgba(255,122,69,0.16), transparent 24%), linear-gradient(180deg, #121a28 0%, #0c111d 100%)',
      },
    },
  },
  plugins: [],
};

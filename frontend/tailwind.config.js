/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0F14',
        surface: '#121A21',
        surface2: '#1A242D',
        tabbar: '#0E151B',
        line: '#22303B',
        line2: '#304150',
        ink: '#EAF4FA',
        soft: '#B9CAD6',
        muted: '#8597A5',
        dis: '#4E5E6A',
        accent: '#2BB8F0',
        tint: '#0E2230',
        tint2: '#103149',
        ok: '#5FD39A',
        okbg: '#11261F',
        warn: '#F2B84B',
        warnbg: '#2A2214',
        danger: '#F26B6B',
        dangerbg: '#2C1518',
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

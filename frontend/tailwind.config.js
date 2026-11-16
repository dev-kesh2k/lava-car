/** @type {import('tailwindcss').Config} */
// Cores vêm das variáveis em src/index.css (claro estilo iOS por padrão; escuro segue o sistema).
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const names = [
  'bg', 'surface', 'surface2', 'elevated', 'tabbar', 'line', 'line2', 'ink', 'soft', 'muted', 'dis',
  'accent', 'brand', 'onaccent', 'tint', 'tint2', 'ok', 'okfill', 'okbg', 'warn', 'warnbg', 'danger', 'dangerbg', 'indigo', 'indigobg',
];

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(names.map((n) => [n, v(n)])),
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', '"Inter Variable"', 'Inter', 'system-ui', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', '"Roboto Mono"', 'monospace'],
      },
      fontSize: {
        // Escala do iOS (Dynamic Type, tamanho padrão)
        caption: ['12px', { lineHeight: '16px' }],
        footnote: ['13px', { lineHeight: '18px' }],
        subhead: ['15px', { lineHeight: '20px', letterSpacing: '-0.2px' }],
        body: ['17px', { lineHeight: '22px', letterSpacing: '-0.4px' }],
        title3: ['20px', { lineHeight: '25px', letterSpacing: '-0.4px' }],
        title2: ['22px', { lineHeight: '28px', letterSpacing: '-0.3px' }],
        title1: ['28px', { lineHeight: '34px', letterSpacing: '0.2px' }],
        large: ['34px', { lineHeight: '41px', letterSpacing: '0.3px' }],
      },
      borderRadius: { cell: '12px', card: '16px' },
      transitionTimingFunction: { ios: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        ring: { '0%': { boxShadow: '0 0 0 0 rgb(var(--accent) / 0.45)' }, '100%': { boxShadow: '0 0 0 10px rgb(var(--accent) / 0)' } },
      },
      animation: {
        'sheet-up': 'sheet-up 300ms cubic-bezier(0.2, 0.9, 0.3, 1)',
        'fade-in': 'fade-in 220ms ease-out',
        'pop-in': 'pop-in 260ms cubic-bezier(0.2, 0.9, 0.3, 1)',
        'toast-in': 'toast-in 240ms ease-out',
        ring: 'ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'on-tertiary-fixed': '#002022',
        'inverse-on-surface': '#2e3134',
        'surface-container-high': '#282a2e',
        'secondary-fixed-dim': '#ddb7ff',
        'on-error': '#690005',
        'primary-container': '#2d5bff',
        primary: '#b8c3ff',
        'on-primary-fixed-variant': '#0035bd',
        'surface-container': '#1d2023',
        'inverse-surface': '#e1e2e7',
        'tertiary-container': '#007980',
        'secondary-container': '#6f00be',
        'on-secondary': '#490080',
        'error-container': '#93000a',
        'surface-container-lowest': '#0c0e12',
        secondary: '#ddb7ff',
        'on-secondary-fixed': '#2c0051',
        'inverse-primary': '#104af0',
        'surface-container-low': '#191c1f',
        'secondary-fixed': '#f0dbff',
        'primary-fixed': '#dde1ff',
        background: '#111417',
        'on-error-container': '#ffdad6',
        'on-surface': '#e1e2e7',
        'on-primary-container': '#efefff',
        'surface-variant': '#323539',
        surface: '#111417',
        outline: '#8e90a2',
        tertiary: '#00dbe7',
        'outline-variant': '#434656',
        'surface-dim': '#111417',
        'on-tertiary-fixed-variant': '#004f54',
        error: '#ffb4ab',
        'tertiary-fixed-dim': '#00dbe7',
        'on-tertiary-container': '#c0faff',
        'surface-tint': '#b8c3ff',
        'on-secondary-fixed-variant': '#6900b3',
        'surface-bright': '#37393d',
        'primary-fixed-dim': '#b8c3ff',
        'surface-container-highest': '#323539',
        'on-background': '#e1e2e7',
        'on-primary-fixed': '#001355',
        'on-tertiary': '#00363a',
        'on-primary': '#002387',
        'tertiary-fixed': '#74f5ff',
        'on-surface-variant': '#c4c5d9',
        'on-secondary-container': '#d6a9ff',
        success: '#3ddc97',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        'card-padding': '24px',
        'section-gap': '32px',
        'gutter-stack': '16px',
        'margin-page': '20px',
        'element-gap': '8px',
      },
      /* ------------------------------------------------------ type system
         Three roles, one job each:
           Sora            → display + headlines (the only voice-y face)
           Hanken Grotesk  → everything readable: body, labels, buttons, nav
           JetBrains Mono  → machine data only: IDs, codes, timers, counters
         Token names are kept stable so the whole app inherits the change. */
      fontFamily: {
        sans: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Sora', 'sans-serif'],
        'display-lg': ['Sora', 'sans-serif'],
        'headline-lg': ['Sora', 'sans-serif'],
        'headline-lg-mobile': ['Sora', 'sans-serif'],
        'headline-md': ['Sora', 'sans-serif'],
        title: ['Sora', 'sans-serif'],
        'body-lg': ['Hanken Grotesk', 'sans-serif'],
        'body-md': ['Hanken Grotesk', 'sans-serif'],
        'body-sm': ['Hanken Grotesk', 'sans-serif'],
        'label-md': ['Hanken Grotesk', 'sans-serif'],
        'label-sm': ['Hanken Grotesk', 'sans-serif'],
        data: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      /* Fixed scale, ~1.2 ratio — product UI, not fluid brand type.
         Sora only appears at 19px and above; everything smaller is Hanken. */
      fontSize: {
        // display / headline — Sora
        'display-lg': ['30px', { lineHeight: '36px', letterSpacing: '-0.025em', fontWeight: '700' }],
        'headline-lg': ['25px', { lineHeight: '31px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg-mobile': ['22px', { lineHeight: '28px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['19px', { lineHeight: '25px', letterSpacing: '-0.015em', fontWeight: '600' }],

        // title — Hanken semibold: card titles, list rows, anything under 19px
        title: ['16px', { lineHeight: '22px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'title-sm': ['15px', { lineHeight: '20px', letterSpacing: '-0.005em', fontWeight: '600' }],

        // body — Hanken
        'body-lg': ['16px', { lineHeight: '25px', fontWeight: '400' }],
        'body-md': ['15px', { lineHeight: '23px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '19px', fontWeight: '400' }],

        // labels — Hanken semibold
        'label-md': ['14px', { lineHeight: '18px', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '600' }],

        /* marketing scale — the landing page only. The product scale above is
           a UI scale and tops out at 30px; a public page needs brand type.
           Namespaced `site-*` so no app screen can inherit it by accident. */
        'site-display': ['clamp(2.125rem, 3.9vw, 3.375rem)', { lineHeight: '1.14', letterSpacing: '-0.02em', fontWeight: '500' }],
        'site-h2': ['clamp(1.625rem, 2.7vw, 2.75rem)', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '500' }],
        'site-h3': ['clamp(1.0625rem, 1.3vw, 1.25rem)', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'site-lead': ['clamp(1.0625rem, 1.1vw, 1.1875rem)', { lineHeight: '1.7', fontWeight: '400' }],
        'site-body': ['clamp(1rem, 1vw, 1.0625rem)', { lineHeight: '1.7', fontWeight: '400' }],
        'site-eyebrow': ['13px', { lineHeight: '18px', letterSpacing: '0', fontWeight: '500' }],

        // data — JetBrains Mono for IDs, codes and figures
        'data-lg': ['19px', { lineHeight: '25px', letterSpacing: '0.03em', fontWeight: '500' }],
        'data-md': ['14px', { lineHeight: '19px', letterSpacing: '0.04em', fontWeight: '500' }],
        'data-sm': ['11px', { lineHeight: '15px', letterSpacing: '0.07em', fontWeight: '500' }],
      },

      /* Finer opacity steps for hairlines and tints (drives the `/n` modifier). */
      opacity: {
        3: '.03',
        4: '.04',
        6: '.06',
        7: '.07',
        8: '.08',
        12: '.12',
        15: '.15',
        18: '.18',
        35: '.35',
        45: '.45',
        55: '.55',
        65: '.65',
        85: '.85',
      },

      /* Semantic stacking order — no arbitrary 999s. */
      zIndex: {
        base: '0',
        raised: '10',
        sticky: '20',
        nav: '30',
        scrim: '40',
        drawer: '50',
        toast: '60',
      },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        DEFAULT: '180ms',
        slow: '240ms',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        breathe: {
          '0%,100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.18)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        breathe: 'breathe 3s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        riseIn: 'riseIn .45s cubic-bezier(.2,.8,.2,1) both',
        scan: 'scan 3.5s linear infinite',
      },
    },
  },
  plugins: [],
}

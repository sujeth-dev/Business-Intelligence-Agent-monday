/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Skylark Drones brand: deep navy primary + teal accent.
        // Validated for WCAG contrast on both surfaces (see plan/validator run).
        brand: {
          navy: '#0a2540',
          teal: '#0d9488', // accent/buttons on light (white text 3.7:1, UI-safe)
          'teal-dark': '#2dd4bf', // accent on dark (9.6:1 on slate-900)
        },
        // Reserved status triad (dataviz skill, fixed/never themed). Always
        // shipped with an icon + label, never color-alone.
        status: {
          good: '#0ca30c',
          warning: '#fab219',
          critical: '#d03b3b',
        },
      },
    },
  },
  plugins: [],
};

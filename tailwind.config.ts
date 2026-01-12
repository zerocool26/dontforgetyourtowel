/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        neutral: {
          25: '#fafafa',
          50: '#f4f4f5',
          100: '#e4e4e7',
          200: '#d4d4d8',
          300: '#a1a1aa',
          400: '#71717a',
          500: '#52525b',
          600: '#3f3f46',
          700: '#27272a',
          800: '#18181b',
          900: '#09090b',
          950: '#000000',
        },
        success: {
          50: '#ebf9f2',
          100: '#d2f1e1',
          200: '#a4e3c2',
          300: '#6dcc9a',
          400: '#3fac74',
          500: '#2c8a58',
          600: '#216b44',
          700: '#1c5637',
          800: '#17432b',
          900: '#10301f',
        },
        warning: {
          50: '#fff7eb',
          100: '#ffe8c5',
          200: '#ffd092',
          300: '#ffb25c',
          400: '#ff9333',
          500: '#f27214',
          600: '#d2550d',
          700: '#a33d0d',
          800: '#7c2f11',
          900: '#511f0f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fde0df',
          200: '#fbb8b5',
          300: '#f28783',
          400: '#e85f5b',
          500: '#d53c3c',
          600: '#b42a2c',
          700: '#8e2022',
          800: '#6b191c',
          900: '#431114',
        },
        info: {
          50: '#edf6ff',
          100: '#d4e7ff',
          200: '#a8ceff',
          300: '#76b0ff',
          400: '#4d91f8',
          500: '#2f72de',
          600: '#2157b4',
          700: '#1e4791',
          800: '#19396f',
          900: '#152e56',
        },
        surface: {
          50: '#ffffff',
          100: '#f6f7fb',
          200: '#eef1f7',
          300: '#e0e4ee',
          400: '#c5cad7',
        },
        overlay: {
          light: 'rgba(17, 24, 39, 0.06)',
          dark: 'rgba(15, 23, 42, 0.72)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Inter', 'system-ui', 'serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
        36: '9rem',
        72: '18rem',
        84: '21rem',
        96: '24rem',
        128: '32rem',
      },
      maxWidth: {
        'content-tight': '56rem',
        'content-wide': '72rem',
        'content-xl': '88rem',
        '8xl': '88rem',
        '9xl': '96rem',
      },
      borderRadius: {
        lg: '0.25rem',
        xl: '0.375rem',
        '2xl': '0.5rem',
        '3xl': '0.75rem',
      },
      boxShadow: {
        'elevation-xs': '0 1px 2px rgba(15, 23, 42, 0.06)',
        'elevation-sm': '0 6px 12px -6px rgba(15, 23, 42, 0.12)',
        'elevation-md': '0 18px 36px -14px rgba(15, 23, 42, 0.16)',
        'elevation-lg': '0 32px 64px -20px rgba(15, 23, 42, 0.18)',
        outline: 'inset 0 0 0 1px rgba(148, 163, 184, 0.25)',
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
      },
      lineHeight: {
        snug: '1.35',
        relaxed: '1.75',
        'extra-loose': '2.5',
        'super-loose': '3',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh':
          'radial-gradient(at 40% 20%, rgba(99, 102, 241, 0.2) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%), radial-gradient(at 80% 50%, rgba(167, 139, 250, 0.15) 0px, transparent 50%)',
        'gradient-shine':
          'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)',
        noise:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        gradient: 'gradient 8s linear infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glow: {
          '0%': { opacity: '0.5', filter: 'brightness(1)' },
          '100%': { opacity: '1', filter: 'brightness(1.2)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    function ({
      addUtilities,
    }: {
      addUtilities: (
        utilities: Record<
          string,
          Record<string, string | Record<string, string>>
        >
      ) => void;
    }) {
      const newUtilities = {
        '.glass': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        },
        '.glass-dark': {
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(12px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        },
        '.text-gradient': {
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
        '.text-gradient-blue': {
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        },
        '.text-gradient-purple': {
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
        },
        '.perspective': {
          perspective: '1000px',
        },
        '.transform-3d': {
          transformStyle: 'preserve-3d',
        },
        '.backface-hidden': {
          backfaceVisibility: 'hidden',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.pattern-dots': {
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        },
        '.pattern-grid': {
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        },

        /* Mobile tap target helpers (opt-in; avoids global layout shifts) */
        '.tap-target': {
          minHeight: '48px',
          minWidth: '48px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'manipulation',
        },
        '.tap-target-sm': {
          minHeight: '44px',
          minWidth: '44px',
        },
        '.tap-target-inline': {
          minHeight: '48px',
          touchAction: 'manipulation',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

import type { Config } from 'tailwindcss';

const token = (name: string) =>
  `oklch(from var(--${name}) l c h / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
        },
        popover: {
          DEFAULT: token('popover'),
          foreground: token('popover-foreground'),
        },
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
        },
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },
        destructive: {
          DEFAULT: token('destructive'),
          foreground: token('destructive-foreground'),
        },
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        milevo: {
          white: token('milevo-white'),
          primary: token('milevo-primary'),
          text: token('milevo-text'),
          ink: token('milevo-ink'),
          muted: token('milevo-muted'),
          bg: token('milevo-bg'),
          border: token('milevo-border'),
          success: token('milevo-success'),
          warning: token('milevo-warning'),
        },
      },
      fontFamily: {
        ui: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero: ['clamp(2.25rem, 6vw, 4rem)', { lineHeight: '1.05' }],
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(17,17,17,0.06)',
        md: '0 4px 16px rgba(17,17,17,0.08)',
      },
      spacing: {
        touch: '44px', // minimum touch target, per the mobile-first requirement
      },
    },
  },
  plugins: [],
};

export default config;

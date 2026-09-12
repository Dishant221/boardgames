import type { Config } from 'tailwindcss';

/**
 * Grand Tour palette - a gallery of Rome & Europe: aged plaster, Carrara marble,
 * terracotta, Venetian red, gilt frames, lapis and ink.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#f6f0e3',
        plaster: '#ede3cf',
        parchment: '#e6d8bb',
        marble: '#f9f6ef',
        umber: '#5a4634',
        ink: '#2b2118',
        terracotta: '#b1412c',
        venetian: '#8d2b1e',
        gilt: '#c9a24a',
        gold: '#a97f2a',
        lapis: '#274a78',
        verdigris: '#4f7f6e',
        olive: '#7f7a4a'
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        frame: '0 30px 60px -20px rgba(43,33,24,.55), 0 10px 20px -10px rgba(43,33,24,.4)',
        card: '0 12px 30px -14px rgba(43,33,24,.35)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(43,33,24,.08)'
      },
      backgroundImage: {
        'marble-veins':
          'radial-gradient(ellipse at 20% 10%, rgba(255,255,255,.7), transparent 40%), radial-gradient(ellipse at 80% 90%, rgba(201,162,74,.12), transparent 45%), linear-gradient(135deg, #faf7f0 0%, #efe8d8 50%, #f7f2e6 100%)'
      },
      animation: {
        'fade-in': 'fadeIn .5s ease-out both',
        'rise-in': 'riseIn .6s cubic-bezier(.2,.7,.2,1) both',
        breathe: 'breathe 2.4s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite'
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        riseIn: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        breathe: { '0%,100%': { transform: 'scale(1)', opacity: '.85' }, '50%': { transform: 'scale(1.08)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '0% 50%' }, '100%': { backgroundPosition: '200% 50%' } }
      }
    }
  },
  plugins: []
} satisfies Config;

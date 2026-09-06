import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8B4513',
        secondary: '#D2691E',
        accent: '#FF8C00',
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        display: ['Georgia', 'serif']
      },
      animation: {
        'dice-roll': 'roll 0.5s ease-in-out',
        'token-move': 'move 1.5s ease-in-out',
        'bounce-in': 'bounceIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out'
      },
      keyframes: {
        roll: {
          '0%': { transform: 'rotateX(0) rotateY(0) rotateZ(0)' },
          '100%': { transform: 'rotateX(360deg) rotateY(360deg) rotateZ(360deg)' }
        },
        move: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(var(--move-x), var(--move-y))' }
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1' },
          '100%': { transform: 'scale(1)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    }
  },
  plugins: []
} satisfies Config;

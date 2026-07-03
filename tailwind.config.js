/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './resources/**/*.blade.php',
    './resources/**/*.jsx',
    './resources/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F3864',
          hover:   '#16294a',
          light:   '#EEF2FF',
        },
        gold: {
          DEFAULT: '#B8860B',
          hover:   '#9c7109',
          light:   '#FEF9C3',
        },
        success: {
          DEFAULT: '#2E7D32',
          bg:      '#E8F5E9',
          hover:   '#1b5e20',
        },
        warning: {
          DEFAULT: '#ED6C02',
          bg:      '#FFF3E0',
          hover:   '#e65100',
        },
        danger: {
          DEFAULT: '#C62828',
          bg:      '#FFEBEE',
          hover:   '#b71c1c',
        },
        info: {
          DEFAULT: '#1565C0',
          bg:      '#E3F2FD',
          hover:   '#0d47a1',
        },
        surface: '#FFFFFF',
        background: '#F8FAFC',
        border: '#E2E8F0',
        'text-main':  '#1F2937',
        'text-muted': '#595959',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
        md: '0 4px 6px -1px rgba(0,0,0,0.05)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}

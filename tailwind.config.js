/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0d1117',
        panel: '#161b22',
        elevated: '#1f242c',
        hairline: '#30363d',
        primary: '#e6edf3',
        secondary: '#8b949e',
        postman: {
          DEFAULT: '#ff6c37',
          hover: '#e55b2b',
        },
        github: {
          green: '#238636',
          greenHover: '#2ea043',
          border: '#30363d',
          badge: '#21262d',
        },
        link: '#2f81f7',
        warn: '#d29922',
        danger: '#f85149',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
      boxShadow: {
        none: 'none',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8fafc", // slate-50
        surface: "#ffffff", // white
        primary: {
          DEFAULT: "#0284c7", // sky-600
          hover: "#0369a1", // sky-700
        },
        secondary: "#f1f5f9", // slate-100
        accent: "#0ea5e9", // sky-500
        medical: {
          blue: "#0284c7",
          teal: "#0d9488",
          red: "#e11d48",
        },
        // Invert the gray colors so existing typography remains fully legible and beautiful
        gray: {
          100: "#0f172a", // slate-900 (for titles)
          200: "#1e293b", // slate-800
          300: "#334155", // slate-700
          400: "#475569", // slate-600
          500: "#64748b", // slate-500
          600: "#94a3b8", // slate-400
          700: "#cbd5e1", // slate-300
          800: "#e2e8f0", // slate-200
          900: "#f8fafc", // slate-50
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
      }
    },
  },
  plugins: [],
}

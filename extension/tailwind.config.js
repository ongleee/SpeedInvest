/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./popup.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        surface: {
          900: "#0a0a0f",
          800: "#12121a",
          700: "#1a1a27",
          600: "#22223a",
          500: "#2e2e50",
        },
        accent: {
          green:  "#00ff88",
          red:    "#ff3b5c",
          yellow: "#ffd700",
          blue:   "#00b4ff",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "glow-green":
          "radial-gradient(ellipse at top, rgba(0,255,136,0.12) 0%, transparent 60%)",
        "glow-red":
          "radial-gradient(ellipse at top, rgba(255,59,92,0.12) 0%, transparent 60%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow":  "spin 8s linear infinite",
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

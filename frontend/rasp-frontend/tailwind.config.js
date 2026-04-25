export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0d1117",
          1: "#161b22",
          2: "#1c2230",
          3: "#212836",
        },
        border: {
          DEFAULT: "#2a3244",
          light: "#334155",
        },
        primary: {
          DEFAULT: "#f59e0b",
          hover:   "#d97706",
          muted:   "#f59e0b33",
        },
        accent: {
          DEFAULT: "#06b6d4",
          hover:   "#0891b2",
          muted:   "#06b6d433",
        },
        success: { DEFAULT: "#10b981", muted: "#10b98122" },
        danger:  { DEFAULT: "#ef4444", muted: "#ef444422" },
        warning: { DEFAULT: "#f59e0b", muted: "#f59e0b22" },
        text: {
          primary:   "#f1f5f9",
          secondary: "#94a3b8",
          muted:     "#475569",
        },
      },
      fontFamily: {
        sans: ["Sora", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      fontSize: {
        "2xs": "0.625rem",
      },
      boxShadow: {
        card:       "0 0 0 1px #2a3244, 0 4px 24px #00000066",
        glow:       "0 0 20px #f59e0b33",
        "glow-cyan":"0 0 20px #06b6d433",
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease forwards",
        "slide-up":   "slideUp 0.4s ease forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
}
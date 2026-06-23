import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core palette — black backgrounds, blue as the only accent.
        ink: "#000000", // page background
        card: "#111111", // card / surface background
        elevated: "#1C1C1E", // slightly raised surfaces (inputs, sub-buttons)
        hairline: "#262626", // borders / dividers
        accent: {
          DEFAULT: "#2196F3", // the single accent blue
          dim: "#1976D2",
        },
        success: "#3CB043", // checked set row / completed
        successDark: "#23501f", // checked row background tint (matches Hevy green rows)
        danger: "#FF3B30", // discard / destructive
        muted: "#8E8E93", // grey secondary text
        faint: "#5A5A5E", // grey tertiary / placeholders
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      maxWidth: {
        app: "480px",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.22s ease-out",
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

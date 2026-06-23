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
        // "Apex" palette — cool near-black surfaces, emerald as the only accent.
        ink: "#0B0F14", // page background (near-black, slightly blue-cool)
        card: "#141A22", // card / surface background (cool slate)
        elevated: "#1E2632", // raised surfaces (inputs, sub-buttons)
        hairline: "#28323F", // borders / dividers
        accent: {
          DEFAULT: "#10B981", // the single accent — emerald green
          dim: "#0E9F6E", // hover / pressed
        },
        success: "#22C55E", // checked set row / completed (brighter pop)
        successDark: "#143222", // checked row background tint
        danger: "#FF453A", // discard / destructive
        muted: "#8A94A6", // grey-blue secondary text
        faint: "#5B6675", // grey tertiary / placeholders
      },
      fontFamily: {
        // Outfit (geometric, modern) loaded via next/font in app/layout.tsx.
        sans: [
          "var(--font-outfit)",
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

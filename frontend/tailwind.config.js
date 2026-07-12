/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Near-black surfaces from the mockups
        ink: {
          900: "#0a0a0b",
          800: "#141416",
          700: "#1c1c1f",
          600: "#26262b",
          500: "#33333a",
        },
        // Orange accent (primary action / active nav)
        accent: {
          DEFAULT: "#f97316",
          hover: "#fb8b3c",
          soft: "#fed7aa", // cream/tan used for the active sidebar item
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "ui-sans-serif", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

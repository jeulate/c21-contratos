import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: { 50: "#faf8f2", 100: "#f1ece0", 300: "#bfb48c", 400: "#b6a888", 500: "#BEAF87", 600: "#a28d5b", 700: "#82744f" },
        carbon: { 50: "#f7f7f7", 100: "#f0f0f0", 200: "#E6E7E8", 300: "#d1d1d2", 400: "#b6b6b8", 500: "#808285", 600: "#5e5f63", 700: "#43454b", 800: "#3d3935", 900: "#252526", 950: "#000000" },
        ink: { DEFAULT: "#252526", soft: "#4a4a4c", mute: "#76767a" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;

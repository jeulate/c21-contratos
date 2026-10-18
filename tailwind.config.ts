import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: { 50: "#faf8f2", 100: "#f1ece0", 300: "#d9cfb3", 500: "#beaf87", 600: "#a39369", 700: "#82744f" },
        ink: { DEFAULT: "#252526", soft: "#4a4a4c", mute: "#76767a" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;

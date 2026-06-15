import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f6f0e7",
        ink: "#27211c",
        muted: "#70675f",
        line: "#ded2c2",
        sage: "#687262",
        clay: "#9c6a52"
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(39, 33, 28, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

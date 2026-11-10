/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Master Prompt Global Color Tokens (Dark default)
        nexus: {
          bg: "#0B1120",
          sidebar: "#0D1627",
          card: "#111C30",
          elevated: "#1A2940",
          border: "#26354B",
          // Brand
          primary: "#386BFF",
          secondary: "#7657F6",
          hover: "#4C7DFF",
          // Text
          text: "#F1F5FC",
          muted: "#94A3B8",
          dim: "#64748B",
          // Trading indicators
          profit: "#00C087",
          loss: "#F04452",
          neutral: "#F5B942",
        },
        // Light Theme tokens
        nexusLight: {
          bg: "#F5F7FB",
          sidebar: "#FFFFFF",
          card: "#FFFFFF",
          elevated: "#EDF2F7",
          border: "#E2E8F0",
          text: "#172033",
          muted: "#64748B",
          dim: "#94A3B8",
          profit: "#008F68",
          loss: "#DC3545",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Manrope", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";
// @ts-ignore
import { semanticColors } from "../../packages/ui-components/tailwind-theme";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/styles/**/*.css",
    "../../packages/ui-components/src/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: semanticColors,
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      zIndex: {
        'dropdown': '9999',
        'sticky': '9998',
        'overlay': '10000',
        'modal': '10200',
        'popover': '10100',
        'tooltip': '10300',
        'notification': '10400',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;

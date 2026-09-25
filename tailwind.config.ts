import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cado: {
          purple: "#A14B92",          // Color Primario (20%)
          "purple-hover": "#8C3C7E",
          silver: "#B3BFBF",          // Color Secundario Gris Cromo (15%)
          "silver-light": "#F6F8F8",
          "silver-border": "#E2E7E7",
          dark: "#513D49",            // Deep Plum / Carbono (5%)
          "dark-hover": "#412E3B",
          white: "#FFFFFF",           // Blanco predominante (60%)
          text: "#333333",
          muted: "#666666",
          accent: "#A14B92",
          emerald: "#10B981",
          amber: "#F59E0B",
          red: "#DC2626",
        },
      },
      fontFamily: {
        // Tipografía de lectura oficial: Montserrat
        sans: ['var(--font-montserrat)', 'Montserrat', 'sans-serif'],
        // Tipografía primaria de títulos: Romaria Stylish (Cormorant Garamond fallback)
        title: ['"Romaria Stylish"', 'var(--font-cormorant)', 'serif'],
        display: ['"Romaria Stylish"', 'var(--font-cormorant)', 'serif'],
        // Tipografía secundaria de citas/destacados: Bright Sunshine (Caveat fallback)
        script: ['"Bright Sunshine"', 'var(--font-caveat)', 'cursive'],
        // Tipografía para testimonios: Poppins
        testimonial: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

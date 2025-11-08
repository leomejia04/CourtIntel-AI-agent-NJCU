/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#0A2342",
        ink: "#000000",
        accent: "#1F4FFF",
        textPrimary: "#F3F4F6"
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "Roboto",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "\"Helvetica Neue\"",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};


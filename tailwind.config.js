/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navbarFooter: "#fca211", // HSB(37,93,99)
        containerBg: "#14213d", // HSB(221,67,24)
        pageBg: "#000000", // HSB(0,0,0)
        textColor: "#ffffff", // HSB(0,0,100)
        black: "#000000",
        navyBlue: "#14213D",
        orange: "#FCA311",
        lightGray: "#E5E5E5",
        white: "#FFFFFF",
      },
      boxShadow: {
        "navbar-footer": " 0px 0px 46px -2px rgba(252,162,17,0.4)", // Using the navbarFooter color with opacity
      },
    },
  },
  plugins: [],
};

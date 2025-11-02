/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animations: {
    },
    colors: {
      white: '#FFFFFF', 
      black: '#000000',
      green: '#AFC02B',
      red: '#DE4646',
      text:{
        primary: '#FFFFFF', 
        secondary: '#B9B9B9',
        tertiary: '#575757'
      },
      panels:{
        bg : '#2F2F2F', 
        stroke :{
          subtle: '#B9B9B9',
          strong: '#3C3C3C',
        },
      },
      btn:{
        face: '#444444',
        inner: '#2F2F2F',
      },
    },
  },
  plugins: [],
} 
};
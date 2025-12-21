/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                paper: '#f2f0e9',
                surface: '#ffffff',
                'surface-alt': '#f3f4f6',
                primary: '#14b8a6', // teal-500
                secondary: '#f59e0b', // amber-500
                accent: '#f43f5e', // rose-500
                ink: {
                    DEFAULT: '#334155', // slate-700
                    muted: '#64748b',   // slate-500
                    border: '#e2e8f0'   // slate-200
                }
            },
            boxShadow: {
                'datepicker': '0 20px 60px rgba(0, 0, 0, 0.15)',
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
                hand: ['Caveat', 'cursive'],
            }
        },
    },
    plugins: [],
}

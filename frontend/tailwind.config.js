/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'navy': '#14213d',
                'primary-blue': '#2962ff',
                'accent-cyan': '#00c2ff',
                'accent-orange': '#ff6b35',
                'admin-purple': '#7c3aed',
            }
        },
    },
    plugins: [],
}


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
            },
            keyframes: {
                'fade-scale': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(-50%) scale(0.95)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(-50%) scale(1)'
                    }
                }
            },
            animation: {
                'fade-scale': 'fade-scale 0.2s ease-out'
            }
        },
    },
    plugins: [],
}


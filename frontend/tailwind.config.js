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
                // New Material Design 3 theme colors for Auth Pages
                "on-secondary": "#ffffff",
                "secondary": "#006c49",
                "on-primary-container": "#dad7ff",
                "surface-variant": "#dbe2f9",
                "outline-variant": "#c7c4d8",
                "on-error": "#ffffff",
                "surface-container-highest": "#dbe2f9",
                "on-secondary-container": "#00714d",
                "secondary-container": "#6cf8bb",
                "on-tertiary": "#ffffff",
                "on-primary-fixed": "#0f0069",
                "error": "#ba1a1a",
                "tertiary-fixed": "#ffdbcc",
                "inverse-surface": "#293041",
                "secondary-fixed": "#6ffbbe",
                "on-primary-fixed-variant": "#3323cc",
                "on-tertiary-fixed": "#351000",
                "on-primary": "#ffffff",
                "surface": "#f9f9ff",
                "surface-container-lowest": "#ffffff",
                "on-secondary-fixed-variant": "#005236",
                "tertiary-container": "#a44100",
                "surface-container": "#e9edff",
                "outline": "#777587",
                "tertiary": "#7e3000",
                "surface-container-high": "#e0e8ff",
                "primary": "#3525cd",
                "tertiary-fixed-dim": "#ffb695",
                "inverse-on-surface": "#edf0ff",
                "inverse-primary": "#c3c0ff",
                "surface-tint": "#4d44e3",
                "on-background": "#141b2c",
                "surface-dim": "#d2daf0",
                "primary-fixed-dim": "#c3c0ff",
                "primary-container": "#4f46e5",
                "on-tertiary-fixed-variant": "#7b2f00",
                "on-secondary-fixed": "#002113",
                "surface-container-low": "#f1f3ff",
                "error-container": "#ffdad6",
                "primary-fixed": "#e2dfff",
                "surface-bright": "#f9f9ff",
                "on-tertiary-container": "#ffd2be",
                "on-surface": "#141b2c",
                "secondary-fixed-dim": "#4edea3",
                "on-surface-variant": "#464555",
                "on-error-container": "#93000a",
                "background": "#f9f9ff",
                // Landing Page Specific Tokens
                "alabaster": "#F8F9FA",
                "slate-custom": "#1E293B",
                "indigo-accent": "#4F46E5",
                "emerald-accent": "#10B981",
                "border-subtle": "#E2E8F0"
            },
            fontFamily: {
                "headline": ["Syne", "Plus Jakarta Sans", "sans-serif"],
                "body": ["DM Sans", "Inter", "sans-serif"],
                "label": ["Inter", "sans-serif"]
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


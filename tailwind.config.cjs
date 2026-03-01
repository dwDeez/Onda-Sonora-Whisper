module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#06f994',
                    dark: '#00CC76',
                    dim: 'rgba(6, 249, 148, 0.1)',
                },
                accent: '#FF2A6D',
                system: '#05D9E8',
                void: '#050505',
                surface: {
                    DEFAULT: '#121212',
                    highlight: '#1a1a1a',
                },
                muted: '#525252',
                'cyber-blue': '#05D9E8',
                'background-light': '#f5f8f7',
                'background-dark': '#050505',
            },
            fontFamily: {
                display: ["Space Grotesk", "sans-serif"],
                mono: ["Space Mono", "monospace"],
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'breathe': 'breathe 3s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            boxShadow: {
                'glow-primary': '0 0 20px rgba(6, 249, 148, 0.4)',
                'glow-accent': '0 0 15px rgba(255, 42, 109, 0.4)',
                'glow-system': '0 0 20px rgba(5, 217, 232, 0.3)',
                'neon': '0 0 15px rgba(6, 249, 148, 0.15)',
                'neon-hover': '0 0 20px rgba(6, 249, 148, 0.3)',
                'error': '0 0 15px rgba(255, 42, 109, 0.15)',
            },
            keyframes: {
                breathe: {
                    '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
                    '50%': { transform: 'scale(1.05)', opacity: '1' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(0, 255, 148, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(0, 255, 148, 0.6)' },
                },
            },
        },
    },
    plugins: [],
}

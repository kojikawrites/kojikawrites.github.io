/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			keyframes: {
				blur: {
					'0%': { filter: "blur(0px) opacity(1.0)" },
					'100%': { filter: "blur(1.25px) opacity(0.75)" },
				},
				sharpen: {
					'0%': { filter: "blur(1.25px) opacity(0.75)" },
					'100%': { filter: "blur(0px) opacity(1.0)" },
				}
			},
			animation: {
				blur: 'blur 250ms linear forwards',
				sharpen: 'sharpen 150ms linear forwards',
			}
		},
	},
	plugins: [],
}

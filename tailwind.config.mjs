import { config as dotenvConfig } from 'dotenv';

// Load environment variables to get SITE_CODE
dotenvConfig();
const siteCode = process.env.SITE_CODE;

if (!siteCode) {
	throw new Error('SITE_CODE not configured in .env file');
}

/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
		`./src/.sites/${siteCode}/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}`,
	],
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
	safelist: [
        'favicon-link-img',
        // despite the build warning, this part is important.
        {
            pattern: /^post.*(?:list|card)$/,
            // Variants you could specify if these were real Tailwind classes:
            // variants: ['sm', 'md', 'lg', 'hover', 'focus'],
        },
        {
            pattern: /^(font|color|text|icon)-[\w-]+$/
        },
	],
}

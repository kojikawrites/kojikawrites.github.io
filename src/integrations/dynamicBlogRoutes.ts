import type { AstroIntegration } from 'astro';
import fs from 'fs';
import path from 'path';
import jsYaml from 'js-yaml';

/**
 * Get site code from environment variables
 */
function getSiteCode(): string {
    const siteCode = process.env.SITE_CODE;
    if (siteCode) {
        return siteCode;
    }
    try {
        const hostname = new URL(process.env.VITE_SITE_NAME || '').hostname;
        if (hostname) return hostname;
    } catch (e) {
        // URL parsing failed
    }
    throw new Error('SITE_CODE not configured');
}

/**
 * Load site configuration from YAML file directly (avoiding Vite import issues)
 */
function loadSiteConfig(siteCode: string): any {
    const configPath = path.resolve(`src/.sites/${siteCode}/config/site.yaml`);
    if (!fs.existsSync(configPath)) {
        return {};
    }
    const yamlString = fs.readFileSync(configPath, 'utf8');
    return jsYaml.load(yamlString);
}

/**
 * Astro integration that dynamically injects blog routes based on site config.
 *
 * This allows the blog.path config option to control the URL path where blog
 * posts are served. Routes are injected at the configured path pointing to
 * the route templates in src/routes/blog/.
 */
export default function dynamicBlogRoutes(): AstroIntegration {
    return {
        name: 'dynamic-blog-routes',
        hooks: {
            'astro:config:setup': async ({ injectRoute }) => {
                const siteCode = getSiteCode();
                const siteConfig = loadSiteConfig(siteCode);
                // Normalize blog path - strip trailing slash, default to 'blog'
                const blogPath = (siteConfig.blog?.path || 'blog').replace(/\/$/, '');

                console.log(`[dynamic-blog-routes] Injecting blog routes at path: /${blogPath}/`);

                // Inject individual blog post route
                injectRoute({
                    pattern: `/${blogPath}/[...categories]/[year]/[month]/[day]/[slug]`,
                    entrypoint: './src/routes/blog/[...categories]/[year]/[month]/[day]/[slug].astro',
                });

                // Inject blog listing route with pagination
                injectRoute({
                    pattern: `/${blogPath}/[...page]`,
                    entrypoint: './src/routes/blog/[...page].astro',
                });

                // Inject archive route
                injectRoute({
                    pattern: `/${blogPath}/archive`,
                    entrypoint: './src/routes/blog/archive.astro',
                });
            },
        },
    };
}

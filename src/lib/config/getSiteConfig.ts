import {getJson} from "./getJson.ts";
import {getSiteCode} from "./getSiteCode.ts";

// Type definitions for site config
interface ThemedImage {
    dark: string;
    light: string;
    alt: string;
    dynamic_dir: string; // TODO
}

interface NavbarEntry {
    href: string;
    label: string;
}

interface SiteConfig {
    main: {
        logo: {
            alt: string;
            dynamic_dir: string;
        }
    };
    build: {
        exclude_from_production: string[];
    };
    blog: {
        pagination_size: number;
        path: string;
        prefix: string;
        small_mode: string;
        large_mode: string;
        default_author: string;
    };
    navbar: {
        logo: ThemedImage;
        left: NavbarEntry[];
        right: NavbarEntry[];
        breadcrumbs: {
            include: boolean;
            valid_breadcrumbs: NavbarEntry[];
        };
    };
    footer: {
        content: string[];
    };
    bluesky: {
        include: boolean;
        hashtag_link: string;
        auto_post_text: string;
    };
    facebook: {
        include: boolean;
        app_id: string;
    };
    tags_and_categories: {
        aliases: any;
    };
    search: {
        include: boolean;
    };
    rss: {
        include: boolean;
        site: {
            name: string;
            description: string;
        }
    };
}

export async function getSiteConfig() {
    const site = getSiteCode();

    // Load YAML config using inline import.meta.glob (to avoid config-time loading issues)
    const yamlGlobs = import.meta.glob<SiteConfig>('/src/.sites/**/config/site.yaml');
    const yamlKeys = Object.keys(yamlGlobs);
    const matchingKey = yamlKeys.find(key => key.includes(`.sites/${site}`));

    if (!matchingKey) {
        console.warn(`No yaml found for ${site}...`);
        return null;
    }

    const config = await yamlGlobs[matchingKey]();

    // Process breadcrumbs
    if (config.navbar && config.navbar.breadcrumbs) {
        // Retrieve the current valid_breadcrumbs array
        const validBreadcrumbs: NavbarEntry[] = config.navbar.breadcrumbs.valid_breadcrumbs || [];
        const frontmatterData = await getJson(site, 'frontmatter.json');

        // Iterate over each entry in the frontmatter JSON
        for (const entry of Object.entries(frontmatterData)) {
            const href = entry[0];
            const label = entry[1];
            // Add a new NavbarEntry only if an entry with the same href is not already present
            if (!validBreadcrumbs.some(entry => entry.href === href)) {
                validBreadcrumbs.push({ href, label });
                console.log('Adding Breadcrumb: ', { href, label });
            }
        }
        // Update the config with the new list of breadcrumbs
        config.navbar.breadcrumbs.valid_breadcrumbs = validBreadcrumbs;
    }

    return config;
}

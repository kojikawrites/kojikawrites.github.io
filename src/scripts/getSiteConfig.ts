import {getJson} from "./getJson.ts";

export function getSiteCode(): string {
    // Try import.meta.env.SITE first (Astro runtime)
    if (typeof import.meta !== 'undefined' && import.meta.env?.SITE) {
        return import.meta.env.SITE
            .replace(/^.*?\/\//, '') // Remove the protocol
            .split('/')[0]            // Extract the domain name
            .replace(/\s/g, '');      // Remove all whitespace characters
    }

    // Fall back to SITE_CODE environment variable (for build scripts, etc.)
    // Try import.meta.env.SITE_CODE first, then process.env.SITE_CODE
    const siteCode = (typeof import.meta !== 'undefined' && import.meta.env?.SITE_CODE)
        || (typeof process !== 'undefined' && process.env?.SITE_CODE);

    if (siteCode) {
        return siteCode.replace(/\s/g, ''); // Remove all whitespace characters
    }

    // Default fallback
    return 'hiivelabs.com';
}

export async function getSiteConfig() {
    const site = getSiteCode();
    interface ThemedImage {
        dark: string;
        light: string;
        alt: string;
        dynamic_dir: string; //TODO ARTEMP
    }
    interface NavbarEntry {
        href: string;
        label: string;
    }

    const yamlGlobs = import.meta.glob<{
        main: {
            alt: string;
            dynamic_dir: string;
        }
        blog: {
            pagination_size: number;
            path: string;
            prefix: string;
            small_mode: string;
            large_mode: string;
            default_author: string;
        };
        navbar: {
            logo: ThemedImage,
            left: NavbarEntry[];
            right: NavbarEntry[];
            breadcrumbs: {
                include: boolean
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
        }
        tags_and_categories : {
            aliases: any;
        };
        search : {
           include: boolean;
        };
        rss: {
            include: boolean;
            site: {
                name: string;
                description: string;
            }
        }

        default: any
    }>('/src/assets/config/*.yml');
    const yamlKeys = Object.keys(yamlGlobs);
    const matchingKey = yamlKeys.find(key => key.includes(site));

    if (!matchingKey) {
        console.warn(`No yaml found for ${site}...`);
    }
    // console.log(`Reading ${site} yaml config...`);
    // return await yamlGlobs[matchingKey]().then(y => {
    //         return y;
    //     }
    // );
    return await yamlGlobs[matchingKey]().then(async (config) => {

        // Ensure that the config has a navbar with breadcrumbs.
        if (config.navbar && config.navbar.breadcrumbs) {
            // Retrieve the current valid_breadcrumbs array.
            const validBreadcrumbs: NavbarEntry[] = config.navbar.breadcrumbs.valid_breadcrumbs || [];
            const frontmatterData = await getJson(site, 'frontmatter.json');

            // console.log('frontmatterData', frontmatterData);
            // Iterate over each entry in the frontmatter JSON.
            for (const entry of Object.entries(frontmatterData)) {

                const href = entry[0];
                const label = entry[1];
                // Add a new NavbarEntry only if an entry with the same href is not already present.
                if (!validBreadcrumbs.some(entry => entry.href === href)) {
                    validBreadcrumbs.push({ href, label });
                    console.log('Adding Breadcrumb: ', { href, label });
                }
            }
            // Update the config with the new list of breadcrumbs.
            config.navbar.breadcrumbs.valid_breadcrumbs = validBreadcrumbs;
        }

        //console.log(config.navbar.breadcrumbs.valid_breadcrumbs);

        return config;
    });
}

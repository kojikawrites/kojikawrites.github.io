import {getJson} from "./getJson.ts";

export function getSiteCode(): string {
    return import.meta.env.SITE
        .replace(/^.*?\/\//, '') // Remove the protocol
        .split('/')[0]            // Extract the domain name
        .replace(/\s/g, '');      // Remove all whitespace characters;
}

export async function getSiteConfig() {
    const site = getSiteCode();
    interface ThemedImage {
        dark: string;
        light: string;
        alt: string;
    }
    interface NavbarEntry {
        href: string;
        label: string;
    }

    const yamlGlobs = import.meta.glob<{
        blog: {
            pagination_size: number;
            path: string;
            prefix: string;
            small_mode: string;
            large_mode: string;
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

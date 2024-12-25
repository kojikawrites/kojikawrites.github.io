
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
        };
        navbar: {
            logo: ThemedImage,
            left: NavbarEntry[];
            right: NavbarEntry[];
            breadcrumbs: {
                include: boolean
                valid_breadcrumbs: string[];
            };
        };
        footer: {
            content: string[];
        };
        bluesky: {
            include: boolean;
            hashtag_link: string;
        };
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
    return await yamlGlobs[matchingKey]().then(y => {
            return y;
        }
    );
}

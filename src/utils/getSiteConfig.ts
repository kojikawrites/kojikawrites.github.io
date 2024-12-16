// import { parse, stringify } from 'yaml'

export function getSiteCode(): string {
    return import.meta.env.SITE.replace(/^.*?\/\//, '').split('/')[0];
}

export async function getSiteConfig() {
    const site = getSiteCode();

    interface ThemedImage {
        dark: string;
        light: string;
        alt: string;
    }
    interface NavbarEntry {
        code: string;
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
        };
        footer: {
            content: string[];
        };
        bluesky: {
            include: boolean;
        }
        tags_and_categories : {
            aliases: any;
        }

        default: any
    }>('/src/assets/config/*.yml');
    const yamlKeys = Object.keys(yamlGlobs);
    const matchingKey = yamlKeys.find(key => key.includes(site));
    if (!matchingKey) {
        console.warn(`No yaml found for ${site}`);
    }
    console.log(`Reading ${site} yaml config...`);
    return await yamlGlobs[matchingKey]().then(y => {
            return y;
        }
    );
}

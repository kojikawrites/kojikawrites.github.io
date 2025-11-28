import {getSiteCode} from "./getSiteCode.ts";
import {siteGlob} from "../utils/siteGlob.ts";
import {getAllPageTitles} from '../content/getAllPageTitles';

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
//    console.log('getSiteConfig:site:', site);
    const siteYamlFilter = (eager:boolean) => eager //  '../../.sites/**/styles/custom.css',
        ? import.meta.glob<SiteConfig>('/src/.sites/**/config/site.yaml', { eager: true })
        : import.meta.glob<SiteConfig>('/src/.sites/**/config/site.yaml'); // <-- usual case

    const config = await siteGlob<SiteConfig>({
        siteCode: site,
        type: 'yaml',
        filename: 'site.yaml',
        globFilter: siteYamlFilter,
    }) as SiteConfig;

    // console.log('getSiteConfig:config:', config.blog);

    // Process breadcrumbs
    if (config.navbar && config.navbar.breadcrumbs) {
        // Retrieve the current valid_breadcrumbs array
        const validBreadcrumbs: NavbarEntry[] = config.navbar.breadcrumbs.valid_breadcrumbs || [];
        const pageTitles = await getAllPageTitles();

        // Iterate over each page title
        for (const [href, label] of Object.entries(pageTitles)) {
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

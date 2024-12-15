import siteConfig from "../assets/config/site_config.yml"

const isDev = import.meta.env.DEV;

export default function getPosts() {
    const posts = () => {
        switch (siteConfig.blog_path) {
            case "posts":
                if (isDev) {
                    return import.meta.glob(
                        ['../assets/posts/**/*.{md,mdx}',
                            '!../assets/posts/**/_drafts/**'],
                        {eager: true});
                }
                return import.meta.glob(
                    ['../assets/posts/**/*.{md,mdx}',
                        '!../assets/posts/**/_drafts/**',
                        '!../assets/posts/**/_test/**'],
                    {eager: true});
            default:
                if (isDev) {
                    return import.meta.glob(
                        ['../assets/blog/**/*.{md,mdx}',
                            '!../assets/blog/**/_drafts/**'],
                        {eager: true});
                }
                return import.meta.glob(
                    ['../assets/blog/**/*.{md,mdx}',
                        '!../assets/blog/**/_drafts/**',
                        '!../assets/blog/**/_test/**'],
                    {eager: true});
        }

    };

    return Object.values(posts()).map((p: any) => p);
}

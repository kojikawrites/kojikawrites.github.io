import siteConfig from "../assets/config/site_config.yml"

export default function getPosts() {
    const posts = () => {
        switch (siteConfig.blog_path) {
            case "posts":
                return import.meta.glob(
                    ['../assets/posts/**/*.{md,mdx}',
                        '!../assets/posts/**/_drafts/**',
                        '!../assets/posts/**/_test/**'],
                    {eager: true});
            default:
                return import.meta.glob(
                    ['../assets/blog/**/*.{md,mdx}',
                        '!../assets/blog/**/_drafts/**',
                        '!../assets/blog/**/_test/**'],
                    {eager: true});
        }

    };

    return Object.values(posts()).map((p: any) => p);
}

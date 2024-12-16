import { getSiteConfig, getSiteCode } from "./getSiteConfig";

const siteConfig = await getSiteConfig();
const site = getSiteCode();
const blog_path = siteConfig.blog.path;

export default function getPosts(paginationSize: number | undefined) {
    const posts = () => {
        const allPosts = import.meta.glob(
            [`../assets/**/posts/**/*.{md,mdx}`,
             '../assets/**/blog/**/*.{md,mdx}',
             '!../assets/**/posts/**/_drafts/**',
             '!../**/assets/blog/**/_drafts/**'],
            {eager: true});
        if (paginationSize) {
            // paginate
        }
        return allPosts;
    };

    const pathFilter = `${blog_path}/${site}/`;
    let filteredPosts = Object.values(posts()).map((p: any) => p)
        .filter(p => p.file.includes(pathFilter))
    // filter out any dev mode.
    if (import.meta.env.PROD) {
        filteredPosts = filteredPosts.filter(p => !p.file.includes('/_test/'));
    }
    return filteredPosts;
}

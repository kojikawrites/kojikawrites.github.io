import rss, { pagesGlobToRssItems } from '@astrojs/rss';
import getPosts from "../utils/getPosts";

export async function GET(context) {
    const posts = getPosts();
    return rss({
        // `<title>` field in output xml
        title: 'Hiivelabs Blog',
        // `<description>` field in output xml
        description: 'A blog about ML, AI, Gamedev and other random stuff that crosses my mind.',
        // Pull in your project "site" from the endpoint context
        // https://docs.astro.build/en/reference/api-reference/#site
        site: context.site,
        railingSlash: false,
        // Array of `<item>`s in output xml
        // See "Generating items" section for examples using content collections and glob imports
        items: posts.map((post) => ({
            link: post.url,
            description: post.frontmatter.description,
            title: post.frontmatter.title,
        })),
        // (optional) inject custom xml
        customData: `<language>en-us</language>`,
    });
}

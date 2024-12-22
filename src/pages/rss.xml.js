import rss  from '@astrojs/rss';
import getPosts from "../scripts/getPosts";
// import {buildPermalink} from "../scripts/urlUtils";
import {getSiteConfig} from "../scripts/getSiteConfig";
import getPostData from "../scripts/getPostData";
import {createDateFromStrings} from "../scripts/dateUtils";
// <?xml-stylesheet href="/assets/xsl/rss-style-light.xsl" type="text/xsl"?>

export async function GET(context) {
    const siteConfig = await getSiteConfig();

    if (!siteConfig.rss.include) {
        // return Response.redirect(`${context.site}not-found`);
        return rss({
            title: "RSS is disabled on this site",
            description: "",
            site: context.site,
            items: [],
        });
    }

    const posts = getPosts();

    // console.log('context', context);
    return rss({
        // `<title>` field in output xml
        title: siteConfig.rss.site.name,
        // `<description>` field in output xml
        description: siteConfig.rss.site.description,
        // Pull in your project "site" from the endpoint context
        // https://docs.astro.build/en/reference/api-reference/#site
        site: context.site,
        trailingSlash: false,
        stylesheet: '/rss/rss-style-dark.xsl',
        // Array of `<item>`s in output xml
        items: posts.map((post) => {
            const { path, day, month, year } = getPostData(post);

            const publishDate = createDateFromStrings(day, month, year);

            const href = `/${siteConfig.blog.prefix}${path}`;
            // console.log(href);
            const categories = typeof post.frontmatter.categories == 'string'
                ? [post.frontmatter.categories] //.replace(' ', ',')
                : post.frontmatter.categories
            // console.log('categories', typeof categories);

            return {
                link: href,
                description: post.frontmatter.description,
                categories: categories,
                title: post.frontmatter.title,
                author: post.frontmatter.author,
                pubDate: publishDate,
            };
        }),
        // (optional) inject custom xml
        customData: `<language>en-us</language>`,
    });
}

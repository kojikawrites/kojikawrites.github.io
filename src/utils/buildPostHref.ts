import getPostData from "./getPostData";

import {getSiteConfig} from "./getSiteConfig";
const siteConfig = await getSiteConfig();

export default function buildPostHref(post, prefix='/') : string {
    const {  path } = getPostData(post);
    return `${prefix}${siteConfig.blog.prefix}${path}`
}

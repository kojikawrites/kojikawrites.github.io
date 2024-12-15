import siteConfig from "../assets/config/site_config.yml";
import getPostData from "./getPostData";

export default function buildPostHref(post, prefix='/') : string {
    const {  path } = getPostData(post);
    return `${prefix}${siteConfig.blog_prefix}${path}`
}

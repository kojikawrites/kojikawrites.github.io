import {extractKeyList} from "./keyUtils";

type Post = {
  title: string
  file: string
  frontmatter: any
}


function categoriesToPath(categories: string | string[]): string {

  if (categories == null)
  {
    return undefined;
  }
  const categoryArray: string[] = extractKeyList(categories);
  // Create a path from each entry by joining with '/' (have to use %2f)
  return categoryArray.join('/');
}


export default function getPostData(post: Post) {

  if (!post)
  {
    return null;
  }
  const pubDate = new Date(post.frontmatter.publishDate);

  // Parse out the year, month and day from the `pubDate`.
  const pubYear = String(pubDate.getUTCFullYear()).padStart(4, '0');
  const pubMonth = String(pubDate.getUTCMonth() + 1).padStart(2, '0');
  const pubDay = String(pubDate.getUTCDate()).padStart(2, '0');

  const originalFilename = post.file;
  const filename = post.file.split('/').pop().split('.').shift();
  const slug = (filename.match(/\d{4}-\d{2}-\d{2}-(.+)/) || [])[1] || filename;
  const categories = categoriesToPath(post.frontmatter.categories);
  const path = [categories, pubYear, pubMonth, pubDay, slug]
      .filter(Boolean)
      .join('/');

  return {
    year: pubYear,
    month: pubMonth,
    day: pubDay,
    categories: categories,
    title: post.frontmatter.title,
    originalFilename,
    path,
    slug,
  };
}

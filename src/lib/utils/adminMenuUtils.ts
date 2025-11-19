import { existsSync } from 'fs';
import { resolve } from 'path';
import { getSiteCode } from '../config/getSiteCode.ts';

export interface DevMenuInfo {
  editUrl: string;
  hasKeystatic: boolean;
}

export function getAdminMenuInfo(currentPath: string): DevMenuInfo {
  const siteCode = getSiteCode();
  let editUrl = '/edit'; // Default fallback
  let hasKeystatic = false;

  const pagesPath = resolve(`src/.sites/${siteCode}/content/pagecontent`);
  const postsPath = resolve(`src/.sites/${siteCode}/content/posts`);
  const draftsPath = resolve(`src/.sites/${siteCode}/content/posts/_drafts`);

  // Check if it's a blog post: /blog/[...categories]/[date]/[slug]
  const blogMatch = currentPath.match(/^\/blog\/(.+)\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/?$/);
  if (blogMatch) {
    const [_, categories, year, month, day, slug] = blogMatch;
    // Reconstruct the post item ID: YYYY-MM-DD-slug
    const itemId = `${year}-${month}-${day}-${slug}`;

    // Check both posts and drafts
    const postFile = resolve(postsPath, `${itemId}.mdx`);
    const draftFile = resolve(draftsPath, `${itemId}.mdx`);

    if (existsSync(postFile)) {
      hasKeystatic = true;
      editUrl = `/keystatic/collection/posts/item/${encodeURIComponent(itemId)}`;
    } else if (existsSync(draftFile)) {
      hasKeystatic = true;
      editUrl = `/keystatic/collection/drafts/item/${encodeURIComponent(itemId)}`;
    }
  }
  // Check if it's a standard page (e.g., /about, /contact, etc.)
  else if (currentPath !== '/' && !currentPath.startsWith('/blog') && !currentPath.startsWith('/admin') && !currentPath.startsWith('/keystatic') && !currentPath.startsWith('/api')) {
    // Remove leading/trailing slashes and use as item ID
    const pageId = currentPath.replace(/^\/|\/$/g, '');
    if (pageId) {
      const pageFile = resolve(pagesPath, `${pageId}.mdx`);
      if (existsSync(pageFile)) {
        hasKeystatic = true;
        editUrl = `/keystatic/collection/pages/item/${encodeURIComponent(pageId)}`;
      }
    }
  }
  // For homepage (maps to 'home' in Keystatic)
  else if (currentPath === '/') {
    const homeFile = resolve(pagesPath, 'home.mdx');
    if (existsSync(homeFile)) {
      hasKeystatic = true;
      editUrl = '/keystatic/collection/pages/item/home';
    }
  }

  return { editUrl, hasKeystatic };
}

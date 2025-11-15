// @ts-ignore
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(({ url, redirect }, next) => {
  // Redirect /edit to /keystatic (since Keystatic's basePath is hardcoded)
  if (url.pathname === '/edit' || url.pathname.startsWith('/edit/')) {
    const newPath = url.pathname.replace(/^\/edit/, '/keystatic');
    return redirect(newPath + url.search);
  }

  return next();
});

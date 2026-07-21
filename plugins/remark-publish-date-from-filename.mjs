export function remarkPublishDateFromFilename() {
    return function (tree, file) {

        const filename = file.history[0].split('/').pop().split('.').shift(); // e.g., '2023-10-05-my-blog-post'
        // Regular expression to match the date in the filename
        const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
        if (!match) {
            // throw new Error(`Invalid filename format: ${filename}`);
            return;
        }
        const dateString = match[1]; // Extracted date string (YYYY-MM-DD)
        file.data.astro.frontmatter.publishDate = new Date(dateString).toISOString();
        //console.log('file.data.astro.frontmatter.publishDate', file.data.astro.frontmatter.publishDate, dateString);
    }
}

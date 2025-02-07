import fs from "fs";
import path from "path";
const getSiteCode = () => {
    try {
        return new URL(import.meta.env.VITE_SITE_NAME ?? process.env.VITE_SITE_NAME).hostname;
    } catch (e) {
        return undefined;
    }
};

function extractSlug(filePath) {
    return path.basename(filePath, path.extname(filePath));
}

/**
 * Recursively scans a directory and returns an array of file paths.
 * @param {string} dir - The directory to scan.
 * @returns {string[]} - List of file paths.
 */
function getAllFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results; // Prevent errors if directory doesn't exist

    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(filePath));
        } else if (file.endsWith(".md") || file.endsWith(".astro") || file.endsWith(".mdx")) {
            results.push(filePath);
        }
    });

   //  console.log(results);

    return results;
}

/**
 * Extracts frontmatter from an array of file paths.
 * @param {string[]} files - List of files to process.
 * @returns {Record<string, object>} - A mapping of file paths to frontmatter data.
 */
function extractFrontmatter(files) {
    const frontmatterData = [];

    files.forEach((file) => {
        const title = extractTitleFromFrontmatter(file); // Extract frontmatter
        if (title) {
            frontmatterData.push(
                {
                    href: extractSlug(file),
                    title: title
                }
            );
        }

    });

    return frontmatterData;
}

/**
 * Extracts the title from the frontmatter of a file.
 * @param {string} filePath - Path to the file.
 * @returns {string|null} - The extracted title or null if not found.
 */
function extractTitleFromFrontmatter(filePath) {
    const astroDirRegex = /\[(?:\.\.\.)?[A-Za-z0-9_]+]/;
    const hasAstroDir = astroDirRegex.test(filePath);
    if (hasAstroDir) {
        return null;
    }
    const content = fs.readFileSync(filePath, "utf8");
    // Match frontmatter block at the top of the file
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]+?)\n---/m);
    // console.log(frontmatterMatch);
    if (!frontmatterMatch) return null; // No frontmatter found

    const frontmatter = frontmatterMatch[1];

    // Regex for extracting title from YAML
    const yamlTitleRegex = /\btitle\s*:\s*(['"`]?)([^\n'"]+)\1/m;
    const titleMatch = frontmatter.match(yamlTitleRegex);
    if (titleMatch) {
        console.log(`Extracted YAML title: "${titleMatch[2]}" from ${filePath}`);
        return titleMatch[2];
    }
    const jsTitleRegex = /(?:^|\n)\s*const\s+title\s*[:=]\s*(['"`])([^'"\n\r]*)\1\s*;?/i;
    const jsMatch = content.match(jsTitleRegex);
    if (jsMatch) {
        console.log(`Extracted JavaScript title: "${jsMatch[2]}" from ${filePath}`);
        return jsMatch[2];
    }

    console.warn(`No title found in: ${filePath}`);
    return null;
    // // Extract the YAML block and check for the title
    // const titleMatch = frontmatter.match(titleRegex);
    // console.log('titleMatch', titleMatch);
    // return titleMatch ? titleMatch[2] : null;
}


// Define the directories to check
const siteCode = getSiteCode();
const directories = [
    path.resolve("src/pages"),
    path.resolve(`src/assets/pagecontent/${siteCode}`),
    //path.resolve(`src/assets/posts/${siteCode}`)
];

console.log(directories);
// Scan both directories
let allFiles = directories.flatMap(getAllFiles);
let frontmatterData = extractFrontmatter(allFiles);

// Save the combined results to JSON
const outputPath = "src/data/frontmatter.json";
fs.writeFileSync(outputPath, JSON.stringify(frontmatterData, null, 2));

console.log(`✅ Frontmatter extracted and saved to ${outputPath}`);

export default frontmatterData;

import fs from "fs";
import path from "path";
import yaml from 'js-yaml';
import { loadEnv } from '../lib/config/loadEnv.ts';

// Load environment variables from root and site-specific .env files
loadEnv();

interface FileEntry {
    directory: string;
    filepath: string;
}

interface SiteConfig {
    build?: {
        exclude_from_production?: string[];
    };
}

export const getSiteCode = (): string => {
    // Try SITE_CODE first (preferred), then fall back to VITE_SITE_NAME
    const siteCode = process.env.SITE_CODE || import.meta.env?.SITE_CODE;
    if (siteCode) {
        return siteCode;
    }

    // Fall back to VITE_SITE_NAME (legacy)
    try {
        return new URL(import.meta.env.VITE_SITE_NAME ?? process.env.VITE_SITE_NAME).hostname;
    } catch (e) {
        return 'hiivelabs.com'; // Default fallback
    }
};

/**
 * Load site configuration from YAML file
 * @param siteCode - The site code (e.g., 'hiivelabs.com')
 * @returns The site configuration object
 */
function loadSiteConfig(siteCode: string): SiteConfig {
    const configPath = path.resolve(`src/.sites/${siteCode}/config/site.yaml`);
    if (!fs.existsSync(configPath)) {
        console.warn(`No config found for ${siteCode}, using defaults`);
        return {};
    }
    const yamlString = fs.readFileSync(configPath, 'utf8');
    return yaml.load(yamlString) as SiteConfig;
}

function extractSlug(entry: FileEntry): string {
    // Compute the path relative to the given directory.
    const directory = entry.directory;
    const filepath = entry.filepath;

    const relative = path.relative(directory, filepath); // e.g., "test/about.astro"

    // Parse the relative path into directory, filename, extension, etc.
    const parsed = path.parse(relative);

    // If the filename (without extension) is "index", then use only the directory part.
    // Otherwise, join the directory and the filename (without extension).
    let slug = parsed.name === 'index'
        ? parsed.dir
        : path.join(parsed.dir, parsed.name);

    // Ensure the slug starts with a leading slash if it's non-empty.
    if (slug && !slug.startsWith(path.sep)) {
        slug = path.sep + slug;
    }

    return slug;
}

/**
 * Recursively scans a directory and returns an array of file paths.
 * @param rootDir - The base directory of this search.
 * @param dir - The directory to scan.
 * @param excludeDirs - List of directory names to exclude from src/pages.
 * @returns List of file entries.
 */
function getAllFiles(rootDir: string, dir: string, excludeDirs: string[] = []): FileEntry[] {
    let results: FileEntry[] = [];
    if (!fs.existsSync(dir)) return results; // Prevent errors if directory doesn't exist

    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            // Skip excluded directories under src/pages
            if (rootDir.includes('src/pages') && excludeDirs.includes(file)) {
                return;
            }
            results = results.concat(getAllFiles(rootDir, filePath, excludeDirs));
        } else if (file.endsWith(".md") || file.endsWith(".astro") || file.endsWith(".mdx")) {
            results.push({
                directory: rootDir,
                filepath: filePath
            });
        }
    });

    return results;
}

/**
 * Extracts frontmatter from an array of file paths.
 * @param files - List of files to process.
 * @returns A mapping of file paths to frontmatter data.
 */
function extractFrontmatter(files: FileEntry[]): Record<string, string> {
    const frontmatterData: Record<string, string> = {};

    files.forEach((entry) => {
        const file = entry.filepath;
        const label = extractTitleFromFrontmatter(file); // Extract frontmatter
        // special case - we don't need to do this for 404
        if (label !== "404") {
            if (label) {
                const slug = extractSlug(entry);
                frontmatterData[slug] = label;
            }
        }
    });

    return frontmatterData;
}

/**
 * Extracts the title from the frontmatter of a file.
 * @param filePath - Path to the file.
 * @returns The extracted title or null if not found.
 */
function extractTitleFromFrontmatter(filePath: string): string | null {
    const astroDirRegex = /\[(?:\.\.\.)?[A-Za-z0-9_]+]/;
    const hasAstroDir = astroDirRegex.test(filePath);
    if (hasAstroDir) {
        return null;
    }
    const content = fs.readFileSync(filePath, "utf8");
    // Match frontmatter block at the top of the file
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]+?)\n---/m);
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
}


// Define the directories to check
const siteCode = getSiteCode();
const siteConfig = loadSiteConfig(siteCode);
const excludeDirs = siteConfig?.build?.exclude_from_production || [];

const directories = [
    path.resolve("src/pages"),
    path.resolve(`src/.sites/${siteCode}/content/pagecontent`),
];

// Scan all directories
let allFiles = directories.flatMap(directory => getAllFiles(directory, directory, excludeDirs));
let frontmatterData = extractFrontmatter(allFiles);

// Save the combined results to JSON
const outputPath = `src/.sites/${siteCode}/state/frontmatter.json`;
fs.writeFileSync(outputPath, JSON.stringify(frontmatterData, null, 2));

console.log(`✅ Frontmatter extracted and saved to ${outputPath}`);

export default frontmatterData;

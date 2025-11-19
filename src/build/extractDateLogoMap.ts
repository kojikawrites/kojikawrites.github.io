import fs from "fs";
import path from "path";
// import {getSiteCode} from "./extractPagesFrontMatter.ts";
import {getSiteCode} from "../lib/config/getSiteCode.ts";
import yaml from 'js-yaml';

import {getJson} from "../lib/config/getJson.ts";
import {getSiteStatePath} from "../lib/config/getSiteStatePath.ts";

interface LogoEntry {
    src: string;
    alt: string;
}

interface ThemeMap {
    [key: string]: LogoEntry;
}

interface LogoMap {
    [theme: string]: ThemeMap;
}

interface SiteConfig {
    main?: {
        logo?: {
            alt?: string;
            dynamic_dir?: string;
        };
    };
    navbar?: {
        logo?: {
            dark?: string;
            light?: string;
            alt?: string;
        };
    };
}

const siteCode = getSiteCode();

const yamlGlobs = import.meta.glob('/src/.sites/**/config/*.yaml');
const yamlKeys = Object.keys(yamlGlobs);
let matchingKey = yamlKeys.find(key => key.includes(`.sites/${siteCode}`));

if (!matchingKey) {
    console.warn(`No yaml found for ${matchingKey}...`);
}
if (matchingKey && matchingKey.startsWith('/')) {
    matchingKey = matchingKey.slice(1);
}

const yamlString = fs.readFileSync(path.resolve(matchingKey!), "utf8");

const config = yaml.load(yamlString) as SiteConfig;
let dynamic_dir = config?.main?.logo?.dynamic_dir;
if (dynamic_dir && dynamic_dir.startsWith('/')) {
    dynamic_dir = dynamic_dir.slice(1);
}

console.log(`logo dynamic_dir: ${dynamic_dir}...`);

const logoDir = path.resolve(dynamic_dir!);
const outputPath = getSiteStatePath("logo-map.json", siteCode);
const outputDir = path.dirname(outputPath);

// Ensure output path exists
fs.mkdirSync(outputDir, { recursive: true });

// Util: Extract theme from filename (e.g., "foo-dark.svg" => "dark")
function extractTheme(filename: string): string | null {
    const match = filename.match(/-(\w+)\.\w+$/);
    return match ? match[1] : null;
}

// Util: Normalize directory key (e.g. '' => 'default')
function directoryKey(folder: string): string {
    return folder === "" ? "default" : folder;
}

// Sort folders by specificity (more components + fewer wildcards = higher priority)
function getSpecificityScore(folder: string): number {
    return folder.split("-").reduce((acc, part) => acc + (part !== "xx" && part !== "xxxx" ? 1 : 0), 0);
}

function sortBySpecificity(folders: string[]): string[] {
    return folders.sort((a, b) => {
        const sa = getSpecificityScore(a);
        const sb = getSpecificityScore(b);
        return sb - sa;
    });
}

// Step 1: Gather all folders (including top-level)
const entries = fs.readdirSync(logoDir, { withFileTypes: true });
const folders = sortBySpecificity([
    ...entries.filter((e) => e.isDirectory()).map((e) => e.name),
    "" // Include root level
]);

// Step 2: Process each folder and record matching files
const logoMap: LogoMap = {};

for (const folder of folders) {
    const folderPath = folder === "" ? logoDir : path.join(logoDir, folder);
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const theme = extractTheme(file);
        if (!theme) continue;

        const themeMap = (logoMap[theme] ??= {});
        const key = directoryKey(folder);
        if (!themeMap[key]) {
            const relativePath = `/${dynamic_dir}/${folder ? folder + "/" : ""}${file}`;
            let altText = config.main?.logo?.alt || 'Logo'; // default fallback
            const altPath = path.join(folderPath, "alt.txt");
            if (fs.existsSync(altPath)) {
                altText = fs.readFileSync(altPath, "utf8").trim();
            }
            themeMap[key] = {
                src: relativePath,
                alt: altText,
            };
        }
    }
}

// Step 2.5: Ensure default logos exist for each theme
// If no dynamic logos found, or if a theme is missing a default, use navbar.logo values
const navbarLogo = config?.navbar?.logo;
if (navbarLogo) {
    const themes = ['dark', 'light'] as const;
    for (const theme of themes) {
        if (!logoMap[theme]) {
            logoMap[theme] = {};
        }

        // If no default logo exists for this theme, add it from navbar config
        if (!logoMap[theme].default && navbarLogo[theme]) {
            logoMap[theme].default = {
                src: navbarLogo[theme]!,
                alt: navbarLogo.alt || config.main?.logo?.alt || 'Logo'
            };
            console.log(`ℹ️  Added default ${theme} logo from navbar config`);
        }
    }
}

// Step 3: Write JSON file
fs.writeFileSync(outputPath, JSON.stringify(logoMap, null, 2));
console.log(`✅ Logo map written to: ${outputPath}`);

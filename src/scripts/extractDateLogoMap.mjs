import fs from "fs";
import path from "path";
import {getSiteCode} from "./extractPagesFrontMatter.mjs";
import yaml from 'js-yaml';

import {getJson} from "./getJson";
//import yaml from "js-yaml";
//
// const config = yaml.load(fs.readFileSync(yamlPath, "utf8"));
//
// const dynamicDirRaw = config?.main?.logo?.dynamic_dir;
// if (!dynamicDirRaw) {
//     throw new Error("Missing 'main.logo.dynamic_dir' in YAML config.");
// }
//
// const dynamicDir = path.resolve(dynamicDirRaw);
// if (!fs.existsSync(dynamicDir)) {
//     throw new Error(`Directory does not exist: ${dynamicDir}`);
// }

const siteCode = getSiteCode()

const yamlGlobs = import.meta.glob('/src/assets/config/*.yml');
const yamlKeys = Object.keys(yamlGlobs);
let matchingKey = yamlKeys.find(key => key.includes(siteCode));

if (!matchingKey) {
    console.warn(`No yaml found for ${matchingKey}...`);
}
if (matchingKey.startsWith('/')) {
    matchingKey = matchingKey.slice(1);
}

const yamlString = fs.readFileSync(path.resolve(matchingKey), "utf8");

const config = yaml.load(yamlString);
let dynamic_dir = config?.main?.logo?.dynamic_dir;
if (dynamic_dir.startsWith('/')) {
    dynamic_dir = dynamic_dir.slice(1);
}

// const dynamic_dir = yamlGlobs[matchingKey];
console.log(`logo dynamic_dir: ${dynamic_dir}...`);

// const logoDir = path.resolve(`src/assets/images/${siteName}/logos/dynamic`);
const logoDir = path.resolve(dynamic_dir);
const outputDir = path.resolve(`src/assets/_private/state/${siteCode}`);
const outputPath = path.join(outputDir, "logo-map.json");



// Ensure output path exists
fs.mkdirSync(outputDir, { recursive: true });

// Util: Extract theme from filename (e.g., "foo-dark.svg" => "dark")
function extractTheme(filename) {
    const match = filename.match(/-(\w+)\.\w+$/);
    return match ? match[1] : null;
}

// Util: Normalize directory key (e.g. '' => 'default')
function directoryKey(folder) {
    return folder === "" ? "default" : folder;
}

// Sort folders by specificity (more components + fewer wildcards = higher priority)
function getSpecificityScore(folder) {
    return folder.split("-").reduce((acc, part) => acc + (part !== "xx" && part !== "xxxx" ? 1 : 0), 0);
}
function sortBySpecificity(folders) {
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
const logoMap = {};

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
            themeMap[key] = relativePath;
        }
    }
}

// Step 3: Write JSON file
fs.writeFileSync(outputPath, JSON.stringify(logoMap, null, 2));
console.log(`✅ Logo map written to: ${outputPath}`);

import fs from 'fs';
import path from 'path';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import isAbsoluteUrl from 'is-absolute-url'

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const request = require('sync-request');

function getFaviconUrlSync(websiteUrl) {
    const faviconDomain = new URL(websiteUrl).hostname;
    const faviconUrls = [
        `https://icons.duckduckgo.com/ip3/${faviconDomain}.ico`,
        `https://api.faviconkit.com/${faviconDomain}/16`,
        `https://www.google.com/s2/favicons?sz=16&domain=${faviconDomain}`,
        `https://${faviconDomain}/favicon.ico`,

    ];

    for (const url of faviconUrls) {
        try {
            // Add strictSSL: false to bypass certificate verification
            const res = request('HEAD', url, { timeout: 5000, strictSSL: false });
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // console.log(`Using favicon (${url})`);
                return url;
            }
        } catch (e) {
            //console.warn(`Failed to fetch ${url}: ${e.message}`);
        }
    }

    //console.warn(`No valid favicon found for ${websiteUrl}`);
    return null;
}

/**
 * Determines the file extension based on the content type header.
 * Falls back to extracting the extension from the URL's pathname.
 *
 * @param {string} contentType - The Content-Type header from the HTTP response.
 * @param {string} faviconUrl - The original favicon URL.
 * @returns {string} - The file extension without the dot.
 */
function getFileExtension(contentType, faviconUrl) {
    if (contentType) {
        // Remove any charset info, e.g. "image/png; charset=utf-8"
        const ct = contentType.split(';')[0].trim();
        switch (ct) {
            case 'image/png':
                return 'png';
            case 'image/jpeg':
            case 'image/jpg':
                return 'jpg';
            case 'image/gif':
                return 'gif';
            case 'image/svg+xml':
                return 'svg';
            case 'image/x-icon':
            case 'image/vnd.microsoft.icon':
                return 'ico';
            default:
                break;
        }
    }
    // Fallback: try to get extension from the URL's pathname
    const parsedUrl = new URL(faviconUrl);
    const ext = path.extname(parsedUrl.pathname);
    if (ext) {
        return ext.slice(1); // Remove the leading dot
    }
    // Default to ico if nothing else works
    return 'ico';
}

/**
 * Downloads the favicon synchronously.
 *
 * @param {string} faviconUrl - The URL to fetch the favicon from.
 * @param {string} fileNameNoExt - The filename to save the file to.
 * @param {string} outputDir - The directory where the file should be saved.
 * @returns {string|null} - The full file path of the saved favicon, or null if failed.
 */
function downloadFaviconSync(faviconUrl, fileNameNoExt, outputDir) {
    // Ensure the output directory exists.
    if (!fs.existsSync(outputDir)) {
        throw new Error(`Output directory does not exist: ${outputDir}`);
    }

    try {
        // Download the favicon via a synchronous GET request.
        const res = request('GET', faviconUrl, { timeout: 5000, strictSSL: false });
        if (res.statusCode >= 200 && res.statusCode < 300) {
            // Retrieve the content type from headers.
            const contentType = res.headers['content-type'];
            // Determine the file extension.
            const fileExt = getFileExtension(contentType, faviconUrl);
            // Construct the full file name and path.
            const fileName = `${fileNameNoExt}.${fileExt}`;
            const filePath = path.join(outputDir, fileName);
            // Write the fetched data to file.
            fs.writeFileSync(filePath, res.getBody());
            console.log(`Favicon downloaded to ${filePath}`);
            return filePath;
        } else {
            console.warn(`GET request failed for ${faviconUrl} with status ${res.statusCode}`);
            return null;
        }
    } catch (e) {
        console.error(`Failed to download favicon from ${faviconUrl}: ${e.message}`);
        return null;
    }
}

const defaultProtocols = ['http', 'https'];

function getSpaceNode (breaking) {
    return {
        type: 'text',
        value: breaking ? ' ' : '\u00a0',
    }
}

function splitLastWord(node) {
    // Only process text nodes.
    if (node.type !== 'text') return [node];

    const text = node.value;
    // This regex splits the text into three groups:
    // Group 1: everything (lazily) before the last breakable sequence.
    // Group 2: the breakable sequence (one or more whitespace or hyphen characters).
    // Group 3: the last word (one or more non-breakable characters).
    const regex = /^(.*?)([\s-]+)(\S+)$/;
    const match = text.match(regex);

    // If no match is found, there is no breakable boundary; return the original node.
    if (!match) {
        return [node];
    }

    const leftPart = match[1];
    // We intentionally discard match[2] (the breakable characters)
    // because we'll insert an explicit non-breaking space instead.
    const rightPart = match[3];

    // Build the new nodes. Here we simply copy the original node's properties,
    // though in a more refined implementation you might want to adjust position data.
    // const leftNode = { ...node, value: leftPart };
    // const nbspNode = { ...node, value: '\u00a0' };
    // const rightNode = { ...node, value: lastWord };

    const leftNode = {
        ...node,
        value: leftPart,
        // Shallow-clone the position so each node has its own copy.
        position: node.position ? { ...node.position } : undefined
    };

    const rightNode = {
        ...node,
        value: rightPart,
        position: node.position ? { ...node.position } : undefined
    };

    return [leftNode, getSpaceNode(true), rightNode];
}

function addClassToSpecificNodeType(node, nodeTag, newClass) {
    // Check if this node is an SVG element.
    if (node.type === 'element' && node.tagName === nodeTag) {
        // Ensure the properties object exists.
        if (!node.properties) {
            node.properties = {};
        }
        // Normalize className to an array if necessary.
        if (!node.properties.className) {
            node.properties.className = [newClass];
        } else if (typeof node.properties.className === 'string') {
            node.properties.className = [node.properties.className];
            if (!node.properties.className.includes(newClass)) {
                node.properties.className.push(newClass);
            }
        } else if (Array.isArray(node.properties.className)) {
            if (!node.properties.className.includes(newClass)) {
                node.properties.className.push(newClass);
            }
        }
    }

    // Recursively process child nodes, if any.
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => addClassToSpecificNodeType(child, nodeTag, newClass));
    }
    return node;
}

function findFirstSvg(node) {
    // Check if the current node is an SVG element.
    if (node.type === 'element' && node.tagName === 'svg') {
        return node;
    }
    // If the node has children, traverse them.
    if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
            const found = findFirstSvg(child);
            if (found) {
                return found;
            }
        }
    }
    // Return null if no svg node is found in this branch.
    return null;
}


function loadSvgContent(svgFilename, svgProps) {

    // Read the SVG file content
    const svg = fs.readFileSync(svgFilename, 'utf8');
    // // Parse the SVG content into HAST
    let svgHast = unified()
        .use(rehypeParse, { fragment: true, space: 'svg' })
        .parse(svg)
    svgHast = findFirstSvg(svgHast);
    svgHast = addClassToSpecificNodeType(svgHast, 'svg', 'with-before');
    svgHast = addClassToSpecificNodeType(svgHast, 'svg','inline');
    // console.log('svgHast.properties BEFORE', svgHast.properties);
    svgHast.properties = { ...(svgHast.properties || {}), ...svgProps }
    // console.log('svgHast.properties AFTER', svgHast.properties);
    return svgHast;
}

function isDownloadLink(pathString) {
    // List of common webpage extensions to exclude.
    const excludedExtensions = new Set([
        "html", "htm", "asp", "aspx", "php", "jsp", "shtml", "cfm", "cfml", "xhtml"
    ]);

    try {
        // Use the URL API to parse the URL and extract the pathname.
        const url = new URL(pathString);
        const pathname = url.pathname; // e.g., "/" or "/some/file.pdf"
        // Remove empty segments (which can happen if the path starts/ends with a slash).
        const segments = pathname.split('/').filter(Boolean);
        // If there are no segments or the last segment lacks a dot, assume no file extension.
        if (segments.length === 0) {
            return false;
        }
        const lastSegment = segments[segments.length - 1];
        if (!lastSegment.includes('.')) {
            return false;
        }

        // Match the file extension at the end of the last segment.
        const match = lastSegment.toLowerCase().match(/\.([^./?\\]+)$/);
        if (!match) {
            return false;
        }
        const extension = match[1].toLowerCase();

        // Heuristic: if the last segment contains more than one dot and the extension is longer than 4 letters,
        // treat it as not a file. This prevents misclassifying routes like
        // "blah.bsky.social" as downloadable.
        const parts = lastSegment.split('.');
        if (parts.length > 2 && extension.length > 4) {
            return false;
        }

        const isDownload = !excludedExtensions.has(extension);
        return isDownload;
    } catch (e) {
        // Fallback for strings that aren’t valid URLs.
        const match = pathString?.toLowerCase().match(/\.([^./?\\]+)(?:[?#]|$)/);
        if (!match) {
            return false;
        }
        const extension = match[1].toLowerCase();
        const parts = pathString.split('.');
        if (parts.length > 2 && extension.length > 4) {
            return false;
        }
        const isDownload = !excludedExtensions.has(extension);
        return isDownload;
    }
}

function buildEmptyTag(tagName, props)
{
    const tagHast = {
        type: 'element',
        tagName: tagName,
        properties: props
    };
    // console.log('buildEmptyTag:', tagHast);
    return tagHast;
}

const iconDictionary = {}
const contentPropDictionary = {}
const faviconDictionary = {}
const exclusionsDictionary = {}

export default function rehypeLinkDecorator(node, icons, siteName, protocols) {
    // console.log('rehypeLinkDecorator', node);

    // init if necessary
    // console.log('rehypeLinkDecorator', icons);

    if (icons) {
        icons.forEach(iconInfoEntry => {
            const {
                iconName,
                iconFile = null,
                properties:iconProps = {},
                contentProperties = {},
                exclusions = null,
            } = iconInfoEntry;
            if (iconName in iconDictionary) {
                return;
            }
            if (iconFile && !fs.existsSync(iconFile))
            {
                console.error('rehypeLinkDecorator: Cannot find icon: ', iconName);
            }
            if (exclusions && exclusions.length > 0) {
                exclusionsDictionary[iconName] = exclusions;
            }

            iconDictionary[iconName] = iconFile
                ? loadSvgContent(iconFile, iconProps)
                : buildEmptyTag('img', iconProps);

            contentPropDictionary[iconName] = contentProperties;

            console.log('rehypeLinkDecorator: Loaded Icon for:', iconName);
        })
    }

    if (node.type !== 'element' && node.tagName !== 'a') {
        return {};
    }

    // set up our node to contain the icon
    let iconNode = {
        type: 'element',
        tagName: 'span',
        properties: {
            className: ["whitespace-nowrap", "text-nowrap"],
        },
        children: []
    }

    // modify the existing node
    if (node.children && node.children.length > 0) {
        // we are going to modify the last child if it's text by splitting it so we
        // can lump in any icons with the last word in the text (to prevent ugly wrapping where
        // the icon goes onto the next line by itself).
        const lastIndex = node.children.length - 1;
        const lastNodeReplace = splitLastWord(node.children[lastIndex]);

        // move the last word into the icon node
        const lastWord = lastNodeReplace.pop();
        iconNode.children.push(lastWord);
        // now replace last child of original node with our modified children
        node.children.pop();
        if (lastNodeReplace.length > 0) {
            node.children.push(...lastNodeReplace);
        }
    }

    const href = node.properties?.href;
    if (href) {
        // check for other links (website-specific)
        let iconAdded = false;
        Object.entries(iconDictionary).forEach(([iconName, iconEntry]) => {
            if (iconName && !iconName.startsWith("-")) {
                if (href.toLowerCase().includes(iconName.toLowerCase())) {
                    iconNode.children.push(getSpaceNode());
                    iconNode.children.push(iconEntry)
                    // merge contentProperties with parent node
                    node.properties = { ...(node.properties || {}), ...contentPropDictionary[iconName] };
                    // console.log('rehypeLinkDecorator -> iconNode:', iconNode);
                    iconAdded = true;
                }
            }
        });

        // test add favicon
        const needFavicon = !iconAdded && "-favicon-link" in iconDictionary;
        if (needFavicon) {
            const siteFolder = new URL(siteName)?.hostname
            const buildTimePublicPrefix = 'public';
            const favIconDownloadPath = `${buildTimePublicPrefix}/favicons/${siteFolder}/external`;
            try {
                const faviconDomain = new URL(href)?.hostname;
                const exclusions = "-favicon-link" in exclusionsDictionary
                    ? exclusionsDictionary["-favicon-link"]
                    : {};
                console.log("exclusions", exclusions);
                if (exclusions.includes(faviconDomain)) {
                    console.log(`rehypeLinkDecorator -> faviconDomain EXCLUDED: '${faviconDomain}'`);
                }
                else {
                    console.log(`rehypeLinkDecorator -> faviconDomain: '${faviconDomain}'`);
                    if (faviconDomain && !(faviconDomain in faviconDictionary)) {
                        let selectedFavicon = getFaviconUrlSync(href);
                        const downloadedFavicon = downloadFaviconSync(selectedFavicon, faviconDomain, favIconDownloadPath);
                        selectedFavicon = downloadedFavicon.replace(buildTimePublicPrefix, '') ?? selectedFavicon;

                        faviconDictionary[faviconDomain] = selectedFavicon;
                        console.log('rehypeLinkDecorator -> selectedFavicon:', selectedFavicon);
                    }
                    if (faviconDomain in faviconDictionary) {
                        const favicon = faviconDictionary[faviconDomain];
                        if (favicon) {
                            // console.log('rehypeLinkDecorator -> imgNode:', imgNode);
                            // imgNode.properties = { ...imgNode.properties, ...iconDictionary["-favicon-link"].properties }
                            // console.log('rehypeLinkDecorator -> imgNode:', imgNode);
                            const imgNode = iconDictionary["-favicon-link"];
                            imgNode.properties.src = favicon;

                            iconNode.children.push(getSpaceNode());
                            iconNode.children.push(imgNode);
                        }
                    }
                }
            }
            catch (e) {

            }
        }

        // check if download link
        const isDownload = isDownloadLink(href);
        console.log(`rehypeLinkDecorator: isDownloadLink: '${href}' -> ${isDownload}`);
        if (isDownload) {
            iconNode.children.push(getSpaceNode());
            iconNode.children.push(iconDictionary["-download-link"]);
        }

        // check if external link
        const siteProtocols = protocols || defaultProtocols;
        const isExternal = !href.startsWith(siteName) && isAbsoluteUrl(href)
            ? siteProtocols.includes(href.slice(0, href.indexOf(':')))
            : href.startsWith('//');

        console.log(`rehypeLinkDecorator: isExternalLink: '${href}' -> ${isExternal}`);
        if (isExternal) {
            // add external icon to iconNode
            iconNode.children.push(getSpaceNode());
            iconNode.children.push(iconDictionary["-external-link"]);
        }
    }
    return iconNode;
}

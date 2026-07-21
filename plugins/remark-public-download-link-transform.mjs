import { visit } from 'unist-util-visit';
import path from 'path';

/**
 * Remark plugin that transforms PublicDownloadLink MDX components into regular <a> elements
 * so that rehype-link-decorator can see and process them.
 *
 * Transforms:
 *   <PublicDownloadLink filePath="..." text="..." class="..." />
 * Into:
 *   <a href="/path/to/file.pdf" download="file.pdf" class="...">Link Text</a>
 */

/**
 * Convert file path to download link
 * Matches the logic from PublicDownloadLink.astro
 */
function createDownloadLink(filePath, siteCode) {
    // Already has /files/ prefix - return as-is
    if (filePath.startsWith('/files/')) {
        return filePath;
    }

    // Handle /public/blah/foo.txt → /blah/foo.txt
    const publicMatch = filePath.match(/\/public\/(.+)$/);
    if (publicMatch) {
        return '/' + publicMatch[1];
    }

    // Handle /src/.sites/[site-code]/_public/files/slug/file.txt → /files/slug/file.txt
    const sitePublicFilesPattern = `/src/.sites/${siteCode}/_public/files/`;
    if (filePath.includes(sitePublicFilesPattern)) {
        const pathAfterFiles = filePath.split(sitePublicFilesPattern)[1];
        if (pathAfterFiles) {
            return '/files/' + pathAfterFiles;
        }
    }

    // Handle /src/.sites/[site-code]/_public/blah/foo.txt → /blah/foo.txt
    const sitePublicPattern = `/src/.sites/${siteCode}/_public/`;
    if (filePath.includes(sitePublicPattern)) {
        const pathAfterPublic = filePath.split(sitePublicPattern)[1];
        if (pathAfterPublic) {
            return '/' + pathAfterPublic;
        }
    }

    // Handle relative paths from Keystatic (e.g., "slug/filename.pdf")
    // Prepend /files/ to create the full URL
    if (!filePath.startsWith('/')) {
        return '/files/' + filePath;
    }

    return filePath;
}

/**
 * Extract attribute value from MDX attribute node
 */
function getAttributeValue(attr) {
    if (!attr || !attr.value) return null;

    // Handle string literals
    if (typeof attr.value === 'string') {
        return attr.value;
    }

    // Handle JSX expressions like {value}
    if (typeof attr.value === 'object' && 'value' in attr.value) {
        return attr.value.value;
    }

    return null;
}

/**
 * Transform a PublicDownloadLink node to an <a> element
 */
function transformDownloadLink(node, siteCode) {
    const filePathAttr = node.attributes.find(attr => attr.name === 'filePath');
    const textAttr = node.attributes.find(attr => attr.name === 'text');
    const classAttr = node.attributes.find(attr => attr.name === 'class');

    const filePath = getAttributeValue(filePathAttr);
    if (!filePath) {
        console.warn('PublicDownloadLink missing filePath attribute');
        return null;
    }

    const downloadLink = createDownloadLink(filePath, siteCode);
    // Replace spaces with U+2423 (␣) to match renamed files on disk
    const encodedDownloadLink = encodeURI(downloadLink);

    // For display/download: convert ␣ back to spaces for nice filenames
    const filename = path.basename(filePath);
    const text = getAttributeValue(textAttr) || filename || 'Download';
    const className = getAttributeValue(classAttr) || '';

    // Create an HTML node that rehype-link-decorator will process
    const htmlNode = {
        type: 'html',
        value: `<a href="${encodedDownloadLink}" download="${filename}"${className ? ` class="${className}"` : ''}>${text}</a>`
    };

    return htmlNode;
}

export function remarkPublicDownloadLinkTransform() {
    // Get site code from environment
    const siteCode = process.env.SITE_CODE || (() => {
        try {
            return new URL(process.env.VITE_SITE_NAME || '').hostname;
        } catch (e) {
            return 'hiivelabs.com';
        }
    })();

    return (tree) => {
        // Handle block-level PublicDownloadLink (mdxJsxFlowElement)
        visit(tree, 'mdxJsxFlowElement', (node, index, parent) => {
            if (node.name === 'PublicDownloadLink') {
                const htmlNode = transformDownloadLink(node, siteCode);
                if (htmlNode && parent && typeof index === 'number') {
                    parent.children[index] = htmlNode;
                }
            }
        });

        // Handle inline PublicDownloadLink (mdxJsxTextElement)
        visit(tree, 'mdxJsxTextElement', (node, index, parent) => {
            if (node.name === 'PublicDownloadLink') {
                const htmlNode = transformDownloadLink(node, siteCode);
                if (htmlNode && parent && typeof index === 'number') {
                    parent.children[index] = htmlNode;
                }
            }
        });
    };
}

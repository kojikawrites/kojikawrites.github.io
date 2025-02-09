import fs from 'fs';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import isAbsoluteUrl from 'is-absolute-url'

const defaultProtocols = ['http', 'https'];

function getNbspNode () {
    return {
        type: 'text',
        value: '\u00a0',
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

    return [leftNode, getNbspNode(), rightNode];
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

function hasDownloadFileExtension(pathString) {
    // List of common webpage extensions to exclude
    const excludedExtensions = new Set([
        "html", "htm", "asp", "aspx", "php", "jsp", "shtml", "cfm", "cfml", "xhtml"
    ]);

    // This regex matches a dot, then captures one or more characters that are not a dot, slash, question mark, or backslash,
    // and then stops either at a query string, hash, or the end of the string.
    const match = pathString?.toLowerCase().match(/\.([^./?\\]+)(?:[?#]|$)/);

    // If there is a match, convert the captured extension to lowercase and check that it is not one of the excluded types.
    return match ? !excludedExtensions.has(match[1].toLowerCase()) : false;
}


let iconDictionary = {}

export default function rehypeLinkDecorator(node, icons, siteName, protocols) {
    // console.log('rehypeLinkDecorator', node);

    // init if necessary
    // console.log('rehypeLinkDecorator', icons);

    if (icons) {
        icons.forEach(iconInfoEntry => {
            const {iconName, iconFile, properties:iconProps = {}} = iconInfoEntry;
            if (iconName in iconDictionary) {
                return;
            }
            if (!fs.existsSync(iconFile))
            {
                console.error('rehypeLinkDecorator: Cannot find icon: ', iconName);
            }
            iconDictionary[iconName] = loadSvgContent(iconFile, iconProps)

            console.log('rehypeLinkDecorator: Loaded Icon for:', iconName);
        })
    }

    if (node.type !== 'element' && node.tagName !== 'a') {
        return {};
    }
    // is it an external link?
    // console.log('node.children BEFORE', node.children);

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

    // add a nbsp to ensure that the first icon is separated from the previous node.
    iconNode.children.push(getNbspNode());


    const href = node.properties?.href;
    if (href) {
        // check for other links (website-specific)
        Object.entries(iconDictionary).forEach(([iconName, iconEntry]) => {
            if (!iconName.startsWith("-")) {
                if (href.toLowerCase().includes(iconName.toLowerCase())) {
                    iconNode.children.push(iconEntry)
                    iconNode.children.push(getNbspNode());
                }
            }
        });

        // check if download link
        const isDownload = hasDownloadFileExtension(href);
        if (isDownload) {
            iconNode.children.push(iconDictionary["-download-link"])
            iconNode.children.push(getNbspNode());
        }
        const siteProtocols = protocols || defaultProtocols;
        const isAbsolute = isAbsoluteUrl(href)
            ? siteProtocols.includes(href.slice(0, href.indexOf(':')))
            : href.startsWith('//');
        if (isAbsolute && !href.startsWith(siteName)) {
            // add external icon to iconNode
            iconNode.children.push(iconDictionary["-external-link"]);
        }
    }

    // console.log('node.children AFTER', node.children);



    return iconNode;
}

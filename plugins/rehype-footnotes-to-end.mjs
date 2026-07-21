import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that moves all FootnoteDefinition components to the end of the document
 * while preserving their order of appearance, and adds a "Footnotes" heading before them.
 */
export default function rehypeFootnotesToEnd() {
  return (tree) => {
    const footnoteNodes = [];
    const indicesToRemove = [];

    // First pass: collect all FootnoteDefinition components and mark for removal
    visit(tree, (node, index, parent) => {
      if (
        node.type === 'mdxJsxFlowElement' &&
        node.name === 'FootnoteDefinition'
      ) {
        footnoteNodes.push(node);
        if (parent && typeof index === 'number') {
          indicesToRemove.push({ parent, index });
        }
      }
    });

    // Remove footnotes from their original positions (in reverse order to maintain indices)
    indicesToRemove.reverse().forEach(({ parent, index }) => {
      parent.children.splice(index, 1);
    });

    // Add all footnotes to the end of the document with a heading
    if (footnoteNodes.length > 0 && tree.children) {
      // Create a "Footnotes" h2 heading
      const footnotesHeading = {
        type: 'element',
        tagName: 'h2',
        properties: {},
        children: [{ type: 'text', value: 'Footnotes' }]
      };

      tree.children.push(footnotesHeading, ...footnoteNodes);
    }
  };
}

/**
 * Rehype plugin to transform ContentWarning components from Keystatic format to slot format
 *
 * Transforms:
 *   <ContentWarning warning="text">content</ContentWarning>
 *
 * To:
 *   <ContentWarning>
 *     <div slot="warning">text</div>
 *     <div slot="content">content</div>
 *   </ContentWarning>
 */

import { visit } from 'unist-util-visit';

export default function rehypeContentWarningTransform() {
  return (tree) => {
    visit(tree, 'mdxJsxFlowElement', (node) => {
      // Only process ContentWarning components
      if (node.name !== 'ContentWarning') {
        return;
      }

      // Find the warning attribute
      const warningAttr = node.attributes?.find(
        attr => attr.type === 'mdxJsxAttribute' && attr.name === 'warning'
      );

      if (!warningAttr || !warningAttr.value) {
        return;
      }

      // Get the warning text
      const warningText = typeof warningAttr.value === 'string'
        ? warningAttr.value
        : warningAttr.value?.value;

      if (!warningText) {
        return;
      }

      // Remove the warning attribute from the node
      node.attributes = node.attributes.filter(
        attr => !(attr.type === 'mdxJsxAttribute' && attr.name === 'warning')
      );

      // Create the warning slot div
      const warningSlot = {
        type: 'mdxJsxFlowElement',
        name: 'div',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'slot',
            value: 'warning'
          }
        ],
        children: [
          {
            type: 'text',
            value: warningText
          }
        ]
      };

      // Create the content slot div wrapping existing children
      const contentSlot = {
        type: 'mdxJsxFlowElement',
        name: 'div',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'slot',
            value: 'content'
          }
        ],
        children: node.children || []
      };

      // Replace children with the two slot divs
      node.children = [warningSlot, contentSlot];
    });
  };
}

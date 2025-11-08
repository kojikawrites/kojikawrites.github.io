import { visit } from 'unist-util-visit';

/**
 * Remark plugin that transforms EquationSnippet MDX components into raw HTML spans
 * so that rehypeMathjax can see and process the equation text.
 *
 * Transforms:
 *   <EquationSnippet equation="$x$" inline={true} style="..." />
 * Into:
 *   <span class="equation-snippet" style="...">$x$</span>
 */
export function remarkEquationSnippetTransform() {
  return (tree) => {
    visit(tree, 'mdxJsxFlowElement', (node, index, parent) => {
      if (node.name === 'EquationSnippet') {
        const equationAttr = node.attributes.find(attr => attr.name === 'equation');
        const inlineAttr = node.attributes.find(attr => attr.name === 'inline');
        const styleAttr = node.attributes.find(attr => attr.name === 'style');

        if (equationAttr && equationAttr.value) {
          const equation = equationAttr.value;
          // Handle inline attribute: could be boolean expression {false} or just present (inline)
          let isInline = true; // default
          if (inlineAttr) {
            if (inlineAttr.value && typeof inlineAttr.value === 'object' && 'value' in inlineAttr.value) {
              // JSX expression like inline={false}
              isInline = inlineAttr.value.value !== false;
            } else if (inlineAttr.value === null) {
              // Just `inline` with no value means true
              isInline = true;
            }
          }
          const className = isInline ? 'equation-snippet' : 'equation';
          const style = styleAttr?.value || '';

          // Create a placeholder that will be processed by our custom rehype plugin
          // Use a special HTML element that won't be touched by remarkMath/rehypeMathjax
          const placeholderNode = {
            type: 'html',
            value: `<span class="equation-render-placeholder" data-equation="${equation.replace(/"/g, '&quot;')}" data-class="${className}" data-style="${style}"></span>`
          };

          parent.children[index] = placeholderNode;
        }
      }
    });

    // Also handle inline versions (mdxJsxTextElement)
    visit(tree, 'mdxJsxTextElement', (node, index, parent) => {
      if (node.name === 'EquationSnippet') {
        const equationAttr = node.attributes.find(attr => attr.name === 'equation');
        const inlineAttr = node.attributes.find(attr => attr.name === 'inline');
        const styleAttr = node.attributes.find(attr => attr.name === 'style');

        if (equationAttr && equationAttr.value) {
          const equation = equationAttr.value;
          // Handle inline attribute: could be boolean expression {false} or just present (inline)
          let isInline = true; // default
          if (inlineAttr) {
            if (inlineAttr.value && typeof inlineAttr.value === 'object' && 'value' in inlineAttr.value) {
              // JSX expression like inline={false}
              isInline = inlineAttr.value.value !== false;
            } else if (inlineAttr.value === null) {
              // Just `inline` with no value means true
              isInline = true;
            }
          }
          const className = isInline ? 'equation-snippet' : 'equation';
          const style = styleAttr?.value || '';

          // Create a placeholder that will be processed by our custom rehype plugin
          // Use a special HTML element that won't be touched by remarkMath/rehypeMathjax
          const placeholderNode = {
            type: 'html',
            value: `<span class="equation-render-placeholder" data-equation="${equation.replace(/"/g, '&quot;')}" data-class="${className}" data-style="${style}"></span>`
          };

          parent.children[index] = placeholderNode;
        }
      }
    });
  };
}

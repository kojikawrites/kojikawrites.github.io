import { visit } from 'unist-util-visit';
import { fromHtml } from 'hast-util-from-html';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

/**
 * Rehype plugin that renders equation placeholders using MathJax directly.
 * This bypasses the remarkMath/rehypeMathjax pipeline.
 */
export function rehypeRenderEquations() {
  // Initialize MathJax once
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);

  const tex = new TeX({ packages: AllPackages });
  const svg = new SVG({ fontCache: 'none' });
  const html = mathjax.document('', { InputJax: tex, OutputJax: svg });

  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      // Find our placeholder spans
      if (
        node.tagName === 'span' &&
        node.properties &&
        node.properties.className &&
        node.properties.className.includes('equation-render-placeholder')
      ) {
        const equation = node.properties.dataEquation;
        const className = node.properties.dataClass;
        const style = node.properties.dataStyle;

        if (!equation) return;

        try {
          // Render the equation with MathJax
          const mathNode = html.convert(equation, {
            display: className === 'equation', // block vs inline
            em: 16,
            ex: 8,
            containerWidth: 80 * 16
          });

          // Convert MathJax output to HAST
          const svgString = adaptor.outerHTML(mathNode);
          const parsed = fromHtml(svgString, { fragment: true });

          if (parsed.children && parsed.children.length > 0) {
            const svgNode = parsed.children[0];

            // Wrap in a span with the appropriate class
            const wrapper = {
              type: 'element',
              tagName: 'span',
              properties: {
                className: [className],
                ...(style ? { style } : {})
              },
              children: [svgNode]
            };

            // Replace the placeholder with the rendered equation
            parent.children[index] = wrapper;
          }
        } catch (err) {
          console.error(`Failed to render equation: ${equation}`, err);
          // Leave the placeholder in case of error
        }
      }
    });
  };
}

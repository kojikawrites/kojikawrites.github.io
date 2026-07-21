// one time usedto convert the breadcrumbs.scss to css for easier use.

import * as sass from 'sass';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputFile = resolve(__dirname, '../src/styles/_breadcrumbs.scss');
const outputFile = resolve(__dirname, '../src/styles/_breadcrumbs.css');

console.log('Compiling breadcrumbs.scss...');
console.log('Input:', inputFile);
console.log('Output:', outputFile);

try {
    const result = sass.compile(inputFile, {
        style: 'expanded',
        sourceMap: false,
        loadPaths: [
            resolve(__dirname, '../node_modules'),
            resolve(__dirname, '../node_modules/astro-breadcrumbs/src'),
            resolve(__dirname, '../src/styles')
        ],
        // Map package imports to the correct location
        importers: [{
            findFileUrl(url) {
                if (url === 'astro-breadcrumbs/breadcrumbs.scss') {
                    return new URL('file://' + resolve(__dirname, '../node_modules/astro-breadcrumbs/src/breadcrumbs.scss'));
                }
                return null;
            }
        }]
    });

    writeFileSync(outputFile, result.css, 'utf8');
    console.log('✅ Successfully compiled breadcrumbs.scss to breadcrumbs.css');
} catch (error) {
    console.error('❌ Error compiling SCSS:', error.message);
    process.exit(1);
}

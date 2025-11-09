#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

/**
 * Unescapes markdown footnote syntax that Keystatic escapes when saving.
 * Converts \[^n] back to [^n] and \[^n]: back to [^n]:
 */
function unescapeFootnotes(content: string): string {
  // Unescape footnote references: \[^n] -> [^n]
  content = content.replace(/\\\[(\^\d+)\\\]/g, '[$1]');

  // Unescape footnote definitions: \[^n]: -> [^n]:
  content = content.replace(/\\\[(\^\d+)\\\]:/g, '[$1]:');

  return content;
}

function processFile(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  const unescaped = unescapeFootnotes(content);

  if (content !== unescaped) {
    writeFileSync(filePath, unescaped, 'utf-8');
    return true;
  }

  return false;
}

// Process all MDX files in posts
const postsPattern = 'src/assets/posts/**/*.mdx';
const files = globSync(postsPattern);

let changedCount = 0;

for (const file of files) {
  if (processFile(file)) {
    console.log(`✓ Fixed footnotes in: ${file}`);
    changedCount++;
  }
}

if (changedCount > 0) {
  console.log(`\n✓ Fixed ${changedCount} file(s)`);
} else {
  console.log('✓ No escaped footnotes found');
}

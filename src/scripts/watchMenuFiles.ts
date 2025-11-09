#!/usr/bin/env node
/**
 * File watcher for menu-related files
 * Regenerates navigation menu when pages or system menu items change
 */

import chokidar from 'chokidar';
import { execSync } from 'child_process';
import path from 'path';

const WATCH_PATHS = [
  'src/assets/pagecontent/hiivelabs.com/**/*.{md,mdx}',
  'src/assets/config/system-menu-items.json'
];

let isRegenerating = false;
let pendingRegeneration = false;

function regenerateMenu() {
  if (isRegenerating) {
    pendingRegeneration = true;
    return;
  }

  isRegenerating = true;
  console.log('\n🔄 Regenerating navigation menu...');

  try {
    execSync('npx tsx src/scripts/generateNavMenu.ts', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Menu regenerated successfully\n');
  } catch (error) {
    console.error('❌ Menu regeneration failed:', error);
  } finally {
    isRegenerating = false;

    // If another change happened while we were regenerating, do it again
    if (pendingRegeneration) {
      pendingRegeneration = false;
      setTimeout(() => regenerateMenu(), 100);
    }
  }
}

console.log('👀 Watching for menu file changes...');
console.log('   - Pages: src/assets/pagecontent/hiivelabs.com/');
console.log('   - System menu: src/assets/config/system-menu-items.json\n');

const watcher = chokidar.watch(WATCH_PATHS, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100
  }
});

watcher
  .on('change', (filePath) => {
    console.log(`📝 Changed: ${path.relative(process.cwd(), filePath)}`);
    regenerateMenu();
  })
  .on('add', (filePath) => {
    console.log(`➕ Added: ${path.relative(process.cwd(), filePath)}`);
    regenerateMenu();
  })
  .on('unlink', (filePath) => {
    console.log(`➖ Removed: ${path.relative(process.cwd(), filePath)}`);
    regenerateMenu();
  })
  .on('error', (error) => {
    console.error('❌ Watcher error:', error);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping menu file watcher...');
  watcher.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  watcher.close();
  process.exit(0);
});

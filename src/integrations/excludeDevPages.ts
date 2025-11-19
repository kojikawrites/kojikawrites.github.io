import type { AstroIntegration } from 'astro';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import { loadEnv } from '../lib/config/loadEnv.js';
// Load environment variables from root and site-specific .env files
loadEnv();

/**
 * Get site code from environment variables
 */
function getSiteCode(): string {
  const siteCode = process.env.SITE_CODE;
  if (siteCode) {
    return siteCode;
  }

  try {
    return new URL(process.env.VITE_SITE_NAME || '').hostname;
  } catch (e) {
    return 'hiivelabs.com';
  }
}

/**
 * Load site configuration from YAML file
 */
function loadSiteConfig(siteCode: string): any {
  const configPath = path.resolve(`src/.sites/${siteCode}/config/site.yaml`);
  if (!fs.existsSync(configPath)) {
    console.warn(`No config found for ${siteCode}, using defaults`);
    return {};
  }
  const yamlString = fs.readFileSync(configPath, 'utf8');
  return yaml.load(yamlString);
}

/**
 * Framework-level dev-only directories
 * These are ALWAYS excluded from production builds
 */
const FRAMEWORK_DEV_DIRS = [
  'admin',    // Admin dashboard
  'api',  // Git operations (build, push, status)
  'edit',     // Content editing UI
];

/**
 * Astro integration to exclude dev-only pages from production builds
 * Removes built pages from dist directory after build
 *
 * Excludes:
 * 1. Framework dev directories (always excluded)
 * 2. Site-specific directories (from site.yaml build.exclude_from_production)
 */
export default function excludeDevPages(): AstroIntegration {
  return {
    name: 'exclude-dev-pages',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        // Only run in production builds
        if (process.env.NODE_ENV !== 'production') {
          return;
        }

        const siteCode = getSiteCode();
        const siteConfig = loadSiteConfig(siteCode);
        const siteExcludeDirs = siteConfig?.build?.exclude_from_production || [];

        // Combine framework and site-specific exclusions
        const allExcludeDirs = [
          ...FRAMEWORK_DEV_DIRS,
          ...siteExcludeDirs,
        ];

        // Remove duplicates
        const uniqueExcludeDirs = [...new Set(allExcludeDirs)];

        if (uniqueExcludeDirs.length === 0) {
          console.log('ℹ️  No directories configured for exclusion');
          return;
        }

        console.log('🚫 Excluding dev-only pages from production build...');
        console.log(`   Framework exclusions: ${FRAMEWORK_DEV_DIRS.join(', ')}`);
        if (siteExcludeDirs.length > 0) {
          console.log(`   Site exclusions: ${siteExcludeDirs.join(', ')}`);
        }

        for (const dirName of uniqueExcludeDirs) {
          const distPath = path.join(dir.pathname, dirName);
          if (fs.existsSync(distPath)) {
            console.log(`   ✓ Removing: ${path.relative(process.cwd(), distPath)}`);
            fs.rmSync(distPath, { recursive: true, force: true });
          }
        }

        console.log('✅ Dev-only pages excluded from production build');
      },
    },
  };
}

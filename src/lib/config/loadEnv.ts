/**
 * Load environment variables from both root and site-specific .env files
 * This should be called early in scripts to ensure all env vars are loaded
 */
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Load root .env and site-specific .env files
 * @param rootPath - Optional path to repository root (auto-detected if not provided)
 */
export function loadEnv(rootPath?: string): void {
    // Load root .env
    if (rootPath) {
        dotenvConfig({ path: path.join(rootPath, '.env') });
    } else {
        dotenvConfig();
    }

    // Get SITE_CODE from environment
    const siteCode = process.env.SITE_CODE;
    if (!siteCode) {
        console.warn('⚠ SITE_CODE not set in root .env - skipping site-specific .env loading');
        return;
    }

    // Determine repository root if not provided
    let repoRoot = rootPath;
    if (!repoRoot) {
        // Try to find repo root by looking for package.json
        let currentDir = process.cwd();
        while (currentDir !== path.parse(currentDir).root) {
            if (fs.existsSync(path.join(currentDir, 'package.json'))) {
                repoRoot = currentDir;
                break;
            }
            currentDir = path.dirname(currentDir);
        }
        if (!repoRoot) {
            repoRoot = process.cwd();
        }
    }

    // Load site-specific .env
    const siteEnvPath = path.join(repoRoot, 'src', '.sites', siteCode, '.env');
    if (fs.existsSync(siteEnvPath)) {
        dotenvConfig({ path: siteEnvPath, override: true });
        console.log(`✓ Loaded site-specific .env: src/.sites/${siteCode}/.env`);
    } else {
        console.warn(`⚠ Site-specific .env not found: src/.sites/${siteCode}/.env`);
    }
}

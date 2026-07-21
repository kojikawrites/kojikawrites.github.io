#!/usr/bin/env python3
"""
Backfill createdAt field for existing blog posts.

This script adds a 'createdAt' frontmatter field to all published blog posts
that don't already have one. The value is set to midnight UTC on the publish
date extracted from the filename (YYYY-MM-DD-slug.mdx format).

Usage:
    python python/migration/backfill-created-at.py [site_code]

    site_code: Optional. Defaults to SITE_CODE in root .env file

Examples:
    python python/migration/backfill-created-at.py                    # Uses site from .env
    python python/migration/backfill-created-at.py hiivelabs.com      # Specific site
    python python/migration/backfill-created-at.py --dry-run          # Preview changes
"""

import os
import re
import sys
from pathlib import Path
from datetime import datetime, timezone


def get_project_root() -> Path:
    """Find the project root by looking for package.json."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / 'package.json').exists():
            return current
        current = current.parent
    # Fallback: script is in python/migration/, so go up 2 levels
    return Path(__file__).resolve().parent.parent.parent


def get_site_code(project_root: Path) -> str:
    """Get site code from command line args or root .env file."""
    # Check for site code in args (skip flags)
    for arg in sys.argv[1:]:
        if not arg.startswith('-'):
            return arg

    # Read from root .env file
    env_path = project_root / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                # Skip comments and empty lines
                if not line or line.startswith('#'):
                    continue
                if line.startswith('SITE_CODE='):
                    return line.split('=', 1)[1].strip().strip('"\'')

    print(f"Warning: No SITE_CODE found in {env_path}")
    return 'hiivelabs.com'


def extract_date_from_filename(filename: str) -> str | None:
    """Extract YYYY-MM-DD date from filename."""
    match = re.match(r'^(\d{4}-\d{2}-\d{2})-', filename)
    if match:
        return match.group(1)
    return None


def date_to_iso_midnight(date_str: str) -> str:
    """Convert YYYY-MM-DD to ISO 8601 format at midnight UTC."""
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    dt = dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    return dt.isoformat().replace('+00:00', 'Z')


def has_created_at(content: str) -> bool:
    """Check if content already has createdAt in frontmatter."""
    # Match frontmatter block
    match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if match:
        frontmatter = match.group(1)
        return 'createdAt:' in frontmatter
    return False


def add_created_at(content: str, created_at: str) -> str:
    """Add createdAt field to frontmatter."""
    # Match frontmatter block
    match = re.match(r'^(---\s*\n)(.*?)(\n---)', content, re.DOTALL)
    if match:
        start, frontmatter, end = match.groups()
        # Add createdAt before the closing ---
        new_frontmatter = frontmatter.rstrip() + f'\ncreatedAt: "{created_at}"'
        return start + new_frontmatter + end + content[match.end():]
    return content


def print_help():
    """Print usage information."""
    print(__doc__)
    sys.exit(0)


def main():
    # Handle help flag
    if '--help' in sys.argv or '-h' in sys.argv:
        print_help()

    dry_run = '--dry-run' in sys.argv
    project_root = get_project_root()
    site_code = get_site_code(project_root)

    # Find posts directory
    posts_dir = project_root / 'src' / '.sites' / site_code / 'content' / 'posts'

    if not posts_dir.exists():
        print(f"Error: Posts directory not found: {posts_dir}")
        sys.exit(1)

    print(f"Site: {site_code}")
    print(f"Posts directory: {posts_dir}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print()

    # Find all .mdx files (excluding _drafts)
    updated = 0
    skipped = 0
    errors = 0

    for mdx_file in posts_dir.glob('*.mdx'):
        filename = mdx_file.name

        # Extract date from filename
        date_str = extract_date_from_filename(filename)
        if not date_str:
            print(f"  SKIP (no date in filename): {filename}")
            skipped += 1
            continue

        # Read content
        try:
            content = mdx_file.read_text(encoding='utf-8')
        except Exception as e:
            print(f"  ERROR reading {filename}: {e}")
            errors += 1
            continue

        # Check if already has createdAt
        if has_created_at(content):
            print(f"  SKIP (already has createdAt): {filename}")
            skipped += 1
            continue

        # Generate createdAt value
        created_at = date_to_iso_midnight(date_str)

        if dry_run:
            print(f"  WOULD ADD createdAt: {created_at} to {filename}")
            updated += 1
        else:
            # Add createdAt to frontmatter
            new_content = add_created_at(content, created_at)

            try:
                mdx_file.write_text(new_content, encoding='utf-8')
                print(f"  ADDED createdAt: {created_at} to {filename}")
                updated += 1
            except Exception as e:
                print(f"  ERROR writing {filename}: {e}")
                errors += 1

    print()
    print(f"Summary:")
    print(f"  Updated: {updated}")
    print(f"  Skipped: {skipped}")
    print(f"  Errors: {errors}")

    if dry_run and updated > 0:
        print()
        print("Run without --dry-run to apply changes.")


if __name__ == '__main__':
    main()

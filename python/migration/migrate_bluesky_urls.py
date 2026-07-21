#!/usr/bin/env python3
"""
Migration script to add post_url field to bluesky_posted.json entries.

For each entry:
1. Parse the DID and rkey from post_uri
2. Construct post_url using DID directly: https://bsky.app/profile/{did}/post/{rkey}
3. Remove profile_id field if present (no longer needed)

Usage:
    python migrate_bluesky_urls.py [--dry-run] [--site-code SITE_CODE]
    python migrate_bluesky_urls.py <path-to-bluesky_posted.json> [--dry-run]
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False


def load_site_code_from_env() -> str:
    """Load SITE_CODE from .env file or environment variable"""
    if DOTENV_AVAILABLE:
        load_dotenv()
    return os.environ.get('SITE_CODE', 'hiivelabs.com')


def parse_post_uri(post_uri):
    """
    Parse post_uri to extract DID and rkey.

    Args:
        post_uri (str): ATProto URI (e.g., "at://did:plc:xxx/app.bsky.feed.post/3l7tvw5y2c22q")

    Returns:
        tuple: (did, rkey) or (None, None) if parsing fails
    """
    match = re.match(r'^at://(did:plc:[^/]+)/app\.bsky\.feed\.post/([^/]+)$', post_uri)
    if match:
        return match.group(1), match.group(2)
    return None, None


def create_post_url(post_uri):
    """
    Create a Bluesky web URL from an ATProto URI using DID directly.

    Args:
        post_uri (str): ATProto URI

    Returns:
        str: Bluesky web URL or None if creation fails
    """
    did, rkey = parse_post_uri(post_uri)
    if not did or not rkey:
        print(f"✗ Failed to parse post_uri: {post_uri}")
        return None

    # Use DID directly in the URL - no need to resolve to handle
    post_url = f"https://bsky.app/profile/{did}/post/{rkey}"
    return post_url


def migrate_file(file_path, dry_run=False):
    """
    Migrate bluesky_posted.json to add/update post_url fields.

    Args:
        file_path (str): Path to bluesky_posted.json
        dry_run (bool): If True, don't write changes
    """
    print("=" * 60)
    print(f"Bluesky URL Migration Script")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"File: {file_path}")
    print("=" * 60)

    # Read the existing file
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            entries = json.load(f)
        print(f"✓ Loaded {len(entries)} entries from {file_path}")
    except FileNotFoundError:
        print(f"✗ Error: File not found: {file_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"✗ Error: Invalid JSON in {file_path}: {e}")
        sys.exit(1)

    # Process each entry
    modified = False
    updated_count = 0
    removed_count = 0

    for i, entry in enumerate(entries, 1):
        post_uri = entry.get('post_uri')
        post_id = entry.get('post_id', 'unknown')

        if not post_uri:
            print(f"\n[{i}/{len(entries)}] {post_id}")
            print(f"  ⚠ Warning: No post_uri found")
            continue

        print(f"\n[{i}/{len(entries)}] {post_id}")

        # Create/update post_url
        post_url = create_post_url(post_uri)
        if post_url:
            if entry.get('post_url') != post_url:
                if dry_run:
                    print(f"  [DRY RUN] Would update post_url: {post_url}")
                else:
                    entry['post_url'] = post_url
                    print(f"  ✓ Updated post_url: {post_url}")
                modified = True
                updated_count += 1
            else:
                print(f"  ✓ post_url already correct")
        else:
            print(f"  ✗ Failed to create post_url")

        # Remove profile_id if it exists (no longer needed)
        if 'profile_id' in entry:
            if dry_run:
                print(f"  [DRY RUN] Would remove profile_id field")
            else:
                del entry['profile_id']
                print(f"  ✓ Removed profile_id field")
            modified = True
            removed_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"Total entries: {len(entries)}")
    print(f"URLs updated: {updated_count}")
    print(f"profile_id removed: {removed_count}")

    # Write back to file if modified
    if modified:
        if dry_run:
            print(f"\n[DRY RUN] Would save changes to: {file_path}")
        else:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(entries, f, ensure_ascii=False, indent=2)
            print(f"\n✓ Successfully migrated {file_path}")
    else:
        print(f"\nⓘ No changes needed for {file_path}")

    print("=" * 60)
    if dry_run:
        print("✅ DRY RUN COMPLETE - No changes were made")
    else:
        print("✅ MIGRATION COMPLETE")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description='Migrate bluesky_posted.json to add/update post_url fields',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run with automatic path detection (uses SITE_CODE from env)
  python migrate_bluesky_urls.py --dry-run

  # Migrate using site code from environment
  python migrate_bluesky_urls.py

  # Migrate with explicit site code
  python migrate_bluesky_urls.py --site-code hiivelabs.com

  # Migrate with explicit file path
  python migrate_bluesky_urls.py src/.sites/hiivelabs.com/state/bluesky_posted.json

  # Dry run with explicit path
  python migrate_bluesky_urls.py path/to/bluesky_posted.json --dry-run
        """
    )

    parser.add_argument(
        'file_path',
        nargs='?',
        help='Path to bluesky_posted.json (optional if --site-code is provided)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )

    parser.add_argument(
        '--site-code',
        type=str,
        help='Site code (auto-detects path: src/.sites/{site_code}/state/bluesky_posted.json)'
    )

    args = parser.parse_args()

    # Determine file path
    if args.file_path:
        file_path = args.file_path
    elif args.site_code or DOTENV_AVAILABLE:
        site_code = args.site_code if args.site_code else load_site_code_from_env()
        file_path = f"src/.sites/{site_code}/state/bluesky_posted.json"
        print(f"ⓘ Using auto-detected path: {file_path}")
    else:
        print("ERROR: Either provide file path or set SITE_CODE environment variable")
        parser.print_help()
        sys.exit(1)

    # Check file exists
    if not Path(file_path).exists():
        print(f"✗ Error: File not found: {file_path}")
        sys.exit(1)

    migrate_file(file_path, dry_run=args.dry_run)


if __name__ == '__main__':
    main()

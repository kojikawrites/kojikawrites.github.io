#!/usr/bin/env python3
"""
Migration script to add post_url field to bluesky_posted.json entries.

For each entry:
1. Parse the DID and rkey from post_uri
2. Construct post_url using DID directly: https://bsky.app/profile/{did}/post/{rkey}
3. Remove profile_id field if present (no longer needed)
"""

import json
import re
import sys


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
        print(f"Failed to parse post_uri: {post_uri}", file=sys.stderr)
        return None

    # Use DID directly in the URL - no need to resolve to handle
    post_url = f"https://bsky.app/profile/{did}/post/{rkey}"
    return post_url


def migrate_file(file_path):
    """
    Migrate bluesky_posted.json to add/update post_url fields.

    Args:
        file_path (str): Path to bluesky_posted.json
    """
    # Read the existing file
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            entries = json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {file_path}: {e}", file=sys.stderr)
        sys.exit(1)

    # Process each entry
    modified = False
    for entry in entries:
        post_uri = entry.get('post_uri')
        if not post_uri:
            print(f"Warning: No post_uri for {entry.get('post_id', 'unknown')}", file=sys.stderr)
            continue

        print(f"Processing {entry['post_id']}...")

        # Create/update post_url
        post_url = create_post_url(post_uri)
        if post_url:
            entry['post_url'] = post_url
            modified = True
            print(f"  ✓ Updated post_url: {post_url}")
        else:
            print(f"  ✗ Failed to create post_url")

        # Remove profile_id if it exists (no longer needed)
        if 'profile_id' in entry:
            del entry['profile_id']
            modified = True
            print(f"  ✓ Removed profile_id field")

    # Write back to file if modified
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        print(f"\n✓ Successfully migrated {file_path}")
    else:
        print(f"\n✓ No changes needed for {file_path}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python migrate_bluesky_urls.py <path-to-bluesky_posted.json>")
        sys.exit(1)

    file_path = sys.argv[1]
    migrate_file(file_path)

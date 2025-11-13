#!/usr/bin/env python3
"""
Migration script to add post_url field to bluesky_posted.json entries.

For each entry:
1. Parse the DID from post_uri
2. Query PLC directory to get the handle
3. Extract rkey from post_uri
4. Add post_url field
"""

import json
import re
import sys
import requests


# Cache for DID → handle mappings to avoid repeated API calls
_did_cache = {}


def get_handle_from_did(did):
    """
    Query the PLC directory to get the handle for a given DID.
    Results are cached to avoid repeated API calls.

    Args:
        did (str): The DID (e.g., "did:plc:uxb4wvzgll6c47yxxpyqlib7")

    Returns:
        str: The handle (e.g., "thewriteplace.rocks") or None if not found
    """
    # Check cache first
    if did in _did_cache:
        return _did_cache[did]

    plc_url = f"https://plc.directory/{did}"

    try:
        response = requests.get(plc_url, timeout=10)
        response.raise_for_status()
        data = response.json()
        also_known_as = data.get('alsoKnownAs', [])
        if also_known_as and len(also_known_as) > 0:
            # Extract handle from "at://handle" format
            first_entry = also_known_as[0]
            if first_entry.startswith('at://'):
                handle = first_entry[5:]  # Remove "at://" prefix
                # Cache the result
                _did_cache[did] = handle
                return handle
        # Cache None result to avoid retrying failed lookups
        _did_cache[did] = None
        return None
    except requests.RequestException as e:
        print(f"Error querying PLC directory for {did}: {e}", file=sys.stderr)
        # Cache None result to avoid retrying on network errors
        _did_cache[did] = None
        return None


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
    Create a Bluesky web URL from an ATProto URI and extract the profile_id.

    Args:
        post_uri (str): ATProto URI

    Returns:
        tuple: (post_url, profile_id) or (None, None) if creation fails
    """
    did, rkey = parse_post_uri(post_uri)
    if not did or not rkey:
        print(f"Failed to parse post_uri: {post_uri}", file=sys.stderr)
        return None, None

    handle = get_handle_from_did(did)
    if not handle:
        print(f"Failed to get handle for DID: {did}", file=sys.stderr)
        return None, None

    post_url = f"https://bsky.app/profile/{handle}/post/{rkey}"
    return post_url, handle


def migrate_file(file_path):
    """
    Migrate bluesky_posted.json to add post_url fields.

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
        # Skip if both post_url and profile_id already exist
        if 'post_url' in entry and 'profile_id' in entry:
            print(f"Skipping {entry['post_id']} - post_url and profile_id already exist")
            continue

        post_uri = entry.get('post_uri')
        if not post_uri:
            print(f"Warning: No post_uri for {entry.get('post_id', 'unknown')}", file=sys.stderr)
            continue

        print(f"Processing {entry['post_id']}...")
        post_url, profile_id = create_post_url(post_uri)
        if post_url and profile_id:
            entry['post_url'] = post_url
            entry['profile_id'] = profile_id
            modified = True
            print(f"  ✓ Added post_url: {post_url}")
            print(f"  ✓ Added profile_id: {profile_id}")
        else:
            print(f"  ✗ Failed to create post_url and profile_id")

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

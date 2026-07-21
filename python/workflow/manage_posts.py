# used for post migration and publishing scheduled posts

import os
import sys
import shutil
from datetime import datetime, timezone
import re
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Determine repository root (go up from python/workflow/ to repo root)
REPO_ROOT = Path(__file__).parent.parent.parent
os.chdir(REPO_ROOT)

# Load root .env to get SITE_CODE
load_dotenv()
site_code = os.environ.get("SITE_CODE")

if not site_code:
    print("ERROR: SITE_CODE environment variable is not set in root .env file.")
    sys.exit(1)

# Load site-specific .env file
site_env_path = REPO_ROOT / 'src' / '.sites' / site_code / '.env'
if site_env_path.exists():
    load_dotenv(site_env_path, override=True)
    print(f"✓ Loaded site-specific configuration from: {site_env_path}")
else:
    print(f"⚠ Warning: Site-specific .env not found at: {site_env_path}")
    print(f"  Using root .env values only")

# Track file moves for updating bluesky_posted.json
path_migrations = []

def validate_structure():
    """Validate the site directory structure exists"""
    required_dirs = [
        f'./src/.sites/{site_code}/content/posts',
        f'./src/.sites/{site_code}/state',
        f'./src/.sites/{site_code}/config',
    ]
    missing_dirs = []
    for dir_path in required_dirs:
        if not os.path.exists(dir_path):
            missing_dirs.append(dir_path)

    if missing_dirs:
        print("ERROR: Required directories not found:")
        for dir_path in missing_dirs:
            print(f"  - {dir_path}")
        sys.exit(1)

    print(f"✓ Site structure validated for: {site_code}")

def load_bluesky_posted():
    """Load the bluesky_posted.json file"""
    path = f'./src/.sites/{site_code}/state/bluesky_posted.json'
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"✓ Loaded bluesky_posted.json: {len(data)} entries")
            return data
    print(f"ⓘ No existing bluesky_posted.json found at: {path}")
    return []

def save_bluesky_posted(data, dry_run=False):
    """Save the bluesky_posted.json file"""
    path = f'./src/.sites/{site_code}/state/bluesky_posted.json'
    if dry_run:
        print(f"[DRY RUN] Would save bluesky_posted.json to: {path}")
        print(f"[DRY RUN] Would save {len(data)} entries")
        return
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved bluesky_posted.json: {len(data)} entries")

def normalize_path(path):
    """Normalize a path to use forward slashes and be relative to project root"""
    return path.replace('\\', '/').replace('./', '')

def track_migration(old_path, new_path):
    """Track a file migration for later updating bluesky_posted.json"""
    old_normalized = normalize_path(old_path)
    new_normalized = normalize_path(new_path)
    path_migrations.append((old_normalized, new_normalized))

def update_bluesky_posted_paths(dry_run=False):
    """Update post_id paths in bluesky_posted.json based on tracked migrations"""
    if not path_migrations:
        print("ⓘ No path migrations to update")
        return

    bluesky_data = load_bluesky_posted()
    updates_made = 0

    for entry in bluesky_data:
        old_post_id = entry['post_id']
        for old_path, new_path in path_migrations:
            if old_post_id == old_path:
                entry['post_id'] = new_path
                updates_made += 1
                print(f"  Updated bluesky post tracking: {old_path} -> {new_path}")
                break

    if updates_made > 0:
        save_bluesky_posted(bluesky_data, dry_run)
        print(f"✓ Updated {updates_made} path(s) in bluesky_posted.json")
    else:
        print("ⓘ No bluesky_posted.json entries needed updating")

def parse_date_from_filename(filename):
    match = re.match(r'(\d{4})-(\d{2})-(\d{2})-(.*)\.mdx?$', filename)
    if match:
        year, month, day, slug = match.groups()
        return datetime(int(year), int(month), int(day), tzinfo=timezone.utc), slug
    return None, None

def find_posts_directory():
    """Return the posts directory for the current site"""
    posts_dir = f'./src/.sites/{site_code}/content/posts'
    if os.path.exists(posts_dir):
        print(f"✓ Found posts directory: {posts_dir}")
        return posts_dir
    else:
        print(f"ERROR: Posts directory not found: {posts_dir}")
        sys.exit(1)

def move_future_posts_to_drafts(dry_run=False):
    """Move future-dated posts to _drafts directory"""
    today = datetime.now(timezone.utc)
    posts_dir = find_posts_directory()
    drafts_dir = os.path.join(posts_dir, '_drafts')

    if not dry_run:
        os.makedirs(drafts_dir, exist_ok=True)

    moved_count = 0
    for root, dirs, files in os.walk(posts_dir):
        # Skip any _drafts directories in the walk
        dirs[:] = [d for d in dirs if d != '_drafts']
        for file in files:
            if file.endswith('.md') or file.endswith('.mdx'):
                file_path = os.path.join(root, file)
                file_date, _ = parse_date_from_filename(file)
                if file_date and file_date > today:
                    # Calculate relative path from posts_dir
                    relative_path = os.path.relpath(root, posts_dir)
                    # Construct target directory in _drafts
                    target_dir = os.path.join(drafts_dir, relative_path)
                    target_path = os.path.join(target_dir, file)

                    if dry_run:
                        print(f"[DRY RUN] Would move future post: {file}")
                        print(f"           From: {file_path}")
                        print(f"           To:   {target_path}")
                    else:
                        os.makedirs(target_dir, exist_ok=True)
                        track_migration(file_path, target_path)
                        shutil.move(file_path, target_path)
                        print(f"✓ Moved future post {file} to drafts.")
                    moved_count += 1

    if moved_count == 0:
        print("ⓘ No future-dated posts found to move")
    else:
        print(f"✓ Processed {moved_count} future-dated post(s)")

def publish_due_drafts(dry_run=False):
    """Publish drafts that are due to be published"""
    today = datetime.now(timezone.utc)
    published_posts = []
    posts_dir = find_posts_directory()
    drafts_dir = os.path.join(posts_dir, '_drafts')

    if not os.path.exists(drafts_dir):
        print(f"ⓘ No _drafts directory found at: {drafts_dir}")
        return

    print(f"✓ Checking drafts in: {drafts_dir}")
    published_count = 0

    for root, dirs, files in os.walk(drafts_dir):
        for file in files:
            if file.endswith('.md') or file.endswith('.mdx'):
                file_path = os.path.join(root, file)
                file_date, slug = parse_date_from_filename(file)
                if file_date and file_date <= today:
                    # Calculate relative path from drafts_dir
                    relative_path = os.path.relpath(root, drafts_dir)
                    # Construct target directory in posts
                    target_dir = os.path.join(posts_dir, relative_path)
                    target_file_path = os.path.join(target_dir, file)

                    if dry_run:
                        print(f"[DRY RUN] Would publish draft: {file}")
                        print(f"           From: {file_path}")
                        print(f"           To:   {target_file_path}")
                    else:
                        os.makedirs(target_dir, exist_ok=True)
                        track_migration(file_path, target_file_path)
                        shutil.move(file_path, target_file_path)
                        print(f"✓ Published draft {file} to posts.")

                    # Read the post title from the Markdown file
                    with open(file_path if dry_run else target_file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                    title = None
                    in_front_matter = False
                    for line in lines:
                        stripped_line = line.strip()
                        if stripped_line == '---':
                            in_front_matter = not in_front_matter
                            continue
                        if in_front_matter and stripped_line.startswith('title:'):
                            # If using YAML front matter
                            title = stripped_line[6:].strip().strip('"').strip("'")
                            break
                        if not in_front_matter and stripped_line.startswith('# '):
                            # Markdown header
                            title = stripped_line[2:].strip()
                            break
                    if not title:
                        title = slug.replace('-', ' ').title()

                    # Construct post URL
                    post_url = construct_post_url(file_date, slug)

                    # Save the post title and URL
                    published_posts.append({'title': title, 'url': post_url})
                    published_count += 1

    # Save the published posts to a JSON file
    if published_posts:
        date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        pp_path = f'./src/.sites/{site_code}/state/published_posts-{date_str}.json'
        if dry_run:
            print(f"[DRY RUN] Would save published posts to: {pp_path}")
            print(f"[DRY RUN] Posts that would be published:")
            for post in published_posts:
                print(f"           - {post['title']}")
        else:
            with open(pp_path, 'w', encoding='utf-8') as f:
                json.dump(published_posts, f, ensure_ascii=False, indent=2)
            print(f"✓ Saved {len(published_posts)} published posts to: {pp_path}")
    else:
        print("ⓘ No drafts due for publishing")

def construct_post_url(date, slug):
    root_url = os.environ.get('ROOT_URL')
    if not root_url:
        print("ERROR: ROOT_URL environment variable is not set.")
        sys.exit(1)
    if not root_url.endswith('/'):
        root_url += '/'
    date_str = date.strftime('%Y/%m/%d')
    return f"{root_url}{date_str}/{slug}/"

def main():
    parser = argparse.ArgumentParser(description="Manage blog post publishing schedule")
    parser.add_argument('--dry-run', action='store_true',
                       help='Perform a dry run without making any changes')
    args = parser.parse_args()

    print("=" * 60)
    print(f"Blog Post Management Script")
    print(f"Site: {site_code}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print("=" * 60)

    # Validate directory structure
    validate_structure()

    # Move future posts to drafts
    print("\n--- Moving Future Posts to Drafts ---")
    move_future_posts_to_drafts(args.dry_run)

    # Publish due drafts
    print("\n--- Publishing Due Drafts ---")
    publish_due_drafts(args.dry_run)

    # Update bluesky tracking
    print("\n--- Updating Bluesky Post Tracking ---")
    update_bluesky_posted_paths(args.dry_run)

    print("\n" + "=" * 60)
    print(f"✓ Completed {'(DRY RUN - no changes made)' if args.dry_run else 'successfully'}")
    print("=" * 60)

if __name__ == "__main__":
    main()

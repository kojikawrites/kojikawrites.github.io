import os
import sys
import json
import argparse
from datetime import datetime, timezone
from atproto import Client, models
import re
from urllib.parse import quote_plus

def parse_date_from_filename(filename):
    match = re.match(r'(\d{4})-(\d{2})-(\d{2})-(.*)\.md$', filename)
    if match:
        year, month, day, slug = match.groups()
        return datetime(int(year), int(month), int(day), tzinfo=timezone.utc), slug
    return None, None

def construct_post_url(date, slug, root_url, categories):
    if not root_url:
        print("Error: ROOT_URL is not provided.")
        sys.exit(1)
    date_str = date.strftime('%Y/%m/%d')
    # Join categories into a path
    categories_path = '/'.join(quote_plus(cat.strip()) for cat in categories)
    return f"{root_url}{categories_path}/{date_str}/{slug}/"

def extract_metadata_from_file(file_path, slug):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    title = None
    categories = []
    in_front_matter = False
    for line in lines:
        stripped_line = line.strip()
        if stripped_line == '---':
            in_front_matter = not in_front_matter
            continue
        if in_front_matter:
            if stripped_line.startswith('title:'):
                # YAML front matter title
                title = stripped_line[6:].strip().strip('"').strip("'")
            elif stripped_line.startswith('categories:'):
                # Categories can be a list or space-separated
                categories_line = stripped_line[11:].strip()
                if categories_line.startswith('[') and categories_line.endswith(']'):
                    # Handle list format: categories: [cat1, cat2]
                    categories = [cat.strip().strip('"').strip("'") for cat in categories_line[1:-1].split(',')]
                else:
                    # Handle space-separated: categories: cat1 cat2
                    categories = categories_line.split()
        elif not in_front_matter and not title and stripped_line.startswith('# '):
            # Markdown header
            title = stripped_line[2:].strip()
            break
        if title and categories:
            break

    if not title:
        title = slug.replace('-', ' ').title()
    if not categories:
        categories = []

    return title, categories

def post_to_bluesky(title, url, categories, client, testrun=False):
    # Construct the message

    if categories is None:
        categories = []
    message = "New blog post!\nAs always, comments and questions are welcome.\n\n"
    for category in categories:
        message += f"#{category}\n"
    embed = models.AppBskyEmbedExternal.Main(
        external=models.AppBskyEmbedExternal.External(
            title=title,
            description=f"New Blog Post: {title}",
            uri=url,
        )
    )

    if testrun:
        print(f"[Test Run] Would post to Bluesky: {message}")
        return True

    # Post the message
    try:
        client.send_post(text=message, embed=embed)
        print(f"Successfully posted to Bluesky: {title}")
        return True
    except Exception as e:
        print(f"Error posting to Bluesky: {e}")
        return False

def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Post new blog posts to Bluesky.")
    parser.add_argument('--root-url', type=str, help='Root URL of the website')
    parser.add_argument('--announce-start-date', type=str, help='Start date for announcements (YYYY-MM-DD)')
    parser.add_argument('--testrun', action='store_true', help='Perform a test run without posting or updating the tracking list')
    parser.add_argument('--root-dir', type=str, default='.', help='Root directory to start searching from')
    args = parser.parse_args()

    # Retrieve or set ROOT_URL
    root_url = args.root_url or os.environ.get('ROOT_URL')
    if not root_url:
        print("Error: ROOT_URL is not provided via --root-url or environment variable.")
        sys.exit(1)
    if not root_url.endswith('/'):
        root_url += '/'

    # Retrieve or set ANNOUNCE_START_DATE
    announce_start_date_str = args.announce_start_date or os.environ.get('ANNOUNCE_START_DATE')
    if not announce_start_date_str:
        print("Error: ANNOUNCE_START_DATE is not provided via --announce-start-date or environment variable.")
        sys.exit(1)
    try:
        announce_start_date = datetime.strptime(announce_start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
    except ValueError:
        print("Error: ANNOUNCE_START_DATE must be in YYYY-MM-DD format.")
        sys.exit(1)

    # Load the tracking list
    tracking_file = 'bluesky_posted.json'
    if os.path.exists(tracking_file):
        with open(tracking_file, 'r', encoding='utf-8') as f:
            posted_posts = json.load(f)
    else:
        posted_posts = []

    posted_ids = set(posted_posts)
    # Get current date and time in UTC
    current_datetime = datetime.now(timezone.utc)

    # Find all posts in the _posts directories
    posts_to_announce = []
    for root, dirs, files in os.walk(args.root_dir):
        # Skip _drafts directories
        dirs[:] = [d for d in dirs if d != '_drafts']
        if '_posts' in dirs:
            posts_dir = os.path.join(root, '_posts')
            for post_root, post_dirs, post_files in os.walk(posts_dir):
                for file in post_files:
                    if file.endswith('.md'):
                        file_path = os.path.join(post_root, file)
                        relative_path = os.path.relpath(file_path, args.root_dir)
                        post_id = relative_path.replace('\\', '/')

                        file_date, slug = parse_date_from_filename(file)
                        if not file_date:
                            continue
                        if file_date < announce_start_date:
                            continue
                        if file_date > current_datetime:
                            continue  # Skip future-dated posts
                        if post_id in posted_ids:
                            continue

                        title, categories = extract_metadata_from_file(file_path, slug)
                        url = construct_post_url(file_date, slug, root_url, categories)
                        posts_to_announce.append({
                            'id': post_id,
                            'title': title,
                            'url': url,
                            'date': file_date,
                            'categories': categories
                        })

    if not posts_to_announce:
        print("No new posts to announce.")
        return

    # Sort posts by date in ascending order
    posts_to_announce.sort(key=lambda x: x['date'])

    # Initialize the Bluesky client
    if not args.testrun:
        bluesky_username = os.environ.get('BLUESKY_USERNAME')
        bluesky_password = os.environ.get('BLUESKY_PASSWORD')
        if not bluesky_username or not bluesky_password:
            print("Bluesky credentials are not set.")
            sys.exit(1)
    else:
        bluesky_username = "test_user"
        bluesky_password = "test_password"

    client = Client()

    if not args.testrun:
        try:
            client.login(bluesky_username, bluesky_password)
        except Exception as e:
            print(f"Error logging into Bluesky: {e}")
            sys.exit(1)
    else:
        print("[Test Run] Skipping Bluesky login.")

    # Post to Bluesky and update the tracking list
    for post in posts_to_announce:
        title = post['title']
        url = post['url']
        post_id = post['id']
        categories = post['categories']
        success = post_to_bluesky(title, url, categories, client, testrun=args.testrun)
        if success:
            if not args.testrun:
                posted_posts.append(post_id)
        else:
            print(f"Failed to post: {title}")

    # Save the updated tracking list
    if not args.testrun:
        with open(tracking_file, 'w', encoding='utf-8') as f:
            json.dump(posted_posts, f, ensure_ascii=False, indent=2)
    else:
        print("[Test Run] Tracking list not updated.")

if __name__ == '__main__':
    main()

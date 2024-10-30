import os
import sys
import json
import argparse
import pathlib
from datetime import datetime, timezone
from atproto import Client, models, client_utils
import re
from urllib.parse import quote_plus
import markdown
import random
from bs4 import BeautifulSoup

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

def strip_markdown(md_text):
    """
    Convert markdown text to plain text, removing Liquid syntax and HTML tags.

    Args:
        md_text (str): The markdown-formatted text.

    Returns:
        str: The plain text.
    """
    # Remove Liquid tags
    md_text = re.sub(r'{%.*?%}', '', md_text)
    md_text = re.sub(r'{{.*?}}', '', md_text)

    # Convert Markdown to HTML
    html = markdown.markdown(md_text)
    # Parse HTML and extract text
    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text()
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_random_image_path(content_body):
    """
    Extract image paths from the markdown content.

    Args:
        content_body (str): The markdown content of the post.

    Returns:
        list: A list of image paths found in the content.
    """
    # Regular expression to match the image declaration pattern
    # Matches strings like: "/path/filename.png" | relative_url
    pattern = r'["\'](/[^"\']+\.png)["\']\s*\|\s*relative_url'

    image_paths = re.findall(pattern, content_body, flags=re.IGNORECASE)
    if len(image_paths) <= 1:
        return None
    image_paths = image_paths[:-1]
    return random.choice(image_paths)

def extract_metadata_from_file(file_path, slug, root_dir):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split front matter and content
    parts = content.split('---')
    if len(parts) >= 3:
        front_matter = parts[1]
        content_body = '---'.join(parts[2:])
    else:
        front_matter = ''
        content_body = content

    # Process front matter
    title = None
    categories = []
    summary = None
    for line in front_matter.strip().split('\n'):
        stripped_line = line.strip()
        if stripped_line.startswith('title:'):
            title = stripped_line[6:].strip().strip('"').strip("'")
        elif stripped_line.startswith('categories:'):
            categories_line = stripped_line[11:].strip()
            if categories_line.startswith('[') and categories_line.endswith(']'):
                categories = [cat.strip().strip('"').strip("'") for cat in categories_line[1:-1].split(',')]
            else:
                categories = categories_line.split()
        elif stripped_line.startswith('summary:'):
            summary = stripped_line[8:].strip().strip('"').strip("'")

    if not title:
        # Try to find title in content
        match = re.search(r'^#\s+(.+)$', content_body, flags=re.MULTILINE)
        if match:
            title = match.group(1).strip()
        else:
            title = slug.replace('-', ' ').title()

    if not categories:
        categories = []

    if not summary:
        # Extract first paragraph
        paragraphs = content_body.strip().split('\n\n')
        if paragraphs:
            first_paragraph = paragraphs[0]
            summary = strip_markdown(first_paragraph)
        else:
            summary = ''

    # Extract image paths
    image_path = extract_random_image_path(content_body)
    if image_path is None:
        full_image_path = None
    else:
        # Construct the full path relative to the root directory
        #full_image_path = pathlib.Path(root_dir).joinpath(image_path)
        # if full_image_path == image_path:
        if not root_dir.endswith(os.sep) and not image_path.startswith(os.sep):
            root_dir += os.sep
        full_image_path = root_dir + image_path

        if not os.path.exists(full_image_path):
            full_image_path = None

    return title, categories, summary, full_image_path

def post_to_bluesky(title, summary, image_path, url, categories, client, testrun=False):
    # Construct the message

    if categories is None:
        categories = []

    try:
        with open(image_path, 'rb') as f:
          img_data = f.read()
          thumb = client.upload_blob(img_data)
          blob = thumb.blob
    except:
        blob = None
    tb = client_utils.TextBuilder()
    tb.text("New blog post!\nAs always, comments and questions are welcome.\n\n")
    for category in categories:
        tb.tag(f"#{category}\n", "atproto")

    embed = models.AppBskyEmbedExternal.Main(
        external=models.AppBskyEmbedExternal.External(
            title=title,
            description=f"New Blog Post: {summary}",
            uri=url,
            thumb = blob
        )
    )
    tb.text("\n\n(This is an automated post.)")


    if testrun:
        (f"[Test Run] Would post to Bluesky: {tb.build_text()}")
        return True

    # Post the message
    try:
        client.send_post(text=tb, embed=embed)
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

                        title, categories, summary, image_path = extract_metadata_from_file(file_path, slug, args.root_dir)
                        url = construct_post_url(file_date, slug, root_url, categories)
                        posts_to_announce.append({
                            'id': post_id,
                            'title': title,
                            'url': url,
                            'date': file_date,
                            'categories': categories,
                            'summary': summary,
                            'image_path': image_path,
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
        summary = post['summary']
        image_path = post['image_path']
        success = post_to_bluesky(title, summary, image_path, url, categories, client, testrun=args.testrun)
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

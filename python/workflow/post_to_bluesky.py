import os
import sys
import time
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone
from atproto import Client, models, client_utils
import re
from urllib.parse import quote_plus
import markdown
import random
from bs4 import BeautifulSoup
from PIL import Image
from dotenv import load_dotenv
import pprint

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


def create_post_url_from_uri(post_uri):
    """
    Create a Bluesky web URL from an ATProto URI and extract the profile_id.

    Args:
        post_uri (str): ATProto URI (e.g., "at://did:plc:xxx/app.bsky.feed.post/rkey")

    Returns:
        tuple: (post_url, profile_id) or (None, None) if creation fails
    """
    # Parse the post_uri to extract DID and rkey
    match = re.match(r'^at://(did:plc:[^/]+)/app\.bsky\.feed\.post/([^/]+)$', post_uri)
    if not match:
        print(f"Failed to parse post_uri: {post_uri}")
        return None

    did = match.group(1)
    rkey = match.group(2)

    # Use DID directly in the URL - no need to resolve to handle
    post_url = f"https://bsky.app/profile/{did}/post/{rkey}"
    return post_url


def process_thumbnail(image_path, dry_run=False):
    """
    Process the thumbnail image: convert to JPEG if necessary and reduce size if it exceeds 975KB.
    Save the reduced image with '_thumbnail' appended to its name.

    Args:
        image_path (str): Path to the image file.
        dry_run (bool): If True, skip actual processing

    Returns:
        str: Path to the processed thumbnail image, or the original image if no changes were necessary.
    """
    if dry_run:
        print(f"[DRY RUN] Would process thumbnail: {image_path}")
        return image_path

    max_size = 975 * 1024  # 975KB
    if not os.path.exists(image_path):
        print(f"⚠ Image not found: {image_path}")
        return image_path

    # Check the image size
    image_size = os.path.getsize(image_path)
    if image_size <= max_size:
        print(f"✓ Image size OK: {image_size} bytes")
        return image_path  # No changes needed

    # Open the image
    with Image.open(image_path) as img:
        # Convert to JPEG if not already
        if img.format != 'JPEG':
            img = img.convert("RGB")

        # Generate the new filename
        base, ext = os.path.splitext(image_path)
        thumbnail_path = f"{base}_thumbnail.jpg"

        # Reduce dimensions until the size is below the threshold
        original_image_size = image_size
        while image_size > max_size:
            img.save(thumbnail_path, "JPEG", quality=85)
            image_size = os.path.getsize(thumbnail_path)
            if image_size > max_size:
                width, height = img.size
                img = img.resize((width // 2, height // 2))

        # Save the final image
        img.save(thumbnail_path, "JPEG", quality=85)
        print(f"✓ Thumbnail created: {original_image_size} -> {os.path.getsize(thumbnail_path)} bytes")

    return thumbnail_path

def parse_date_from_filename(filename):
    match = re.match(r'(\d{4})-(\d{2})-(\d{2})-(.*)\.mdx?$', filename)
    if match:
        year, month, day, slug = match.groups()
        return datetime(int(year), int(month), int(day), tzinfo=timezone.utc), slug
    return None, None


def construct_post_url(date, slug, root_url, categories):
    if not root_url:
        print("ERROR: ROOT_URL is not provided.")
        sys.exit(1)
    date_str = date.strftime('%Y/%m/%d')
    # Join categories into a path
    categories_path = '/'.join(quote_plus(cat.strip()) for cat in categories).lower()
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
        str: A random image path found in the content, or None if none found.
    """

    # Regular expression to match image declaration patterns:
    # - src="..." or image="..." attributes (HTML/JSX)
    # - Markdown image syntax: ![alt](image.jpg)
    pattern = r'(?:(?:src|image)\s*=\s*["\']([^"\']+\.(?:png|jpe?g|gif|webp))["\'])|\(([^)]+\.(?:png|jpe?g|gif|webp))\)'
    matches = re.findall(pattern, content_body, flags=re.IGNORECASE)
    image_paths = [path for tup in matches for path in tup if path]
    print(f'  Found {len(image_paths)} image(s) in post content')

    if len(image_paths) == 0:
        return None

    # Select a random image (excluding the last one if there are multiple)
    if len(image_paths) > 1:
        image_paths = image_paths[:-1]

    selected_image_path = random.choice(image_paths)
    if selected_image_path.startswith('/'):
        selected_image_path = selected_image_path[1:]
    # Convert to OS-specific path
    selected_image_path = selected_image_path.replace('/', os.sep)
    print(f'  Selected random image: {selected_image_path}')
    return selected_image_path

def extract_metadata_from_file(file_path, slug, post_dir):
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
    description = None
    thumbnail = None
    in_multiline_field = None
    multiline_content = []

    for line in front_matter.strip().split('\n'):
        stripped_line = line.strip()

        # Handle multiline YAML fields (>- or |-)
        if in_multiline_field:
            if stripped_line and not stripped_line.endswith(':'):
                multiline_content.append(stripped_line)
                continue
            else:
                # End of multiline field
                combined = ' '.join(multiline_content)
                if in_multiline_field == 'description':
                    description = combined
                elif in_multiline_field == 'thumbnail':
                    thumbnail = combined
                in_multiline_field = None
                multiline_content = []

        if stripped_line.startswith('title:'):
            title = stripped_line[6:].strip().strip('"').strip("'")
        elif stripped_line.startswith('categories:'):
            categories_line = stripped_line[11:].strip()
            if categories_line.startswith('[') and categories_line.endswith(']'):
                categories = [cat.strip().strip('"').strip("'") for cat in categories_line[1:-1].split(',')]
            else:
                categories = categories_line.split()
        elif stripped_line.startswith('description:'):
            desc_value = stripped_line[12:].strip()
            if desc_value in ('>-', '|-', '>'):
                in_multiline_field = 'description'
                multiline_content = []
            else:
                description = desc_value.strip('"').strip("'")
        elif stripped_line.startswith('thumbnail:'):
            thumb_value = stripped_line[10:].strip()
            if thumb_value in ('>-', '|-', '>'):
                in_multiline_field = 'thumbnail'
                multiline_content = []
            else:
                thumbnail = thumb_value.strip('"').strip("'")

    if not title:
        # Try to find title in content
        match = re.search(r'^#\s+(.+)$', content_body, flags=re.MULTILINE)
        if match:
            title = match.group(1).strip()
        else:
            title = slug.replace('-', ' ').title()

    if not categories:
        categories = []

    if not description:
        # Extract first paragraph
        paragraphs = content_body.strip().split('\n\n')
        if paragraphs:
            first_paragraph = paragraphs[0]
            description = strip_markdown(first_paragraph)
        else:
            description = ''

    # Extract image paths - prefer thumbnail from frontmatter
    image_path = None
    if thumbnail:
        print(f'  Using thumbnail from frontmatter')
        image_path = thumbnail
        # Remove leading slash if present
        if image_path.startswith('/'):
            image_path = image_path[1:]
        # Convert to OS-specific path
        image_path = image_path.replace('/', os.sep)
    else:
        # Fall back to extracting from content
        image_path = extract_random_image_path(content_body)

    if image_path is None:
        full_image_path = None
    else:
        # Check if path already includes the full structure
        if 'src' in image_path and site_code in image_path:
            # Already a full path
            full_image_path = image_path
        else:
            # Images are in src/.sites/{site_code}/images/blog/{slug}/
            # Extract just the filename from the path
            image_filename = os.path.basename(image_path)
            # Construct the correct path for the new structure
            full_image_path = os.path.join('src', '.sites', site_code, 'images', 'blog', slug, image_filename)

        print(f'  Checking image path: {full_image_path}')
        if not os.path.exists(full_image_path):
            print(f"  ⚠ Image not found: {full_image_path}")
            full_image_path = None
        else:
            print(f"  ✓ Image found: {full_image_path}")

    return title, categories, description, full_image_path

def post_to_bluesky(title, post_date, description, image_path, url, categories, category_aliases, auto_post_text, client, dry_run=False):
    # Process the thumbnail
    image_path_thumbnail = None
    if image_path and not dry_run:
        image_path_thumbnail = process_thumbnail(image_path, dry_run)
        image_path = image_path_thumbnail

    # Construct the message
    if categories is None:
        categories = []

    blob = None
    if not dry_run:
        try:
            with open(image_path, 'rb') as f:
                img_data = f.read()
                thumb = client.upload_blob(img_data)
                blob = thumb.blob
                print(f"  ✓ Uploaded image blob")
        except Exception as e:
            print(f"  ⚠ Could not upload image: {e}")
            blob = None

    tb = client_utils.TextBuilder()
    tb.text(f"New blog post: {title}!\n\nAs always, comments and questions are welcome.\n\n")
    for category in categories:
        tb.tag(f"#{category} \n", category)
        aliases = category_aliases.get(category)
        if aliases is not None:
            for alias in aliases:
                tb.tag(f"#{alias} \n", alias)

    embed = models.AppBskyEmbedExternal.Main(
        external=models.AppBskyEmbedExternal.External(
            title=title,
            description=description,
            uri=url,
            thumb=blob
        )
    )
    if auto_post_text is None:
        auto_post_text = "(This is an automated post.)"
    tb.text(f"\n\n{auto_post_text}")

    if dry_run:
        embed_str = ''# f'{embed}'
        print(f"[DRY RUN] Would post to Bluesky:")
        print(f"  Date: {post_date.strftime('%m/%d/%Y')}")
        print(f"  Title: {title}")
        print(f"  URL: {url}")
        print(f"  Text: {tb.build_text()[:100].replace(chr(10), ' ')}...")
        if image_path:
            print(f"  Image: {image_path}")
        else:
            print(f"  Image: None")
        return True, None

    # Post the message
    try:
        response = None
        if not dry_run:
            response = client.send_post(text=tb, embed=embed)
            print(f"✓ Successfully posted to Bluesky: {title}")
        return True, response
    except Exception as e:
        print(f"✗ Error posting to Bluesky: {e}")
        return False, None

def load_config(config_file):
    try:
        import yaml
        with open(config_file, 'r') as file:
            docs = yaml.safe_load_all(file)
            config = next(docs)
            aliases = config["tags_and_categories"]["aliases"]
            auto_post_text = config["bluesky"]["auto_post_text"]
            print(f"✓ Loaded config from: {config_file}")
            return (aliases, auto_post_text)
    except Exception as e:
        print(f"✗ Error loading config from {config_file}: {e}")
        return {}, None

def generate_embed_code(post_uri):
    # Parse the URI to extract DID and RKEY
    # Example URI: 'at://did:plc:xyz1234/app.bsky.feed.post/3jtuqlrzi2v24'
    # https://bsky.app/profile/kojika.bsky.social/post/3lbgeb7w5jo2w
    #
    match = re.match(r'^at://(did:[^/]+)/app\.bsky\.feed\.post/([^/]+)$', post_uri)
    if match:
        did = match.group(1)
        rkey = match.group(2)
        # Construct the embed URL
        embed_url = f"https://staging.bsky.app/profile/{did}/post/{rkey}"
        # Create the embed code (adjust according to your blog's requirements)
        embed_code = f'<iframe src="{embed_url}" frameborder="0" allowfullscreen></iframe>'
        return embed_code
    else:
        print(f"Invalid post URI: {post_uri}")
        return ""

def replace_in_file(file_path, post_uri, dry_run=False):
    """
    Opens the file at file_path, replaces occurrences of '<<atprotoURI>>' with post_uri, and saves the file.

    :param file_path: The path to the text file.
    :param post_uri: The string to replace '<<atprotoURI>>' with.
    :param dry_run: If True, don't actually modify the file
    """
    try:
        # Open the file in read mode and read its content
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        # Replace all occurrences of '<<atprotoURI>>' with the value of post_uri
        updated_content = content.replace('<<atprotoURI>>', post_uri)
        bluesky_username = os.environ.get('BLUESKY_USERNAME')
        updated_content = updated_content.replace('<<atHandle>>', bluesky_username)

        if dry_run:
            has_placeholder = '<<atprotoURI>>' in content or '<<atHandle>>' in content
            print(f"[DRY RUN] Would update placeholders in: {file_path}")
            if has_placeholder:
                print(f"           Found placeholders to replace")
            return

        # Open the file in write mode and write the updated content back to the file
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(updated_content)

        print(f"  ✓ Updated placeholders in file: {file_path}")
    except Exception as e:
        print(f"  ✗ Error processing file {file_path}: {e}")

def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Post new blog posts to Bluesky.")
    parser.add_argument('--root-url', type=str, help='Root URL of the website')
    parser.add_argument('--announce-start-date', type=str, help='Start date for announcements (YYYY-MM-DD)')
    parser.add_argument('--dry-run', action='store_true', help='Perform a dry run without posting or updating the tracking list')

    args = parser.parse_args()

    print("=" * 60)
    print(f"Bluesky Post Automation Script")
    print(f"Site: {site_code}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print("=" * 60)

    # Validate directory structure
    validate_structure()

    # Retrieve or set ROOT_URL
    root_url = args.root_url or os.environ.get('ROOT_URL')
    if not root_url:
        print("ERROR: ROOT_URL is not provided via --root-url or environment variable.")
        sys.exit(1)
    if not root_url.endswith('/'):
        root_url += '/'

    # Set up paths based on new structure
    post_dir = f'src/.sites/{site_code}/content/posts/'
    state_dir = f'src/.sites/{site_code}/state/'
    config_file = f'src/.sites/{site_code}/config/site.yaml'

    print(f"✓ Posts directory: {post_dir}")
    print(f"✓ State directory: {state_dir}")
    print(f"✓ Config file: {config_file}")

    # Retrieve or set ANNOUNCE_START_DATE
    announce_start_date_str = args.announce_start_date or os.environ.get('ANNOUNCE_START_DATE')
    if not announce_start_date_str:
        print("ERROR: ANNOUNCE_START_DATE is not provided via --announce-start-date or environment variable.")
        sys.exit(1)
    try:
        announce_start_date = datetime.strptime(announce_start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        print(f"✓ Announce start date: {announce_start_date.strftime('%Y-%m-%d')}")
    except ValueError:
        print("ERROR: ANNOUNCE_START_DATE must be in YYYY-MM-DD format.")
        sys.exit(1)

    # Load the tracking list
    tracking_file = os.path.join(state_dir, 'bluesky_posted.json')
    print(f'✓ Tracking file: {tracking_file}')
    if os.path.exists(tracking_file):
        with open(tracking_file, 'r', encoding='utf-8') as f:
            posted_posts = json.load(f)
        print(f"✓ Loaded {len(posted_posts)} previously posted entries")
    else:
        posted_posts = []
        print(f"ⓘ No existing tracking file found")

    posted_ids = set([p["post_id"] for p in posted_posts])

    # Get current date and time in UTC
    current_datetime = datetime.now(timezone.utc)
    print(f"✓ Current time: {current_datetime.strftime('%Y-%m-%d %H:%M:%S')} UTC")

    # Find all posts in the posts directory
    print(f"\n--- Scanning for posts to announce ---")
    posts_to_announce = []
    processed_post_ids = set()

    if not os.path.exists(post_dir):
        print(f"ERROR: Post directory not found: {post_dir}")
        sys.exit(1)

    for root, dirs, files in os.walk(post_dir):
        # Skip _drafts directories
        dirs[:] = [d for d in dirs if d != '_drafts']

        for file in files:
            if file.endswith('.md') or file.endswith('.mdx'):
                file_path = os.path.join(root, file)
                if "_drafts" in file_path:
                    print(f"  ⊘ {file} is in draft status. Skipping...")
                    continue

                relative_path = os.path.relpath(file_path, post_dir)
                # Simplified post_id - just the relative path
                post_id = relative_path.replace('\\', '/')

                file_date, slug = parse_date_from_filename(file)

                if not file_date:
                    print(f"  ⊘ {file} - couldn't parse date from filename")
                    continue
                if file_date < announce_start_date:
                    continue
                if file_date > current_datetime:
                    print(f"  ⊘ {file} - future-dated, skipping")
                    continue

                if post_id in posted_ids:
                    print(f"  ⊘ {file} - already posted")
                    continue
                if post_id in processed_post_ids:
                    print(f"  ⊘ {file} - duplicate in scan")
                    continue

                processed_post_ids.add(post_id)
                print(f"  ✓ {file} - queued for announcement")

                title, categories, description, image_path = extract_metadata_from_file(file_path, slug, post_dir)
                url = construct_post_url(file_date, slug, root_url, categories)

                posts_to_announce.append({
                    'id': post_id,
                    'file_path': file_path,
                    'title': title,
                    'url': url,
                    'date': file_date,
                    'categories': categories,
                    'description': description,
                    'image_path': image_path,
                })

    if not posts_to_announce:
        print("\n" + "=" * 60)
        print("ⓘ No new posts to announce.")
        print("=" * 60)
        return

    # Sort posts by date in ascending order
    posts_to_announce.sort(key=lambda x: x['date'])
    print(f"\n✓ Found {len(posts_to_announce)} post(s) to announce")

    # Initialize the Bluesky client
    if not args.dry_run:
        bluesky_username = os.environ.get('BLUESKY_USERNAME')
        bluesky_password = os.environ.get('BLUESKY_PASSWORD')
        if not bluesky_username or not bluesky_password:
            print("ERROR: Bluesky credentials are not set.")
            sys.exit(1)
        print(f"✓ Bluesky username: {bluesky_username}")
    else:
        bluesky_username = "test_user"
        bluesky_password = "test_password"

    client = Client()

    if not args.dry_run:
        try:
            client.login(bluesky_username, bluesky_password)
            print(f"✓ Logged into Bluesky")
        except Exception as e:
            print(f"✗ Error logging into Bluesky: {e}")
            sys.exit(1)
    else:
        print("[DRY RUN] Skipping Bluesky login.")

    # Post to Bluesky and update the tracking list
    print(f"\n--- Posting to Bluesky ---")
    category_aliases, auto_post_text = load_config(config_file)

    for post in posts_to_announce:
        title = post['title']
        url = post['url']
        post_id = post['id']
        file_path = post['file_path']
        categories = post['categories']
        description = post['description']
        image_path = post['image_path']
        post_date = post['date']

        print(f"\nProcessing: {title}")
        success, response = post_to_bluesky(
                            title,
                            post_date,
                            description,
                            image_path,
                            url,
                            categories,
                            category_aliases,
                            auto_post_text,
                            client,
                            dry_run=args.dry_run)
        if success:
            if not args.dry_run:
                # Extract embedding info
                post_uri = response.uri  # The unique identifier of the post
                post_cid = response.cid   # The content ID

                # Create the Bluesky web URL from the ATProto URI
                post_url = create_post_url_from_uri(post_uri)

                # Build the entry
                entry = {
                    "post_id": post_id,
                    "post_uri": post_uri,
                    "post_cid": post_cid,
                }

                # Add post_url if we successfully created it
                if post_url:
                    entry["post_url"] = post_url
                    print(f"  ✓ Created post URL: {post_url}")
                else:
                    print(f"  ⚠ Could not create post_url for {post_id}")

                posted_posts.append(entry)

                # Update the post file with the URI
                replace_in_file(file_path, post_uri, args.dry_run)
        else:
            print(f"  ✗ Failed to post: {title}")

        if not args.dry_run:
            # pause for a few seconds to ensure we can't exceed rate limit.
            print(f"  Waiting 7 seconds (rate limit protection)...")
            time.sleep(7)

    # Save the updated tracking list
    print(f"\n--- Saving Tracking Data ---")
    if not args.dry_run:
        with open(tracking_file, 'w', encoding='utf-8') as f:
            json.dump(posted_posts, f, ensure_ascii=False, indent=2)
        print(f"✓ Saved tracking file: {len(posted_posts)} total entries")
    else:
        print(f"[DRY RUN] Would save {len(posts_to_announce)} new entries to tracking file")

    print("\n" + "=" * 60)
    print(f"✓ Completed {'(DRY RUN - no changes made)' if args.dry_run else 'successfully'}")
    print("=" * 60)


if __name__ == '__main__':
    main()

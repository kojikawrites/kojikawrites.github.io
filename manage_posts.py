import os
import shutil
from datetime import datetime, timezone
import re
import json
from dotenv import load_dotenv
load_dotenv()
site_code = os.environ["SITE_CODE"]

def parse_date_from_filename(filename):
    match = re.match(r'(\d{4})-(\d{2})-(\d{2})-(.*)\.md$', filename)
    if match:
        year, month, day, slug = match.groups()
        return datetime(int(year), int(month), int(day), tzinfo=timezone.utc), slug
    return None, None

def find_posts_directories():
    directory = f'./src/assets/posts'
    for root, dirs, files in os.walk(directory):
        for dirname in dirs:
            if dirname == site_code:
                yield os.path.join(root, dirname)

def move_future_posts_to_drafts():
    today = datetime.now(timezone.utc)
    for posts_dir in set(find_posts_directories()):
        drafts_dir = os.path.join(posts_dir, '_drafts')
        os.makedirs(drafts_dir, exist_ok=True)
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
                        # Construct target directory in _posts/_drafts
                        target_dir = os.path.join(drafts_dir, relative_path)
                        os.makedirs(target_dir, exist_ok=True)
                        # Move file
                        shutil.move(file_path, os.path.join(target_dir, file))
                        print(f"Moved future post {file} to drafts.")

def publish_due_drafts():
    today = datetime.now(timezone.utc)
    published_posts = []

    for posts_dir in find_posts_directories():
        drafts_dir = os.path.join(posts_dir, '_drafts')
        if not os.path.exists(drafts_dir):
            continue
        for root, dirs, files in os.walk(drafts_dir):
            for file in files:
                if file.endswith('.md') or file.endswith('.mdx'):
                    file_path = os.path.join(root, file)
                    file_date, slug = parse_date_from_filename(file)
                    if file_date and file_date <= today:
                        # Calculate relative path from drafts_dir
                        relative_path = os.path.relpath(root, drafts_dir)
                        # Construct target directory in _posts
                        target_dir = os.path.join(posts_dir, relative_path)
                        os.makedirs(target_dir, exist_ok=True)
                        # Move file
                        target_file_path = os.path.join(target_dir, file)
                        shutil.move(file_path, target_file_path)
                        print(f"Published draft {file} to posts.")

                        # Read the post title from the Markdown file
                        with open(target_file_path, 'r', encoding='utf-8') as f:
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

        # Clean up empty _drafts directories
#         for root, dirs, files in os.walk(drafts_dir, topdown=False):
#             if not dirs and not files:
#                 os.rmdir(root)

    # Save the published posts to a JSON file
    if published_posts:
        date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        pp_path = f'./src/assets/_private/state/{site_code}/published_posts-{date_str}.json'
        with open(pp_path, 'w', encoding='utf-8') as f:
            json.dump(published_posts, f, ensure_ascii=False, indent=2)
        print("Saved published posts information to published_posts.json")

def construct_post_url(date, slug):
    root_url = os.environ.get('ROOT_URL')
    if not root_url:
        print("Error: ROOT_URL environment variable is not set.")
        exit(1)
    date_str = date.strftime('%Y/%m/%d')
    return f"{root_url}/{date_str}/{slug}/"

if __name__ == "__main__":
    move_future_posts_to_drafts()
    publish_due_drafts()

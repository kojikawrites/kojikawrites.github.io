import os
import shutil
from datetime import datetime
import re

def parse_date_from_filename(filename):
    match = re.match(r'(\d{4})-(\d{2})-(\d{2})-.*\.md$', filename)
    if match:
        year, month, day = map(int, match.groups())
        return datetime(year, month, day)
    return None

def find_directories(directory, target_dirname):
    for root, dirs, files in os.walk(directory):
        for dirname in dirs:
            if dirname == target_dirname:
                yield os.path.join(root, dirname)

def move_future_posts_to_drafts():
    today = datetime.now()
    for posts_dir in find_directories('.', '_posts'):
        drafts_dir = os.path.join(os.path.dirname(posts_dir), '_drafts')
        os.makedirs(drafts_dir, exist_ok=True)
        for root, dirs, files in os.walk(posts_dir):
            for file in files:
                if file.endswith('.md'):
                    file_path = os.path.join(root, file)
                    file_date = parse_date_from_filename(file)
                    if file_date and file_date > today:
                        # Calculate relative path
                        relative_path = os.path.relpath(root, posts_dir)
                        # Construct target directory in _drafts
                        target_dir = os.path.join(drafts_dir, relative_path)
                        os.makedirs(target_dir, exist_ok=True)
                        # Move file
                        shutil.move(file_path, os.path.join(target_dir, file))
                        print(f"Moved future post {file} to drafts.")

def publish_due_drafts():
    today = datetime.now()
    for drafts_dir in find_directories('.', '_drafts'):
        posts_dir = os.path.join(os.path.dirname(drafts_dir), '_posts')
        os.makedirs(posts_dir, exist_ok=True)
        for root, dirs, files in os.walk(drafts_dir):
            for file in files:
                if file.endswith('.md'):
                    file_path = os.path.join(root, file)
                    file_date = parse_date_from_filename(file)
                    if file_date and file_date <= today:
                        # Calculate relative path
                        relative_path = os.path.relpath(root, drafts_dir)
                        # Construct target directory in _posts
                        target_dir = os.path.join(posts_dir, relative_path)
                        os.makedirs(target_dir, exist_ok=True)
                        # Move file
                        shutil.move(file_path, os.path.join(target_dir, file))
                        print(f"Published draft {file} to posts.")

if __name__ == "__main__":
    move_future_posts_to_drafts()
    publish_due_drafts()

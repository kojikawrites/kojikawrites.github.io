import os
import sys
import json
from atproto import Client

def post_to_bluesky(title, url):
    # Retrieve Bluesky credentials from environment variables
    BLUESKY_USERNAME = os.environ.get('BLUESKY_USERNAME')
    BLUESKY_PASSWORD = os.environ.get('BLUESKY_PASSWORD')

    if not BLUESKY_USERNAME or not BLUESKY_PASSWORD:
        print("Bluesky credentials are not set.")
        sys.exit(1)

    # Initialize the client
    client = Client()
    try:
        client.login(BLUESKY_USERNAME, BLUESKY_PASSWORD)
    except Exception as e:
        print(f"Error logging into Bluesky: {e}")
        sys.exit(1)

    # Construct the message
    message = f"New blog post: {title}\n\nRead it here: {url}"

    # Post the message
    try:
        client.send_post(text=message)
        print(f"Successfully posted to Bluesky: {title}")
    except Exception as e:
        print(f"Error posting to Bluesky: {e}")
        sys.exit(1)

def main():
    # Read the published posts file
    PUBLISHED_POSTS_FILE = 'published_posts.json'

    if not os.path.exists(PUBLISHED_POSTS_FILE):
        print("No new posts to announce.")
        return

    with open(PUBLISHED_POSTS_FILE, 'r', encoding='utf-8') as f:
        published_posts = json.load(f)

    for post in published_posts:
        title = post.get('title')
        url = post.get('url')
        if title and url:
            post_to_bluesky(title, url)

if __name__ == '__main__':
    main()

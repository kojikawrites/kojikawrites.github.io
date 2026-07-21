#!/bin/bash

# This script moves future-dated posts from _posts to _posts/_drafts,
# and publishes due drafts by moving them from _posts/_drafts to _posts.
# It maintains the directory structure and processes files recursively.

# Get today's date in YYYY-MM-DD format
today=$(date +%Y-%m-%d)

# Find all _posts directories recursively
find . -type d -name '_posts' | while read posts_dir; do
    # Define the drafts directory inside the current _posts directory
    drafts_dir="$posts_dir/_drafts"

    # Create the drafts directory if it doesn't exist
    mkdir -p "$drafts_dir"

    # Move future-dated posts from _posts to _posts/_drafts
    find "$posts_dir" -type f -name '*.md' ! -path "$posts_dir/_drafts/*" | while read file; do
        filename=$(basename "$file")
        # Extract date from filename
        if [[ $filename =~ ^([0-9]{4})-([0-9]{2})-([0-9]{2})-.*\.md$ ]]; then
            file_date="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
            if [[ "$file_date" > "$today" ]]; then
                # Calculate relative path from posts_dir to the file
                relative_path=$(dirname "${file#$posts_dir/}")
                # Construct target directory in _posts/_drafts
                target_dir="$drafts_dir/$relative_path"
                mkdir -p "$target_dir"
                # Move the file
                mv "$file" "$target_dir/"
                echo "Moved future post $filename to drafts."
            fi
        fi
    done

    # Publish due drafts by moving them from _posts/_drafts to _posts
    if [ -d "$drafts_dir" ]; then
        find "$drafts_dir" -type f -name '*.md' | while read file; do
            filename=$(basename "$file")
            # Extract date from filename
            if [[ $filename =~ ^([0-9]{4})-([0-9]{2})-([0-9]{2})-.*\.md$ ]]; then
                file_date="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
                if [[ "$file_date" <= "$today" ]]; then
                    # Calculate relative path from drafts_dir to the file
                    relative_path=$(dirname "${file#$drafts_dir/}")
                    # Construct target directory in _posts
                    target_dir="$posts_dir/$relative_path"
                    mkdir -p "$target_dir"
                    # Move the file
                    mv "$file" "$target_dir/"
                    echo "Published draft $filename to posts."
                fi
            fi
        done

        # Remove empty directories within _drafts
        find "$drafts_dir" -type d -empty -delete
    fi
done

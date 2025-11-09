#!/usr/bin/env python3
"""
Migrate blog images to slug-based directory structure.

This script:
1. Scans blog posts for LightboxImage and GalleryImage components
2. Copies images to slug-based subdirectories (e.g., blog/2024-07-11-post/image.png)
3. Updates component attributes to use new paths
4. Optionally converts src attributes to image attributes
5. Removes original source images after successful migration

Usage:
    python migrate_blog_images.py [--dry-run] [--update-src-to-image]
"""

import argparse
import os
import re
import shutil
from pathlib import Path
from typing import Dict, List, Set, Tuple


class BlogImageMigrator:
    def __init__(self, dry_run: bool = False, update_src_to_image: bool = False):
        self.dry_run = dry_run
        self.update_src_to_image = update_src_to_image
        self.root_dir = Path(__file__).parent
        self.blog_posts_dir = self.root_dir / "src/assets/posts/hiivelabs.com"
        self.blog_images_dir = self.root_dir / "src/assets/images/hiivelabs.com/blog"
        self.source_images: Set[Path] = set()
        self.copied_images: Set[Path] = set()
        self.errors: List[str] = []

    def extract_slug_from_filename(self, mdx_file: Path) -> str:
        """Extract slug from MDX filename (e.g., 2024-07-11-post.mdx -> 2024-07-11-post)"""
        return mdx_file.stem

    def parse_image_component(self, line: str) -> Tuple[str, Dict[str, str]]:
        """
        Parse a LightboxImage or GalleryImage component line.
        Returns (component_type, attributes_dict)
        """
        # Match component type
        component_match = re.match(r'^\s*<(LightboxImage|GalleryImage)\s+(.+?)\s*/>', line)
        if not component_match:
            return None, {}

        component_type = component_match.group(1)
        attrs_str = component_match.group(2)

        # Extract attributes (handle both src="..." and image="...")
        attributes = {}

        # Pattern for attributes: attr="value" or attr='value'
        attr_pattern = r'(\w+)=(["\'])([^"\']*)\2'
        for match in re.finditer(attr_pattern, attrs_str):
            attr_name = match.group(1)
            attr_value = match.group(3)
            attributes[attr_name] = attr_value

        return component_type, attributes

    def get_image_path_from_src(self, src: str) -> Path:
        """Convert src attribute to absolute Path object"""
        # Remove leading slash if present
        src_clean = src.lstrip('/')

        # If it starts with 'src/', use it as-is, otherwise assume it's relative
        if src_clean.startswith('src/'):
            return self.root_dir / src_clean
        else:
            # Assume it's a blog image path
            return self.root_dir / src_clean

    def build_slug_based_path(self, slug: str, image_filename: str) -> str:
        """Build new slug-based path for image"""
        return f"/src/assets/images/hiivelabs.com/blog/{slug}/{image_filename}"

    def process_mdx_file(self, mdx_file: Path) -> bool:
        """
        Process a single MDX file:
        1. Extract slug
        2. Find image components
        3. Copy images to slug directory
        4. Update MDX content

        Returns True if changes were made
        """
        slug = self.extract_slug_from_filename(mdx_file)
        print(f"\n📄 Processing: {mdx_file.name} (slug: {slug})")

        try:
            with open(mdx_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            error = f"Error reading {mdx_file}: {e}"
            self.errors.append(error)
            print(f"  ❌ {error}")
            return False

        lines = content.split('\n')
        new_lines = []
        changes_made = False
        slug_dir_created = False

        for line in lines:
            # Check if this is an image component
            if '<LightboxImage' in line or '<GalleryImage' in line:
                component_type, attributes = self.parse_image_component(line)

                if component_type and ('src' in attributes or 'image' in attributes):
                    # Get current image path
                    current_src = attributes.get('src') or attributes.get('image')

                    if not current_src:
                        new_lines.append(line)
                        continue

                    # Get source image path
                    source_image = self.get_image_path_from_src(current_src)

                    # Check if image already in slug directory
                    if f"/blog/{slug}/" in current_src:
                        print(f"  ✓ Already migrated: {source_image.name}")
                        new_lines.append(line)
                        continue

                    # Build new slug-based path
                    image_filename = source_image.name
                    new_path = self.build_slug_based_path(slug, image_filename)

                    # Create slug directory if needed
                    slug_dir = self.blog_images_dir / slug
                    if not slug_dir_created and not self.dry_run:
                        slug_dir.mkdir(parents=True, exist_ok=True)
                        slug_dir_created = True

                    # Copy image file
                    dest_image = self.root_dir / new_path.lstrip('/')

                    if source_image.exists():
                        if not self.dry_run:
                            try:
                                dest_image.parent.mkdir(parents=True, exist_ok=True)
                                shutil.copy2(source_image, dest_image)
                                self.copied_images.add(dest_image)
                                self.source_images.add(source_image)
                                print(f"  📋 Copied: {source_image.name} -> {slug}/{image_filename}")
                            except Exception as e:
                                error = f"Error copying {source_image} to {dest_image}: {e}"
                                self.errors.append(error)
                                print(f"  ❌ {error}")
                                new_lines.append(line)
                                continue
                        else:
                            print(f"  [DRY RUN] Would copy: {source_image.name} -> {slug}/{image_filename}")
                            self.source_images.add(source_image)
                    else:
                        warning = f"Source image not found: {source_image}"
                        print(f"  ⚠️  {warning}")
                        self.errors.append(warning)
                        new_lines.append(line)
                        continue

                    # Update the line
                    if self.update_src_to_image:
                        # Replace src= with image=
                        if 'src=' in line:
                            new_line = line.replace(f'src="{current_src}"', f'image="{new_path}"')
                            new_line = new_line.replace(f"src='{current_src}'", f"image='{new_path}'")
                            print(f"  ✏️  Updated: src -> image attribute")
                        else:
                            new_line = line.replace(f'image="{current_src}"', f'image="{new_path}"')
                            new_line = new_line.replace(f"image='{current_src}'", f"image='{new_path}'")
                            print(f"  ✏️  Updated: image path")
                    else:
                        # Just update the path
                        if 'src=' in line:
                            new_line = line.replace(f'src="{current_src}"', f'src="{new_path}"')
                            new_line = new_line.replace(f"src='{current_src}'", f"src='{new_path}'")
                        else:
                            new_line = line.replace(f'image="{current_src}"', f'image="{new_path}"')
                            new_line = new_line.replace(f"image='{current_src}'", f"image='{new_path}'")
                        print(f"  ✏️  Updated: path to {new_path}")

                    new_lines.append(new_line)
                    changes_made = True
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)

        # Write updated content
        if changes_made and not self.dry_run:
            try:
                with open(mdx_file, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(new_lines))
                print(f"  ✅ Updated MDX file")
            except Exception as e:
                error = f"Error writing {mdx_file}: {e}"
                self.errors.append(error)
                print(f"  ❌ {error}")
                return False

        return changes_made

    def cleanup_source_images(self):
        """Remove original source images that were successfully copied"""
        if self.dry_run:
            print(f"\n[DRY RUN] Would remove {len(self.source_images)} source images")
            return

        print(f"\n🧹 Cleaning up {len(self.source_images)} source images...")

        removed_count = 0
        for source_image in self.source_images:
            try:
                if source_image.exists():
                    source_image.unlink()
                    removed_count += 1
                    print(f"  🗑️  Removed: {source_image}")
            except Exception as e:
                error = f"Error removing {source_image}: {e}"
                self.errors.append(error)
                print(f"  ❌ {error}")

        print(f"✅ Removed {removed_count} source images")

        # Clean up empty directories
        self.cleanup_empty_directories()

    def cleanup_empty_directories(self):
        """Remove empty directories in blog images folder"""
        if self.dry_run:
            return

        print("\n🧹 Cleaning up empty directories...")

        for dir_path in sorted(self.blog_images_dir.rglob('*'), reverse=True):
            if dir_path.is_dir() and not any(dir_path.iterdir()):
                try:
                    dir_path.rmdir()
                    print(f"  🗑️  Removed empty directory: {dir_path.relative_to(self.blog_images_dir)}")
                except Exception as e:
                    print(f"  ⚠️  Could not remove {dir_path}: {e}")

    def run(self):
        """Main migration process"""
        print("=" * 70)
        print("Blog Image Migration Tool")
        print("=" * 70)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"Update src to image: {'Yes' if self.update_src_to_image else 'No'}")
        print(f"Blog posts directory: {self.blog_posts_dir}")
        print(f"Blog images directory: {self.blog_images_dir}")
        print("=" * 70)

        # Check directories exist
        if not self.blog_posts_dir.exists():
            print(f"❌ Blog posts directory not found: {self.blog_posts_dir}")
            return 1

        if not self.blog_images_dir.exists():
            print(f"❌ Blog images directory not found: {self.blog_images_dir}")
            return 1

        # Find all MDX files (excluding _drafts)
        mdx_files = []
        for mdx_file in self.blog_posts_dir.glob('*.mdx'):
            mdx_files.append(mdx_file)

        print(f"\n📚 Found {len(mdx_files)} blog posts to process")

        # Process each MDX file
        processed_count = 0
        changed_count = 0

        for mdx_file in sorted(mdx_files):
            processed_count += 1
            if self.process_mdx_file(mdx_file):
                changed_count += 1

        # Summary
        print("\n" + "=" * 70)
        print("Migration Summary")
        print("=" * 70)
        print(f"Posts processed: {processed_count}")
        print(f"Posts modified: {changed_count}")
        print(f"Images copied: {len(self.copied_images)}")
        print(f"Source images tracked: {len(self.source_images)}")

        if self.errors:
            print(f"\n⚠️  Errors encountered: {len(self.errors)}")
            for error in self.errors:
                print(f"  - {error}")

        # Cleanup source images
        if self.source_images and not self.dry_run:
            print("\n" + "=" * 70)
            self.cleanup_source_images()
        elif self.dry_run and self.source_images:
            print(f"\n[DRY RUN] Would clean up {len(self.source_images)} source images")

        print("\n" + "=" * 70)
        if self.dry_run:
            print("✅ DRY RUN COMPLETE - No changes were made")
        else:
            print("✅ MIGRATION COMPLETE")
        print("=" * 70)

        return 0 if not self.errors else 1


def main():
    parser = argparse.ArgumentParser(
        description='Migrate blog images to slug-based directory structure',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run to see what would happen
  python migrate_blog_images.py --dry-run

  # Migrate images and update paths
  python migrate_blog_images.py

  # Migrate images and convert src to image attributes
  python migrate_blog_images.py --update-src-to-image

  # Dry run with src to image conversion
  python migrate_blog_images.py --dry-run --update-src-to-image
        """
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )

    parser.add_argument(
        '--update-src-to-image',
        action='store_true',
        help='Convert src attributes to image attributes'
    )

    args = parser.parse_args()

    migrator = BlogImageMigrator(
        dry_run=args.dry_run,
        update_src_to_image=args.update_src_to_image
    )

    return migrator.run()


if __name__ == '__main__':
    exit(main())

#!/usr/bin/env python3
"""
Migrate blog images to slug-based directory structure.

This script:
1. Scans blog posts for thumbnails in frontmatter and LightboxImage/GalleryImage components
2. Handles both JSON and YAML frontmatter formats (converts to YAML when writing)
3. Copies images to slug-based subdirectories (e.g., blog/2024-07-11-post/image.png)
4. Updates thumbnail paths in frontmatter and component attributes in body
5. Optionally converts src attributes to image attributes
6. Removes original source images after successful migration
7. Moves MDX files from non-underscore subdirectories to parent directory

Usage:
    python migrate_blog_images.py [--dry-run] [--update-src-to-image] [--site-code SITE_CODE]
"""

import argparse
import os
import re
import shutil
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional

try:
    from dotenv import load_dotenv
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

try:
    import json
    JSON_AVAILABLE = True
except ImportError:
    JSON_AVAILABLE = False


def load_site_code_from_env() -> str:
    """
    Load SITE_CODE from .env file or environment variable.
    Returns the site code or 'hiivelabs.com' as default.
    """
    # Load .env file if python-dotenv is available
    if DOTENV_AVAILABLE:
        load_dotenv()

    # Get SITE_CODE from environment variable (set by .env or system)
    site_code = os.environ.get('SITE_CODE', 'hiivelabs.com')
    return site_code


class BlogImageMigrator:
    def __init__(self, site_code: str, dry_run: bool = False, update_src_to_image: bool = False):
        self.site_code = site_code
        self.dry_run = dry_run
        self.update_src_to_image = update_src_to_image
        self.root_dir = Path(__file__).parent
        self.blog_posts_dir = self.root_dir / f"src/assets/posts/{site_code}"
        self.blog_images_dir = self.root_dir / f"src/assets/images/{site_code}/blog"
        self.source_images: Set[Path] = set()
        self.copied_images: Set[Path] = set()
        self.errors: List[str] = []

    def extract_slug_from_filename(self, mdx_file: Path) -> str:
        """Extract slug from MDX filename (e.g., 2024-07-11-post.mdx -> 2024-07-11-post)"""
        return mdx_file.stem

    def parse_image_component(self, component_str: str) -> Tuple[str, Dict[str, str]]:
        """
        Parse a LightboxImage or GalleryImage component string (can be multi-line).
        Returns (component_type, attributes_dict)
        """
        # Match component type
        component_match = re.search(r'<(LightboxImage|GalleryImage)\s+', component_str)
        if not component_match:
            return None, {}

        component_type = component_match.group(1)

        # Extract attributes (handle both src="..." and image="...")
        attributes = {}

        # Pattern for attributes: attr="value" or attr='value'
        attr_pattern = r'(\w+)=(["\'])([^"\']*)\2'
        for match in re.finditer(attr_pattern, component_str):
            attr_name = match.group(1)
            attr_value = match.group(3)
            attributes[attr_name] = attr_value

        return component_type, attributes

    def extract_image_components(self, body_content: str) -> List[Tuple[str, str, Dict[str, str]]]:
        """
        Extract all image components from body content (handles multi-line components).
        Returns list of (full_component_text, component_type, attributes_dict)
        """
        components = []

        # Pattern to match complete component tags (including multi-line)
        # Matches: <LightboxImage ... /> or <GalleryImage ... />
        pattern = r'<(LightboxImage|GalleryImage)\s+[^>]*?/>'

        for match in re.finditer(pattern, body_content, re.DOTALL):
            full_text = match.group(0)
            component_type = match.group(1)

            # Parse attributes from the full component text
            attributes = {}
            attr_pattern = r'(\w+)=(["\'])([^"\']*)\2'
            for attr_match in re.finditer(attr_pattern, full_text):
                attr_name = attr_match.group(1)
                attr_value = attr_match.group(3)
                attributes[attr_name] = attr_value

            components.append((full_text, component_type, attributes))

        return components

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
        return f"/src/assets/images/{self.site_code}/blog/{slug}/{image_filename}"

    def parse_frontmatter(self, content: str) -> Tuple[Optional[Dict], str, str, str]:
        """
        Parse MDX file into frontmatter and body.
        Supports both YAML and JSON frontmatter formats.
        Returns (frontmatter_dict, frontmatter_str, body_content, format_type)
        format_type will be 'yaml', 'json', or 'unknown'
        """
        # MDX files have frontmatter between --- markers
        if not content.startswith('---'):
            return None, '', content, 'unknown'

        # Find the end of frontmatter
        parts = content.split('---', 2)
        if len(parts) < 3:
            return None, '', content, 'unknown'

        frontmatter_str = parts[1].strip()
        body_content = parts[2]

        # Detect format and parse frontmatter
        frontmatter_dict = None
        format_type = 'unknown'

        # Try JSON first (check if it starts with { or [)
        if frontmatter_str.strip().startswith(('{', '[')):
            format_type = 'json'
            if JSON_AVAILABLE:
                try:
                    frontmatter_dict = json.loads(frontmatter_str)
                    print(f"  📋 Detected JSON frontmatter")
                except Exception as e:
                    print(f"  ⚠️  Could not parse JSON frontmatter: {e}")
                    format_type = 'unknown'
            else:
                print(f"  ⚠️  JSON frontmatter detected but json module not available")
        else:
            # Try YAML
            format_type = 'yaml'
            if YAML_AVAILABLE:
                try:
                    frontmatter_dict = yaml.safe_load(frontmatter_str)
                    if frontmatter_dict is None:
                        frontmatter_dict = {}
                except Exception as e:
                    print(f"  ⚠️  Could not parse YAML frontmatter: {e}")
                    format_type = 'unknown'
            else:
                print(f"  ⚠️  YAML frontmatter detected but yaml module not available")

        return frontmatter_dict, frontmatter_str, body_content, format_type

    def normalize_frontmatter(self, frontmatter_dict: Dict) -> Dict:
        """
        Normalize frontmatter fields to proper format.
        Converts space-separated tags/categories to arrays.
        """
        normalized = frontmatter_dict.copy()

        # Convert space-separated tags to array
        if 'tags' in normalized and isinstance(normalized['tags'], str):
            normalized['tags'] = [tag.strip() for tag in normalized['tags'].split() if tag.strip()]

        # Convert space-separated categories to array
        if 'categories' in normalized and isinstance(normalized['categories'], str):
            normalized['categories'] = [cat.strip() for cat in normalized['categories'].split() if cat.strip()]

        return normalized

    def serialize_frontmatter(self, frontmatter_dict: Dict, format_type: str) -> str:
        """
        Serialize frontmatter dictionary back to string format (JSON or YAML).
        For YAML, uses proper formatting with folded block scalars for long text.
        Returns the serialized frontmatter string.
        """
        if format_type == 'json':
            if JSON_AVAILABLE:
                return json.dumps(frontmatter_dict, indent=2, ensure_ascii=False)
            else:
                raise Exception("JSON module not available")
        elif format_type == 'yaml':
            if YAML_AVAILABLE:
                # Normalize frontmatter (convert space-separated strings to arrays)
                normalized_dict = self.normalize_frontmatter(frontmatter_dict)

                # Create custom dumper for proper formatting
                class CustomDumper(yaml.SafeDumper):
                    pass

                def represent_str(dumper, data):
                    # Use folded block scalar (>-) for long strings (> 80 chars) or strings with newlines
                    if len(data) > 80 or '\n' in data:
                        # Use >- style (folded, strip final newlines)
                        return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='>')
                    return dumper.represent_scalar('tag:yaml.org,2002:str', data)

                CustomDumper.add_representer(str, represent_str)

                return yaml.dump(normalized_dict,
                               Dumper=CustomDumper,
                               default_flow_style=False,
                               allow_unicode=True,
                               sort_keys=False,
                               width=80,
                               indent=2)
            else:
                raise Exception("YAML module not available")
        else:
            raise Exception(f"Unknown format type: {format_type}")

    def process_thumbnail(self, slug: str, thumbnail_path: str, slug_dir_created: bool) -> Tuple[Optional[str], bool]:
        """
        Process thumbnail image in frontmatter.
        Returns (new_thumbnail_path, slug_dir_created)
        """
        # Check if already migrated
        if f"/blog/{slug}/" in thumbnail_path:
            print(f"  ✓ Thumbnail already migrated")
            return None, slug_dir_created

        # Get source image path
        source_image = self.get_image_path_from_src(thumbnail_path)
        image_filename = source_image.name
        new_path = self.build_slug_based_path(slug, image_filename)

        # Create slug directory if needed
        if not slug_dir_created and not self.dry_run:
            slug_dir = self.blog_images_dir / slug
            slug_dir.mkdir(parents=True, exist_ok=True)
            slug_dir_created = True

        # Copy thumbnail file
        dest_image = self.root_dir / new_path.lstrip('/')

        if source_image.exists():
            if not self.dry_run:
                try:
                    dest_image.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_image, dest_image)
                    self.copied_images.add(dest_image)
                    self.source_images.add(source_image)
                    print(f"  📋 Copied thumbnail: {image_filename} -> {slug}/{image_filename}")
                except Exception as e:
                    error = f"Error copying thumbnail {source_image} to {dest_image}: {e}"
                    self.errors.append(error)
                    print(f"  ❌ {error}")
                    return None, slug_dir_created
            else:
                print(f"  [DRY RUN] Would copy thumbnail: {image_filename} -> {slug}/{image_filename}")
                self.source_images.add(source_image)

            return new_path, slug_dir_created
        else:
            warning = f"Thumbnail not found: {source_image}"
            print(f"  ⚠️  {warning}")
            self.errors.append(warning)
            return None, slug_dir_created

    def process_mdx_file(self, mdx_file: Path) -> bool:
        """
        Process a single MDX file:
        1. Extract slug
        2. Parse frontmatter and process thumbnail
        3. Find image components in body
        4. Copy images to slug directory
        5. Update MDX content

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

        # Parse frontmatter (handles both JSON and YAML)
        frontmatter_dict, frontmatter_str, body_content, format_type = self.parse_frontmatter(content)
        changes_made = False
        slug_dir_created = False
        frontmatter_modified = False

        # Process thumbnail in frontmatter
        if frontmatter_dict and 'thumbnail' in frontmatter_dict:
            thumbnail_path = frontmatter_dict['thumbnail']
            if thumbnail_path:
                # Handle multiline YAML (thumbnail: >-)
                if isinstance(thumbnail_path, str):
                    thumbnail_path = thumbnail_path.strip()
                    new_thumbnail_path, slug_dir_created = self.process_thumbnail(slug, thumbnail_path, slug_dir_created)

                    if new_thumbnail_path:
                        # Update frontmatter dict (will be serialized back to YAML later)
                        frontmatter_dict['thumbnail'] = new_thumbnail_path
                        frontmatter_modified = True
                        changes_made = True

        # Process body content for image components (handles multi-line components)
        new_body_content = body_content
        components = self.extract_image_components(body_content)

        for full_component_text, component_type, attributes in components:
            if 'src' not in attributes and 'image' not in attributes:
                continue

            # Get current image path
            current_src = attributes.get('src') or attributes.get('image')
            if not current_src:
                continue

            # Get source image path
            source_image = self.get_image_path_from_src(current_src)
            image_filename = source_image.name

            # Determine if path needs migration
            already_migrated = f"/blog/{slug}/" in current_src
            new_path = current_src  # Default to current path

            if not already_migrated:
                # Build new slug-based path
                new_path = self.build_slug_based_path(slug, image_filename)

                # Create slug directory if needed
                if not slug_dir_created and not self.dry_run:
                    slug_dir = self.blog_images_dir / slug
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
                            continue
                    else:
                        print(f"  [DRY RUN] Would copy: {source_image.name} -> {slug}/{image_filename}")
                        self.source_images.add(source_image)
                else:
                    warning = f"Source image not found: {source_image}"
                    print(f"  ⚠️  {warning}")
                    self.errors.append(warning)
                    continue
            else:
                print(f"  ✓ Already migrated: {source_image.name}")

            # Determine if attribute conversion is needed
            needs_attr_conversion = self.update_src_to_image and 'src' in attributes
            needs_path_update = not already_migrated

            # Update the component if needed
            if needs_attr_conversion or needs_path_update:
                new_component = full_component_text

                if needs_attr_conversion:
                    # Convert src= to image= and update path
                    new_component = new_component.replace(f'src="{current_src}"', f'image="{new_path}"')
                    new_component = new_component.replace(f"src='{current_src}'", f"image='{new_path}'")
                    print(f"  ✏️  Updated: src -> image attribute")
                elif needs_path_update:
                    # Just update the path (keep src or image as-is)
                    if 'src' in attributes:
                        new_component = new_component.replace(f'src="{current_src}"', f'src="{new_path}"')
                        new_component = new_component.replace(f"src='{current_src}'", f"src='{new_path}'")
                    else:
                        new_component = new_component.replace(f'image="{current_src}"', f'image="{new_path}"')
                        new_component = new_component.replace(f"image='{current_src}'", f"image='{new_path}'")
                    print(f"  ✏️  Updated: path to {new_path}")

                # Replace in body content
                new_body_content = new_body_content.replace(full_component_text, new_component)
                changes_made = True

        # Write updated content
        if changes_made and not self.dry_run:
            try:
                # Reassemble MDX file with updated frontmatter and body
                if frontmatter_dict:
                    # Serialize frontmatter to YAML (converts JSON to YAML if needed)
                    if frontmatter_modified or format_type == 'json':
                        # Serialize the modified frontmatter dict to YAML
                        try:
                            new_frontmatter_str = self.serialize_frontmatter(frontmatter_dict, 'yaml')
                            # Remove trailing newline from YAML output if present
                            new_frontmatter_str = new_frontmatter_str.rstrip('\n')
                            if format_type == 'json':
                                print(f"  🔄 Converted JSON frontmatter to YAML")
                        except Exception as e:
                            error = f"Error serializing frontmatter: {e}"
                            self.errors.append(error)
                            print(f"  ❌ {error}")
                            return False

                    new_content = f"---\n{new_frontmatter_str}\n---{new_body_content}"
                else:
                    new_content = new_body_content

                with open(mdx_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
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

    def move_mdx_from_subdirectories(self):
        """
        Move MDX files from non-underscore subdirectories to parent directory.
        Ignores subdirectories starting with underscore (e.g., _drafts).
        Deletes subdirectories after moving files.
        """
        print("\n📁 Checking for subdirectories...")

        # Find all subdirectories in blog posts directory
        subdirs = [d for d in self.blog_posts_dir.iterdir() if d.is_dir()]

        if not subdirs:
            print("  ℹ️  No subdirectories found")
            return

        # Separate underscore and non-underscore subdirectories
        underscore_dirs = [d for d in subdirs if d.name.startswith('_')]
        target_dirs = [d for d in subdirs if not d.name.startswith('_')]

        if underscore_dirs:
            print(f"  ℹ️  Ignoring {len(underscore_dirs)} underscore directories: {', '.join(d.name for d in underscore_dirs)}")

        if not target_dirs:
            print("  ℹ️  No non-underscore subdirectories to process")
            return

        print(f"  📂 Found {len(target_dirs)} subdirectories to process: {', '.join(d.name for d in target_dirs)}")

        total_moved = 0

        for subdir in target_dirs:
            # Find all MDX files in this subdirectory
            mdx_files = list(subdir.glob('*.mdx'))

            if not mdx_files:
                print(f"\n  📁 {subdir.name}/")
                print(f"     ℹ️  No MDX files found")
                if not self.dry_run:
                    # Still delete empty subdirectory
                    try:
                        subdir.rmdir()
                        print(f"     🗑️  Removed empty subdirectory")
                    except Exception as e:
                        print(f"     ⚠️  Could not remove subdirectory: {e}")
                continue

            print(f"\n  📁 {subdir.name}/ ({len(mdx_files)} files)")

            # Move each MDX file to parent directory
            for mdx_file in mdx_files:
                dest_file = self.blog_posts_dir / mdx_file.name

                # Check if destination already exists
                if dest_file.exists():
                    warning = f"Destination already exists: {dest_file.name}"
                    print(f"     ⚠️  {warning}")
                    self.errors.append(warning)
                    continue

                if not self.dry_run:
                    try:
                        shutil.move(str(mdx_file), str(dest_file))
                        print(f"     ➡️  Moved: {mdx_file.name}")
                        total_moved += 1
                    except Exception as e:
                        error = f"Error moving {mdx_file.name}: {e}"
                        print(f"     ❌ {error}")
                        self.errors.append(error)
                else:
                    print(f"     [DRY RUN] Would move: {mdx_file.name}")
                    total_moved += 1

            # Delete subdirectory after moving files
            if not self.dry_run:
                try:
                    # Remove any remaining files first
                    remaining_files = list(subdir.glob('*'))
                    if remaining_files:
                        print(f"     ⚠️  Subdirectory still contains {len(remaining_files)} files, not deleting")
                    else:
                        subdir.rmdir()
                        print(f"     🗑️  Removed subdirectory")
                except Exception as e:
                    warning = f"Could not remove subdirectory {subdir.name}: {e}"
                    print(f"     ⚠️  {warning}")
                    self.errors.append(warning)
            else:
                print(f"     [DRY RUN] Would remove subdirectory")

        if total_moved > 0:
            print(f"\n✅ Moved {total_moved} MDX files from subdirectories to parent directory")
        else:
            print(f"\n  ℹ️  No files needed to be moved")

    def run(self):
        """Main migration process"""
        print("=" * 70)
        print("Blog Image Migration Tool")
        print("=" * 70)
        print(f"Site code: {self.site_code}")
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

        # Move MDX files from subdirectories to parent directory (excluding underscore directories)
        self.move_mdx_from_subdirectories()

        # Find all MDX files in parent directory (after moving from subdirectories)
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

  # Use custom site code
  python migrate_blog_images.py --site-code mysite.com

  # Set SITE_CODE in .env file or environment variable
  export SITE_CODE=mysite.com
  python migrate_blog_images.py
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

    parser.add_argument(
        '--site-code',
        type=str,
        help='Site code (overrides .env file and SITE_CODE environment variable)'
    )

    args = parser.parse_args()

    # Determine site code: CLI arg > .env file > environment variable > default
    site_code = args.site_code if args.site_code else load_site_code_from_env()

    migrator = BlogImageMigrator(
        site_code=site_code,
        dry_run=args.dry_run,
        update_src_to_image=args.update_src_to_image
    )

    return migrator.run()


if __name__ == '__main__':
    exit(main())

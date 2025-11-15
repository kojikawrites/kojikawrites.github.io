/**
 * Auto-import components for MDX
 * This file imports common components and dynamically discovers site-specific components
 */

// @ts-ignore
import type { AstroComponentFactory } from "astro/runtime/server/index.js";

// Common components available to all sites

import GalleryImage from "/src/components/gallery/GalleryImage.astro";
// import GalleryVideo from "/src/components/gallery/GalleryVideo.astro";
import LightboxGallery from "/src/components/gallery/LightboxGallery.astro";
import LightboxImage from "/src/components/gallery/LightboxImage.astro";
import LightboxVideo from "/src/components/gallery/LightboxVideo.astro";
import ContentWarning from "/src/components/posts/ContentWarning.astro";
import FormattedDate from "/src/components/FormattedDate.astro";
import EmbeddedYouTube from "/src/components/EmbeddedYouTube.astro";
import EquationSnippet from "/src/components/EquationSnippet.astro";
import Timeline from "/src/components/timeline/Timeline.astro";
import TimelineEntry from "/src/components/timeline/TimelineEntry.astro";
import InlineSpan from "/src/components/InlineSpan.astro";
import Biography from "/src/components/about/Biography.astro";
import Thanks from "/src/components/about/Thanks.astro";
import MainLogo from "/src/components/MainLogo.astro";
import ThemedImage from "/src/components/ThemedImage.astro";
import FootnoteRef from "/src/components/footnote/FootnoteRef.astro";
import FootnoteDefinition from "/src/components/footnote/FootnoteDefinition.astro";

// Type for component collections
type ComponentMap = Record<string, AstroComponentFactory>;

// Type for glob import results
type GlobModule = {
    default: AstroComponentFactory;
};

// Common components object
const commonComponents: ComponentMap = {
    GalleryImage,
    // GalleryVideo,
    LightboxGallery,
    LightboxImage,
    LightboxVideo,
    ContentWarning,
    FormattedDate,
    EmbeddedYouTube,
    EquationSnippet,
    Timeline,
    TimelineEntry,
    InlineSpan,
    Biography,
    Thanks,
    MainLogo,
    ThemedImage,
    FootnoteRef,
    FootnoteDefinition,
};

/**
 * Dynamically import site-specific components
 * Looks for components in src/.sites/{SITE_CODE}/components/
 * Component files should export a default component
 *
 * Example structure:
 * src/.sites/hiivelabs.com/components/HiiveLabsText.astro
 *
 * This will be available as <HiiveLabsText /> in MDX files
 */
function getSiteSpecificComponents(): ComponentMap {
    const siteCode = import.meta.env.SITE_CODE || process.env.SITE_CODE;

    if (!siteCode) {
        console.warn('SITE_CODE not set, skipping site-specific component discovery');
        return {};
    }

    try {
        // Use Vite's import.meta.glob to find all .astro components in the site-specific directory
        // This creates a map of file paths to dynamic import functions
        const componentModules = import.meta.glob<GlobModule>('/src/.sites/*/components/*.astro', { eager: true });

        const siteComponents: ComponentMap = {};
        const sitePrefix = `/src/.sites/${siteCode}/components/`;

        // Process each discovered component
        for (const [path, module] of Object.entries(componentModules)) {
            // Only include components for the current site
            if (path.startsWith(sitePrefix)) {
                // Extract component name from file path
                // e.g., "/src/.sites/hiivelabs.com/components/HiiveLabsText.astro" -> "HiiveLabsText"
                const fileName = path.split('/').pop();
                if (!fileName) continue;

                const componentName = fileName.replace(/\.astro$/, '');

                // Add to site components using the default export
                siteComponents[componentName] = module.default;

                console.log(`✓ Discovered site-specific component: ${componentName}`);
            }
        }

        return siteComponents;
    } catch (error) {
        console.error('Error loading site-specific components:', error);
        return {};
    }
}

// Merge common and site-specific components
const siteComponents = getSiteSpecificComponents();

export const components: ComponentMap = {
    ...commonComponents,
    ...siteComponents, // Site-specific components can override common ones
};

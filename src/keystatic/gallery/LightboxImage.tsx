/** @jsxImportSource react */
/**
 * Keystatic editor component for LightboxImage and GalleryImage
 */

import {
    fields,
    block,
    blogImagePath,
    createImageContentView,
    SlugProvider
} from '../helpers';
import { textWithAI } from '../fields/textWithAI';

interface ImageComponentConfig {
    blogImagePath: string;
}

/**
 * Create a Lightbox or Gallery image component
 */
const createImageComponent = (type: 'Lightbox' | 'Gallery', imagePath: string, includeSlugTracking?: boolean) => {
    const isGallery = type === 'Gallery';
    const slugTracking = includeSlugTracking !== undefined ? includeSlugTracking : isGallery;
    const label = isGallery ? 'Lightbox Gallery Image' : 'Lightbox Image';
    const description = isGallery
        ? 'Image for use inside a Lightbox Gallery container'
        : 'Standalone clickable image that opens in a lightbox overlay';

    // @ts-ignore
    return block({
        label,
        description,
        schema: {
            image: fields.image({
                label: 'Image (Picker)',
                directory: imagePath,
                publicPath: `/${imagePath}/`,
            }),
            src: fields.text({
                label: 'Or enter path manually',
                description: 'Legacy support - leave empty if using image picker above',
            }),
            id: fields.text({ label: 'Id'}),
            // @ts-ignore
            alt: textWithAI({
                label: 'Alt Text',
                validation: { isRequired: true },
                mode: 'alt'
            }),
            // @ts-ignore
            description: textWithAI({
                label: 'Detailed Description',
                mode: 'description'
            }),
            // @ts-ignore
            caption: textWithAI({
                label: 'Caption',
                mode: 'caption'
            })
        },
        ContentView: createImageContentView({
            imageDirectory: `/${imagePath}`,
            includeCaption: isGallery,
            includeSlugTracking: slugTracking,
            defaultAlt: `${type} image`,
        }),
    });
};

/**
 * Create a LightboxImage component with configurable image path
 */
export const createLightboxImageComponent = (imagePath: string, includeSlugTracking?: boolean) =>
    createImageComponent('Lightbox', imagePath, includeSlugTracking);

/**
 * Create a GalleryImage component with configurable image path
 */
export const createGalleryImageComponent = (imagePath: string, includeSlugTracking?: boolean) =>
    createImageComponent('Gallery', imagePath, includeSlugTracking);

// Default exports using the standard blog image path
export const LightboxImage = createLightboxImageComponent(blogImagePath);
export const GalleryImage = createGalleryImageComponent(blogImagePath);
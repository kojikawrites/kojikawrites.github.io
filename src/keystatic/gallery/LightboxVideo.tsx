/** @jsxImportSource react */
/**
 * Keystatic editor component for LightboxVideo
 */

import React from 'react';
import {
    fields,
    block,
    blogImagePath,
    extractImageData,
    buildImagePath,
    SlugContext
} from '../helpers';

interface LightboxVideoConfig {
    blogImagePath: string;
}

/**
 * Create a LightboxVideo component with configurable image path
 */
export const createLightboxVideoComponent = (imagePath: string) => {
    return block({
        label: 'Lightbox Video',
        schema: {
            video: fields.file({
                label: 'Video File',
                description: 'Select video file (mp4, webm, etc.)',
                directory: imagePath,
                publicPath: `/${imagePath}/`,
                validation: { isRequired: true },
            }),
            inlineImg: fields.image({
                label: 'Inline Thumbnail',
                description: 'Thumbnail image shown inline in the post',
                directory: imagePath,
                publicPath: `/${imagePath}/`,
                validation: { isRequired: true },
            }),
            previewImg: fields.image({
                label: 'Preview Image',
                description: 'Preview image shown in lightbox before video plays',
                directory: imagePath,
                publicPath: `/${imagePath}/`,
                validation: { isRequired: true },
            }),
            alt: fields.text({
                label: 'Alt Text',
                description: 'Descriptive text for accessibility',
                validation: { isRequired: true },
            }),
            id: fields.text({
                label: 'ID',
                description: 'Optional HTML ID for the video element',
            }),
            description: fields.text({
                label: 'Description',
                description: 'Detailed description shown in lightbox',
                multiline: true,
            }),
            caption: fields.text({
                label: 'Caption',
                description: 'Caption shown below the inline image',
            }),
            class: fields.text({
                label: 'CSS Class',
                description: 'Optional CSS classes for styling',
            }),
        },
        ContentView: (props) => {
            const { video, inlineImg, previewImg, alt, caption } = props.value;
            const currentSlug = React.useContext(SlugContext);

            // Extract video source
            let videoSrc: string | null = null;
            if (video) {
                if (typeof video === 'string') {
                    videoSrc = video;
                } else if (video.filename) {
                    videoSrc = buildImagePath(video.filename, `/${imagePath}`, currentSlug);
                }
            }

            // Memoize extracted image data to prevent creating new blob URLs on every render
            const inlineExtracted = React.useMemo(() => {
                if (!inlineImg) return null;
                return extractImageData(inlineImg);
            }, [inlineImg]);

            const previewExtracted = React.useMemo(() => {
                if (!previewImg) return null;
                return extractImageData(previewImg);
            }, [previewImg]);

            // Extract inline image source
            let inlineImageSrc: string | null = null;
            let inlinePreviewSrc: string | null = null;
            let inlineIsNew = false;

            if (inlineExtracted) {
                inlineIsNew = inlineExtracted.isNewlySelected;
                inlinePreviewSrc = inlineExtracted.previewSrc;
                if (inlineExtracted.filename) {
                    inlineImageSrc = buildImagePath(inlineExtracted.filename, `/${imagePath}`, currentSlug);
                }
            }

            // Extract preview image source
            let previewImageSrc: string | null = null;
            let previewPreviewSrc: string | null = null;

            if (previewExtracted) {
                previewPreviewSrc = previewExtracted.previewSrc;
                if (previewExtracted.filename) {
                    previewImageSrc = buildImagePath(previewExtracted.filename, `/${imagePath}`, currentSlug);
                }
            }

            // Cleanup blob URLs
            React.useEffect(() => {
                return () => {
                    if (inlinePreviewSrc && inlinePreviewSrc.startsWith('blob:')) {
                        URL.revokeObjectURL(inlinePreviewSrc);
                    }
                    if (previewPreviewSrc && previewPreviewSrc.startsWith('blob:')) {
                        URL.revokeObjectURL(previewPreviewSrc);
                    }
                };
            }, [inlinePreviewSrc, previewPreviewSrc]);

            const displayInlineSrc = inlineIsNew && inlinePreviewSrc ? inlinePreviewSrc : inlineImageSrc;

            if (!videoSrc || !inlineImageSrc || !previewImageSrc || !alt) {
                return (
                    <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '4px' }}>
                        <p>Missing required fields. Please fill in:</p>
                        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                            {!videoSrc && <li>Video File</li>}
                            {!inlineImageSrc && <li>Inline Thumbnail</li>}
                            {!previewImageSrc && <li>Preview Image</li>}
                            {!alt && <li>Alt Text</li>}
                        </ul>
                    </div>
                );
            }

            return (
                <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--ks-color-scale-slate11)', marginBottom: '8px', fontFamily: 'monospace' }}>
                        Lightbox Video: {videoSrc.split('/').pop()}
                    </div>

                    {/* Show inline image preview */}
                    <div style={{ marginBottom: '8px' }}>
                        <img
                            src={displayInlineSrc}
                            alt={alt}
                            style={{ maxWidth: '100%', maxHeight: '200px', height: 'auto', display: 'block', border: '2px solid currentColor' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                        />
                    </div>

                    {caption && (
                        <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ks-color-scale-slate12)', fontStyle: 'italic' }}>
                            {caption}
                        </p>
                    )}
                </div>
            );
        },
    });
};

// Default export using the standard blog image path
export const LightboxVideo = createLightboxVideoComponent(blogImagePath);
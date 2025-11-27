/** @jsxImportSource react */
/**
 * Shared helper functions and components for Keystatic editor components
 */

import { fields } from '@keystatic/core';
import { wrapper, block, inline } from '@keystatic/core/content-components';
import React from 'react';
import { getSiteCode } from '../../lib/config/getSiteCode';

// ============================================================================
// SITE CONFIGURATION
// ============================================================================
export const siteCode = getSiteCode();
export const baseDir = 'src';
export const baseImagePath = `${baseDir}/.sites/${siteCode}/images`;
export const blogImagePath = `${baseImagePath}/blog`;

// ============================================================================
// LOGO MAP - Load synchronously at module level
// ============================================================================
const logoMapGlob = import.meta.glob<{ default: any }>('/src/.sites/**/state/*.json', { eager: true });
const logoMapKey = Object.keys(logoMapGlob).find(key => key.includes(`.sites/${siteCode}`) && key.includes('logo-map.json'));
export const logoMap = logoMapKey ? logoMapGlob[logoMapKey].default : null;

// ============================================================================
// EDITOR STYLES HOOK
// ============================================================================
export const useEditorStyles = () => {
    React.useEffect(() => {
        if (!document.querySelector('link[href="/css/editor-styles.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/editor-styles.css';
            document.head.appendChild(link);
        }
    }, []);
};

// ============================================================================
// SIMPLE COMPONENT FACTORIES
// ============================================================================
export const simpleWrapper = (label: string, schema = {}) => wrapper({ label, schema });
export const simpleInline = (label: string, schema = {}) => inline({ label, schema });
export const simpleBlock = (label: string, schema = {}) => block({ label, schema });

export const classField = () => fields.text({ label: 'Class' });

// ============================================================================
// IMAGE DATA HELPERS
// ============================================================================

/** Extract image data from Keystatic image field */
export const extractImageData = (image: any): { filename: string; previewSrc: string | null; isNewlySelected: boolean } => {
    if (typeof image === 'string') {
        return { filename: image, previewSrc: null, isNewlySelected: false };
    }

    if (typeof image === 'object') {
        const imgObj = image as any;
        const filename = imgObj.filename || imgObj.name || String(image);
        let previewSrc: string | null = null;

        // Convert binary data to Blob URL
        if (imgObj.data && (imgObj.data instanceof Uint8Array || Array.isArray(imgObj.data))) {
            try {
                const uint8Array = imgObj.data instanceof Uint8Array ? imgObj.data : new Uint8Array(imgObj.data);
                const blob = new Blob([uint8Array], { type: 'image/*' });
                previewSrc = URL.createObjectURL(blob);
            } catch (e) {
                console.error('[DEBUG] Failed to create blob URL:', e);
            }
        } else if (imgObj instanceof File) {
            previewSrc = URL.createObjectURL(imgObj);
        } else {
            previewSrc = imgObj.data || imgObj.src || imgObj.url || imgObj.preview || null;
        }

        return { filename, previewSrc, isNewlySelected: true };
    }

    return { filename: '', previewSrc: null, isNewlySelected: false };
};

/** Build image path with optional slug subdirectory */
export const buildImagePath = (filename: string, baseDirectory: string, slug?: string): string => {
    if (filename.startsWith('/') || filename.startsWith(`${baseDir}/`)) {
        return filename;
    }
    return slug ? `${baseDirectory}/${slug}/${filename}` : `${baseDirectory}/${filename}`;
};

// ============================================================================
// IMAGE DATA STORE - Share image data between ContentView and field inputs
// ============================================================================
// React Context doesn't work because Keystatic renders ContentView and form fields
// in separate DOM trees. Use a simple module-level store instead.
// Only one image block is edited at a time, so a single value is sufficient.
// Using an object with a mutable property to avoid bundler const conversion issues.

export const imageDataStore = { currentDisplaySrc: null as string | null };

// ============================================================================
// SLUG CONTEXT - For sharing slug state between components
// ============================================================================

/** Context for sharing slug state between components without global mutation */
export const SlugContext = React.createContext<string>('');

/** Provider component that tracks slug from DOM and shares it via context */
export const SlugProvider: React.FC<{ children: React.ReactNode; enabled: boolean }> = ({ children, enabled }) => {
    const [slug, setSlug] = React.useState<string>('');

    React.useEffect(() => {
        if (!enabled) return;

        const findSlug = (): boolean => {
            const labels = document.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent?.includes('Slug')) {
                    const inputId = label.getAttribute('for');
                    if (inputId) {
                        const input = document.getElementById(inputId) as HTMLInputElement;
                        if (input?.value && slug !== input.value) {
                            setSlug(input.value);
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        if (!findSlug()) {
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (findSlug() || attempts > 20) clearInterval(interval);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [enabled, slug]);

    return <SlugContext.Provider value={slug}>{children}</SlugContext.Provider>;
};

// ============================================================================
// IMAGE CONTENT VIEW FACTORY
// ============================================================================
export const createImageContentView = (options: {
    imageDirectory: string;
    includeCaption?: boolean;
    includeSlugTracking?: boolean;
    defaultAlt?: string;
}) => {
    // Inner component that consumes the slug context
    const ImageContentViewInner: React.FC<{ value: any }> = ({ value }) => {
        // Load editor styles and toolbar
        useEditorStyles();

        const { image, src, alt, caption } = value;
        const currentSlug = React.useContext(SlugContext); // Get slug from context instead of global

        // Memoize extracted image data to prevent creating new blob URLs on every render
        const extractedData = React.useMemo(() => {
            if (!image) return null;
            return extractImageData(image);
        }, [image]);

        // Determine image source
        let imageSrc: string | null = null;
        let previewSrc: string | null = null;
        let sourceInfo = '';
        let isNewlySelected = false;

        if (extractedData) {
            isNewlySelected = extractedData.isNewlySelected;
            previewSrc = extractedData.previewSrc;

            if (extractedData.filename) {
                sourceInfo = `Picker: ${extractedData.filename}${currentSlug && options.includeSlugTracking ? ` (slug: ${currentSlug})` : ''}`;
                imageSrc = buildImagePath(
                    extractedData.filename,
                    options.imageDirectory,
                    options.includeSlugTracking ? currentSlug : undefined
                );
            }
        } else if (src) {
            sourceInfo = `Manual: ${src}`;
            imageSrc = src.startsWith('/') || src.startsWith(`${baseDir}/`)
                ? src
                : `${options.imageDirectory}/${src}`;
        }

        const displaySrc = isNewlySelected && previewSrc ? previewSrc : imageSrc;

        // Update the module-level store whenever this component renders/mounts
        // This ensures textWithAI fields get the correct image when clicking the generate button
        React.useEffect(() => {
            imageDataStore.currentDisplaySrc = displaySrc;
        }, [displaySrc]);

        // Clean up blob URLs when component unmounts or previewSrc changes
        React.useEffect(() => {
            return () => {
                if (previewSrc && previewSrc.startsWith('blob:')) {
                    URL.revokeObjectURL(previewSrc);
                }
            };
        }, [previewSrc]);

        if (!imageSrc) {
            return <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '4px' }}>
                <p>No image selected</p>
            </div>;
        }

        // Placeholder for unsaved images without preview
        if (isNewlySelected && !previewSrc) {
            return (
                <div style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', fontFamily: 'monospace' }}>
                        {sourceInfo}
                    </div>
                    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Save document to preview image</p>
                    </div>
                    {options.includeCaption && caption && <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>{caption}</p>}
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', fontFamily: 'monospace' }}>
                        {sourceInfo}{isNewlySelected && previewSrc ? ' (preview)' : ` → ${imageSrc}`}
                    </div>
                    <img
                        src={displaySrc}
                        alt={alt || options.defaultAlt || 'Image'}
                        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                    />
                    {options.includeCaption && caption && <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>{caption}</p>}
                </div>
            </div>
        );
    };

    // Return the component wrapped in SlugProvider
    return (props: any) => {
        return (
            <SlugProvider enabled={options.includeSlugTracking ?? false}>
                <ImageContentViewInner value={props.value} />
            </SlugProvider>
        );
    };
};

// Re-export keystatic primitives for convenience
export { fields } from '@keystatic/core';
export { wrapper, block, inline } from '@keystatic/core/content-components';

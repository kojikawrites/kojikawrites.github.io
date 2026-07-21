/** @jsxImportSource react */
/**
 * Keystatic editor component for ImageWithText
 *
 * This file defines how ImageWithText appears and is configured in the Keystatic editor.
 * Import this in keystatic.config.tsx and add to sharedCustomComponents.
 */

import { fields } from '@keystatic/core';
import { wrapper } from '@keystatic/core/content-components';
import React from 'react';
import { textWithAI } from './fields/textWithAI';

interface ImageWithTextKeystatic {
    blogImagePath: string;
}

/**
 * Create the ImageWithText Keystatic wrapper component
 *
 * @param config - Configuration options
 * @param config.blogImagePath - Base path for blog images (e.g., 'src/.sites/hiivelabs.com/images/blog')
 */
export const createImageWithTextComponent = ({ blogImagePath }: ImageWithTextKeystatic) => {
    return wrapper({
        label: 'Image With Text',
        description: 'Display an image alongside editable text content',
        schema: {
            image: fields.image({
                label: 'Image',
                description: 'Select the image to display',
                directory: blogImagePath,
                publicPath: `/${blogImagePath}/`,
                validation: { isRequired: true },
            }),
            // @ts-ignore
            alt: textWithAI({
                label: 'Alt Text',
                description: 'Descriptive text for accessibility',
                validation: { isRequired: true },
                mode: 'alt'
            }),
            // @ts-ignore
            description: textWithAI({
                label: 'Detailed Description',
                description: 'Longer description shown in lightbox',
                mode: 'description'
            }),
            // @ts-ignore
            caption: textWithAI({
                label: 'Caption',
                description: 'Caption shown below the image',
                mode: 'caption'
            }),
            imageWidth: fields.text({
                label: 'Image Width',
                description: 'CSS width value (e.g., "200px", "30%", "15rem")',
                defaultValue: '200px',
            }),
            imagePosition: fields.select({
                label: 'Image Position',
                description: 'Which side should the image appear on?',
                options: [
                    { label: 'Left', value: 'left' },
                    { label: 'Right', value: 'right' },
                ],
                defaultValue: 'left',
            }),
            gap: fields.text({
                label: 'Gap',
                description: 'Space between image and text (e.g., "1.5rem", "20px")',
                defaultValue: '1.5rem',
            }),
        },
        ContentView: (props) => {
            const { image, alt, description, caption, imageWidth, imagePosition, gap } = props.value;

            // Determine image source
            let imageSrc: string | null = null;
            let previewSrc: string | null = null;
            let isNewlySelected = false;

            if (image) {
                if (typeof image === 'string') {
                    imageSrc = (image as string).startsWith('/') ? image : `/${blogImagePath}/${image}`;
                } else if (typeof image === 'object') {
                    const imgObj = image as any;
                    const filename = imgObj.filename || imgObj.name || '';

                    if (filename) {
                        imageSrc = `/${blogImagePath}/${filename}`;
                    }

                    // Handle preview for newly selected images
                    if (imgObj.data && (imgObj.data instanceof Uint8Array || Array.isArray(imgObj.data))) {
                        try {
                            const uint8Array = imgObj.data instanceof Uint8Array ? imgObj.data : new Uint8Array(imgObj.data);
                            const blob = new Blob([uint8Array], { type: 'image/*' });
                            previewSrc = URL.createObjectURL(blob);
                            isNewlySelected = true;
                        } catch (e) {
                            console.error('Failed to create blob URL:', e);
                        }
                    } else if (imgObj instanceof File) {
                        previewSrc = URL.createObjectURL(imgObj);
                        isNewlySelected = true;
                    }
                }
            }

            const displaySrc = isNewlySelected && previewSrc ? previewSrc : imageSrc;
            const isImageLeft = imagePosition === 'left';

            // Cleanup blob URLs on unmount
            React.useEffect(() => {
                return () => {
                    if (previewSrc && previewSrc.startsWith('blob:')) {
                        URL.revokeObjectURL(previewSrc);
                    }
                };
            }, [previewSrc]);

            // Image section with info text
            const imageSection = (
                <div
                    contentEditable={false}
                    suppressContentEditableWarning={true}
                    onKeyDown={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onPaste={(e) => e.preventDefault()}
                    style={{
                        flexShrink: 0,
                        width: imageWidth || '200px',
                        maxWidth: '50%',
                        border: '2px solid #888',
                        borderRadius: '6px',
                        padding: '8px',
                        backgroundColor: 'var(--ks-color-scale-slate2)',
                        textAlign: isImageLeft ? 'left' : 'right',
                        userSelect: 'none',
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{
                        fontSize: '10px',
                        color: 'var(--ks-color-scale-slate11)',
                        marginBottom: '6px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}>
                        Image With Text ({imagePosition}, width: {imageWidth || '200px'})
                    </div>
                    {displaySrc ? (
                        <img
                            src={displaySrc}
                            alt={alt || 'Image'}
                            style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                borderRadius: '4px',
                                border: '1px solid var(--ks-color-scale-slate6)'
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.border = '2px solid red';
                            }}
                        />
                    ) : (
                        <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            backgroundColor: 'var(--ks-color-scale-slate3)',
                            borderRadius: '4px'
                        }}>
                            <p style={{ margin: '0', color: 'var(--ks-color-scale-slate11)', fontSize: '12px' }}>
                                No image selected
                            </p>
                        </div>
                    )}
                    {alt && (
                        <div style={{
                            marginTop: '6px',
                            fontSize: '10px',
                            color: 'var(--ks-color-scale-slate11)'
                        }}>
                            <strong>Alt:</strong> {alt}
                        </div>
                    )}
                    {caption && (
                        <div style={{
                            marginTop: '4px',
                            fontSize: '10px',
                            color: 'var(--ks-color-scale-slate11)'
                        }}>
                            <strong>Caption:</strong> {caption}
                        </div>
                    )}
                    {description && (
                        <div style={{
                            marginTop: '4px',
                            fontSize: '10px',
                            color: 'var(--ks-color-scale-slate11)'
                        }}>
                            <strong>Desc:</strong> {description}
                        </div>
                    )}
                </div>
            );

            // Editable text section
            const textSection = (
                <div style={{
                    flex: 1,
                    minWidth: 0,
                    border: '2px dashed #888',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: 'var(--ks-color-scale-slate1)',
                    minHeight: '80px'
                }}>
                    {props.children}
                </div>
            );

            return (
                <div style={{
                    display: 'flex',
                    flexDirection: isImageLeft ? 'row' : 'row-reverse',
                    gap: gap || '1.5rem',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                }}>
                    {imageSection}
                    {textSection}
                </div>
            );
        },
    });
};
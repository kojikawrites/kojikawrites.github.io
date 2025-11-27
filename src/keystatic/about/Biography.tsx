/** @jsxImportSource react */
/**
 * Keystatic editor component for Biography
 */

import React from 'react';
import {
    fields,
    wrapper,
    baseImagePath,
    baseDir,
    extractImageData,
    buildImagePath,
    SlugContext,
    SlugProvider
} from '../helpers';

export const createBiographyComponent = () => {
    return wrapper({
        label: 'Biography',
        schema: {
            id: fields.text({
                label: 'ID',
                validation: { isRequired: true },
            }),
            alt: fields.text({
                label: 'Alt Text',
            }),
            image: fields.image({
                label: 'Portrait Image',
                directory: baseImagePath,
                publicPath: `/${baseImagePath}/`,
            }),
            src: fields.text({
                label: 'Or enter path manually',
                description: 'Legacy support - leave empty if using image picker above',
            }),
        },
        ContentView: (props) => {
            // Inner component that uses slug context
            const BiographyContentViewInner: React.FC<{ value: any; children: React.ReactNode }> = ({ value, children }) => {
                const { id, alt, image, src } = value;
                const currentSlug = React.useContext(SlugContext);

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
                        sourceInfo = `Picker: ${extractedData.filename}${currentSlug ? ` (slug: ${currentSlug})` : ''}`;
                        imageSrc = buildImagePath(extractedData.filename, `/${baseImagePath}`, currentSlug);
                    }
                } else if (src) {
                    sourceInfo = `Manual: ${src}`;
                    imageSrc = src.startsWith('/') || src.startsWith(`${baseDir}/`)
                        ? src
                        : `/${baseImagePath}/${src}`;
                }

                // Clean up blob URLs when component unmounts or previewSrc changes
                React.useEffect(() => {
                    return () => {
                        if (previewSrc && previewSrc.startsWith('blob:')) {
                            URL.revokeObjectURL(previewSrc);
                        }
                    };
                }, [previewSrc]);

                const displaySrc = isNewlySelected && previewSrc ? previewSrc : imageSrc;

                return (
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
                            <div style={{ fontSize: '10px', color: 'var(--ks-color-scale-slate11)', marginBottom: '8px', fontFamily: 'monospace' }}>
                                Biography: {id || 'Untitled'}
                            </div>
                            {displaySrc ? (
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--ks-color-scale-slate11)', marginBottom: '4px', fontFamily: 'monospace' }}>
                                        {sourceInfo}{isNewlySelected && previewSrc ? ' (preview)' : ` → ${imageSrc}`}
                                    </div>
                                    <img
                                        src={displaySrc}
                                        alt={alt || id || 'Portrait'}
                                        style={{ maxWidth: '200px', maxHeight: '200px', height: 'auto', display: 'block', border: '2px solid currentColor', color: 'var(--ks-color-scale-slate11)' }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                                    />
                                </div>
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--ks-color-scale-slate3)', borderRadius: '4px', marginBottom: '8px' }}>
                                    <p style={{ margin: '0', color: 'var(--ks-color-scale-slate11)', fontSize: '14px' }}>No portrait image selected</p>
                                </div>
                            )}
                            <div style={{ fontSize: '11px', color: 'var(--ks-color-scale-slate11)' }}>
                                <div><strong>ID:</strong> {id || '(none)'}</div>
                                {alt && <div><strong>Alt:</strong> {alt}</div>}
                                {imageSrc && <div><strong>Image:</strong> <code style={{ backgroundColor: 'var(--ks-color-scale-slate3)', color: 'var(--ks-color-scale-slate12)', padding: '2px 4px', borderRadius: '2px', fontSize: '10px' }}>{imageSrc}</code></div>}
                            </div>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            {children}
                        </div>
                    </div>
                );
            };

            return (
                <SlugProvider enabled={true}>
                    <BiographyContentViewInner value={props.value} children={props.children} />
                </SlugProvider>
            );
        },
    });
};

export const Biography = createBiographyComponent();
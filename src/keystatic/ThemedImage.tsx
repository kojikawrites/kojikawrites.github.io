/** @jsxImportSource react */
/**
 * Keystatic editor component for ThemedImage
 */

import { fields, block, classField } from './helpers';
import { textWithAI } from './fields/textWithAI';

export const ThemedImage = block({
    label: 'Themed Image',
    schema: {
        id: fields.text({ label: 'Id' }),
        class: classField(),
        logoSrc: fields.object(
            {
                dark: fields.text({ label: 'Dark' }),
                light: fields.text({ label: 'Light' }),
            }
        ),
        src: fields.text({
            label: 'Source',
            description: 'Path with [THEME] placeholder (e.g., /path/logo-[THEME].png)',
        }),
        // @ts-ignore
        alt: textWithAI({ label: 'Alt Text', mode: 'alt' }),
    },
    ContentView: (props) => {
        const { src, alt } = props.value;

        // Replace [THEME] with actual theme values
        const lightSrc = src && src.includes('[THEME]') ? src.replace('[THEME]', 'light') : src;
        const darkSrc = src && src.includes('[THEME]') ? src.replace('[THEME]', 'dark') : src;

        if (!src) {
            return <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '4px' }}>
                <p>No themed image source specified</p>
            </div>;
        }

        return (
            <div style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', fontFamily: 'monospace' }}>
                    Themed Image: {src}
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                            Light theme
                        </div>
                        <img
                            src={lightSrc}
                            alt={alt || 'Themed image (light)'}
                            style={{ maxWidth: '100%', maxHeight: '200px', height: 'auto', width: 'auto', display: 'block', border: '1px solid #ddd', backgroundColor: '#fff', padding: '8px', objectFit: 'contain' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                            Dark theme
                        </div>
                        <img
                            src={darkSrc}
                            alt={alt || 'Themed image (dark)'}
                            style={{ maxWidth: '100%', maxHeight: '200px', height: 'auto', width: 'auto', display: 'block', border: '1px solid #ddd', backgroundColor: '#000', padding: '8px', objectFit: 'contain' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                        />
                    </div>
                </div>
            </div>
        );
    },
});
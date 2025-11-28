/** @jsxImportSource react */
/**
 * Keystatic editor component for ExampleComponent
 *
 * This provides a visual editor preview for the ExampleComponent.astro
 * component when editing MDX content in Keystatic.
 */

import React from 'react';
import { fields, wrapper } from '../../../keystatic/helpers';

// Variant styles matching the Astro component
const variantStyles = {
    info: {
        background: 'rgb(219 234 254)', // bg-blue-100
        border: 'rgb(96 165 250)',      // border-blue-400
        color: 'rgb(30 64 175)',        // text-blue-800
        icon: 'info'
    },
    success: {
        background: 'rgb(220 252 231)', // bg-green-100
        border: 'rgb(74 222 128)',      // border-green-400
        color: 'rgb(22 101 52)',        // text-green-800
        icon: 'success'
    },
    warning: {
        background: 'rgb(254 249 195)', // bg-yellow-100
        border: 'rgb(250 204 21)',      // border-yellow-400
        color: 'rgb(133 77 14)',        // text-yellow-800
        icon: 'warning'
    },
};

const icons = {
    info: 'info',
    success: 'check_circle',
    warning: 'warning',
};

export const ExampleComponent = wrapper({
    label: 'Example Component',
    description: 'A styled message box with variant styling (info, success, warning)',
    schema: {
        message: fields.text({
            label: 'Message',
            description: 'The main message to display',
            defaultValue: 'Hello from ExampleComponent!',
        }),
        variant: fields.select({
            label: 'Variant',
            description: 'The visual style of the component',
            options: [
                { label: 'Info (Blue)', value: 'info' },
                { label: 'Success (Green)', value: 'success' },
                { label: 'Warning (Yellow)', value: 'warning' },
            ],
            defaultValue: 'info',
        }),
    },
    ContentView: (props) => {
        const { message, variant } = props.value;
        const variantKey = (variant || 'info') as keyof typeof variantStyles;
        const styles = variantStyles[variantKey];

        return (
            <div
                style={{
                    padding: '16px',
                    marginBottom: '16px',
                    borderLeft: `4px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.background,
                    color: styles.color,
                    transition: 'all 0.2s ease-in-out',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, marginRight: '12px', fontSize: '24px' }}>
                        {variantKey === 'info' && <span>info</span>}
                        {variantKey === 'success' && <span>check_circle</span>}
                        {variantKey === 'warning' && <span>warning</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, margin: 0 }}>
                            {message || 'Hello from ExampleComponent!'}
                        </p>
                        {props.children && (
                            <div style={{ marginTop: '8px', fontSize: '14px' }}>
                                {props.children}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    },
});
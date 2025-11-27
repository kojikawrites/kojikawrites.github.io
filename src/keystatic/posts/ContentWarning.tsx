/** @jsxImportSource react */
/**
 * Keystatic editor component for ContentWarning
 */

import React from 'react';
import { fields, wrapper } from '../helpers';

export const ContentWarning = wrapper({
    label: 'Content Warning',
    schema: {
        warning: fields.text({
            label: 'Warning Text',
            description: 'Warning message to display',
            validation: { isRequired: true },
        }),
    },
    ContentView: (props) => {
        const ref = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
            if (ref.current) {
                // Navigate DOM to update header
                const warningHeader = ref.current.parentElement?.parentElement?.firstElementChild?.firstElementChild as HTMLDivElement;
                if (warningHeader && props.value.warning?.length || 0 > 0) {
                    const prefix =
                        (props.value.warning?.toUpperCase().startsWith("CONTENT WARNING:") || false)
                            ? ""
                            : "CONTENT WARNING: ";
                    warningHeader.innerText = `${prefix}${props.value.warning || '(no warning text)'}`;
                }
            }
        }, [props.value.warning]);

        return (
            <div ref={ref} style={{
                padding: '12px',
                color: 'var(--ks-color-scale-slate12)',
                paddingLeft: '20px',
                borderLeft: '3px solid var(--ks-color-scale-orange9)',
                backgroundColor: 'rgba(255, 0, 0, 0.1)'
            }}>
                <div style={{ paddingLeft: '8px', borderLeft: '2px solid var(--ks-color-scale-slate6)' }}>
                    {props.children}
                </div>
            </div>
        );
    },
});
/** @jsxImportSource react */
/**
 * Keystatic editor component for FootnoteDefinition
 */

import React from 'react';
import { fields, wrapper } from '../helpers';

export const FootnoteDefinition = wrapper({
    label: 'Footnote Definition',
    description: 'Content block for footnote text at the bottom of the page',
    schema: {
        id: fields.text({
            label: 'Footnote ID',
            description: 'Must match the reference ID (e.g., "1", "2", "a")',
        }),
    },
    ContentView: (props) => {
        const ref = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
            if (ref.current) {
                // Navigate DOM: ref -> parent -> parent -> firstChild -> firstChild to reach header
                const footnoteHeader = ref.current.parentElement?.parentElement?.firstElementChild?.firstElementChild as HTMLDivElement;
                if (footnoteHeader) {
                    footnoteHeader.innerText = `FOOTNOTE DEFINITION: [${props.value.id || '?'}]`;
                }
            }
        }, [props.value.id]);

        return (
            <div ref={ref} style={{
                padding: '12px',
                color: 'var(--ks-color-scale-slate12)',
                paddingLeft: '20px',
                borderLeft: '3px solid var(--ks-color-scale-blue9)'
            }}>
                {props.children}
            </div>
        );
    },
});
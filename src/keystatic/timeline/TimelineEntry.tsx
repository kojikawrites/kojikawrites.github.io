/** @jsxImportSource react */
/**
 * Keystatic editor component for TimelineEntry
 */

import React from 'react';
import { fields, wrapper, simpleWrapper } from '../helpers';

export const Timeline = simpleWrapper('Timeline');

export const TimelineEntry = wrapper({
    label: 'Timeline Entry',
    schema: {
        date: fields.text({ label: 'Timeline Date (in plaintext)' })
    },
    ContentView: (props) => {
        const ref = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
            if (ref.current) {
                // Navigate DOM: ref -> parent -> parent -> firstChild -> firstChild to reach header
                const timelineHeader = ref.current.parentElement?.parentElement?.firstElementChild?.firstElementChild as HTMLDivElement;
                if (timelineHeader) {
                    timelineHeader.innerText = `TIMELINE ENTRY: [${props.value.date || '?'}]`;
                }
            }
        }, [props.value.date]);

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
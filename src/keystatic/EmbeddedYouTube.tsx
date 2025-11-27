/** @jsxImportSource react */
/**
 * Keystatic editor component for EmbeddedYouTube
 */

import React from 'react';
import { fields, block } from './helpers';

export const EmbeddedYouTube = block({
    label: 'Embedded YouTube',
    schema: {
        youtubeId: fields.text({ label: 'YouTube ID' }),
        caption: fields.text({ label: 'Caption' }),
    },
    ContentView: (props) => {
        const { youtubeId, caption } = props.value;
        const [isPlaying, setIsPlaying] = React.useState(false);

        if (!youtubeId) {
            return (
                <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '4px' }}>
                    <p>No YouTube ID specified</p>
                </div>
            );
        }

        const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;

        return (
            <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
                <div
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                        fontSize: '10px',
                        color: 'var(--ks-color-scale-slate11)',
                        marginBottom: '8px',
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        backgroundColor: isPlaying ? 'var(--ks-color-scale-blue3)' : 'transparent',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (!isPlaying) e.currentTarget.style.backgroundColor = 'var(--ks-color-scale-slate3)';
                    }}
                    onMouseLeave={(e) => {
                        if (!isPlaying) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <span style={{ fontSize: '14px' }}>{isPlaying ? '||' : '>'}</span>
                    YouTube: <span style={{ color: 'var(--ks-color-scale-blue9)' }}>{youtubeId}</span>
                </div>
                {isPlaying ? (
                    <iframe
                        src={embedUrl}
                        style={{
                            width: '100%',
                            maxWidth: '480px',
                            aspectRatio: '16 / 9',
                            border: 'none',
                            borderRadius: '4px'
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <img
                        src={thumbnailUrl}
                        alt={`YouTube video ${youtubeId}`}
                        onClick={() => setIsPlaying(true)}
                        style={{
                            width: '100%',
                            maxWidth: '480px',
                            height: 'auto',
                            display: 'block',
                            borderRadius: '4px',
                            border: '1px solid var(--ks-color-scale-slate6)',
                            cursor: 'pointer'
                        }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            // @ts-ignore
                            (e.target as HTMLImageElement).parentElement!.innerHTML += '<p style="color: var(--ks-color-scale-slate11); font-style: italic;">Thumbnail not available</p>';
                        }}
                    />
                )}
                {caption && (
                    <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ks-color-scale-slate12)', fontStyle: 'italic' }}>
                        {caption}
                    </p>
                )}
            </div>
        );
    },
});
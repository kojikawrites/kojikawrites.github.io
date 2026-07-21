/** @jsxImportSource react */
/**
 * Keystatic editor component for MainLogo
 */

import { block, baseImagePath, logoMap, siteCode } from './helpers';

export const MainLogo = block({
    label: 'Main Logo',
    description: 'Site logo with light/dark theme variants',
    schema: {},
    ContentView: () => {
        // Get logo sources from logo-map.json
        const lightLogoSrc = logoMap?.light?.default?.src || `/${baseImagePath}/logos/default-logo-light.svg`;
        const darkLogoSrc = logoMap?.dark?.default?.src || `/${baseImagePath}/logos/default-logo-dark.svg`;
        const lightLogoAlt = logoMap?.light?.default?.alt || 'Main logo (light)';
        const darkLogoAlt = logoMap?.dark?.default?.alt || 'Main logo (dark)';

        return (
            <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
                <div style={{ fontSize: '10px', color: 'var(--ks-color-scale-slate11)', marginBottom: '8px', fontFamily: 'monospace' }}>
                    Main Logo ({siteCode})
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Light theme</div>
                        <img
                            src={lightLogoSrc}
                            alt={lightLogoAlt}
                            style={{ maxWidth: '100%', height: 'auto', display: 'block', backgroundColor: '#fff', padding: '8px' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Dark theme</div>
                        <img
                            src={darkLogoSrc}
                            alt={darkLogoAlt}
                            style={{ maxWidth: '100%', height: 'auto', display: 'block', backgroundColor: '#000', padding: '8px' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                        />
                    </div>
                </div>
            </div>
        );
    },
});
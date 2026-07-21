/** @jsxImportSource react */
/**
 * Keystatic editor component for Thanks
 */

import { fields, wrapper } from '../helpers';

export const Thanks = wrapper({
    label: 'Thanks',
    description: 'Acknowledgment block with name and optional link',
    schema: {
        name: fields.text({
            label: 'Name',
            validation: { isRequired: true },
        }),
        url: fields.text({
            label: 'URL',
        }),
    },
});
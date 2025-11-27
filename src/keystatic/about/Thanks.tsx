/** @jsxImportSource react */
/**
 * Keystatic editor component for Thanks
 */

import { fields, wrapper } from '../helpers';

export const Thanks = wrapper({
    label: 'Thanks',
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
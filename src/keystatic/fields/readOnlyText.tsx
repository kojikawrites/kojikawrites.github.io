/** @jsxImportSource react */
/**
 * Custom text field that renders as read-only
 *
 * Used for auto-generated fields like createdAt that should not be edited by users.
 */

import { fields } from '@keystatic/core';
import React from 'react';
import { TextField } from '@keystar/ui/text-field';

export interface ReadOnlyTextConfig {
    label: string;
    description?: string;
    defaultValue?: string;
}

export const readOnlyText = (config: ReadOnlyTextConfig) => {
    // Create the base text field
    const baseField = fields.text({
        label: config.label,
        description: config.description,
        defaultValue: config.defaultValue,
    });

    // Custom Input component that renders as read-only
    const ReadOnlyTextInput: React.FC<{
        value: string;
        onChange: (value: string) => void;
        autoFocus?: boolean;
        forceValidation?: boolean;
    }> = (props) => {
        return (
            <TextField
                label={config.label}
                description={config.description}
                value={props.value}
                onChange={props.onChange}
                autoFocus={props.autoFocus}
                isReadOnly={true}
            />
        );
    };

    // Return a field that spreads the base field but overrides Input
    return {
        ...baseField,
        Input: ReadOnlyTextInput,
    };
};
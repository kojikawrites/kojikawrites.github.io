/**
 * Shared JSON schema generators for LLM API responses
 */

// Schema generator for single text field responses
export const createTextSchema = (description: string = 'The generated or modified text') => ({
  type: 'object',
  properties: {
    text: {
      type: 'string',
      // description  // Commented out - LLM was filling this field instead of 'text'
    }
  },
  required: ['text']
});

// Schema generator for array responses (categories, tags, etc)
export const createArraySchema = (fieldName: string, description: string) => ({
  type: 'object',
  properties: {
    [fieldName]: {
      type: 'array',
      items: { type: 'string' },
      // description  // Commented out - LLM was filling this field instead of the array
    }
  },
  required: [fieldName]
});

// Schema for image color analysis response
export const createColorAnalysisSchema = () => ({
  type: 'object',
  properties: {
    predominantColor: {
      type: 'object',
      properties: {
        r: { type: 'number' },
        g: { type: 'number' },
        b: { type: 'number' }
      },
      required: ['r', 'g', 'b']
    }
  },
  required: ['predominantColor']
});
/**
 * JSON Extraction and Validation Utilities
 * Handles extracting JSON from LLM responses that may contain extra text
 */

export interface JSONExtractionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Check if a parsed JSON object looks like a JSON schema definition (not actual content)
 * Schema definitions have "type", "properties", "required" etc. with nested type definitions
 *
 * A TRUE schema looks like: {"type":"object","properties":{"text":{"type":"string"}}}
 * Content that looks similar: {"type":"object","properties":{"text":"actual content here"}}
 *
 * The key difference: in a schema, property values are objects with "type" field
 * In content, property values are actual strings/arrays/etc.
 */
function isSchemaDefinition(obj: any): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  // Schema pattern: has "type" and "properties" where properties contain type definitions
  if (obj.type === 'object' && obj.properties && typeof obj.properties === 'object') {
    // Check if properties contain schema-like definitions (type: "string", etc.)
    // vs actual content (string values directly)
    for (const key in obj.properties) {
      const prop = obj.properties[key];

      // If the property value is a primitive (string, number, etc.), this is CONTENT not schema
      if (typeof prop === 'string' || typeof prop === 'number' || typeof prop === 'boolean') {
        return false;  // Has actual content values
      }

      // If it's an array of primitives, this is CONTENT not schema
      if (Array.isArray(prop) && prop.length > 0 && prop.every(v => typeof v === 'string' || typeof v === 'number')) {
        return false;  // Has actual content values
      }

      // If it's an object with "type" as a string like "string", "number", etc., it's a SCHEMA
      if (prop && typeof prop === 'object' && !Array.isArray(prop) && 'type' in prop) {
        const typeValue = prop.type;
        // Schema type values are things like "string", "number", "array", "object"
        if (typeof typeValue === 'string' && ['string', 'number', 'boolean', 'array', 'object', 'integer'].includes(typeValue)) {
          return true;  // This is a schema definition
        }
      }
    }
  }

  return false;
}

/**
 * Check if a parsed JSON object contains actual content (not a schema)
 * Content objects have fields with primitive values or arrays of primitives
 */
function hasActualContent(obj: any, fieldName?: string): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  // If we're looking for a specific field
  if (fieldName && fieldName in obj) {
    const value = obj[fieldName];
    // Content has actual string/array values, not nested type definitions
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return true;
    }
    if (Array.isArray(value) && value.length > 0) {
      // Array of primitives is content
      if (value.every(v => typeof v === 'string' || typeof v === 'number')) {
        return true;
      }
    }
  }

  // Check all fields for actual content
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string' && value.length > 0) {
      return true;
    }
    if (Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string')) {
      return true;
    }
  }

  return false;
}

/**
 * Find all balanced JSON objects in a string
 * Returns array of {start, end, content} for each found JSON object
 */
function findAllJsonObjects(text: string): Array<{ start: number; end: number; content: string }> {
  const results: Array<{ start: number; end: number; content: string }> = [];
  let i = 0;

  while (i < text.length) {
    if (text[i] === '{') {
      // Found potential start of JSON object
      let depth = 1;
      let j = i + 1;
      let inString = false;
      let escape = false;

      while (j < text.length && depth > 0) {
        const char = text[j];

        if (escape) {
          escape = false;
        } else if (char === '\\' && inString) {
          escape = true;
        } else if (char === '"' && !escape) {
          inString = !inString;
        } else if (!inString) {
          if (char === '{') depth++;
          else if (char === '}') depth--;
        }
        j++;
      }

      if (depth === 0) {
        const content = text.substring(i, j);
        results.push({ start: i, end: j, content });
      }
      i = j;
    } else {
      i++;
    }
  }

  return results;
}

/**
 * Sanitize a string for JSON parsing by escaping unescaped newlines within string values
 * LLMs sometimes return JSON with literal newlines instead of \n
 */
function sanitizeJsonString(text: string): string {
  // Replace literal newlines that appear within JSON string values
  // This regex finds content between quotes and escapes newlines within it
  let inString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      result += char;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && char === '\n') {
      result += '\\n';
    } else if (inString && char === '\r') {
      result += '\\r';
    } else if (inString && char === '\t') {
      result += '\\t';
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Extract JSON object from text that may contain pre/postamble
 * Handles cases where schema is echoed before actual response
 * Prioritizes content objects over schema definitions
 */
export function extractJSON(text: string): JSONExtractionResult {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'Invalid input: text must be a non-empty string' };
  }

  // Sanitize the text first (handle unescaped newlines in JSON strings)
  const sanitizedText = sanitizeJsonString(text);

  // Try parsing the entire text first (best case - clean JSON response)
  try {
    const parsed = JSON.parse(sanitizedText.trim());
    // If it parses and has content (not just a schema), use it
    if (!isSchemaDefinition(parsed) || hasActualContent(parsed)) {
      return { success: true, data: parsed };
    }
  } catch {
    // Continue to extraction logic
  }

  // Find all JSON objects in the sanitized text
  const jsonObjects = findAllJsonObjects(sanitizedText);

  if (jsonObjects.length === 0) {
    // Try JSON array pattern as fallback
    const arrayMatch = sanitizedText.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        return { success: true, data: parsed };
      } catch {
        // Failed to parse
      }
    }

    return {
      success: false,
      error: 'No valid JSON object or array found in response'
    };
  }

  // Parse all found objects and categorize them
  const parsedObjects: Array<{ data: any; isSchema: boolean; hasContent: boolean }> = [];

  for (const obj of jsonObjects) {
    try {
      const parsed = JSON.parse(obj.content);
      parsedObjects.push({
        data: parsed,
        isSchema: isSchemaDefinition(parsed),
        hasContent: hasActualContent(parsed)
      });
    } catch {
      // Skip unparseable objects
    }
  }

  if (parsedObjects.length === 0) {
    return {
      success: false,
      error: 'Found JSON-like patterns but none were valid JSON'
    };
  }

  // Prioritize: content objects over schemas, later objects over earlier ones
  // (Schema is typically echoed first, actual response comes after)

  // First, try to find a non-schema object with actual content
  for (let i = parsedObjects.length - 1; i >= 0; i--) {
    const obj = parsedObjects[i];
    if (!obj.isSchema && obj.hasContent) {
      console.log('[jsonUtils] Selected content object (non-schema with content)');
      return { success: true, data: obj.data };
    }
  }

  // Next, try any non-schema object (even without detected content)
  for (let i = parsedObjects.length - 1; i >= 0; i--) {
    const obj = parsedObjects[i];
    if (!obj.isSchema) {
      console.log('[jsonUtils] Selected non-schema object');
      return { success: true, data: obj.data };
    }
  }

  // Last resort: use the last object even if it looks like a schema
  // (Maybe the extraction heuristics are wrong)
  console.log('[jsonUtils] Warning: Only schema-like objects found, using last one');
  return { success: true, data: parsedObjects[parsedObjects.length - 1].data };
}

/**
 * Validate that extracted JSON has the required field(s)
 * Handles both direct format and schema wrapper format
 * @param data - The parsed JSON data
 * @param requiredField - Single field name or array of field names that must exist
 */
export function validateRequiredFields(
  data: any,
  requiredField: string | string[]
): { valid: boolean; missingFields?: string[] } {
  if (!data || typeof data !== 'object') {
    return { valid: false, missingFields: ['(data is not an object)'] };
  }

  const fields = Array.isArray(requiredField) ? requiredField : [requiredField];
  const missing: string[] = [];

  // Check if data is a schema wrapper
  // Pattern: {"type": "object", "properties": {"text": {...}}}
  if (data.type === 'object' && data.properties && typeof data.properties === 'object') {
    // Validate fields exist in properties
    for (const field of fields) {
      if (!(field in data.properties)) {
        missing.push(field);
      }
    }
  } else {
    // Direct format validation
    for (const field of fields) {
      if (!(field in data)) {
        missing.push(field);
      }
    }
  }

  if (missing.length > 0) {
    return { valid: false, missingFields: missing };
  }

  return { valid: true };
}

/**
 * Extract and validate JSON in one operation
 * @param text - The text potentially containing JSON
 * @param requiredField - Field(s) that must exist in the JSON
 */
export function extractAndValidateJSON(
  text: string,
  requiredField: string | string[]
): JSONExtractionResult {
  // First extract the JSON
  const extraction = extractJSON(text);
  if (!extraction.success) {
    return extraction;
  }

  // Then validate required fields
  const validation = validateRequiredFields(extraction.data, requiredField);
  if (!validation.valid) {
    return {
      success: false,
      error: `Missing required field(s): ${validation.missingFields?.join(', ')}`
    };
  }

  return extraction;
}

/**
 * Expected type for field value extraction
 */
export type ExpectedType = 'string' | 'array' | 'any';

/**
 * Recursively search for the actual content value within nested objects
 * Looks for string values or arrays, skipping schema metadata fields
 * @param obj - The object to search
 * @param depth - Current recursion depth
 * @param expectedType - The expected type ('string', 'array', or 'any')
 */
function findActualValue(obj: any, depth: number = 0, expectedType: ExpectedType = 'any'): any {
  // Prevent infinite recursion
  if (depth > 10) return undefined;

  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // If it's an array, return it as-is (let caller handle type validation)
  if (Array.isArray(obj)) {
    return obj;
  }

  // Common content fields to check in order of priority
  const contentFields = ['value', 'description', 'text', 'content', 'data'];

  for (const field of contentFields) {
    if (field in obj) {
      const value = obj[field];
      // If it's a primitive value (string, number, boolean), return it
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }
      // If it's an array, return it (let caller handle type validation)
      if (Array.isArray(value)) {
        return value;
      }
      // If it's an object, recurse
      if (typeof value === 'object') {
        const found = findActualValue(value, depth + 1, expectedType);
        if (found !== undefined) {
          return found;
        }
      }
    }
  }

  // If no common fields found, try all fields
  for (const key in obj) {
    // Skip schema metadata fields
    if (key === 'type' || key === 'properties' || key === 'required' || key === 'items') {
      continue;
    }

    const value = obj[key];

    // If it's a primitive, return it
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    // If it's an array, return it (let caller handle type validation)
    if (Array.isArray(value)) {
      return value;
    }

    // If it's an object, recurse
    if (typeof value === 'object') {
      const found = findActualValue(value, depth + 1, expectedType);
      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}

/**
 * Extract the value of a specific field from validated JSON data
 * Uses smart extraction: first tries direct access, then recursively searches for actual content
 * @param data - The parsed JSON data
 * @param fieldName - The field to extract
 * @param expectedType - The expected type of the value ('string', 'array', or 'any')
 */
export function extractFieldValue(data: any, fieldName: string, expectedType: ExpectedType = 'any'): any {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  let value: any;

  // Try direct access first (fast path for well-formed responses)
  if (fieldName in data) {
    const field = data[fieldName];

    // If it's already a primitive or array, use it
    if (typeof field !== 'object' || Array.isArray(field)) {
      value = field;
    } else {
      // If it's an object, recursively search for the actual value
      value = findActualValue(field, 0, expectedType);
    }
  } else if (data.type === 'object' && data.properties && typeof data.properties === 'object') {
    // Field not found directly - check if data is a schema wrapper
    // Pattern: {"type": "object", "properties": {"text": {...}}}
    if (fieldName in data.properties) {
      value = findActualValue(data.properties[fieldName], 0, expectedType);
    }
  } else {
    // Last resort: recursively search the entire data structure
    value = findActualValue(data, 0, expectedType);
  }

  // Type validation: reject wrong types entirely (no recovery attempts)
  // If the LLM returns the wrong type, it's a malformed response that should trigger retry
  if (expectedType === 'string') {
    if (Array.isArray(value)) {
      console.error('[jsonUtils] Expected string but got array - this is a malformed response');
      return undefined;
    }
    if (typeof value !== 'string') {
      console.error(`[jsonUtils] Expected string but got ${typeof value} - this is a malformed response`);
      return undefined;
    }
  } else if (expectedType === 'array') {
    if (!Array.isArray(value)) {
      console.error(`[jsonUtils] Expected array but got ${typeof value} - this is a malformed response`);
      return undefined;
    }
  }

  return value;
}
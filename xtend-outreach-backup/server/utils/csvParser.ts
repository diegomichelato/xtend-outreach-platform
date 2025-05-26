/**
 * CSV Parser Utility
 * 
 * Provides functions for parsing CSV content into JavaScript objects.
 * Handles different formats and error conditions.
 */

import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { contactCSVSchema, type ContactCSV } from '@shared/schema';

/**
 * Parse a CSV string into an array of objects
 * @param csvContent - The CSV content as a string
 * @param options - Optional configuration for CSV parsing
 * @returns Array of parsed objects
 */
export async function parseCSV<T = Record<string, any>>(
  csvContent: string,
  options: {
    validateSchema?: z.ZodSchema<T>;
    headers?: boolean | string[];
    skipEmptyLines?: boolean;
    trimHeaders?: boolean;
    delimiter?: string;
  } = {}
): Promise<T[]> {
  const {
    validateSchema,
    headers = true,
    skipEmptyLines = true,
    trimHeaders = true,
    delimiter = ','
  } = options;

  try {
    // Parse CSV to records
    const records = parse(csvContent, {
      columns: headers,
      skip_empty_lines: skipEmptyLines,
      trim: trimHeaders,
      delimiter
    });

    // Validate against schema if provided
    if (validateSchema) {
      const validationResult = z.array(validateSchema).safeParse(records);
      if (!validationResult.success) {
        throw new Error(`CSV validation failed: ${validationResult.error.message}`);
      }
      return validationResult.data;
    }

    return records as T[];
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse a CSV string specifically for contacts, with validation
 * @param csvContent - The CSV content as a string
 * @returns Array of validated contact objects
 */
export async function parseContactCSV(csvContent: string): Promise<ContactCSV[]> {
  try {
    return await parseCSV<ContactCSV>(csvContent, {
      validateSchema: contactCSVSchema
    });
  } catch (error) {
    console.error('Contact CSV parsing error:', error);
    throw new Error(`Failed to parse contact CSV: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Convert an array of objects to CSV format
 * @param data - Array of objects to convert
 * @param options - Optional configuration for CSV generation
 * @returns CSV string
 */
export function objectsToCSV<T extends Record<string, any>>(
  data: T[],
  options: {
    headers?: boolean | string[];
    delimiter?: string;
  } = {}
): string {
  const { headers = true, delimiter = ',' } = options;

  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object if not specified
  const headerRow = Array.isArray(headers)
    ? headers
    : headers
    ? Object.keys(data[0])
    : null;

  // Create CSV string
  const rows = [];

  // Add header row if needed
  if (headerRow) {
    rows.push(headerRow.join(delimiter));
  }

  // Add data rows
  for (const item of data) {
    const values = headerRow
      ? headerRow.map(header => {
          const value = item[header];
          // Handle different value types
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'string') {
            // Escape quotes and wrap in quotes if needed
            const escaped = value.replace(/"/g, '""');
            return /[",\n\r]/.test(value) ? `"${escaped}"` : value;
          }
          return String(value);
        })
      : Object.values(item).map(value => {
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'string') {
            const escaped = value.replace(/"/g, '""');
            return /[",\n\r]/.test(value) ? `"${escaped}"` : value;
          }
          return String(value);
        });

    rows.push(values.join(delimiter));
  }

  return rows.join('\n');
}
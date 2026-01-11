/**
 * CSV Parsing and Generation Utilities
 * @module utils/csv
 * @description Comprehensive CSV handling with support for parsing,
 * generation, streaming, and various delimiter formats.
 */

/**
 * CSV parse options
 */
export interface CSVParseOptions {
  /** Field delimiter (default: ,) */
  delimiter?: string;
  /** Quote character (default: ") */
  quote?: string;
  /** Escape character (default: ") */
  escape?: string;
  /** Skip empty lines */
  skipEmptyLines?: boolean;
  /** Treat first row as headers */
  headers?: boolean | string[];
  /** Number of rows to skip at start */
  skipRows?: number;
  /** Maximum rows to parse */
  maxRows?: number;
  /** Trim whitespace from values */
  trim?: boolean;
  /** Transform values during parse */
  transform?: (value: string, column: number, row: number) => unknown;
  /** Comment prefix (lines starting with this are skipped) */
  comment?: string;
}

/**
 * CSV stringify options
 */
export interface CSVStringifyOptions {
  /** Field delimiter (default: ,) */
  delimiter?: string;
  /** Quote character (default: ") */
  quote?: string;
  /** Always quote all fields */
  quoteAll?: boolean;
  /** Include headers row */
  headers?: boolean | string[];
  /** Line ending (default: \n) */
  newline?: string;
  /** Transform values during stringify */
  transform?: (value: unknown, column: number, row: number) => string;
}

/**
 * Parse result with metadata
 */
export interface CSVParseResult<T = Record<string, string>> {
  /** Parsed data rows */
  data: T[];
  /** Headers if detected/provided */
  headers: string[];
  /** Number of rows parsed */
  rowCount: number;
  /** Any parsing errors */
  errors: Array<{ row: number; column: number; message: string }>;
}

/**
 * Parse CSV string to array of objects or arrays
 * @param input - CSV string to parse
 * @param options - Parse options
 * @returns Parsed data with metadata
 * @example
 * const { data } = parseCSV('name,age\nJohn,30\nJane,25', { headers: true });
 * // data = [{ name: 'John', age: '30' }, { name: 'Jane', age: '25' }]
 */
export function parseCSV<T = Record<string, string>>(
  input: string,
  options: CSVParseOptions = {}
): CSVParseResult<T> {
  const {
    delimiter = ',',
    quote = '"',
    escape = '"',
    skipEmptyLines = true,
    headers = false,
    skipRows = 0,
    maxRows,
    trim = true,
    transform,
    comment,
  } = options;

  const errors: CSVParseResult['errors'] = [];
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let rowIndex = 0;

  // Parse character by character
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const nextChar = input[i + 1];

    if (inQuotes) {
      // Inside quoted field
      if (char === escape && nextChar === quote) {
        // Escaped quote
        currentField += quote;
        i++; // Skip next character
      } else if (char === quote) {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      // Outside quoted field
      if (char === quote) {
        // Start of quoted field
        inQuotes = true;
      } else if (char === delimiter) {
        // End of field
        currentRow.push(trim ? currentField.trim() : currentField);
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        // CRLF line ending
        finishRow();
        i++; // Skip \n
      } else if (char === '\n' || char === '\r') {
        // LF or CR line ending
        finishRow();
      } else {
        currentField += char;
      }
    }
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    finishRow();
  }

  function finishRow(): void {
    currentRow.push(trim ? currentField.trim() : currentField);
    currentField = '';

    // Skip comment lines
    if (comment && currentRow[0]?.startsWith(comment)) {
      currentRow = [];
      return;
    }

    // Skip empty lines
    if (skipEmptyLines && currentRow.every(cell => cell === '')) {
      currentRow = [];
      return;
    }

    // Skip initial rows
    if (rowIndex < skipRows) {
      rowIndex++;
      currentRow = [];
      return;
    }

    // Check max rows
    if (maxRows !== undefined && rows.length >= maxRows) {
      currentRow = [];
      return;
    }

    rows.push(currentRow);
    currentRow = [];
    rowIndex++;
  }

  // Determine headers
  let headerRow: string[];
  let dataRows: string[][];

  if (headers === true && rows.length > 0) {
    headerRow = rows[0];
    dataRows = rows.slice(1);
  } else if (Array.isArray(headers)) {
    headerRow = headers;
    dataRows = rows;
  } else {
    headerRow = [];
    dataRows = rows;
  }

  // Convert to objects or arrays with transforms
  const data = dataRows.map((row, rowIdx) => {
    if (headerRow.length > 0) {
      // Return object with headers as keys
      const obj: Record<string, unknown> = {};
      headerRow.forEach((header, colIdx) => {
        let value: unknown = row[colIdx] ?? '';
        if (transform) {
          value = transform(value as string, colIdx, rowIdx);
        }
        obj[header] = value;
      });
      return obj as T;
    } else {
      // Return array, optionally transformed
      if (transform) {
        return row.map((val, colIdx) =>
          transform(val, colIdx, rowIdx)
        ) as unknown as T;
      }
      return row as unknown as T;
    }
  });

  return {
    data,
    headers: headerRow,
    rowCount: data.length,
    errors,
  };
}

/**
 * Convert array of objects/arrays to CSV string
 * @param data - Data to stringify
 * @param options - Stringify options
 * @returns CSV string
 * @example
 * const csv = stringifyCSV([{ name: 'John', age: 30 }], { headers: true });
 * // csv = 'name,age\nJohn,30'
 */
export function stringifyCSV(
  data: Array<Record<string, unknown> | unknown[]>,
  options: CSVStringifyOptions = {}
): string {
  const {
    delimiter = ',',
    quote = '"',
    quoteAll = false,
    headers = true,
    newline = '\n',
    transform,
  } = options;

  if (data.length === 0) {
    return '';
  }

  const needsQuoting = (value: string): boolean => {
    return (
      quoteAll ||
      value.includes(delimiter) ||
      value.includes(quote) ||
      value.includes('\n') ||
      value.includes('\r')
    );
  };

  const escapeValue = (
    value: unknown,
    colIdx: number,
    rowIdx: number
  ): string => {
    let str: string;

    if (transform) {
      str = transform(value, colIdx, rowIdx);
    } else if (value === null || value === undefined) {
      str = '';
    } else if (typeof value === 'object') {
      str = JSON.stringify(value);
    } else {
      str = String(value);
    }

    if (needsQuoting(str)) {
      // Escape quotes by doubling them
      return quote + str.replace(new RegExp(quote, 'g'), quote + quote) + quote;
    }
    return str;
  };

  const lines: string[] = [];
  const firstRow = data[0];

  // Determine header row
  let headerRow: string[];
  if (Array.isArray(headers)) {
    headerRow = headers;
  } else if (headers && !Array.isArray(firstRow)) {
    headerRow = Object.keys(firstRow as Record<string, unknown>);
  } else {
    headerRow = [];
  }

  // Add headers
  if (headerRow.length > 0) {
    lines.push(headerRow.map((h, i) => escapeValue(h, i, -1)).join(delimiter));
  }

  // Add data rows
  data.forEach((row, rowIdx) => {
    if (Array.isArray(row)) {
      lines.push(
        row
          .map((val, colIdx) => escapeValue(val, colIdx, rowIdx))
          .join(delimiter)
      );
    } else {
      const obj = row as Record<string, unknown>;
      const keys = headerRow.length > 0 ? headerRow : Object.keys(obj);
      lines.push(
        keys
          .map((key, colIdx) => escapeValue(obj[key], colIdx, rowIdx))
          .join(delimiter)
      );
    }
  });

  return lines.join(newline);
}

/**
 * Parse TSV (Tab-Separated Values)
 */
export function parseTSV<T = Record<string, string>>(
  input: string,
  options: Omit<CSVParseOptions, 'delimiter'> = {}
): CSVParseResult<T> {
  return parseCSV<T>(input, { ...options, delimiter: '\t' });
}

/**
 * Stringify to TSV
 */
export function stringifyTSV(
  data: Array<Record<string, unknown> | unknown[]>,
  options: Omit<CSVStringifyOptions, 'delimiter'> = {}
): string {
  return stringifyCSV(data, { ...options, delimiter: '\t' });
}

/**
 * Auto-detect delimiter from CSV content
 * @param input - CSV string
 * @returns Detected delimiter
 */
export function detectDelimiter(input: string): string {
  const delimiters = [',', '\t', ';', '|'];
  const firstLine = input.split(/[\r\n]/)[0] || '';

  let bestDelimiter = ',';
  let maxCount = 0;

  for (const delimiter of delimiters) {
    // Count occurrences outside of quotes
    let count = 0;
    let inQuotes = false;

    for (const char of firstLine) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes && char === delimiter) {
        count++;
      }
    }

    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * Parse CSV with auto-detected options
 */
export function parseCSVAuto<T = Record<string, string>>(
  input: string,
  options: Omit<CSVParseOptions, 'delimiter'> = {}
): CSVParseResult<T> {
  const delimiter = detectDelimiter(input);
  return parseCSV<T>(input, { ...options, delimiter, headers: true });
}

/**
 * Convert CSV to JSON string
 */
export function csvToJSON(
  input: string,
  options: CSVParseOptions = {}
): string {
  const { data } = parseCSV(input, { ...options, headers: true });
  return JSON.stringify(data, null, 2);
}

/**
 * Convert JSON array to CSV
 */
export function jsonToCSV(
  input: string | unknown[],
  options: CSVStringifyOptions = {}
): string {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  return stringifyCSV(data, { ...options, headers: true });
}

/**
 * Get column statistics from CSV data
 */
export interface ColumnStats {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'mixed';
  nonEmpty: number;
  empty: number;
  unique: number;
  min?: number | string;
  max?: number | string;
  sample: unknown[];
}

/**
 * Analyze CSV columns
 */
export function analyzeCSV(
  input: string,
  options: CSVParseOptions = {}
): ColumnStats[] {
  const { data, headers } = parseCSV(input, { ...options, headers: true });

  if (data.length === 0 || headers.length === 0) {
    return [];
  }

  return headers.map(header => {
    const values = data.map(row => (row as Record<string, unknown>)[header]);
    const nonEmptyValues = values.filter(
      v => v !== '' && v !== null && v !== undefined
    );
    const uniqueValues = new Set(nonEmptyValues.map(v => String(v)));

    // Detect type
    let type: ColumnStats['type'] = 'string';
    const types = new Set<string>();

    for (const value of nonEmptyValues) {
      const str = String(value);
      if (!isNaN(Number(str)) && str !== '') {
        types.add('number');
      } else if (str === 'true' || str === 'false') {
        types.add('boolean');
      } else if (!isNaN(Date.parse(str))) {
        types.add('date');
      } else {
        types.add('string');
      }
    }

    if (types.size === 1) {
      type = types.values().next().value as ColumnStats['type'];
    } else if (types.size > 1) {
      type = 'mixed';
    }

    // Calculate min/max for numbers
    let min: number | string | undefined;
    let max: number | string | undefined;

    if (type === 'number') {
      const numbers = nonEmptyValues.map(v => Number(v));
      min = Math.min(...numbers);
      max = Math.max(...numbers);
    } else if (type === 'string' && nonEmptyValues.length > 0) {
      const sorted = [...nonEmptyValues].map(String).sort();
      min = sorted[0];
      max = sorted[sorted.length - 1];
    }

    return {
      name: header,
      type,
      nonEmpty: nonEmptyValues.length,
      empty: values.length - nonEmptyValues.length,
      unique: uniqueValues.size,
      min,
      max,
      sample: nonEmptyValues.slice(0, 5),
    };
  });
}

/**
 * Filter CSV rows
 */
export function filterCSV<T = Record<string, string>>(
  input: string,
  predicate: (row: T, index: number) => boolean,
  options: CSVParseOptions = {}
): string {
  const { data, headers } = parseCSV<T>(input, { ...options, headers: true });
  const filtered = data.filter(predicate);
  return stringifyCSV(filtered as Array<Record<string, unknown>>, { headers });
}

/**
 * Map CSV rows
 */
export function mapCSV<T = Record<string, string>, R = Record<string, unknown>>(
  input: string,
  mapper: (row: T, index: number) => R,
  options: CSVParseOptions = {}
): string {
  const { data } = parseCSV<T>(input, { ...options, headers: true });
  const mapped = data.map(mapper);
  return stringifyCSV(mapped as Array<Record<string, unknown>>, {
    headers: true,
  });
}

/**
 * Sort CSV by column
 */
export function sortCSV(
  input: string,
  column: string,
  options: CSVParseOptions & { descending?: boolean } = {}
): string {
  const { descending = false, ...parseOptions } = options;
  const { data, headers } = parseCSV(input, { ...parseOptions, headers: true });

  const sorted = [...data].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[column];
    const bVal = (b as Record<string, unknown>)[column];

    let comparison: number;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return descending ? -comparison : comparison;
  });

  return stringifyCSV(sorted as Array<Record<string, unknown>>, { headers });
}

/**
 * Select specific columns from CSV
 */
export function selectColumns(
  input: string,
  columns: string[],
  options: CSVParseOptions = {}
): string {
  const { data } = parseCSV(input, { ...options, headers: true });

  const selected = data.map(row => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col] = (row as Record<string, unknown>)[col];
    }
    return obj;
  });

  return stringifyCSV(selected, { headers: columns });
}

/**
 * Rename columns in CSV
 */
export function renameColumns(
  input: string,
  mapping: Record<string, string>,
  options: CSVParseOptions = {}
): string {
  const { data, headers } = parseCSV(input, { ...options, headers: true });

  const newHeaders = headers.map(h => mapping[h] || h);
  const renamed = data.map(row => {
    const obj: Record<string, unknown> = {};
    headers.forEach((oldKey, idx) => {
      const newKey = newHeaders[idx];
      obj[newKey] = (row as Record<string, unknown>)[oldKey];
    });
    return obj;
  });

  return stringifyCSV(renamed, { headers: newHeaders });
}

/**
 * Merge multiple CSV strings
 */
export function mergeCSV(
  inputs: string[],
  options: CSVParseOptions = {}
): string {
  const allData: Array<Record<string, unknown>> = [];
  const allHeaders = new Set<string>();

  for (const input of inputs) {
    const { data, headers } = parseCSV(input, { ...options, headers: true });
    headers.forEach(h => allHeaders.add(h));
    allData.push(...(data as Array<Record<string, unknown>>));
  }

  return stringifyCSV(allData, { headers: Array.from(allHeaders) });
}

/**
 * Group CSV data by column
 */
export function groupCSV<T = Record<string, string>>(
  input: string,
  column: string,
  options: CSVParseOptions = {}
): Record<string, T[]> {
  const { data } = parseCSV<T>(input, { ...options, headers: true });

  const groups: Record<string, T[]> = {};
  for (const row of data) {
    const key = String((row as Record<string, unknown>)[column] ?? '');
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(row);
  }

  return groups;
}

/**
 * Pivot CSV data
 */
export function pivotCSV(
  input: string,
  rowKey: string,
  columnKey: string,
  valueKey: string,
  options: CSVParseOptions = {}
): string {
  const { data } = parseCSV(input, { ...options, headers: true });

  // Get unique column values
  const columnValues = new Set<string>();
  const rowData = new Map<string, Record<string, unknown>>();

  for (const row of data as Array<Record<string, unknown>>) {
    const rKey = String(row[rowKey]);
    const cKey = String(row[columnKey]);
    const value = row[valueKey];

    columnValues.add(cKey);

    if (!rowData.has(rKey)) {
      rowData.set(rKey, { [rowKey]: rKey });
    }
    rowData.get(rKey)![cKey] = value;
  }

  const headers = [rowKey, ...Array.from(columnValues).sort()];
  return stringifyCSV(Array.from(rowData.values()), { headers });
}

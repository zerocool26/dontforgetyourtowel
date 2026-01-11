/**
 * Compression Utilities
 * @module utils/compression
 * @description Text and data compression/decompression utilities using
 * native browser APIs (CompressionStream/DecompressionStream) and fallbacks.
 */

/**
 * Compression format types
 */
export type CompressionFormat = 'gzip' | 'deflate' | 'deflate-raw';

/**
 * Check if Compression Streams API is supported
 */
export function isCompressionSupported(): boolean {
  return (
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined'
  );
}

/**
 * Compress a string using the specified format
 * @param data - String to compress
 * @param format - Compression format (gzip, deflate, deflate-raw)
 * @returns Compressed data as Uint8Array
 */
export async function compressString(
  data: string,
  format: CompressionFormat = 'gzip'
): Promise<Uint8Array> {
  if (!isCompressionSupported()) {
    throw new Error('Compression Streams API is not supported');
  }

  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(data);

  const cs = new CompressionStream(format);
  const writer = cs.writable.getWriter();
  await writer.write(inputBytes as unknown as BufferSource);
  await writer.close();

  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Decompress data to a string
 * @param data - Compressed data as Uint8Array
 * @param format - Compression format used
 * @returns Decompressed string
 */
export async function decompressToString(
  data: Uint8Array,
  format: CompressionFormat = 'gzip'
): Promise<string> {
  if (!isCompressionSupported()) {
    throw new Error('Compression Streams API is not supported');
  }

  const ds = new DecompressionStream(format);
  const writer = ds.writable.getWriter();
  await writer.write(data as unknown as BufferSource);
  await writer.close();

  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine and decode
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(result);
}

/**
 * Compress string to Base64
 * @param data - String to compress
 * @param format - Compression format
 * @returns Base64 encoded compressed data
 */
export async function compressToBase64(
  data: string,
  format: CompressionFormat = 'gzip'
): Promise<string> {
  const compressed = await compressString(data, format);
  return uint8ArrayToBase64(compressed);
}

/**
 * Decompress Base64 encoded data to string
 * @param base64 - Base64 encoded compressed data
 * @param format - Compression format used
 * @returns Decompressed string
 */
export async function decompressFromBase64(
  base64: string,
  format: CompressionFormat = 'gzip'
): Promise<string> {
  const compressed = base64ToUint8Array(base64);
  return decompressToString(compressed, format);
}

/**
 * Convert Uint8Array to Base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Calculate compression ratio
 * @param original - Original data size in bytes
 * @param compressed - Compressed data size in bytes
 * @returns Compression ratio (0-1, where 0 means maximum compression)
 */
export function compressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return compressed / original;
}

/**
 * Calculate compression savings percentage
 * @param original - Original data size in bytes
 * @param compressed - Compressed data size in bytes
 * @returns Savings percentage (0-100)
 */
export function compressionSavings(
  original: number,
  compressed: number
): number {
  if (original === 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}

// ============================================================================
// Run-Length Encoding (RLE) - Simple fallback compression
// ============================================================================

/**
 * Run-Length Encode a string
 * @param data - String to encode
 * @returns RLE encoded string
 * @example rleEncode('AAABBC') // '3A2B1C'
 */
export function rleEncode(data: string): string {
  if (!data) return '';

  let result = '';
  let count = 1;

  for (let i = 1; i <= data.length; i++) {
    if (i < data.length && data[i] === data[i - 1]) {
      count++;
    } else {
      result += count + data[i - 1];
      count = 1;
    }
  }

  return result;
}

/**
 * Run-Length Decode a string
 * @param encoded - RLE encoded string
 * @returns Decoded string
 * @example rleDecode('3A2B1C') // 'AAABBC'
 */
export function rleDecode(encoded: string): string {
  if (!encoded) return '';

  let result = '';
  let numStr = '';

  for (const char of encoded) {
    if (/\d/.test(char)) {
      numStr += char;
    } else {
      const count = parseInt(numStr, 10) || 1;
      result += char.repeat(count);
      numStr = '';
    }
  }

  return result;
}

// ============================================================================
// LZ String Compression (lightweight, pure JS)
// ============================================================================

/**
 * Simple LZ-based string compression
 * Uses dictionary-based compression suitable for text
 */
export function lzCompress(input: string): string {
  if (!input) return '';

  const dict: Map<string, number> = new Map();
  let dictSize = 256;
  let result: number[] = [];
  let w = '';

  // Initialize dictionary with single characters
  for (let i = 0; i < 256; i++) {
    dict.set(String.fromCharCode(i), i);
  }

  for (const c of input) {
    const wc = w + c;
    if (dict.has(wc)) {
      w = wc;
    } else {
      result.push(dict.get(w)!);
      dict.set(wc, dictSize++);
      w = c;
    }
  }

  if (w) {
    result.push(dict.get(w)!);
  }

  // Convert to base64-like string for safe transport
  return result.map(n => String.fromCharCode(n)).join('');
}

/**
 * Decompress LZ-compressed string
 */
export function lzDecompress(compressed: string): string {
  if (!compressed) return '';

  const dict: Map<number, string> = new Map();
  let dictSize = 256;

  // Initialize dictionary with single characters
  for (let i = 0; i < 256; i++) {
    dict.set(i, String.fromCharCode(i));
  }

  const codes = compressed.split('').map(c => c.charCodeAt(0));
  let w = String.fromCharCode(codes[0]);
  let result = w;

  for (let i = 1; i < codes.length; i++) {
    const k = codes[i];
    let entry: string;

    if (dict.has(k)) {
      entry = dict.get(k)!;
    } else if (k === dictSize) {
      entry = w + w.charAt(0);
    } else {
      throw new Error('Invalid compressed data');
    }

    result += entry;
    dict.set(dictSize++, w + entry.charAt(0));
    w = entry;
  }

  return result;
}

// ============================================================================
// Delta Encoding (for numeric sequences)
// ============================================================================

/**
 * Delta encode an array of numbers
 * Stores differences between consecutive values
 * @param numbers - Array of numbers
 * @returns Delta encoded array [firstValue, diff1, diff2, ...]
 */
export function deltaEncode(numbers: number[]): number[] {
  if (numbers.length === 0) return [];
  if (numbers.length === 1) return [numbers[0]];

  const result = [numbers[0]];
  for (let i = 1; i < numbers.length; i++) {
    result.push(numbers[i] - numbers[i - 1]);
  }
  return result;
}

/**
 * Delta decode an array of numbers
 * @param encoded - Delta encoded array
 * @returns Original array of numbers
 */
export function deltaDecode(encoded: number[]): number[] {
  if (encoded.length === 0) return [];
  if (encoded.length === 1) return [encoded[0]];

  const result = [encoded[0]];
  for (let i = 1; i < encoded.length; i++) {
    result.push(result[i - 1] + encoded[i]);
  }
  return result;
}

// ============================================================================
// Bit Packing (for small integers)
// ============================================================================

/**
 * Pack an array of small integers into a compact string
 * @param numbers - Array of numbers (0-255)
 * @returns Packed string
 */
export function packBytes(numbers: number[]): string {
  return numbers.map(n => String.fromCharCode(n & 0xff)).join('');
}

/**
 * Unpack a string back to array of numbers
 * @param packed - Packed string
 * @returns Array of numbers
 */
export function unpackBytes(packed: string): number[] {
  return packed.split('').map(c => c.charCodeAt(0));
}

/**
 * Pack array of booleans into a compact representation
 * @param booleans - Array of booleans
 * @returns Packed string
 */
export function packBooleans(booleans: boolean[]): string {
  const bytes: number[] = [];
  for (let i = 0; i < booleans.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8 && i + j < booleans.length; j++) {
      if (booleans[i + j]) {
        byte |= 1 << j;
      }
    }
    bytes.push(byte);
  }
  return String.fromCharCode(booleans.length) + packBytes(bytes);
}

/**
 * Unpack string back to array of booleans
 * @param packed - Packed string
 * @returns Array of booleans
 */
export function unpackBooleans(packed: string): boolean[] {
  if (!packed) return [];

  const length = packed.charCodeAt(0);
  const bytes = unpackBytes(packed.slice(1));
  const result: boolean[] = [];

  for (let i = 0; i < length; i++) {
    const byteIndex = Math.floor(i / 8);
    const bitIndex = i % 8;
    result.push((bytes[byteIndex] & (1 << bitIndex)) !== 0);
  }

  return result;
}

// ============================================================================
// JSON Compression
// ============================================================================

/**
 * Options for JSON compression
 */
export interface JSONCompressOptions {
  /** Remove whitespace */
  minify?: boolean;
  /** Use short property names */
  shortenKeys?: boolean;
  /** Key mapping for shortening */
  keyMap?: Record<string, string>;
}

/**
 * Compress JSON by minifying and optionally shortening keys
 * @param obj - Object to compress
 * @param options - Compression options
 * @returns Compressed JSON string and key map
 */
export function compressJSON(
  obj: unknown,
  options: JSONCompressOptions = {}
): { json: string; keyMap?: Record<string, string> } {
  const { minify = true, shortenKeys = false, keyMap } = options;

  if (!shortenKeys) {
    return {
      json: minify ? JSON.stringify(obj) : JSON.stringify(obj, null, 2),
    };
  }

  // Generate or use provided key map
  const generatedKeyMap: Record<string, string> = keyMap || {};
  let keyIndex = 0;

  function generateShortKey(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    let n = keyIndex++;
    do {
      result = chars[n % 26] + result;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return result;
  }

  function shortenObject(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input.map(shortenObject);
    }
    if (input && typeof input === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        if (!generatedKeyMap[key] && !keyMap) {
          generatedKeyMap[key] = generateShortKey();
        }
        const shortKey = generatedKeyMap[key] || key;
        result[shortKey] = shortenObject(value);
      }
      return result;
    }
    return input;
  }

  const shortened = shortenObject(obj);
  return {
    json: minify
      ? JSON.stringify(shortened)
      : JSON.stringify(shortened, null, 2),
    keyMap: generatedKeyMap,
  };
}

/**
 * Decompress JSON with shortened keys
 * @param json - Compressed JSON string
 * @param keyMap - Key mapping (short -> original)
 * @returns Decompressed object
 */
export function decompressJSON<T = unknown>(
  json: string,
  keyMap: Record<string, string>
): T {
  const reverseMap: Record<string, string> = {};
  for (const [original, short] of Object.entries(keyMap)) {
    reverseMap[short] = original;
  }

  function expandObject(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input.map(expandObject);
    }
    if (input && typeof input === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        const originalKey = reverseMap[key] || key;
        result[originalKey] = expandObject(value);
      }
      return result;
    }
    return input;
  }

  const parsed = JSON.parse(json);
  return expandObject(parsed) as T;
}

// ============================================================================
// String Deduplication
// ============================================================================

/**
 * Deduplicate repeated strings in an array
 * @param strings - Array of strings with potential duplicates
 * @returns Deduplicated data with dictionary
 */
export function deduplicateStrings(strings: string[]): {
  indices: number[];
  dictionary: string[];
} {
  const dictionary: string[] = [];
  const stringToIndex = new Map<string, number>();
  const indices: number[] = [];

  for (const str of strings) {
    if (stringToIndex.has(str)) {
      indices.push(stringToIndex.get(str)!);
    } else {
      const index = dictionary.length;
      dictionary.push(str);
      stringToIndex.set(str, index);
      indices.push(index);
    }
  }

  return { indices, dictionary };
}

/**
 * Restore strings from deduplicated data
 * @param indices - Array of indices
 * @param dictionary - String dictionary
 * @returns Original array of strings
 */
export function restoreStrings(
  indices: number[],
  dictionary: string[]
): string[] {
  return indices.map(i => dictionary[i]);
}

// ============================================================================
// Huffman Coding (for text compression)
// ============================================================================

interface HuffmanNode {
  char?: string;
  freq: number;
  left?: HuffmanNode;
  right?: HuffmanNode;
}

/**
 * Build Huffman encoding table from text
 * @param text - Input text
 * @returns Encoding table (char -> binary string)
 */
export function buildHuffmanTable(text: string): Map<string, string> {
  if (!text) return new Map();

  // Count frequencies
  const freq = new Map<string, number>();
  for (const char of text) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }

  // Build priority queue
  const nodes: HuffmanNode[] = Array.from(freq.entries()).map(([char, f]) => ({
    char,
    freq: f,
  }));

  // Build Huffman tree
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq);
    const left = nodes.shift()!;
    const right = nodes.shift()!;
    nodes.push({
      freq: left.freq + right.freq,
      left,
      right,
    });
  }

  // Generate codes
  const table = new Map<string, string>();

  function traverse(node: HuffmanNode, code: string): void {
    if (node.char !== undefined) {
      table.set(node.char, code || '0');
      return;
    }
    if (node.left) traverse(node.left, code + '0');
    if (node.right) traverse(node.right, code + '1');
  }

  if (nodes.length > 0) {
    traverse(nodes[0], '');
  }

  return table;
}

/**
 * Encode text using Huffman table
 * @param text - Text to encode
 * @param table - Huffman encoding table
 * @returns Binary string
 */
export function huffmanEncode(
  text: string,
  table: Map<string, string>
): string {
  return text
    .split('')
    .map(char => table.get(char) || '')
    .join('');
}

/**
 * Decode Huffman encoded binary string
 * @param binary - Binary string
 * @param table - Huffman encoding table (char -> code)
 * @returns Decoded text
 */
export function huffmanDecode(
  binary: string,
  table: Map<string, string>
): string {
  // Reverse the table
  const reverseTable = new Map<string, string>();
  for (const [char, code] of table) {
    reverseTable.set(code, char);
  }

  let result = '';
  let current = '';

  for (const bit of binary) {
    current += bit;
    if (reverseTable.has(current)) {
      result += reverseTable.get(current);
      current = '';
    }
  }

  return result;
}

/**
 * Get estimated compression ratio for Huffman encoding
 * @param text - Input text
 * @returns Estimated compression ratio
 */
export function estimateHuffmanRatio(text: string): number {
  if (!text) return 1;

  const table = buildHuffmanTable(text);
  const originalBits = text.length * 8;
  const encodedBits = text
    .split('')
    .reduce((sum, char) => sum + (table.get(char)?.length || 0), 0);

  return encodedBits / originalBits;
}

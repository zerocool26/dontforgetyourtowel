/**
 * Text Diff Utilities
 * @module utils/diff
 * @description Text comparison, diff generation, and patch application utilities
 * for comparing strings, arrays, and detecting changes.
 */

/**
 * Diff operation types
 */
export type DiffOp = 'equal' | 'insert' | 'delete' | 'replace';

/**
 * Single diff entry
 */
export interface DiffEntry {
  op: DiffOp;
  value: string;
  oldValue?: string; // For replace operations
  index: number;
  count: number;
}

/**
 * Diff result
 */
export interface DiffResult {
  operations: DiffEntry[];
  additions: number;
  deletions: number;
  changes: number;
  similarity: number;
}

/**
 * Line diff entry
 */
export interface LineDiffEntry {
  lineNumber: number;
  oldLineNumber?: number;
  newLineNumber?: number;
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  oldContent?: string;
}

/**
 * Unified diff hunk
 */
export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: LineDiffEntry[];
}

// ============================================================================
// Character-level Diff
// ============================================================================

/**
 * Compute the Longest Common Subsequence length matrix
 */
function lcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const matrix: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  return matrix;
}

/**
 * Backtrack through LCS matrix to find diff
 */
function backtrackDiff(
  matrix: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number
): Array<{ type: 'equal' | 'delete' | 'insert'; value: string }> {
  if (i === 0 && j === 0) {
    return [];
  }

  if (i === 0) {
    return [
      ...backtrackDiff(matrix, a, b, i, j - 1),
      { type: 'insert', value: b[j - 1] },
    ];
  }

  if (j === 0) {
    return [
      ...backtrackDiff(matrix, a, b, i - 1, j),
      { type: 'delete', value: a[i - 1] },
    ];
  }

  if (a[i - 1] === b[j - 1]) {
    return [
      ...backtrackDiff(matrix, a, b, i - 1, j - 1),
      { type: 'equal', value: a[i - 1] },
    ];
  }

  if (matrix[i - 1][j] >= matrix[i][j - 1]) {
    return [
      ...backtrackDiff(matrix, a, b, i - 1, j),
      { type: 'delete', value: a[i - 1] },
    ];
  }

  return [
    ...backtrackDiff(matrix, a, b, i, j - 1),
    { type: 'insert', value: b[j - 1] },
  ];
}

/**
 * Compute character-level diff between two strings
 * @param oldStr - Original string
 * @param newStr - New string
 * @returns Diff result with operations
 */
export function diffChars(oldStr: string, newStr: string): DiffResult {
  const oldChars = oldStr.split('');
  const newChars = newStr.split('');

  const matrix = lcsMatrix(oldChars, newChars);
  const rawDiff = backtrackDiff(
    matrix,
    oldChars,
    newChars,
    oldChars.length,
    newChars.length
  );

  // Consolidate consecutive operations
  const operations: DiffEntry[] = [];
  let additions = 0;
  let deletions = 0;
  let index = 0;

  let currentOp: DiffEntry | null = null;

  for (const entry of rawDiff) {
    const op = entry.type as DiffOp;

    if (currentOp && currentOp.op === op) {
      currentOp.value += entry.value;
      currentOp.count++;
    } else {
      if (currentOp) {
        operations.push(currentOp);
        index += currentOp.op === 'delete' ? 0 : currentOp.count;
      }
      currentOp = {
        op,
        value: entry.value,
        index,
        count: 1,
      };
    }

    if (op === 'insert') additions++;
    if (op === 'delete') deletions++;
  }

  if (currentOp) {
    operations.push(currentOp);
  }

  const maxLen = Math.max(oldStr.length, newStr.length);
  const similarity =
    maxLen === 0 ? 100 : ((maxLen - additions - deletions) / maxLen) * 100;

  return {
    operations,
    additions,
    deletions,
    changes: additions + deletions,
    similarity: Math.max(0, Math.round(similarity)),
  };
}

/**
 * Compute word-level diff between two strings
 * @param oldStr - Original string
 * @param newStr - New string
 * @returns Diff result with word-level operations
 */
export function diffWords(oldStr: string, newStr: string): DiffResult {
  const oldWords = oldStr.split(/(\s+)/).filter(Boolean);
  const newWords = newStr.split(/(\s+)/).filter(Boolean);

  const matrix = lcsMatrix(oldWords, newWords);
  const rawDiff = backtrackDiff(
    matrix,
    oldWords,
    newWords,
    oldWords.length,
    newWords.length
  );

  const operations: DiffEntry[] = [];
  let additions = 0;
  let deletions = 0;
  let index = 0;

  let currentOp: DiffEntry | null = null;

  for (const entry of rawDiff) {
    const op = entry.type as DiffOp;

    if (currentOp && currentOp.op === op) {
      currentOp.value += entry.value;
      currentOp.count++;
    } else {
      if (currentOp) {
        operations.push(currentOp);
        index += currentOp.op === 'delete' ? 0 : currentOp.count;
      }
      currentOp = {
        op,
        value: entry.value,
        index,
        count: 1,
      };
    }

    if (op === 'insert') additions++;
    if (op === 'delete') deletions++;
  }

  if (currentOp) {
    operations.push(currentOp);
  }

  const maxLen = Math.max(oldWords.length, newWords.length);
  const similarity =
    maxLen === 0 ? 100 : ((maxLen - additions - deletions) / maxLen) * 100;

  return {
    operations,
    additions,
    deletions,
    changes: additions + deletions,
    similarity: Math.max(0, Math.round(similarity)),
  };
}

// ============================================================================
// Line-level Diff
// ============================================================================

/**
 * Compute line-level diff between two strings
 * @param oldText - Original text
 * @param newText - New text
 * @returns Array of line diff entries
 */
export function diffLines(oldText: string, newText: string): LineDiffEntry[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const matrix = lcsMatrix(oldLines, newLines);
  const rawDiff = backtrackDiff(
    matrix,
    oldLines,
    newLines,
    oldLines.length,
    newLines.length
  );

  const result: LineDiffEntry[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  for (const entry of rawDiff) {
    if (entry.type === 'equal') {
      result.push({
        lineNumber: newLineNum,
        oldLineNumber: oldLineNum,
        newLineNumber: newLineNum,
        type: 'unchanged',
        content: entry.value,
      });
      oldLineNum++;
      newLineNum++;
    } else if (entry.type === 'delete') {
      result.push({
        lineNumber: oldLineNum,
        oldLineNumber: oldLineNum,
        type: 'removed',
        content: entry.value,
      });
      oldLineNum++;
    } else if (entry.type === 'insert') {
      result.push({
        lineNumber: newLineNum,
        newLineNumber: newLineNum,
        type: 'added',
        content: entry.value,
      });
      newLineNum++;
    }
  }

  return result;
}

/**
 * Generate unified diff format
 * @param oldText - Original text
 * @param newText - New text
 * @param oldName - Original file name
 * @param newName - New file name
 * @param contextLines - Number of context lines (default: 3)
 * @returns Unified diff string
 */
export function unifiedDiff(
  oldText: string,
  newText: string,
  oldName = 'a',
  newName = 'b',
  contextLines = 3
): string {
  const lineDiff = diffLines(oldText, newText);

  // Group changes into hunks
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let unchangedBuffer: LineDiffEntry[] = [];

  for (let i = 0; i < lineDiff.length; i++) {
    const entry = lineDiff[i];

    if (entry.type === 'unchanged') {
      if (currentHunk) {
        unchangedBuffer.push(entry);
        if (unchangedBuffer.length > contextLines * 2) {
          // End current hunk
          for (let j = 0; j < contextLines; j++) {
            currentHunk.lines.push(unchangedBuffer[j]);
          }
          hunks.push(currentHunk);
          currentHunk = null;
          unchangedBuffer = unchangedBuffer.slice(-contextLines);
        }
      } else {
        unchangedBuffer.push(entry);
        if (unchangedBuffer.length > contextLines) {
          unchangedBuffer.shift();
        }
      }
    } else {
      if (!currentHunk) {
        currentHunk = {
          oldStart: entry.oldLineNumber || entry.lineNumber,
          oldCount: 0,
          newStart: entry.newLineNumber || entry.lineNumber,
          newCount: 0,
          lines: [...unchangedBuffer],
        };
        unchangedBuffer = [];
      } else {
        currentHunk.lines.push(...unchangedBuffer);
        unchangedBuffer = [];
      }
      currentHunk.lines.push(entry);
    }
  }

  // Finalize last hunk
  if (currentHunk) {
    for (const entry of unchangedBuffer.slice(0, contextLines)) {
      currentHunk.lines.push(entry);
    }
    hunks.push(currentHunk);
  }

  // Generate output
  const lines: string[] = [];
  lines.push(`--- ${oldName}`);
  lines.push(`+++ ${newName}`);

  for (const hunk of hunks) {
    let oldCount = 0;
    let newCount = 0;

    for (const line of hunk.lines) {
      if (line.type === 'removed' || line.type === 'unchanged') oldCount++;
      if (line.type === 'added' || line.type === 'unchanged') newCount++;
    }

    lines.push(
      `@@ -${hunk.oldStart},${oldCount} +${hunk.newStart},${newCount} @@`
    );

    for (const line of hunk.lines) {
      if (line.type === 'unchanged') {
        lines.push(` ${line.content}`);
      } else if (line.type === 'removed') {
        lines.push(`-${line.content}`);
      } else if (line.type === 'added') {
        lines.push(`+${line.content}`);
      }
    }
  }

  return lines.join('\n');
}

// ============================================================================
// Array Diff
// ============================================================================

/**
 * Array diff entry
 */
export interface ArrayDiffEntry<T> {
  type: 'added' | 'removed' | 'unchanged';
  value: T;
  index: number;
  oldIndex?: number;
  newIndex?: number;
}

/**
 * Compute diff between two arrays
 * @param oldArr - Original array
 * @param newArr - New array
 * @param compareFn - Optional comparison function
 * @returns Array of diff entries
 */
export function diffArrays<T>(
  oldArr: T[],
  newArr: T[],
  compareFn?: (a: T, b: T) => boolean
): ArrayDiffEntry<T>[] {
  const compare = compareFn || ((a, b) => a === b);

  // Build mapping of matching elements
  const matchMatrix: boolean[][] = [];
  for (let i = 0; i < oldArr.length; i++) {
    matchMatrix[i] = [];
    for (let j = 0; j < newArr.length; j++) {
      matchMatrix[i][j] = compare(oldArr[i], newArr[j]);
    }
  }

  // Custom LCS that uses match matrix
  const m = oldArr.length;
  const n = newArr.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (matchMatrix[i - 1][j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  let i = m;
  let j = n;

  const entries: ArrayDiffEntry<T>[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && matchMatrix[i - 1][j - 1]) {
      entries.unshift({
        type: 'unchanged',
        value: oldArr[i - 1],
        index: i - 1,
        oldIndex: i - 1,
        newIndex: j - 1,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      entries.unshift({
        type: 'added',
        value: newArr[j - 1],
        index: j - 1,
        newIndex: j - 1,
      });
      j--;
    } else {
      entries.unshift({
        type: 'removed',
        value: oldArr[i - 1],
        index: i - 1,
        oldIndex: i - 1,
      });
      i--;
    }
  }

  return entries;
}

// ============================================================================
// Patch Application
// ============================================================================

/**
 * Patch operation
 */
export interface PatchOp {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
  oldValue?: unknown;
}

/**
 * Apply text patches to original string
 * @param original - Original string
 * @param diff - Diff result from diffChars or diffWords
 * @returns Patched string
 */
export function applyTextPatch(original: string, diff: DiffResult): string {
  let result = '';

  for (const op of diff.operations) {
    if (op.op === 'equal' || op.op === 'insert') {
      result += op.value;
    }
  }

  return result;
}

/**
 * Generate JSON Patch (RFC 6902) from two objects
 * @param oldObj - Original object
 * @param newObj - New object
 * @param basePath - Base path (internal use)
 * @returns Array of patch operations
 */
export function generateJSONPatch(
  oldObj: unknown,
  newObj: unknown,
  basePath = ''
): PatchOp[] {
  const patches: PatchOp[] = [];

  // Handle null/undefined
  if (oldObj === null || oldObj === undefined) {
    if (newObj !== null && newObj !== undefined) {
      patches.push({ op: 'add', path: basePath || '/', value: newObj });
    }
    return patches;
  }

  if (newObj === null || newObj === undefined) {
    patches.push({ op: 'remove', path: basePath || '/' });
    return patches;
  }

  // Handle primitives
  if (typeof oldObj !== 'object' || typeof newObj !== 'object') {
    if (oldObj !== newObj) {
      patches.push({
        op: 'replace',
        path: basePath || '/',
        value: newObj,
        oldValue: oldObj,
      });
    }
    return patches;
  }

  // Handle arrays
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    // Simple approach: replace if different
    if (JSON.stringify(oldObj) !== JSON.stringify(newObj)) {
      patches.push({
        op: 'replace',
        path: basePath || '/',
        value: newObj,
        oldValue: oldObj,
      });
    }
    return patches;
  }

  // Handle objects
  const oldKeys = new Set(Object.keys(oldObj as object));
  const newKeys = new Set(Object.keys(newObj as object));

  // Removed keys
  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      patches.push({
        op: 'remove',
        path: `${basePath}/${key}`,
      });
    }
  }

  // Added or modified keys
  for (const key of newKeys) {
    const path = `${basePath}/${key}`;
    const oldValue = (oldObj as Record<string, unknown>)[key];
    const newValue = (newObj as Record<string, unknown>)[key];

    if (!oldKeys.has(key)) {
      patches.push({ op: 'add', path, value: newValue });
    } else {
      patches.push(...generateJSONPatch(oldValue, newValue, path));
    }
  }

  return patches;
}

/**
 * Apply JSON Patch operations to an object
 * @param obj - Original object
 * @param patches - Array of patch operations
 * @returns Patched object (new reference)
 */
export function applyJSONPatch<T>(obj: T, patches: PatchOp[]): T {
  let result = JSON.parse(JSON.stringify(obj));

  for (const patch of patches) {
    const pathParts = patch.path.split('/').filter(Boolean);

    if (pathParts.length === 0) {
      if (patch.op === 'replace' || patch.op === 'add') {
        result = patch.value as T;
      }
      continue;
    }

    let target = result;
    for (let i = 0; i < pathParts.length - 1; i++) {
      target = target[pathParts[i]];
    }

    const lastKey = pathParts[pathParts.length - 1];

    switch (patch.op) {
      case 'add':
      case 'replace':
        target[lastKey] = patch.value;
        break;
      case 'remove':
        if (Array.isArray(target)) {
          target.splice(parseInt(lastKey, 10), 1);
        } else {
          delete target[lastKey];
        }
        break;
    }
  }

  return result;
}

// ============================================================================
// Semantic Diff
// ============================================================================

/**
 * Semantic diff options
 */
export interface SemanticDiffOptions {
  /** Ignore case differences */
  ignoreCase?: boolean;
  /** Ignore whitespace differences */
  ignoreWhitespace?: boolean;
  /** Ignore empty lines */
  ignoreEmptyLines?: boolean;
  /** Custom normalization function */
  normalize?: (text: string) => string;
}

/**
 * Compute semantically aware diff
 * @param oldText - Original text
 * @param newText - New text
 * @param options - Diff options
 * @returns Line diff entries
 */
export function semanticDiff(
  oldText: string,
  newText: string,
  options: SemanticDiffOptions = {}
): LineDiffEntry[] {
  const {
    ignoreCase = false,
    ignoreWhitespace = false,
    ignoreEmptyLines = false,
    normalize,
  } = options;

  function normalizeText(text: string): string {
    let result = text;
    if (normalize) {
      result = normalize(result);
    }
    if (ignoreCase) {
      result = result.toLowerCase();
    }
    if (ignoreWhitespace) {
      result = result.replace(/\s+/g, ' ').trim();
    }
    return result;
  }

  let oldLines = oldText.split('\n');
  let newLines = newText.split('\n');

  if (ignoreEmptyLines) {
    oldLines = oldLines.filter(line => line.trim());
    newLines = newLines.filter(line => line.trim());
  }

  const normalizedOld = oldLines.map(normalizeText);
  const normalizedNew = newLines.map(normalizeText);

  // Perform diff on normalized lines
  const matrix = lcsMatrix(normalizedOld, normalizedNew);
  const rawDiff = backtrackDiff(
    matrix,
    normalizedOld,
    normalizedNew,
    normalizedOld.length,
    normalizedNew.length
  );

  const result: LineDiffEntry[] = [];
  let oldIdx = 0;
  let newIdx = 0;

  for (const entry of rawDiff) {
    if (entry.type === 'equal') {
      result.push({
        lineNumber: newIdx + 1,
        oldLineNumber: oldIdx + 1,
        newLineNumber: newIdx + 1,
        type: 'unchanged',
        content: newLines[newIdx],
      });
      oldIdx++;
      newIdx++;
    } else if (entry.type === 'delete') {
      result.push({
        lineNumber: oldIdx + 1,
        oldLineNumber: oldIdx + 1,
        type: 'removed',
        content: oldLines[oldIdx],
      });
      oldIdx++;
    } else if (entry.type === 'insert') {
      result.push({
        lineNumber: newIdx + 1,
        newLineNumber: newIdx + 1,
        type: 'added',
        content: newLines[newIdx],
      });
      newIdx++;
    }
  }

  return result;
}

// ============================================================================
// Diff Statistics
// ============================================================================

/**
 * Calculate diff statistics
 * @param diff - Line diff entries
 * @returns Statistics object
 */
export function diffStats(diff: LineDiffEntry[]): {
  added: number;
  removed: number;
  unchanged: number;
  modified: number;
  total: number;
  changePercent: number;
} {
  const stats = {
    added: 0,
    removed: 0,
    unchanged: 0,
    modified: 0,
    total: diff.length,
    changePercent: 0,
  };

  for (const entry of diff) {
    switch (entry.type) {
      case 'added':
        stats.added++;
        break;
      case 'removed':
        stats.removed++;
        break;
      case 'unchanged':
        stats.unchanged++;
        break;
      case 'modified':
        stats.modified++;
        break;
    }
  }

  const changed = stats.added + stats.removed + stats.modified;
  stats.changePercent =
    stats.total > 0 ? Math.round((changed / stats.total) * 100) : 0;

  return stats;
}

/**
 * Check if two texts are equal (after normalization)
 * @param a - First text
 * @param b - Second text
 * @param options - Comparison options
 * @returns True if texts are semantically equal
 */
export function textsAreEqual(
  a: string,
  b: string,
  options: SemanticDiffOptions = {}
): boolean {
  const diff = semanticDiff(a, b, options);
  return diff.every(entry => entry.type === 'unchanged');
}

/**
 * Get changed lines only
 * @param diff - Line diff entries
 * @returns Only changed lines (added, removed, modified)
 */
export function getChangedLines(diff: LineDiffEntry[]): LineDiffEntry[] {
  return diff.filter(entry => entry.type !== 'unchanged');
}

/**
 * Highlight inline changes within a line
 * @param oldLine - Original line
 * @param newLine - New line
 * @param markers - Highlight markers [start, end]
 * @returns Object with highlighted old and new lines
 */
export function highlightInlineChanges(
  oldLine: string,
  newLine: string,
  markers: [string, string] = ['<mark>', '</mark>']
): { oldHighlighted: string; newHighlighted: string } {
  const charDiff = diffChars(oldLine, newLine);

  let oldHighlighted = '';
  let newHighlighted = '';

  for (const op of charDiff.operations) {
    if (op.op === 'equal') {
      oldHighlighted += op.value;
      newHighlighted += op.value;
    } else if (op.op === 'delete') {
      oldHighlighted += `${markers[0]}${op.value}${markers[1]}`;
    } else if (op.op === 'insert') {
      newHighlighted += `${markers[0]}${op.value}${markers[1]}`;
    }
  }

  return { oldHighlighted, newHighlighted };
}

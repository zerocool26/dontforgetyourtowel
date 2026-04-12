/**
 * Reading Time Utility
 * Calculates estimated reading time for text content
 */

export interface ReadingTimeResult {
  text: string;
  minutes: number;
  time: number;
  words: number;
}

export interface ReadingTimeOptions {
  wordsPerMinute?: number;
  includeSeconds?: boolean;
}

/**
 * Calculate reading time for given text
 * @param text - The text content to analyze
 * @param options - Configuration options
 * @returns Reading time information
 */
export function calculateReadingTime(
  text: string,
  options: ReadingTimeOptions = {}
): ReadingTimeResult {
  const {
    wordsPerMinute = 200, // Average adult reading speed
    includeSeconds = false,
  } = options;

  // Remove HTML tags if present
  const plainText = text.replace(/<[^>]*>/g, '');

  // Count words (split by whitespace and filter empty strings)
  const words = plainText
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;

  // Calculate reading time in minutes
  const minutes = words / wordsPerMinute;
  const time = Math.ceil(minutes);

  // Format output text
  let formattedText: string;
  if (includeSeconds && minutes < 1) {
    const seconds = Math.ceil(minutes * 60);
    formattedText = `${seconds} sec read`;
  } else if (time === 1) {
    formattedText = '1 min read';
  } else {
    formattedText = `${time} min read`;
  }

  return {
    text: formattedText,
    minutes: time,
    time: Math.round(minutes * 60), // Total seconds
    words,
  };
}

/**
 * Get reading time from Markdown content
 * Handles frontmatter and code blocks appropriately
 */
export function getMarkdownReadingTime(
  markdown: string,
  options: ReadingTimeOptions = {}
): ReadingTimeResult {
  let content = markdown;

  // Remove frontmatter
  content = content.replace(/^---[\s\S]*?---/, '');

  // Remove code blocks (they read faster)
  content = content.replace(/```[\s\S]*?```/g, '');
  content = content.replace(/`[^`]+`/g, '');

  // Remove URLs
  content = content.replace(/https?:\/\/[^\s]+/g, '');

  // Remove Markdown syntax
  content = content.replace(/[#*_~`[\]()]/g, '');

  return calculateReadingTime(content, options);
}

/**
 * Format reading time for display
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) {
    return '< 1 min read';
  } else if (minutes === 1) {
    return '1 min read';
  } else {
    return `${minutes} min read`;
  }
}

/**
 * Get reading time category
 */
export function getReadingTimeCategory(
  minutes: number
): 'quick' | 'medium' | 'long' {
  if (minutes <= 3) return 'quick';
  if (minutes <= 10) return 'medium';
  return 'long';
}

/**
 * Get reading time compact indicator
 */
export function getReadingTimeEmoji(minutes: number): string {
  if (minutes <= 3) return 'Quick';
  if (minutes <= 10) return 'Medium';
  return 'Long';
}

/**
 * Share API Utilities
 * @module utils/share
 * @description Web Share API wrapper with fallbacks for sharing
 * content across different platforms and devices.
 */

import { isBrowser } from './dom';
import { copyText } from './clipboard';

/**
 * Share data interface
 */
export interface ShareData {
  /** Title of the content */
  title?: string;
  /** Description or text */
  text?: string;
  /** URL to share */
  url?: string;
  /** Files to share */
  files?: File[];
}

/**
 * Share options
 */
export interface ShareOptions {
  /** Fallback function when native share is unavailable */
  fallback?: (data: ShareData) => void | Promise<void>;
  /** Show copy-to-clipboard fallback */
  copyFallback?: boolean;
  /** Custom copy success message */
  copySuccessMessage?: string;
  /** Callback on successful share */
  onSuccess?: () => void;
  /** Callback on share error */
  onError?: (error: Error) => void;
  /** Callback on share cancel (user dismissed) */
  onCancel?: () => void;
}

/**
 * Social platform configurations
 */
export const socialPlatforms = {
  twitter: {
    name: 'Twitter/X',
    shareUrl: (data: ShareData) => {
      const params = new URLSearchParams();
      if (data.text) params.set('text', data.text);
      if (data.url) params.set('url', data.url);
      return `https://twitter.com/intent/tweet?${params}`;
    },
  },
  facebook: {
    name: 'Facebook',
    shareUrl: (data: ShareData) => {
      const params = new URLSearchParams();
      if (data.url) params.set('u', data.url);
      if (data.text) params.set('quote', data.text);
      return `https://www.facebook.com/sharer/sharer.php?${params}`;
    },
  },
  linkedin: {
    name: 'LinkedIn',
    shareUrl: (data: ShareData) => {
      const params = new URLSearchParams();
      if (data.url) params.set('url', data.url);
      if (data.title) params.set('title', data.title);
      if (data.text) params.set('summary', data.text);
      return `https://www.linkedin.com/shareArticle?mini=true&${params}`;
    },
  },
  reddit: {
    name: 'Reddit',
    shareUrl: (data: ShareData) => {
      const params = new URLSearchParams();
      if (data.url) params.set('url', data.url);
      if (data.title) params.set('title', data.title);
      return `https://reddit.com/submit?${params}`;
    },
  },
  whatsapp: {
    name: 'WhatsApp',
    shareUrl: (data: ShareData) => {
      const text = [data.title, data.text, data.url]
        .filter(Boolean)
        .join(' - ');
      return `https://wa.me/?text=${encodeURIComponent(text)}`;
    },
  },
  telegram: {
    name: 'Telegram',
    shareUrl: (data: ShareData) => {
      const params = new URLSearchParams();
      if (data.url) params.set('url', data.url);
      if (data.text) params.set('text', data.text);
      return `https://t.me/share/url?${params}`;
    },
  },
  email: {
    name: 'Email',
    shareUrl: (data: ShareData) => {
      const params = new URLSearchParams();
      if (data.title) params.set('subject', data.title);
      const body = [data.text, data.url].filter(Boolean).join('\n\n');
      if (body) params.set('body', body);
      return `mailto:?${params}`;
    },
  },
  pinterest: {
    name: 'Pinterest',
    shareUrl: (data: ShareData) => {
      const params = new URLSearchParams();
      if (data.url) params.set('url', data.url);
      if (data.text) params.set('description', data.text);
      return `https://pinterest.com/pin/create/button/?${params}`;
    },
  },
  hackernews: {
    name: 'Hacker News',
    shareUrl: (data: ShareData) => {
      const params = new URLSearchParams();
      if (data.url) params.set('u', data.url);
      if (data.title) params.set('t', data.title);
      return `https://news.ycombinator.com/submitlink?${params}`;
    },
  },
} as const;

export type SocialPlatform = keyof typeof socialPlatforms;

/**
 * Check if Web Share API is supported
 */
export function isShareSupported(): boolean {
  return isBrowser() && typeof navigator.share === 'function';
}

/**
 * Check if file sharing is supported
 */
export function isFileShareSupported(): boolean {
  return isBrowser() && typeof navigator.canShare === 'function';
}

/**
 * Check if specific data can be shared
 * @param data - Share data to check
 */
export function canShare(data: ShareData): boolean {
  if (!isBrowser()) return false;

  if ('canShare' in navigator) {
    try {
      return navigator.canShare(data);
    } catch {
      return false;
    }
  }

  // Fallback check
  return isShareSupported();
}

/**
 * Share content using the Web Share API or fallback
 * @param data - Content to share
 * @param options - Share options
 * @example
 * await share({
 *   title: 'Check this out!',
 *   text: 'Amazing content',
 *   url: 'https://example.com',
 * });
 */
export async function share(
  data: ShareData,
  options: ShareOptions = {}
): Promise<boolean> {
  const {
    fallback,
    copyFallback = true,
    copySuccessMessage = 'Link copied to clipboard!',
    onSuccess,
    onError,
    onCancel,
  } = options;

  // Try native share
  if (isShareSupported()) {
    try {
      // Check if we can share files
      let shareData = data;
      if (data.files?.length && !canShare(data)) {
        // Remove files and try again
        const { files: _unusedFiles, ...dataWithoutFiles } = data;
        void _unusedFiles; // Intentionally unused - we want to exclude files
        shareData = dataWithoutFiles;
      }
      await navigator.share(shareData);

      onSuccess?.();
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          onCancel?.();
          return false;
        }
        if (error.name !== 'NotAllowedError') {
          // Fall through to fallback
        }
      }
    }
  }

  // Use custom fallback
  if (fallback) {
    try {
      await fallback(data);
      onSuccess?.();
      return true;
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Share failed'));
      return false;
    }
  }

  // Copy to clipboard fallback
  if (copyFallback && data.url) {
    const success = await copyText(data.url);
    if (success) {
      // Could show a toast notification here
      console.log(copySuccessMessage);
      onSuccess?.();
      return true;
    }
  }

  onError?.(new Error('Share not supported'));
  return false;
}

/**
 * Share to a specific social platform
 * @param platform - Target platform
 * @param data - Content to share
 * @param options - Window options
 */
export function shareToSocial(
  platform: SocialPlatform,
  data: ShareData,
  options: {
    /** Open in new window vs same window */
    newWindow?: boolean;
    /** Window width */
    width?: number;
    /** Window height */
    height?: number;
  } = {}
): void {
  if (!isBrowser()) return;

  const { newWindow = true, width = 600, height = 400 } = options;

  const platformConfig = socialPlatforms[platform];
  const url = platformConfig.shareUrl(data);

  if (newWindow) {
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    window.open(
      url,
      'share',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0`
    );
  } else {
    window.location.href = url;
  }
}

/**
 * Get share URL for a social platform without opening it
 * @param platform - Target platform
 * @param data - Content to share
 */
export function getSocialShareUrl(
  platform: SocialPlatform,
  data: ShareData
): string {
  return socialPlatforms[platform].shareUrl(data);
}

/**
 * Create a share handler for an element
 * @param element - Element to make shareable
 * @param data - Data or function returning data to share
 * @param options - Share options
 */
export function createShareHandler(
  element: HTMLElement,
  data: ShareData | (() => ShareData),
  options: ShareOptions = {}
): () => void {
  if (!isBrowser()) return () => {};

  const handler = async (e: Event) => {
    e.preventDefault();
    const shareData = typeof data === 'function' ? data() : data;
    await share(shareData, options);
  };

  element.addEventListener('click', handler);

  return () => {
    element.removeEventListener('click', handler);
  };
}

/**
 * Share the current page
 * @param options - Share options
 */
export async function shareCurrentPage(
  options: ShareOptions & {
    /** Include page description from meta tags */
    includeDescription?: boolean;
  } = {}
): Promise<boolean> {
  if (!isBrowser()) return false;

  const { includeDescription = true, ...shareOptions } = options;

  const data: ShareData = {
    title: document.title,
    url: window.location.href,
  };

  if (includeDescription) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      data.text = metaDesc.getAttribute('content') || undefined;
    }
  }

  return share(data, shareOptions);
}

/**
 * Share an image
 * @param imageSource - Image URL, Blob, or File
 * @param options - Share options with metadata
 */
export async function shareImage(
  imageSource: string | Blob | File,
  options: ShareOptions & {
    /** Filename for the image */
    filename?: string;
    /** Image title */
    title?: string;
    /** Image description */
    text?: string;
  } = {}
): Promise<boolean> {
  if (!isBrowser()) return false;

  const { filename = 'image.png', title, text, ...shareOptions } = options;

  let file: File;

  if (typeof imageSource === 'string') {
    // Fetch the image and convert to File
    try {
      const response = await fetch(imageSource);
      const blob = await response.blob();
      file = new File([blob], filename, { type: blob.type });
    } catch {
      // Fallback to sharing the URL
      return share({ url: imageSource, title, text }, shareOptions);
    }
  } else if (imageSource instanceof Blob && !(imageSource instanceof File)) {
    file = new File([imageSource], filename, { type: imageSource.type });
  } else {
    file = imageSource;
  }

  const data: ShareData = {
    files: [file],
    title,
    text,
  };

  // Check if file sharing is supported
  if (!canShare(data)) {
    // Fallback to URL sharing if we have one
    if (typeof imageSource === 'string') {
      return share({ url: imageSource, title, text }, shareOptions);
    }
    return false;
  }

  return share(data, shareOptions);
}

/**
 * Create share buttons for multiple platforms
 * @param container - Container element
 * @param data - Share data
 * @param platforms - Platforms to include
 */
export function createShareButtons(
  container: HTMLElement,
  data: ShareData | (() => ShareData),
  platforms: SocialPlatform[] = ['twitter', 'facebook', 'linkedin', 'email']
): () => void {
  if (!isBrowser()) return () => {};

  const cleanups: Array<() => void> = [];

  for (const platform of platforms) {
    const config = socialPlatforms[platform];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `share-button share-button-${platform}`;
    button.setAttribute('aria-label', `Share on ${config.name}`);
    button.textContent = config.name;

    const handler = () => {
      const shareData = typeof data === 'function' ? data() : data;
      shareToSocial(platform, shareData);
    };

    button.addEventListener('click', handler);
    cleanups.push(() => button.removeEventListener('click', handler));

    container.appendChild(button);
  }

  return () => {
    cleanups.forEach(fn => fn());
    container.replaceChildren();
  };
}

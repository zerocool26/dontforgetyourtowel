/**
 * Audio/Video Media Utilities
 * @module utils/av
 * @description Web Audio API wrapper, media recording, playback helpers,
 * and audio visualization utilities.
 */

import { isBrowser } from './dom';

// ============================================================================
// Audio Context Management
// ============================================================================

let audioContext: AudioContext | null = null;

/**
 * Get or create shared AudioContext
 */
export function getAudioContext(): AudioContext {
  if (!isBrowser()) {
    throw new Error('AudioContext is only available in browser environment');
  }

  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
  }

  // Resume if suspended (required after user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

/**
 * Close the shared audio context
 */
export function closeAudioContext(): Promise<void> {
  if (audioContext) {
    const ctx = audioContext;
    audioContext = null;
    return ctx.close();
  }
  return Promise.resolve();
}

// ============================================================================
// Sound Playback
// ============================================================================

/**
 * Sound options
 */
export interface SoundOptions {
  /** Volume (0-1) */
  volume?: number;
  /** Playback rate */
  playbackRate?: number;
  /** Loop sound */
  loop?: boolean;
  /** Start time in seconds */
  startTime?: number;
  /** Duration in seconds */
  duration?: number;
}

/**
 * Sound instance
 */
export interface Sound {
  /** Play the sound */
  play(): Promise<void>;
  /** Stop the sound */
  stop(): void;
  /** Pause the sound */
  pause(): void;
  /** Resume the sound */
  resume(): void;
  /** Set volume (0-1) */
  setVolume(volume: number): void;
  /** Set playback rate */
  setPlaybackRate(rate: number): void;
  /** Check if playing */
  isPlaying(): boolean;
  /** Get current time */
  getCurrentTime(): number;
  /** Set current time */
  setCurrentTime(time: number): void;
  /** Get duration */
  getDuration(): number;
  /** Add event listener */
  on(event: 'ended' | 'error', callback: () => void): void;
  /** Remove event listener */
  off(event: 'ended' | 'error', callback: () => void): void;
}

/**
 * Load and play a sound
 * @param src - Audio source URL or AudioBuffer
 * @param options - Sound options
 * @returns Sound instance
 * @example
 * const sound = await createSound('/audio/click.mp3');
 * await sound.play();
 */
export async function createSound(
  src: string | AudioBuffer,
  options: SoundOptions = {}
): Promise<Sound> {
  const ctx = getAudioContext();
  let buffer: AudioBuffer;

  if (typeof src === 'string') {
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    buffer = await ctx.decodeAudioData(arrayBuffer);
  } else {
    buffer = src;
  }

  let source: AudioBufferSourceNode | null = null;
  let gainNode: GainNode | null = null;
  let startTime = 0;
  let pauseTime = 0;
  let playing = false;

  const listeners: { ended: Set<() => void>; error: Set<() => void> } = {
    ended: new Set(),
    error: new Set(),
  };

  const { volume = 1, playbackRate = 1, loop = false } = options;

  const createSourceNode = (): void => {
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = playbackRate;

    gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.onended = () => {
      if (playing && !loop) {
        playing = false;
        listeners.ended.forEach(cb => cb());
      }
    };
  };

  const sound: Sound = {
    async play(): Promise<void> {
      if (playing) return;

      createSourceNode();

      if (source) {
        const offset = pauseTime || options.startTime || 0;
        const duration = options.duration;

        if (duration !== undefined) {
          source.start(0, offset, duration);
        } else {
          source.start(0, offset);
        }

        startTime = ctx.currentTime - offset;
        playing = true;
      }
    },

    stop(): void {
      if (source) {
        source.stop();
        source.disconnect();
        source = null;
      }
      if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
      }
      playing = false;
      pauseTime = 0;
    },

    pause(): void {
      if (!playing || !source) return;

      pauseTime = ctx.currentTime - startTime;
      source.stop();
      source.disconnect();
      source = null;
      playing = false;
    },

    resume(): void {
      if (playing) return;
      void sound.play();
    },

    setVolume(vol: number): void {
      if (gainNode) {
        gainNode.gain.value = Math.max(0, Math.min(1, vol));
      }
    },

    setPlaybackRate(rate: number): void {
      if (source) {
        source.playbackRate.value = rate;
      }
    },

    isPlaying(): boolean {
      return playing;
    },

    getCurrentTime(): number {
      if (playing) {
        return ctx.currentTime - startTime;
      }
      return pauseTime;
    },

    setCurrentTime(time: number): void {
      const wasPlaying = playing;
      sound.stop();
      pauseTime = time;
      if (wasPlaying) {
        void sound.play();
      }
    },

    getDuration(): number {
      return buffer.duration;
    },

    on(event: 'ended' | 'error', callback: () => void): void {
      listeners[event].add(callback);
    },

    off(event: 'ended' | 'error', callback: () => void): void {
      listeners[event].delete(callback);
    },
  };

  return sound;
}

/**
 * Play a sound effect (fire and forget)
 * @param src - Audio source URL
 * @param volume - Volume (0-1)
 */
export async function playSound(src: string, volume = 1): Promise<void> {
  const sound = await createSound(src, { volume });
  await sound.play();
}

// ============================================================================
// Audio Recording
// ============================================================================

/**
 * Recording options
 */
export interface RecordingOptions {
  /** Audio MIME type */
  mimeType?: string;
  /** Audio bits per second */
  audioBitsPerSecond?: number;
  /** Time slice for ondataavailable (ms) */
  timeSlice?: number;
}

/**
 * Audio recorder instance
 */
export interface AudioRecorder {
  /** Start recording */
  start(): Promise<void>;
  /** Stop recording */
  stop(): Promise<Blob>;
  /** Pause recording */
  pause(): void;
  /** Resume recording */
  resume(): void;
  /** Check if recording */
  isRecording(): boolean;
  /** Get current recording duration in ms */
  getDuration(): number;
  /** Get recorded chunks */
  getChunks(): Blob[];
  /** Release resources */
  destroy(): void;
}

/**
 * Create an audio recorder
 * @param options - Recording options
 * @returns Audio recorder instance
 * @example
 * const recorder = await createAudioRecorder();
 * await recorder.start();
 * // ... record audio
 * const blob = await recorder.stop();
 */
export async function createAudioRecorder(
  options: RecordingOptions = {}
): Promise<AudioRecorder> {
  const {
    mimeType = 'audio/webm',
    audioBitsPerSecond = 128000,
    timeSlice,
  } = options;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    audioBitsPerSecond,
  });

  const chunks: Blob[] = [];
  let startTime = 0;
  let pausedDuration = 0;
  let pauseStart = 0;

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return {
    async start(): Promise<void> {
      chunks.length = 0;
      startTime = Date.now();
      pausedDuration = 0;

      if (timeSlice) {
        mediaRecorder.start(timeSlice);
      } else {
        mediaRecorder.start();
      }
    },

    stop(): Promise<Blob> {
      return new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };

        mediaRecorder.onerror = e => {
          reject(e);
        };

        mediaRecorder.stop();
      });
    },

    pause(): void {
      if (mediaRecorder.state === 'recording') {
        pauseStart = Date.now();
        mediaRecorder.pause();
      }
    },

    resume(): void {
      if (mediaRecorder.state === 'paused') {
        pausedDuration += Date.now() - pauseStart;
        mediaRecorder.resume();
      }
    },

    isRecording(): boolean {
      return mediaRecorder.state === 'recording';
    },

    getDuration(): number {
      if (mediaRecorder.state === 'inactive') {
        return 0;
      }
      const now = mediaRecorder.state === 'paused' ? pauseStart : Date.now();
      return now - startTime - pausedDuration;
    },

    getChunks(): Blob[] {
      return [...chunks];
    },

    destroy(): void {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      stream.getTracks().forEach(track => track.stop());
    },
  };
}

// ============================================================================
// Screen Recording
// ============================================================================

/**
 * Screen recording options
 */
export interface ScreenRecordingOptions extends RecordingOptions {
  /** Include audio */
  audio?: boolean;
  /** Video MIME type */
  videoMimeType?: string;
}

/**
 * Create a screen recorder
 * @param options - Recording options
 * @returns Screen recorder (same interface as audio recorder)
 */
export async function createScreenRecorder(
  options: ScreenRecordingOptions = {}
): Promise<AudioRecorder> {
  const {
    audio = false,
    videoMimeType = 'video/webm',
    audioBitsPerSecond = 128000,
    timeSlice,
  } = options;

  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio,
  });

  let stream = displayStream;

  // If audio is requested but not captured from display, get microphone
  if (audio && !displayStream.getAudioTracks().length) {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      stream = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
    } catch {
      // Continue without audio
    }
  }

  const mimeType = MediaRecorder.isTypeSupported(videoMimeType)
    ? videoMimeType
    : 'video/webm';

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    audioBitsPerSecond,
  });

  const chunks: Blob[] = [];
  let startTime = 0;
  let pausedDuration = 0;
  let pauseStart = 0;

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return {
    async start(): Promise<void> {
      chunks.length = 0;
      startTime = Date.now();
      pausedDuration = 0;

      if (timeSlice) {
        mediaRecorder.start(timeSlice);
      } else {
        mediaRecorder.start();
      }
    },

    stop(): Promise<Blob> {
      return new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };

        mediaRecorder.onerror = e => {
          reject(e);
        };

        mediaRecorder.stop();
      });
    },

    pause(): void {
      if (mediaRecorder.state === 'recording') {
        pauseStart = Date.now();
        mediaRecorder.pause();
      }
    },

    resume(): void {
      if (mediaRecorder.state === 'paused') {
        pausedDuration += Date.now() - pauseStart;
        mediaRecorder.resume();
      }
    },

    isRecording(): boolean {
      return mediaRecorder.state === 'recording';
    },

    getDuration(): number {
      if (mediaRecorder.state === 'inactive') {
        return 0;
      }
      const now = mediaRecorder.state === 'paused' ? pauseStart : Date.now();
      return now - startTime - pausedDuration;
    },

    getChunks(): Blob[] {
      return [...chunks];
    },

    destroy(): void {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      stream.getTracks().forEach(track => track.stop());
    },
  };
}

// ============================================================================
// Audio Visualization
// ============================================================================

/**
 * Waveform data
 */
export interface WaveformData {
  /** Amplitude values (0-1) */
  amplitudes: number[];
  /** Duration in seconds */
  duration: number;
  /** Sample rate */
  sampleRate: number;
}

/**
 * Extract waveform data from audio
 * @param source - Audio source (URL, Blob, or File)
 * @param samples - Number of samples to extract
 * @returns Waveform data
 */
export async function extractWaveform(
  source: string | Blob | File,
  samples = 100
): Promise<WaveformData> {
  const ctx = getAudioContext();

  let arrayBuffer: ArrayBuffer;
  if (typeof source === 'string') {
    const response = await fetch(source);
    arrayBuffer = await response.arrayBuffer();
  } else {
    arrayBuffer = await source.arrayBuffer();
  }

  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);

  const blockSize = Math.floor(channelData.length / samples);
  const amplitudes: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    const end = start + blockSize;

    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += Math.abs(channelData[j]);
    }

    const avg = sum / blockSize;
    amplitudes.push(avg);
  }

  // Normalize to 0-1
  const max = Math.max(...amplitudes);
  const normalized = max > 0 ? amplitudes.map(a => a / max) : amplitudes;

  return {
    amplitudes: normalized,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
  };
}

/**
 * Frequency analyzer options
 */
export interface AnalyzerOptions {
  /** FFT size (power of 2) */
  fftSize?: number;
  /** Smoothing time constant (0-1) */
  smoothingTimeConstant?: number;
  /** Min decibels */
  minDecibels?: number;
  /** Max decibels */
  maxDecibels?: number;
}

/**
 * Create real-time frequency analyzer
 * @param stream - Media stream (from getUserMedia or audio element)
 * @param options - Analyzer options
 * @returns Analyzer functions
 */
export function createAnalyzer(
  stream: MediaStream | HTMLMediaElement,
  options: AnalyzerOptions = {}
): {
  getFrequencyData: () => Uint8Array;
  getTimeDomainData: () => Uint8Array;
  getAverageFrequency: () => number;
  destroy: () => void;
} {
  const ctx = getAudioContext();
  const {
    fftSize = 256,
    smoothingTimeConstant = 0.8,
    minDecibels = -90,
    maxDecibels = -10,
  } = options;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothingTimeConstant;
  analyser.minDecibels = minDecibels;
  analyser.maxDecibels = maxDecibels;

  let source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode;

  if (stream instanceof MediaStream) {
    source = ctx.createMediaStreamSource(stream);
  } else {
    source = ctx.createMediaElementSource(stream);
  }

  source.connect(analyser);

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const timeDomainData = new Uint8Array(analyser.frequencyBinCount);

  return {
    getFrequencyData(): Uint8Array {
      analyser.getByteFrequencyData(frequencyData);
      return frequencyData;
    },

    getTimeDomainData(): Uint8Array {
      analyser.getByteTimeDomainData(timeDomainData);
      return timeDomainData;
    },

    getAverageFrequency(): number {
      analyser.getByteFrequencyData(frequencyData);
      let sum = 0;
      for (let i = 0; i < frequencyData.length; i++) {
        sum += frequencyData[i];
      }
      return sum / frequencyData.length;
    },

    destroy(): void {
      source.disconnect();
    },
  };
}

// ============================================================================
// Media Utilities
// ============================================================================

/**
 * Format duration in seconds to mm:ss or hh:mm:ss
 * @param seconds - Duration in seconds
 * @param showHours - Always show hours
 * @returns Formatted duration string
 */
export function formatMediaDuration(
  seconds: number,
  showHours = false
): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (h > 0 || showHours) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Parse duration string to seconds
 * @param duration - Duration string (mm:ss or hh:mm:ss)
 * @returns Duration in seconds
 */
export function parseMediaDuration(duration: string): number {
  const parts = duration.split(':').map(Number);

  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }

  return parts[0] || 0;
}

/**
 * Get metadata from media element
 */
export interface MediaMetadata {
  duration: number;
  width?: number;
  height?: number;
  videoTracks?: number;
  audioTracks?: number;
}

/**
 * Get metadata from video/audio element
 */
export function getMediaMetadata(
  element: HTMLMediaElement
): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    if (element.readyState >= 1) {
      resolve(extractMetadata(element));
      return;
    }

    const onLoadedMetadata = (): void => {
      element.removeEventListener('loadedmetadata', onLoadedMetadata);
      element.removeEventListener('error', onError);
      resolve(extractMetadata(element));
    };

    const onError = (): void => {
      element.removeEventListener('loadedmetadata', onLoadedMetadata);
      element.removeEventListener('error', onError);
      reject(new Error('Failed to load media metadata'));
    };

    element.addEventListener('loadedmetadata', onLoadedMetadata);
    element.addEventListener('error', onError);
  });
}

function extractMetadata(element: HTMLMediaElement): MediaMetadata {
  const metadata: MediaMetadata = {
    duration: element.duration,
  };

  if (element instanceof HTMLVideoElement) {
    metadata.width = element.videoWidth;
    metadata.height = element.videoHeight;
  }

  return metadata;
}

/**
 * Generate video thumbnail
 * @param video - Video element or source URL
 * @param time - Time in seconds to capture
 * @param options - Thumbnail options
 * @returns Thumbnail as data URL
 */
export async function generateVideoThumbnail(
  video: HTMLVideoElement | string,
  time = 0,
  options: { width?: number; height?: number; format?: string } = {}
): Promise<string> {
  const { width, height, format = 'image/jpeg' } = options;

  let videoEl: HTMLVideoElement;
  let cleanup = false;

  if (typeof video === 'string') {
    videoEl = document.createElement('video');
    videoEl.src = video;
    videoEl.crossOrigin = 'anonymous';
    cleanup = true;
  } else {
    videoEl = video;
  }

  await new Promise<void>((resolve, reject) => {
    if (videoEl.readyState >= 2) {
      resolve();
      return;
    }

    videoEl.onloadeddata = () => resolve();
    videoEl.onerror = () => reject(new Error('Failed to load video'));

    if (cleanup) {
      videoEl.load();
    }
  });

  // Seek to desired time
  await new Promise<void>(resolve => {
    if (time === 0 || videoEl.currentTime === time) {
      resolve();
      return;
    }

    videoEl.onseeked = () => resolve();
    videoEl.currentTime = time;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width || videoEl.videoWidth;
  canvas.height = height || videoEl.videoHeight;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  if (cleanup) {
    videoEl.src = '';
    videoEl.load();
  }

  return canvas.toDataURL(format);
}

/**
 * Check if MediaRecorder is supported
 */
export function isMediaRecorderSupported(): boolean {
  return isBrowser() && typeof MediaRecorder !== 'undefined';
}

/**
 * Check if a MIME type is supported for recording
 */
export function isMimeTypeSupported(mimeType: string): boolean {
  return isMediaRecorderSupported() && MediaRecorder.isTypeSupported(mimeType);
}

/**
 * Get supported MIME types for recording
 */
export function getSupportedMimeTypes(): { audio: string[]; video: string[] } {
  if (!isMediaRecorderSupported()) {
    return { audio: [], video: [] };
  }

  const audioTypes = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];

  const videoTypes = [
    'video/webm',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm;codecs=h264',
    'video/mp4',
  ];

  return {
    audio: audioTypes.filter(t => MediaRecorder.isTypeSupported(t)),
    video: videoTypes.filter(t => MediaRecorder.isTypeSupported(t)),
  };
}

/**
 * Check Web Audio API support
 */
export function isWebAudioSupported(): boolean {
  return (
    isBrowser() &&
    (typeof AudioContext !== 'undefined' ||
      typeof (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext !== 'undefined')
  );
}

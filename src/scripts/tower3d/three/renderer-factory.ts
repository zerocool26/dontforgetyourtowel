import * as THREE from 'three';

export type SafeRendererOptions = {
  canvas: HTMLCanvasElement;
  alpha: boolean;
  antialias: boolean;
  powerPreference?: WebGLPowerPreference;
  preserveDrawingBuffer?: boolean;
};

type AnyWebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

const tryGetContext = (
  canvas: HTMLCanvasElement,
  kind: 'webgl2' | 'webgl' | 'experimental-webgl',
  attrs?: WebGLContextAttributes
): AnyWebGLContext | null => {
  try {
    return (
      attrs
        ? (canvas.getContext(kind, attrs) as AnyWebGLContext | null)
        : (canvas.getContext(kind) as AnyWebGLContext | null)
    ) as AnyWebGLContext | null;
  } catch {
    return null;
  }
};

const createContextAttempts = (
  alpha: boolean,
  antialias: boolean,
  powerPreference?: WebGLPowerPreference,
  preserveDrawingBuffer?: boolean
): WebGLContextAttributes[] => {
  const base: WebGLContextAttributes = {
    alpha,
    antialias,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: Boolean(preserveDrawingBuffer),
    powerPreference,
  };

  // Some browsers/devices fail context creation with certain attr combos.
  // Try a small set from “best quality” → “most permissive”.
  const withoutPower: WebGLContextAttributes = { ...base };
  delete withoutPower.powerPreference;

  return [
    // Default attrs first (browser chooses the best)
    // (represented by empty object, but we’ll attempt undefined separately)
    base,
    withoutPower,
    { ...withoutPower, antialias: false },
    { ...withoutPower, alpha: true, antialias: false },
    { ...withoutPower, alpha: false, antialias: false },
    { alpha: false, antialias: false, depth: false, stencil: false },
  ];
};

export const createSafeWebGLRenderer = (
  options: SafeRendererOptions
): THREE.WebGLRenderer => {
  const {
    canvas,
    alpha,
    antialias,
    powerPreference = 'high-performance',
    preserveDrawingBuffer = false,
  } = options;

  // Try to obtain a context ourselves so we can vary attributes.
  // If we succeed, hand it to three so the renderer can still be configured normally.
  const attempts = createContextAttempts(
    alpha,
    antialias,
    powerPreference,
    preserveDrawingBuffer
  );

  const contexts: Array<AnyWebGLContext> = [];

  // 1) Totally default contexts
  const defaultGl2 = tryGetContext(canvas, 'webgl2');
  if (defaultGl2) contexts.push(defaultGl2);
  const defaultGl1 =
    tryGetContext(canvas, 'webgl') ||
    tryGetContext(canvas, 'experimental-webgl');
  if (defaultGl1) contexts.push(defaultGl1);

  // 2) Attribute variations
  for (const attrs of attempts) {
    const gl2 = tryGetContext(canvas, 'webgl2', attrs);
    if (gl2) contexts.push(gl2);

    const gl1 =
      tryGetContext(canvas, 'webgl', attrs) ||
      tryGetContext(canvas, 'experimental-webgl', attrs);
    if (gl1) contexts.push(gl1);
  }

  // De-dupe contexts (some browsers return same object for repeated calls)
  const unique = Array.from(new Set(contexts));

  let lastError: unknown = null;
  for (const context of unique) {
    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        context,
        alpha,
        antialias,
        powerPreference,
        preserveDrawingBuffer,
      });
      return renderer;
    } catch (error) {
      lastError = error;
    }
  }

  const msg =
    'WebGL context could not be created (WebGL disabled or unavailable).';
  const err =
    lastError instanceof Error
      ? new Error(`${msg} ${lastError.message}`)
      : new Error(msg);
  throw err;
};

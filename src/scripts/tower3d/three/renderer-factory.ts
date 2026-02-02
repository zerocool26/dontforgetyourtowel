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

  // Prefer Three.js' own context creation first.
  // Some browsers can be sensitive to repeated `getContext()` probing or mismatched
  // attributes; letting Three drive the first attempt is often most reliable.
  try {
    return new THREE.WebGLRenderer({
      canvas,
      alpha,
      antialias,
      powerPreference,
      preserveDrawingBuffer,
    });
  } catch {
    // fall through to explicit context attempts
  }

  // If the default attempt failed, try to obtain a context ourselves so we can vary attributes.
  const attrsAttempts = createContextAttempts(
    alpha,
    antialias,
    powerPreference,
    preserveDrawingBuffer
  );

  const contextAttempts: Array<{
    kind: 'webgl2' | 'webgl' | 'experimental-webgl';
    attrs?: WebGLContextAttributes;
  }> = [
    { kind: 'webgl2' },
    { kind: 'webgl' },
    { kind: 'experimental-webgl' },
    ...attrsAttempts.flatMap(attrs => [
      { kind: 'webgl2' as const, attrs },
      { kind: 'webgl' as const, attrs },
      { kind: 'experimental-webgl' as const, attrs },
    ]),
  ];

  const seen = new Set<AnyWebGLContext>();
  let lastError: unknown = null;
  for (const attempt of contextAttempts) {
    const context = tryGetContext(canvas, attempt.kind, attempt.attrs);
    if (!context) continue;
    if (seen.has(context)) continue;
    seen.add(context);

    try {
      return new THREE.WebGLRenderer({
        canvas,
        context,
        alpha,
        antialias,
        powerPreference,
        preserveDrawingBuffer,
      });
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

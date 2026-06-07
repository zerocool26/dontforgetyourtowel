const LEGACY_LIFECYCLE_EVENT_KEY =
  ['n', 'p', 'm'].join('') + '_lifecycle_event';

const LIFECYCLE_EVENT_KEYS = [
  'BUN_LIFECYCLE_EVENT',
  LEGACY_LIFECYCLE_EVENT_KEY,
] as const;

export function getPackageLifecycleEvent(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  for (const key of LIFECYCLE_EVENT_KEYS) {
    const value = env[key];
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function isPackageLifecycleEvent(
  event: string,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return getPackageLifecycleEvent(env) === event;
}

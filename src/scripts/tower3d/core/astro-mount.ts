export type Cleanup = () => void;

export type Mountable = {
  destroy: Cleanup;
};

type MountFn = () => Mountable | Cleanup | null | void;

type Stored = {
  mountedRoot: HTMLElement | null;
  cleanup: Cleanup | null;
};

export const createAstroMount = (
  rootSelector: string,
  mountFn: MountFn
): void => {
  const storeKey = `__astro_mount_${rootSelector}` as const;

  const getStore = (): Stored => {
    const w = window as unknown as Record<string, Stored | undefined>;
    if (!w[storeKey]) w[storeKey] = { mountedRoot: null, cleanup: null };
    return w[storeKey]!;
  };

  const runMount = () => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    const store = getStore();

    if (root && root === store.mountedRoot && store.cleanup) return;

    store.cleanup?.();
    store.cleanup = null;
    store.mountedRoot = root;

    let mounted: ReturnType<MountFn>;
    try {
      mounted = mountFn();
    } catch (error) {
      // Avoid a single mount failure taking down all subsequent mounts.
      // (This shows up as "3D doesn't render anywhere" when an entry module throws.)
      console.error(
        `[createAstroMount] mount failed for ${rootSelector}`,
        error
      );
      return;
    }
    if (!mounted) return;

    if (typeof mounted === 'function') {
      store.cleanup = mounted;
      return;
    }

    store.cleanup = mounted.destroy;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runMount, { once: true });
  } else {
    runMount();
  }

  document.addEventListener('astro:page-load', runMount);
  document.addEventListener('astro:before-swap', () => {
    const store = getStore();
    store.cleanup?.();
    store.cleanup = null;
    store.mountedRoot = null;
  });
};

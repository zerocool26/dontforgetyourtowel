import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'preact/hooks';
import { navigate } from 'astro:transitions/client';
import {
  Search,
  Command,
  Moon,
  Sun,
  Monitor,
  FileText,
  Home,
  Box,
  X,
  ShieldCheck,
  Layout,
  Compass,
  Link2,
  type LucideIcon,
} from 'lucide-preact';
// Using our new utilities
import { setExperienceMode, setTheme } from '../store/index';
import { onKeyboardShortcut, type KeyboardShortcut } from '../utils/events';
import { createFocusTrap, announce } from '../utils/a11y';
import { get as httpGet } from '../utils/http';
import { withBasePath } from '../utils/helpers';
import { isLegacyRouteUrl } from '../utils/legacy-routes';
import { getRouteContext } from '../utils/route-context';
import {
  buildWorkspaceClipboardPayload,
  buildWorkspaceContactHref,
  buildWorkspaceDraft,
  buildWorkspaceJsonPayload,
  clearPinnedRoutes,
  readPinnedRoutes,
  readRecentRoutes,
  toNavigableRouteUrl,
} from '../utils/route-memory';

type CommandCategory =
  | 'Navigation'
  | 'Theme'
  | 'Actions'
  | 'Recent'
  | 'Pinned'
  | 'Route'
  | 'Page'
  | 'Case Study';

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
  category: CommandCategory;
  keywords?: string[];
  description?: string;
}

interface SearchIndexItem {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  date: string;
  tags: string[];
}

interface RoutePaletteMeta {
  accent: string;
  title: string;
  description: string;
  category: string;
  suggestions: Array<{
    label: string;
    detail: string;
    href: string;
  }>;
}

const normalizeSearchCategory = (rawCategory: string): CommandCategory => {
  if (rawCategory === 'Page') return 'Page';
  if (rawCategory === 'Case Study') return 'Case Study';
  return 'Page';
};

type SearchableCommand = Pick<
  CommandItem,
  'id' | 'label' | 'category' | 'keywords' | 'description'
>;
type WorkerRequest =
  | { type: 'index'; items: SearchableCommand[] }
  | { type: 'search'; query: string };
type WorkerResponse = { type: 'results'; query: string; ids: string[] };

type FuseImport = typeof import('fuse.js');
type FuseInstance = import('fuse.js').default<CommandItem>;

interface CommandPaletteProps {
  initialOpen?: boolean;
}

const FUSE_OPTIONS = {
  keys: ['label', 'category', 'keywords', 'description'],
  threshold: 0.3,
};

const BASE_COMMANDS: CommandItem[] = [
  // Navigation
  {
    id: 'nav-home',
    label: 'Go to Home',
    icon: Home,
    action: () => navigate(withBasePath('/')),
    category: 'Navigation',
  },
  {
    id: 'nav-solutions',
    label: 'Open Solution Hub',
    icon: Layout,
    action: () => navigate(withBasePath('services/')),
    category: 'Navigation',
    keywords: [
      'solutions',
      'msp',
      'security',
      'cloud',
      'ai',
      'automation',
      'support',
      'msp',
    ],
  },
  {
    id: 'nav-gallery',
    label: 'Open Design Gallery',
    icon: Layout,
    action: () => navigate(withBasePath('gallery/')),
    category: 'Navigation',
    keywords: [
      'gallery',
      'design',
      'art',
      'creative',
      'interface',
      'futuristic',
    ],
  },
  {
    id: 'nav-services',
    label: 'Go to Pricing',
    icon: Box,
    action: () => navigate(withBasePath('pricing/')),
    category: 'Navigation',
    keywords: ['pricing', 'quote', 'plans', 'investment'],
  },
  {
    id: 'nav-contact',
    label: 'Go to Contact',
    icon: FileText,
    action: () => navigate(withBasePath('contact-hq/')),
    category: 'Navigation',
    keywords: ['contact', 'intake', 'brief', 'proposal'],
  },
  {
    id: 'nav-trust-center',
    label: 'Open Trust Center',
    icon: ShieldCheck,
    action: () => navigate(withBasePath('trust-center/')),
    category: 'Navigation',
    keywords: [
      'trust',
      'proof',
      'security',
      'backup',
      'response',
      'customer excellence',
    ],
  },
  {
    id: 'nav-chicago-services',
    label: 'Open Chicago Service Pages',
    icon: Compass,
    action: () => navigate(withBasePath('chicago/')),
    category: 'Navigation',
    keywords: ['chicago', 'local', 'managed it', 'cybersecurity', 'm365'],
  },
  {
    id: 'nav-managed-it-chicago',
    label: 'Chicago Managed IT',
    icon: Box,
    action: () => navigate(withBasePath('chicago/managed-it/')),
    category: 'Navigation',
    keywords: ['managed it', 'support', 'helpdesk', 'chicago'],
  },
  {
    id: 'nav-cybersecurity-chicago',
    label: 'Chicago Cybersecurity',
    icon: Box,
    action: () => navigate(withBasePath('chicago/cybersecurity/')),
    category: 'Navigation',
    keywords: ['cybersecurity', 'security', 'mfa', 'endpoint', 'chicago'],
  },
  {
    id: 'nav-backup-chicago',
    label: 'Chicago Backup and Recovery',
    icon: Box,
    action: () => navigate(withBasePath('chicago/backup-disaster-recovery/')),
    category: 'Navigation',
    keywords: ['backup', 'recovery', 'continuity', 'restore', 'chicago'],
  },
  // Theme
  {
    id: 'theme-ops',
    label: 'Theme: Ops Center',
    icon: Moon,
    action: () => setTheme('ops-center'),
    category: 'Theme',
    keywords: ['dark', 'neon'],
  },
  {
    id: 'theme-corp',
    label: 'Theme: Corporate',
    icon: Sun,
    action: () => setTheme('corporate'),
    category: 'Theme',
    keywords: ['light', 'clean'],
  },
  {
    id: 'theme-term',
    label: 'Theme: Terminal',
    icon: Monitor,
    action: () => setTheme('terminal'),
    category: 'Theme',
    keywords: ['hacker', 'green'],
  },
];

export default function CommandPalette({
  initialOpen = false,
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchItems, setSearchItems] = useState<CommandItem[]>([]);
  const [recentCommands, setRecentCommands] = useState<CommandItem[]>([]);
  const [pinnedCommands, setPinnedCommands] = useState<CommandItem[]>([]);
  const [dynamicCommands, setDynamicCommands] = useState<CommandItem[]>([]);
  const [routeMeta, setRouteMeta] = useState<RoutePaletteMeta | null>(null);
  const [filteredCommands, setFilteredCommands] =
    useState<CommandItem[]>(BASE_COMMANDS);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const focusTrapCleanup = useRef<(() => void) | null>(null);
  const filteredCommandsRef = useRef<CommandItem[]>([]);
  const selectedIndexRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const latestQueryRef = useRef('');
  const commandLookupRef = useRef<Map<string, CommandItem>>(new Map());
  const fuseModulePromise = useRef<Promise<FuseImport> | null>(null);
  const fuseInstance = useRef<FuseInstance | null>(null);
  const listId = 'command-palette-list';
  const hintId = 'command-palette-hint';
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  }, []);
  const shortcutLabel = isMac ? 'Cmd K' : 'Ctrl K';
  const shortcutText = isMac ? 'Command K' : 'Control K';

  const loadRecentCommands = useCallback(() => {
    const items = readRecentRoutes()
      .slice(0, 4)
      .map(item => ({
        id: `recent-${item.url}`,
        label: item.title,
        icon: Layout,
        action: () => navigate(toNavigableRouteUrl(item.url)),
        category: 'Recent' as const,
        keywords: [item.category.toLowerCase(), 'recent', item.url],
        description: item.description,
      }));
    setRecentCommands(items);
  }, []);

  const loadPinnedCommands = useCallback(() => {
    const items = readPinnedRoutes()
      .slice(0, 6)
      .map(item => ({
        id: `pinned-${item.url}`,
        label: item.title,
        icon: Compass,
        action: () => navigate(toNavigableRouteUrl(item.url)),
        category: 'Pinned' as const,
        keywords: [item.category.toLowerCase(), 'saved', 'pinned', item.url],
        description: item.description,
      }));
    setPinnedCommands(items);
  }, []);

  // Fetch search index using our http utility
  const fetchSearchIndex = useCallback(async () => {
    try {
      const response = await httpGet<SearchIndexItem[]>(
        withBasePath('search-index.json')
      );
      const items = response.data
        .filter(item => !isLegacyRouteUrl(item.url))
        .map((item: SearchIndexItem) => {
          const category = normalizeSearchCategory(item.category);
          const icon = category === 'Page' ? Layout : FileText;

          return {
            id: item.id,
            label: item.title,
            icon,
            action: () => navigate(withBasePath(item.url)),
            category,
            keywords: item.tags,
            description: item.description,
          };
        });
      setSearchItems(items);
      // Announce to screen readers using our a11y utility
      announce(`Loaded ${items.length} searchable items`, 'polite');
    } catch (e) {
      console.error('Failed to load search index', e);
      announce('Failed to load search index', 'assertive');
    }
  }, []);

  useEffect(() => {
    if (isOpen && searchItems.length === 0) {
      fetchSearchIndex();
    }
  }, [isOpen, searchItems.length, fetchSearchIndex]);

  useEffect(() => {
    if (isOpen) {
      loadRecentCommands();
      loadPinnedCommands();
    }
  }, [isOpen, loadPinnedCommands, loadRecentCommands]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const routeContext = getRouteContext(window.location.pathname);
    setRouteMeta({
      accent: routeContext.accent,
      title: routeContext.currentTitle,
      description: routeContext.currentDescription,
      category: routeContext.currentCategory,
      suggestions: routeContext.suggestions,
    });

    const routeCommands: CommandItem[] = routeContext.suggestions
      .slice(0, 3)
      .map(link => ({
        id: `route-${link.href}`,
        label: link.label,
        icon: Compass,
        action: () => navigate(link.href),
        category: 'Route',
        keywords: [
          routeContext.currentCategory.toLowerCase(),
          routeContext.kicker.toLowerCase(),
          link.href,
        ],
        description: link.detail,
      }));

    const uniqueSections = new Map<string, string>();
    document
      .querySelectorAll<HTMLElement>(
        '[data-page-nav-link][data-page-nav-target]'
      )
      .forEach(node => {
        const id = node.dataset.pageNavTarget;
        const label =
          node.dataset.pageNavLabel ||
          node.dataset.pageNavShortLabel ||
          node.textContent?.replace(/\s+/g, ' ').trim();
        if (!id || !label || uniqueSections.has(id)) return;
        uniqueSections.set(id, label);
      });

    const sectionCommands: CommandItem[] = Array.from(uniqueSections.entries())
      .slice(0, 8)
      .map(([id, label]) => ({
        id: `section-${id}`,
        label: `Jump to ${label}`,
        icon: Layout,
        action: () => {
          const element = document.getElementById(id);
          if (!element) return;
          const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
          ).matches;
          element.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'start',
          });
          window.history.replaceState({}, '', `#${id}`);
        },
        category: 'Page',
        keywords: ['section', 'jump', id, label.toLowerCase()],
        description: 'Jump to a section on the current page.',
      }));

    const utilityCommands: CommandItem[] = [
      {
        id: 'action-copy-route-link',
        label: 'Copy current route link',
        icon: Link2,
        action: () => {
          navigator.clipboard
            ?.writeText(window.location.href)
            .then(() => announce('Current route link copied', 'polite'))
            .catch(() =>
              announce('Unable to copy the current route link', 'assertive')
            );
        },
        category: 'Actions',
        keywords: ['copy', 'link', 'share', 'url'],
        description: 'Copy the active page URL to the clipboard.',
      },
      {
        id: 'action-return-top',
        label: 'Return to top of page',
        icon: Home,
        action: () => {
          const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
          ).matches;
          window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
          });
        },
        category: 'Actions',
        keywords: ['top', 'scroll', 'reset', 'page'],
        description: 'Move back to the start of the current route.',
      },
      {
        id: 'mode-cinematic',
        label: 'Direction: Cinematic',
        icon: Layout,
        action: () => setExperienceMode('cinematic'),
        category: 'Actions',
        keywords: ['mode', 'visual', 'cinematic', 'gallery', 'dramatic'],
        description: 'Use the richest, most atmospheric surface treatment.',
      },
      {
        id: 'mode-editorial',
        label: 'Direction: Editorial',
        icon: FileText,
        action: () => setExperienceMode('editorial'),
        category: 'Actions',
        keywords: ['mode', 'visual', 'editorial', 'minimal', 'magazine'],
        description: 'Soften the atmosphere and lean into cleaner composition.',
      },
      {
        id: 'mode-blueprint',
        label: 'Direction: Blueprint',
        icon: Compass,
        action: () => setExperienceMode('blueprint'),
        category: 'Actions',
        keywords: ['mode', 'visual', 'blueprint', 'technical', 'systems'],
        description: 'Emphasize grids, structure, and engineering logic.',
      },
      {
        id: 'action-send-saved-routes-to-intake',
        label: 'Send saved routes to intake',
        icon: FileText,
        action: () => {
          const items = readPinnedRoutes();
          if (!items.length) {
            announce('No saved routes available for intake', 'assertive');
            return;
          }
          navigate(buildWorkspaceContactHref(items));
        },
        category: 'Actions',
        keywords: ['saved', 'intake', 'brief', 'workspace'],
        description: 'Route your saved workspace directly into project intake.',
      },
      {
        id: 'action-open-saved-routes',
        label: 'Open saved routes dock',
        icon: Compass,
        action: () => {
          window.dispatchEvent(new CustomEvent('saved-routes-dock:open'));
        },
        category: 'Actions',
        keywords: ['saved', 'pinned', 'dock', 'workspace'],
        description: 'Open the persistent saved-routes workspace.',
      },
      {
        id: 'action-export-saved-routes',
        label: 'Export saved routes',
        icon: Link2,
        action: () => {
          const items = readPinnedRoutes();
          if (!items.length) {
            announce('No saved routes available to export', 'assertive');
            return;
          }

          const payload = items ? buildWorkspaceClipboardPayload(items) : '';

          navigator.clipboard
            ?.writeText(payload)
            .then(() => announce('Saved routes copied', 'polite'))
            .catch(() =>
              announce('Unable to export saved routes', 'assertive')
            );
        },
        category: 'Actions',
        keywords: ['saved', 'export', 'copy', 'workspace'],
        description: 'Copy your saved route set to the clipboard.',
      },
      {
        id: 'action-copy-saved-workspace-brief',
        label: 'Copy saved workspace brief',
        icon: Link2,
        action: () => {
          const items = readPinnedRoutes();
          if (!items.length) {
            announce('No saved routes available to summarize', 'assertive');
            return;
          }

          navigator.clipboard
            ?.writeText(buildWorkspaceDraft(items).summary)
            .then(() => announce('Saved workspace brief copied', 'polite'))
            .catch(() =>
              announce('Unable to copy the saved workspace brief', 'assertive')
            );
        },
        category: 'Actions',
        keywords: ['saved', 'brief', 'workspace', 'summary'],
        description: 'Copy the concise saved-route project brief.',
      },
      {
        id: 'action-download-saved-routes-json',
        label: 'Download saved routes JSON',
        icon: Link2,
        action: () => {
          const items = readPinnedRoutes();
          if (!items.length) {
            announce('No saved routes available to download', 'assertive');
            return;
          }

          try {
            const blob = new Blob([buildWorkspaceJsonPayload(items)], {
              type: 'application/json;charset=utf-8',
            });
            const href = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = href;
            link.download = 'chicagos-msp-route-workspace.json';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(href);
            announce('Saved routes JSON downloaded', 'polite');
          } catch {
            announce('Unable to download saved routes JSON', 'assertive');
          }
        },
        category: 'Actions',
        keywords: ['saved', 'json', 'download', 'workspace'],
        description: 'Download the saved-route workspace as JSON.',
      },
      {
        id: 'action-clear-saved-routes',
        label: 'Clear saved routes',
        icon: X,
        action: () => {
          clearPinnedRoutes();
          announce('Saved routes cleared', 'polite');
        },
        category: 'Actions',
        keywords: ['saved', 'clear', 'remove', 'workspace'],
        description: 'Remove the current saved route set.',
      },
    ];

    setDynamicCommands([
      ...routeCommands,
      ...sectionCommands,
      ...utilityCommands,
    ]);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRouteMemoryUpdate = () => {
      loadRecentCommands();
    };

    const handleRoutePinsUpdate = () => {
      loadPinnedCommands();
    };

    window.addEventListener(
      'chicagos-msp:route-memory-updated',
      handleRouteMemoryUpdate as EventListener
    );
    window.addEventListener(
      'chicagos-msp:route-pins-updated',
      handleRoutePinsUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        'chicagos-msp:route-memory-updated',
        handleRouteMemoryUpdate as EventListener
      );
      window.removeEventListener(
        'chicagos-msp:route-pins-updated',
        handleRoutePinsUpdate as EventListener
      );
    };
  }, [loadPinnedCommands, loadRecentCommands]);

  // Debounce input to avoid running fuzzy search on every keystroke
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(handle);
  }, [query]);

  const allCommands = useMemo(() => {
    const seenLabels = new Set<string>();
    return [
      ...dynamicCommands,
      ...pinnedCommands,
      ...recentCommands,
      ...BASE_COMMANDS,
      ...searchItems,
    ].filter(command => {
      const key = command.label.trim().toLowerCase();
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    });
  }, [dynamicCommands, pinnedCommands, recentCommands, searchItems]);
  const searchableCommands = useMemo(
    () =>
      allCommands.map(({ id, label, category, keywords, description }) => ({
        id,
        label,
        category,
        keywords,
        description,
      })),
    [allCommands]
  );

  const getFuse = useCallback(async () => {
    if (!fuseModulePromise.current) {
      fuseModulePromise.current = import('fuse.js');
    }
    const { default: Fuse } = await fuseModulePromise.current;
    if (!fuseInstance.current) {
      fuseInstance.current = new Fuse(allCommands, FUSE_OPTIONS);
    } else {
      fuseInstance.current.setCollection(allCommands);
    }
    return fuseInstance.current;
  }, [allCommands]);

  useEffect(() => {
    const lookup = commandLookupRef.current;
    lookup.clear();
    allCommands.forEach(cmd => lookup.set(cmd.id, cmd));
  }, [allCommands, searchableCommands]);

  // Sync worker index whenever commands change
  useEffect(() => {
    if (!workerRef.current) return;
    const message: WorkerRequest = { type: 'index', items: searchableCommands };
    workerRef.current.postMessage(message);
  }, [searchableCommands]);

  // Create worker once to offload fuzzy search from main thread
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const worker = new Worker(
        new URL('./command-search.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;
        if (!data || data.type !== 'results') return;
        if (data.query !== latestQueryRef.current) return;

        const results = data.ids
          .map(id => commandLookupRef.current.get(id))
          .filter((cmd): cmd is CommandItem => Boolean(cmd));

        const fallbackList = Array.from(commandLookupRef.current.values());
        setFilteredCommands(results.length > 0 ? results : fallbackList);
      };

      worker.addEventListener('message', handleMessage);

      // Seed worker with current index
      worker.postMessage({
        type: 'index',
        items: Array.from(commandLookupRef.current.values()).map(
          ({ id, label, category, keywords, description }) => ({
            id,
            label,
            category,
            keywords,
            description,
          })
        ),
      } as WorkerRequest);

      return () => {
        worker.removeEventListener('message', handleMessage);
        worker.terminate();
        workerRef.current = null;
      };
    } catch (err) {
      console.warn(
        'Command palette worker unavailable, falling back to main thread',
        err
      );
    }
  }, []);

  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();
    latestQueryRef.current = trimmedQuery;

    if (!trimmedQuery) {
      setFilteredCommands(allCommands);
      return;
    }

    if (workerRef.current) {
      const message: WorkerRequest = { type: 'search', query: trimmedQuery };
      workerRef.current.postMessage(message);
      return;
    }

    // Fallback to main-thread Fuse if worker is unavailable
    let cancelled = false;
    getFuse()
      .then(fuse => {
        if (cancelled) return;
        setFilteredCommands(
          fuse.search(trimmedQuery).map(result => result.item)
        );
      })
      .catch(() => {
        if (cancelled) return;
        setFilteredCommands(allCommands);
      });

    return () => {
      cancelled = true;
    };
  }, [allCommands, getFuse, debouncedQuery]);

  useEffect(() => {
    filteredCommandsRef.current = filteredCommands;
  }, [filteredCommands]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  // Keep selected index within bounds when results change
  useEffect(() => {
    if (selectedIndexRef.current >= filteredCommandsRef.current.length) {
      const nextIndex = Math.max(filteredCommandsRef.current.length - 1, 0);
      selectedIndexRef.current = nextIndex;
      setSelectedIndex(nextIndex);
    }
  }, [filteredCommands.length]);

  // Use our keyboard shortcut utility for global shortcuts
  useEffect(() => {
    const toggleShortcut: KeyboardShortcut = {
      key: 'k',
      ctrl: true,
      meta: true, // Support both Ctrl+K and Cmd+K
    };

    const cleanup = onKeyboardShortcut(toggleShortcut, () => {
      setIsOpen(prev => {
        const newState = !prev;
        announce(
          newState ? 'Command palette opened' : 'Command palette closed',
          'polite'
        );
        return newState;
      });
    });

    // Also support Escape to close
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        announce('Command palette closed', 'polite');
      }
    };
    const toggleHandler = () => {
      setIsOpen(prev => {
        const next = !prev;
        announce(
          next ? 'Command palette opened' : 'Command palette closed',
          'polite'
        );
        return next;
      });
    };
    const openHandler = () => {
      setIsOpen(prev => {
        if (prev) return prev;
        announce('Command palette opened', 'polite');
        return true;
      });
    };

    window.addEventListener('keydown', escapeHandler);
    window.addEventListener(
      'command-palette:toggle',
      toggleHandler as EventListener
    );
    window.addEventListener(
      'command-palette:open',
      openHandler as EventListener
    );

    return () => {
      cleanup();
      window.removeEventListener('keydown', escapeHandler);
      window.removeEventListener(
        'command-palette:toggle',
        toggleHandler as EventListener
      );
      window.removeEventListener(
        'command-palette:open',
        openHandler as EventListener
      );
    };
  }, [isOpen]);

  // Focus trap and input focus when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Create focus trap using our a11y utility
      const trap = createFocusTrap(modalRef.current, {
        initialFocus: inputRef.current || undefined,
        escapeDeactivates: true,
        onEscape: () => setIsOpen(false),
      });
      trap.activate();
      focusTrapCleanup.current = () => trap.deactivate();

      setQuery('');
      setSelectedIndex(0);

      // Announce opening for screen readers
      announce(
        `Command palette opened. ${allCommands.length} commands available. Type to search.`,
        'polite'
      );
    } else if (!isOpen && focusTrapCleanup.current) {
      focusTrapCleanup.current();
      focusTrapCleanup.current = null;
    }

    return () => {
      if (focusTrapCleanup.current) {
        focusTrapCleanup.current();
        focusTrapCleanup.current = null;
      }
    };
  }, [isOpen, allCommands.length]);

  // Navigation within list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = Math.min(
            prev + 1,
            Math.max(filteredCommandsRef.current.length - 1, 0)
          );
          selectedIndexRef.current = next;
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : prev;
          selectedIndexRef.current = next;
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const command = filteredCommandsRef.current[selectedIndexRef.current];
        if (command) {
          command.action();
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;

    if (listRef.current) {
      const selectedElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const activeDescendantId = filteredCommands[selectedIndex]
    ? `command-option-${filteredCommands[selectedIndex].id}`
    : undefined;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="tone-border tone-surface animate-in fade-in zoom-in-95 relative w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search Input */}
        <div className="tone-border flex items-center border-b px-4 py-3">
          <Search className="tone-muted mr-3 h-5 w-5" />
          <input
            ref={inputRef}
            type="text"
            aria-label="Search commands"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={isOpen}
            aria-activedescendant={activeDescendantId}
            aria-describedby={hintId}
            className="tone-title flex-1 bg-transparent text-lg placeholder-zinc-500 focus:outline-none"
            placeholder="Type a command or search..."
            value={query}
            onInput={e => {
              setQuery((e.target as HTMLInputElement).value);
              setSelectedIndex(0);
            }}
          />
          <span id={hintId} className="sr-only">
            Type to search. Press {shortcutText} to open and Escape to close.
          </span>
          <div className="flex items-center gap-2">
            <span
              aria-live="polite"
              className="tone-muted hidden text-xs sm:inline-block"
            >
              {filteredCommands.length} result
              {filteredCommands.length === 1 ? '' : 's'}
            </span>
            <kbd className="tone-border tone-surface tone-muted hidden rounded border px-2 py-1 text-xs font-medium sm:inline-block">
              ESC
            </kbd>
            <button
              onClick={() => setIsOpen(false)}
              className="tone-muted tone-border rounded border border-transparent p-1 hover:bg-zinc-800 hover:text-white"
              aria-label="Close command palette"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Results List */}
        {routeMeta ? (
          <div className="border-b border-white/10 px-3 py-3">
            <div
              className="rounded-2xl border p-3 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.48)]"
              style={{
                borderColor: `color-mix(in srgb, ${routeMeta.accent} 14%, rgba(255,255,255,0.08))`,
                background: `linear-gradient(180deg, color-mix(in srgb, ${routeMeta.accent} 5%, transparent), rgba(255,255,255,0.02))`,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-white/72 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    borderColor: `color-mix(in srgb, ${routeMeta.accent} 16%, rgba(255,255,255,0.08))`,
                  }}
                >
                  {routeMeta.category}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                  Current route
                </span>
              </div>
              <p className="mt-3 text-base font-semibold text-white">
                {routeMeta.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                {routeMeta.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {routeMeta.suggestions.slice(0, 3).map(link => (
                  <button
                    key={link.href}
                    type="button"
                    className="text-white/78 hover:border-white/16 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs font-medium transition hover:bg-white/[0.05] hover:text-white"
                    onClick={() => {
                      navigate(link.href);
                      setIsOpen(false);
                    }}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="tone-muted py-12 text-center">
              <p>No results found.</p>
            </div>
          ) : (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Command results"
              className="space-y-1"
            >
              {filteredCommands.map((command, index) => {
                const Icon = command.icon;
                const isSelected = index === selectedIndex;
                const optionId = `command-option-${command.id}`;

                return (
                  <li
                    key={command.id}
                    id={optionId}
                    role="option"
                    aria-selected={isSelected}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                      isSelected
                        ? 'text-white shadow-[0_14px_32px_-26px_rgba(0,0,0,0.42)]'
                        : 'tone-body border-transparent hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor:
                              'color-mix(in srgb, var(--color-primary) 16%, rgba(255,255,255,0.08))',
                            background:
                              'color-mix(in srgb, var(--color-primary) 8%, rgba(255,255,255,0.03))',
                          }
                        : undefined
                    }
                    onClick={() => {
                      command.action();
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Icon
                      className={`mt-1 h-5 w-5 ${isSelected ? 'tone-accent' : 'tone-muted'}`}
                    />
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{command.label}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                            isSelected
                              ? 'tone-accent border-white/10'
                              : 'border-white/10 text-zinc-500'
                          }`}
                        >
                          {command.category}
                        </span>
                      </div>
                      {command.description ? (
                        <span
                          className={`mt-1 text-xs leading-relaxed ${
                            isSelected ? 'text-white/75' : 'tone-muted'
                          }`}
                        >
                          {command.description}
                        </span>
                      ) : null}
                    </div>
                    {isSelected && (
                      <Command className="tone-accent mt-1 h-4 w-4" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="tone-border tone-surface tone-muted border-t px-4 py-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <span>
                <kbd className="font-sans">↑↓</kbd> to navigate
              </span>
              <span>
                <kbd className="font-sans">↵</kbd> to select
              </span>
            </div>
            <span>
              <kbd className="font-sans">{shortcutLabel}</kbd> to open
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

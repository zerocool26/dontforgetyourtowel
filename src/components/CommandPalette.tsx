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
  User,
  Layout,
  type LucideIcon,
} from 'lucide-preact';
// Using our new utilities
import { setTheme } from '../store/index';
import { onKeyboardShortcut, type KeyboardShortcut } from '../utils/events';
import { createFocusTrap, announce } from '../utils/a11y';
import { get as httpGet } from '../utils/http';
import { withBasePath } from '../utils/helpers';
import { isLegacyRouteUrl } from '../utils/legacy-routes';
import {
  readRecentRoutes,
  toNavigableRouteUrl,
} from '../utils/route-memory';

type CommandCategory =
  | 'Navigation'
  | 'Theme'
  | 'Actions'
  | 'Recent'
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
    id: 'nav-trades',
    label: 'Open Trade Directory',
    icon: Layout,
    action: () => navigate(withBasePath('trades/')),
    category: 'Navigation',
    keywords: [
      'trades',
      'mechanical',
      'electrical',
      'plumbing',
      'general contracting',
      'commercial hvac',
      'auto repair',
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
    label: 'Go to Services',
    icon: Box,
    action: () => navigate(withBasePath('services/')),
    category: 'Navigation',
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
    id: 'nav-company',
    label: 'Open About',
    icon: User,
    action: () => navigate(withBasePath('company/')),
    category: 'Navigation',
    keywords: ['about', 'company', 'platform', 'story'],
  },
  {
    id: 'nav-about',
    label: 'Go to Portfolio',
    icon: User,
    action: () => navigate(withBasePath('about/')),
    category: 'Navigation',
  },
  {
    id: 'nav-build-studio',
    label: 'Open Build Studio',
    icon: Layout,
    action: () => navigate(withBasePath('build-studio/#studio')),
    category: 'Navigation',
    keywords: ['build', 'studio', 'flagship', 'showcase', 'planner', 'brief'],
  },
  {
    id: 'nav-build-studio-ai',
    label: 'Build Studio: AI Operations Room',
    icon: Layout,
    action: () =>
      navigate(
        withBasePath(
          'build-studio/?preset=ai-operations-room&urgency=flagship#studio'
        )
      ),
    category: 'Navigation',
    keywords: ['build studio', 'ai', 'automation', 'ops', 'flagship'],
  },
  {
    id: 'nav-portfolio-demo',
    label: 'Open Portfolio Demo',
    icon: Layout,
    action: () => navigate(withBasePath('about/#shop-experience')),
    category: 'Navigation',
    keywords: ['demo', 'portfolio', 'ecommerce', 'motion', 'showcase'],
  },
  {
    id: 'nav-portfolio-cart',
    label: 'Portfolio Demo: Cart Flow',
    icon: Box,
    action: () => navigate(withBasePath('about/?demo=cart#shop-experience')),
    category: 'Navigation',
    keywords: ['portfolio', 'ecommerce', 'demo', 'cart', 'launch'],
  },
  {
    id: 'nav-portfolio-compare',
    label: 'Portfolio Demo: Compare Mode',
    icon: Box,
    action: () => navigate(withBasePath('about/?demo=compare#shop-experience')),
    category: 'Navigation',
    keywords: ['portfolio', 'ecommerce', 'demo', 'compare', 'launch'],
  },
  {
    id: 'nav-portfolio-checkout',
    label: 'Portfolio Demo: Checkout Simulation',
    icon: Box,
    action: () =>
      navigate(
        withBasePath(
          'about/?demo=checkout&product=aurora-hoodie#shop-experience'
        )
      ),
    category: 'Navigation',
    keywords: ['portfolio', 'ecommerce', 'demo', 'checkout', 'launch'],
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

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchItems, setSearchItems] = useState<CommandItem[]>([]);
  const [recentCommands, setRecentCommands] = useState<CommandItem[]>([]);
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
    const items = readRecentRoutes().slice(0, 4).map(item => ({
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
    }
  }, [isOpen, loadRecentCommands]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRouteMemoryUpdate = () => {
      loadRecentCommands();
    };

    window.addEventListener(
      'olive:route-memory-updated',
      handleRouteMemoryUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        'olive:route-memory-updated',
        handleRouteMemoryUpdate as EventListener
      );
    };
  }, [loadRecentCommands]);

  // Debounce input to avoid running fuzzy search on every keystroke
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(handle);
  }, [query]);

  const allCommands = useMemo(() => {
    const seenLabels = new Set<string>();
    return [...recentCommands, ...BASE_COMMANDS, ...searchItems].filter(
      command => {
        const key = command.label.trim().toLowerCase();
        if (seenLabels.has(key)) return false;
        seenLabels.add(key);
        return true;
      }
    );
  }, [recentCommands, searchItems]);
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
        className="tone-border tone-surface animate-in fade-in zoom-in-95 relative w-full max-w-2xl overflow-hidden rounded-xl border shadow-2xl duration-200"
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
        <div className="max-h-[60vh] overflow-y-auto p-2">
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
                        ? 'border-[#ccff00]/30 bg-[#ccff00]/10 text-white shadow-[0_0_28px_rgba(204,255,0,0.08)]'
                        : 'tone-body border-transparent hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                    onClick={() => {
                      command.action();
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Icon
                      className={`mt-1 h-5 w-5 ${isSelected ? 'text-[#ccff00]' : 'tone-muted'}`}
                    />
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{command.label}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] ${
                            isSelected
                              ? 'border-[#ccff00]/30 text-[#ccff00]'
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
                      <Command className="mt-1 h-4 w-4 text-[#ccff00]" />
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

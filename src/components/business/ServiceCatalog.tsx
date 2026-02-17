import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Service } from '../../data/services-extended';
import { withBasePath } from '../../utils/helpers';

interface Props {
  services: Service[];
}

export default function ServiceCatalog({ services }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const hydratedFromUrlRef = useRef(false);
  const inactivePillClass =
    'tone-border tone-muted tone-surface border [@media(hover:hover)]:hover:bg-white/5 [@media(hover:hover)]:hover:text-accent-200';

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats).sort();
  }, [services]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlSearch = params.get('q')?.trim() ?? '';
    const urlCategory = params.get('cat')?.trim() ?? '';
    const urlView = params.get('view');

    if (urlSearch) {
      setSearch(urlSearch);
    }

    if (urlCategory) {
      const matchedCategory = services.some(s => s.category === urlCategory)
        ? urlCategory
        : null;
      setSelectedCategory(matchedCategory);
    }

    if (urlView === 'grid' || urlView === 'list') {
      setViewMode(urlView);
    }

    hydratedFromUrlRef.current = true;
  }, [services]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hydratedFromUrlRef.current) return;

    const currentUrl = new URL(window.location.href);
    const params = currentUrl.searchParams;

    if (search) {
      params.set('q', search);
    } else {
      params.delete('q');
    }

    if (selectedCategory) {
      params.set('cat', selectedCategory);
    } else {
      params.delete('cat');
    }

    if (viewMode !== 'grid') {
      params.set('view', viewMode);
    } else {
      params.delete('view');
    }

    const nextSearch = params.toString();
    const nextUrl = `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}${currentUrl.hash}`;
    const currentPathAndQuery = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentPathAndQuery) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [search, selectedCategory, viewMode]);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !selectedCategory || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, search, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return categories.map(category => ({
      category,
      count: services.filter(service => service.category === category).length,
    }));
  }, [categories, services]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-700 motion-reduce:animate-none motion-reduce:duration-0">
      <div className="tone-border tone-surface grid gap-4 rounded-2xl border p-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="max-w-md flex-1 space-y-2">
          <label
            htmlFor="service-search"
            className="tone-muted text-xs font-semibold uppercase tracking-wider"
          >
            Search Catalog
          </label>
          <input
            id="service-search"
            type="text"
            placeholder="e.g. 'Cloud Security', 'Kubernetes'..."
            value={search}
            onInput={e => setSearch(e.currentTarget.value)}
            className="tone-border tone-title tone-surface w-full rounded-xl border px-4 py-3 text-sm placeholder-zinc-500 transition-all focus:border-accent-500/50 focus:outline-none focus:ring-1 focus:ring-accent-500/50 motion-reduce:transition-none"
          />
        </div>
        <div className="flex items-center gap-2 self-start md:self-end">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none ${
              viewMode === 'grid'
                ? 'bg-accent-600 text-white'
                : inactivePillClass
            }`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none ${
              viewMode === 'list'
                ? 'bg-accent-600 text-white'
                : inactivePillClass
            }`}
          >
            List
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="tone-muted mr-2 text-xs uppercase tracking-wider">
          Categories
        </span>
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          aria-pressed={!selectedCategory}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none ${
            !selectedCategory ? 'bg-accent-600 text-white' : inactivePillClass
          }`}
        >
          All Services ({services.length})
        </button>
        {categoryCounts.map(({ category, count }) => (
          <button
            type="button"
            key={category}
            onClick={() => setSelectedCategory(category)}
            aria-pressed={selectedCategory === category}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none ${
              selectedCategory === category
                ? 'bg-accent-600 text-white'
                : inactivePillClass
            }`}
          >
            {category} ({count})
          </button>
        ))}
      </div>

      <p className="tone-muted text-xs" aria-live="polite">
        Showing <span className="tone-body">{filteredServices.length}</span> of{' '}
        <span className="tone-body">{services.length}</span> services
        {selectedCategory ? ` in ${selectedCategory}` : ''}.
      </p>

      <div
        className={
          viewMode === 'grid'
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid gap-3'
        }
      >
        {filteredServices.map(s => (
          <a
            key={s.id}
            href={withBasePath(
              `contact-hq/?service=${encodeURIComponent(s.id)}`
            )}
            className={`tone-border tone-elevated group relative overflow-hidden rounded-2xl border p-6 transition-all motion-reduce:transition-none [@media(hover:hover)]:hover:border-accent-400/40 [@media(hover:hover)]:hover:shadow-2xl [@media(hover:hover)]:hover:shadow-accent-500/10 ${
              viewMode === 'list'
                ? 'grid gap-4 md:grid-cols-[0.24fr_1fr_auto] md:items-center'
                : 'flex flex-col justify-between'
            }`}
            aria-label={`Contact HQ about ${s.name}`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-400">
                  {s.category}
                </span>
                <div className="h-1.5 w-1.5 rounded-full bg-accent-500/50 opacity-0 transition-opacity motion-reduce:transition-none [@media(hover:hover)]:group-hover:opacity-100" />
              </div>
              <h3 className="tone-title text-lg font-semibold transition-colors motion-reduce:transition-none [@media(hover:hover)]:group-hover:text-accent-300">
                {s.name}
              </h3>
              <p className="tone-body text-sm leading-relaxed">
                {s.description}
              </p>
            </div>

            <div
              className={`tone-muted flex items-center gap-2 text-xs font-medium [@media(hover:hover)]:group-hover:text-accent-200 ${viewMode === 'grid' ? 'mt-6' : 'md:justify-end'}`}
            >
              <span>Get plan details</span>
              <svg
                className="h-4 w-4 transition-transform motion-reduce:transition-none [@media(hover:hover)]:group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
          </a>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="tone-border tone-surface rounded-2xl border border-dashed py-20 text-center">
          <p className="tone-muted">
            No services found matching your criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory(null);
            }}
            className="mt-4 text-sm text-accent-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 [@media(hover:hover)]:hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

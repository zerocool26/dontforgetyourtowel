import { useState, useMemo } from 'preact/hooks';
import type { Service } from '../../data/services-extended';

interface Props {
  services: Service[];
}

export default function ServiceCatalog({ services }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats).sort();
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                            s.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, search, selectedCategory]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1 max-w-md space-y-2">
          <label htmlFor="service-search" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Search Catalog</label>
          <input
            id="service-search"
            type="text"
            placeholder="e.g. 'Cloud Security', 'Kubernetes'..."
            value={search}
            onInput={(e) => setSearch(e.currentTarget.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 transition-all focus:border-accent-500/50 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
              !selectedCategory
                ? 'bg-accent-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            All Services
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-accent-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map(s => (
          <div
            key={s.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900/50 to-zinc-950 p-6 transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-accent-500/10"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-400">{s.category}</span>
                <div className="h-1.5 w-1.5 rounded-full bg-accent-500/50 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-accent-300 transition-colors">{s.name}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{s.description}</p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-zinc-500 group-hover:text-zinc-300">
              <span>View details</span>
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-zinc-500">No services found matching your criteria.</p>
          <button
            onClick={() => {setSearch(''); setSelectedCategory(null);}}
            className="mt-4 text-sm text-accent-400 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

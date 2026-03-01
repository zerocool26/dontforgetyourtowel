import Fuse from 'fuse.js';

type SearchableCommand = {
  id: string;
  label: string;
  category: string;
  keywords?: string[];
  description?: string;
};

type WorkerRequest =
  | { type: 'index'; items: SearchableCommand[] }
  | { type: 'search'; query: string };

type WorkerResponse = { type: 'results'; query: string; ids: string[] };

const ctx: DedicatedWorkerGlobalScope =
  self as unknown as DedicatedWorkerGlobalScope;

const FUSE_OPTIONS = {
  keys: ['label', 'category', 'keywords', 'description'],
  threshold: 0.3,
};

let fuse: Fuse<SearchableCommand> | null = null;
let collection: SearchableCommand[] = [];

function ensureFuse(items: SearchableCommand[]) {
  collection = items;
  if (!fuse) {
    fuse = new Fuse(items, FUSE_OPTIONS);
  } else {
    fuse.setCollection(items);
  }
}

function handleIndex(items: SearchableCommand[]) {
  ensureFuse(items);
}

function handleSearch(query: string) {
  if (!fuse) {
    if (collection.length > 0) {
      ensureFuse(collection);
    } else {
      ctx.postMessage({
        type: 'results',
        query,
        ids: [],
      } satisfies WorkerResponse);
      return;
    }
  }

  const trimmed = query.trim();
  if (!trimmed) {
    ctx.postMessage({
      type: 'results',
      query,
      ids: collection.map(item => item.id),
    } satisfies WorkerResponse);
    return;
  }

  const ids = fuse!.search(trimmed).map(result => result.item.id);
  ctx.postMessage({ type: 'results', query, ids } satisfies WorkerResponse);
}

ctx.onmessage = event => {
  const data = event.data as WorkerRequest | undefined;
  if (!data) return;

  if (data.type === 'index') {
    handleIndex(data.items);
    return;
  }

  if (data.type === 'search') {
    handleSearch(data.query);
  }
};

export {};

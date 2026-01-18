import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getEffectiveDemoFlags } from '@/utils/demo-lab';
import { useGesture } from '@/utils/gestures';
import { demoProducts, type DemoProduct } from '../../data/demo-ecommerce';

type CartLine = {
  productId: string;
  qty: number;
  colorId: string;
  sizeId: string;
};

type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'confirm';
type ViewMode = 'grid' | 'list';
type Currency = 'USD' | 'EUR';
type ShippingMethod = 'standard' | 'express';

type DemoFlags = {
  reducedMotion: boolean;
  perfMode: boolean;
  paused: boolean;
};

type Prefs = {
  tags: string[];
  sort: 'featured' | 'price-asc' | 'price-desc';
  view: ViewMode;
  currency: Currency;
  priceMinCents?: number;
  priceMaxCents?: number;
  wishlist: string[];
  recent: string[];
  shippingMethod: ShippingMethod;
};

const CART_STORAGE_KEY = 'demo-shop:ecommerce-cart:v1';
const PREFS_STORAGE_KEY = 'demo-shop:ecommerce-prefs:v2';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const WAREHOUSES = ['Phoenix, AZ', 'Columbus, OH', 'Reno, NV', 'Atlanta, GA'];

function pickWarehouse(zip: string) {
  const digits = zip.replace(/\D/g, '');
  const seed = digits ? Number(digits.slice(-2)) : 3;
  return WAREHOUSES[seed % WAREHOUSES.length];
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getDeliveryWindow(method: ShippingMethod, zip: string) {
  const digits = zip.replace(/\D/g, '');
  const shift = digits ? Number(digits[digits.length - 1]) % 2 : 0;
  const baseMin = method === 'express' ? 1 : 3;
  const baseMax = method === 'express' ? 2 : 5;
  const min = baseMin + shift;
  const max = baseMax + shift;
  const now = new Date();

  return {
    min,
    max,
    label: `${formatDate(addDays(now, min))}–${formatDate(addDays(now, max))}`,
  };
}

function getDemoFlags(): DemoFlags {
  const flags = getEffectiveDemoFlags(null);
  return {
    reducedMotion: flags.reducedMotion,
    perfMode: flags.perfMode,
    paused: flags.paused,
  };
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    // Avoid layout shift when scrollbar disappears.
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    document.body.classList.add('demo-ecom-open');

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.body.classList.remove('demo-ecom-open');
    };
  }, [locked]);
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(nodes).filter(
    el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
  );
}

function useFocusTrap(
  enabled: boolean,
  dialogRef: { current: HTMLElement | null }
) {
  useEffect(() => {
    if (!enabled) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = getFocusableElements(dialog);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    const previousActive = document.activeElement as HTMLElement | null;
    (first ?? dialog).focus?.();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const current = document.activeElement as HTMLElement | null;
      if (!current) return;

      if (e.shiftKey) {
        if (current === first || current === dialog) {
          e.preventDefault();
          (last ?? first ?? dialog).focus?.();
        }
      } else {
        if (current === last) {
          e.preventDefault();
          (first ?? dialog).focus?.();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousActive?.focus?.();
    };
  }, [enabled, dialogRef]);
}

function vibrateLight() {
  try {
    navigator.vibrate?.(8);
  } catch {
    // ignore
  }
}

function getProductById(id: string): DemoProduct | undefined {
  return demoProducts.find(p => p.id === id);
}

function computeLineTotal(line: CartLine) {
  const p = getProductById(line.productId);
  if (!p) return 0;
  return p.priceCents * line.qty;
}

function computeSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + computeLineTotal(l), 0);
}

function computeShipping(args: {
  subtotalCents: number;
  method: ShippingMethod;
  freeShipping: boolean;
}) {
  if (args.freeShipping) return 0;

  // Standard shipping: free over $100, otherwise $9.95
  if (args.method === 'standard') {
    return args.subtotalCents >= 10000 ? 0 : 995;
  }

  // Express: fixed for demo.
  return 1995;
}

function computeTax(subtotalCents: number) {
  // Demo fixed rate.
  return Math.round(subtotalCents * 0.0825);
}

function Rating({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const stars = [
    ...Array.from({ length: full }, () => 'full'),
    ...(half ? ['half'] : []),
    ...Array.from({ length: empty }, () => 'empty'),
  ];

  return (
    <span
      class="inline-flex items-center gap-1"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {stars.map((t, i) => (
        <span key={`${t}-${i}`} aria-hidden="true" class="text-yellow-300/90">
          {t === 'full' ? '★' : t === 'half' ? '⯪' : '☆'}
        </span>
      ))}
    </span>
  );
}

function Swatch({
  color,
  selected,
  onSelect,
}: {
  color: { id: string; label: string; swatch?: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      class={`min-h-touch min-w-touch inline-flex items-center justify-center rounded-full border transition ${
        selected
          ? 'border-accent-400 bg-white/10'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
      aria-pressed={selected}
      onClick={onSelect}
      title={color.label}
    >
      <span
        aria-hidden="true"
        class="h-5 w-5 rounded-full"
        style={{ background: color.swatch ?? '#94a3b8' }}
      />
      <span class="sr-only">{color.label}</span>
    </button>
  );
}

function Chip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      class={`min-h-touch inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition ${
        selected
          ? 'border-accent-500 bg-accent-500/15 text-white'
          : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
      }`}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

export default function EcommerceShowcase() {
  const [flags, setFlags] = useState<DemoFlags>({
    reducedMotion: false,
    perfMode: false,
    paused: false,
  });

  const [fuse, setFuse] = useState<
    import('fuse.js').default<DemoProduct> | null
  >(null);

  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc'>(
    'featured'
  );
  const [view, setView] = useState<ViewMode>('grid');
  const [currency, setCurrency] = useState<Currency>('USD');

  const allPrices = useMemo(
    () => demoProducts.map(p => p.priceCents).sort((a, b) => a - b),
    []
  );
  const priceFloor = allPrices[0] ?? 0;
  const priceCeil = allPrices[allPrices.length - 1] ?? 0;
  const [priceMinCents, setPriceMinCents] = useState(priceFloor);
  const [priceMaxCents, setPriceMaxCents] = useState(priceCeil);

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);
  const [quickViewProductId, setQuickViewProductId] = useState<string | null>(
    null
  );
  const [quickViewImageIndex, setQuickViewImageIndex] = useState(0);
  const [quickViewColorId, setQuickViewColorId] = useState<string>('');
  const [quickViewSizeId, setQuickViewSizeId] = useState<string>('');

  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [promoCode, setPromoCode] = useState('');
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>('standard');
  const [shippingZip, setShippingZip] = useState('');
  const [giftWrap, setGiftWrap] = useState(false);
  const [shippingProtection, setShippingProtection] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const cartDialogRef = useRef<HTMLDivElement | null>(null);
  const quickViewDialogRef = useRef<HTMLDivElement | null>(null);
  const quickViewGalleryRef = useRef<HTMLDivElement | null>(null);
  const compareDialogRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useBodyScrollLock(cartOpen || quickViewProductId !== null || compareOpen);
  useFocusTrap(cartOpen, cartDialogRef);
  useFocusTrap(quickViewProductId !== null, quickViewDialogRef);
  useFocusTrap(compareOpen, compareDialogRef);

  // Load persisted state once.
  useEffect(() => {
    const savedCart = safeParseJson<CartLine[]>(
      localStorage.getItem(CART_STORAGE_KEY)
    );
    if (Array.isArray(savedCart)) {
      setCartLines(savedCart);
    }

    const prefs = safeParseJson<Prefs>(localStorage.getItem(PREFS_STORAGE_KEY));
    if (prefs?.tags) setSelectedTags(prefs.tags);
    if (prefs?.sort) setSort(prefs.sort);
    if (prefs?.view) setView(prefs.view);
    if (prefs?.currency) setCurrency(prefs.currency);
    if (typeof prefs?.priceMinCents === 'number')
      setPriceMinCents(prefs.priceMinCents);
    if (typeof prefs?.priceMaxCents === 'number')
      setPriceMaxCents(prefs.priceMaxCents);
    if (Array.isArray(prefs?.wishlist)) setWishlist(prefs.wishlist);
    if (Array.isArray(prefs?.recent)) setRecent(prefs.recent);
    if (prefs?.shippingMethod) setShippingMethod(prefs.shippingMethod);
  }, []);

  // Persist cart.
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartLines));
    } catch {
      // ignore
    }
  }, [cartLines]);

  // Persist preferences.
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({
          tags: selectedTags,
          sort,
          view,
          currency,
          priceMinCents,
          priceMaxCents,
          wishlist,
          recent,
          shippingMethod,
        } satisfies Prefs)
      );
    } catch {
      // ignore
    }
  }, [
    selectedTags,
    sort,
    view,
    currency,
    priceMinCents,
    priceMaxCents,
    wishlist,
    recent,
    shippingMethod,
  ]);

  // Track demo-lab flags (pause / reduced motion / perf).
  useEffect(() => {
    const update = () => setFlags(getDemoFlags());
    update();

    const observer = new MutationObserver(() => update());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'data-demo-paused',
        'data-demo-reduced-motion',
        'data-demo-perf',
      ],
    });

    return () => observer.disconnect();
  }, []);

  // Toast auto-dismiss.
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Keyboard shortcuts: '/' focuses search, 'c' opens cart, Esc closes overlays.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingField =
        tag === 'input' ||
        tag === 'textarea' ||
        (target as HTMLElement | null)?.isContentEditable;

      if (e.key === 'Escape') {
        if (quickViewProductId) {
          e.preventDefault();
          setQuickViewProductId(null);
          return;
        }
        if (compareOpen) {
          e.preventDefault();
          setCompareOpen(false);
          return;
        }
        if (cartOpen) {
          e.preventDefault();
          setCartOpen(false);
        }
        return;
      }

      if (isTypingField) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus?.();
      }

      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCartOpen(true);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cartOpen, compareOpen, quickViewProductId]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    demoProducts.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, []);

  useEffect(() => {
    let active = true;

    const loadFuse = async () => {
      const mod = await import('fuse.js');
      if (!active) return;

      const FuseCtor = mod.default;
      setFuse(
        new FuseCtor(demoProducts, {
          keys: [
            { name: 'name', weight: 2 },
            { name: 'brand', weight: 1 },
            { name: 'description', weight: 1 },
            { name: 'tags', weight: 1 },
          ],
          threshold: 0.35,
          minMatchCharLength: 2,
        })
      );
    };

    const w = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout?: number }
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(
        () => {
          void loadFuse();
        },
        { timeout: 1200 }
      );
      return () => {
        active = false;
        w.cancelIdleCallback?.(id);
      };
    }

    const t = window.setTimeout(() => {
      void loadFuse();
    }, 1);

    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim();

    const base =
      normalizedQuery.length >= 2 && fuse
        ? fuse.search(normalizedQuery).map(r => r.item)
        : normalizedQuery.length >= 2
          ? demoProducts.filter(p => {
              const hay =
                `${p.name} ${p.brand} ${p.description} ${p.tags.join(' ')}`.toLowerCase();
              return hay.includes(normalizedQuery.toLowerCase());
            })
          : demoProducts;

    const tagFiltered = selectedTags.length
      ? base.filter(p => selectedTags.every(t => p.tags.includes(t)))
      : base;

    const priceFiltered = tagFiltered.filter(
      p => p.priceCents >= priceMinCents && p.priceCents <= priceMaxCents
    );

    const sorted = [...priceFiltered];
    sorted.sort((a, b) => {
      if (sort === 'price-asc') return a.priceCents - b.priceCents;
      if (sort === 'price-desc') return b.priceCents - a.priceCents;
      // featured first, then rating.
      return (
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        b.rating - a.rating
      );
    });

    return sorted;
  }, [fuse, query, selectedTags, sort, priceMinCents, priceMaxCents]);

  const cartCount = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.qty, 0),
    [cartLines]
  );

  const storefrontStats = useMemo(() => {
    const totalProducts = demoProducts.length;
    const totalReviews = demoProducts.reduce(
      (sum, p) => sum + p.reviewCount,
      0
    );
    const avgRating =
      demoProducts.reduce((sum, p) => sum + p.rating, 0) /
      Math.max(1, totalProducts);
    const featured = demoProducts.filter(p => p.featured).length;
    const lowStock = demoProducts.filter(
      p => typeof p.inventory === 'number' && p.inventory <= 20
    ).length;

    return {
      totalProducts,
      totalReviews,
      avgRating,
      featured,
      lowStock,
    };
  }, []);

  const subtotalCents = useMemo(() => computeSubtotal(cartLines), [cartLines]);
  const hasShipFreePromo = useMemo(() => {
    const normalized = promoCode.trim().toUpperCase();
    return normalized === 'SHIPFREE';
  }, [promoCode]);

  const shippingCents = useMemo(() => {
    return computeShipping({
      subtotalCents,
      method: shippingMethod,
      freeShipping: hasShipFreePromo,
    });
  }, [subtotalCents, shippingMethod, hasShipFreePromo]);
  const taxCents = useMemo(() => computeTax(subtotalCents), [subtotalCents]);

  const deliveryWindow = useMemo(
    () => getDeliveryWindow(shippingMethod, shippingZip),
    [shippingMethod, shippingZip]
  );

  const warehouse = useMemo(
    () => pickWarehouse(shippingZip || '00000'),
    [shippingZip]
  );

  const savingsCents = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      const p = getProductById(line.productId);
      if (!p?.compareAtCents) return sum;
      return sum + (p.compareAtCents - p.priceCents) * line.qty;
    }, 0);
  }, [cartLines]);

  const addOnCents = useMemo(() => {
    return (giftWrap ? 500 : 0) + (shippingProtection ? 399 : 0);
  }, [giftWrap, shippingProtection]);

  const promoDiscountCents = useMemo(() => {
    const normalized = promoCode.trim().toUpperCase();
    if (!normalized) return 0;
    // Demo promo: 10% off.
    if (normalized === 'WOW10') return Math.round(subtotalCents * 0.1);
    if (normalized === 'VIP20')
      return Math.min(2500, Math.round(subtotalCents * 0.2));
    return 0;
  }, [promoCode, subtotalCents]);

  const totalCents = useMemo(() => {
    return (
      Math.max(0, subtotalCents - promoDiscountCents) +
      shippingCents +
      taxCents +
      addOnCents
    );
  }, [subtotalCents, promoDiscountCents, shippingCents, taxCents, addOnCents]);

  const loyaltyPoints = useMemo(() => {
    return Math.max(0, Math.floor(subtotalCents / 100));
  }, [subtotalCents]);

  const money = useMemo(() => {
    // Fixed demo conversion (not a live rate).
    const rate = currency === 'EUR' ? 0.92 : 1;
    const fmt = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    });

    return (cents: number) => fmt.format((cents / 100) * rate);
  }, [currency]);

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  function toggleWishlist(productId: string) {
    setWishlist(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
    vibrateLight();
  }

  function toggleCompare(productId: string) {
    setCompareIds(prev => {
      if (prev.includes(productId)) return prev.filter(id => id !== productId);
      if (prev.length >= 3) {
        setToast('Compare supports up to 3 items.');
        return prev;
      }
      return [...prev, productId];
    });
  }

  function openQuickView(product: DemoProduct) {
    setQuickViewProductId(product.id);
    setQuickViewImageIndex(0);
    setQuickViewColorId(product.colors[0]?.id ?? '');
    setQuickViewSizeId(product.sizes[0]?.id ?? '');

    setRecent(prev => {
      const next = [product.id, ...prev.filter(id => id !== product.id)];
      return next.slice(0, 8);
    });
  }

  function closeQuickView() {
    setQuickViewProductId(null);
    setCheckoutStep('cart');
  }

  function addToCart(
    product: DemoProduct,
    opts?: { colorId?: string; sizeId?: string; qty?: number }
  ) {
    const colorId = opts?.colorId ?? product.colors[0]?.id ?? 'default';
    const sizeId = opts?.sizeId ?? product.sizes[0]?.id ?? 'default';
    const qty = clamp(opts?.qty ?? 1, 1, 99);

    setCartLines(prev => {
      const index = prev.findIndex(
        l =>
          l.productId === product.id &&
          l.colorId === colorId &&
          l.sizeId === sizeId
      );
      if (index === -1)
        return [...prev, { productId: product.id, qty, colorId, sizeId }];

      const next = [...prev];
      next[index] = {
        ...next[index],
        qty: clamp(next[index].qty + qty, 1, 99),
      };
      return next;
    });

    vibrateLight();
  }

  function setLineQty(index: number, qty: number) {
    setCartLines(prev => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], qty: clamp(qty, 1, 99) };
      return next;
    });
  }

  function removeLine(index: number) {
    setCartLines(prev => prev.filter((_, i) => i !== index));
  }

  function clearCart() {
    setCartLines([]);
  }

  function nextImage(product: DemoProduct, dir: 1 | -1) {
    setQuickViewImageIndex(i => {
      const next = i + dir;
      if (next < 0) return product.images.length - 1;
      if (next >= product.images.length) return 0;
      return next;
    });
  }

  // Swipe handling for quick-view image carousel (mobile-friendly).
  useGesture(
    quickViewGalleryRef,
    {
      onSwipe: e => {
        if (flags.paused) return;
        if (!quickViewProduct) return;

        if (e.direction === 'left') nextImage(quickViewProduct, 1);
        if (e.direction === 'right') nextImage(quickViewProduct, -1);
      },
    },
    {
      swipeThreshold: 40,
      swipeMaxDuration: 900,
      preventScrollDuringSwipe: true,
      enabled: !flags.paused,
    }
  );

  const quickViewProduct = quickViewProductId
    ? getProductById(quickViewProductId)
    : undefined;

  const compareProducts = useMemo(
    () =>
      compareIds.map(id => getProductById(id)).filter(Boolean) as DemoProduct[],
    [compareIds]
  );

  const wishlistProducts = useMemo(
    () =>
      wishlist.map(id => getProductById(id)).filter(Boolean) as DemoProduct[],
    [wishlist]
  );

  const recentProducts = useMemo(
    () => recent.map(id => getProductById(id)).filter(Boolean) as DemoProduct[],
    [recent]
  );

  const bundleProducts = useMemo(() => {
    const cartProducts = cartLines
      .map(line => getProductById(line.productId))
      .filter(Boolean) as DemoProduct[];

    if (!cartProducts.length) {
      return demoProducts.filter(p => p.featured).slice(0, 2);
    }

    const tagScores = new Map<string, number>();
    cartProducts.forEach(p => {
      p.tags.forEach(tag => {
        tagScores.set(tag, (tagScores.get(tag) ?? 0) + 1);
      });
    });

    const cartIds = new Set(cartProducts.map(p => p.id));

    return [...demoProducts]
      .filter(p => !cartIds.has(p.id))
      .map(p => {
        const score = p.tags.reduce(
          (sum, tag) => sum + (tagScores.get(tag) ?? 0),
          0
        );
        return { product: p, score };
      })
      .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating)
      .slice(0, 2)
      .map(item => item.product);
  }, [cartLines]);

  return (
    <section
      data-ecom="root"
      data-reduced-motion={flags.reducedMotion ? 'true' : 'false'}
      data-perf={flags.perfMode ? 'true' : 'false'}
      class="relative"
    >
      <div class="rounded-2xl border border-white/10 bg-zinc-950/40 p-5">
        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="space-y-2">
            <p class="font-mono text-xs uppercase tracking-widest text-zinc-400">
              E-commerce showcase
            </p>
            <h3 class="font-display text-2xl font-semibold text-white">
              A full shopping flow — isolated to this page
            </h3>
            <p class="max-w-[80ch] text-sm leading-relaxed text-zinc-300">
              Search, filters, wishlist, compare, mobile-first gallery, quick
              view, cart, promo codes, and a simulated checkout. Nothing here
              touches the rest of the site.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="min-h-touch inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
              onClick={() => setCartOpen(true)}
              data-ecom="cart-button"
              aria-label={`Open cart (${cartCount} items)`}
            >
              Cart
              <span
                class="ml-2 rounded-full bg-white/10 px-2 py-1 text-xs"
                aria-hidden="true"
              >
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              class="min-h-touch inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
              onClick={() => {
                if (compareIds.length === 0) {
                  setToast('Pick 1–3 items to compare.');
                  return;
                }
                setCompareOpen(true);
              }}
              data-ecom="compare-open"
              aria-label={`Open compare (${compareIds.length} selected)`}
            >
              Compare
              <span
                class="ml-2 rounded-full bg-white/10 px-2 py-1 text-xs"
                aria-hidden="true"
              >
                {compareIds.length}
              </span>
            </button>

            <button
              type="button"
              class="min-h-touch inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
              onClick={() => {
                setQuery('');
                setSelectedTags([]);
                setSort('featured');
                setPriceMinCents(priceFloor);
                setPriceMaxCents(priceCeil);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div class="relative" role="search">
            <label class="sr-only" htmlFor="demo-ecom-search">
              Search products
            </label>
            <input
              id="demo-ecom-search"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Search products, tags, materials…"
              aria-label="Search products"
              value={query}
              onInput={e =>
                setQuery((e.currentTarget as HTMLInputElement).value)
              }
              ref={searchRef}
              class="min-h-touch w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:ring-2 focus:ring-accent-400"
              autoComplete="off"
              spellcheck={false}
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label class="sr-only" for="demo-ecom-sort">
              Sort
            </label>
            <select
              id="demo-ecom-sort"
              class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent-400"
              value={sort}
              onChange={e =>
                setSort(
                  (e.currentTarget as HTMLSelectElement).value as typeof sort
                )
              }
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>

            <label class="sr-only" for="demo-ecom-view">
              View
            </label>
            <select
              id="demo-ecom-view"
              class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent-400"
              value={view}
              onChange={e =>
                setView(
                  (e.currentTarget as HTMLSelectElement).value as ViewMode
                )
              }
              aria-label="View mode"
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>

            <label class="sr-only" for="demo-ecom-currency">
              Currency
            </label>
            <select
              id="demo-ecom-currency"
              class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent-400"
              value={currency}
              onChange={e =>
                setCurrency(
                  (e.currentTarget as HTMLSelectElement).value as Currency
                )
              }
              aria-label="Currency"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div class="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Price range
            </p>
            <div class="mt-2 grid gap-2">
              <div class="flex items-center justify-between text-xs text-zinc-300">
                <span>{money(priceMinCents)}</span>
                <span>{money(priceMaxCents)}</span>
              </div>
              <div class="grid gap-2">
                <label class="sr-only" htmlFor="demo-ecom-price-min">
                  Minimum price
                </label>
                <input
                  id="demo-ecom-price-min"
                  type="range"
                  min={priceFloor}
                  max={priceCeil}
                  step={100}
                  value={priceMinCents}
                  onInput={e => {
                    const v = Number(
                      (e.currentTarget as HTMLInputElement).value
                    );
                    setPriceMinCents(Math.min(v, priceMaxCents));
                  }}
                  class="w-full accent-[color:rgba(99,102,241,0.9)]"
                  aria-label="Minimum price"
                />
                <label class="sr-only" htmlFor="demo-ecom-price-max">
                  Maximum price
                </label>
                <input
                  id="demo-ecom-price-max"
                  type="range"
                  min={priceFloor}
                  max={priceCeil}
                  step={100}
                  value={priceMaxCents}
                  onInput={e => {
                    const v = Number(
                      (e.currentTarget as HTMLInputElement).value
                    );
                    setPriceMaxCents(Math.max(v, priceMinCents));
                  }}
                  class="w-full accent-[color:rgba(99,102,241,0.9)]"
                  aria-label="Maximum price"
                />
              </div>
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Power tips
            </p>
            <ul class="mt-2 space-y-1 text-xs text-zinc-300">
              <li>
                <span class="font-mono text-zinc-200">/</span> focuses search
              </li>
              <li>
                <span class="font-mono text-zinc-200">C</span> opens cart
              </li>
              <li>
                <span class="font-mono text-zinc-200">Esc</span> closes panels
              </li>
              <li>
                Promo codes: <span class="font-mono text-zinc-200">WOW10</span>,{' '}
                <span class="font-mono text-zinc-200">VIP20</span>,{' '}
                <span class="font-mono text-zinc-200">SHIPFREE</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-4 grid gap-3 lg:grid-cols-3">
          <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Storefront intelligence
            </p>
            <div class="mt-3 grid gap-2 text-sm text-zinc-200">
              <div class="flex items-center justify-between">
                <span>Active products</span>
                <span class="font-semibold">
                  {storefrontStats.totalProducts}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>Avg rating</span>
                <span class="font-semibold">
                  {storefrontStats.avgRating.toFixed(1)}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>Reviews</span>
                <span class="font-semibold">
                  {storefrontStats.totalReviews}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>Featured drops</span>
                <span class="font-semibold">{storefrontStats.featured}</span>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Fulfillment window
            </p>
            <div class="mt-3 space-y-2 text-sm text-zinc-200">
              <p>
                Estimated delivery:{' '}
                <span class="font-semibold">{deliveryWindow.label}</span>
              </p>
              <p>
                Shipping method:{' '}
                <span class="font-semibold">
                  {shippingMethod === 'express' ? 'Express' : 'Standard'}
                </span>
              </p>
              <p>
                Routing hub: <span class="font-semibold">{warehouse}</span>
              </p>
              <p class="text-xs text-zinc-500">
                Demo-only routing. Update ZIP for alternate estimates.
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Buyer confidence
            </p>
            <ul class="mt-3 space-y-2 text-xs text-zinc-300">
              <li>• Secure demo checkout</li>
              <li>• 30-day return demo policy</li>
              <li>• Real-time inventory signals</li>
              <li>• Loyalty points on every order</li>
            </ul>
          </div>
        </div>

        <div
          class="mt-4 flex gap-2 overflow-x-auto pb-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {allTags.map(tag => (
            <Chip
              key={tag}
              label={tag}
              selected={selectedTags.includes(tag)}
              onToggle={() => toggleTag(tag)}
            />
          ))}
        </div>

        {wishlistProducts.length ? (
          <div class="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Wishlist
            </p>
            <div class="mt-3 flex gap-3 overflow-x-auto pb-2">
              {wishlistProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  class="min-h-touch flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/10"
                  onClick={() => openQuickView(p)}
                >
                  <img
                    src={p.images[0]}
                    alt=""
                    class="h-10 w-12 rounded-lg border border-white/10 object-cover"
                    loading="lazy"
                  />
                  <span class="whitespace-nowrap font-semibold">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {recentProducts.length ? (
          <div class="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Recently viewed
            </p>
            <div class="mt-3 flex gap-3 overflow-x-auto pb-2">
              {recentProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  class="min-h-touch flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/10"
                  onClick={() => openQuickView(p)}
                >
                  <img
                    src={p.images[0]}
                    alt=""
                    class="h-10 w-12 rounded-lg border border-white/10 object-cover"
                    loading="lazy"
                  />
                  <span class="whitespace-nowrap font-semibold">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {bundleProducts.length ? (
          <div class="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Smart bundle picks
              </p>
              <span class="text-xs text-zinc-500">
                Paired by tag affinity + rating
              </span>
            </div>
            <div class="mt-3 flex gap-3 overflow-x-auto pb-2">
              {bundleProducts.map(p => (
                <div
                  key={p.id}
                  class="flex min-w-[220px] flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <img
                    src={p.images[0]}
                    alt=""
                    class="h-28 w-full rounded-lg border border-white/10 object-cover"
                    loading="lazy"
                  />
                  <div class="space-y-1">
                    <p class="text-xs text-zinc-400">{p.brand}</p>
                    <p class="text-sm font-semibold text-white">{p.name}</p>
                    <p class="text-xs text-zinc-300">{money(p.priceCents)}</p>
                  </div>
                  <button
                    type="button"
                    class="min-h-touch rounded-lg bg-accent-600 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    onClick={() => addToCart(p)}
                  >
                    Add bundle item
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div
        class={
          view === 'grid'
            ? 'mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
            : 'mt-6 grid gap-4'
        }
      >
        {filteredProducts.map(product => {
          const inventoryLabel =
            typeof product.inventory === 'number'
              ? product.inventory <= 10
                ? 'Low stock'
                : product.inventory <= 30
                  ? 'In stock'
                  : 'Ready to ship'
              : 'Limited release';
          const leadTime =
            typeof product.inventory === 'number' && product.inventory <= 10
              ? '48h'
              : '24h';
          const savings = product.compareAtCents
            ? product.compareAtCents - product.priceCents
            : 0;

          return (
            <article
              key={product.id}
              class={
                view === 'grid'
                  ? 'overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/30'
                  : 'overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/30 md:flex'
              }
            >
              <div class={view === 'grid' ? '' : 'md:w-[320px]'}>
                <button
                  type="button"
                  class="block w-full text-left"
                  onClick={() => openQuickView(product)}
                  aria-label={`Open quick view: ${product.name}`}
                  data-ecom="product-open"
                  data-product-id={product.id}
                >
                  <div class="relative">
                    <img
                      src={product.images[0]}
                      alt={`${product.name} hero`}
                      loading="lazy"
                      class={
                        view === 'grid'
                          ? 'aspect-[4/3] w-full object-cover'
                          : 'aspect-[16/10] w-full object-cover'
                      }
                    />
                    <div class="absolute left-3 top-3 flex flex-wrap gap-2">
                      {product.tags.slice(0, 2).map(t => (
                        <span
                          key={t}
                          class="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-zinc-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              </div>

              <div class={view === 'grid' ? '' : 'md:flex-1'}>
                <div class="space-y-2 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-xs text-zinc-400">{product.brand}</p>
                      <h4 class="text-base font-semibold text-white">
                        {product.name}
                      </h4>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-semibold text-white">
                        {money(product.priceCents)}
                      </p>
                      {product.compareAtCents ? (
                        <p class="text-xs text-zinc-400 line-through">
                          {money(product.compareAtCents)}
                        </p>
                      ) : null}
                      {savings > 0 ? (
                        <p class="text-xs font-semibold text-emerald-300">
                          Save {money(savings)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <Rating value={product.rating} />
                      <span class="text-xs text-zinc-400">
                        ({product.reviewCount})
                      </span>
                      {typeof product.inventory === 'number' ? (
                        <span class="text-xs text-zinc-500">
                          · {product.inventory} in stock
                        </span>
                      ) : null}
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="min-h-touch min-w-touch rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                        onClick={e => {
                          e.stopPropagation();
                          toggleWishlist(product.id);
                        }}
                        aria-pressed={wishlist.includes(product.id)}
                        aria-label={
                          wishlist.includes(product.id)
                            ? `Remove ${product.name} from wishlist`
                            : `Add ${product.name} to wishlist`
                        }
                      >
                        {wishlist.includes(product.id) ? '♥' : '♡'}
                      </button>

                      <button
                        type="button"
                        class={
                          compareIds.includes(product.id)
                            ? 'min-h-touch min-w-touch rounded-xl border border-accent-400 bg-accent-500/15 px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-accent-400'
                            : 'min-h-touch min-w-touch rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400'
                        }
                        onClick={e => {
                          e.stopPropagation();
                          toggleCompare(product.id);
                        }}
                        aria-pressed={compareIds.includes(product.id)}
                        aria-label={
                          compareIds.includes(product.id)
                            ? `Remove ${product.name} from compare`
                            : `Add ${product.name} to compare`
                        }
                        data-ecom="compare-toggle"
                      >
                        Compare
                      </button>
                    </div>
                  </div>

                  {view === 'list' ? (
                    <p class="text-sm leading-relaxed text-zinc-300">
                      {product.description}
                    </p>
                  ) : null}

                  <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>{inventoryLabel}</span>
                    <span aria-hidden="true">•</span>
                    <span>Ships in {leadTime}</span>
                  </div>
                </div>

                <div class="border-t border-white/10 p-4">
                  <div class="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      class="min-h-touch w-full rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      onClick={() => {
                        addToCart(product);
                        setCartOpen(true);
                      }}
                      data-ecom="add-to-cart"
                      data-product-id={product.id}
                    >
                      Add to cart
                    </button>
                    <button
                      type="button"
                      class="min-h-touch w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      onClick={() => openQuickView(product)}
                    >
                      Quick view
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Compare modal */}
      {compareOpen ? (
        <div class="fixed inset-0 z-[85]">
          <div
            class="absolute inset-0 bg-black/70"
            onClick={() => setCompareOpen(false)}
            aria-hidden="true"
          />
          <div
            class="safe-area-inset-bottom absolute inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border border-white/10 bg-zinc-950/95 md:inset-0 md:m-auto md:max-h-[84vh] md:w-[min(980px,92vw)] md:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-label="Compare products"
            ref={compareDialogRef}
            data-ecom="compare"
          >
            <div class="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p class="text-base font-semibold text-white">Compare</p>
                <p class="text-xs text-zinc-400">
                  {compareProducts.length} selected
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="min-h-touch rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                  onClick={() => setCompareIds([])}
                >
                  Clear
                </button>
                <button
                  type="button"
                  class="min-h-touch min-w-touch rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                  onClick={() => setCompareOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div class="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-5">
              {compareProducts.length === 0 ? (
                <div class="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-200">
                  Select products with the “Compare” button.
                </div>
              ) : (
                <div class="space-y-4">
                  <div class="grid gap-3 md:grid-cols-3">
                    {compareProducts.map(p => (
                      <div
                        key={p.id}
                        class="rounded-2xl border border-white/10 bg-black/30 p-4"
                      >
                        <div class="flex items-start justify-between gap-3">
                          <div>
                            <p class="text-xs text-zinc-400">{p.brand}</p>
                            <p class="text-base font-semibold text-white">
                              {p.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            class="min-h-touch rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
                            onClick={() =>
                              setCompareIds(prev =>
                                prev.filter(id => id !== p.id)
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                        <img
                          src={p.images[0]}
                          alt=""
                          class="mt-3 aspect-[4/3] w-full rounded-xl border border-white/10 object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>

                  <div class="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div class="grid gap-3 md:grid-cols-3">
                      <div class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                        Price
                      </div>
                      {compareProducts.map(p => (
                        <div
                          key={`${p.id}-price`}
                          class="text-sm text-zinc-100"
                        >
                          <span class="font-semibold">
                            {money(p.priceCents)}
                          </span>
                          {p.compareAtCents ? (
                            <span class="ml-2 text-xs text-zinc-500 line-through">
                              {money(p.compareAtCents)}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <div class="mt-3 grid gap-3 md:grid-cols-3">
                      <div class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                        Rating
                      </div>
                      {compareProducts.map(p => (
                        <div
                          key={`${p.id}-rating`}
                          class="text-sm text-zinc-100"
                        >
                          <Rating value={p.rating} />
                          <span class="ml-2 text-xs text-zinc-400">
                            {p.reviewCount} reviews
                          </span>
                        </div>
                      ))}
                    </div>

                    <div class="mt-3 grid gap-3 md:grid-cols-3">
                      <div class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                        Fulfillment
                      </div>
                      {compareProducts.map(p => (
                        <div
                          key={`${p.id}-fulfillment`}
                          class="text-sm text-zinc-200"
                        >
                          <p>
                            Ships in{' '}
                            {typeof p.inventory === 'number' &&
                            p.inventory <= 10
                              ? '48h'
                              : '24h'}
                          </p>
                          <p class="text-xs text-zinc-500">
                            Routing: {warehouse}
                          </p>
                          <p class="text-xs text-zinc-500">
                            {typeof p.inventory === 'number'
                              ? `${p.inventory} in stock`
                              : 'Limited release'}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div class="mt-3 grid gap-3 md:grid-cols-3">
                      <div class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                        Highlights
                      </div>
                      {compareProducts.map(p => (
                        <div
                          key={`${p.id}-bullets`}
                          class="text-sm text-zinc-200"
                        >
                          <ul class="space-y-1">
                            {p.bullets.slice(0, 3).map(b => (
                              <li key={b} class="flex gap-2">
                                <span
                                  aria-hidden="true"
                                  class="text-accent-400"
                                >
                                  •
                                </span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {compareProducts.some(p => p.specs) ? (
                      <div class="mt-3 grid gap-3 md:grid-cols-3">
                        <div class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                          Specs
                        </div>
                        {compareProducts.map(p => (
                          <div
                            key={`${p.id}-specs`}
                            class="text-sm text-zinc-200"
                          >
                            <ul class="space-y-1">
                              {Object.entries(p.specs ?? {})
                                .slice(0, 4)
                                .map(([k, v]) => (
                                  <li
                                    key={k}
                                    class="flex items-start justify-between gap-3"
                                  >
                                    <span class="text-zinc-400">{k}</span>
                                    <span class="text-right text-zinc-100">
                                      {v}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick view */}
      {quickViewProduct ? (
        <div class="fixed inset-0 z-[80]">
          <div
            class="absolute inset-0 bg-black/70"
            onClick={closeQuickView}
            aria-hidden="true"
          />
          <div
            class="safe-area-inset-bottom absolute inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border border-white/10 bg-zinc-950/95 md:inset-0 md:m-auto md:max-h-[84vh] md:w-[min(980px,92vw)] md:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-label={`${quickViewProduct.name} quick view`}
            ref={quickViewDialogRef}
          >
            <div class="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p class="text-xs text-zinc-400">{quickViewProduct.brand}</p>
                <p class="text-base font-semibold text-white">
                  {quickViewProduct.name}
                </p>
              </div>
              <button
                type="button"
                class="min-h-touch min-w-touch rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                onClick={closeQuickView}
              >
                Close
              </button>
            </div>

            <div class="grid gap-6 overflow-y-auto px-5 py-5 md:grid-cols-2">
              <div class="space-y-3">
                <div
                  class="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30"
                  ref={quickViewGalleryRef}
                >
                  <img
                    src={quickViewProduct.images[quickViewImageIndex]}
                    alt={`${quickViewProduct.name} image ${quickViewImageIndex + 1}`}
                    class={`aspect-[4/3] w-full object-cover ${flags.reducedMotion ? '' : 'transition-transform duration-500'} ${flags.paused ? '' : 'hover:scale-[1.02]'}`}
                    loading="eager"
                  />
                  <div class="absolute inset-x-3 bottom-3 flex items-center justify-between">
                    <button
                      type="button"
                      class="min-h-touch min-w-touch rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-semibold text-white"
                      onClick={() => nextImage(quickViewProduct, -1)}
                      aria-label="Previous image"
                    >
                      Prev
                    </button>
                    <span
                      class="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-zinc-200"
                      aria-hidden="true"
                    >
                      {quickViewImageIndex + 1} /{' '}
                      {quickViewProduct.images.length}
                    </span>
                    <button
                      type="button"
                      class="min-h-touch min-w-touch rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-semibold text-white"
                      onClick={() => nextImage(quickViewProduct, 1)}
                      aria-label="Next image"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-2">
                  {quickViewProduct.images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      class={`overflow-hidden rounded-xl border ${i === quickViewImageIndex ? 'border-accent-400' : 'border-white/10'} bg-black/20`}
                      onClick={() => setQuickViewImageIndex(i)}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img
                        src={src}
                        alt=""
                        class="aspect-[4/3] w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div class="space-y-5">
                <div class="flex items-start justify-between gap-3">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <Rating value={quickViewProduct.rating} />
                      <span class="text-xs text-zinc-400">
                        {quickViewProduct.reviewCount} reviews
                      </span>
                    </div>
                    <p class="text-sm text-zinc-300">
                      {quickViewProduct.description}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-xl font-semibold text-white">
                      {money(quickViewProduct.priceCents)}
                    </p>
                    {quickViewProduct.compareAtCents ? (
                      <p class="text-xs text-zinc-400 line-through">
                        {money(quickViewProduct.compareAtCents)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <ul class="space-y-2 text-sm text-zinc-300">
                  {quickViewProduct.bullets.map(b => (
                    <li key={b} class="flex gap-2">
                      <span aria-hidden="true" class="text-accent-400">
                        •
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {quickViewProduct.specs ? (
                  <div class="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                      Specs
                    </p>
                    <dl class="mt-3 grid gap-2 text-sm text-zinc-200">
                      {Object.entries(quickViewProduct.specs)
                        .slice(0, 6)
                        .map(([key, value]) => (
                          <div
                            key={key}
                            class="flex items-start justify-between gap-3"
                          >
                            <dt class="text-zinc-400">{key}</dt>
                            <dd class="text-right text-zinc-100">{value}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                ) : null}

                <div class="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-200">
                  <p>
                    Estimated delivery:{' '}
                    <span class="font-semibold">{deliveryWindow.label}</span>
                  </p>
                  <p class="text-xs text-zinc-500">Routing hub: {warehouse}</p>
                </div>

                <div class="space-y-3">
                  <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Color
                  </p>
                  <div class="flex flex-wrap gap-2">
                    {quickViewProduct.colors.map(c => (
                      <Swatch
                        key={c.id}
                        color={c}
                        selected={quickViewColorId === c.id}
                        onSelect={() => setQuickViewColorId(c.id)}
                      />
                    ))}
                  </div>
                </div>

                <div class="space-y-3">
                  <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Size
                  </p>
                  <div class="flex flex-wrap gap-2">
                    {quickViewProduct.sizes.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        class={`min-h-touch min-w-touch rounded-xl border px-4 text-sm font-semibold transition ${
                          quickViewSizeId === s.id
                            ? 'border-accent-400 bg-white/10 text-white'
                            : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
                        }`}
                        aria-pressed={quickViewSizeId === s.id}
                        onClick={() => setQuickViewSizeId(s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div class="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    class="min-h-touch rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    onClick={() => {
                      addToCart(quickViewProduct, {
                        colorId: quickViewColorId,
                        sizeId: quickViewSizeId,
                        qty: 1,
                      });
                      setCartOpen(true);
                      closeQuickView();
                    }}
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    class="min-h-touch rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    onClick={() => {
                      setCartOpen(true);
                      closeQuickView();
                    }}
                  >
                    View cart
                  </button>
                </div>

                <div class="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    class="min-h-touch rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    onClick={() => toggleWishlist(quickViewProduct.id)}
                    aria-pressed={wishlist.includes(quickViewProduct.id)}
                  >
                    {wishlist.includes(quickViewProduct.id)
                      ? '♥ Wishlisted'
                      : '♡ Add to wishlist'}
                  </button>
                  <button
                    type="button"
                    class={
                      compareIds.includes(quickViewProduct.id)
                        ? 'min-h-touch rounded-xl border border-accent-400 bg-accent-500/15 px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-accent-400'
                        : 'min-h-touch rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400'
                    }
                    onClick={() => toggleCompare(quickViewProduct.id)}
                    aria-pressed={compareIds.includes(quickViewProduct.id)}
                  >
                    {compareIds.includes(quickViewProduct.id)
                      ? '✓ In compare'
                      : 'Add to compare'}
                  </button>
                </div>

                <p class="text-xs text-zinc-500">
                  Demo checkout only. Use promo code{' '}
                  <span class="font-mono text-zinc-300">WOW10</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cart drawer / sheet */}
      {cartOpen ? (
        <div class="fixed inset-0 z-[90]">
          <div
            class="absolute inset-0 bg-black/70"
            onClick={() => setCartOpen(false)}
            aria-hidden="true"
          />
          <div
            class="safe-area-inset-bottom absolute inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border border-white/10 bg-zinc-950/95 md:inset-y-0 md:left-auto md:right-0 md:w-[min(520px,92vw)] md:rounded-l-3xl md:rounded-tr-none"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            ref={cartDialogRef}
            data-ecom="cart"
          >
            <div class="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p class="text-base font-semibold text-white">Cart</p>
                <p class="text-xs text-zinc-400">
                  {cartCount} item{cartCount === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                class="min-h-touch min-w-touch rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                onClick={() => setCartOpen(false)}
              >
                Close
              </button>
            </div>

            <div class="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-5">
              {checkoutStep === 'cart' ? (
                <>
                  {cartLines.length === 0 ? (
                    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-200">
                      Your cart is empty. Add a product to see the full checkout
                      flow.
                    </div>
                  ) : (
                    <div class="space-y-4">
                      {cartLines.map((line, idx) => {
                        const product = getProductById(line.productId);
                        if (!product) return null;

                        const color = product.colors.find(
                          c => c.id === line.colorId
                        );
                        const size = product.sizes.find(
                          s => s.id === line.sizeId
                        );

                        return (
                          <div
                            key={`${line.productId}-${line.colorId}-${line.sizeId}`}
                            class="rounded-2xl border border-white/10 bg-black/30 p-4"
                          >
                            <div class="flex gap-4">
                              <img
                                src={product.images[0]}
                                alt=""
                                class="h-20 w-24 rounded-xl border border-white/10 object-cover"
                                loading="lazy"
                              />
                              <div class="flex-1">
                                <div class="flex items-start justify-between gap-3">
                                  <div>
                                    <p class="text-sm font-semibold text-white">
                                      {product.name}
                                    </p>
                                    <p class="mt-1 text-xs text-zinc-400">
                                      {color?.label ?? 'Color'} ·{' '}
                                      {size?.label ?? 'Size'}
                                    </p>
                                  </div>
                                  <p class="text-sm font-semibold text-white">
                                    {money(product.priceCents * line.qty)}
                                  </p>
                                </div>

                                <div class="mt-3 flex items-center justify-between gap-3">
                                  <label class="sr-only" htmlFor={`qty-${idx}`}>
                                    Quantity
                                  </label>
                                  <input
                                    id={`qty-${idx}`}
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={99}
                                    aria-label="Quantity"
                                    value={line.qty}
                                    onInput={e =>
                                      setLineQty(
                                        idx,
                                        Number(
                                          (e.currentTarget as HTMLInputElement)
                                            .value
                                        )
                                      )
                                    }
                                    class="min-h-touch w-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-accent-400"
                                    data-ecom="qty"
                                  />
                                  <button
                                    type="button"
                                    class="min-h-touch rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                    onClick={() => removeLine(idx)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div class="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-zinc-300">Subtotal</span>
                          <span class="font-semibold text-white">
                            {money(subtotalCents)}
                          </span>
                        </div>
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-zinc-300">Promo</span>
                          <span class="font-semibold text-white">
                            -{money(promoDiscountCents)}
                          </span>
                        </div>

                        <div class="grid gap-2 rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-zinc-200">
                          <label class="flex items-center justify-between gap-3">
                            <span>
                              Gift wrap
                              <span class="ml-2 text-xs text-zinc-500">
                                +{money(500)}
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={giftWrap}
                              onChange={e =>
                                setGiftWrap(
                                  (e.currentTarget as HTMLInputElement).checked
                                )
                              }
                              aria-label="Add gift wrap"
                              class="h-5 w-5 accent-accent-400"
                            />
                          </label>
                          <label class="flex items-center justify-between gap-3">
                            <span>
                              Package protection
                              <span class="ml-2 text-xs text-zinc-500">
                                +{money(399)}
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={shippingProtection}
                              onChange={e =>
                                setShippingProtection(
                                  (e.currentTarget as HTMLInputElement).checked
                                )
                              }
                              aria-label="Add package protection"
                              class="h-5 w-5 accent-accent-400"
                            />
                          </label>
                        </div>
                        <div class="mt-2 grid gap-2 sm:grid-cols-2">
                          <label
                            class="sr-only"
                            htmlFor="demo-ecom-shipping-method"
                          >
                            Shipping method
                          </label>
                          <select
                            id="demo-ecom-shipping-method"
                            class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent-400"
                            value={shippingMethod}
                            onChange={e =>
                              setShippingMethod(
                                (e.currentTarget as HTMLSelectElement)
                                  .value as ShippingMethod
                              )
                            }
                            aria-label="Shipping method"
                          >
                            <option value="standard">Standard</option>
                            <option value="express">Express</option>
                          </select>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="ZIP (estimator)"
                            aria-label="ZIP code"
                            value={shippingZip}
                            onInput={e =>
                              setShippingZip(
                                (e.currentTarget as HTMLInputElement).value
                              )
                            }
                            class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-accent-400"
                            autoComplete="postal-code"
                          />
                        </div>
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-zinc-300">Shipping</span>
                          <span class="font-semibold text-white">
                            {shippingCents === 0
                              ? 'Free'
                              : money(shippingCents)}
                          </span>
                        </div>
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-zinc-300">Tax</span>
                          <span class="font-semibold text-white">
                            {money(taxCents)}
                          </span>
                        </div>
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-zinc-300">Add-ons</span>
                          <span class="font-semibold text-white">
                            {money(addOnCents)}
                          </span>
                        </div>
                        <div class="flex items-center justify-between border-t border-white/10 pt-3">
                          <span class="text-sm font-semibold text-zinc-200">
                            Total
                          </span>
                          <span
                            class="text-lg font-semibold text-white"
                            data-ecom="total"
                          >
                            {money(totalCents)}
                          </span>
                        </div>

                        {savingsCents > 0 ? (
                          <div class="flex items-center justify-between text-xs text-emerald-300">
                            <span>Savings</span>
                            <span>-{money(savingsCents)}</span>
                          </div>
                        ) : null}
                        <div class="flex items-center justify-between text-xs text-zinc-400">
                          <span>Loyalty points</span>
                          <span>+{loyaltyPoints}</span>
                        </div>

                        <div class="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            inputMode="text"
                            placeholder="Promo code (WOW10 / VIP20 / SHIPFREE)"
                            aria-label="Promo code"
                            value={promoCode}
                            onInput={e =>
                              setPromoCode(
                                (e.currentTarget as HTMLInputElement).value
                              )
                            }
                            class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-accent-400"
                          />
                          <button
                            type="button"
                            class="min-h-touch rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400"
                            onClick={() => setCheckoutStep('shipping')}
                            data-ecom="checkout"
                          >
                            Checkout
                          </button>
                        </div>

                        <button
                          type="button"
                          class="min-h-touch w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                          onClick={clearCart}
                        >
                          Clear cart
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}

              {checkoutStep === 'shipping' ? (
                <div class="space-y-4">
                  <p class="text-sm text-zinc-300">Shipping details (demo)</p>
                  <div class="grid gap-3">
                    <input
                      aria-label="Full name"
                      class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-400"
                      placeholder="Full name"
                      autoComplete="name"
                    />
                    <input
                      aria-label="Email"
                      class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-400"
                      placeholder="Email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                    />
                    <input
                      aria-label="Address"
                      class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-400"
                      placeholder="Address"
                      autoComplete="street-address"
                    />
                    <div class="grid grid-cols-2 gap-3">
                      <input
                        aria-label="City"
                        class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-400"
                        placeholder="City"
                        autoComplete="address-level2"
                      />
                      <input
                        aria-label="ZIP"
                        class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-400"
                        placeholder="ZIP"
                        inputMode="numeric"
                        autoComplete="postal-code"
                      />
                    </div>
                  </div>

                  <div class="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      class="min-h-touch rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      onClick={() => setCheckoutStep('cart')}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      class="min-h-touch rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      onClick={() => setCheckoutStep('payment')}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : null}

              {checkoutStep === 'payment' ? (
                <div class="space-y-4">
                  <p class="text-sm text-zinc-300">Payment (demo)</p>
                  <div class="grid gap-3">
                    <input
                      aria-label="Card number"
                      class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-400"
                      placeholder="Card number"
                      inputMode="numeric"
                      autoComplete="cc-number"
                    />
                    <div class="grid grid-cols-2 gap-3">
                      <input
                        aria-label="Expiry date"
                        class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-400"
                        placeholder="MM/YY"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                      />
                      <input
                        aria-label="Security code"
                        class="min-h-touch rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-400"
                        placeholder="CVC"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                      />
                    </div>
                  </div>

                  <div class="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      class="min-h-touch rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      onClick={() => setCheckoutStep('shipping')}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      class="min-h-touch rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      onClick={() => setCheckoutStep('confirm')}
                    >
                      Place order
                    </button>
                  </div>
                </div>
              ) : null}

              {checkoutStep === 'confirm' ? (
                <div class="space-y-4">
                  <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p class="text-base font-semibold text-white">
                      Order confirmed (demo)
                    </p>
                    <p class="mt-2 text-sm text-zinc-300">
                      This is a simulated checkout for demonstration purposes.
                    </p>
                    <p class="mt-3 text-sm text-zinc-200">
                      Total charged:{' '}
                      <span class="font-semibold">{money(totalCents)}</span>
                    </p>
                    <p class="mt-2 text-xs text-zinc-400">
                      Add-ons: {money(addOnCents)} · Loyalty points earned:{' '}
                      {loyaltyPoints}
                    </p>
                  </div>

                  <button
                    type="button"
                    class="min-h-touch w-full rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    onClick={() => {
                      clearCart();
                      setCheckoutStep('cart');
                      setCartOpen(false);
                    }}
                  >
                    Back to demo
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <style>
        {`
          [data-ecom="root"][data-reduced-motion="true"] * {
            scroll-behavior: auto !important;
            transition-duration: 0ms !important;
            animation-duration: 0ms !important;
          }

          /* Keep overscroll from feeling "stuck" behind the modal on iOS. */
          .demo-ecom-open {
            overscroll-behavior: none;
          }
        `}
      </style>

      {toast ? (
        <div class="fixed bottom-6 left-0 right-0 z-[95] flex justify-center px-4">
          <div class="rounded-full border border-white/10 bg-black/80 px-4 py-2 text-sm font-semibold text-zinc-100 backdrop-blur">
            {toast}
          </div>
        </div>
      ) : null}
    </section>
  );
}

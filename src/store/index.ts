/**
 * Application State Stores
 * Comprehensive state management using nanostores
 */

import { atom, map, computed } from 'nanostores';
import { THEME_CONFIG } from '../consts';

// ============================================================================
// THEME STORE
// ============================================================================

export type Theme = 'ops-center' | 'corporate' | 'terminal';
export type ColorScheme = 'light' | 'dark' | 'system';
export type ExperienceMode = 'cinematic' | 'editorial' | 'blueprint';

const THEME_CHROME: Record<Theme, string> = {
  'ops-center': '#070809',
  corporate: '#f8fafc',
  terminal: '#041108',
};

const EXPERIENCE_MODE_STORAGE_KEY = 'chicagos-msp-experience-mode';

export const theme = atom<Theme>('ops-center');
export const colorScheme = atom<ColorScheme>('system');
export const accentColor = atom<string>('#3b82f6');
export const experienceMode = atom<ExperienceMode>('cinematic');

export function setTheme(newTheme: Theme) {
  theme.set(newTheme);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_CONFIG.storageKey, newTheme);
    localStorage.setItem('theme', newTheme);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = newTheme;
    const chromeColor = THEME_CHROME[newTheme];
    document
      .querySelectorAll('meta[name="theme-color"][data-theme-color]')
      .forEach(meta => meta.setAttribute('content', chromeColor));

    // Handle dark mode class for Tailwind
    if (newTheme === 'corporate') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }
}

export function setColorScheme(scheme: ColorScheme) {
  colorScheme.set(scheme);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('colorScheme', scheme);
  }
  applyColorScheme(scheme);
}

function applyColorScheme(scheme: ColorScheme) {
  if (typeof document === 'undefined') return;

  if (scheme === 'system') {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', scheme === 'dark');
  }
}

export function setAccentColor(color: string) {
  accentColor.set(color);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('accentColor', color);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--accent-color', color);
  }
}

export function setExperienceMode(newMode: ExperienceMode) {
  experienceMode.set(newMode);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(EXPERIENCE_MODE_STORAGE_KEY, newMode);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.experienceMode = newMode;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('chicagos-msp:experience-mode-updated', {
        detail: { mode: newMode },
      })
    );
  }
}

export function initializeExperienceMode() {
  if (typeof localStorage !== 'undefined') {
    const savedMode = localStorage.getItem(
      EXPERIENCE_MODE_STORAGE_KEY
    ) as ExperienceMode | null;
    setExperienceMode(savedMode ?? 'cinematic');
    return;
  }

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.experienceMode = 'cinematic';
  }
}

export function initializeTheme() {
  if (typeof localStorage !== 'undefined') {
    const savedTheme = (localStorage.getItem(THEME_CONFIG.storageKey) ||
      localStorage.getItem('theme')) as Theme;
    const savedScheme = localStorage.getItem('colorScheme') as ColorScheme;
    const savedAccent = localStorage.getItem('accentColor');

    if (savedTheme) setTheme(savedTheme);
    else setTheme('ops-center');

    if (savedScheme) setColorScheme(savedScheme);
    if (savedAccent) setAccentColor(savedAccent);
  }

  // Listen for system color scheme changes
  if (typeof window !== 'undefined') {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (colorScheme.get() === 'system') {
          applyColorScheme('system');
        }
      });
  }
}

// ============================================================================
// NOTIFICATIONS STORE
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

export const notifications = atom<Notification[]>([]);

let notificationId = 0;

export function addNotification(
  notification: Omit<Notification, 'id' | 'createdAt'>
): string {
  const id = `notification-${++notificationId}`;
  const newNotification: Notification = {
    ...notification,
    id,
    duration: notification.duration ?? 5000,
    dismissible: notification.dismissible ?? true,
    createdAt: Date.now(),
  };

  notifications.set([...notifications.get(), newNotification]);

  // Auto-dismiss after duration
  if (newNotification.duration && newNotification.duration > 0) {
    setTimeout(() => {
      dismissNotification(id);
    }, newNotification.duration);
  }

  return id;
}

export function dismissNotification(id: string) {
  notifications.set(notifications.get().filter(n => n.id !== id));
}

export function clearAllNotifications() {
  notifications.set([]);
}

// Convenience functions
export const notify = {
  info: (title: string, message?: string) =>
    addNotification({ type: 'info', title, message }),
  success: (title: string, message?: string) =>
    addNotification({ type: 'success', title, message }),
  warning: (title: string, message?: string) =>
    addNotification({ type: 'warning', title, message }),
  error: (title: string, message?: string) =>
    addNotification({ type: 'error', title, message, duration: 10000 }),
};

// ============================================================================
// MODAL STORE
// ============================================================================

export interface ModalState {
  isOpen: boolean;
  component: string | null;
  props: Record<string, unknown>;
  onClose?: () => void;
}

export const modal = atom<ModalState>({
  isOpen: false,
  component: null,
  props: {},
});

export function openModal(
  component: string,
  props: Record<string, unknown> = {},
  onClose?: () => void
) {
  modal.set({
    isOpen: true,
    component,
    props,
    onClose,
  });
}

export function closeModal() {
  const currentModal = modal.get();
  currentModal.onClose?.();
  modal.set({
    isOpen: false,
    component: null,
    props: {},
  });
}

// ============================================================================
// UI PREFERENCES STORE
// ============================================================================

export interface UIPreferences {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;
  compactMode: boolean;
  showLineNumbers: boolean;
  showMinimap: boolean;
}

const defaultPreferences: UIPreferences = {
  sidebarCollapsed: false,
  sidebarWidth: 280,
  fontSize: 'medium',
  reducedMotion: false,
  highContrast: false,
  compactMode: false,
  showLineNumbers: true,
  showMinimap: false,
};

export const uiPreferences = map<UIPreferences>(defaultPreferences);

export function setPreference<K extends keyof UIPreferences>(
  key: K,
  value: UIPreferences[K]
) {
  uiPreferences.setKey(key, value);
  savePreferences();
}

export function togglePreference(key: keyof UIPreferences) {
  const current = uiPreferences.get();
  if (typeof current[key] === 'boolean') {
    setPreference(key, !current[key] as UIPreferences[typeof key]);
  }
}

function savePreferences() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('uiPreferences', JSON.stringify(uiPreferences.get()));
  }
}

export function loadPreferences() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('uiPreferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([key, value]) => {
          if (key in defaultPreferences) {
            uiPreferences.setKey(
              key as keyof UIPreferences,
              value as UIPreferences[keyof UIPreferences]
            );
          }
        });
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }

  // Detect system preferences
  if (typeof window !== 'undefined') {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      uiPreferences.setKey('reducedMotion', true);
    }
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      uiPreferences.setKey('highContrast', true);
    }
  }
}

// ============================================================================
// NAVIGATION STORE
// ============================================================================

export interface NavigationState {
  currentPath: string;
  previousPath: string | null;
  isNavigating: boolean;
  breadcrumbs: Array<{ label: string; href: string }>;
}

export const navigation = map<NavigationState>({
  currentPath: '/',
  previousPath: null,
  isNavigating: false,
  breadcrumbs: [],
});

export function setCurrentPath(path: string) {
  const current = navigation.get();
  navigation.set({
    ...current,
    previousPath: current.currentPath,
    currentPath: path,
    isNavigating: false,
  });
}

export function setNavigating(isNavigating: boolean) {
  navigation.setKey('isNavigating', isNavigating);
}

export function setBreadcrumbs(
  breadcrumbs: Array<{ label: string; href: string }>
) {
  navigation.setKey('breadcrumbs', breadcrumbs);
}

// ============================================================================
// SEARCH STORE
// ============================================================================

export interface SearchState {
  query: string;
  isOpen: boolean;
  isLoading: boolean;
  results: Array<{
    id: string;
    title: string;
    description?: string;
    category?: string;
    url: string;
    score?: number;
  }>;
  recentSearches: string[];
  selectedIndex: number;
}

export const search = map<SearchState>({
  query: '',
  isOpen: false,
  isLoading: false,
  results: [],
  recentSearches: [],
  selectedIndex: -1,
});

export function setSearchQuery(query: string) {
  search.setKey('query', query);
  search.setKey('selectedIndex', -1);
}

export function toggleSearch() {
  const current = search.get();
  search.setKey('isOpen', !current.isOpen);
  if (!current.isOpen) {
    search.setKey('query', '');
    search.setKey('results', []);
    search.setKey('selectedIndex', -1);
  }
}

export function openSearch() {
  search.setKey('isOpen', true);
}

export function closeSearch() {
  search.set({
    ...search.get(),
    isOpen: false,
    query: '',
    results: [],
    selectedIndex: -1,
  });
}

export function setSearchResults(results: SearchState['results']) {
  search.setKey('results', results);
  search.setKey('isLoading', false);
}

export function setSearchLoading(loading: boolean) {
  search.setKey('isLoading', loading);
}

export function addRecentSearch(query: string) {
  const current = search.get();
  const filtered = current.recentSearches.filter(s => s !== query);
  const updated = [query, ...filtered].slice(0, 10);
  search.setKey('recentSearches', updated);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }
}

export function loadRecentSearches() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        search.setKey('recentSearches', JSON.parse(saved));
      } catch {
        // Invalid JSON
      }
    }
  }
}

export function navigateSearchResults(direction: 'up' | 'down') {
  const current = search.get();
  const { results, selectedIndex } = current;

  if (results.length === 0) return;

  let newIndex: number;
  if (direction === 'down') {
    newIndex = selectedIndex < results.length - 1 ? selectedIndex + 1 : 0;
  } else {
    newIndex = selectedIndex > 0 ? selectedIndex - 1 : results.length - 1;
  }

  search.setKey('selectedIndex', newIndex);
}

// ============================================================================
// FORM STATE STORE
// ============================================================================

export interface FormState<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isSubmitting: boolean;
  isValid: boolean;
}

export function createFormStore<T extends Record<string, unknown>>(
  initialValues: T,
  validate?: (values: T) => Partial<Record<keyof T, string>>
) {
  const form = map<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isDirty: false,
    isSubmitting: false,
    isValid: true,
  });

  const runValidation = () => {
    if (validate) {
      const errors = validate(form.get().values);
      form.setKey('errors', errors);
      form.setKey('isValid', Object.keys(errors).length === 0);
    }
  };

  return {
    store: form,

    setValue: <K extends keyof T>(field: K, value: T[K]) => {
      const current = form.get();
      form.set({
        ...current,
        values: { ...current.values, [field]: value },
        isDirty: true,
      });
      runValidation();
    },

    setValues: (values: Partial<T>) => {
      const current = form.get();
      form.set({
        ...current,
        values: { ...current.values, ...values },
        isDirty: true,
      });
      runValidation();
    },

    setTouched: (field: keyof T) => {
      const current = form.get();
      form.setKey('touched', { ...current.touched, [field]: true });
    },

    setError: (field: keyof T, error: string) => {
      const current = form.get();
      form.setKey('errors', { ...current.errors, [field]: error });
      form.setKey('isValid', false);
    },

    clearError: (field: keyof T) => {
      const current = form.get();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [field]: removed, ...rest } = current.errors;
      form.setKey('errors', rest as Partial<Record<keyof T, string>>);
      runValidation();
    },

    reset: () => {
      form.set({
        values: initialValues,
        errors: {},
        touched: {},
        isDirty: false,
        isSubmitting: false,
        isValid: true,
      });
    },

    setSubmitting: (isSubmitting: boolean) => {
      form.setKey('isSubmitting', isSubmitting);
    },

    handleSubmit: async (onSubmit: (values: T) => Promise<void> | void) => {
      const current = form.get();

      // Mark all fields as touched
      const allTouched: Partial<Record<keyof T, boolean>> = {};
      Object.keys(current.values).forEach(key => {
        allTouched[key as keyof T] = true;
      });
      form.setKey('touched', allTouched);

      runValidation();

      if (!form.get().isValid) {
        return;
      }

      form.setKey('isSubmitting', true);

      try {
        await onSubmit(current.values);
        form.set({
          ...form.get(),
          isDirty: false,
          isSubmitting: false,
        });
      } catch (error) {
        form.setKey('isSubmitting', false);
        throw error;
      }
    },

    getFieldProps: (field: keyof T) => {
      const current = form.get();
      return {
        value: current.values[field],
        error: current.touched[field] ? current.errors[field] : undefined,
        onBlur: () => {
          const c = form.get();
          form.setKey('touched', { ...c.touched, [field]: true });
        },
      };
    },
  };
}

// ============================================================================
// LOADING STATES STORE
// ============================================================================

export const loadingStates = map<Record<string, boolean>>({});

export function setLoading(key: string, isLoading: boolean) {
  loadingStates.setKey(key, isLoading);
}

export function isLoading(key: string): boolean {
  return loadingStates.get()[key] ?? false;
}

export const globalLoading = computed(loadingStates, states => {
  return Object.values(states).some(Boolean);
});

// ============================================================================
// FEATURE FLAGS STORE
// ============================================================================

export interface FeatureFlags {
  [key: string]: boolean;
}

export const featureFlags = atom<FeatureFlags>({});

export function setFeatureFlag(key: string, enabled: boolean) {
  featureFlags.set({ ...featureFlags.get(), [key]: enabled });
}

export function isFeatureEnabled(key: string): boolean {
  return featureFlags.get()[key] ?? false;
}

export function loadFeatureFlags(flags: FeatureFlags) {
  featureFlags.set(flags);
}

// ============================================================================
// USER PREFERENCES STORE (for authenticated users)
// ============================================================================

export interface UserData {
  id: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: string | null;
}

export const userData = map<UserData>({
  id: null,
  name: null,
  email: null,
  avatar: null,
  role: null,
});

export const isAuthenticated = computed(userData, user => user.id !== null);

export function setUser(user: Partial<UserData>) {
  const current = userData.get();
  userData.set({ ...current, ...user });
}

export function clearUser() {
  userData.set({
    id: null,
    name: null,
    email: null,
    avatar: null,
    role: null,
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeStores() {
  initializeTheme();
  initializeExperienceMode();
  loadPreferences();
  loadRecentSearches();
}

// Auto-initialize on mount in browser
if (typeof window !== 'undefined') {
  // Defer initialization to avoid SSR issues
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStores);
  } else {
    initializeStores();
  }
}

// TypeScript type definitions for enhanced development experience

/* ==================== GLOBAL TYPES ==================== */

// Enhanced Component Props with modern patterns
export interface BaseComponentProps {
  className?: string;
  children?: string | HTMLElement | HTMLElement[];
  'data-testid'?: string;
}

// Modern design system types
export interface ThemeVariant {
  primary:
    | 'primary-50'
    | 'primary-100'
    | 'primary-200'
    | 'primary-300'
    | 'primary-400'
    | 'primary-500'
    | 'primary-600'
    | 'primary-700'
    | 'primary-800'
    | 'primary-900'
    | 'primary-950';
  accent:
    | 'accent-50'
    | 'accent-100'
    | 'accent-200'
    | 'accent-300'
    | 'accent-400'
    | 'accent-500'
    | 'accent-600'
    | 'accent-700'
    | 'accent-800'
    | 'accent-900'
    | 'accent-950';
  neutral:
    | 'neutral-50'
    | 'neutral-100'
    | 'neutral-200'
    | 'neutral-300'
    | 'neutral-400'
    | 'neutral-500'
    | 'neutral-600'
    | 'neutral-700'
    | 'neutral-800'
    | 'neutral-900'
    | 'neutral-950';
}

// Component size variants
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Animation types
export type AnimationType =
  | 'fade-in'
  | 'slide-in'
  | 'scale-in'
  | 'bounce-in'
  | 'float';

// Responsive breakpoint types
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ==================== UTILITY TYPES ==================== */

// Advanced utility types for better type safety
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & Record<string, never>;

/* ==================== UI COMPONENT TYPES ==================== */

// Modern button component types
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline';
  size?: ComponentSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onClick?: (event: MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
}

// Card component types
export interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: ComponentSize;
  hover?: boolean;
  clickable?: boolean;
  onCardClick?: () => void;
}

// Navigation types
export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
  active?: boolean;
  disabled?: boolean;
  children?: NavigationItem[];
  external?: boolean;
  description?: string;
}

export interface NavigationProps {
  items: NavigationItem[];
  variant?: 'horizontal' | 'vertical' | 'sidebar';
  activeItem?: string;
  onItemClick?: (item: NavigationItem) => void;
  collapsible?: boolean;
  collapsed?: boolean;
}

// Form component types
export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export interface InputProps extends FormFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  autoComplete?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  size?: ComponentSize;
}

// Modal/Dialog types
export interface ModalProps extends BaseComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ComponentSize;
  centerContent?: boolean;
  closable?: boolean;
  backdrop?: 'blur' | 'dark' | 'transparent';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  zIndex?: number;
}

/* ==================== LAYOUT TYPES ==================== */

// Grid system types
export interface GridProps extends BaseComponentProps {
  cols?: number | Partial<Record<Breakpoint, number>>;
  gap?: ComponentSize | Partial<Record<Breakpoint, ComponentSize>>;
  rows?: number | Partial<Record<Breakpoint, number>>;
  autoFit?: boolean;
  autoFill?: boolean;
  minItemWidth?: string;
}

// Container types
export interface ContainerProps extends BaseComponentProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: ComponentSize | Partial<Record<Breakpoint, ComponentSize>>;
  center?: boolean;
}

/* ==================== DATA TYPES ==================== */

// API response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
  success: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search and filtering types
export interface SearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  author?: string;
  sortBy?: 'date' | 'title' | 'popularity' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResult<T = unknown> {
  items: T[];
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
  suggestions?: string[];
  took?: number;
}

/* ==================== THEME TYPES ==================== */

// Theme configuration types
export interface ThemeConfig {
  colors: {
    primary: Record<string, string>;
    accent: Record<string, string>;
    neutral: Record<string, string>;
    semantic: {
      success: Record<string, string>;
      warning: Record<string, string>;
      error: Record<string, string>;
      info: Record<string, string>;
    };
  };
  typography: {
    fontFamily: {
      sans: string[];
      serif: string[];
      mono: string[];
    };
    fontSize: Record<
      string,
      [string, { lineHeight: string; letterSpacing?: string }]
    >;
    fontWeight: Record<string, string>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  boxShadow: Record<string, string>;
  animation: Record<string, string>;
  breakpoints: Record<Breakpoint, string>;
}

// Dark mode types
export type ColorScheme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  isDark: boolean;
  toggle: () => void;
}

/* ==================== EVENT TYPES ==================== */

// Custom event types for better type safety
export interface CustomEvents {
  'theme:change': { scheme: ColorScheme };
  'navigation:change': { from: string; to: string };
  'search:query': { query: string; filters: SearchFilters };
  'modal:open': { id: string };
  'modal:close': { id: string };
  'toast:show': {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  };
}

// Event handler types
export type EventHandler<T extends keyof CustomEvents> = (
  detail: CustomEvents[T]
) => void;

/* ==================== PERFORMANCE TYPES ==================== */

// Performance monitoring types
export interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

export interface LoadingState {
  isLoading: boolean;
  error?: Error | null;
  retry?: () => void;
}

/* ==================== ACCESSIBILITY TYPES ==================== */

// Accessibility enhancement types
export interface A11yProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-disabled'?: boolean;
  'aria-required'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
  role?: string;
  tabIndex?: number;
}

/* ==================== MODULE AUGMENTATION ==================== */

// User preferences type
export interface UserPreferences {
  theme: ColorScheme;
  language: string;
  notifications: boolean;
  timezone?: string;
  [key: string]: unknown;
}

// Session data type
export interface SessionData {
  userId?: string;
  loginTime?: Date;
  lastActivity?: Date;
  [key: string]: unknown;
}

// Custom element properties
export interface CustomElementProps {
  [key: string]: unknown;
}

// Extend global namespace for better TypeScript support
declare global {
  namespace App {
    interface Locals {
      user?: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
        preferences?: UserPreferences;
      };
      session?: {
        id: string;
        userId?: string;
        data: SessionData;
      };
    }
  }

  // Custom element types for web components
  namespace JSX {
    interface IntrinsicElements {
      'theme-toggle': CustomElementProps;
      'search-modal': CustomElementProps;
      'code-block': CustomElementProps;
      'image-gallery': CustomElementProps;
    }
  }

  // Environment variables with proper typing
  interface ImportMetaEnv {
    readonly SITE_URL: string;
    readonly PUBLIC_CONTACT_EMAIL?: string;
    readonly PUBLIC_CONTACT_FORM_ENDPOINT?: string;
    readonly PUBLIC_CONTACT_CALENDAR_URL?: string;
    readonly PUBLIC_CONTACT_CRM_LABEL?: string;
    readonly PUBLIC_ENABLE_ANALYTICS?: string | boolean;
    readonly PUBLIC_API_URL?: string;
    readonly PUBLIC_SITE_URL?: string;
    readonly PUBLIC_BASE_PATH?: string;
    readonly NEXT_PUBLIC_CONTACT_EMAIL?: string;
    readonly NEXT_PUBLIC_CONTACT_FORM_ENDPOINT?: string;
    readonly NEXT_PUBLIC_CONTACT_CALENDAR_URL?: string;
    readonly NEXT_PUBLIC_CONTACT_CRM_LABEL?: string;
    readonly NEXT_PUBLIC_ENABLE_ANALYTICS?: string | boolean;
    readonly NEXT_PUBLIC_API_URL?: string;
    readonly NEXT_PUBLIC_SITE_URL?: string;
    readonly NEXT_PUBLIC_BASE_PATH?: string;
    readonly PUBLIC_GOOGLE_ANALYTICS_ID?: string;
    readonly PUBLIC_ALGOLIA_APP_ID?: string;
    readonly PUBLIC_ALGOLIA_SEARCH_KEY?: string;
    readonly PUBLIC_GITHUB_TOKEN?: string;
    readonly DATABASE_URL?: string;
    readonly REDIS_URL?: string;
    readonly EMAIL_FROM?: string;
    readonly EMAIL_API_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

/* ==================== UTILITY EXPORTS ==================== */

// Function type for better type safety
export type FunctionType = (...args: unknown[]) => unknown;

// Type guards for runtime type checking
export const isString = (value: unknown): value is string =>
  typeof value === 'string';
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number';
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const isArray = <T = unknown>(value: unknown): value is T[] =>
  Array.isArray(value);
export const isFunction = (value: unknown): value is FunctionType =>
  typeof value === 'function';

// Enhanced type assertion utilities
export const assertString = (
  value: unknown,
  message = 'Expected string'
): string => {
  if (!isString(value)) throw new Error(message);
  return value;
};

export const assertNumber = (
  value: unknown,
  message = 'Expected number'
): number => {
  if (!isNumber(value)) throw new Error(message);
  return value;
};

export const assertObject = <T extends Record<string, unknown>>(
  value: unknown,
  message = 'Expected object'
): T => {
  if (!isObject(value)) throw new Error(message);
  return value as T;
};

// Default export for convenient importing
const typeUtils = {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  assertString,
  assertNumber,
  assertObject,
};

export default typeUtils;

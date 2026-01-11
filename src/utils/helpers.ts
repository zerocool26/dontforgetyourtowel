/**
 * Backwards-compatible helpers
 *
 * Some parts of the codebase import from `../utils/helpers`.
 * The canonical implementation lives in `./url`.
 */

export { withBasePath, resolveHref, buildUrl, parseQuery } from './url';

import { BASE_PATH } from '../consts';

const externalPattern = /^(?:[a-z][a-z\d+.-]*:|#)/i;

export const withBasePath = (value = '/') => {
  if (externalPattern.test(value)) return value;

  const base =
    BASE_PATH === '/' ? '/' : `/${BASE_PATH.replace(/^\/+|\/+$/g, '')}/`;
  const path = value.replace(/^\/+/, '');

  if (!path) return base;
  if (path.startsWith(base.replace(/^\//, ''))) return `/${path}`;
  return `${base}${path}`.replace(/\/{2,}/g, '/');
};

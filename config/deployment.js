// Centralized deployment + path configuration
// Works in both Node (build) and browser (import.meta.env) contexts

const defaultEnv =
  typeof process !== 'undefined' && process.env ? process.env : {};

const trimSlashes = (value = '') =>
  String(value)
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');

const normalizeBasePath = (value = '/') => {
  const trimmed = trimSlashes(value);
  if (!trimmed) return '/';
  return `/${trimmed}/`;
};

const hasProtocol = (value = '') => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);

const normalizeUrl = (value = '') => {
  if (!value) return '';
  const candidate = hasProtocol(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    const pathname = url.pathname.endsWith('/')
      ? url.pathname
      : `${url.pathname}/`;
    url.pathname = pathname;
    return url.toString();
  } catch {
    return candidate.endsWith('/') ? candidate : `${candidate}/`;
  }
};

const getEnvValue = (env, keys) => {
  if (!env) return undefined;
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }
  return undefined;
};

const getRepoInfo = env => {
  const repoSlug =
    getEnvValue(env, ['GITHUB_REPOSITORY', 'REPOSITORY', 'REPO']) || '';
  const owner =
    getEnvValue(env, ['GITHUB_OWNER', 'GITHUB_ACTOR', 'REPOSITORY_OWNER']) ||
    '';
  // Intentionally do NOT fall back to `npm_package_name`.
  // npm injects it for local scripts, which would incorrectly force a non-root
  // base path for local dev/build/preview and can make all assets (including 3D)
  // appear broken when hosted under a different path.
  const fallbackRepo = getEnvValue(env, ['REPO_NAME', 'PROJECT_NAME']) || '';

  if (repoSlug.includes('/')) {
    const [slugOwner, slugRepo] = repoSlug.split('/');
    return {
      owner: slugOwner || owner,
      repo: slugRepo || fallbackRepo,
    };
  }

  return {
    owner,
    repo: repoSlug || fallbackRepo,
  };
};

const isUserPagesRepo = (owner, repo) => {
  if (!owner || !repo) return false;
  return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
};

export const deriveBasePath = (env = defaultEnv) => {
  const explicitBase =
    getEnvValue(env, ['BASE_PATH', 'PUBLIC_BASE_PATH', 'BASE_URL']) || '';
  if (explicitBase) {
    return normalizeBasePath(explicitBase);
  }

  const siteUrl = getEnvValue(env, ['SITE_URL', 'PUBLIC_SITE_URL', 'URL']);
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      if (url.pathname && url.pathname !== '/') {
        return normalizeBasePath(url.pathname);
      }
    } catch {
      // ignore invalid URL
    }
  }

  const { owner, repo } = getRepoInfo(env);
  if (repo) {
    if (isUserPagesRepo(owner, repo)) {
      return '/';
    }
    return normalizeBasePath(repo);
  }

  return '/';
};

export const deriveSiteUrl = (
  env = defaultEnv,
  basePath = deriveBasePath(env)
) => {
  const explicitSite = getEnvValue(env, ['SITE_URL', 'PUBLIC_SITE_URL']);
  if (explicitSite) {
    return normalizeUrl(explicitSite);
  }

  const deployUrl = getEnvValue(env, [
    'DEPLOY_URL',
    'URL',
    'VERCEL_URL',
    'CF_PAGES_URL',
  ]);
  if (deployUrl) {
    return normalizeUrl(deployUrl);
  }

  const { owner, repo } = getRepoInfo(env);
  if (owner && repo) {
    if (isUserPagesRepo(owner, repo)) {
      return normalizeUrl(`https://${owner}.github.io/`);
    }
    return normalizeUrl(`https://${owner}.github.io/${repo}/`);
  }

  const normalizedBase = basePath === '/' ? '/' : basePath;
  return normalizeUrl(
    `http://localhost:4321${normalizedBase === '/' ? '/' : normalizedBase}`
  );
};

export const createDeploymentConfig = (env = defaultEnv) => {
  const basePath = deriveBasePath(env);
  const siteUrl = deriveSiteUrl(env, basePath);
  const trimmedBase = trimSlashes(basePath);
  const normalizedBasePath = basePath === '/' ? '/' : `/${trimmedBase}/`;

  const repo = getRepoInfo(env);
  const repoSlug = repo.owner && repo.repo ? `${repo.owner}/${repo.repo}` : '';
  const repoUrl = repoSlug ? `https://github.com/${repoSlug}` : '';

  return {
    basePath: normalizedBasePath,
    siteUrl,
    repo,
    repoSlug,
    repoUrl,
    assetsBase: normalizedBasePath === '/' ? '' : normalizedBasePath,
    scope: normalizedBasePath === '/' ? '/' : normalizedBasePath,
  };
};

export const deploymentConfig = createDeploymentConfig();

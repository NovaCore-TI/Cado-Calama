// OAuth and local development use NEXT_PUBLIC_APP_URL. Search metadata always
// points to the public site, even when the application runs on localhost.
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env) {
  const fallback = 'https://www.cadoodontologia.cl';
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL || fallback);
    if (url.protocol !== 'https:' || url.username || url.password || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.localhost')) return fallback;
    return url.origin;
  } catch { return fallback; }
}

export const SITE_URL = resolveSiteUrl();

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

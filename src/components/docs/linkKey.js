// Two links are the same when they differ only in the parts a share button adds: the fragment,
// share and tracking parameters (Quizlet's ?i=&x=, Google's ?usp= and ?tab=), a leading www.,
// a trailing slash, or Google's /edit or /view. linkKey in lambda/submitDoc/index.mjs is the
// same function, and the server's copy is the one that refuses a duplicate; change both together.
const SHARE_PARAMS = /^(i|x|usp|tab|funnelUUID|fbclid|gclid|utm_\w+)$/i;

export function linkKey(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return String(href).trim().toLowerCase();
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let path = url.pathname.replace(/\/+$/, '');
  if (/(^|\.)google\.com$/.test(host)) path = path.replace(/\/(edit|view|preview)$/, '');
  const params = [...url.searchParams]
    .filter(([name]) => !SHARE_PARAMS.test(name))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join('&');
  return `${host}${path}${params ? `?${params}` : ''}`;
}

// Only web addresses are links; anything else the URL parser accepts (javascript:, data:) is not.
export function isWebLink(href) {
  try {
    const { protocol } = new URL(href);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function hostOf(href) {
  try {
    return new URL(href).hostname;
  } catch {
    return '';
  }
}

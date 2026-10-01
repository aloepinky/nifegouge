// What every discuss command-line tool shares: its arguments, the server's two addresses, and
// the two ways of talking to it. Written once here so a change to the API stage or to how a
// refused request is reported is made in one place.
//
//   const { args, API_URL, MIRROR_URL, apiPost, readMirror } = require('./lib/cli');
//   const { flag, value } = args();

// The production API Gateway stage and the bucket the site reads. Every tool takes `--api=`
// and `--mirror=` to point these at tools/discuss-dev-server.js instead.
const API_URL = 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss';
const MIRROR_URL = process.env.DISCUSS_MIRROR_URL || 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com';

// `--name` is a flag; `--name=value` a value, null when absent.
function args(argv = process.argv.slice(2)) {
  return {
    argv,
    flag: (name) => argv.includes(`--${name}`),
    value: (name) => {
      const hit = argv.find((a) => a.startsWith(`--${name}=`));
      return hit ? hit.slice(name.length + 3) : null;
    },
  };
}

// POSTs one op. With a token it goes as X-Admin-Token; without one the op is an ordinary
// write anybody can make. A refusal throws, carrying the HTTP status as `err.status`.
async function apiPost(api, op, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Admin-Token'] = token;
  const res = await fetch(`${api}/${op}`, { method: 'POST', headers, body: JSON.stringify(body) });
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON body: the status is all there is */ }
  if (!res.ok || data.success === false) {
    const err = new Error(`${op}: ${data.error || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Reads one key off the mirror. Any failure throws, a 404 included; `{ missingOk: true }` turns
// a 404 into null for a caller to whom an absent file means "nothing there yet".
async function readMirror(mirror, key, { missingOk = false } = {}) {
  const res = await fetch(`${mirror}/${key}`, { headers: { 'Cache-Control': 'no-cache' } });
  if (missingOk && res.status === 404) return null;
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
  return res.json();
}

module.exports = { API_URL, MIRROR_URL, args, apiPost, readMirror };

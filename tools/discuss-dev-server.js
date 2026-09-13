#!/usr/bin/env node
//
// Runs lambda/discussApi on localhost against an in-memory DynamoDB and a folder in place of
// the S3 bucket, so every write path — publish, create, restore, relink, figure upload, the
// admin import — can be exercised end to end before it touches an AWS account.
//
//   node tools/discuss-dev-server.js              # http://localhost:8787
//   node tools/discuss-dev-server.js --port=9000
//   node tools/discuss-dev-server.js --reset      # start from an empty table and mirror
//
// Then run the site against it:
//
//   REACT_APP_DISCUSS_API=http://localhost:8787/discuss \
//   REACT_APP_DISCUSS_MIRROR=http://localhost:8787/mirror npm start
//
// and load it with the corpus:
//
//   DISCUSS_ADMIN_TOKEN=dev node tools/discuss-migrate.js --api=http://localhost:8787/discuss
//
// State lives under _discuss-dev/ (gitignored): table.json and mirror/. The admin token is
// `dev` unless DISCUSS_ADMIN_TOKEN is set.
//
// Requires the AWS SDK dev dependencies from package.json; the fakes subclass nothing but
// need the command classes to tell one request from another.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const STATE = path.join(ROOT, '_discuss-dev');
const argv = process.argv.slice(2);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const PORT = Number(value('port') || 8787);

process.env.DISCUSS_ADMIN_TOKEN = process.env.DISCUSS_ADMIN_TOKEN || 'dev';
process.env.DISCUSS_MIRROR_URL = `http://localhost:${PORT}/mirror`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

const TYPES = { '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function main() {
  if (argv.includes('--reset')) fs.rmSync(STATE, { recursive: true, force: true });
  fs.mkdirSync(STATE, { recursive: true });

  const lambdaDir = path.join(ROOT, 'lambda', 'discussApi');
  // The deploy workflow copies the rules in; do the same here so the import resolves.
  fs.copyFileSync(path.join(ROOT, 'tools', 'lib', 'discussRules.mjs'), path.join(lambdaDir, 'discussRules.mjs'));

  const { FakeDynamo, FakeS3 } = await import(pathToFileURL(path.join(__dirname, 'lib', 'fakeAws.mjs')));
  const { setClients } = await import(pathToFileURL(path.join(lambdaDir, 'clients.mjs')));
  const { handler } = await import(pathToFileURL(path.join(lambdaDir, 'index.mjs')));

  const mirrorDir = path.join(STATE, 'mirror');
  const s3 = new FakeS3(mirrorDir);
  setClients({
    dynamo: new FakeDynamo(path.join(STATE, 'table.json')),
    s3,
    // A presigned PUT becomes a plain PUT to this server, which writes the file into the mirror.
    presign: async (command) => `http://localhost:${PORT}/upload/${command.input.Key}`,
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      res.end();
      return;
    }

    // The mirror: plain files, as S3 would serve them (minus the gzip).
    if (url.pathname.startsWith('/mirror/')) {
      const file = path.join(mirrorDir, ...url.pathname.slice('/mirror/'.length).split('/'));
      if (!file.startsWith(mirrorDir) || !fs.existsSync(file)) {
        res.writeHead(404, CORS);
        res.end();
        return;
      }
      res.writeHead(200, { ...CORS, 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(fs.readFileSync(file));
      return;
    }

    // A figure upload in place of the presigned PUT.
    if (url.pathname.startsWith('/upload/') && req.method === 'PUT') {
      const key = url.pathname.slice('/upload/'.length);
      s3.write(key, await readBody(req));
      res.writeHead(200, CORS);
      res.end();
      return;
    }

    if (url.pathname.startsWith('/discuss/')) {
      const op = url.pathname.slice('/discuss/'.length);
      const body = await readBody(req);
      const event = {
        httpMethod: req.method,
        path: url.pathname,
        pathParameters: { proxy: op },
        queryStringParameters: Object.fromEntries(url.searchParams.entries()),
        headers: req.headers,
        body: body.length ? body.toString('utf8') : null,
      };
      const out = await handler(event);
      res.writeHead(out.statusCode, { ...CORS, ...out.headers, 'Content-Type': 'application/json' });
      res.end(out.body);
      console.log(`${req.method} ${url.pathname} -> ${out.statusCode}`);
      return;
    }

    res.writeHead(404, CORS);
    res.end('discuss dev server');
  });

  server.listen(PORT, () => {
    console.log(`discuss dev server on http://localhost:${PORT}`);
    console.log(`  API     http://localhost:${PORT}/discuss/<op>`);
    console.log(`  mirror  http://localhost:${PORT}/mirror/items/index.json`);
    console.log(`  state   ${path.relative(ROOT, STATE)}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

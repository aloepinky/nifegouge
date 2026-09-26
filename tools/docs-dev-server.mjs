#!/usr/bin/env node
//
// Runs lambda/submitDoc on localhost against an in-memory copy of the Docs tables, so the Docs
// pages' votes, outdated votes and link submissions can be tried without writing to production.
//
//   node tools/docs-dev-server.mjs            # http://localhost:8788
//   node tools/docs-dev-server.mjs --reset    # re-copy the live lists before starting
//   node tools/docs-dev-server.mjs --port=9000
//
// Then, in PowerShell:
//
//   $env:REACT_APP_DOCS_API='http://localhost:8788'; $env:PORT=3100; npm start
//
// and open http://localhost:3100/tw4/docs. The first run copies the live documents and links
// through the public read endpoints (read only), and every write lands in
// _docs-dev/tables.json (gitignored), which persists between runs. Opening a document does not
// work locally: that needs a presigned S3 URL, and this server has no bucket.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAMBDA = path.join(ROOT, 'lambda', 'submitDoc', 'index.mjs');
const STATE_DIR = path.join(ROOT, '_docs-dev');
const STATE = path.join(STATE_DIR, 'tables.json');
const LIVE = 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod';

const argv = process.argv.slice(2);
const value = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const PORT = Number(value('port') || 8788);
const KEYS = { NIFEDocuments: 'docId', NIFELinks: 'linkId' };

// --- the tables -----------------------------------------------------------------------------

async function seed() {
  const tables = { NIFEDocuments: {}, NIFELinks: {} };
  for (const program of ['nife', 'tw4primary']) {
    const docs = await (await fetch(`${LIVE}/get-documents?program=${program}`)).json();
    const links = await (await fetch(`${LIVE}/get-links?program=${program}`)).json();
    for (const d of docs.documents || []) tables.NIFEDocuments[d.docId] = { program, ...d };
    for (const l of links.links || []) tables.NIFELinks[l.linkId] = { program, ...l };
  }
  return tables;
}

if (argv.includes('--reset')) fs.rmSync(STATE, { force: true });
fs.mkdirSync(STATE_DIR, { recursive: true });
const tables = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : await seed();
const save = () => fs.writeFileSync(STATE, JSON.stringify(tables, null, 2));
save();

// --- a DynamoDB that understands exactly what index.mjs sends -------------------------------
//
// The Lambda imports its own copy of the SDK, so the patch goes on that copy's client.

const lambdaRequire = createRequire(LAMBDA);
const lib = await import(pathToFileURL(lambdaRequire.resolve('@aws-sdk/lib-dynamodb')));

const conditionFailed = () => Object.assign(new Error('The conditional request failed'), {
  name: 'ConditionalCheckFailedException',
});

// SET a = if_not_exists(a, :zero) + :one | SET a = :v | ADD a :v, comma-separated within a clause.
function applyUpdate(row, expression, values) {
  const clauses = expression.match(/(SET|ADD|REMOVE)\s+[^]*?(?=\s+(?:SET|ADD|REMOVE)\s+|$)/g) || [];
  for (const clause of clauses) {
    const [, verb, body] = clause.match(/^(SET|ADD|REMOVE)\s+([^]*)$/);
    for (const part of body.split(/,(?![^(]*\))/).map((s) => s.trim())) {
      let m;
      if (verb === 'SET' && (m = part.match(/^(\w+) = if_not_exists\(\1, (:\w+)\) \+ (:\w+)$/))) {
        row[m[1]] = (row[m[1]] ?? values[m[2]]) + values[m[3]];
      } else if (verb === 'SET' && (m = part.match(/^(\w+) = (:\w+)$/))) {
        row[m[1]] = values[m[2]];
      } else if (verb === 'ADD' && (m = part.match(/^(\w+) (:\w+)$/))) {
        row[m[1]] = (row[m[1]] || 0) + values[m[2]];
      } else if (verb === 'REMOVE' && /^\w+$/.test(part)) {
        delete row[part];
      } else {
        throw new Error(`docs-dev-server does not understand "${verb} ${part}"`);
      }
    }
  }
}

lib.DynamoDBDocumentClient.prototype.send = async function send(command) {
  const input = command.input;
  const table = tables[input.TableName];
  if (!table) throw new Error(`unknown table ${input.TableName}`);

  if (command instanceof lib.ScanCommand) {
    const prog = input.ExpressionAttributeValues?.[':prog'];
    const items = Object.values(table).filter((r) =>
      !prog || r.program === prog || (prog === 'nife' && r.program === undefined));
    return { Items: structuredClone(items) };
  }
  if (command instanceof lib.GetCommand) {
    return { Item: structuredClone(table[Object.values(input.Key)[0]]) };
  }
  if (command instanceof lib.PutCommand) {
    table[input.Item[KEYS[input.TableName]]] = structuredClone(input.Item);
    save();
    return {};
  }
  if (command instanceof lib.UpdateCommand) {
    const id = Object.values(input.Key)[0];
    if (input.ConditionExpression?.startsWith('attribute_exists') && !table[id]) throw conditionFailed();
    const row = table[id] || (table[id] = { ...input.Key });
    applyUpdate(row, input.UpdateExpression, input.ExpressionAttributeValues || {});
    save();
    return { Attributes: structuredClone(row) };
  }
  throw new Error(`docs-dev-server does not handle ${command.constructor.name}`);
};

const { handler } = await import(pathToFileURL(LAMBDA));

// --- HTTP ---------------------------------------------------------------------------------

const readBody = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
});

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const body = await readBody(req);
  const out = await handler({
    httpMethod: req.method,
    path: url.pathname,
    queryStringParameters: Object.fromEntries(url.searchParams),
    headers: req.headers,
    body: body || null,
  });
  res.writeHead(out.statusCode, { ...out.headers, 'Content-Type': 'application/json' });
  res.end(out.body);
  console.log(`${req.method} ${url.pathname} -> ${out.statusCode}`);
}).listen(PORT, () => {
  const n = (t) => Object.keys(tables[t]).length;
  console.log(`docs dev server on http://localhost:${PORT}`);
  console.log(`  ${n('NIFEDocuments')} documents, ${n('NIFELinks')} links, in ${path.relative(ROOT, STATE)}`);
});

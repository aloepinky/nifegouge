# discussApi

The backend for the Discuss tab — item pages, syllabus documents, figure uploads and the admin
operations — and for the shared jet logs the jet log page offers under Preset Jet Logs. One
Lambda behind one API Gateway proxy resource. Every write lands in DynamoDB and is mirrored to
a public S3 bucket; the site reads only the bucket.

Jet logs share this function rather than having their own because they share everything that
matters: the revision model, the bucket, the admin token and the deploy.

The deploy workflow (`.github/workflows/deploy-lambda.yml`) only updates code, as the IAM
user `github-lambda-deploy`. Its one permission is the inline policy
`deploy-pinksheetmafia-lambdas`: `lambda:UpdateFunctionCode` on `discussApi` and `submitDoc`,
by ARN. A new function's ARN has to be added there before its deploy step
can run; keep the grant that narrow rather than attaching `AWSLambda_FullAccess`. Everything
below is created once, by hand, in the AWS console for `us-east-2`.

## 1. DynamoDB

Five tables, on-demand capacity, everything else default. Create whichever does not exist yet:

| Table | Partition key | Sort key |
|---|---|---|
| `DiscussItems` | `slug` (String) | `rev` (Number) |
| `DiscussSyllabi` | `syllabusId` (String) | `rev` (Number) |
| `JetLogs` | `logId` (String) | `rev` (Number) |
| `Briefs` | `briefId` (String) | `rev` (Number) |
| `EPsLimitsScores` | `board` (String) | `runId` (String) |

`EPsLimitsScores` is the EPs/Limits leaderboard (`scores.mjs`): one row per finished run, keyed
`NIFE#EPs`, `Primary#Limits` and so on, never deleted. Its sort key is a String, unlike the
others.

## 2. S3

Create bucket **`pinksheetmafia-discuss`** (any globally unique name works; put it in
`DISCUSS_BUCKET` and in `MIRROR_BASE_URL` in `src/components/discuss/discussApi.js`).
Uncheck *Block all public access* and acknowledge.

Permissions → Bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pinksheetmafia-discuss/*"
    }
  ]
}
```

Permissions → CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

`PUT` is for figure uploads, which go straight from the browser to a presigned URL.

## 3. IAM policy for the function

Do this after step 4 has created the function and its role. Open the function → **Configuration**
→ **Permissions** → click the role name under *Execution role*. On the role page: **Add
permissions** → **Create inline policy** → **JSON** tab → replace the contents with the policy
below → **Next** → name it `discussApiAccess` → **Create policy**.

Replace `ACCOUNT_ID` with the 12-digit account number, which is in the role's own ARN at the top
of that page (`arn:aws:iam::ACCOUNT_ID:role/...`), and the bucket name if you chose another.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
        "dynamodb:Query", "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:ACCOUNT_ID:table/DiscussItems",
        "arn:aws:dynamodb:us-east-2:ACCOUNT_ID:table/DiscussSyllabi",
        "arn:aws:dynamodb:us-east-2:ACCOUNT_ID:table/JetLogs",
        "arn:aws:dynamodb:us-east-2:ACCOUNT_ID:table/Briefs",
        "arn:aws:dynamodb:us-east-2:ACCOUNT_ID:table/EPsLimitsScores",
        "arn:aws:dynamodb:us-east-2:ACCOUNT_ID:table/NIFEQuestions"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::pinksheetmafia-discuss/*"
    }
  ]
}
```

`TransactWriteItems` is covered by `PutItem` + `UpdateItem` on the table.

**Every table needs its own line.** A missing ARN does not fail at deploy; it fails at the
first write to that table, with an `AccessDeniedException` that names the action and not the
table. If jet logs or briefs 500 while the discuss pages work, this is why.

## 4. Lambda

Create function **`discussApi`**: Author from scratch, runtime Node.js 22.x, handler `index.handler`,
and under *Permissions* leave "Create a new role with basic Lambda permissions" selected. Then go
back to step 3 and add the inline policy to that role.

Configuration → General: timeout **30 s**, memory **512 MB**.

Configuration → Environment variables:

| Name | Value |
|---|---|
| `DISCUSS_ITEMS_TABLE` | `DiscussItems` |
| `DISCUSS_SYLLABI_TABLE` | `DiscussSyllabi` |
| `JETLOGS_TABLE` | `JetLogs` |
| `BRIEFS_TABLE` | `Briefs` (optional; this is the default) |
| `SCORES_TABLE` | `EPsLimitsScores` (optional; this is the default) |
| `QUESTIONS_TABLE` | `NIFEQuestions` (optional; this is the default) |
| `DISCUSS_BUCKET` | `pinksheetmafia-discuss` |
| `DISCUSS_ADMIN_TOKEN` | a long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

Keep the token in a password manager. It is never in the repo or the browser; only
`tools/discuss-migrate.js` and `curl` use it.

The code arrives from the workflow on the next push that touches `lambda/**`. No
`package.json`: the runtime supplies `@aws-sdk/*`.

## 5. API Gateway

REST API `ms8qwr3ond` → Resources → select `/discuss` → Create resource: **Proxy resource**
on, name `proxy`, path `{proxy+}`, CORS on. On its `ANY` method: integration type Lambda,
**Lambda proxy integration on**, function `discussApi`, accept the permission prompt.
Actions → Deploy API → stage `prod`.

`/discuss/{proxy+}` is the only resource under `/discuss`. A static resource beside it would
take precedence over the proxy for its own path.

## 6. First run

```
# existing generated syllabi reach the mirror
curl -X POST https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss/rebuild-index \
  -H "Content-Type: application/json" -H "X-Admin-Token: $DISCUSS_ADMIN_TOKEN" \
  -d '{"what":"syllabi","remirror":true}'

# then the corpus
DISCUSS_ADMIN_TOKEN=... node tools/discuss-migrate.js --dry-run
DISCUSS_ADMIN_TOKEN=... node tools/discuss-migrate.js --verify --fixtures

# and the jet logs, from tools/jetlog-seed.json
DISCUSS_ADMIN_TOKEN=... node tools/jetlog-migrate.js --dry-run
DISCUSS_ADMIN_TOKEN=... node tools/jetlog-migrate.js --verify
```

The briefs have no seed file and no admin import. They are generated from the Briefing Guide
PDF in the browser: open `/tw4/briefs/upload`, choose the PDF, and publish. That is also how a
new edition goes in, as a new revision of each brief.

## Operations

- The old EPs/Limits leaderboards were carried over through the admin `import-scores` op (by
  `tools/leaderboard-migrate.js`, since removed) and their functions, routes and tables deleted
  on 2026-09-24. The tables were exported first to
  the gitignored `_aws-archive/` as plain JSON; `TW4Users.json` holds password hashes.

- Hide a page: `POST hide-item {"slug":"...","hidden":true}` with the admin header.
  Unhide with `hidden:false`.
- Take a syllabus down: `POST hide-syllabus {"id":"...","hidden":true}`.
- Take a jet log down: `POST hide-jetlog {"id":"...","hidden":true}`. It leaves the table and
  comes back with `hidden:false`; only the mirror copy is removed.
- Take a brief down: `POST hide-brief {"id":"...","hidden":true}`, the same as a jet log.
- A stale `items/index.json` (two saves raced): `POST rebuild-index {"what":"items"}`.
  `"jetlogs"`, `"briefs"`, `"questions"` and `"all"` work the same way.
- The NIFE questions (`questions.mjs`) live in `NIFEQuestions`, the table the retired
  `submitQuestion` function wrote (deleted 2026-09-24). Its mirror, `questions/nife/approved.json` and
  `questions/nife/pending.json`, is first built by `POST rebuild-index {"what":"questions"}`
  and rebuilt by every write after that. Approving or rejecting from the page's admin panel
  (`/nife/questions?admin`) asks for the admin token once and keeps it in that browser.
- Roll back a bad jet log: open its **history** from the Preset Jet Logs list on the jet log
  page and restore the revision before it. Nothing is deleted from the table, so the admin
  token is not needed for this.
- Pages and syllabi from before the aircraft and school fields existed:
  `DISCUSS_ADMIN_TOKEN=... node tools/discuss-tag.js --aircraft=T-6B --school=Primary`
  stamps every one that has neither, as a new revision each. Run it once after deploying a
  function that requires the fields; until then a save of an untagged page is refused with
  "The page names no aircraft".
- Roll back a bad revision: open the page's History on the site and restore the one before
  it. Nothing is ever deleted from the table.
- A revision showing a name that should not be on it:
  `DISCUSS_ADMIN_TOKEN=... node tools/discuss-set-author.js --from="Old" --to="New" --slugs=a,b`
  (or `--all`) rewrites the name on every revision of those pages that carries it. The
  documents are untouched.

## Local development

`node tools/discuss-dev-server.js` runs this exact code on `http://localhost:8787` against an
in-memory table and a folder mirror, so every write path can be tried before it touches an
account. See the header of that file.

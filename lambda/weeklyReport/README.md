# weeklyReport

Emails the weekly community-activity report every Sunday at 1800 Central: what needs the admin
(entries removed or one vote from removal, live questions at −10, pending questions), running
totals with the change since the last report, discussion-page, syllabus, brief and jet log edits,
NIFE questions submitted and decided, documents and links added, leaderboard runs and new
all-time records, and the votes cast since the last report. Totals and vote counts are kept in
the snapshot. Your own saves and the seed
tools' (`REPORT_OWN`, default `Loevinger,migration`) are counted, not listed. The report itself is
`report.mjs`, shared with `tools/weekly-report.mjs`, which prints it locally.

Deployed by `.github/workflows/deploy-lambda.yml` like the others. Created by hand once
(2026-09-28), all in us-east-2:

- **Function** `weeklyReport`, nodejs22.x, handler `index.handler`, 512 MB, 120 s. Environment:
  `REPORT_TO` (drew.loevinger@gmail.com), `REPORT_FROM` (`PSM Reports <reports@pinksheetmafia.com>`),
  `REPORT_BUCKET`.
  The Site traffic section reads `PageViews` with `dynamodb:Query` (added for it); without that
  grant the section says the counts are unavailable and the rest of the report goes out.
- **Role** `weeklyReport-role`, inline policy `weeklyReport`: `dynamodb:Scan` on the nine tables it
  reads, get/put on `pinksheetmafia-reports/weekly/*`, `ses:SendEmail` on the two identities below, logs.
  It cannot write to any table.
- **Bucket** `pinksheetmafia-reports`, private (all public access blocked). Holds
  `weekly/votes.json`, last week's vote totals. Not the mirror bucket, which is public-read.
- **SES** identities: the domain pinksheetmafia.com, verified by three DKIM CNAMEs
  (`<token>._domainkey`) in Netlify DNS, and drew.loevinger@gmail.com. The report is sent from
  the domain: sent from the Gmail address through SES, Gmail filed it as spam. The account is in
  the SES sandbox, which is fine for sending to a verified address; another recipient would need
  verifying too. No mailbox exists at reports@; nothing replies to it.
- **Schedule** EventBridge Scheduler `weeklyReport-sunday`, `cron(0 18 ? * SUN *)` in
  `America/Chicago`, invoking through role `weeklyReport-scheduler-role`.
- **Deploy** the ARN is in `github-lambda-deploy`'s inline policy `deploy-pinksheetmafia-lambdas`.

Each report starts where the last sent one ended (the snapshot's `at`), so a Sunday whose send
failed is covered by the next; past five weeks it falls back to the last 7 days.

Invoke with `{"dryRun": true}` (optionally `"days": 14`) to get the report back without sending it
or moving the vote snapshot. A plain invoke sends it and saves the totals, so it resets what the
next Sunday's vote counts cover.

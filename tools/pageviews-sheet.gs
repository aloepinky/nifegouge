// Google Apps Script: fills two tabs of the traffic spreadsheet from the site's own page counts
// (lambda/discussApi/pageviews.mjs, op `page-stats`). Not run by the site or by node; it is
// pasted into the spreadsheet, as below.
//
//   PSM Daily   Date | Visitors | Page views                    one row per day
//   PSM Pages   Date | Section | Page | Views | Visitors        one row per page per day
//
// Your existing tabs are not touched. Point formulas at these, e.g. next to a Netlify row:
//   =IFERROR(VLOOKUP(A2, 'PSM Daily'!A:C, 2, FALSE), "")
//
// Setup, once:
//   1. In the spreadsheet: Extensions > Apps Script. Paste this file over Code.gs and save.
//   2. Project Settings (gear) > Script Properties > Add:
//        STATS_URL    https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss/page-stats
//        STATS_TOKEN  the Lambda's STATS_TOKEN value
//   3. Back in the editor, pick `installDailyTrigger` in the function box and Run. Google asks
//      for permission to edit the spreadsheet and reach an outside address; allow both.
//   4. Pick `updatePageViews` and Run once to fill the tabs now.
//
// Only whole days are copied, through yesterday; today arrives with the next morning's run.
// Every run re-reads the last DAYS_BACK whole days and rewrites them, so a day the trigger
// missed is filled in by the next run, and nothing is entered twice. `backfill` rewrites any
// range (the server keeps every day).

var DAILY = 'PSM Daily';
var PAGES = 'PSM Pages';
var DAYS_BACK = 10;
var ZONE = 'America/Chicago'; // the server's days are Central days

function updatePageViews() {
  var to = dayString_(new Date(Date.now() - 864e5));
  var from = dayString_(new Date(Date.now() - DAYS_BACK * 864e5));
  writeRange_(from, to);
}

// Run from the editor after setting the dates, e.g. backfill('2026-10-06', '2026-10-31').
function backfill(from, to) {
  writeRange_(from, to || dayString_(new Date(Date.now() - 864e5)));
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'updatePageViews') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('updatePageViews').timeBased().everyDays(1).atHour(3).inTimezone(ZONE).create();
}

function dayString_(date) {
  return Utilities.formatDate(date, ZONE, 'yyyy-MM-dd');
}

function fetchDays_(from, to) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('STATS_URL');
  var token = props.getProperty('STATS_TOKEN');
  if (!url || !token) throw new Error('Set STATS_URL and STATS_TOKEN under Project Settings > Script Properties.');
  var res = UrlFetchApp.fetch(url + '?from=' + from + '&to=' + to, {
    headers: { 'X-Stats-Token': token },
    muteHttpExceptions: true,
  });
  var body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200 || !body.success) {
    throw new Error('page-stats answered ' + res.getResponseCode() + ': ' + (body.error || res.getContentText()));
  }
  return body.days;
}

function sheet_(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
  return sh;
}

// Rewrites the rows of `sh` whose date is in `days` with `rows`, keeping every other row, sorted
// by date and then as given.
function replaceDays_(sh, days, rows, width, tz) {
  var keep = [];
  var last = sh.getLastRow();
  if (last > 1) {
    var drop = {};
    days.forEach(function (d) { drop[d] = true; });
    sh.getRange(2, 1, last - 1, width).getValues().forEach(function (r) {
      var d = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0]);
      if (!drop[d]) keep.push(r);
    });
    sh.getRange(2, 1, last - 1, width).clearContent();
  }
  var all = keep.concat(rows);
  var stamp = function (r) { return r[0] instanceof Date ? r[0].getTime() : 0; };
  all = all.map(function (r, i) { return { r: r, i: i }; })
    .sort(function (a, b) { return stamp(a.r) - stamp(b.r) || a.i - b.i; })
    .map(function (x) { return x.r; });
  if (all.length) {
    sh.getRange(2, 1, all.length, width).setValues(all);
    sh.getRange(2, 1, all.length, 1).setNumberFormat('yyyy-mm-dd');
  }
}

function writeRange_(from, to) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var days = [];
  // The server allows 92 days a request.
  for (var start = from; start <= to;) {
    var end = dayString_(new Date(Utilities.parseDate(start, ZONE, 'yyyy-MM-dd').getTime() + 91 * 864e5));
    if (end > to) end = to;
    // A day with no views is before counting began (2026-10-06), not a quiet day: the site
    // never has one. Leaving it out keeps it from reading as a zero beside Netlify's figure.
    days = days.concat(fetchDays_(start, end).filter(function (d) { return d.views > 0; }));
    start = dayString_(new Date(Utilities.parseDate(end, ZONE, 'yyyy-MM-dd').getTime() + 36 * 3600e3));
  }
  var asDate = function (d) { return Utilities.parseDate(d, tz, 'yyyy-MM-dd'); };
  var names = days.map(function (d) { return d.day; });

  var daily = sheet_(ss, DAILY, ['Date', 'Visitors', 'Page views']);
  replaceDays_(daily, names, days.map(function (d) {
    return [asDate(d.day), d.visitors, d.views];
  }), 3, tz);

  var pages = sheet_(ss, PAGES, ['Date', 'Section', 'Page', 'Views', 'Visitors']);
  var rows = [];
  days.forEach(function (d) {
    d.pages.forEach(function (p) {
      rows.push([asDate(d.day), p.path.split('/').slice(0, 3).join('/') || '/', p.path, p.views, p.visitors]);
    });
  });
  replaceDays_(pages, names, rows, 5, tz);
}

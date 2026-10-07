// Google Apps Script: fills two tabs of the traffic spreadsheet from the site's own page counts
// (lambda/discussApi/pageviews.mjs, op `page-stats`). Not run by the site or by node; it is
// pasted into the spreadsheet, as below.
//
//   PSM Daily   Date | Visitors | Page views                    one row per day
//   PSM Sections Date | School | Section | Views | Visitors         one row per school (Section
//                                                                "All") and per section, per day
//   PSM Pages   Date | Section | Page | Views | Visitors | School   one row per page per day
//
// Visitors are counted at each level, not added up: one reader of three Discuss pages is one
// visitor to the section. Until the push that began them only pages were counted, so those days'
// section and school views are added up from their pages and their visitors are left blank.
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
var SECTIONS = 'PSM Sections';
var DAYS_BACK = 10;
var ZONE = 'America/Chicago'; // the server's days are Central days
// The school a page belongs to, by the first part of its address. /tw4 is Primary's old address.
var SCHOOLS = { nife: 'NIFE', primary: 'Primary', tw4: 'Primary', t44c: 'T-44C', t54a: 'T-54A' };

function schoolOf_(path) {
  if (path === '/') return 'Landing page';
  return SCHOOLS[path.split('/')[1]] || 'Other';
}

// The server's school key (lambda/discussApi/pageviews.mjs schoolOf) as the sheet names it.
function schoolName_(key) {
  if (key === 'landing') return 'Landing page';
  return SCHOOLS[key] || 'Other';
}

function sectionOf_(path) {
  if (path === '/' || path === '/(other)') return path;
  return path.split('/').slice(0, 3).join('/');
}

// One day's school and section rows. A day from before they were counted has only pages, and
// the day they began has them for part of the day only (their views fall short of the site's):
// either way its views are added up from pages and its visitors left blank, since those can't be.
function sectionRows_(d, date) {
  var schools = d.schools || [];
  var sections = d.sections || [];
  var counted = schools.reduce(function (n, s) { return n + s.views; }, 0);
  var blank = !schools.length || counted !== d.views;
  if (blank) {
    var bySchool = {};
    var bySection = {};
    d.pages.forEach(function (p) {
      var school = schoolOf_(p.path);
      var section = sectionOf_(p.path);
      bySchool[school] = (bySchool[school] || 0) + p.views;
      bySection[section] = (bySection[section] || 0) + p.views;
    });
    schools = Object.keys(bySchool).map(function (k) { return { name: k, views: bySchool[k], visitors: '' }; });
    sections = Object.keys(bySection).map(function (k) { return { section: k, views: bySection[k], visitors: '' }; });
  } else {
    schools = schools.map(function (s) { return { name: schoolName_(s.school), views: s.views, visitors: s.visitors }; });
  }
  var rows = [];
  schools.sort(function (a, b) { return b.views - a.views; }).forEach(function (s) {
    rows.push([date, s.name, 'All', s.views, s.visitors]);
    sections.filter(function (x) { return schoolOf_(x.section) === s.name; })
      .sort(function (a, b) { return b.views - a.views; })
      .forEach(function (x) { rows.push([date, s.name, x.section, x.views, x.visitors]); });
  });
  return rows;
}

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

// The tab, created if missing. The header is rewritten every run, so a column added to the
// script appears on a tab made before it.
function sheet_(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.setFrozenRows(1);
  }
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  return sh;
}

// The last row with a date in column A. Not getLastRow(): a formula someone adds in another
// column (an ARRAYFORMULA fills to the bottom) would make every empty row look like data.
function lastDataRow_(sh) {
  var n = sh.getMaxRows();
  if (n < 2) return 1;
  var col = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i -= 1) {
    if (col[i][0] !== '' && col[i][0] !== null) return i + 2;
  }
  return 1;
}

// Rewrites the rows of `sh` whose date is in `days` with `rows`, keeping every other row, sorted
// by date and then as given.
function replaceDays_(sh, days, rows, width, tz) {
  var keep = [];
  var last = lastDataRow_(sh);
  if (last > 1) {
    var drop = {};
    days.forEach(function (d) { drop[d] = true; });
    sh.getRange(2, 1, last - 1, width).getValues().forEach(function (r) {
      var d = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0]);
      if (r[0] !== '' && !drop[d]) keep.push(r);
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

  var sectionsSheet = sheet_(ss, SECTIONS, ['Date', 'School', 'Section', 'Views', 'Visitors']);
  var sectionRows = [];
  days.forEach(function (d) { sectionRows = sectionRows.concat(sectionRows_(d, asDate(d.day))); });
  replaceDays_(sectionsSheet, names, sectionRows, 5, tz);

  var pages = sheet_(ss, PAGES, ['Date', 'Section', 'Page', 'Views', 'Visitors', 'School']);
  var rows = [];
  days.forEach(function (d) {
    d.pages.forEach(function (p) {
      rows.push([asDate(d.day), p.path.split('/').slice(0, 3).join('/') || '/', p.path, p.views, p.visitors, schoolOf_(p.path)]);
    });
  });
  replaceDays_(pages, names, rows, 6, tz);
}

// Reads a KML file's placemarks with the folder path each sits in, without an XML library:
// public/kml/course-rules.kml is written by hand in Google Earth, so its shape is plain
// (Folder > name, Placemark > name + one geometry). Returns [{ path: [...folders], name, coords }],
// coords as [lat, lon] pairs.

const fs = require('fs');

function kmlPlacemarks(file) {
  const text = fs.readFileSync(file, 'utf8');
  const tokens = /<Folder[\s>]|<\/Folder>|<Placemark[\s>][\s\S]*?<\/Placemark>|<name>([\s\S]*?)<\/name>/g;
  const stack = [];
  let awaitingName = false;
  const out = [];
  let m;
  while ((m = tokens.exec(text))) {
    const t = m[0];
    if (t.startsWith('<Folder')) { stack.push(''); awaitingName = true; }
    else if (t === '</Folder>') stack.pop();
    else if (t.startsWith('<name>')) {
      if (awaitingName) { stack[stack.length - 1] = m[1].trim(); awaitingName = false; }
    } else {
      awaitingName = false;
      const name = (/<name>([\s\S]*?)<\/name>/.exec(t) || [])[1];
      const raw = (/<coordinates>([\s\S]*?)<\/coordinates>/.exec(t) || [])[1] || '';
      const coords = raw.trim().split(/\s+/).filter(Boolean).map((c) => {
        const [lon, lat] = c.split(',').map(Number);
        return [lat, lon];
      });
      out.push({ path: [...stack], name: (name || '').trim(), coords });
    }
  }
  return out;
}

module.exports = { kmlPlacemarks };

// The Practice Flight's map: the course rules lines and points from the same KML the Course
// Rules page draws, showing only the flight so far (dimmed), where you are, and the legs you
// can pick next (dashed; a click picks one).
//
// A course rules id ends in the placemark's position in the KML (`Routes-Departures-162` is
// the 163rd placemark), so the KML's features are looked up by that number.

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { kml } from '@tmcw/togeojson';
import 'leaflet/dist/leaflet.css';
import { feature, labelOf } from './legs';

let loaded = null;
function loadFeatures() {
  if (!loaded) {
    loaded = fetch('/kml/course-rules.kml')
      .then((r) => r.text())
      .then((text) => kml(new DOMParser().parseFromString(text, 'text/xml')).features)
      .catch((err) => { loaded = null; throw err; });
  }
  return loaded;
}

const indexOf = (id) => Number(String(id).split('-').pop());

function Layers({ features, route, node, options, onChoose }) {
  const map = useMap();
  const group = useRef(null);

  useEffect(() => {
    if (!group.current) group.current = L.layerGroup().addTo(map);
    const g = group.current;
    g.clearLayers();

    const drawn = new Map();
    const draw = (id, cls, click) => {
      const f = features[indexOf(id)];
      if (!f || drawn.has(id)) return;
      if (process.env.NODE_ENV !== 'production' && f.properties?.name !== feature(id)?.name) {
        // eslint-disable-next-line no-console
        console.warn(`Practice map: ${id} is "${f.properties?.name}" in the KML, "${feature(id)?.name}" in the course rules`);
      }
      const layer = L.geoJSON(f, {
        style: () => ({ className: cls }),
        pointToLayer: (_, latlng) => L.circleMarker(latlng, { radius: 6, className: cls }),
      });
      layer.bindTooltip(labelOf(id), { sticky: true });
      if (click) layer.on('click', () => onChoose(id));
      drawn.set(id, layer);
    };

    // Landmarks that go with where you are, then the flight so far, then the choices.
    (feature(node)?.dependentNode || []).forEach((id) => draw(id, 'pf-map-landmark'));
    options.forEach((id) => draw(id, 'pf-map-option', true));
    draw(node, 'pf-map-current');
    route.forEach((id) => draw(id, 'pf-map-flown'));

    drawn.forEach((layer) => layer.addTo(g));
    // Working areas underneath, so the lines over them can be clicked.
    drawn.forEach((layer) => layer.eachLayer((l) => { if (l instanceof L.Polygon) l.bringToBack(); }));

    const focus = [node, ...options].map((id) => drawn.get(id)).filter(Boolean);
    const bounds = L.latLngBounds([]);
    focus.forEach((l) => bounds.extend(l.getBounds()));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  }, [map, features, route, node, options, onChoose]);

  return null;
}

export default function PracticeMap({ route, node, options, onChoose }) {
  const [features, setFeatures] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    loadFeatures().then((f) => live && setFeatures(f), () => live && setFailed(true));
    return () => { live = false; };
  }, []);

  if (failed) return <p className="pf-map-failed">The map could not be loaded.</p>;

  return (
    <div className="pf-map">
      <MapContainer center={[27.69, -97.28]} zoom={10} className="pf-map-canvas" scrollWheelZoom={false}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {features && <Layers features={features} route={route} node={node} options={options} onChoose={onChoose} />}
      </MapContainer>
    </div>
  );
}

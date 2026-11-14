// The T-44C Practice Flight's map: the T-44 routes from public/kml/t44c-routes.kml, showing only
// the flight so far and the choices in front of you, with each flown leg's landmarks. Traced from the publications' plates, so a
// study aid, not a chart. A leg is found by its name.

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { kml } from '@tmcw/togeojson';
import 'leaflet/dist/leaflet.css';

let loaded = null;
function loadFeatures() {
  if (!loaded) {
    loaded = fetch('/kml/t44c-routes.kml')
      .then((r) => r.text())
      .then((text) => kml(new DOMParser().parseFromString(text, 'text/xml')).features)
      .catch((err) => { loaded = null; throw err; });
  }
  return loaded;
}

function Layers({ features, route, options, onChoose, frame }) {
  const map = useMap();
  const group = useRef(null);

  useEffect(() => {
    if (!group.current) group.current = L.layerGroup().addTo(map);
    const g = group.current;
    g.clearLayers();
    const byName = new Map(features.map((f) => [f.properties?.name, f]));
    const drawn = new Map();
    const draw = (name, cls, id) => {
      const f = byName.get(name);
      if (!f || drawn.has(name)) return;
      const layer = L.geoJSON(f, {
        style: () => ({ className: cls }),
        pointToLayer: (_, latlng) => L.circleMarker(latlng, { radius: 6, className: cls }),
      });
      layer.bindTooltip(name, { sticky: true });
      if (id) layer.on('click', () => onChoose(id));
      drawn.set(name, layer);
    };

    options.forEach((o) => (o.legs || []).forEach((name) => draw(name, 'pf-map-option', o.id)));
    const now = route[route.length - 1];
    draw(now, 'pf-map-current');
    route.forEach((name) => draw(name, 'pf-map-flown'));
    // Each leg's landmarks, which stay on the map once the leg is flown.
    route.forEach((name) => String(byName.get(name)?.properties?.landmarks || '').split('|').filter(Boolean)
      .forEach((point) => draw(point, 'pf-map-landmark')));
    drawn.forEach((layer) => layer.addTo(g));
    drawn.forEach((layer) => layer.eachLayer((l) => { if (l instanceof L.Polygon) l.bringToBack(); }));

    const bounds = L.latLngBounds([]);
    // Choices in front of you, else the working area during high work, else the leg being flown.
    const focus = options.length ? options.flatMap((o) => o.legs || []) : [frame || now];
    focus.forEach((name) => drawn.get(name) && bounds.extend(drawn.get(name).getBounds()));
    // A zoom still animating would swallow this one (two quick steps), so stop it first.
    if (bounds.isValid()) { map.stop(); map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 }); }
  }, [map, features, route, options, onChoose, frame]);

  return null;
}

export default function T44CMap({ route, options, onChoose, frame }) {
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
      <MapContainer center={[27.6, -97.0]} zoom={8} className="pf-map-canvas" scrollWheelZoom={false}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {features && <Layers features={features} route={route} options={options} onChoose={onChoose} frame={frame} />}
      </MapContainer>
    </div>
  );
}

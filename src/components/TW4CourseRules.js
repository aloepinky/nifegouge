import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { kml } from '@tmcw/togeojson';
import 'leaflet/dist/leaflet.css';
import { crFeatures } from './CourseRulesFeatures.js';
import { cardHtml, escapeHtml, questionHtml, withText } from './courserules/rules';
import { fetchCourseRules } from './courserules/courseRulesApi';
import LegEditor from './courserules/LegEditor';
import CourseRulesHistory from './courserules/History';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// One row per call: the manual's lead-in, then channel and speaker, then the words
const callParts = (call) => ({
  when: call.when,
  tag: [call.radio, call.who].filter(Boolean).join(' · '),
  text: `“${call.text}”`,
  after: call.after
});

function RadioCalls({ comms }) {
  if (!comms || comms.length === 0) return null;
  return (
    <div className="course-rules-comms">
      <strong>Radio calls:</strong>
      {comms.map((call, i) => {
        const { when, tag, text, after } = callParts(call);
        return (
          <div key={i} className="course-rules-call">
            {when && <div className="course-rules-call-when">{when}</div>}
            {tag && <span className="course-rules-call-radio">{tag}</span>}
            <span className="course-rules-call-text">{text}</span>
            {after && <div className="course-rules-call-when">({after})</div>}
          </div>
        );
      })}
    </div>
  );
}

// Worked examples of the whole exchange, controller's side included, kept apart from the
// manual's calls. Each is closed until asked for, with what it covers in its heading.
function ExampleComms({ blocks }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="cr-examples">
      {blocks.map(block => (
        <details key={block.title} className="cr-example">
          <summary>Example comms: {block.title}</summary>
          <p className="cr-example-note">A worked example, not from a TW-4 publication.</p>
          {block.lines.map((line, i) => {
            if (line.label) return <div key={i} className="cr-example-label">{line.label}</div>;
            if (line.note) return <div key={i} className="cr-example-direction">{line.note}</div>;
            if (line.manual) {
              return (
                <div key={i} className="cr-example-manual">
                  Course Rules Manual: {line.manual} (p. {line.page})
                </div>
              );
            }
            const reply = !line.radio;
            return (
              <div key={i} className={reply ? 'cr-example-line cr-example-line--reply' : 'cr-example-line'}>
                <span className="course-rules-call-radio">{line.radio || line.who}</span>
                <span className="course-rules-call-text">“{line.text}”</span>
              </div>
            );
          })}
        </details>
      ))}
    </div>
  );
}

const radioCallsHtml = (comms) => {
  if (!comms || comms.length === 0) return '';
  const rows = comms.map(call => {
    const { when, tag, text, after } = callParts(call);
    return `<div class="course-rules-call">`
      + (when ? `<div class="course-rules-call-when">${escapeHtml(when)}</div>` : '')
      + (tag ? `<span class="course-rules-call-radio">${escapeHtml(tag)}</span>` : '')
      + `<span class="course-rules-call-text">${escapeHtml(text)}</span>`
      + (after ? `<div class="course-rules-call-when">(${escapeHtml(after)})</div>` : '')
      + `</div>`;
  }).join('');
  return `<div class="course-rules-comms"><strong>Radio calls:</strong>${rows}</div>`;
};

// Group the next waypoints by folder, starting at the first level they don't all share:
// a folder that holds every option is skipped, and a run of single-child folders is one row
const groupOptions = (ids) => {
  const build = (entries) => {
    const first = entries[0].rest;
    let prefix = first.length;
    entries.forEach(({ rest }) => {
      let i = 0;
      while (i < prefix && i < rest.length && rest[i] === first[i]) i++;
      prefix = i;
    });
    const items = [];
    const groups = new Map();
    entries.forEach(e => {
      const rest = e.rest.slice(prefix);
      if (rest.length === 0) items.push(e.id);
      else {
        if (!groups.has(rest[0])) groups.set(rest[0], []);
        groups.get(rest[0]).push({ id: e.id, rest: rest.slice(1) });
      }
    });
    const folders = [];
    groups.forEach((children, name) => {
      const inner = build(children);
      const label = [name, ...inner.prefix].join(' › ');
      // A folder with one option is just that option, labelled with where it is
      if (inner.items.length === 1 && inner.folders.length === 0) items.push({ id: inner.items[0], where: label });
      else folders.push({ label, items: inner.items, folders: inner.folders, count: children.length });
    });
    return { prefix: entries[0].rest.slice(0, prefix), items, folders };
  };
  if (ids.length === 0) return { prefix: [], items: [], folders: [] };
  // Pattern legs sit loose in the airfield's folder; give them their own, or a bare
  // "04/22" doesn't read as "stay in the pattern"
  const pathOf = (f) => [
    ...(f.folderPath || '').split(' > '),
    ...(f.category === 'Routes' && f.subCategory === 'Traffic Patterns' ? ['Traffic Patterns'] : [])
  ];
  return build(ids.map(id => ({ id, rest: pathOf(crFeatures[id]) })));
};

// "(KRKP) Aransas County Airport › Arrivals" names an airfield; leg names often say where a leg
// comes from ("Goliad Arrivals"), so an option bound for another airfield leads with the airfield
const AIRFIELD = /^\((K[A-Z0-9]{3})\)\s*([^›]+?)\s*(?:›|$)/;

function WaypointFolder({ group, path, open, toggle, onSelect }) {
  return (
    <>
      {group.items.map(item => {
        const id = typeof item === 'string' ? item : item.id;
        const name = crFeatures[id].name || 'Unnamed';
        const field = item.where && item.where.match(AIRFIELD);
        return (
          <button key={id} className="cr-waypoint" onClick={() => onSelect(id)}>
            <span className="cr-waypoint-name">{field ? `${field[1]} ${field[2]}` : name}</span>
            {item.where && <span className="cr-waypoint-where">{field ? name : item.where}</span>}
          </button>
        );
      })}
      {group.folders.map(folder => {
        const key = `${path} > ${folder.label}`;
        const isOpen = !!open[key];
        return (
          <div key={key} className="cr-folder">
            <button className="cr-folder-toggle" aria-expanded={isOpen} onClick={() => toggle(key)}>
              <span className="cr-folder-caret">{isOpen ? '▾' : '▸'}</span>
              <span className="cr-folder-label">{folder.label.replace(/^\((K[A-Z0-9]{3})\)\s*/, '$1 ')}</span>
              <span className="cr-folder-count">{folder.count}</span>
            </button>
            {isOpen && (
              <div className="cr-folder-body">
                <WaypointFolder group={folder} path={key} open={open} toggle={toggle} onSelect={onSelect} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// Component to load and manage KML layers
function KmlLayer({ url, visibleLayers, folderVisibility, featureVisibility, setFolderTree, selectedParentFolder, controlMode, visibleFlightPath, currentRandomFeature, textRef, onEditRef }) {
  const map = useMap();
  const layersRef = useRef({});
  const [layersLoaded, setLayersLoaded] = useState(false);

  // A popup's "edit" opens that feature's editor under the map.
  useEffect(() => {
    const onOpen = (e) => {
      // An airfield's card wants the room; whether there is one is known only as it opens.
      const wide = !!(e.popup.getElement() && e.popup.getElement().querySelector('.cr-popup--wide'));
      if ((e.popup.options.maxWidth === 500) !== wide) {
        e.popup.options.maxWidth = wide ? 500 : 300;
        e.popup.update();
      }
      const button = e.popup.getElement() && e.popup.getElement().querySelector('[data-cr-edit]');
      if (button) button.onclick = () => { map.closePopup(); onEditRef.current(button.dataset.crEdit); };
    };
    map.on('popupopen', onOpen);
    return () => map.off('popupopen', onOpen);
  }, [map, onEditRef]);

  useEffect(() => {
    // First, fetch and parse the KML to extract folder structure
    fetch(url)
      .then(response => response.text())
      .then(kmlText => {
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlText, 'text/xml');

        // Build a list of placemarks in document order with their folder paths
        const placemarkList = [];

        const processFolders = (element, folderPath = []) => {
          const folders = element.querySelectorAll(':scope > Folder');
          folders.forEach(folder => {
            const folderNameEl = folder.querySelector(':scope > name');
            const folderName = folderNameEl ? folderNameEl.textContent : 'Unnamed';
            const newPath = [...folderPath, folderName];
            //console.log(folderName)
            // Get placemarks in this folder
            const placemarks = folder.querySelectorAll(':scope > Placemark');
            placemarks.forEach(placemark => {
              const nameEl = placemark.querySelector(':scope > name');
              const featureName = nameEl ? nameEl.textContent : 'Unnamed';
              //console.log(featureName, newPath)
              // Store in document order
              placemarkList.push({
                name: featureName,
                folderPath: newPath
              });
            });

            // Recurse into subfolders
            processFolders(folder, newPath);
          });
        };

        const doc = kmlDoc.querySelector('Document');
        if (doc) {
          processFolders(doc);
        }

        // Turn the placemarks into map layers, one per placemark in document order
        const kmlLayers = L.geoJSON(kml(kmlDoc));
        const features = [];
        let layerIndex = 0;

        // Process each feature from the KML
        kmlLayers.eachLayer(layer => {
          // Extract properties from KML
          const props = layer.feature?.properties || {};
          const name = props.name || 'Unnamed';
          // An HTML description comes as { value } rather than a string.
          const description = (typeof props.description === 'object' ? props.description?.value : props.description) || '';

          // Match by document order
          const placemarkInfo = placemarkList[layerIndex++];
          const folderPath = placemarkInfo.folderPath || [];
          const folderPathStr = folderPath.join(' > ');

          // Try to categorize based on folder structure and name
          let category = 'Other';
          let featureType = 'unknown';
          let subType = null;

          // Check for airspace
          if (name.match(/class\s*[a-e]|radius|ejection|stand\s*off/i) || description.match(/class\s*[a-e]|radius|ejection|stand\s*off/i)) {
            category = 'Airspace';
            const classMatch = (name + description).match(/class\s*([a-e])/i);
            featureType = classMatch ? `Class ${classMatch[1].toUpperCase()}` : 'Airspace';
          }
          
          // Check for working areas - prioritize name over folder path
          else if (name.match(/mustang\s*(maintenance|central)/i) || folderPathStr.match(/mustang\s*(maintenance|central)/i)) {
            category = 'Working Areas';
            featureType = 'Mustang Maintenance/Central';
            subType = 'Mustang Maintenance';
          } else if (name.match(/mustang/i) || folderPathStr.match(/mustang/i)) {
            category = 'Working Areas';
            featureType = 'Mustang';
            subType = 'Mustang';
          } else if (name.match(/foxtrot/i) || folderPathStr.match(/foxtrot/i)) {
            category = 'Working Areas';
            featureType = 'Foxtrot';
            subType = 'Foxtrot';
          } else if (name.match(/king/i) || folderPathStr.match(/king/i)) {
            category = 'Working Areas';
            featureType = 'King';
            subType = 'King';
          }
          
          // Check for routes based on folder names
          else if (folderPathStr.match(/arrival/i)) {
            category = 'Routes';
            featureType = 'Arrival';
            subType = 'Arrivals';
          } else if (folderPathStr.match(/departure/i)) {
            category = 'Routes';
            featureType = 'Departure';
            subType = 'Departures';
          } else if (folderPathStr.match(/transition/i)) {
            category = 'Routes';
            featureType = 'Transition';
            subType = 'Transitions';
          }

          // Default to Traffic Patterns if no other category matched
          if (category === 'Other') {
            category = 'Routes';
            featureType = 'Traffic Pattern';
            subType = 'Traffic Patterns';
            if(layer._latlng){
              category = 'Point';
              featureType = null;
              subType = null;              
            };
          }

          if(layer._latlng){
            category = 'Point';           
          };

          if(layer._latlngs){
            if(!Array.isArray(layer._latlngs[0]) && category === 'Working Areas'){
              category = 'Routes';
              featureType = 'Transition';
              subType = 'Transitions';
            }
          };
          

          // Style features by subtype or category
          const styles = {
            'Airspace': { color: '#3388ff', weight: 2, fillOpacity: 0.2 },
            'Arrivals': { color: '#00ff00', weight: 3, fillOpacity: 0.1 },
            'Departures': { color: '#ff6600', weight: 3, fillOpacity: 0.1 },
            'Transitions': { color: '#9966ff', weight: 3, fillOpacity: 0.1 },
            'Traffic Patterns': { color: '#ffff00', weight: 3, fillOpacity: 0.1 },
            'Mustang': { color: '#ff6b6b', weight: 2, fillOpacity: 0.25 },
            'King': { color: '#4ecdc4', weight: 2, fillOpacity: 0.25 },
            'Foxtrot': { color: '#ffe66d', weight: 2, fillOpacity: 0.25 },
            'Mustang Maintenance': { color: '#a8dadc', weight: 2, fillOpacity: 0.25 },
            'Point': { color: '#ff00ff', weight: 2, fillOpacity: 0.5 }
          };

          if (layer.setStyle) {
            const styleKey = subType || category;
            layer.setStyle(styles[styleKey] || { color: '#666', weight: 2 });
          }

          // The popup is built when it opens, from the course rules as they are now, so an
          // edit published on this page shows without a reload. The words are the community's
          // (courserules/rules.js escapes them); the KML's own descriptions are no longer read.
          const featureId = `${category}-${subType || 'default'}-${features.length}`;
          const card = () => textRef.current[featureId]?.card;
          layer.bindPopup(() => {
            const f = textRef.current[featureId] || {};
            const wide = !!card();
            return `
              <div class="cr-popup${wide ? ' cr-popup--wide' : ''}">
                <strong class="cr-popup-name">${escapeHtml(name)}</strong>
                <button type="button" class="cr-popup-edit" data-cr-edit="${featureId}">edit</button><br/>
                ${featureType ? `<em class="cr-popup-type">${escapeHtml(featureType)}</em><br/>` : ''}
                ${wide ? cardHtml(card()) : ''}
                ${f.customDescription ? `<div class="cr-popup-rule">${f.customDescription}</div>` : ''}
                ${radioCallsHtml(f.comms)}
              </div>
            `;
          }, { maxWidth: 300, maxHeight: 400 });

          // Store layer with metadata
          layersRef.current[featureId] = {
            layer,
            category,
            subType,
            featureType,
            name,
            description,
            folderPath: folderPathStr
          };

          features.push({
            id: featureId,
            category,
            subType,
            featureType,
            name,
            description,
            folderPath: folderPathStr
          });
        });
        // Build folder tree structure
        const tree = {};
        features.forEach(feature => {
          if (feature.folderPath) {
            const parts = feature.folderPath.split(' > ');
            let current = tree;
            // Navigate/create the tree structure
            parts.forEach((part, index) => {
              if (!current[part]) {
                current[part] = {
                  name: part,
                  children: {},
                  features: [],
                  path: parts.slice(0, index + 1).join(' > ')
                };
              }

              // If this is the last part, add the feature
              if (index === parts.length - 1) {
                current[part].features.push(feature);
              }

              current = current[part].children;
            });
          }
        });

        setFolderTree(tree);
        setLayersLoaded(true); // Trigger visibility effect

        // Don't add layers here - let the visibility effect handle it
      })
      .catch(error => {
        console.error('Error fetching KML:', error);
      });

    return () => {
      // Cleanup on unmount
      Object.values(layersRef.current).forEach(({ layer }) => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layersRef.current = {};
    };
  }, [url, map, setFolderTree, textRef]);

  // Update visible layers when selection changes
  useEffect(() => {
    if (!layersLoaded) return; // Wait for layers to load

    Object.entries(layersRef.current).forEach(([id, { layer, category, subType, folderPath }]) => {
      let shouldShow = false;

      // In Flight Path Builder mode, only show features in the flight path
      if (controlMode === 'toggles') {
        shouldShow = visibleFlightPath && visibleFlightPath.includes(id);
      } else if (controlMode === 'checklist') {
        // In All Areas mode, only check folder tree visibility
        shouldShow = true; // Show by default

        // Check folder visibility hierarchy
        if (folderPath) {
          const parts = folderPath.split(' > ');
          // Check if any parent folder is hidden
          for (let i = 1; i <= parts.length; i++) {
            const folderKey = parts.slice(0, i).join(' > ');
            if (folderVisibility[folderKey] === false) {
              shouldShow = false;
              break;
            }
          }
        }

        // Check individual feature visibility (only from folder tree checkboxes)
        if (shouldShow && featureVisibility[id] === false) {
          shouldShow = false;
        }
      } else if (controlMode === 'quiz') {
        // In quiz mode, only show the current random feature
        shouldShow = currentRandomFeature && id === currentRandomFeature;
      } else {
        // Default fallback
        const checkKey = subType || category;
        shouldShow = visibleLayers[checkKey];
      }

      // Only touch layers whose visibility changed; re-adding all of them on
      // every step made the quiz and path builder stall
      const isShown = map.hasLayer(layer);
      if (shouldShow && !isShown) {
        layer.addTo(map);
      } else if (!shouldShow && isShown) {
        map.removeLayer(layer);
      }
    });

    // Filled areas (working areas, airspace) go under the routes: a line added before an area
    // would otherwise sit beneath its fill and couldn't be clicked
    Object.values(layersRef.current).forEach(({ layer }) => {
      if (layer instanceof L.Polygon && map.hasLayer(layer)) layer.bringToBack();
    });
  }, [visibleLayers, folderVisibility, featureVisibility, visibleFlightPath, map, layersLoaded, controlMode, currentRandomFeature]);

  // Fly to visible flight path features
  useEffect(() => {
    if (!layersLoaded || controlMode !== 'toggles' || !visibleFlightPath || visibleFlightPath.length === 0) return;

    // Collect all layers in the visible flight path
    const selectedLayers = [];
    visibleFlightPath.forEach(featureId => {
      if (layersRef.current[featureId]) {
        selectedLayers.push(layersRef.current[featureId].layer);
      }
    });

    // If we have layers, calculate bounds and fly to them
    if (selectedLayers.length > 0) {
      const bounds = L.latLngBounds();
      selectedLayers.forEach(layer => {
        if (layer.getBounds) {
          bounds.extend(layer.getBounds());
        } else if (layer.getLatLng) {
          bounds.extend(layer.getLatLng());
        }
      });

      if (bounds.isValid()) {
        map.flyToBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13,
          duration: 1.5
        });
      }
    }
  }, [visibleFlightPath, controlMode, layersLoaded, map]);

  // Fly to current random feature in quiz mode
  useEffect(() => {
    if (!layersLoaded || controlMode !== 'quiz' || !currentRandomFeature) return;

    // Get the layer for the current random feature
    if (layersRef.current[currentRandomFeature]) {
      const layer = layersRef.current[currentRandomFeature].layer;

      if (layer.getBounds) {
        map.flyToBounds(layer.getBounds(), {
          padding: [50, 50],
          maxZoom: 13,
          duration: 1.5
        });
      } else if (layer.getLatLng) {
        map.flyTo(layer.getLatLng(), 13, {
          duration: 1.5
        });
      }
    }
  }, [currentRandomFeature, controlMode, layersLoaded, map]);

  return null;
}

function TW4CourseRules() {
  // The words on the page are the community's, from the server (courserules/); the map and
  // the route graph are crFeatures. `features` is the two together, in the shape the page reads.
  const [record, setRecord] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null); // feature id whose editor is open
  const [showHistory, setShowHistory] = useState(false);
  const features = useMemo(() => withText(crFeatures, record && record.doc), [record]);
  const textRef = useRef(features);
  textRef.current = features;
  const onEditRef = useRef(null);
  onEditRef.current = (id) => { setShowHistory(false); setEditing(id); };

  const reload = useCallback(() => fetchCourseRules().then(
    (r) => { setRecord(r); setLoadError(r ? '' : 'The course rules text has not been published yet.'); },
    (err) => setLoadError(err.message),
  ), []);
  useEffect(() => { reload(); }, [reload]);

  // Feature names for the editor and the history, which name legs rather than ids.
  // "(KNGP) Corpus Christi NAS › Arrivals › Shamrock"; an airfield is just its folder.
  const names = useMemo(() => Object.fromEntries(Object.entries(crFeatures).map(([id, f]) => {
    const folder = (f.folderPath || '').split(' > ').filter(Boolean).join(' › ');
    if (!folder) return [id, f.name];
    return [id, folder.startsWith(`(${f.name})`) && !folder.includes('›') ? folder : `${folder} › ${f.name}`];
  })), []);

  const [folderTree, setFolderTree] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [visibleLayers] = useState({
    'Airspace': true,
    'Arrivals': true,
    'Departures': true,
    'Transitions': true,
    'Traffic Patterns': true,
    'Mustang': true,
    'King': true,
    'Foxtrot': true,
    'Mustang Maintenance': true,
    'Point': true,
    'Other': true
  });
  const [folderVisibility, setFolderVisibility] = useState({});
  const [treeFeatureVisibility, setTreeFeatureVisibility] = useState({}); // For All Areas mode folder tree
  const [selectedParentFolder, setSelectedParentFolder] = useState('');
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [controlMode, setControlMode] = useState('toggles'); // 'toggles', 'checklist', 'quiz'
  const [quizMode, setQuizMode] = useState(false);

  // Pure Random quiz states
  const [randomQuestionPool, setRandomQuestionPool] = useState([]); // Pool of all questions
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Index in the pool
  const [currentRandomFeature, setCurrentRandomFeature] = useState(null);
  const [currentRandomQuestionIndex, setCurrentRandomQuestionIndex] = useState(0);
  const [revealedAnswerIndices, setRevealedAnswerIndices] = useState([]);
  const [selectedQuizFolder, setSelectedQuizFolder] = useState(''); // Empty string means "All Features"

  // Flight path builder states
  const [startingAirport, setStartingAirport] = useState('Point-default-95'); // KNGP
  const [currentNode, setCurrentNode] = useState('Point-default-95');
  const [flightPath, setFlightPath] = useState(['Point-default-95']); // Track the path taken
  const [visibleFeatures, setVisibleFeatures] = useState(['Point-default-95']); // For Flight Path Builder mode
  const [openFolders, setOpenFolders] = useState({}); // Waypoint folders opened at this stop

  // Each stop starts with its folders closed
  useEffect(() => setOpenFolders({}), [currentNode]);

  // Flight path builder quiz mode states
  const [flightPathQuizMode, setFlightPathQuizMode] = useState(false);
  const [fpQuizQuestionIndex, setFpQuizQuestionIndex] = useState(0);
  const [fpQuizRevealedAnswers, setFpQuizRevealedAnswers] = useState([]);

  // Pure Random Quiz Functions
  const initializeRandomPool = (folderFilter = '') => {
    // Create a pool of all features that have questions
    const allFeatures = [];
    const seenQuestions = new Set();

    Object.entries(features).forEach(([id, feature]) => {
      // Must have questions
      if (!feature.questions || feature.questions.length === 0) return;

      // If folder filter is set, check if feature matches
      if (folderFilter) {
        const featurePath = feature.folderPath || '';
        if (!(featurePath === folderFilter || featurePath.startsWith(folderFilter + ' > '))) {
          return;
        }
      }

      // Runways that share a procedure share its questions; ask them once
      const questionKey = JSON.stringify([feature.questions, feature.answers]);
      if (seenQuestions.has(questionKey)) return;
      seenQuestions.add(questionKey);

      // Add feature to pool
      allFeatures.push(id);
    });

    // Shuffle the pool using Fisher-Yates algorithm
    const shuffled = [...allFeatures];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setRandomQuestionPool(shuffled);
    setCurrentQuestionIndex(0);
    return shuffled;
  };

  const getRandomFeature = (providedPool = null) => {
    // Use provided pool if available, otherwise use state
    const poolToUse = providedPool !== null ? providedPool : randomQuestionPool;

    if (poolToUse.length === 0) {
      setCurrentRandomFeature(null);
      setCurrentRandomQuestionIndex(0);
      setRevealedAnswerIndices([]);
      return null;
    }

    // Get current feature from the pool (a fresh pool starts at the top)
    let index = providedPool !== null ? 0 : currentQuestionIndex;

    // If we've reached the end, reshuffle
    if (index >= poolToUse.length) {
      const reshuffled = [...poolToUse];
      for (let i = reshuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reshuffled[i], reshuffled[j]] = [reshuffled[j], reshuffled[i]];
      }
      setRandomQuestionPool(reshuffled);
      index = 0;
      setCurrentQuestionIndex(0);
    }

    const currentFeatureId = (providedPool || randomQuestionPool)[index];
    setCurrentRandomFeature(currentFeatureId);
    setCurrentRandomQuestionIndex(0); // Always start at first question
    setRevealedAnswerIndices([]);

    return currentFeatureId;
  };

  // The quiz's question with its blanks; the text is escaped (courserules/rules.js).
  const parseQuestionWithBlanks = (questionText, answers, questionIndex, revealedIndices) =>
    questionHtml(questionText, answers && answers[questionIndex], revealedIndices);

  const revealNextAnswer = () => {
    if (!currentRandomFeature || !features[currentRandomFeature]) return;

    const feature = features[currentRandomFeature];
    const questionText = feature.questions[currentRandomQuestionIndex];
    const { totalBlanks } = parseQuestionWithBlanks(questionText, feature.answers, currentRandomQuestionIndex, []);

    // Find next unrevealed answer
    if (revealedAnswerIndices.length < totalBlanks) {
      setRevealedAnswerIndices(prev => [...prev, prev.length]);
    }
  };

  const nextRandomQuestion = () => {
    if (!currentRandomFeature || !features[currentRandomFeature]) return;

    const feature = features[currentRandomFeature];
    if (!feature.questions || feature.questions.length === 0) return;

    // Check if there are more questions in the current feature
    if (currentRandomQuestionIndex < feature.questions.length - 1) {
      // Move to next question in same feature
      setCurrentRandomQuestionIndex(prev => prev + 1);
      setRevealedAnswerIndices([]);
    } else {
      // Move to next feature in pool
      const nextIndex = currentQuestionIndex + 1;

      // If we've reached the end, reshuffle
      if (nextIndex >= randomQuestionPool.length) {
        const reshuffled = [...randomQuestionPool];
        for (let i = reshuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [reshuffled[i], reshuffled[j]] = [reshuffled[j], reshuffled[i]];
        }
        setRandomQuestionPool(reshuffled);
        setCurrentQuestionIndex(0);
        setCurrentRandomFeature(reshuffled[0]);
        setCurrentRandomQuestionIndex(0);
        setRevealedAnswerIndices([]);
      } else {
        setCurrentQuestionIndex(nextIndex);
        setCurrentRandomFeature(randomQuestionPool[nextIndex]);
        setCurrentRandomQuestionIndex(0);
        setRevealedAnswerIndices([]);
      }
    }
  };

  const resetPureRandomQuiz = () => {
    const newPool = initializeRandomPool(selectedQuizFolder);
    getRandomFeature(newPool);
  };

  // Flight path builder functions
  const getNextNodes = (nodeId) => {
    if (!features[nodeId] || !features[nodeId].nextNode) return [];
    return features[nodeId].nextNode.filter(id => features[id]); // Only return valid nodes
  };

  // Auto-progress through single nodes - COMMENTED OUT FOR NOW
  // const autoProgressThroughSingleNodes = (nodeId, path = []) => {
  //   const nextNodes = getNextNodes(nodeId);

  //   // If there's exactly one next node, auto-progress
  //   if (nextNodes.length === 1) {
  //     const nextNodeId = nextNodes[0];
  //     const newPath = [...path, nextNodeId];
  //     return autoProgressThroughSingleNodes(nextNodeId, newPath);
  //   }

  //   // Return the final node and accumulated path
  //   return { finalNode: nodeId, path };
  // };

  const selectNextNode = (nodeId) => {
    // Auto-progress through single nodes - DISABLED
    // const { finalNode, path } = autoProgressThroughSingleNodes(nodeId, [nodeId]);

    // Update state - simple version without auto-progress
    setCurrentNode(nodeId);
    setFlightPath(prev => [...prev, nodeId]);

    // Add the selected node and its dependent nodes to visible features
    const dependentNodes = features[nodeId]?.dependentNode || [];
    setVisibleFeatures(prev => [...prev, nodeId, ...dependentNodes]);

    // Reset quiz when moving to new node
    if (flightPathQuizMode) {
      setFpQuizQuestionIndex(0);
      setFpQuizRevealedAnswers([]);
    }
  };

  const resetFlightPath = () => {
    setCurrentNode(startingAirport);
    setFlightPath([startingAirport]);
    // Include dependent nodes in visible features
    const dependentNodes = features[startingAirport]?.dependentNode || [];
    setVisibleFeatures([startingAirport, ...dependentNodes]);

    // Reset quiz
    if (flightPathQuizMode) {
      setFpQuizQuestionIndex(0);
      setFpQuizRevealedAnswers([]);
    }
  };

  const goBackInPath = () => {
    if (flightPath.length <= 1) return; // Can't go back from starting point

    const newPath = flightPath.slice(0, -1);
    const newCurrent = newPath[newPath.length - 1];

    setFlightPath(newPath);
    setCurrentNode(newCurrent);
    // Keep each remaining node's dependent landmarks on the map
    setVisibleFeatures(newPath.flatMap(id => [id, ...(features[id]?.dependentNode || [])]));

    // Reset quiz when going back
    if (flightPathQuizMode) {
      setFpQuizQuestionIndex(0);
      setFpQuizRevealedAnswers([]);
    }
  };

  // Flight path quiz mode functions
  const revealNextFlightPathAnswer = () => {
    if (!currentNode || !features[currentNode]) return;

    const feature = features[currentNode];
    if (!feature.questions || feature.questions.length === 0) return;

    const questionText = feature.questions[fpQuizQuestionIndex];
    const { totalBlanks } = parseQuestionWithBlanks(questionText, feature.answers, fpQuizQuestionIndex, []);

    if (fpQuizRevealedAnswers.length < totalBlanks) {
      setFpQuizRevealedAnswers(prev => [...prev, prev.length]);
    }
  };

  const nextFlightPathQuestion = () => {
    if (!currentNode || !features[currentNode]) return;

    const feature = features[currentNode];
    if (!feature.questions || feature.questions.length === 0) return;

    // Move to next question if available
    if (fpQuizQuestionIndex < feature.questions.length - 1) {
      setFpQuizQuestionIndex(prev => prev + 1);
      setFpQuizRevealedAnswers([]);
    }
  };

  const handleFlightPathQuizButton = () => {
    if (!currentNode || !features[currentNode]) return;

    const feature = features[currentNode];
    if (!feature.questions || feature.questions.length === 0) return;

    const questionText = feature.questions[fpQuizQuestionIndex];
    const { totalBlanks } = parseQuestionWithBlanks(questionText, feature.answers, fpQuizQuestionIndex, []);

    // If all answers revealed, go to next question
    if (fpQuizRevealedAnswers.length >= totalBlanks) {
      nextFlightPathQuestion();
    } else {
      // Otherwise reveal next answer
      revealNextFlightPathAnswer();
    }
  };

  // Set first folder as selected when folderTree loads
  useEffect(() => {
    if (Object.keys(folderTree).length > 0 && !selectedParentFolder) {
      const firstFolder = Object.keys(folderTree)[0];
      setSelectedParentFolder(firstFolder);
    }
  }, [folderTree, selectedParentFolder]);

  // No longer need this - we check visibleFeatures directly in the layer visibility logic

  const categoryColors = {
    'Airspace': '#3388ff',
    'Arrivals': '#00ff00',
    'Departures': '#ff6600',
    'Transitions': '#9966ff',
    'Traffic Patterns': '#ffff00',
    'Mustang': '#ff6b6b',
    'King': '#4ecdc4',
    'Foxtrot': '#ffe66d',
    'Mustang Maintenance': '#a8dadc',
    'Point': '#ff00ff',
    'Other': '#666666'
  };

  // Toggle folder expansion
  const toggleFolderExpansion = (folderPath) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  // Toggle folder visibility (independent of children, like Google Earth)
  const toggleFolderVisibility = (folderPath, folder) => {
    const newVisibility = !(folderVisibility[folderPath] ?? true);

    // Only toggle this specific folder - don't cascade to children
    setFolderVisibility(prev => ({
      ...prev,
      [folderPath]: newVisibility
    }));
  };

  // Toggle individual feature visibility in folder tree
  const toggleFeatureVisibility = (featureId) => {
    const newVisibility = !(treeFeatureVisibility[featureId] !== false);
    setTreeFeatureVisibility(prev => ({
      ...prev,
      [featureId]: newVisibility
    }));
  };

  // Show all folders and features in tree
  const showAllInTree = () => {
    const allFolderPaths = {};
    const allFeatureIds = {};

    // Collect all folder paths and feature IDs
    const collectPaths = (tree, basePath = '') => {
      Object.entries(tree).forEach(([folderName, folder]) => {
        const path = basePath ? `${basePath} > ${folderName}` : folderName;
        allFolderPaths[path] = true;

        // Collect features
        if (folder.features) {
          folder.features.forEach(feature => {
            allFeatureIds[feature.id] = true;
          });
        }

        // Recurse into children
        if (folder.children) {
          collectPaths(folder.children, path);
        }
      });
    };

    collectPaths(folderTree);

    setFolderVisibility(allFolderPaths);
    setTreeFeatureVisibility(allFeatureIds);
  };

  // Hide all folders and features in tree
  const hideAllInTree = () => {
    const allFolderPaths = {};
    const allFeatureIds = {};

    // Collect all folder paths and feature IDs
    const collectPaths = (tree, basePath = '') => {
      Object.entries(tree).forEach(([folderName, folder]) => {
        const path = basePath ? `${basePath} > ${folderName}` : folderName;
        allFolderPaths[path] = false;

        // Collect features
        if (folder.features) {
          folder.features.forEach(feature => {
            allFeatureIds[feature.id] = false;
          });
        }

        // Recurse into children
        if (folder.children) {
          collectPaths(folder.children, path);
        }
      });
    };

    collectPaths(folderTree);

    setFolderVisibility(allFolderPaths);
    setTreeFeatureVisibility(allFeatureIds);
  };

  // Build folder options for quiz dropdown
  const buildFolderOptions = () => {
    const options = [<option key="" value="">All Features</option>];

    // Only offer folders that have questions in them
    const hasQuestions = (path) => Object.values(features).some(f =>
      f.questions && f.questions.length > 0 &&
      (f.folderPath === path || (f.folderPath || '').startsWith(path + ' > '))
    );

    const addFolderOptions = (tree, level = 0) => {
      Object.entries(tree).forEach(([folderName, folder]) => {
        if (!hasQuestions(folder.path)) return;
        const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(level); // 4 non-breaking spaces per level
        options.push(
          <option key={folder.path} value={folder.path}>
            {indent}{folderName}
          </option>
        );

        // Recurse into children
        if (folder.children && Object.keys(folder.children).length > 0) {
          addFolderOptions(folder.children, level + 1);
        }
      });
    };

    addFolderOptions(folderTree);
    return options;
  };

  // Render tree folder recursively
  const renderTreeFolder = (folderName, folder, level = 0) => {
    const isExpanded = expandedFolders[folder.path];
    const hasChildren = folder.children && Object.keys(folder.children).length > 0;
    const hasFeatures = folder.features && folder.features.length > 0;

    // Check if this is the top parent folder in Single Area mode
    const isTopParentInSingleArea = controlMode === 'toggles' && folder.path === selectedParentFolder;

    // Determine folder icon
    const folderIcon = isExpanded ? '/images/open folder.png' : '/images/closed folder.png';

    return (
      <div key={folder.path} style={{marginBottom: '1px', width: '100%'}}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          //backgroundColor: '#e3f2fd',
          padding: `3px 8px 3px ${level * 12 + 8}px`,
          cursor: 'pointer',
          height: '24px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <img
            src={folderIcon}
            alt={isExpanded ? 'Open folder' : 'Closed folder'}
            onClick={() => toggleFolderExpansion(folder.path)}
            style={{
              height: '16px',
              width: 'auto',
              cursor: 'pointer',
              marginRight: '4px',
              flexShrink: 0,
              objectFit: 'contain'
            }}
          />
          <span
            onClick={() => toggleFolderExpansion(folder.path)}
            style={{
              cursor: 'pointer',
              color: 'var(--ink-000000)',
              fontWeight: 'bold',
              fontSize: '13px',
              flex: 1,
              minWidth: 0
            }}
          >
            {folderName}
          </span>
          <input
            type="checkbox"
            checked={isTopParentInSingleArea ? true : folderVisibility[folder.path] !== false}
            onChange={() => toggleFolderVisibility(folder.path, folder)}
            disabled={isTopParentInSingleArea}
            style={{ marginLeft: 'auto', flexShrink: 0, width: '20px'}}
          />
        </div>

        {isExpanded && (
          <>
            {/* Render features in this folder FIRST */}
            {hasFeatures && folder.features.map(feature => {
              // Determine feature icon based on category
              let featureIcon = '/images/point.png'; // default
              if (feature.category === 'Working Areas' || feature.category === 'Airspace') {
                featureIcon = '/images/area.png';
              } else if (feature.category === 'Routes') {
                featureIcon = '/images/route.png';
              }

              return (
              <div key={feature.id} style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--surface-f5f5f5)',
                padding: `2px 8px 2px ${level * 12 + 20}px`,
                height: '22px',
                marginBottom: '1px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <img
                  src={featureIcon}
                  alt={feature.category}
                  style={{
                    height: '16px',
                    width: 'auto',
                    marginRight: '4px',
                    flexShrink: 0,
                    objectFit: 'contain'
                  }}
                />
                <span style={{
                  color: 'var(--ink-000000)',
                  fontSize: '12px',
                  flex: 1,
                  width: "80%",
                  minWidth: 0
                }}>{feature.name}</span>
                <input
                  type="checkbox"
                  checked={treeFeatureVisibility[feature.id] !== false}
                  onChange={() => toggleFeatureVisibility(feature.id)}
                  style={{ marginLeft: 'auto', flexShrink: 0, width: '20px'}}
                />
              </div>
            )})}

            {/* Render child folders AFTER features */}
            {hasChildren && Object.entries(folder.children).map(([childName, childFolder]) =>
              renderTreeFolder(childName, childFolder, level + 1)
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <h1 className="about-title">TW4 Course Rules</h1>
      <p className="about-text" style={{textAlign: 'center', fontStyle: 'italic', marginTop: '-30px'}}>
        Huge thank you to Francis Chval for the <a href="https://drive.google.com/drive/folders/1zRndKMJi24wtqIwm_tSC3z71ZMJgFVEk?usp=sharing" target="_blank" rel="noopener noreferrer">map data</a>
      </p>
      <p className="cr-source">
        {record && record.doc.source && (
          <>
            From the {record.doc.source.publication}
            {record.doc.source.date ? `, ${record.doc.source.date}` : ''}.{' '}
          </>
        )}
        Anyone can correct the words: click <b>edit</b> on a leg or a map popup.{' '}
        {record && (
          <button type="button" className="cr-link" onClick={() => { setEditing(null); setShowHistory(true); }}>
            [history]
          </button>
        )}
      </p>
      {loadError && <p className="cr-source cr-source--warn">Course rules text: {loadError}</p>}

      {/* Control Mode Selector */}
      <div className="course-rules-mode-selector">
        <button
          onClick={() => setControlMode('toggles')}
          className={controlMode === 'toggles' ? 'active' : ''}
        >
          Flight Path Builder
        </button>
        <button
          onClick={() => setControlMode('checklist')}
          className={controlMode === 'checklist' ? 'active' : ''}
        >
          Explore All Areas
        </button>
        <button
          onClick={() => {
            setControlMode('quiz');
            if (!quizMode) {
              setQuizMode(true);
              if (randomQuestionPool.length === 0) {
                const newPool = initializeRandomPool(selectedQuizFolder);
                if (!currentRandomFeature) {
                  getRandomFeature(newPool);
                }
              } else if (!currentRandomFeature) {
                getRandomFeature();
              }
            }
          }}
          className={controlMode === 'quiz' ? 'active' : ''}
        >
          Random Quiz
        </button>
      </div>

      {/* Map Container */}
      <div className="course-rules-map-container">
        <MapContainer
          center={[27.69, -97.28]} // Adjust to your training area
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <KmlLayer
            url="/kml/course-rules.kml"
            visibleLayers={visibleLayers}
            folderVisibility={folderVisibility}
            featureVisibility={treeFeatureVisibility}
            setFolderTree={setFolderTree}
            selectedParentFolder={selectedParentFolder}
            controlMode={controlMode}
            visibleFlightPath={visibleFeatures}
            currentRandomFeature={currentRandomFeature}
            textRef={textRef}
            onEditRef={onEditRef}
          />
        </MapContainer>

        {/* Legend */}
        <div className="course-rules-legend">
          <h3
            onClick={() => setLegendExpanded(!legendExpanded)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            Legend
          </h3>
          {legendExpanded && Object.entries(categoryColors).map(([category, color]) => (
            <div key={category} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: color }}
              ></div>
              <span>{category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The editor or the history, under the map whichever mode is showing */}
      {editing && record && (
        <LegEditor
          key={editing}
          id={editing}
          names={names}
          record={record}
          isAirfield={crFeatures[editing]?.category === 'Point' && /^K[A-Z0-9]{3}$/.test(crFeatures[editing]?.name || '')}
          onClose={() => setEditing(null)}
          onPublished={() => { setEditing(null); reload(); }}
        />
      )}
      {showHistory && record && (
        <CourseRulesHistory
          names={names}
          latestRev={record.rev}
          onClose={() => setShowHistory(false)}
          onRestored={() => { setShowHistory(false); reload(); }}
        />
      )}

      {/* Controls Panel */}
      <div className="course-rules-controls">
        {/* Flight Path Builder Mode */}
        {controlMode === 'toggles' && (
          <div className="layer-tree">
            <h3>Build Your Flight Path</h3>

            {/* Starting Airport Selection and Quiz Controls */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Starting Airport:</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <select
                  value={startingAirport}
                  onChange={(e) => {
                    const airportId = e.target.value;
                    setStartingAirport(airportId);
                    setCurrentNode(airportId);
                    setFlightPath([airportId]);
                    // Include dependent nodes in visible features
                    const dependentNodes = features[airportId]?.dependentNode || [];
                    setVisibleFeatures([airportId, ...dependentNodes]);
                    // Reset quiz when changing starting airport
                    if (flightPathQuizMode) {
                      setFpQuizQuestionIndex(0);
                      setFpQuizRevealedAnswers([]);
                    }
                  }}
                  style={{ flex: 1, padding: '8px', fontSize: '14px' }}
                >
                  <option value="Point-default-0">{features["Point-default-0"]?.parentFolder || "KTFP"}</option>
                  <option value="Point-default-21">{features["Point-default-21"]?.parentFolder || "KRKP"}</option>
                  <option value="Point-default-38">{features["Point-default-38"]?.parentFolder || "KNGT"}</option>
                  <option value="Point-default-50">{features["Point-default-50"]?.parentFolder || "KRKP"}</option>
                  <option value="Point-default-95">{features["Point-default-95"]?.parentFolder || "KNGP"}</option>
                </select>
                <button
                  onClick={() => {
                    setFlightPathQuizMode(!flightPathQuizMode);
                    setFpQuizQuestionIndex(0);
                    setFpQuizRevealedAnswers([]);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: flightPathQuizMode ? '#1976d2' : 'var(--surface-e0e0e0)',
                    color: flightPathQuizMode ? 'var(--on-brand)' : 'var(--ink-000000)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: flightPathQuizMode ? 'bold' : 'normal',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Quiz Mode
                </button>
                {flightPathQuizMode && features[currentNode] && features[currentNode].questions && features[currentNode].questions.length > 0 && (() => {
                  const feature = features[currentNode];
                  const { totalBlanks } = parseQuestionWithBlanks(
                    feature.questions[fpQuizQuestionIndex],
                    feature.answers,
                    fpQuizQuestionIndex,
                    []
                  );
                  const allAnswersRevealed = fpQuizRevealedAnswers.length >= totalBlanks;
                  const hasMoreQuestions = fpQuizQuestionIndex < feature.questions.length - 1;
                  const isDisabled = allAnswersRevealed && !hasMoreQuestions;
                  const buttonText = allAnswersRevealed ? 'Next Question' : 'Next Answer';

                  return (
                    <button
                      onClick={handleFlightPathQuizButton}
                      disabled={isDisabled}
                      style={{
                        padding: '8px 12px',
                        background: '#4caf50',
                        color: 'var(--on-brand)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        opacity: isDisabled ? 0.5 : 1
                      }}
                    >
                      {buttonText}
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Current Location Display */}
            <div style={{ marginBottom: '15px', padding: '10px', background: 'var(--surface-e3f2fd)', borderRadius: '4px' }}>
              <strong>Current Location:</strong>
              {record && !flightPathQuizMode && (
                <button type="button" className="cr-link cr-link--edit" onClick={() => onEditRef.current(currentNode)}>
                  [edit]
                </button>
              )}
              <div style={{ marginTop: '5px' }}>
                {features[currentNode] ? features[currentNode].name : 'Loading…'}
              </div>

              {/* An airfield's card, closed until asked for */}
              {features[currentNode]?.card && !flightPathQuizMode && (
                <details className="cr-card-details">
                  <summary>Airfield info</summary>
                  <div dangerouslySetInnerHTML={{ __html: cardHtml(features[currentNode].card) }} />
                </details>
              )}

              {/* Course Rule or Question (depending on quiz mode) */}
              {features[currentNode] && !flightPathQuizMode && features[currentNode].customDescription && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--line-90caf9)' }}>
                  <strong>Course Rule:</strong>
                  <div
                    style={{ marginTop: '5px', fontSize: '13px', lineHeight: '1.4' }}
                    dangerouslySetInnerHTML={{
                      // Built from escaped text, the quiz blanks in bold (courserules/rules.js)
                      __html: features[currentNode].customDescription
                    }}
                  />
                </div>
              )}

              {/* Radio calls for this leg (hidden in quiz mode, like the course rule) */}
              {features[currentNode] && !flightPathQuizMode && (
                <>
                  <RadioCalls comms={features[currentNode].comms} />
                  <ExampleComms key={currentNode} blocks={features[currentNode].examples} />
                </>
              )}

              {/* Question (when in quiz mode) */}
              {features[currentNode] && flightPathQuizMode && features[currentNode].questions && features[currentNode].questions.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--line-90caf9)' }}>
                  <strong>Question {fpQuizQuestionIndex + 1} of {features[currentNode].questions.length}:</strong>
                  <div
                    style={{ marginTop: '5px', fontSize: '13px', lineHeight: '1.8' }}
                    dangerouslySetInnerHTML={{
                      __html: parseQuestionWithBlanks(
                        features[currentNode].questions[fpQuizQuestionIndex],
                        features[currentNode].answers,
                        fpQuizQuestionIndex,
                        fpQuizRevealedAnswers
                      ).html
                    }}
                  />
                </div>
              )}

              {/* No questions available message */}
              {features[currentNode] && flightPathQuizMode && (!features[currentNode].questions || features[currentNode].questions.length === 0) && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--line-90caf9)' }}>
                  <em style={{ color: 'var(--ink-666666)', fontSize: '13px' }}>No questions available for this location.</em>
                </div>
              )}
            </div>

            {/* Path History */}
            {flightPath.length > 1 && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Flight Path:</strong>
                <div style={{ marginTop: '5px', fontSize: '12px', color: 'var(--ink-666666)' }}>
                  {flightPath.map((nodeId, index) => (
                    <span key={`path-${index}`}>
                      {features[nodeId] ? features[nodeId].name : nodeId}
                      {index < flightPath.length - 1 && ' → '}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
              <button
                onClick={goBackInPath}
                disabled={flightPath.length <= 1}
                style={{ padding: '8px 12px', opacity: flightPath.length <= 1 ? 0.5 : 1 }}
              >
                ← Back
              </button>
              <button onClick={resetFlightPath} style={{ padding: '8px 12px' }}>
                Reset Path
              </button>
            </div>

            {/* Next Waypoints */}
            <div>
              <strong>Available Waypoints:</strong>
              <div className="cr-waypoints">
                {getNextNodes(currentNode).length > 0 ? (() => {
                  const group = groupOptions(getNextNodes(currentNode));
                  return (
                    <>
                      {/* The folder every option shares, so a bare runway list says where it is */}
                      {group.prefix.length > 0 && (
                        <div className="cr-waypoints-in">{group.prefix.join(' › ')}</div>
                      )}
                      <WaypointFolder
                        group={group}
                        path=""
                        open={openFolders}
                        toggle={key => setOpenFolders(prev => ({ ...prev, [key]: !prev[key] }))}
                        onSelect={selectNextNode}
                      />
                    </>
                  );
                })() : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-999999)' }}>
                    {features[currentNode]?.endNote || 'No more waypoints available from this location.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* All Areas Mode - Hierarchical Tree */}
        {controlMode === 'checklist' && (
          <div className="layer-tree">
            <h3>All Areas</h3>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={showAllInTree} style={{ padding: '8px 16px' }}>Show All</button>
              <button onClick={hideAllInTree} style={{ padding: '8px 16px' }}>Hide All</button>
            </div>
            <div className="tree-container" style={{background: 'var(--surface)', padding: '8px', minHeight: '400px', maxHeight: '600px', overflow: 'auto', width: '100%', boxSizing: 'border-box'}}>
              {Object.keys(folderTree).length === 0 ? (
                <p>Loading folders...</p>
              ) : (
                Object.entries(folderTree).map(([folderName, folder]) =>
                  renderTreeFolder(folderName, folder, 0)
                )
              )}
            </div>
          </div>
        )}

        {/* Quiz Mode */}
        {controlMode === 'quiz' && quizMode && (
          <div className="quiz-mode">
            {/* Pure Random Quiz */}
            {currentRandomFeature && features[currentRandomFeature] && (
              <div className="pure-random-quiz">
                <h3>Random Quiz</h3>

                {/* Folder Filter Dropdown */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Filter by Folder:</label>
                  <select
                    value={selectedQuizFolder}
                    onChange={(e) => {
                      setSelectedQuizFolder(e.target.value);
                      const newPool = initializeRandomPool(e.target.value);
                      getRandomFeature(newPool);
                    }}
                    style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                  >
                    {buildFolderOptions()}
                  </select>
                </div>

                {/* Feature Name */}
                <div style={{ marginBottom: '15px', padding: '10px', background: 'var(--surface-e3f2fd)', borderRadius: '4px' }}>
                  <strong>Feature:</strong>
                  <div style={{ marginTop: '5px' }}>
                    {features[currentRandomFeature].name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-666666)', marginTop: '3px' }}>
                    {features[currentRandomFeature].folderPath}
                  </div>
                </div>

                {/* Question with Blanks */}
                <div style={{ marginBottom: '15px', padding: '15px', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--line-dddddd)' }}>
                  <strong style={{ display: 'block', marginBottom: '10px' }}>
                    Question {currentRandomQuestionIndex + 1} of {features[currentRandomFeature].questions.length}:
                  </strong>
                  <div
                    style={{ lineHeight: '1.8', fontSize: '14px' }}
                    dangerouslySetInnerHTML={{
                      __html: parseQuestionWithBlanks(
                        features[currentRandomFeature].questions[currentRandomQuestionIndex],
                        features[currentRandomFeature].answers,
                        currentRandomQuestionIndex,
                        revealedAnswerIndices
                      ).html
                    }}
                  />
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <button
                    onClick={revealNextAnswer}
                    disabled={
                      revealedAnswerIndices.length >=
                      parseQuestionWithBlanks(
                        features[currentRandomFeature].questions[currentRandomQuestionIndex],
                        features[currentRandomFeature].answers,
                        currentRandomQuestionIndex,
                        []
                      ).totalBlanks
                    }
                    style={{
                      padding: '10px 20px',
                      background: '#4caf50',
                      color: 'var(--on-brand)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      opacity: revealedAnswerIndices.length >=
                        parseQuestionWithBlanks(
                          features[currentRandomFeature].questions[currentRandomQuestionIndex],
                          features[currentRandomFeature].answers,
                          currentRandomQuestionIndex,
                          []
                        ).totalBlanks ? 0.5 : 1
                    }}
                  >
                    Reveal Next Answer ({revealedAnswerIndices.length} / {
                      parseQuestionWithBlanks(
                        features[currentRandomFeature].questions[currentRandomQuestionIndex],
                        features[currentRandomFeature].answers,
                        currentRandomQuestionIndex,
                        []
                      ).totalBlanks
                    })
                  </button>
                  <button
                    onClick={nextRandomQuestion}
                    style={{
                      padding: '10px 20px',
                      background: '#1976d2',
                      color: 'var(--on-brand)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Next Question
                  </button>
                </div>
              </div>
            )}

            {(!currentRandomFeature || randomQuestionPool.length === 0) && (
              <div style={{ padding: '20px' }}>
                <h3>Pure Random Quiz</h3>

                {/* Folder Filter Dropdown */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Filter by Folder:</label>
                  <select
                    value={selectedQuizFolder}
                    onChange={(e) => {
                      setSelectedQuizFolder(e.target.value);
                      const newPool = initializeRandomPool(e.target.value);
                      getRandomFeature(newPool);
                    }}
                    style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                  >
                    {buildFolderOptions()}
                  </select>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <p>No questions available</p>
                  <button onClick={resetPureRandomQuiz} style={{ padding: '10px 20px', marginTop: '10px' }}>
                    Initialize Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TW4CourseRules;
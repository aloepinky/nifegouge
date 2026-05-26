import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import omnivore from '@mapbox/leaflet-omnivore';
import 'leaflet/dist/leaflet.css';
import { crFeatures } from './CourseRulesFeatures.js';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to load and manage KML layers
function KmlLayer({ url, visibleLayers, folderVisibility, featureVisibility, setFolderTree, selectedParentFolder, controlMode, visibleFlightPath, currentRandomFeature }) {
  const map = useMap();
  const layersRef = useRef({});
  const [layersLoaded, setLayersLoaded] = useState(false);

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

        // Now load with omnivore
        omnivore.kml(url)
          .on('ready', function() {
            const features = [];
            let layerIndex = 0;

            // Process each feature from the KML
            this.eachLayer(layer => {
              // Extract properties from KML
              const props = layer.feature?.properties || {};
              const name = props.name || 'Unnamed';
              const description = props.description || '';

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

              // Add popup with information
              // For verbose descriptions (like airport info), give more space and preserve HTML
              const featureId = `${category}-${subType || 'default'}-${features.length}`;

              // Get customDescription from crFeatures if available
              let customDescription = '';
              if (crFeatures[featureId] && crFeatures[featureId].customDescription) {
                const customDesc = crFeatures[featureId].customDescription;
                // If it's an array, join with line breaks; otherwise use as-is
                customDescription = Array.isArray(customDesc) ? customDesc.join('<br/>') : customDesc;
              }

              const hasVerboseDescription = description && description.length > 200;
              const popupContent = `
                <div style="max-width: ${hasVerboseDescription ? '500px' : '300px'}; max-height: 400px; overflow-y: auto;">
                  <strong style="font-size: 14px;">${name}</strong><br/>
                  <em style="font-size: 12px; color: #666;">${featureType}</em><br/>
                  ${description ? `<div style="margin-top: 10px; font-size: 13px;">${description}</div>` : ''}
                  ${customDescription ? `<div style="margin-top: 10px; font-size: 13px; color: #0066cc;">${customDescription}</div>` : ''}
                </div>
              `;
              layer.bindPopup(popupContent, {
                maxWidth: hasVerboseDescription ? 500 : 300,
                maxHeight: 400
              });

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
          .on('error', function(error) {
            console.error('Error loading KML:', error);
          });
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
  }, [url, map]);

  // Update visible layers when selection changes
  useEffect(() => {
    if (!layersLoaded) return; // Wait for layers to load

    Object.entries(layersRef.current).forEach(([id, { layer, category, subType, folderPath }]) => {
      // Always remove first to ensure clean state
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }

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

      // Then add back if visible
      if (shouldShow) {
        layer.addTo(map);
      }
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
  const [folderTree, setFolderTree] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [visibleLayers, setVisibleLayers] = useState({
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

  // Flight path builder quiz mode states
  const [flightPathQuizMode, setFlightPathQuizMode] = useState(false);
  const [fpQuizQuestionIndex, setFpQuizQuestionIndex] = useState(0);
  const [fpQuizRevealedAnswers, setFpQuizRevealedAnswers] = useState([]);

  // Pure Random Quiz Functions
  const initializeRandomPool = (folderFilter = '') => {
    // Create a pool of all features that have questions
    const allFeatures = [];

    Object.entries(crFeatures).forEach(([id, feature]) => {
      // Must have questions
      if (!feature.questions || feature.questions.length === 0) return;

      // If folder filter is set, check if feature matches
      if (folderFilter) {
        const featurePath = feature.folderPath || '';
        if (!(featurePath === folderFilter || featurePath.startsWith(folderFilter + ' > '))) {
          return;
        }
      }

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

    // Get current feature from the pool
    let index = currentQuestionIndex;

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

  const parseQuestionWithBlanks = (questionText, answers, questionIndex, revealedIndices) => {
    if (!questionText) return { html: '', totalBlanks: 0 };

    // Find all occurrences of 2+ consecutive underscores
    const blankPattern = /_{2,}/g;
    const matches = [];
    let match;

    while ((match = blankPattern.exec(questionText)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0]
      });
    }

    if (matches.length === 0) {
      return { html: questionText, totalBlanks: 0 };
    }

    // Build HTML with blanks
    let html = '';
    let lastIndex = 0;
    const answerArray = answers && answers[questionIndex] ? answers[questionIndex] : [];

    matches.forEach((blank, blankIndex) => {
      // Add text before this blank
      html += questionText.substring(lastIndex, blank.index);

      // Add blank or answer
      const isRevealed = revealedIndices.includes(blankIndex);
      const answerText = answerArray[blankIndex] || '';

      if (isRevealed && answerText) {
        html += `<span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;">${answerText}</span>`;
      } else {
        html += `<span style="display: inline-block; min-width: ${blank.length * 8}px; height: 20px; background: #ccc; border-radius: 3px; margin: 0 2px; vertical-align: middle;"></span>`;
      }

      lastIndex = blank.index + blank.length;
    });

    // Add remaining text
    html += questionText.substring(lastIndex);

    return { html, totalBlanks: matches.length };
  };

  const revealNextAnswer = () => {
    if (!currentRandomFeature || !crFeatures[currentRandomFeature]) return;

    const feature = crFeatures[currentRandomFeature];
    const questionText = feature.questions[currentRandomQuestionIndex];
    const { totalBlanks } = parseQuestionWithBlanks(questionText, feature.answers, currentRandomQuestionIndex, []);

    // Find next unrevealed answer
    if (revealedAnswerIndices.length < totalBlanks) {
      setRevealedAnswerIndices(prev => [...prev, prev.length]);
    }
  };

  const nextRandomQuestion = () => {
    if (!currentRandomFeature || !crFeatures[currentRandomFeature]) return;

    const feature = crFeatures[currentRandomFeature];
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
    if (!crFeatures[nodeId] || !crFeatures[nodeId].nextNode) return [];
    return crFeatures[nodeId].nextNode.filter(id => crFeatures[id]); // Only return valid nodes
  };

  // Format customDescription with bold words from answers
  const formatCustomDescription = (customDesc, answers) => {
    if (!customDesc) return '';

    // Get text content
    let text = Array.isArray(customDesc) ? customDesc.join('<br/>') : customDesc;

    // Collect all answer words
    const answerWords = new Set();
    if (answers && Array.isArray(answers)) {
      answers.forEach(answerItem => {
        if (Array.isArray(answerItem)) {
          answerItem.forEach(word => {
            if (typeof word === 'string' && word.trim()) {
              answerWords.add(word.trim().toLowerCase());
            }
          });
        } else if (typeof answerItem === 'string' && answerItem.trim()) {
          answerWords.add(answerItem.trim().toLowerCase());
        }
      });
    }

    // Bold any words that match answers (case-insensitive)
    if (answerWords.size > 0) {
      answerWords.forEach(answerWord => {
        // Escape special regex characters
        const escapedWord = answerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
        text = text.replace(regex, '<b>$1</b>');
      });
    }

    return text;
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
    const dependentNodes = crFeatures[nodeId]?.dependentNode || [];
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
    const dependentNodes = crFeatures[startingAirport]?.dependentNode || [];
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
    setVisibleFeatures(newPath);

    // Reset quiz when going back
    if (flightPathQuizMode) {
      setFpQuizQuestionIndex(0);
      setFpQuizRevealedAnswers([]);
    }
  };

  // Flight path quiz mode functions
  const revealNextFlightPathAnswer = () => {
    if (!currentNode || !crFeatures[currentNode]) return;

    const feature = crFeatures[currentNode];
    if (!feature.questions || feature.questions.length === 0) return;

    const questionText = feature.questions[fpQuizQuestionIndex];
    const { totalBlanks } = parseQuestionWithBlanks(questionText, feature.answers, fpQuizQuestionIndex, []);

    if (fpQuizRevealedAnswers.length < totalBlanks) {
      setFpQuizRevealedAnswers(prev => [...prev, prev.length]);
    }
  };

  const nextFlightPathQuestion = () => {
    if (!currentNode || !crFeatures[currentNode]) return;

    const feature = crFeatures[currentNode];
    if (!feature.questions || feature.questions.length === 0) return;

    // Move to next question if available
    if (fpQuizQuestionIndex < feature.questions.length - 1) {
      setFpQuizQuestionIndex(prev => prev + 1);
      setFpQuizRevealedAnswers([]);
    }
  };

  const handleFlightPathQuizButton = () => {
    if (!currentNode || !crFeatures[currentNode]) return;

    const feature = crFeatures[currentNode];
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

  // Show all folders and features in a specific parent folder only
  const showAllInSelectedArea = () => {
    if (!selectedParentFolder || !folderTree[selectedParentFolder]) return;

    const folderPaths = {};
    const featureIds = {};

    const collectPaths = (folder, basePath) => {
      const path = basePath;
      // Always show all folders including the parent
      folderPaths[path] = true;

      // Collect features
      if (folder.features) {
        folder.features.forEach(feature => {
          featureIds[feature.id] = true;
        });
      }

      // Recurse into children
      if (folder.children) {
        Object.entries(folder.children).forEach(([childName, childFolder]) => {
          const childPath = `${path} > ${childName}`;
          collectPaths(childFolder, childPath);
        });
      }
    };

    collectPaths(folderTree[selectedParentFolder], selectedParentFolder);

    setFolderVisibility(prev => ({ ...prev, ...folderPaths }));
    setTreeFeatureVisibility(prev => ({ ...prev, ...featureIds }));
  };

  // Hide all folders and features in a specific parent folder only
  const hideAllInSelectedArea = () => {
    if (!selectedParentFolder || !folderTree[selectedParentFolder]) return;

    const folderPaths = {};
    const featureIds = {};

    const collectPaths = (folder, basePath, isRoot = false) => {
      const path = basePath;

      // Don't hide the root parent folder, only its children
      if (!isRoot) {
        folderPaths[path] = false;
      }

      // Collect features
      if (folder.features) {
        folder.features.forEach(feature => {
          featureIds[feature.id] = false;
        });
      }

      // Recurse into children
      if (folder.children) {
        Object.entries(folder.children).forEach(([childName, childFolder]) => {
          const childPath = `${path} > ${childName}`;
          collectPaths(childFolder, childPath, false);
        });
      }
    };

    collectPaths(folderTree[selectedParentFolder], selectedParentFolder, true);

    setFolderVisibility(prev => ({ ...prev, ...folderPaths }));
    setTreeFeatureVisibility(prev => ({ ...prev, ...featureIds }));
  };

  // Build folder options for quiz dropdown
  const buildFolderOptions = () => {
    const options = [<option key="" value="">All Features</option>];

    const addFolderOptions = (tree, level = 0) => {
      Object.entries(tree).forEach(([folderName, folder]) => {
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
              color: '#000',
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
                backgroundColor: '#f5f5f5',
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
                  color: '#000',
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
      <h1 className="about-title">Course Rules</h1>
      <p className="about-text" style={{textAlign: 'center', fontStyle: 'italic', marginTop: '-30px'}}>
        Huge thank you to Francis Chval for the <a href="https://drive.google.com/drive/folders/1zRndKMJi24wtqIwm_tSC3z71ZMJgFVEk?usp=sharing" target="_blank" rel="noopener noreferrer">map data</a>
      </p>

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
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                    const dependentNodes = crFeatures[airportId]?.dependentNode || [];
                    setVisibleFeatures([airportId, ...dependentNodes]);
                    // Reset quiz when changing starting airport
                    if (flightPathQuizMode) {
                      setFpQuizQuestionIndex(0);
                      setFpQuizRevealedAnswers([]);
                    }
                  }}
                  style={{ flex: 1, padding: '8px', fontSize: '14px' }}
                >
                  <option value="Point-default-0">{crFeatures["Point-default-0"]?.parentFolder || "KTFP"}</option>
                  <option value="Point-default-21">{crFeatures["Point-default-21"]?.parentFolder || "KRAS"}</option>
                  <option value="Point-default-38">{crFeatures["Point-default-38"]?.parentFolder || "KALI"}</option>
                  <option value="Point-default-50">{crFeatures["Point-default-50"]?.parentFolder || "KRKP"}</option>
                  <option value="Point-default-95">{crFeatures["Point-default-95"]?.parentFolder || "KNGP"}</option>
                </select>
                <button
                  onClick={() => {
                    setFlightPathQuizMode(!flightPathQuizMode);
                    setFpQuizQuestionIndex(0);
                    setFpQuizRevealedAnswers([]);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: flightPathQuizMode ? '#1976d2' : '#e0e0e0',
                    color: flightPathQuizMode ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: flightPathQuizMode ? 'bold' : 'normal',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Quiz Mode
                </button>
                {flightPathQuizMode && crFeatures[currentNode] && crFeatures[currentNode].questions && crFeatures[currentNode].questions.length > 0 && (() => {
                  const feature = crFeatures[currentNode];
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
                        color: 'white',
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
            <div style={{ marginBottom: '15px', padding: '10px', background: '#e3f2fd', borderRadius: '4px' }}>
              <strong>Current Location:</strong>
              <div style={{ marginTop: '5px' }}>
                {crFeatures[currentNode] ? crFeatures[currentNode].name : `Loading... (${currentNode})`}
              </div>

              {/* Course Rule or Question (depending on quiz mode) */}
              {crFeatures[currentNode] && !flightPathQuizMode && crFeatures[currentNode].customDescription && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #90caf9' }}>
                  <strong>Course Rule:</strong>
                  <div
                    style={{ marginTop: '5px', fontSize: '13px', lineHeight: '1.4' }}
                    dangerouslySetInnerHTML={{
                      __html: formatCustomDescription(
                        crFeatures[currentNode].customDescription,
                        crFeatures[currentNode].answers
                      )
                    }}
                  />
                </div>
              )}

              {/* Question (when in quiz mode) */}
              {crFeatures[currentNode] && flightPathQuizMode && crFeatures[currentNode].questions && crFeatures[currentNode].questions.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #90caf9' }}>
                  <strong>Question {fpQuizQuestionIndex + 1} of {crFeatures[currentNode].questions.length}:</strong>
                  <div
                    style={{ marginTop: '5px', fontSize: '13px', lineHeight: '1.8' }}
                    dangerouslySetInnerHTML={{
                      __html: parseQuestionWithBlanks(
                        crFeatures[currentNode].questions[fpQuizQuestionIndex],
                        crFeatures[currentNode].answers,
                        fpQuizQuestionIndex,
                        fpQuizRevealedAnswers
                      ).html
                    }}
                  />
                </div>
              )}

              {/* No questions available message */}
              {crFeatures[currentNode] && flightPathQuizMode && (!crFeatures[currentNode].questions || crFeatures[currentNode].questions.length === 0) && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #90caf9' }}>
                  <em style={{ color: '#666', fontSize: '13px' }}>No questions available for this location.</em>
                </div>
              )}

              {/* Debug info */}
              {!crFeatures[currentNode] && (
                <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
                  Debug: crFeatures loaded: {Object.keys(crFeatures).length} features
                </div>
              )}
            </div>

            {/* Path History */}
            {flightPath.length > 1 && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Flight Path:</strong>
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                  {flightPath.map((nodeId, index) => (
                    <span key={`path-${index}`}>
                      {crFeatures[nodeId] ? crFeatures[nodeId].name : nodeId}
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
              <div style={{
                marginTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '400px',
                overflow: 'auto'
              }}>
                {getNextNodes(currentNode).length > 0 ? (
                  getNextNodes(currentNode).map(nodeId => {
                    const feature = crFeatures[nodeId];
                    if (!feature) {
                      console.log('Feature not found:', nodeId);
                      return (
                        <div key={nodeId} style={{ padding: '12px', background: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
                          Feature not found: {nodeId}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={nodeId}
                        onClick={() => selectNextNode(nodeId)}
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          background: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          color: '#000'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f0f0f0';
                          e.currentTarget.style.borderColor = '#999';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#ddd';
                        }}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#000' }}>
                          {feature.name || 'Unnamed'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {feature.folderPath || 'No folder'} {feature.subCategory && `• ${feature.subCategory}`}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No more waypoints available from this location.
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
            <div className="tree-container" style={{background: 'white', padding: '8px', minHeight: '400px', maxHeight: '600px', overflow: 'auto', width: '100%', boxSizing: 'border-box'}}>
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
            {currentRandomFeature && crFeatures[currentRandomFeature] && (
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
                <div style={{ marginBottom: '15px', padding: '10px', background: '#e3f2fd', borderRadius: '4px' }}>
                  <strong>Feature:</strong>
                  <div style={{ marginTop: '5px' }}>
                    {crFeatures[currentRandomFeature].name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
                    {crFeatures[currentRandomFeature].folderPath}
                  </div>
                </div>

                {/* Question with Blanks */}
                <div style={{ marginBottom: '15px', padding: '15px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <strong style={{ display: 'block', marginBottom: '10px' }}>
                    Question {currentRandomQuestionIndex + 1} of {crFeatures[currentRandomFeature].questions.length}:
                  </strong>
                  <div
                    style={{ lineHeight: '1.8', fontSize: '14px' }}
                    dangerouslySetInnerHTML={{
                      __html: parseQuestionWithBlanks(
                        crFeatures[currentRandomFeature].questions[currentRandomQuestionIndex],
                        crFeatures[currentRandomFeature].answers,
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
                        crFeatures[currentRandomFeature].questions[currentRandomQuestionIndex],
                        crFeatures[currentRandomFeature].answers,
                        currentRandomQuestionIndex,
                        []
                      ).totalBlanks
                    }
                    style={{
                      padding: '10px 20px',
                      background: '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      opacity: revealedAnswerIndices.length >=
                        parseQuestionWithBlanks(
                          crFeatures[currentRandomFeature].questions[currentRandomQuestionIndex],
                          crFeatures[currentRandomFeature].answers,
                          currentRandomQuestionIndex,
                          []
                        ).totalBlanks ? 0.5 : 1
                    }}
                  >
                    Reveal Next Answer ({revealedAnswerIndices.length} / {
                      parseQuestionWithBlanks(
                        crFeatures[currentRandomFeature].questions[currentRandomQuestionIndex],
                        crFeatures[currentRandomFeature].answers,
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
                      color: 'white',
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
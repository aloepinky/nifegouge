import React, { useState, useEffect, useRef } from 'react';
import { jetLog, JetLogInputError, gradeJetLogBox } from './navMath';

function JetLog() {
  const [xMode, setXMode] = useState(false);
  const [hintStage, setHintStage] = useState(0);
  const [xedCells, setXedCells] = useState(new Set());
  const [inputValues, setInputValues] = useState({});
  const [message, setMessage] = useState('');
  const tableRef = useRef(null);
  // On a narrow screen the log keeps its desktop layout (800 px) and is zoomed to fit, as
  // the Primary jet log is; squeezed instead, its boxes are too narrow for a time or wind
  // (an HH:MM:SS needs about 62 px of its 13 columns).
  const fitRef = useRef(null);
  const [fit, setFit] = useState(1);

  useEffect(() => {
    const update = () => {
      const el = fitRef.current;
      if (el) setFit(Math.min(1, el.offsetWidth / 800));
    };
    update();
    const obs = new ResizeObserver(() => requestAnimationFrame(update));
    if (fitRef.current) obs.observe(fitRef.current);
    return () => obs.disconnect();
  }, []);
  // The solvers read the table and graph through refs, so Solve Next Row and Solve All
  // see each box they fill before moving to the next one.
  const valuesRef = useRef({});
  const graphRef = useRef({});

  const updateValues = (fn) => {
    valuesRef.current = fn(valuesRef.current);
    setInputValues(valuesRef.current);
  };

  // Initialize the cell graph with all the solving logic
  useEffect(() => {
    const graph = {
      "r0c8": {dependsOn: [], solver: () => givenF('r0c8'), next: "r0c9", solved: false, denominator: null},
      "r0c9": {dependsOn: [], solver: () => givenF('r0c9'), next: "r1c1", solved: false, denominator: null},
      "r1c1": {dependsOn: [], solver: () => givenF('r1c1'), next: "r1c2", solved: false, denominator: null},
      "r1c2": {dependsOn: [], solver: () => givenF('r1c2'), next: "r1c3", solved: false, denominator: null},
      "r1c3": {dependsOn: [], solver: () => givenF('r1c3'), next: "r2c2", solved: false, denominator: null},
      "r2c2": {dependsOn: [], solver: () => givenF('r2c2'), next: "r2c3", solved: false, denominator: null},
      "r2c3": {dependsOn: [], solver: () => givenF('r2c3'), next: "r2c8", solved: false, denominator: null},
      "r2c8": {dependsOn: ["r1c3", "r2c2"], solver: ([winds, course]) => hwtwF(winds, course), next: "r3c5", solved: false, denominator: 150},
      "r3c5": {dependsOn: ["r1c3", "r2c2"], solver: ([winds, course]) => xwF(winds, course), next: "r2c9", solved: false, denominator: 100},
      "r2c9": {dependsOn: ["r0c9", "r2c8"], solver: ([tas, hwtw]) => gsF(tas, hwtw), next: "r3c6", solved: false, denominator: 200},
      "r3c6": {dependsOn: ["r0c9", "r3c5"], solver: ([tas, xw]) => caF(tas, xw), next: "r3c7", solved: false, denominator: 100},
      "r3c7": {dependsOn: ["r2c2", "r3c6"], solver: ([course, ca]) => thF(course, ca), next: "r2c4", solved: false, denominator: 100},
      "r2c4": {dependsOn: ["r2c9", "r2c3"], solver: ([gs, dist]) => eteF(gs, dist), next: "r3c2", solved: false, denominator: 100},
      "r3c2": {dependsOn: ["r2c4"], solver: ([ete]) => altEteF(ete), next: "r2c5", solved: false, denominator: null},
      "r2c5": {dependsOn: ["r1c1", "r2c4"], solver: ([ata, ete]) => etaF(ata, ete), next: "r2c6", solved: false, denominator: null},
      "r2c6": {dependsOn: ["r0c8", "r2c4"], solver: ([pph, ete]) => fuelF(pph, ete), next: "r2c7", solved: false, denominator: 200},
      "r2c7": {dependsOn: ["r1c2", "r2c6"], solver: ([afr, fuel]) => efrF(afr, fuel), next: "r4c8", solved: false, denominator: 200},
      "r4c8": {dependsOn: [], solver: () => givenF('r4c8'), next: "r4c9", solved: false, denominator: null},
      "r4c9": {dependsOn: [], solver: () => givenF('r4c9'), next: "r5c1", solved: false, denominator: null},
      "r5c1": {dependsOn: [], solver: () => givenF('r5c1'), next: "r5c2", solved: false, denominator: null},
      "r5c2": {dependsOn: [], solver: () => givenF('r5c2'), next: "r6c4", solved: false, denominator: null},
      "r6c4": {dependsOn: [], solver: () => givenF('r6c4'), next: "r7c2", solved: false, denominator: null},
      "r7c2": {dependsOn: ["r6c4"], solver: ([ete]) => altEteF(ete), next: "r7c3", solved: false, denominator: null},
      "r7c3": {dependsOn: ["r5c1", "r6c4"], solver: ([ata, ete]) => etaF(ata, ete), next: "r6c2", solved: false, denominator: null},
      "r6c2": {dependsOn: [], solver: () => givenF('r6c2'), next: "r6c3", solved: false, denominator: null},
      "r6c3": {dependsOn: [], solver: () => givenF('r6c3'), next: "r7c7", solved: false, denominator: null},
      "r7c7": {dependsOn: ["r3c7"], solver: ([th]) => iThF(th), next: "r7c6", solved: false, denominator: 2},
      "r7c6": {dependsOn: ["r6c2", "r7c7"], solver: ([course, th]) => daF(course, th), next: "r6c9", solved: false, denominator: 100},
      "r6c9": {dependsOn: ["r6c4", "r6c3"], solver: ([ete, dist]) => iGsF(ete, dist), next: "r7c5", solved: false, denominator: 20},
      "r7c5": {dependsOn: ["r4c9", "r7c6"], solver: ([tas, da]) => iXwF(tas, da), next: "r6c8", solved: false, denominator: 100},
      "r6c8": {dependsOn: ["r4c9", "r6c9"], solver: ([tas, gs]) => iHwtwF(tas, gs), next: "r5c3", solved: false, denominator: 150},
      "r5c3": {dependsOn: ["r7c5", "r6c8"], solver: ([xw, hwtw]) => inflightF(xw, hwtw), next: "r6c6", solved: false, denominator: null},
      "r6c6": {dependsOn: ["r4c8", "r6c4"], solver: ([pph, ete]) => fuelF(pph, ete), next: "r7c4", solved: false, denominator: 200},
      "r7c4": {dependsOn: ["r5c2", "r6c6"], solver: ([afr, fuel]) => efrF(afr, fuel), next: "r8c2", solved: false, denominator: 200},
      "r8c2": {dependsOn: [], solver: () => givenF('r8c2'), next: "r8c3", solved: false, denominator: null},
      "r8c3": {dependsOn: [], solver: () => givenF('r8c3'), next: "r8c8", solved: false, denominator: null},
      "r8c8": {dependsOn: ["r5c3", "r8c2"], solver: ([winds, course]) => hwtwF(winds, course), next: "r9c5", solved: false, denominator: 150},
      "r9c5": {dependsOn: ["r5c3", "r8c2"], solver: ([winds, course]) => xwF(winds, course), next: "r8c9", solved: false, denominator: 100},
      "r8c9": {dependsOn: ["r4c9", "r8c8"], solver: ([tas, hwtw]) => gsF(tas, hwtw), next: "r9c6", solved: false, denominator: 200},
      "r9c6": {dependsOn: ["r4c9", "r9c5"], solver: ([tas, xw]) => caF(tas, xw), next: "r9c7", solved: false, denominator: 100},
      "r9c7": {dependsOn: ["r8c2", "r9c6"], solver: ([course, ca]) => thF(course, ca), next: "r8c4", solved: false, denominator: 100},
      "r8c4": {dependsOn: ["r8c9", "r8c3"], solver: ([gs, dist]) => eteF(gs, dist), next: "r9c2", solved: false, denominator: 100},
      "r9c2": {dependsOn: ["r8c4"], solver: ([ete]) => altEteF(ete), next: "r8c5", solved: false, denominator: null},
      "r8c5": {dependsOn: ["r7c3", "r8c4"], solver: ([ata, ete]) => etaF(ata, ete), next: "r8c6", solved: false, denominator: null},
      "r8c6": {dependsOn: ["r4c8", "r8c4"], solver: ([pph, ete]) => fuelF(pph, ete), next: "r8c7", solved: false, denominator: 200},
      "r8c7": {dependsOn: ["r7c4", "r8c6"], solver: ([afr, fuel]) => efrF(afr, fuel), next: null, solved: false, denominator: 200}
    };
    graphRef.current = graph;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper functions
  const isFilled = (cellId) => {
    const input = getInputValue(cellId);
    return /\d/.test(input);
  };

  const getInputValue = (cellId) => {
    const value = valuesRef.current[cellId] || "";
    const match = value.match(/\d+(\.\d+)?[\dA-Za-z\s:/-]*/);
    return match ? match[0].trim() : "";
  };

  const setInputValue = (cellId, value) => {
    const original = valuesRef.current[cellId] || "";
    const match = original.match(/^(.*?)(-?\d[\d\s\S]*)?$/);
    const prefix = match ? match[1] : "";
    updateValues(prev => ({ ...prev, [cellId]: prefix + value }));
  };

  const getRowIndex = (cellId) => {
    return parseInt(cellId.match(/^r(\d+)c\d+$/)?.[1], 10);
  };

  const removeGlowFromAllCells = () => {
    tableRef.current?.querySelectorAll("td").forEach(cell => {
      cell.classList.remove("glow");
    });
  };

  const makeCellGlow = (cellId, colorName) => {
    const cell = document.getElementById(cellId);
    const colors = {
      yellow: { start: '#fff9c7', mid: '#fff36b', end: '#fff9c7' },
      red: { start: '#fac7c7ff', mid: '#ffaaaa', end: '#fac7c7ff' },
      blue: { start: '#c7d7fa', mid: '#6b95ff', end: '#c7d7fa' },
      green: { start: '#c7fada', mid: '#6bff95', end: '#c7fada' }
    };

    if (cell && colors[colorName]) {
      cell.style.setProperty('--glow-start', colors[colorName].start);
      cell.style.setProperty('--glow-mid', colors[colorName].mid);
      cell.style.setProperty('--glow-end', colors[colorName].end);
      cell.classList.add("glow");
    }
  };

  // Handler for input changes
  const handleInputChange = (cellId, value) => {
    updateValues(prev => ({ ...prev, [cellId]: value }));
    if (graphRef.current[cellId]) graphRef.current[cellId].solved = false;
    setMessage('');
    removeGlowFromAllCells();
  };

  // Solver functions
  const givenF = (cellId) => {
    if (isFilled(cellId)) {
      return "";
    } else {
      makeCellGlow(cellId, "red");
      return null;
    }
  };

  // Work a box from the boxes it depends on; a box that can't be read says what to type.
  const work = (fn) => (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      if (!(e instanceof JetLogInputError)) throw e;
      setMessage(e.message);
      return null;
    }
  };

  const hwtwF = work(jetLog.hwtw);
  const xwF = work(jetLog.xw);
  const gsF = work(jetLog.gs);
  const caF = work(jetLog.ca);
  const thF = work(jetLog.th);
  const eteF = work(jetLog.ete);
  const altEteF = work(jetLog.altEte);
  const etaF = work(jetLog.eta);
  const fuelF = work(jetLog.fuel);
  const efrF = work(jetLog.efr);
  const iThF = (th) => th;
  const daF = work(jetLog.da);
  const iGsF = work(jetLog.inflightGs);
  const iXwF = work(jetLog.inflightXw);
  const iHwtwF = work(jetLog.inflightHwtw);
  // The in-flight wind is worked against the track flown (r6c2).
  const inflightF = (xw, hwtw) => work(jetLog.inflightWind)(xw, hwtw, getInputValue("r6c2"));

  // Main action functions
  const findNextSolvableCell = (startId = 'r0c8') => {
    const graph = graphRef.current;
    let id = startId;
    while (id && graph[id]) {
      const cell = graph[id];
      if (!cell.solved && !isFilled(id)) {
        return id;
      }
      id = cell.next;
    }
    return null;
  };

  const solveNextCell = () => {
    removeGlowFromAllCells();
    setMessage('');
    const graph = graphRef.current;
    const nextId = findNextSolvableCell();
    if (!nextId || !graph[nextId]) return null;
    const cell = graph[nextId];
    const inputs = cell.dependsOn.map(getInputValue);
    const result = cell.solver(inputs);
    
    if (result === null) return null;
    
    setInputValue(nextId, String(result));
    cell.solved = true;
    
    return { solved: nextId, next: cell.next };
  };

  const solveNextRow = () => {
    let result = solveNextCell();
    if (!result) return;

    const baseRow = getRowIndex(result.solved);
    
    while (result && result.next) {
      const nextRow = getRowIndex(result.next);
      if (nextRow > baseRow && nextRow % 2 === 0) break;
      
      result = solveNextCell();
      if (!result) break;
    }
  };

  const solveAll = () => {
    let result = solveNextCell();
    while (result && result.next) {
      result = solveNextCell();
    }
  };

  // Headings wrap at 360; their trailing T means true, not tailwind.
  const HEADING_CELLS = new Set(['r3c7', 'r7c7', 'r9c7']);

  const checkWork = () => {
    removeGlowFromAllCells();
    setMessage('');
    const graph = graphRef.current;
    let checkId = "r0c8";
    
    while (checkId && graph[checkId]) {
      const cell = graph[checkId];
      
      // Grade every box the student has filled in, against their own earlier boxes; skip
      // empty ones, and any whose inputs are still empty, rather than stopping there.
      if (!isFilled(checkId) || cell.solved || cell.denominator === null
          || !cell.dependsOn.every(isFilled)) {
        checkId = cell.next;
        continue;
      }
      
      const inputs = cell.dependsOn.map(getInputValue);
      const result = cell.solver(inputs);
      if (result === null) {
        checkId = cell.next;
        continue;
      }
      makeCellGlow(checkId, gradeJetLogBox(getInputValue(checkId), result, cell.denominator, HEADING_CELLS.has(checkId)));
      
      checkId = cell.next;
    }
  };

  const hint = () => {
    const nextId = findNextSolvableCell();
    if (!nextId || !graphRef.current[nextId]) return;

    const inputs = graphRef.current[nextId].dependsOn;

    if (hintStage === 0) {
      removeGlowFromAllCells();
      makeCellGlow(nextId, "blue");
      setHintStage(1);
    } else {
      inputs.forEach(inputId => makeCellGlow(inputId, "green"));
      setHintStage(0);
    }
  };

  const autoGougeJetLog = () => {
    removeGlowFromAllCells();
    const matrix = [
      [0, 1, 1, 1, 1, 1, 1, 1, "FF: ", "TAS: "],
      [1, 0, 0, "PRE-FLIGHT WINDS: "],
      [0, 1, 0, 0, 0, 0, 0, 0, "HW/TW: ", "GS: "],
      [1, 0, 0, 1, 1, "XW: ", "CA: ", "TH: "],
      ["TAKEOFF", 1, 1, 1, 1, 1, 1, 1, "FF: ", "TAS: "],
      [1, 0, 0, "IN-FLIGHT WINDS: "],
      [0, 1, 0, 0, 0, 1, 0, 1, "HW/TW: ", "GS: "],
      [1, "      TRK", 0, 0, 0, "XW: ", "DA: ", "TH: "],
      [0, 1, 0, 0, 0, 0, 0, 0, "HW/TW: ", "GS: "],
      [1, 0, 0, 1, 1, "XW: ", "CA: ", "TH: "],
    ];

    const newXedCells = new Set();
    const newInputValues = { ...valuesRef.current };

    matrix.forEach((row, rowIndex) => {
      row.forEach((val, colIndex) => {
        const cellId = `r${rowIndex}c${colIndex}`;
        
        if (val === 1) {
          newXedCells.add(cellId);
        } else if (typeof val === "string") {
          newInputValues[cellId] = val;
        }
      });
    });

    setXedCells(newXedCells);
    updateValues(() => newInputValues);
  };

  const resetJetLogTable = () => {
    setXedCells(new Set());
    updateValues(() => ({}));
    Object.values(graphRef.current).forEach(cell => { cell.solved = false; });
    setMessage('');
    removeGlowFromAllCells();
  };

  const handleCellClick = (e, cellId) => {
    if (!xMode) return;
    e.stopPropagation();

    if (xedCells.has(cellId)) {
      setXedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellId);
        return newSet;
      });
    } else {
      setXedCells(prev => new Set([...prev, cellId]));
    }
  };

  const renderCell = (cellId, rowSpan, colSpan) => {
    const isXed = xedCells.has(cellId);
    const cellProps = {
      id: cellId,
      ...(rowSpan && { rowSpan }),
      ...(colSpan && { colSpan }),
      className: isXed ? 'xcell' : '',
      onClick: (e) => handleCellClick(e, cellId)
    };

    return (
      <td {...cellProps}>
        {!isXed && (
          <input
            value={inputValues[cellId] || ''}
            onChange={(e) => handleInputChange(cellId, e.target.value)}
          />
        )}
      </td>
    );
  };

  return (
    <div className="jetlog-container">
      <h1>Jet Log</h1>
      
      <div className="button-container">
        <button onClick={resetJetLogTable}>Reset</button>
        <button onClick={() => setXMode(!xMode)}>
          {xMode ? 'Exit' : 'Enter'}<br/>X-Mode
        </button>
        <button onClick={autoGougeJetLog}>Auto-Gouge<br/>Jet Log</button>
        <button onClick={checkWork}>Check</button>
        <button onClick={hint}>
          {hintStage === 0 ? 'Hint' : <>Another<br/>Hint</>}
        </button>
        <button onClick={solveNextCell}>Solve Next<br/>Box</button>
        <button onClick={solveNextRow}>Solve Next<br/>Row</button>
        <button onClick={solveAll}>Solve All</button>
      </div>

      {message && <div className="jetlog-message" role="alert">{message}</div>}

      <div ref={fitRef}>
      <div className={fit < 1 ? 'jetlog-fit' : undefined} style={fit < 1 ? { zoom: fit } : undefined}>
      <table ref={tableRef} className="jetlog-table">
        <thead>
          <tr>
            <th rowSpan="2">ROUTE<br/>TO</th>
            <th>IDENT</th>
            <th>TC</th>
            <th rowSpan="2">DIST</th>
            <th rowSpan="2">ETE</th>
            <th>ETA</th>
            <th rowSpan="2">LEG<br/>FUEL</th>
            <th>EFR</th>
            <th rowSpan="2" colSpan="3">NOTES</th>
          </tr>
          <tr>
            <th>CHAN</th>
            <th>MH</th>
            <th>ATA</th>
            <th>AFR</th>
          </tr>
        </thead>
        <tbody>
          {/* Rows 0-1 */}
          <tr>
            {renderCell('r0c0', 2)}
            {renderCell('r0c1')}
            {renderCell('r0c2', 2)}
            {renderCell('r0c3', 2)}
            {renderCell('r0c4', 2)}
            {renderCell('r0c5')}
            {renderCell('r0c6', 2)}
            {renderCell('r0c7')}
            {renderCell('r0c8', null, 2)}
            {renderCell('r0c9')}
          </tr>
          <tr>
            {renderCell('r1c0')}
            {renderCell('r1c1')}
            {renderCell('r1c2')}
            {renderCell('r1c3', null, 3)}
          </tr>
          
          {/* Rows 2-3 */}
          <tr>
            {renderCell('r2c0', 2)}
            {renderCell('r2c1')}
            {renderCell('r2c2')}
            {renderCell('r2c3', 2)}
            {renderCell('r2c4')}
            {renderCell('r2c5')}
            {renderCell('r2c6', 2)}
            {renderCell('r2c7')}
            {renderCell('r2c8', null, 2)}
            {renderCell('r2c9')}
          </tr>
          <tr>
            {renderCell('r3c0')}
            {renderCell('r3c1')}
            {renderCell('r3c2')}
            {renderCell('r3c3')}
            {renderCell('r3c4')}
            {renderCell('r3c5')}
            {renderCell('r3c6')}
            {renderCell('r3c7')}
          </tr>
          
          {/* Rows 4-5 */}
          <tr>
            {renderCell('r4c0', 2)}
            {renderCell('r4c1')}
            {renderCell('r4c2', 2)}
            {renderCell('r4c3', 2)}
            {renderCell('r4c4', 2)}
            {renderCell('r4c5')}
            {renderCell('r4c6', 2)}
            {renderCell('r4c7')}
            {renderCell('r4c8', null, 2)}
            {renderCell('r4c9')}
          </tr>
          <tr>
            {renderCell('r5c0')}
            {renderCell('r5c1')}
            {renderCell('r5c2')}
            {renderCell('r5c3', null, 3)}
          </tr>
          
          {/* Rows 6-7 */}
          <tr>
            {renderCell('r6c0', 2)}
            {renderCell('r6c1')}
            {renderCell('r6c2')}
            {renderCell('r6c3', 2)}
            {renderCell('r6c4')}
            {renderCell('r6c5')}
            {renderCell('r6c6', 2)}
            {renderCell('r6c7')}
            {renderCell('r6c8', null, 2)}
            {renderCell('r6c9')}
          </tr>
          <tr>
            {renderCell('r7c0')}
            {renderCell('r7c1')}
            {renderCell('r7c2')}
            {renderCell('r7c3')}
            {renderCell('r7c4')}
            {renderCell('r7c5')}
            {renderCell('r7c6')}
            {renderCell('r7c7')}
          </tr>
          
          {/* Rows 8-9 */}
          <tr>
            {renderCell('r8c0', 2)}
            {renderCell('r8c1')}
            {renderCell('r8c2')}
            {renderCell('r8c3', 2)}
            {renderCell('r8c4')}
            {renderCell('r8c5')}
            {renderCell('r8c6', 2)}
            {renderCell('r8c7')}
            {renderCell('r8c8', null, 2)}
            {renderCell('r8c9')}
          </tr>
          <tr>
            {renderCell('r9c0')}
            {renderCell('r9c1')}
            {renderCell('r9c2')}
            {renderCell('r9c3')}
            {renderCell('r9c4')}
            {renderCell('r9c5')}
            {renderCell('r9c6')}
            {renderCell('r9c7')}
          </tr>
        </tbody>
      </table>
      </div>
      </div>
    </div>
  );
}

export default JetLog;
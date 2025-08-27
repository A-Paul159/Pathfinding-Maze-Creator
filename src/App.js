import React, { useState, useCallback, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faEraser, faRandom } from '@fortawesome/free-solid-svg-icons';
import { faStop } from '@fortawesome/free-solid-svg-icons';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';



const CELL_SIZE = 24;
const GRID_WIDTH = 54;
const GRID_HEIGHT = 27;
const MazeCell = React.memo(({ isWall, isStart, isEnd, isPath, algorithm, onMouseDown, onMouseEnter, onMouseUp, clearVisuals, weight}) => (
  <div
    onMouseDown={onMouseDown}
    onMouseEnter={onMouseEnter}
    onMouseUp={onMouseUp}
    className={`maze-cell
      ${isWall ? 'wall' : ''}
      ${isStart ? 'start' : ''}
      ${isEnd ? 'end' : ''}
      ${!isWall && isPath && !clearVisuals ? `path-${algorithm}` : ''}
      ${!isWall && !isPath && weight === 5 ? 'weight-5' : ''}
      ${!isWall && !isPath && weight === 10 ? 'weight-10' : ''}`}
      style={{width: CELL_SIZE,height: CELL_SIZE,position: 'relative'}}      
  >
  </div>
));

const App = () => {
  const [grid, setGrid] = useState(() => Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(false)));
  const [weights, setWeights] = useState(() =>
    Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(1))
  );
  
  const [showInfo, setShowInfo] = useState(false);
  const [start, setStart] = useState([2, 3]);
  const [end, setEnd] = useState([GRID_HEIGHT - 3, GRID_WIDTH - 4]);
  const [mode, setMode] = useState('wall');
  const [algorithm, setAlgorithm] = useState('bfs');
  const [path, setPath] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(20); // Speed in ms
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [version, setVersion] = useState(0);
  const [clearVisuals, setClearVisuals] = useState(false);
  const [nodesVisited, setNodesVisited] = useState(0);
  const [pathLength, setPathLength] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const pauseRef = useRef(false);
  const stopRef = useRef(false);

  useEffect(() => {
    if (showInfo) {
      const modal = document.getElementById("info-window");
      if (modal) {
        const { innerWidth, innerHeight } = window;
        const { offsetWidth, offsetHeight } = modal;
        modal.style.left = `${(innerWidth - offsetWidth) / 2}px`;
        modal.style.top = `${(innerHeight - offsetHeight) / 2}px`;
      }
    }
  }, [showInfo]);
  
  const sleep = async (ms) => {
    while (pauseRef.current) {
      if (stopRef.current) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (stopRef.current) return;
    return ms <= 0 ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, ms));
  };
  
  const resetGrid = useCallback(() => {
    setGrid(Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(false)));
    setWeights(Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(1)));
    setPath([]);
  }, []);
  
  const toggleRunning = () => {
    if (isRunning) {
      setIsPaused(prev => !prev);
      pauseRef.current = !pauseRef.current;
    } else {
      findPath();
    }
  };

  const reconstructPath = (parent, endKey, skipLast = false) => {
    const finalPath = [];
    let current = endKey;
    while (parent.has(current)) {
      finalPath.unshift(current.split(',').map(Number));
      current = parent.get(current)?.join(',');
    }
    if (skipLast) finalPath.pop();
    return finalPath;
  };

  const generateMaze = () => {
    const newGrid = [];
    const newWeights = [];
    for (let r = 0; r < GRID_HEIGHT; r++) {
      const gridRow = [];
      const weightRow = [];
      for (let c = 0; c < GRID_WIDTH; c++) {
        if ((r === start[0] && c === start[1]) || (r === end[0] && c === end[1])) {
          gridRow.push(false);         
          weightRow.push(1);           
        } else {
          const isWall = Math.random() < 0.25;
          gridRow.push(isWall);
          weightRow.push(isWall ? 5 : getRandomWeight());
        }
      }
      newGrid.push(gridRow);
      newWeights.push(weightRow);
    }
    setGrid(newGrid);
    setWeights(newWeights);
    setPath([]);
  };

  const getRandomWeight = () => {
    const weights = [5, 5, 5, 10];
    return weights[Math.floor(Math.random() * weights.length)];
  };

  const findPath = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    pauseRef.current = false;
    stopRef.current = false;
    setPath([]);
    const visited = new Set();
    const parent = new Map();
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    const bfs = async () => {                             //BFS Algo
      const startTime = performance.now(); 
      let visitedCount = 1;
      const queue = [[...start]];
      visited.add(`${start[0]},${start[1]}`);
      let step = 0;
      while (queue.length) {
        const [row, col] = queue.shift();
        if (stopRef.current) {
          setIsRunning(false);
          return;
        }
        if (row === end[0] && col === end[1]) break;
        for (const [dr, dc] of directions) {
          const newRow = row + dr;
          const newCol = col + dc;
          const key = `${newRow},${newCol}`;
          if (
            newRow >= 0 && newRow < GRID_HEIGHT &&
            newCol >= 0 && newCol < GRID_WIDTH &&
            !grid[newRow][newCol] &&
            !visited.has(key)
          ) {
            visited.add(key);
            parent.set(key, [row, col]);
            queue.push([newRow, newCol]);
            visitedCount++;
            step++;
            if (step % 5 === 0) {
              await sleep(speed);
              setPath([...parent.keys()].map(k => k.split(',').map(Number)));
            }
          }
        }
      }
      const finalPath = reconstructPath(parent, `${end[0]},${end[1]}`, true);
      setPath(finalPath);
      setNodesVisited(visitedCount);
      setPathLength(finalPath.length);
      setTimeTaken(Math.round(performance.now() - startTime));
      setIsRunning(false);
    };
    
    const dfs = async () => {                             //DFS Algo
      const startTime = performance.now(); 
      let visitedCount = 1;
      const stack = [[...start]];
      visited.add(`${start[0]},${start[1]}`);
      let step = 0;
      while (stack.length) {
        const [row, col] = stack.pop();
        if (stopRef.current) {
          setIsRunning(false);
          return;
        }
        if (row === end[0] && col === end[1]) break;
        for (const [dr, dc] of directions) {
          const newRow = row + dr;
          const newCol = col + dc;
          const key = `${newRow},${newCol}`;
          if (
            newRow >= 0 && newRow < GRID_HEIGHT &&
            newCol >= 0 && newCol < GRID_WIDTH &&
            !grid[newRow][newCol] &&
            !visited.has(key)
          ) {
            visited.add(key);
            parent.set(key, [row, col]);
            stack.push([newRow, newCol]);
            visitedCount++; 
            step++;
            if (step % 5 === 0) {
              await sleep(speed);
              setPath([...parent.keys()].map(k => k.split(',').map(Number)));
            }
          }
        }
      }
      const finalPath = reconstructPath(parent, `${end[0]},${end[1]}`, true);
      setPath(finalPath);
      setNodesVisited(visitedCount);
      setPathLength(finalPath.length);
      setTimeTaken(Math.round(performance.now() - startTime)); 
      setIsRunning(false);
    };
    

    const dijkstra = async () => {                        //DIJKSTRA Algo
      const startTime = performance.now();
      let visitedCount = 0;
      const dist = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(Infinity));
      dist[start[0]][start[1]] = 0;
      const pq = [[0, ...start]];
      let step = 0;
      while (pq.length) {
        pq.sort((a, b) => a[0] - b[0]);
        const [cost, row, col] = pq.shift();
        const key = `${row},${col}`;
        if (stopRef.current) {
          setIsRunning(false);
          return;
        }
        if (visited.has(key)) continue;
        visited.add(key);
        visitedCount++;
        if (row === end[0] && col === end[1]) break;
        for (const [dr, dc] of directions) {
          const newRow = row + dr;
          const newCol = col + dc;
          if (
            newRow >= 0 && newRow < GRID_HEIGHT &&
            newCol >= 0 && newCol < GRID_WIDTH &&
            !grid[newRow][newCol]
          ) {
            const newCost = cost + weights[newRow][newCol];
            const newKey = `${newRow},${newCol}`;
            if (newCost < dist[newRow][newCol]) {
              dist[newRow][newCol] = newCost;
              parent.set(newKey, [row, col]);
              pq.push([newCost, newRow, newCol]);
              step++;
              if (step % 5 === 0) {
                await sleep(speed);
                setPath([...parent.keys()].map(k => k.split(',').map(Number)));
              }
            }
          }
        }
      }
      const finalPath = reconstructPath(parent, `${end[0]},${end[1]}`, true);
      setPath(finalPath);
      setNodesVisited(visitedCount);
      setPathLength(finalPath.length);
      setTimeTaken(Math.round(performance.now() - startTime));
      setIsRunning(false);
    };

    const aStar = async () => {                            //A-star Algo
      const startTime = performance.now();
      let visitedCount = 0;
      const heuristic = (r, c) => Math.abs(r - end[0]) + Math.abs(c - end[1]);
      const gScore = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(Infinity));
      const fScore = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(Infinity));
      gScore[start[0]][start[1]] = 0;
      fScore[start[0]][start[1]] = heuristic(...start);
      const openSet = [[fScore[start[0]][start[1]], 0, ...start]];
      const openSetMap = new Set([`${start[0]},${start[1]}`]);
      let step = 0;
      while (openSet.length > 0) {
        openSet.sort((a, b) => a[0] - b[0]);
        const [_, g, row, col] = openSet.shift();
        const currentKey = `${row},${col}`;
        openSetMap.delete(currentKey);
        if (stopRef.current) {
          setIsRunning(false);
          return;
        }
        if (visited.has(currentKey)) continue;
        visited.add(currentKey);
        visitedCount++;
        if (row === end[0] && col === end[1]) break;
        for (const [dr, dc] of directions) {
          const newRow = row + dr;
          const newCol = col + dc;
          const neighborKey = `${newRow},${newCol}`;
          if (
            newRow >= 0 && newRow < GRID_HEIGHT &&
            newCol >= 0 && newCol < GRID_WIDTH &&
            !grid[newRow][newCol]
          ) {
            const tentativeG = g + weights[newRow][newCol];
            if (tentativeG < gScore[newRow][newCol]) {
              gScore[newRow][newCol] = tentativeG;
              fScore[newRow][newCol] = tentativeG + heuristic(newRow, newCol);
              parent.set(neighborKey, [row, col]);
              if (!openSetMap.has(neighborKey)) {
                openSet.push([fScore[newRow][newCol], tentativeG, newRow, newCol]);
                openSetMap.add(neighborKey);
              }
              step++;
              if (step % 5 === 0) {
                await sleep(speed);
                setPath([...parent.keys()].map(k => k.split(',').map(Number)));
              }
            }
          }
        }
      }
      const finalPath = reconstructPath(parent, `${end[0]},${end[1]}`, true);
      setPath(finalPath);
      setNodesVisited(visitedCount);
      setPathLength(finalPath.length);
      setTimeTaken(Math.round(performance.now() - startTime));
      setIsRunning(false);
    };

    if (algorithm === 'bfs') bfs();
    else if (algorithm === 'dfs') dfs();
    else if (algorithm === 'dijkstra') dijkstra();
    else if (algorithm === 'astar') aStar();
  }, [grid, start, end, algorithm, speed]);
  
  const handleMazeSelect = (type) => {
    const newGrid = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(false));
    const newWeights = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(1));
    if (type === 'classic') {
      for (let r = 0; r < GRID_HEIGHT; r++) {
        for (let c = 0; c < GRID_WIDTH; c++) {
          if (r % 2 === 1 && c % 2 === 1) {
            newGrid[r][c] = false; 
            newWeights[r][c] = getRandomWeight();
          } else {
            newGrid[r][c] = true;
            newWeights[r][c] = 5;
          }
        }
      }
      for (let r = 1; r < GRID_HEIGHT - 1; r += 2) {
        for (let c = 1; c < GRID_WIDTH - 1; c += 2) {
          const dirs = [
            [0, 2],
            [2, 0]
          ];
          const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
          if (r + dr < GRID_HEIGHT && c + dc < GRID_WIDTH) {
            newGrid[r + dr / 2][c + dc / 2] = false;
            newWeights[r + dr / 2][c + dc / 2] = getRandomWeight();
          }
        }
      }
    }
    if (type === 'cluttered') {
      for (let r = 0; r < GRID_HEIGHT; r++) {
        for (let c = 0; c < GRID_WIDTH; c++) {
          if ((r === start[0] && c === start[1]) || (r === end[0] && c === end[1])) {
            newGrid[r][c] = false;
            newWeights[r][c] = 1;
          } else {
            const isWall = Math.random() < 0.4;
            newGrid[r][c] = isWall;
            newWeights[r][c] = isWall ? 5 : getRandomWeight();
          }
        }
      }
    }
    if (type === 'box') {
      for (let r = 5; r < GRID_HEIGHT - 5; r++) {
        newGrid[r][10] = true;
        newGrid[r][GRID_WIDTH - 11] = true;
      }
      for (let c = 10; c < GRID_WIDTH - 10; c++) {
        newGrid[5][c] = true;
        newGrid[GRID_HEIGHT - 6][c] = true;
      }
    }
    setGrid(newGrid);
    setWeights(newWeights);
    setPath([]);
  };
  
  const handleCellClick = useCallback((row, col) => {
    if (isRunning) return;

    if (mode === 'wall') {
      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = !newGrid[row][col];
      setGrid(newGrid);
    } else if (mode === 'start') {
      setStart([row, col]);
    } else if (mode === 'end') {
      setEnd([row, col]);
    }
    setPath([]);
  }, [grid, mode, isRunning]);

  const handleMouseDown = (row, col) => {
    if (isRunning) return;
    setIsMouseDown(true);
    toggleCell(row, col);
  };
  
  const handleMouseEnter = (row, col) => {
    if (!isMouseDown || isRunning) return;
    toggleCell(row, col);
  };

  const handleReset = () => {
    stopRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
    setIsRunning(false);
    setClearVisuals(true);
    setTimeout(() => setClearVisuals(false), 0);
  };
  
  const toggleCell = (row, col) => {
    const isStartOrEnd = (row === start[0] && col === start[1]) || (row === end[0] && col === end[1]);
    if (mode === 'wall') {
      if (isStartOrEnd) return;
      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = !newGrid[row][col];
      setGrid(newGrid);
    } else if (mode === 'start') {
      setStart([row, col]);
    } else if (mode === 'end') {
      setEnd([row, col]);
    } else if (mode === 'weight') {
      if (isStartOrEnd) return;
      const newWeights = weights.map(r => [...r]);
      const current = newWeights[row][col];
      newWeights[row][col] = current === 1 ? 5 : current === 5 ? 10 : 1;
      setWeights(newWeights);
    }
    setPath([]);
  };  

  const LegendItem = ({ className = '', label }) => (
    <div className="d-flex align-items-center gap-2">
      <div
        className={className}
        style={{
          width: 24,
          height: 24,
          borderRadius: 0,
          border: '1px solid #ccc'
        }}
      />
      <span style={{ fontSize: '0.9rem' }}>{label}</span>
    </div>
  );

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  useEffect(() => {
    const handleMouseUp = () => setIsMouseDown(false);
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);
  

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Pathfinding Visualizer</h2>
          <div className="d-flex gap-2 align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FontAwesomeIcon
              icon={faInfoCircle}
              style={{ cursor: 'pointer' }}
              onClick={() => setShowInfo(prev => !prev)}
            />
          </div>
            <select 
              className="form-select w-auto"
              onChange={(e) => handleMazeSelect(e.target.value)}
              disabled={isRunning}
            >
              <option                >Custom</option>
              <option value="box">Box Maze</option>
              <option value="classic">Classic Maze</option>
              <option value="cluttered">Cluttered</option>
            </select>
            <select 
              className="form-select w-auto"
              value={algorithm}
              onChange={e => setAlgorithm(e.target.value)}
              disabled={isRunning}
            >
              <option value="bfs">Breadth-First Search</option>
              <option value="dijkstra">Dijkstra's Algorithm</option>
              <option value="dfs">Depth-First Search</option>
              <option value="astar">A*</option>
            </select>
            <button className="btn btn-secondary" onClick={generateMaze} disabled={isRunning}>
              <FontAwesomeIcon icon={faRandom} /> 
            </button>
            <button className="btn btn-primary" onClick={toggleRunning}>
              <FontAwesomeIcon icon={isRunning && !isPaused ? faPause : faPlay} /> 
              {isRunning ? (isPaused ? '' : '') : ''}
            </button>
            <button className="btn btn-danger" onClick={handleReset} disabled={!isRunning}>
              <FontAwesomeIcon icon={faStop} />
            </button>
            <button className="btn btn-secondary" onClick={resetGrid} disabled={isRunning}>
              <FontAwesomeIcon icon={faEraser} /> 
            </button>
          </div>
      </div>

      <div className="mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex gap-3 align-items-center">
          <div className="btn-group">
            <button className={`btn ${mode === 'wall' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('wall')}>Edit Walls</button>
            <button className={`btn ${mode === 'start' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('start')}>Set Start</button>
            <button className={`btn ${mode === 'end' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('end')}>Set End</button>
            <button className={`btn ${mode === 'weight' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('weight')}>Edit Weights</button>
          </div>
          <div className="d-flex align-items-center">
            <label className="me-2">Speed:</label>
            <input type="range" min="1" max="100" step="1" value={101 - speed} onChange={e => setSpeed(101 - Number(e.target.value))} />
          </div>
        </div>
          <div className="d-flex align-items-center gap-3 stats-panel">
            <div><strong>Path Length:</strong> {pathLength}</div>
            <div><strong>Time:</strong> {timeTaken / 1000}s </div>
          </div>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <LegendItem className="maze-cell weight-1" label="Empty" />
          <LegendItem className="maze-cell weight-5" label="Short Grass" />
          <LegendItem className="maze-cell weight-10" label="Thick Grass" />
          <LegendItem className="maze-cell wall" label="Wall" />
        </div>
      </div>

      <div className="maze-container bordered-maze mx-auto" style={{ width: GRID_WIDTH * CELL_SIZE }}>
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="d-flex">
            {row.map((isWall, colIndex) => (
              <MazeCell
              key={`${rowIndex}-${colIndex}-${version}`}
              isWall={isWall}
              isStart={start[0] === rowIndex && start[1] === colIndex}
              isEnd={end[0] === rowIndex && end[1] === colIndex}
              isPath={path.some(([r, c]) => r === rowIndex && c === colIndex)}
              onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
              onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
              onMouseUp={() => setIsMouseDown(false)}
              algorithm={algorithm}
              clearVisuals={clearVisuals}
              weight={weights[rowIndex][colIndex]}
              />            
            ))}
          </div>
        ))}
      </div>
          {showInfo && (
      <div
        id="info-window"
        className="draggable-info"
        draggable
        onDragStart={(e) => {
          const el = e.currentTarget;
          const offsetX = e.clientX - el.getBoundingClientRect().left;
          const offsetY = e.clientY - el.getBoundingClientRect().top;
          e.dataTransfer.setData("text/plain", `${offsetX},${offsetY}`);
        }}
        onDragEnd={(e) => {
          const data = e.dataTransfer.getData("text/plain");
          const [offsetX, offsetY] = data.split(',').map(Number);
          const el = e.currentTarget;
          el.style.left = `${e.clientX - offsetX}px`;
          el.style.top = `${e.clientY - offsetY}px`;
        }}
      >
        <div className="info-header d-flex justify-content-between align-items-center mb-2">
          <strong>Algo Info</strong>
          <button className="btn btn-sm btn-close" onClick={() => setShowInfo(false)}></button>
        </div>
        <div className="info-body small">
          <p>This pathfinding visualizer supports BFS, DFS, Dijkstra, and A* algorithms.</p>
          <p>You can edit walls, add weights, generate mazes, and adjust speed.</p>
          <p>Dijkstra and A* use weight to determine the final path. Empty, Short Grass, and Thick Grass all have increasing weight values.</p>
          <p>Walls have no weight but can no be travelled through.</p>
        </div>
      </div>
    )}
    </div>
  );
};

export default App;
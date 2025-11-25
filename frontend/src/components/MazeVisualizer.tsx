import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

const START_COLORS = ['#00ff99', '#ffcc00', '#ff66ff', '#66ccff', '#ff9966'];

type BaseCellType = 'empty' | 'wall' | 'start' | 'end' | 'path';
type CellType = BaseCellType | `visited-${number}`;
type Point = [number, number];
type Mode = 'start' | 'end' | 'wall' | 'erase';

// 🔴 CORREGIDO: ahora es 40x40 para coincidir con el backend
const ROWS = 40;
const COLS = 40;

const createInitialGrid = (): CellType[][] => {
  const grid: CellType[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill('empty'));
  grid[5][5] = 'start';
  grid[ROWS - 6][COLS - 6] = 'end'; // → [34][34] en 40x40
  return grid;
};

const AlgorithmVisualizer: React.FC = () => {
  const [grid, setGrid] = useState<CellType[][]>(createInitialGrid());
  const [mode, setMode] = useState<Mode>('wall');
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [startPoints, setStartPoints] = useState<Point[]>([[5, 5]]);
  const [endPoints, setEndPoints] = useState<Point[]>([[ROWS - 6, COLS - 6]]);
  const [selectedMaze, setSelectedMaze] = useState<string>('custom');
  const [availableMazes, setAvailableMazes] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [noPathMessage, setNoPathMessage] = useState<string | null>(null);

  // Cargar laberintos
  useEffect(() => {
    const fetchMazeList = async () => {
      try {
        const res = await api.get('/mazes');
        setAvailableMazes(res.data.mazes || []);
      } catch (err) {
        console.error('No se pudieron cargar los laberintos', err);
      }
    };
    fetchMazeList();
  }, []);

  const loadMaze = useCallback(async (mazeName: string) => {
    if (mazeName === 'custom') {
      setGrid(createInitialGrid());
      setStartPoints([[5, 5]]);
      setEndPoints([[ROWS - 6, COLS - 6]]);
      return;
    }

    try {
      const res = await api.get(`/mazes/${mazeName}`);
      const { grid: backendGrid, start, end } = res.data;

      // Validar que la grilla tenga al menos una fila
      if (!backendGrid || backendGrid.length === 0) {
        throw new Error('Grilla vacía');
      }

      const newGrid: CellType[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill('empty'));
      const rows = backendGrid.length;
      const cols = backendGrid[0].length;

      // Copiar muros, truncando o rellenando si es necesario
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (r < rows && c < cols && backendGrid[r][c] === 1) {
            newGrid[r][c] = 'wall';
          }
        }
      }

      const starts: Point[] = Array.isArray(start[0]) ? start : [start];
      const ends: Point[] = Array.isArray(end[0]) ? end : [end];

      // Asegurar que todos los puntos estén dentro de [0,39]
      const adjustedStarts = starts.map(([r, c]) => [
        Math.max(0, Math.min(r, ROWS - 1)),
        Math.max(0, Math.min(c, COLS - 1))
      ] as Point);
      const adjustedEnds = ends.map(([r, c]) => [
        Math.max(0, Math.min(r, ROWS - 1)),
        Math.max(0, Math.min(c, COLS - 1))
      ] as Point);

      // Colocar inicios y fines
      adjustedStarts.forEach(([r, c]) => {
        newGrid[r][c] = 'start';
      });
      adjustedEnds.forEach(([r, c]) => {
        newGrid[r][c] = 'end';
      });

      setGrid(newGrid.map(row => [...row]));
      setStartPoints(adjustedStarts);
      setEndPoints(adjustedEnds);
    } catch (err) {
      console.error(`Error al cargar laberinto: ${mazeName}`, err);
      alert('No se pudo cargar el laberinto.');
    }
  }, []);

  useEffect(() => {
    loadMaze(selectedMaze);
  }, [selectedMaze, loadMaze]);

  const applyAction = useCallback((row: number, col: number) => {
    if (isRunning || selectedMaze !== 'custom') return;
    if (mode !== 'wall' && mode !== 'erase') return;

    setGrid(prev => {
      const newGrid = prev.map(r => [...r]);
      const current = newGrid[row][col];
      if (current === 'start' || current === 'end') return prev;
      if (mode === 'wall') {
        newGrid[row][col] = 'wall';
      } else if (mode === 'erase') {
        newGrid[row][col] = 'empty';
      }
      return newGrid;
    });
  }, [mode, isRunning, selectedMaze]);

  const handleMouseDown = (row: number, col: number) => {
    if (isRunning || selectedMaze !== 'custom') return;
    if (mode === 'start' || mode === 'end') return;
    setIsDrawing(true);
    applyAction(row, col);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDrawing) {
      applyAction(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDrawing(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const getWalls = useCallback((): [number, number][] => {
    const walls: [number, number][] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 'wall') {
          walls.push([r, c]);
        }
      }
    }
    return walls;
  }, [grid]);

  const handleCellClick = (row: number, col: number, event: React.MouseEvent) => {
    if (isRunning || selectedMaze !== 'custom') return;
    if (mode !== 'start' && mode !== 'end') return;

    const isShift = event.shiftKey;
    const newGrid = grid.map(r => [...r]);
    const currentCell = newGrid[row][col];

    if (currentCell === 'start' || currentCell === 'end') {
      if (currentCell === 'start') {
        const newStarts = startPoints.filter(([r, c]) => !(r === row && c === col));
        if (newStarts.length === 0) return; // No permitir 0 inicios
        setStartPoints(newStarts);
        newGrid[row][col] = 'empty';
      } else {
        const newEnds = endPoints.filter(([r, c]) => !(r === row && c === col));
        if (newEnds.length === 0) return; // No permitir 0 fines
        setEndPoints(newEnds);
        newGrid[row][col] = 'empty';
      }
      setGrid(newGrid);
      return;
    }

    if (mode === 'start') {
      if (!isShift) {
        startPoints.forEach(([r, c]) => {
          if (newGrid[r][c] === 'start') {
            newGrid[r][c] = endPoints.some(([er, ec]) => er === r && ec === c) ? 'end' : 'empty';
          }
        });
        setStartPoints([[row, col]]);
      } else {
        setStartPoints(prev => [...prev, [row, col]]);
      }
      newGrid[row][col] = 'start';
    } else if (mode === 'end') {
      if (!isShift) {
        endPoints.forEach(([r, c]) => {
          if (newGrid[r][c] === 'end') {
            newGrid[r][c] = startPoints.some(([sr, sc]) => sr === r && sc === c) ? 'start' : 'empty';
          }
        });
        setEndPoints([[row, col]]);
      } else {
        setEndPoints(prev => [...prev, [row, col]]);
      }
      newGrid[row][col] = 'end';
    }

    setGrid(newGrid);
  };

  const clearPath = () => {
    const newGrid = grid.map(row =>
      row.map(cell => 
        cell === 'path' || cell.startsWith('visited-') 
          ? 'empty' 
          : cell
      )
    );
    setGrid(newGrid);
  };

  const clearAll = () => {
    setGrid(createInitialGrid());
    setStartPoints([[5, 5]]);
    setEndPoints([[ROWS - 6, COLS - 6]]);
    setSelectedMaze('custom');
  };

  const runAlgorithm = async (algo: string) => {
    if (isRunning) return;
    
    // 🔴 Validación crítica: al menos un inicio y un fin
    if (startPoints.length === 0 || endPoints.length === 0) {
      alert('Debes tener al menos un punto de inicio y uno de fin.');
      return;
    }

    setIsRunning(true);
    clearPath();
    setNoPathMessage(null);

    try {
      const walls = getWalls();
      const res = await api.post("/run", {
        algorithm: algo,
        maze_custom: {
          rows: ROWS,
          cols: COLS,
          walls,
          start: startPoints,
          end: endPoints
        }
      });

      const { steps, path: foundPath, origin } = res.data as { 
        steps: { cell: [number, number], from_start: number }[],
        path: [number, number][],
        origin: number
      };

      const delay = Math.max(10, 100 - speed); // Evitar delay = 0

      // Animar exploración
      for (let i = 0; i < steps.length; i++) {
        const { cell: [r, c], from_start: rawOrigin } = steps[i];
        const isStart = startPoints.some(([sr, sc]) => sr === r && sc === c);
        const isEnd = endPoints.some(([er, ec]) => er === r && ec === c);
        if (isStart || isEnd) continue;

        await new Promise(resolve => setTimeout(resolve, delay));
        setGrid(prev => {
          const newG = prev.map(row => [...row]);
          // 🔴 Protección contra origin = -1
          const safeOrigin = rawOrigin < 0 ? 0 : rawOrigin;
          newG[r][c] = `visited-${safeOrigin % START_COLORS.length}` as CellType;
          return newG;
        });
      }

      // Animar ruta encontrada
      for (let i = 0; i < foundPath.length; i++) {
        const [r, c] = foundPath[i];
        const isStart = startPoints.some(([sr, sc]) => sr === r && sc === c);
        const isEnd = endPoints.some(([er, ec]) => er === r && ec === c);
        if (isStart || isEnd) continue;

        await new Promise(resolve => setTimeout(resolve, delay / 2));
        setGrid(prev => {
          const newG = prev.map(row => [...row]);
          newG[r][c] = 'path';
          return newG;
        });
      }

      // Mostrar mensaje si no hay ruta
      if (foundPath.length === 0) {
        setNoPathMessage("No se pudo encontrar una ruta entre los puntos 😢");
        setTimeout(() => setNoPathMessage(null), 4000);
      }

    } catch (err: any) {
      console.error(err);
      alert('Error al ejecutar el algoritmo: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <header>
        <h1>Visualizador de Algoritmos de Búsqueda</h1>
        <p>Usa Shift + clic para múltiples inicios/fines. Dibuja obstáculos manteniendo presionado el clic.</p>
      </header>

      {/* Mensaje bonito cuando no hay ruta */}
      {noPathMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #ff5f6d, #ffc371)',
          color: '#fff',
          padding: '20px 40px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontSize: '1.3rem',
          textAlign: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.5s ease',
          overflow: 'visible'
        }}>
          <strong>¡Ups!</strong> {noPathMessage}
          <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>Intenta modificar los obstáculos o los puntos de inicio/fin.</div>

          {/* Emojis animados */}
          {['😱', '🤯', '💥', '❌'].map((emoji, idx) => (
            <span
              key={idx}
              style={{
                position: 'absolute',
                top: `${Math.random() * 60 - 30}%`,
                left: `${Math.random() * 60 - 30}%`,
                fontSize: `${20 + Math.random() * 20}px`,
                animation: `bounce-${idx} 1.5s ease-in-out infinite alternate`,
                pointerEvents: 'none'
              }}
            >
              {emoji}
            </span>
          ))}

          <style>
            {`
              ${['0','1','2','3'].map(idx => `
                @keyframes bounce-${idx} {
                  0% { transform: translate(0, 0) rotate(0deg); }
                  50% { transform: translate(${(Math.random() - 0.5) * 40}px, ${(Math.random() - 0.5) * 40}px) rotate(${Math.random()*360}deg); }
                  100% { transform: translate(0, 0) rotate(0deg); }
                }
              `).join('')}
            `}
          </style>
        </div>
      )}

      <main>
        <div className="toolbar">
          <div className="maze-selector">
            <label>
              Laberinto:
              <select
                value={selectedMaze}
                onChange={(e) => setSelectedMaze(e.target.value)}
                disabled={isRunning}
                style={{ marginLeft: '8px' }}
              >
                <option value="custom">Personalizado</option>
                {availableMazes.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mode-selector">
            <button
              className={`mode-btn ${mode === 'start' ? 'active' : ''}`}
              onClick={() => setMode('start')}
              disabled={selectedMaze !== 'custom' || isRunning}
            >
              🟢 Inicio
            </button>
            <button
              className={`mode-btn ${mode === 'end' ? 'active' : ''}`}
              onClick={() => setMode('end')}
              disabled={selectedMaze !== 'custom' || isRunning}
            >
              🔴 Fin
            </button>
            <button
              className={`mode-btn ${mode === 'wall' ? 'active' : ''}`}
              onClick={() => setMode('wall')}
              disabled={selectedMaze !== 'custom' || isRunning}
            >
              ⬛ Obstáculo
            </button>
            <button
              className={`mode-btn ${mode === 'erase' ? 'active' : ''}`}
              onClick={() => setMode('erase')}
              disabled={selectedMaze !== 'custom' || isRunning}
            >
              🧹 Borrar
            </button>
          </div>

          <div className="algo-buttons">
            <button className="algo-btn" onClick={() => runAlgorithm('bfs')} disabled={isRunning}>
              BFS
            </button>
            <button className="algo-btn" onClick={() => runAlgorithm('dfs')} disabled={isRunning}>
              DFS
            </button>
            <button className="algo-btn" onClick={() => runAlgorithm('greedy')} disabled={isRunning}>
              Greedy
            </button>
            <button className="algo-btn" onClick={() => runAlgorithm('astar')} disabled={isRunning}>
              A*
            </button>
          </div>

          <div className="controls">
            <button className="control-btn" onClick={clearAll} disabled={isRunning}>
              🗑️ Limpiar Todo
            </button>
            <button className="control-btn" onClick={clearPath} disabled={isRunning}>
              🧹 Limpiar Ruta
            </button>
            <label>
              Velocidad:
              <input
                type="range"
                min="1"
                max="100"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                disabled={isRunning}
                style={{ marginLeft: '8px', verticalAlign: 'middle' }}
              />
            </label>
          </div>
        </div>

        <div 
          className="grid-container"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`cell ${cell}`}
                style={{
                  cursor: mode === 'wall' || mode === 'erase' ? 'crosshair' : 'pointer',
                  backgroundColor: cell.startsWith('visited-') 
                    ? START_COLORS[parseInt(cell.split('-')[1]) % START_COLORS.length] 
                    : undefined
                }}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
                onClick={(e) => handleCellClick(r, c, e)}
              />
            ))
          )}
        </div>

        <div className="legend">
          <div><span className="color-box start"></span> Inicio</div>
          <div><span className="color-box end"></span> Fin</div>
          <div><span className="color-box wall"></span> Obstáculo</div>
          <div><span className="color-box visited"></span> Explorado</div>
          <div><span className="color-box path"></span> Ruta óptima</div>
        </div>
      </main>
    </>
  );
};

export default AlgorithmVisualizer;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

// Tipos para la API
interface ApiStep {
  cell: [number, number];
  from_start: number;
  initial?: boolean;
}

interface ApiResponse {
  steps: ApiStep[];
  path: [number, number][];
  origin: number;
}

interface MazeData {
  grid: number[][];
  start: number[] | number[][];
  end: number[] | number[][];
}

// Constantes
const START_COLORS = ['#00ff99', '#ffcc00', '#ff66ff', '#66ccff', '#ff9966'] as const;
const ROWS = 40;
const COLS = 40;

type BaseCellType = 'empty' | 'wall' | 'start' | 'end' | 'path';
type CellType = BaseCellType | `visited-${number}`;
type Point = [number, number];
type Mode = 'start' | 'end' | 'wall' | 'erase';

// Helper
const createInitialGrid = (): CellType[][] => {
  const grid: CellType[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill('empty'));
  grid[5][5] = 'start';
  grid[ROWS - 6][COLS - 6] = 'end';
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

  // 🔑 Clave: sincronizar grid con ref para callbacks asíncronos/eventos rápidos
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // Cargar lista de laberintos
  useEffect(() => {
    const fetchMazeList = async () => {
      try {
        const res = await api.get('/mazes');
        setAvailableMazes(res.data.mazes || []);
      } catch (err) {
        console.error('No se pudieron cargar los laberintos', err);
        setAvailableMazes([]);
      }
    };
    fetchMazeList();
  }, []);

  // Cargar un laberinto específico
  const loadMaze = useCallback(async (mazeName: string) => {
    if (mazeName === 'custom') {
      setGrid(createInitialGrid());
      setStartPoints([[5, 5]]);
      setEndPoints([[ROWS - 6, COLS - 6]]);
      return;
    }

    try {
      const res = await api.get(`/mazes/${mazeName}`);
      const { grid: backendGrid, start, end } = res.data as MazeData;

      if (!backendGrid || backendGrid.length === 0) {
        throw new Error('Grilla vacía');
      }

      const newGrid: CellType[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill('empty'));
      const rows = backendGrid.length;
      const cols = backendGrid[0]?.length || 0;

      // Copiar muros
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (r < rows && c < cols && backendGrid[r][c] === 1) {
            newGrid[r][c] = 'wall';
          }
        }
      }

      // Normalizar y ajustar puntos
      const normalizePoints = (points: number[] | number[][]): Point[] => {
        const arr = Array.isArray(points[0]) ? (points as number[][]) : [points as number[]];
        return arr.map(([r, c]) => [
          Math.max(0, Math.min(r, ROWS - 1)),
          Math.max(0, Math.min(c, COLS - 1))
        ] as Point);
      };

      const safeStarts = normalizePoints(start);
      const safeEnds = normalizePoints(end);

      // Aplicar inicios y fines
      safeStarts.forEach(([r, c]) => {
        if (newGrid[r][c] === 'empty') newGrid[r][c] = 'start';
      });
      safeEnds.forEach(([r, c]) => {
        if (newGrid[r][c] === 'empty') newGrid[r][c] = 'end';
      });

      setGrid(newGrid);
      setStartPoints(safeStarts);
      setEndPoints(safeEnds);
    } catch (err) {
      console.error(`Error al cargar laberinto: ${mazeName}`, err);
      alert('No se pudo cargar el laberinto.');
    }
  }, []);

  useEffect(() => {
    loadMaze(selectedMaze);
  }, [selectedMaze, loadMaze]);

  // Obtener muros para enviar al backend
  const getWalls = useCallback((): Point[] => {
    const walls: Point[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 'wall') {
          walls.push([r, c]);
        }
      }
    }
    return walls;
  }, [grid]);

  // Aplicar acción de dibujo/borrado (usando ref para estado fresco)
  const applyAction = useCallback((row: number, col: number) => {
    if (isRunning || selectedMaze !== 'custom') return;
    if (mode !== 'wall' && mode !== 'erase') return;

    const current = gridRef.current[row][col]; // ✅ estado actual, no cerrado
    if (current === 'start' || current === 'end') return;

    setGrid(prev => {
      const newGrid = prev.map(r => [...r]);
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

  const handleMouseUp = () => setIsDrawing(false);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleCellClick = (row: number, col: number, event: React.MouseEvent) => {
    if (isRunning || selectedMaze !== 'custom') return;
    if (mode !== 'start' && mode !== 'end') return;

    const isShift = event.shiftKey;
    const newGrid = grid.map(r => [...r]);
    const currentCell = newGrid[row][col];

    if (currentCell === 'start' || currentCell === 'end') {
      if (currentCell === 'start') {
        const newStarts = startPoints.filter(([r, c]) => !(r === row && c === col));
        if (newStarts.length === 0) return;
        setStartPoints(newStarts);
        newGrid[row][col] = 'empty';
      } else {
        const newEnds = endPoints.filter(([r, c]) => !(r === row && c === col));
        if (newEnds.length === 0) return;
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
    setGrid(prev =>
      prev.map(row =>
        row.map(cell => (cell === 'path' || cell.startsWith('visited-') ? 'empty' : cell))
      )
    );
  };

  const clearAll = () => {
    setGrid(createInitialGrid());
    setStartPoints([[5, 5]]);
    setEndPoints([[ROWS - 6, COLS - 6]]);
    setSelectedMaze('custom');
  };

  const runAlgorithm = async (algo: string) => {
    if (isRunning) return;
    if (startPoints.length === 0 || endPoints.length === 0) {
      alert('Debes tener al menos un punto de inicio y uno de fin.');
      return;
    }

    setIsRunning(true);
    clearPath();
    setNoPathMessage(null);

    try {
      const walls = getWalls();
      const res = await api.post('/run', {
        algorithm: algo,
        maze_custom: {
          rows: ROWS,
          cols: COLS,
          walls,
          start: startPoints,
          end: endPoints
        }
      });

      const { steps, path: foundPath } = res.data as ApiResponse;
      const delay = Math.max(10, 100 - speed);

      // Animar exploración
      for (let i = 0; i < steps.length; i++) {
        const { cell: [r, c], from_start: rawOrigin } = steps[i];
        const isStart = startPoints.some(([sr, sc]) => sr === r && sc === c);
        const isEnd = endPoints.some(([er, ec]) => er === r && ec === c);
        if (isStart || isEnd) continue;

        await new Promise(resolve => setTimeout(resolve, delay));
        setGrid(prev => {
          const newG = prev.map(row => [...row]);
          const safeOrigin = rawOrigin < 0 ? 0 : rawOrigin;
          const colorIndex = safeOrigin % START_COLORS.length;
          newG[r][c] = `visited-${colorIndex}` as CellType;
          return newG;
        });
      }

      // Animar ruta final
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

      if (foundPath.length === 0) {
        setNoPathMessage("No se pudo encontrar una ruta entre los puntos 😢");
        setTimeout(() => setNoPathMessage(null), 4000);
      }
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.detail || err.message || 'Error desconocido';
      alert(`Error al ejecutar ${algo}: ${message}`);
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
        }}>
          <strong>¡Ups!</strong> {noPathMessage}
          <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
            Intenta modificar los obstáculos o los puntos de inicio/fin.
          </div>
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
            {(['bfs', 'dfs', 'greedy', 'astar'] as const).map(algo => (
              <button
                key={algo}
                className="algo-btn"
                onClick={() => runAlgorithm(algo)}
                disabled={isRunning}
              >
                {algo === 'astar' ? 'A*' : algo.toUpperCase()}
              </button>
            ))}
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
                    : undefined,
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
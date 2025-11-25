#main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
import os
load_dotenv()

from algorithms import MAZES, run_custom_algorithm

app = FastAPI(title="Algorithm Visualizer API")

origins = os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def grid_from_custom(maze_data: dict) -> List[List[int]]:
    rows = maze_data["rows"]
    cols = maze_data["cols"]
    grid = [[0 for _ in range(cols)] for _ in range(rows)]
    walls = maze_data.get("walls", [])
    for wall in walls:
        if len(wall) == 2:
            r, c = wall[0], wall[1]
            if 0 <= r < rows and 0 <= c < cols:
                grid[r][c] = 1
    return grid

class CustomAlgorithmRequest(BaseModel):
    maze_custom: dict
    algorithm: str

@app.get("/mazes")
def get_mazes():
    return {"mazes": list(MAZES.keys())}

@app.post("/run")
def run_pathfinding(req: CustomAlgorithmRequest):
    try:
        grid = grid_from_custom(req.maze_custom)
        start = req.maze_custom["start"]  # ✅ NO convertir a tuple
        end = req.maze_custom["end"]      # ✅ NO convertir a tuple
        result = run_custom_algorithm(req.algorithm, grid, start, end)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/mazes/{maze_name}")
def get_maze(maze_name: str):
    if maze_name not in MAZES:
        raise HTTPException(status_code=404, detail="Maze not found")
    return MAZES[maze_name]

# ─── Modelos adicionales ───────────────────────────────────────────────
class PredefinedMazeRequest(BaseModel):
    maze_name: str
    start: List[int]
    end: List[int]

# ─── Endpoints por algoritmo ───────────────────────────────────────────
@app.post("/bfs")
def run_bfs(req: PredefinedMazeRequest):
    if req.maze_name not in MAZES:
        raise HTTPException(status_code=404, detail="Maze not found")
    maze = MAZES[req.maze_name]
    try:
        result = run_custom_algorithm("bfs", maze["grid"], req.start, req.end)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/dfs")
def run_dfs(req: PredefinedMazeRequest):
    if req.maze_name not in MAZES:
        raise HTTPException(status_code=404, detail="Maze not found")
    maze = MAZES[req.maze_name]
    try:
        result = run_custom_algorithm("dfs", maze["grid"], req.start, req.end)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/greedy")
def run_greedy(req: PredefinedMazeRequest):
    if req.maze_name not in MAZES:
        raise HTTPException(status_code=404, detail="Maze not found")
    maze = MAZES[req.maze_name]
    try:
        result = run_custom_algorithm("greedy", maze["grid"], req.start, req.end)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/astar")
def run_astar(req: PredefinedMazeRequest):
    if req.maze_name not in MAZES:
        raise HTTPException(status_code=404, detail="Maze not found")
    maze = MAZES[req.maze_name]
    try:
        result = run_custom_algorithm("astar", maze["grid"], req.start, req.end)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
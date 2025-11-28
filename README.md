# Visualizador_Busqueda
Visualizador interactivo de algoritmos de búsqueda en laberintos: BFS, SFS, Greedy y A*
markdown
# Visualizador de Algoritmos de Búsqueda

Visualizador interactivo de algoritmos de búsqueda en laberintos: **BFS, DFS, Greedy Best-First y A\***.  
Permite crear laberintos personalizados, cargar ejemplos predefinidos y observar paso a paso cómo cada algoritmo explora y encuentra la ruta óptima.

<img width="1817" height="795" alt="image" src="https://github.com/user-attachments/assets/7d262279-51d4-482a-a26b-812484acfdfb" />

---

##  Características

- Soporte para **múltiples puntos de inicio y fin** (`Shift + clic`).
- Laberintos predefinidos: `classic_40`, `open_40`, `spiral_40`, `dense_40`.
- Modos interactivos: inicio, fin, pared, borrar.
- Animación paso a paso con control de velocidad.
- Colores diferenciados para exploración y ruta final.
- Backend en **FastAPI** (Python) y frontend en **React + TypeScript**.

---

## 🛠 Requisitos

- **Node.js** ≥ 18.x
- **Python** ≥ 3.9
- **npm** o **yarn**

---

##  Instrucciones de instalación

### 1. Clonar el repositorio

```bash
https://github.com/jls846/Visualizador_Busqueda.git
cd Visualizador_Busqueda
```
### 2. Configurar el backend (Python)

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Linux/macOS
# o
venv\Scripts\activate       # Windows

pip install -r requirements.txt
```

Crear `.env` en `backend/`:

```env
API_HOST=127.0.0.1
API_PORT=8000
FRONTEND_URL=http://localhost:3000
```

Ejecutar:

```bash
uvicorn main:app --reload
```

>  Backend corriendo en: `http://localhost:8000`

---

### 3. Configurar el frontend (React)

```bash
cd ../frontend
```

Crear `.env` en `frontend/`:

```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

Instalar y ejecutar:

```bash
npm install
npm start
```

>  Frontend corriendo en: `http://localhost:3000`

---

## 🧪 Cómo usar

- **Selecciona un laberinto** o diseña el tuyo.
- Cambia el **modo**:
  - 🟢 **Inicio**: coloca puntos de inicio.
  - 🔴 **Fin**: coloca puntos de fin.
  - ⬛ **Obstáculo**: dibuja paredes.
  - 🧹 **Borrar**: limpia celdas.
- Ejecuta cualquier algoritmo: **BFS, DFS, Greedy, A\***.
- Usar **Shift** + **clic** para múltiples inicios/fines.
- Ajusta la **velocidad** de la animación.
- Haz clic en **Limpiar Ruta** para reiniciar sin perder el laberinto.

---
##  Documentación de la API

El backend expone los siguientes endpoints, documentados automáticamente con **OpenAPI/Swagger**:

- **Documentación interactiva**: [`http://localhost:8000/docs`](http://localhost:8000/docs)

### Endpoints principales

| Método | Ruta             | Descripción                                      |
|--------|------------------|--------------------------------------------------|
| `GET`  | `/mazes`         | Lista los nombres de los laberintos predefinidos |
| `GET`  | `/mazes/{name}`  | Devuelve los datos completos de un laberinto     |
| `POST` | `/bfs`           | Ejecuta **BFS** en un laberinto predefinido      |
| `POST` | `/dfs`           | Ejecuta **DFS** en un laberinto predefinido      |
| `POST` | `/greedy`        | Ejecuta **Greedy Best-First**                    |
| `POST` | `/astar`         | Ejecuta **A\***                                  |
| `POST` | `/run`           | Ejecuta cualquier algoritmo en un laberinto personalizado |

>  Usa la interfaz en `/docs` para probar los endpoints directamente desde el navegador.
## 📁 Estructura del proyecto

```
algorithm-visualizer/
├── backend/
│   ├── main.py
│   ├── algorithms.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/AlgorithmVisualizer.tsx
│   │   └── api.ts
│   ├── .env
│   └── package.json
├── .gitignore
└── README.md

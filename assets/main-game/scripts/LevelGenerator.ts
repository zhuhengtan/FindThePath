import type { LevelData } from "./Game";

export interface GeneratorConfig {
  canvasWidth: number;
  canvasHeight: number;
  cellSize: number;
  level: number;
  seed?: string;
}

enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

type TileType = "I" | "L" | "T" | "X";

interface PathNode {
  x: number;
  y: number;
  fromDir: Direction;
}

export class LevelGenerator {
  private _config: GeneratorConfig;
  private _width: number = 0;
  private _height: number = 0;
  private _grid: boolean[][] = [];
  private _path: PathNode[] = [];
  private _correctRotations: Map<string, number> = new Map();

  constructor(config: GeneratorConfig) {
    this._config = config;
  }

  public generate(): LevelData {
    this.calculateGridSize();
    this.initializeGrid();
    this.generatePath();
    const tiles = this.createTilesFromPath();
    this.addObfuscation(tiles);
    const shuffledTiles = this.shuffleTiles(tiles);
    const stepLimit = this.calculateStepLimit(shuffledTiles);

    const start = this._path[0];
    const goal = this._path[this._path.length - 1];

    // Determine goal exit direction (must point to an edge)
    let goalExitDir = Direction.Up; // fallback
    if (goal.y === this._height - 1) goalExitDir = Direction.Up;
    else if (goal.y === 0) goalExitDir = Direction.Down;
    else if (goal.x === this._width - 1) goalExitDir = Direction.Right;
    else if (goal.x === 0) goalExitDir = Direction.Left;

    // Prefer continuing straight if possible (if we are at a corner or straight edge)
    // Actually, forcing "Out" direction is safer.
    // However, if we enter from Left (moving Right) at Top-Right corner, 
    // exit can be Right or Up. Both are valid. "Straight" is preferred visually.
    const straightExit = this.oppositeDir(goal.fromDir);
    // If straight exit is valid (out of bounds), use it.
    // Note: moveInDirection returns delta or new pos? 
    // Wait, moveInDirection implementation checks:
    // x: x + dx, y: y + dy.
    // If we apply this to goal.x, goal.y
    // We want to check if (goal.x + dx, goal.y + dy) is out of bounds.
    const { x: gdx, y: gdy } = this.moveInDirection(goal.x, goal.y, straightExit);
    if (gdx < 0 || gdx >= this._width || gdy < 0 || gdy >= this._height) {
      goalExitDir = straightExit;
    }

    return {
      level: this._config.level,
      generatorVersion: "v2",
      seed: this._config.seed ?? `${Date.now()}`,
      width: this._width,
      height: this._height,
      start: {
        x: start.x,
        y: start.y,
        dir: this.calculateStartDir(),
      },
      goal: {
        x: goal.x,
        y: goal.y,
        dir: goalExitDir,
      },
      stepLimit,
      tiles: shuffledTiles,
      blocks: [],
    };
  }

  private calculateGridSize(): void {
    const tier = Math.floor((this._config.level - 1) / 100);
    const minCells = 3 + tier;
    const maxCells = 4 + tier * 2;

    const maxWidth = Math.floor(this._config.canvasWidth / this._config.cellSize);
    const maxHeight = Math.floor(this._config.canvasHeight / this._config.cellSize);

    this._width = Math.min(maxCells, Math.max(minCells, maxWidth));
    this._height = Math.min(maxCells, Math.max(minCells, maxHeight));

    // Ensure minimum size
    this._width = Math.max(3, this._width);
    this._height = Math.max(3, this._height);
  }

  private initializeGrid(): void {
    this._grid = [];
    for (let y = 0; y < this._height; y++) {
      this._grid[y] = [];
      for (let x = 0; x < this._width; x++) {
        this._grid[y][x] = false;
      }
    }
  }

  private generatePath(): void {
    this._path = [];

    // Start from random edge position
    const startEdge = Math.floor(Math.random() * 4);
    let startX = 0, startY = 0, startDir = Direction.Up;

    switch (startEdge) {
      case 0: // Top
        startX = Math.floor(Math.random() * this._width);
        startY = this._height - 1;
        startDir = Direction.Down;
        break;
      case 1: // Right
        startX = this._width - 1;
        startY = Math.floor(Math.random() * this._height);
        startDir = Direction.Left;
        break;
      case 2: // Bottom
        startX = Math.floor(Math.random() * this._width);
        startY = 0;
        startDir = Direction.Up;
        break;
      case 3: // Left
        startX = 0;
        startY = Math.floor(Math.random() * this._height);
        startDir = Direction.Right;
        break;
    }

    this._path.push({ x: startX, y: startY, fromDir: this.oppositeDir(startDir) });
    this._grid[startY][startX] = true;

    // Generate path with random walk
    // We want the goal to be at the edge of the map so the car can "exit" the map.
    const minPathLength = Math.floor(this._width * this._height * 0.4);
    let attempts = 0;
    const maxAttempts = 200; // Increased attempts

    while (attempts < maxAttempts) {
      const current = this._path[this._path.length - 1];

      // Stop condition: Path is long enough AND we are at an edge (but not the start edge ideally)
      // Note: simple edge check.
      const isAtEdge = current.x === 0 || current.x === this._width - 1 || current.y === 0 || current.y === this._height - 1;

      if (this._path.length >= minPathLength && isAtEdge) {
        // Success!
        break;
      }

      let possibleDirs: Direction[];

      // Force first step to be inwards (perpendicular to edge) 
      // to ensure Start Point is outside the map.
      if (this._path.length === 1) {
        // current.fromDir is where we came from (Outwards).
        // We want to go Inwards -> Opposite of Outwards.
        const inwardDir = this.oppositeDir(current.fromDir);
        possibleDirs = [inwardDir];

        // Verify (should always be valid at start)
        const { x: nx, y: ny } = this.moveInDirection(current.x, current.y, inwardDir);
        if (nx < 0 || nx >= this._width || ny < 0 || ny >= this._height) {
          // Fallback if map is 1x1? Unlikely.
          possibleDirs = this.getPossibleDirections(current);
        }
      } else {
        possibleDirs = this.getPossibleDirections(current);
      }

      if (possibleDirs.length === 0) {
        // Stuck. Backtrack or restart.
        if (this._path.length > 5) {
          // Backtrack a few steps
          const removeCount = Math.floor(this._path.length / 2);
          for (let k = 0; k < removeCount; k++) {
            const p = this._path.pop();
            if (p) this._grid[p.y][p.x] = false;
          }
        } else {
          // Restart
          this.initializeGrid();
          this._path = [];
          this._path.push({ x: startX, y: startY, fromDir: this.oppositeDir(startDir) });
          this._grid[startY][startX] = true;
        }
        attempts++;
        continue;
      }


      const dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
      const { x: nextX, y: nextY } = this.moveInDirection(current.x, current.y, dir);

      this._path.push({ x: nextX, y: nextY, fromDir: this.oppositeDir(dir) });
      this._grid[nextY][nextX] = true;
    }
  }

  private getPossibleDirections(node: PathNode): Direction[] {
    const dirs: Direction[] = [];
    for (let d = 0; d < 4; d++) {
      const dir = d as Direction;
      const { x: nx, y: ny } = this.moveInDirection(node.x, node.y, dir);

      if (nx >= 0 && nx < this._width && ny >= 0 && ny < this._height && !this._grid[ny][nx]) {
        // Avoid creating loops too early
        const neighbors = this.countOccupiedNeighbors(nx, ny);
        if (neighbors <= 1) {
          dirs.push(dir);
        }
      }
    }
    return dirs;
  }

  private countOccupiedNeighbors(x: number, y: number): number {
    let count = 0;
    for (let d = 0; d < 4; d++) {
      const dir = d as Direction;
      const { x: nx, y: ny } = this.moveInDirection(x, y, dir);
      if (nx >= 0 && nx < this._width && ny >= 0 && ny < this._height && this._grid[ny][nx]) {
        count++;
      }
    }
    return count;
  }

  private createTilesFromPath(): Array<{ x: number; y: number; type: TileType; rot: number }> {
    const tiles: Array<{ x: number; y: number; type: TileType; rot: number }> = [];

    for (let i = 0; i < this._path.length; i++) {
      const node = this._path[i];
      let exitDir: Direction;

      if (i < this._path.length - 1) {
        exitDir = this.oppositeDir(this._path[i + 1].fromDir);
      } else {
        // Goal Node: Must exit to boundary
        if (node.y === this._height - 1) exitDir = Direction.Up;
        else if (node.y === 0) exitDir = Direction.Down;
        else if (node.x === this._width - 1) exitDir = Direction.Right;
        else if (node.x === 0) exitDir = Direction.Left;
        else exitDir = Direction.Up; // Should not happen if isAtEdge is true

        // Prefer straight if valid
        const straight = this.oppositeDir(node.fromDir);
        const { x: nx, y: ny } = this.moveInDirection(node.x, node.y, straight);
        if (nx < 0 || nx >= this._width || ny < 0 || ny >= this._height) {
          exitDir = straight;
        }
      }

      // For the start node (i===0), force entryDir to be opposite of exitDir.
      // This ensures the start tile is always an "I" shape aligned with the path,
      // matching the car's start logic.
      const entryDir = (i === 0) ? this.oppositeDir(exitDir) : node.fromDir;

      const { type, rot } = this.determineTileTypeAndRotation(entryDir, exitDir);
      tiles.push({ x: node.x, y: node.y, type, rot });
      this._correctRotations.set(`${node.x},${node.y}`, rot);
    }

    return tiles;
  }

  private determineTileTypeAndRotation(entryDir: Direction, exitDir: Direction): { type: TileType; rot: number } {
    // If same direction (straight), use I
    if (entryDir === exitDir) {
      const rot = entryDir === Direction.Up || entryDir === Direction.Down ? 0 : 1;
      return { type: "I", rot };
    }

    // If opposite direction (U-turn), use I
    if (this.oppositeDir(entryDir) === exitDir) {
      const rot = entryDir === Direction.Up || entryDir === Direction.Down ? 0 : 1;
      return { type: "I", rot };
    }

    // Otherwise, it's a turn, use L
    // BASE_MASK["L"] = Up + Right (rot=0)
    const dirs = [entryDir, exitDir].sort((a, b) => a - b);
    let rot = 0;

    // Calculate rotation based on which two directions are connected
    if (dirs[0] === Direction.Up && dirs[1] === Direction.Right) {
      rot = 0; // L shape with Up and Right (base)
    } else if (dirs[0] === Direction.Right && dirs[1] === Direction.Down) {
      rot = 1; // Rotated 90° clockwise
    } else if (dirs[0] === Direction.Down && dirs[1] === Direction.Left) {
      rot = 2; // Rotated 180°
    } else if (dirs[0] === Direction.Up && dirs[1] === Direction.Left) {
      rot = 3; // Rotated 270°
    }

    return { type: "L", rot };
  }

  private addObfuscation(tiles: Array<{ x: number; y: number; type: TileType; rot: number }>): void {
    const tier = Math.floor((this._config.level - 1) / 100);
    const obfuscationRatio = Math.min(0.3 + tier * 0.1, 0.6);

    const emptyCount = this._width * this._height - tiles.length;
    const toFill = Math.floor(emptyCount * obfuscationRatio);

    const pathSet = new Set(tiles.map(t => `${t.x},${t.y}`));
    const emptyCells: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        if (!pathSet.has(`${x},${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }

    // Shuffle empty cells
    for (let i = emptyCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
    }

    for (let i = 0; i < Math.min(toFill, emptyCells.length); i++) {
      const cell = emptyCells[i];
      const types: TileType[] = ["I", "L"];
      const type = types[Math.floor(Math.random() * types.length)];
      const rot = Math.floor(Math.random() * 4);
      tiles.push({ x: cell.x, y: cell.y, type, rot });
    }
  }

  private shuffleTiles(tiles: Array<{ x: number; y: number; type: TileType; rot: number }>): Array<{ x: number; y: number; type: TileType; rot: number }> {
    // Identify start/goal to exclude them from shuffling
    const start = this._path[0];
    const goal = this._path[this._path.length - 1];
    const startKey = `${start.x},${start.y}`;
    const goalKey = `${goal.x},${goal.y}`;

    // We only shuffle tiles that are part of the solution path (excluding start/goal)
    const toShuffle = tiles.filter(t => {
      const key = `${t.x},${t.y}`;
      if (key === startKey || key === goalKey) return false;
      return this._correctRotations.has(key);
    });

    const shuffleCount = Math.max(3, Math.floor(toShuffle.length * 0.8)); // Increased ratio slightly

    // Shuffle subset (avoiding duplicates in random pick)
    // Create a pool of indices
    const indices = Array.from({ length: toShuffle.length }, (_, i) => i);
    // Fisher-Yates shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Pick first N indices to rotate
    for (let k = 0; k < Math.min(shuffleCount, indices.length); k++) {
      const tile = toShuffle[indices[k]];
      // Ensure we actually change the rotation from the correct one
      // Correct rot is in _correctRotations
      const currentRot = tile.rot;
      // Pick a random NEW rotation (1, 2, or 3 offsets)
      const offset = 1 + Math.floor(Math.random() * 3);
      tile.rot = (tile.rot + offset) % 4;
    }

    return tiles;
  }

  private calculateStepLimit(tiles: Array<{ x: number; y: number; type: TileType; rot: number }>): number {
    let minSteps = 0;
    for (const tile of tiles) {
      const key = `${tile.x},${tile.y}`;
      const correct = this._correctRotations.get(key);
      if (correct !== undefined) {
        const stepsNeeded = (correct - tile.rot + 4) % 4;
        minSteps += stepsNeeded;
      }
    }
    return Math.max(1, Math.ceil(minSteps * 1.5) + 3);
  }

  private moveInDirection(x: number, y: number, dir: Direction): { x: number; y: number } {
    switch (dir) {
      case Direction.Up:
        return { x, y: y + 1 };
      case Direction.Right:
        return { x: x + 1, y };
      case Direction.Down:
        return { x, y: y - 1 };
      case Direction.Left:
        return { x: x - 1, y };
    }
  }

  private calculateStartDir(): Direction {
    if (this._path.length < 2) return Direction.Up; // Should not happen with min length check

    const start = this._path[0];
    const next = this._path[1];

    if (next.x > start.x) return Direction.Right;
    if (next.x < start.x) return Direction.Left;
    if (next.y > start.y) return Direction.Up;
    return Direction.Down;
  }

  private oppositeDir(dir: Direction): Direction {
    return ((dir + 2) % 4) as Direction;
  }
}

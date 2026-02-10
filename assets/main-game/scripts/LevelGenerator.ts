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

/**
 * 难度等级
 * - easy: 普通关卡
 * - medium: 每5关的中等难度关卡
 * - hard: 每10关的特别难关卡
 * - hell: 地狱级，小车需要先走到死胡同再折返，玩家趁机改路线
 */
type Difficulty = "easy" | "medium" | "hard" | "hell";

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
  private _difficulty: Difficulty = "easy";
  /** key = "x,y", value = set of Direction openings (from main path + branches) */
  private _nodeOpenings: Map<string, Set<Direction>> = new Map();
  /** Branch paths generated off the main path */
  private _branches: PathNode[][] = [];

  constructor(config: GeneratorConfig) {
    this._config = config;
  }

  public generate(): LevelData {
    this._difficulty = this.calculateDifficulty();
    this.calculateGridSize();
    this.initializeGrid();
    this.generatePath();
    this.generateBranches();
    this.buildNodeOpenings();
    const tiles = this.createTilesFromPath();
    this.addObfuscation(tiles);
    const shuffledTiles = this.shuffleTiles(tiles);
    if (this._difficulty === "hell") {
      this.applyHellRedirects(shuffledTiles);
    }
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

  /**
   * 根据关卡号计算难度
   * - 每20关: hell（地狱级）
   * - 每10关（非20的倍数）: hard（特别难）
   * - 每5关（非10的倍数）: medium（中等难度）
   * - 其他: easy（普通）
   */
  private calculateDifficulty(): Difficulty {
    const level = this._config.level;
    if (level % 20 === 0) return "hell";
    if (level % 10 === 0) return "hard";
    if (level % 5 === 0) return "medium";
    return "easy";
  }

  private calculateGridSize(): void {
    const tier = Math.floor((this._config.level - 1) / 100);

    // 根据难度调整格子大小
    let minCells: number;
    let maxCells: number;

    switch (this._difficulty) {
      case "hell":
        // 地狱级：更大的地图，需要容纳多条死胡同
        minCells = 5 + tier;
        maxCells = 7 + tier * 2;
        break;
      case "hard":
        // 特别难：更大的地图
        minCells = 4 + tier;
        maxCells = 6 + tier * 2;
        break;
      case "medium":
        // 中等难度：稍大的地图
        minCells = 3 + tier;
        maxCells = 5 + tier * 2;
        break;
      default:
        // 普通难度
        minCells = 3 + tier;
        maxCells = 4 + tier * 2;
    }

    minCells = Math.max(3, minCells);
    maxCells = Math.max(minCells, maxCells);

    const minTilePx = 80;
    const maxWidthByMinTile = Math.max(3, Math.floor(this._config.canvasWidth / minTilePx));
    const maxHeightByMinTile = Math.max(3, Math.floor(this._config.canvasHeight / minTilePx));

    const maxW = Math.min(maxCells, maxWidthByMinTile);
    const maxH = Math.min(maxCells, maxHeightByMinTile);

    const canvasW = Math.max(1, this._config.canvasWidth);
    const canvasH = Math.max(1, this._config.canvasHeight);
    const aspect = canvasW / canvasH;

    let bestW = minCells;
    let bestH = minCells;
    let bestUsedArea = -1;
    let bestTileSize = -1;
    let bestAspectDiff = Number.POSITIVE_INFINITY;

    for (let h = minCells; h <= maxH; h++) {
      for (let w = minCells; w <= maxW; w++) {
        const tileSize = Math.min(canvasW / w, canvasH / h);
        const usedArea = tileSize * tileSize * w * h;
        const aspectDiff = Math.abs(w / h - aspect);

        let score = usedArea;
        if (aspect >= 1.1 && w < h) score *= 0.98;
        if (aspect <= 0.9 && h < w) score *= 0.98;

        if (score > bestUsedArea + 1e-6) {
          bestUsedArea = score;
          bestTileSize = tileSize;
          bestAspectDiff = aspectDiff;
          bestW = w;
          bestH = h;
          continue;
        }

        if (Math.abs(score - bestUsedArea) <= 1e-6) {
          if (tileSize > bestTileSize + 1e-6) {
            bestTileSize = tileSize;
            bestAspectDiff = aspectDiff;
            bestW = w;
            bestH = h;
            continue;
          }
          if (Math.abs(tileSize - bestTileSize) <= 1e-6 && aspectDiff < bestAspectDiff) {
            bestAspectDiff = aspectDiff;
            bestW = w;
            bestH = h;
          }
        }
      }
    }

    this._width = Math.max(3, bestW);
    this._height = Math.max(3, bestH);
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

  private isEdge(x: number, y: number): boolean {
    return x === 0 || x === this._width - 1 || y === 0 || y === this._height - 1;
  }

  private distanceToNearestEdge(x: number, y: number): number {
    return Math.min(x, this._width - 1 - x, y, this._height - 1 - y);
  }

  private buildFallbackPath(minPathLength: number): void {
    this.initializeGrid();
    this._path = [];

    const route: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this._height; y++) {
      if (y % 2 === 0) {
        for (let x = 0; x < this._width; x++) route.push({ x, y });
      } else {
        for (let x = this._width - 1; x >= 0; x--) route.push({ x, y });
      }
    }

    const targetLen = Math.max(2, Math.min(minPathLength, route.length));
    let endIndex = targetLen - 1;
    while (endIndex < route.length - 1 && !this.isEdge(route[endIndex].x, route[endIndex].y)) {
      endIndex++;
    }

    for (let i = 0; i <= endIndex; i++) {
      const cur = route[i];
      if (i === 0) {
        const next = route[1];
        let startDir = Direction.Up;
        if (next.x > cur.x) startDir = Direction.Right;
        else if (next.x < cur.x) startDir = Direction.Left;
        else if (next.y > cur.y) startDir = Direction.Up;
        else startDir = Direction.Down;

        this._path.push({ x: cur.x, y: cur.y, fromDir: this.oppositeDir(startDir) });
        this._grid[cur.y][cur.x] = true;
        continue;
      }

      const prev = route[i - 1];
      let dir = Direction.Up;
      if (cur.x > prev.x) dir = Direction.Right;
      else if (cur.x < prev.x) dir = Direction.Left;
      else if (cur.y > prev.y) dir = Direction.Up;
      else dir = Direction.Down;

      this._path.push({ x: cur.x, y: cur.y, fromDir: this.oppositeDir(dir) });
      this._grid[cur.y][cur.x] = true;
    }
  }

  private generatePath(): void {
    this._path = [];

    let pathRatio: number;
    switch (this._difficulty) {
      case "hell":
        pathRatio = 0.7; // 地狱级：更长路径，确保足够的转弯点
        break;
      case "hard":
        pathRatio = 0.6; // 特别难：更长的路径
        break;
      case "medium":
        pathRatio = 0.5; // 中等难度：较长路径
        break;
      default:
        pathRatio = 0.4; // 普通难度
    }
    const minPathLength = Math.floor(this._width * this._height * pathRatio);

    const maxAttempts = 260;
    const maxRestarts = 60;

    for (let restart = 0; restart < maxRestarts; restart++) {
      this.initializeGrid();
      this._path = [];

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

      let attempts = 0;

      while (attempts < maxAttempts) {
        const current = this._path[this._path.length - 1];

        if (this._path.length >= minPathLength && this.isEdge(current.x, current.y)) {
          break;
        }

        let possibleDirs: Direction[];

        if (this._path.length === 1) {
          const inwardDir = this.oppositeDir(current.fromDir);
          possibleDirs = [inwardDir];

          const { x: nx, y: ny } = this.moveInDirection(current.x, current.y, inwardDir);
          if (nx < 0 || nx >= this._width || ny < 0 || ny >= this._height) {
            possibleDirs = this.getPossibleDirections(current);
          }
        } else {
          possibleDirs = this.getPossibleDirections(current);
        }

        if (possibleDirs.length === 0) {
          if (this._path.length > 5) {
            const removeCount = Math.floor(this._path.length / 2);
            for (let k = 0; k < removeCount; k++) {
              const p = this._path.pop();
              if (p) this._grid[p.y][p.x] = false;
            }
          } else {
            break;
          }
          attempts++;
          continue;
        }

        if (this._path.length >= minPathLength) {
          let bestDist = Number.POSITIVE_INFINITY;
          let bestDirs: Direction[] = [];

          for (const dir of possibleDirs) {
            const { x: nx, y: ny } = this.moveInDirection(current.x, current.y, dir);
            const d = this.distanceToNearestEdge(nx, ny);
            if (d < bestDist) {
              bestDist = d;
              bestDirs = [dir];
            } else if (d === bestDist) {
              bestDirs.push(dir);
            }
          }

          if (bestDirs.length > 0) possibleDirs = bestDirs;
        }

        const dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
        const { x: nextX, y: nextY } = this.moveInDirection(current.x, current.y, dir);

        this._path.push({ x: nextX, y: nextY, fromDir: this.oppositeDir(dir) });
        this._grid[nextY][nextX] = true;
        attempts++;
      }

      const goal = this._path[this._path.length - 1];
      if (this._path.length >= 2 && this._path.length >= minPathLength && this.isEdge(goal.x, goal.y)) {
        return;
      }
    }

    this.buildFallbackPath(minPathLength);
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

  /**
   * Generate branches off the main path to create T and X junctions.
   * A branch starts from a main-path node and extends into unoccupied cells.
   */
  private generateBranches(): void {
    this._branches = [];

    // Decide how many branches to attempt based on difficulty
    let branchRatio: number;
    switch (this._difficulty) {
      case "hell": branchRatio = 0.65; break;
      case "hard": branchRatio = 0.5; break;
      case "medium": branchRatio = 0.35; break;
      default: branchRatio = 0.2;
    }

    const maxBranches = Math.max(1, Math.floor(this._path.length * branchRatio));

    // Collect candidate main-path nodes (exclude start and goal)
    const candidates: number[] = [];
    for (let i = 1; i < this._path.length - 1; i++) {
      candidates.push(i);
    }
    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    let branchCount = 0;
    for (const idx of candidates) {
      if (branchCount >= maxBranches) break;

      const node = this._path[idx];

      // Determine which directions are already used by the main path at this node
      const usedDirs = new Set<Direction>();
      usedDirs.add(node.fromDir); // entry
      if (idx < this._path.length - 1) {
        usedDirs.add(this.oppositeDir(this._path[idx + 1].fromDir)); // exit to next
      }

      // Find free directions
      const freeDirs: Direction[] = [];
      for (let d = 0; d < 4; d++) {
        const dir = d as Direction;
        if (usedDirs.has(dir)) continue;
        const { x: nx, y: ny } = this.moveInDirection(node.x, node.y, dir);
        if (nx >= 0 && nx < this._width && ny >= 0 && ny < this._height && !this._grid[ny][nx]) {
          freeDirs.push(dir);
        }
      }

      if (freeDirs.length === 0) continue;

      // Pick a random free direction and grow a branch
      const branchDir = freeDirs[Math.floor(Math.random() * freeDirs.length)];
      const branch = this.growBranch(node.x, node.y, branchDir);
      if (branch.length > 0) {
        this._branches.push(branch);
        branchCount++;

        // If there's still another free direction, occasionally add a second branch (creating X)
        // 根据难度提高十字路口出现概率
        let xJunctionChance: number;
        switch (this._difficulty) {
          case "hell": xJunctionChance = 0.7; break;
          case "hard": xJunctionChance = 0.5; break;
          case "medium": xJunctionChance = 0.4; break;
          default: xJunctionChance = 0.3;
        }
        if (freeDirs.length >= 2 && Math.random() < xJunctionChance) {
          const remaining = freeDirs.filter(d => d !== branchDir);
          if (remaining.length > 0) {
            const dir2 = remaining[Math.floor(Math.random() * remaining.length)];
            const { x: nx2, y: ny2 } = this.moveInDirection(node.x, node.y, dir2);
            if (nx2 >= 0 && nx2 < this._width && ny2 >= 0 && ny2 < this._height && !this._grid[ny2][nx2]) {
              const branch2 = this.growBranch(node.x, node.y, dir2);
              if (branch2.length > 0) {
                this._branches.push(branch2);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Grow a single branch path starting from (startX, startY) in the given direction.
   * Returns the branch nodes (NOT including the junction node itself).
   */
  private growBranch(startX: number, startY: number, startDir: Direction): PathNode[] {
    const branch: PathNode[] = [];
    const maxLen = Math.max(2, Math.floor(Math.min(this._width, this._height) * 0.6));

    let cx = startX;
    let cy = startY;
    let dir = startDir;

    for (let step = 0; step < maxLen; step++) {
      const { x: nx, y: ny } = this.moveInDirection(cx, cy, dir);
      if (nx < 0 || nx >= this._width || ny < 0 || ny >= this._height) break;
      if (this._grid[ny][nx]) break;

      // Check neighbour occupancy to avoid creating unintended loops
      let neighborCount = 0;
      for (let d = 0; d < 4; d++) {
        const { x: nnx, y: nny } = this.moveInDirection(nx, ny, d as Direction);
        if (nnx >= 0 && nnx < this._width && nny >= 0 && nny < this._height && this._grid[nny][nnx]) {
          neighborCount++;
        }
      }
      if (neighborCount > 1) break; // Would create a loop

      branch.push({ x: nx, y: ny, fromDir: this.oppositeDir(dir) });
      this._grid[ny][nx] = true;
      cx = nx;
      cy = ny;

      // Decide next direction: prefer straight, sometimes turn
      const possibleNext: Direction[] = [];
      for (let d = 0; d < 4; d++) {
        const nd = d as Direction;
        if (nd === this.oppositeDir(dir)) continue; // Don't go back
        const { x: mx, y: my } = this.moveInDirection(cx, cy, nd);
        if (mx >= 0 && mx < this._width && my >= 0 && my < this._height && !this._grid[my][mx]) {
          let nc = 0;
          for (let dd = 0; dd < 4; dd++) {
            const { x: nnx2, y: nny2 } = this.moveInDirection(mx, my, dd as Direction);
            if (nnx2 >= 0 && nnx2 < this._width && nny2 >= 0 && nny2 < this._height && this._grid[nny2][nnx2]) nc++;
          }
          if (nc <= 1) possibleNext.push(nd);
        }
      }

      if (possibleNext.length === 0) break;
      // Prefer straight
      if (possibleNext.includes(dir) && Math.random() < 0.6) {
        // keep dir
      } else {
        dir = possibleNext[Math.floor(Math.random() * possibleNext.length)];
      }
    }

    return branch;
  }

  /**
   * Build the _nodeOpenings map by analyzing the main path and all branches.
   * Each entry maps a cell key to the set of Direction openings it needs.
   */
  private buildNodeOpenings(): void {
    this._nodeOpenings = new Map();

    const addOpening = (x: number, y: number, dir: Direction) => {
      const key = `${x},${y}`;
      if (!this._nodeOpenings.has(key)) this._nodeOpenings.set(key, new Set());
      this._nodeOpenings.get(key)!.add(dir);
    };

    // Process main path
    for (let i = 0; i < this._path.length; i++) {
      const node = this._path[i];

      if (i === 0) {
        // Start node: force I-shape aligned with exit direction
        if (i < this._path.length - 1) {
          const exitDir = this.oppositeDir(this._path[i + 1].fromDir);
          addOpening(node.x, node.y, this.oppositeDir(exitDir));
          addOpening(node.x, node.y, exitDir);
        }
      } else {
        addOpening(node.x, node.y, node.fromDir);
        if (i < this._path.length - 1) {
          const exitDir = this.oppositeDir(this._path[i + 1].fromDir);
          addOpening(node.x, node.y, exitDir);
        } else {
          // Goal node
          let exitDir: Direction;
          if (node.y === this._height - 1) exitDir = Direction.Up;
          else if (node.y === 0) exitDir = Direction.Down;
          else if (node.x === this._width - 1) exitDir = Direction.Right;
          else if (node.x === 0) exitDir = Direction.Left;
          else exitDir = Direction.Up;
          const straight = this.oppositeDir(node.fromDir);
          const { x: nx, y: ny } = this.moveInDirection(node.x, node.y, straight);
          if (nx < 0 || nx >= this._width || ny < 0 || ny >= this._height) {
            exitDir = straight;
          }
          addOpening(node.x, node.y, exitDir);
        }
      }
    }

    // Process branches
    for (const branch of this._branches) {
      if (branch.length === 0) continue;
      // The junction node is the main-path node that this branch connects to
      const firstBranch = branch[0];
      const junctionDir = this.oppositeDir(firstBranch.fromDir);
      // Find the junction cell
      const { x: jx, y: jy } = this.moveInDirection(firstBranch.x, firstBranch.y, firstBranch.fromDir);
      addOpening(jx, jy, junctionDir);

      // Process branch nodes
      for (let i = 0; i < branch.length; i++) {
        const bNode = branch[i];
        addOpening(bNode.x, bNode.y, bNode.fromDir);
        if (i < branch.length - 1) {
          const exitDir = this.oppositeDir(branch[i + 1].fromDir);
          addOpening(bNode.x, bNode.y, exitDir);
        }
        // Dead-end nodes have only one opening (fromDir), which means I-type at rot=0
        // We'll handle that in determineTileFromOpenings.
      }
    }
  }

  private createTilesFromPath(): Array<{ x: number; y: number; type: TileType; rot: number }> {
    const tiles: Array<{ x: number; y: number; type: TileType; rot: number }> = [];
    const placed = new Set<string>();

    // Helper to add a tile for a cell based on its openings
    const addTile = (x: number, y: number) => {
      const key = `${x},${y}`;
      if (placed.has(key)) return;
      placed.add(key);

      const openings = this._nodeOpenings.get(key);
      if (!openings || openings.size === 0) return;

      const { type, rot } = this.determineTileFromOpenings(openings);
      tiles.push({ x, y, type, rot });
      this._correctRotations.set(key, rot);
    };

    // Add main path tiles
    for (const node of this._path) {
      addTile(node.x, node.y);
    }

    // Add branch tiles
    for (const branch of this._branches) {
      for (const bNode of branch) {
        addTile(bNode.x, bNode.y);
      }
    }

    return tiles;
  }

  /**
   * Given a set of direction openings for a tile, determine the TileType and rotation.
   */
  private determineTileFromOpenings(openings: Set<Direction>): { type: TileType; rot: number } {
    const count = openings.size;

    if (count === 4) {
      // X-type: all four directions, rot is always 0
      return { type: "X", rot: 0 };
    }

    if (count === 3) {
      // T-type: BASE T = Up + Left + Right (missing Down)
      // Find missing direction
      let missing = Direction.Up;
      for (let d = 0; d < 4; d++) {
        if (!openings.has(d as Direction)) { missing = d as Direction; break; }
      }
      // T base mask opens Right, Down, Left (missing = Up) → rot = 0
      // missing = Right → rot = 1
      // missing = Down → rot = 2
      // missing = Left → rot = 3
      let rot = 0;
      switch (missing) {
        case Direction.Up: rot = 0; break;
        case Direction.Right: rot = 1; break;
        case Direction.Down: rot = 2; break;
        case Direction.Left: rot = 3; break;
      }
      return { type: "T", rot };
    }

    if (count === 1) {
      // Dead-end: treat as I-type pointing in that direction
      const dir = openings.values().next().value as Direction;
      const rot = (dir === Direction.Up || dir === Direction.Down) ? 0 : 1;
      return { type: "I", rot };
    }

    // count === 2
    const dirs = Array.from(openings).sort((a, b) => a - b);
    const d0 = dirs[0];
    const d1 = dirs[1];

    // Check if opposite (straight line) → I-type
    if (this.oppositeDir(d0) === d1) {
      const rot = (d0 === Direction.Up || d0 === Direction.Down) ? 0 : 1;
      return { type: "I", rot };
    }

    // L-type: BASE_MASK["L"] = Up + Right (rot=0)
    let rot = 0;
    if (d0 === Direction.Up && d1 === Direction.Right) rot = 0;
    else if (d0 === Direction.Right && d1 === Direction.Down) rot = 1;
    else if (d0 === Direction.Down && d1 === Direction.Left) rot = 2;
    else if (d0 === Direction.Up && d1 === Direction.Left) rot = 3;

    return { type: "L", rot };
  }

  private addObfuscation(tiles: Array<{ x: number; y: number; type: TileType; rot: number }>): void {
    const tier = Math.floor((this._config.level - 1) / 100);

    // 根据难度调整干扰格子比例
    let baseRatio: number;
    let maxRatio: number;
    switch (this._difficulty) {
      case "hell":
        baseRatio = 0.6; // 地狱级：大量干扰
        maxRatio = 0.9;
        break;
      case "hard":
        baseRatio = 0.5; // 特别难：更多干扰
        maxRatio = 0.8;
        break;
      case "medium":
        baseRatio = 0.4; // 中等难度：较多干扰
        maxRatio = 0.7;
        break;
      default:
        baseRatio = 0.3; // 普通难度
        maxRatio = 0.6;
    }
    const obfuscationRatio = Math.min(baseRatio + tier * 0.1, maxRatio);

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
      // Weighted random: I and L more common, T and X less common
      const r = Math.random();
      let type: TileType;
      if (r < 0.35) type = "I";
      else if (r < 0.65) type = "L";
      else if (r < 0.85) type = "T";
      else type = "X";
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
    // Also exclude X-type tiles (rotation doesn't change their connectivity)
    const toShuffle = tiles.filter(t => {
      const key = `${t.x},${t.y}`;
      if (key === startKey || key === goalKey) return false;
      if (t.type === "X") return false; // X is symmetric, shuffling is meaningless
      return this._correctRotations.has(key);
    });

    // 根据难度调整打乱比例
    let shuffleRatio: number;
    switch (this._difficulty) {
      case "hell":
        shuffleRatio = 1.0; // 地狱级：全部打乱
        break;
      case "hard":
        shuffleRatio = 0.95; // 特别难：几乎全部打乱
        break;
      case "medium":
        shuffleRatio = 0.9; // 中等难度：大部分打乱
        break;
      default:
        shuffleRatio = 0.8; // 普通难度
    }
    const shuffleCount = Math.max(3, Math.floor(toShuffle.length * shuffleRatio));

    // Shuffle subset (avoiding duplicates in random pick)
    const indices = Array.from({ length: toShuffle.length }, (_, i) => i);
    // Fisher-Yates shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Pick first N indices to rotate
    for (let k = 0; k < Math.min(shuffleCount, indices.length); k++) {
      const tile = toShuffle[indices[k]];
      this.applyEffectiveRotation(tile);
    }

    // Verify minimum misaligned count (at least 3 tiles must actually need rotation)
    const minMisaligned = 3;
    let misaligned = this.countMisaligned(tiles);

    // If not enough misaligned tiles, keep shuffling remaining un-shuffled tiles
    let extraIdx = Math.min(shuffleCount, indices.length);
    while (misaligned < minMisaligned && extraIdx < indices.length) {
      const tile = toShuffle[indices[extraIdx]];
      this.applyEffectiveRotation(tile);
      misaligned = this.countMisaligned(tiles);
      extraIdx++;
    }

    // If still not enough (very small map), re-roll already shuffled tiles with different offsets
    if (misaligned < minMisaligned) {
      for (let attempt = 0; attempt < 10 && misaligned < minMisaligned; attempt++) {
        for (let k = 0; k < Math.min(shuffleCount, indices.length); k++) {
          const tile = toShuffle[indices[k]];
          const key = `${tile.x},${tile.y}`;
          const correct = this._correctRotations.get(key);
          if (correct !== undefined && tile.rot === correct) {
            this.applyEffectiveRotation(tile);
          }
        }
        misaligned = this.countMisaligned(tiles);
      }
    }

    return tiles;
  }

  /** Apply an effective rotation offset to a tile (ensures the tile actually changes) */
  private applyEffectiveRotation(tile: { type: TileType; rot: number }): void {
    if (tile.type === "I") {
      // I-type: only offset 1 or 3 produces a different shape (offset 2 = same)
      const offset = Math.random() < 0.5 ? 1 : 3;
      tile.rot = (tile.rot + offset) % 4;
    } else {
      // L-type and T-type: any offset 1-3 is effective
      const offset = 1 + Math.floor(Math.random() * 3);
      tile.rot = (tile.rot + offset) % 4;
    }
  }

  /** Count how many solution-path tiles are currently misaligned */
  private countMisaligned(tiles: Array<{ x: number; y: number; type: TileType; rot: number }>): number {
    let count = 0;
    for (const tile of tiles) {
      const key = `${tile.x},${tile.y}`;
      const correct = this._correctRotations.get(key);
      if (correct === undefined) continue;
      // For I-type, rot 0 and 2 are equivalent, rot 1 and 3 are equivalent
      if (tile.type === "I") {
        if ((tile.rot % 2) !== (correct % 2)) count++;
      } else if (tile.type === "X") {
        // X-type is always correct, skip
      } else {
        if (tile.rot !== correct) count++;
      }
    }
    return count;
  }

  /**
   * 地狱模式核心逻辑：
   * 在主路径上选择 L 型转弯格子，强制旋转到错误方向。
   * 这会导致小车在该路口转向死胡同，玩家需要在小车经过后旋转该格子，
   * 小车从死胡同返回时就会走另一条路通往终点。
   *
   * 中间点数量 = 1 + floor((level-1) / 100)
   */
  private applyHellRedirects(tiles: Array<{ x: number; y: number; type: TileType; rot: number }>): void {
    const tier = Math.floor((this._config.level - 1) / 100);
    const redirectCount = 1 + tier;

    const start = this._path[0];
    const goal = this._path[this._path.length - 1];
    const startKey = `${start.x},${start.y}`;
    const goalKey = `${goal.x},${goal.y}`;

    // 找出主路径上的 L 型格子（排除起点和终点）
    const lTileCandidates: Array<{ tile: { x: number; y: number; type: TileType; rot: number }; pathIdx: number }> = [];

    for (let i = 1; i < this._path.length - 1; i++) {
      const node = this._path[i];
      const key = `${node.x},${node.y}`;
      if (key === startKey || key === goalKey) continue;

      const tile = tiles.find(t => `${t.x},${t.y}` === key);
      if (tile && tile.type === "L") {
        lTileCandidates.push({ tile, pathIdx: i });
      }
    }

    if (lTileCandidates.length === 0) return;

    // 打乱候选列表，优先选择靠近路径中间的格子（确保小车需要走较长才到死胡同）
    // 按路径位置排序：偏好中间段
    lTileCandidates.sort((a, b) => {
      const midIdx = Math.floor(this._path.length / 2);
      return Math.abs(a.pathIdx - midIdx) - Math.abs(b.pathIdx - midIdx);
    });

    const selected = lTileCandidates.slice(0, Math.min(redirectCount, lTileCandidates.length));

    for (const { tile, pathIdx } of selected) {
      const node = this._path[pathIdx];
      const entryDir = node.fromDir;
      const correctRot = this._correctRotations.get(`${node.x},${node.y}`);
      if (correctRot === undefined) continue;

      // 找到保持入口方向不变但出口方向改变的 L 旋转
      const hellRot = this.findAlternativeLRotation(entryDir, correctRot);
      if (hellRot !== null) {
        tile.rot = hellRot;
      }
    }
  }

  /**
   * 为 L 型格子找到替代旋转：保持 entryDir 方向可进入，但出口方向改变。
   *
   * L 型格子每个旋转的开口方向：
   * - rot 0: Up + Right
   * - rot 1: Right + Down
   * - rot 2: Down + Left
   * - rot 3: Up + Left
   *
   * 对于每个入口方向，恰好有 2 个 L 旋转包含它。
   * 一个是正确旋转，另一个就是地狱旋转。
   */
  private findAlternativeLRotation(entryDir: Direction, correctRot: number): number | null {
    const lOpenings: Direction[][] = [
      [Direction.Up, Direction.Right],     // rot 0
      [Direction.Right, Direction.Down],   // rot 1
      [Direction.Down, Direction.Left],    // rot 2
      [Direction.Up, Direction.Left],      // rot 3
    ];

    for (let r = 0; r < 4; r++) {
      if (r === correctRot) continue;
      if (lOpenings[r].includes(entryDir)) {
        return r;
      }
    }
    return null;
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

    // 根据难度调整步数余量
    let stepMultiplier: number;
    let bonusSteps: number;
    switch (this._difficulty) {
      case "hell":
        stepMultiplier = 1.1; // 地狱级：步数余量极少
        bonusSteps = 0;
        break;
      case "hard":
        stepMultiplier = 1.2; // 特别难：步数余量更少
        bonusSteps = 1;
        break;
      case "medium":
        stepMultiplier = 1.3; // 中等难度：步数余量较少
        bonusSteps = 2;
        break;
      default:
        stepMultiplier = 1.5; // 普通难度：步数余量较多
        bonusSteps = 3;
    }
    return Math.max(1, Math.ceil(minSteps * stepMultiplier) + bonusSteps);
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

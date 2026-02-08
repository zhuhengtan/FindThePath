import {
  _decorator,
  assetManager,
  Component,
  instantiate,
  Label,
  Layout,
  Node,
  Prefab,
  Size,
  UITransform,
  Vec3,
} from "cc";
import { Tile, TileType as TileVisualType } from "db://assets/main-game/prefabs/Tile/Tile";
import { LevelGenerator } from "./LevelGenerator";
import { showToast } from "db://assets/cc-hunter-ui/Toast/ToastManager";
import { StorageManager } from "db://assets/cc-hunter/utils/storage";

const { ccclass, property } = _decorator;

enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

type TileType = TileVisualType;

interface LevelStart {
  x: number;
  y: number;
  dir: Direction;
}

interface LevelGoal {
  x: number;
  y: number;
  dir: Direction;
}

interface LevelTile {
  x: number;
  y: number;
  type: TileType;
  rot: number;
}

interface LevelBlock {
  x: number;
  y: number;
}

export interface LevelData {
  level: number;
  generatorVersion: string;
  seed: string;
  width: number;
  height: number;
  start: LevelStart;
  goal: LevelGoal;
  stepLimit: number;
  tiles: LevelTile[];
  blocks?: LevelBlock[];
}

function oppositeDir(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}

function dirBit(dir: Direction): number {
  return 1 << dir;
}

function hasDir(mask: number, dir: Direction): boolean {
  return (mask & dirBit(dir)) !== 0;
}

function rotateMask(mask: number, rot: number): number {
  const r = ((rot % 4) + 4) % 4;
  const shifted = ((mask << r) | (mask >> (4 - r))) & 0b1111;
  return shifted;
}

function countBits(mask: number): number {
  let v = mask & 0b1111;
  let c = 0;
  while (v) {
    v &= v - 1;
    c++;
  }
  return c;
}

function otherSide(mask: number, entrySide: Direction): Direction | null {
  if (!hasDir(mask, entrySide)) return null;
  if (countBits(mask) !== 2) return null;
  for (let d = 0; d < 4; d++) {
    const dir = d as Direction;
    if (dir === entrySide) continue;
    if (hasDir(mask, dir)) return dir;
  }
  return null;
}

const BASE_MASK: Record<TileType, number> = {
  I: dirBit(Direction.Up) | dirBit(Direction.Down),
  L: dirBit(Direction.Up) | dirBit(Direction.Right),
  T: dirBit(Direction.Up) | dirBit(Direction.Left) | dirBit(Direction.Right),
  X: dirBit(Direction.Up) | dirBit(Direction.Right) | dirBit(Direction.Down) | dirBit(Direction.Left),
};

function tileMask(type: TileType, rot: number): number {
  return rotateMask(BASE_MASK[type], rot);
}

function dirVec(dir: Direction): Vec3 {
  switch (dir) {
    case Direction.Up:
      return new Vec3(0, 1, 0);
    case Direction.Right:
      return new Vec3(1, 0, 0);
    case Direction.Down:
      return new Vec3(0, -1, 0);
    case Direction.Left:
      return new Vec3(-1, 0, 0);
  }
}

function normalizeAngle(angle: number): number {
  while (angle >= 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

interface TileState {
  type: TileType;
  rot: number;
  blocked: boolean;
}

type CarPhase = "center" | "edge";

interface CarState {
  cellX: number;
  cellY: number;
  entrySide: Direction;
  phase: CarPhase;
  edgeDir: Direction;
  travelDir: Direction;
  progress: number;
  targetCellX: number;
  targetCellY: number;
  nextEntrySide: Direction;
}

class LevelRunner {
  public readonly width: number;
  public readonly height: number;

  public stepsLeft: number;
  public isWin: boolean = false;
  // Fail state is less relevant in endless loop logic, but can be used for loop detection if needed
  public isFail: boolean = false;

  private readonly _goalX: number;
  private readonly _goalY: number;
  private readonly _startX: number;
  private readonly _startY: number;
  private readonly _tiles: TileState[];
  private readonly _cellSize: number;
  private readonly _carSpeedPx: number;

  // Car State
  private _car: {
    x: number;          // Visual X (grid coord space)
    y: number;          // Visual Y
    gridX: number;      // Current logic grid X
    gridY: number;      // Current logic grid Y
    targetX: number;    // Target grid coordinate X (logic or edge)
    targetY: number;    // Target grid coordinate Y (logic or edge)
    fromDir: Direction; // Where we came from relative to current grid cell
    state: "MOVING_TO_CENTER" | "MOVING_TO_NEXT" | "MOVING_TO_EDGE" | "STOPPED";
    moveDir: Direction; // The direction we are currently moving physically
  };

  public constructor(level: LevelData, cellSize: number, carSpeed: number = 360) {
    this.width = level.width;
    this.height = level.height;
    this.stepsLeft = level.stepLimit;
    this._goalX = level.goal.x;
    this._goalY = level.goal.y;
    this._startX = level.start.x;
    this._startY = level.start.y;
    this._cellSize = cellSize;
    this._carSpeedPx = carSpeed;
    this._tiles = new Array<TileState>(this.width * this.height);

    // Initialize map
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this._tiles[y * this.width + x] = { type: "I", rot: 0, blocked: false };
      }
    }
    if (level.blocks) {
      for (const b of level.blocks) {
        if (!this.inBounds(b.x, b.y)) continue;
        this._tiles[b.y * this.width + b.x].blocked = true;
      }
    }
    for (const t of level.tiles) {
      if (!this.inBounds(t.x, t.y)) continue;
      const existing = this._tiles[t.y * this.width + t.x];
      existing.type = t.type;
      existing.rot = t.rot % 4;
    }

    // Initialize Car
    // Start OUTSIDE the map, moving inwards.
    const startDir = level.start.dir;
    const startEntry = oppositeDir(startDir);
    const startVec = dirVec(startDir);
    const startXOffset = -startVec.x;
    const startYOffset = -startVec.y;

    this._car = {
      x: this._startX + startXOffset,
      y: this._startY + startYOffset,
      gridX: this._startX,
      gridY: this._startY,
      targetX: this._startX,
      targetY: this._startY,
      fromDir: startEntry,
      state: "MOVING_TO_CENTER",
      moveDir: startDir,
    };
  }

  // --- External Accessors ---
  public getTile(x: number, y: number): TileState | null {
    if (!this.inBounds(x, y)) return null;
    return this._tiles[y * this.width + x];
  }
  public get goalX() { return this._goalX; }
  public get goalY() { return this._goalY; }
  public get startX() { return this._startX; }
  public get startY() { return this._startY; }
  public get carX() { return this._car.x; }
  public get carY() { return this._car.y; }
  public get carAngle() { return normalizeAngle(-this._car.moveDir * 90); }
  public getCarCell() { return { x: this._car.gridX, y: this._car.gridY }; }
  public get isCarStopped() { return this._car.state === "STOPPED"; }

  public isTileOccupied(x: number, y: number): boolean {
    return Math.round(this._car.x) === x && Math.round(this._car.y) === y;
  }

  public rotateTile(x: number, y: number): boolean {
    if (this.isWin) return false;
    if (this.stepsLeft <= 0) return false;
    // Don't rotate if car is theoretically "on" this tile
    if (Math.round(this._car.x) === x && Math.round(this._car.y) === y) return false;

    const tile = this.getTile(x, y);
    if (!tile || tile.blocked) return false;
    tile.rot = (tile.rot + 1) % 4;
    this.stepsLeft--;
    return true;
  }

  public getCarRender(cellOrigin: Vec3): { pos: Vec3; angle: number } {
    const center = this.cellCenter(cellOrigin, this._car.x, this._car.y);
    const angle = normalizeAngle(-this._car.moveDir * 90);
    return { pos: center, angle };
  }

  // --- Main Logic Loop ---
  public update(dt: number): void {
    if (this.isWin && this._car.state === "STOPPED") return;

    const moveDist = (this._carSpeedPx / this._cellSize) * dt;

    let dx = 0, dy = 0;

    if (this._car.state === "MOVING_TO_CENTER") {
      dx = this._car.gridX - this._car.x;
      dy = this._car.gridY - this._car.y;
    } else if (this._car.state === "MOVING_TO_NEXT") {
      dx = this._car.targetX - this._car.x;
      dy = this._car.targetY - this._car.y;
    } else if (this._car.state === "MOVING_TO_EDGE") {
      dx = this._car.targetX - this._car.x;
      dy = this._car.targetY - this._car.y;
    }

    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= moveDist) {
      // Arrived!
      this._car.x += dx;
      this._car.y += dy;

      const previousState = this._car.state;

      if (previousState === "MOVING_TO_CENTER") {
        this.arriveAtCenter();
      } else if (previousState === "MOVING_TO_NEXT") {
        this._car.gridX = this._car.targetX;
        this._car.gridY = this._car.targetY;
        this._car.x = this._car.gridX;
        this._car.y = this._car.gridY;
        // Update entry direction: we entered Next from Opposite(MoveDir)
        this._car.fromDir = oppositeDir(this._car.moveDir);
        this.arriveAtCenter();
      } else if (previousState === "MOVING_TO_EDGE") {
        // We hit the edge/wall. Bounce!
        this.bounceAtEdge(this._car.moveDir);
      }
    } else {
      const ratio = moveDist / dist;
      this._car.x += dx * ratio;
      this._car.y += dy * ratio;
    }
  }

  private arriveAtCenter(): void {
    if (!this.inBounds(this._car.gridX, this._car.gridY)) {
      this._car.state = "STOPPED";
      return;
    }

    const cx = this._car.gridX;
    const cy = this._car.gridY;
    const entry = this._car.fromDir;

    const exitDir = this.computeExitDir(cx, cy, entry);
    const nx = cx + dirVec(exitDir).x;
    const ny = cy + dirVec(exitDir).y;

    const inBounds = this.inBounds(nx, ny);
    const canEnterNext = inBounds && this.canEnter(nx, ny, oppositeDir(exitDir));

    if (canEnterNext) {
      this.setMoveTarget(exitDir);
    } else {
      // Blocked!

      // Winning Check: If at goal and exiting map = Win
      if (cx === this._goalX && cy === this._goalY && !inBounds) {
        this.isWin = true;
        this.setMoveTarget(exitDir);
        return;
      }

      // Logic: Move to Edge then Turn
      // Target = Center + Dir * 0.5 (Edge of current tile)
      // Note: 0.5 might be visually "too much" clipping?
      // 0.45 keeps it slightly inside. 0.5 puts center of car on line.
      const edgeDist = 0.5;
      this._car.targetX = cx + dirVec(exitDir).x * edgeDist;
      this._car.targetY = cy + dirVec(exitDir).y * edgeDist;
      this._car.moveDir = exitDir;
      this._car.state = "MOVING_TO_EDGE";
    }
  }

  private bounceAtEdge(hitDir: Direction): void {
    // We are at the edge.
    // Check if we accidentally went out of bounds (Start Gate Logic)
    // If hitDir leads to out-of-bounds (e.g. at Start Tile moving Out),
    // we should not have been able to go there if it wasn't for the "Edge" logic.
    // Actually, if we are at Start Tile, and we move Out (to edge),
    // we are physically at the edge of the map.
    // If we attempt to bounce, we turn around and go In.

    // BUT, User asked for "Start Gate Check" previously.
    // If we moved to edge, we are still "In Bounds" or "On Edge".
    // We just need to ensure we don't exit the map backwards.

    const cx = this._car.gridX;
    const cy = this._car.gridY;
    const potentialExitX = cx + dirVec(hitDir).x; // The coordinate OUTSIDE
    const potentialExitY = cy + dirVec(hitDir).y;

    if (!this.inBounds(potentialExitX, potentialExitY)) {
      // We hit the map boundary edge.
      // If this is the START gate, we should not exit.
      // Actually, we are just turning around. This is fine.
      // The previous logic "Bounce off Start" meant "Don't go to Previous Tile (which is outside)".
      // Now we are ALREADY at the edge. We just turn around.
    }

    const reverseDir = oppositeDir(hitDir);
    this._car.moveDir = reverseDir;

    // Target is grid center
    // Note: We don't change gridX/gridY, we are still logically in the same tile.
    // Just moving visual position back to center.
    // When we arrive at center, we need to know we came from that edge.
    this._car.fromDir = hitDir;

    this._car.state = "MOVING_TO_CENTER";
  }

  private setMoveTarget(dir: Direction) {
    this._car.moveDir = dir;
    this._car.targetX = this._car.gridX + dirVec(dir).x;
    this._car.targetY = this._car.gridY + dirVec(dir).y;
    this._car.state = "MOVING_TO_NEXT";
  }

  private canEnter(x: number, y: number, fromDir: Direction): boolean {
    if (!this.inBounds(x, y)) return false;
    const tile = this.getTile(x, y);
    if (!tile || tile.blocked) return false;
    const mask = tileMask(tile.type, tile.rot);
    return hasDir(mask, fromDir);
  }

  private computeExitDir(x: number, y: number, entrySide: Direction): Direction {
    const tile = this.getTile(x, y);
    if (!tile || tile.blocked) return entrySide;

    // If entered side is closed, bounce immediately (should not happen with canEnter check)
    const mask = tileMask(tile.type, tile.rot);
    if (!hasDir(mask, entrySide)) return entrySide;

    const out = otherSide(mask, entrySide);
    if (out !== null) return out;

    // Fallbacks
    const forward = oppositeDir(entrySide);
    if (hasDir(mask, forward)) return forward;

    const right = ((forward + 1) % 4) as Direction;
    if (hasDir(mask, right)) return right;

    const left = ((forward + 3) % 4) as Direction;
    if (hasDir(mask, left)) return left;

    return entrySide;
  }

  private cellCenter(origin: Vec3, gx: number, gy: number): Vec3 {
    const ox = origin.x + (gx - (this.width - 1) / 2) * this._cellSize;
    const oy = origin.y + (gy - (this.height - 1) / 2) * this._cellSize;
    return new Vec3(ox, oy, 0);
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
}

@ccclass("FindThePathGame")
export class FindThePathGame extends Component {
  // 基础格子大小（用于布局计算）
  private readonly _baseCellSize = 96;
  // 实际使用的格子大小（会根据屏幕动态调整）
  private _cellSize = 96;
  // 最小格子大小（确保触控友好）
  private readonly _minCellSize = 80;
  private readonly _bundleName = "main-game";
  private readonly _tilePrefabPath = "prefabs/Tile/Tile";

  @property(Node)
  public gridRoot: Node | null = null;

  @property(Node)
  public carNode: Node | null = null;

  @property(Label)
  public stepsLabel: Label | null = null;

  @property(Node)
  public finishNode: Node | null = null;

  @property
  public carSpeed: number = 180;

  private _runner: LevelRunner | null = null;
  private _levelNumber: number = 1;
  private _tileNodes: Node[] = [];
  private _tileComps: Tile[] = [];
  private _tileOccupiedCache: boolean[] = [];
  private _tilePrefab: Prefab | null = null;
  private _levelGenerator: LevelGenerator | null = null;
  private _gridScale: number = 1;
  private _startLabel: Node | null = null;
  private _goalLabel: Node | null = null;
  private _isLevelFinished: boolean = false;
  private readonly _storageKey = "FindThePath_CurrentLevel";
  private readonly _levelDataKey = "FindThePath_LevelData";
  // 缓存画布尺寸，确保一致性
  private _cachedCanvasWidth: number = 0;
  private _cachedCanvasHeight: number = 0;

  private _tileVisualSize: number = 100;
  private _carBaseScale: Vec3 | null = null;
  private _finishBaseScale: Vec3 | null = null;

  private _exit: (() => void) | null = null;

  public setExit(cb: () => void): void {
    this._exit = cb;
  }

  private ensureCarBaseScale(): void {
    if (this._carBaseScale) return;
    if (!this.carNode) return;
    const s = this.carNode.getScale();
    this._carBaseScale = new Vec3(s.x, s.y, s.z);
  }

  private ensureFinishBaseScale(): void {
    if (this._finishBaseScale) return;
    if (!this.finishNode) return;
    const s = this.finishNode.getScale();
    this._finishBaseScale = new Vec3(s.x, s.y, s.z);
  }

  private applyCarScaleByTileVisualSize(tileVisualSize: number): void {
    this.ensureCarBaseScale();
    if (!this.carNode || !this._carBaseScale) return;
    if (!Number.isFinite(tileVisualSize) || tileVisualSize <= 0) return;

    const ratio = this._cellSize / tileVisualSize;
    this.carNode.setScale(this._carBaseScale.x * ratio, this._carBaseScale.y * ratio, this._carBaseScale.z);
  }

  private applyFinishScaleByTileVisualSize(tileVisualSize: number): void {
    this.ensureFinishBaseScale();
    if (!this.finishNode || !this._finishBaseScale) return;
    if (!Number.isFinite(tileVisualSize) || tileVisualSize <= 0) return;

    const ratio = this._cellSize / tileVisualSize;
    this.finishNode.setScale(this._finishBaseScale.x * ratio, this._finishBaseScale.y * ratio, this._finishBaseScale.z);
  }

  protected onLoad(): void {
    const savedLevel = StorageManager.getItem<number>(this._storageKey, 1);
    this._levelNumber = savedLevel;
    this.ensureCarBaseScale();
    this.ensureFinishBaseScale();
  }

  protected start(): void {
    // 延迟一帧初始化，确保 Widget 完全更新了 gridRoot 的尺寸
    this.scheduleOnce(() => {
      void this.initLevel();
    }, 0);
  }

  public onClickRestart(): void {
    this.restart();
  }

  public onClickExit(): void {
    this._exit?.();
  }

  private async initLevel(): Promise<void> {
    this._isLevelFinished = false;
    this._tileNodes = [];
    this._tileComps = [];
    this._tileOccupiedCache = [];

    // Get actual canvas size from gridRoot (only on first init)
    if (this._cachedCanvasWidth === 0 || this._cachedCanvasHeight === 0) {
      if (this.gridRoot) {
        const uiTransform = this.gridRoot.getComponent(UITransform);
        if (uiTransform) {
          this._cachedCanvasWidth = uiTransform.width || 800;
          this._cachedCanvasHeight = uiTransform.height || 600;
        }
      }
      if (this._cachedCanvasWidth === 0) this._cachedCanvasWidth = 800;
      if (this._cachedCanvasHeight === 0) this._cachedCanvasHeight = 600;
    }
    const canvasWidth = this._cachedCanvasWidth;
    const canvasHeight = this._cachedCanvasHeight;

    // 尝试从本地加载已保存的关卡数据
    let level = this.loadSavedLevelData();

    if (!level || level.level !== this._levelNumber) {
      // 没有保存的关卡数据或关卡号不匹配，生成新关卡
      this._levelGenerator = new LevelGenerator({
        canvasWidth,
        canvasHeight,
        cellSize: this._cellSize,
        level: this._levelNumber,
      });

      level = this._levelGenerator.generate();
      // 保存生成的关卡数据到本地
      this.saveLevelData(level);
    }

    this._levelNumber = level.level;
    this._runner = new LevelRunner(level, this._cellSize, this.carSpeed);

    this._tilePrefab = await this.loadPrefab(this._bundleName, this._tilePrefabPath);
    if (!this._tilePrefab) {
      this.refreshHud("Tile.prefab 加载失败");
      return;
    }

    this.buildGrid(level);

    // 重置 gridRoot 缩放（Layout 已经处理了尺寸）
    this.gridRoot?.setScale(1, 1, 1);
    this._gridScale = 1;

    this.refreshCar();
    this.refreshTilesOccupied();
    this.updateFinishNodePosition(level);
    this.refreshHud();
  }

  /**
   * 保存关卡数据到本地存储
   */
  private saveLevelData(level: LevelData): void {
    StorageManager.setItem(this._levelDataKey, level);
  }

  /**
   * 从本地存储加载关卡数据
   */
  private loadSavedLevelData(): LevelData | null {
    return StorageManager.getItem<LevelData>(this._levelDataKey, null);
  }

  /**
   * 清除保存的关卡数据
   */
  private clearSavedLevelData(): void {
    StorageManager.removeItem(this._levelDataKey);
  }

  protected update(dt: number): void {
    if (!this._runner) return;
    this._runner.update(dt);
    this.refreshCar();
    this.refreshTilesOccupied();
    this.refreshHud();

    if (this._runner.isWin && this._runner.isCarStopped && !this._isLevelFinished) {
      this._isLevelFinished = true;
      this.handleLevelWin();
    }
  }

  private handleLevelWin(): void {
    const nextLevel = this._levelNumber + 1;
    // 清除当前关卡的保存数据
    this.clearSavedLevelData();
    // 保存下一关的关卡号
    StorageManager.setItem(this._storageKey, nextLevel);
    showToast("通关成功！", 1.5, () => {
      this._levelNumber = nextLevel;
      void this.initLevel();
    });
  }

  public restart(): void {
    void this.initLevel();
  }

  private buildGrid(level: LevelData): void {
    if (!this._runner || !this._tilePrefab || !this.gridRoot) return;

    this.gridRoot.destroyAllChildren();

    let tileVisualSize = 100;
    {
      const probe = instantiate(this._tilePrefab);
      const probeUi = probe.getComponent(UITransform);
      const probeScale = probe.getScale();
      if (probeUi) {
        const w = probeUi.width * probeScale.x;
        const h = probeUi.height * probeScale.y;
        const m = Math.max(w, h);
        if (Number.isFinite(m) && m > 0) tileVisualSize = m;
      }
      probe.destroy();
    }
    this._tileVisualSize = tileVisualSize;

    // 配置 Layout 组件
    const layout = this.gridRoot.getComponent(Layout);
    if (layout) {
      // 设置列数为关卡宽度
      layout.constraintNum = level.width;

      // 获取 gridRoot 自身的尺寸（Widget 已经设置好了）
      const gridTransform = this.gridRoot.getComponent(UITransform);
      if (gridTransform) {
        const availableWidth = gridTransform.width;
        const availableHeight = gridTransform.height;

        // 计算每个格子的最优尺寸
        const cellWidth = availableWidth / level.width;
        const cellHeight = availableHeight / level.height;
        const optimalCellSize = Math.floor(Math.min(cellWidth, cellHeight));

        // 确保最小触控尺寸
        const finalCellSize = Math.max(this._minCellSize, optimalCellSize);

        layout.cellSize = new Size(finalCellSize, finalCellSize);
        this._cellSize = finalCellSize;

        this.applyCarScaleByTileVisualSize(tileVisualSize);
        this.applyFinishScaleByTileVisualSize(tileVisualSize);

        const spacingX = layout.spacingX ?? 0;
        const spacingY = layout.spacingY ?? 0;
        const contentWidth = finalCellSize * level.width + spacingX * Math.max(0, level.width - 1);
        const contentHeight = finalCellSize * level.height + spacingY * Math.max(0, level.height - 1);

        const remainWidth = Math.max(0, availableWidth - contentWidth);
        const remainHeight = Math.max(0, availableHeight - contentHeight);

        const paddingLeft = Math.floor(remainWidth / 2);
        const paddingRight = Math.floor(remainWidth - paddingLeft);
        const paddingBottom = Math.floor(remainHeight / 2);
        const paddingTop = Math.floor(remainHeight - paddingBottom);

        layout.paddingLeft = paddingLeft;
        layout.paddingRight = paddingRight;
        layout.paddingTop = paddingTop;
        layout.paddingBottom = paddingBottom;

        console.log(`[Grid] gridRoot: ${gridTransform.width}x${gridTransform.height}, grid: ${level.width}x${level.height}, cellSize: ${finalCellSize}, constraintNum: ${layout.constraintNum}`);
      }
    }

    // 创建 Tile 节点（从上到下，从左到右）
    // 注意：Layout 的 Vertical Direction 是 TOP_TO_BOTTOM，所以需要从 y=height-1 开始
    for (let y = level.height - 1; y >= 0; y--) {
      for (let x = 0; x < level.width; x++) {
        const idx = y * level.width + x;
        const tileNode = instantiate(this._tilePrefab);
        tileNode.name = `Tile_${x}_${y}`;
        tileNode.parent = this.gridRoot;
        // Layout 的 CHILDREN resize mode 会自动设置子节点尺寸

        this._tileNodes[idx] = tileNode;
        const tileComp = tileNode.getComponent(Tile) ?? tileNode.addComponent(Tile);
        tileComp.setup({
          x,
          y,
          cellSize: this._cellSize,
          onClick: (cx, cy) => this.onClickTile(cx, cy),
        });
        this._tileComps[idx] = tileComp;
        this._tileOccupiedCache[idx] = false;
        this.redrawTile(x, y, true);
      }
    }

    // 让 Layout 更新布局
    if (layout) {
      layout.updateLayout();
    }
  }

  private onClickTile(x: number, y: number): void {
    if (!this._runner) return;
    const ok = this._runner.rotateTile(x, y);
    if (!ok) return;
    const idx = y * this._runner.width + x;
    const tile = this._runner.getTile(x, y);
    const comp = this._tileComps[idx];
    if (tile && comp && !tile.blocked) {
      comp.setRotation(tile.rot, true);
    }
    this.redrawTile(x, y, false);
    this.refreshHud();
  }

  private redrawTile(x: number, y: number, syncRotation: boolean): void {
    if (!this._runner) return;
    const tile = this._runner.getTile(x, y);
    if (!tile) return;
    const idx = y * this._runner.width + x;
    const comp = this._tileComps[idx];
    if (!comp) return;

    comp.render({
      type: tile.type,
      rot: tile.rot,
      blocked: tile.blocked,
      isStart: x === this._runner.startX && y === this._runner.startY,
      isGoal: x === this._runner.goalX && y === this._runner.goalY,
      isOccupied: this._runner.isTileOccupied(x, y),
    });

    if (syncRotation && !tile.blocked) {
      comp.setRotation(tile.rot, false);
    }
  }

  /**
   * 设置终点节点位置
   */
  private updateFinishNodePosition(level: LevelData): void {
    if (!this.finishNode || !this.gridRoot || !this._runner) return;

    // 获取目标格子的实际位置
    const goalIdx = level.goal.y * level.width + level.goal.x;
    const goalTileNode = this._tileNodes[goalIdx];
    if (!goalTileNode) return;

    const dir = level.goal.dir;
    const vec = dirVec(dir);
    this.applyFinishScaleByTileVisualSize(this._tileVisualSize);
    this.finishNode.angle = -dir * 90;

    let finishDepth = this._cellSize;
    const finishUi = this.finishNode.getComponent(UITransform);
    if (finishUi) {
      const s = this.finishNode.getScale();
      const w = finishUi.width * s.x;
      const h = finishUi.height * s.y;
      finishDepth = (dir === Direction.Up || dir === Direction.Down) ? h : w;
    }
    const offsetDist = this._cellSize * 0.5 + finishDepth * 0.5;

    // 基于目标格子的实际位置计算终点位置
    const tilePos = goalTileNode.getPosition();
    const px = tilePos.x + vec.x * offsetDist;
    const py = tilePos.y + vec.y * offsetDist;

    // 如果 finishNode 是 gridRoot 的子节点，直接设置位置
    if (this.finishNode.parent === this.gridRoot) {
      this.finishNode.setPosition(px, py, 0);
    } else {
      // 否则需要转换到世界坐标
      const goalWorldPos = goalTileNode.getWorldPosition();
      const worldPx = goalWorldPos.x + vec.x * offsetDist;
      const worldPy = goalWorldPos.y + vec.y * offsetDist;
      this.finishNode.setWorldPosition(new Vec3(worldPx, worldPy, 0));
    }

    this.finishNode.active = true;
  }

  private refreshCar(): void {
    if (!this._runner || !this.carNode || !this.gridRoot) return;

    // 获取小车的网格坐标（可能是小数）
    const carX = this._runner.carX;
    const carY = this._runner.carY;
    const carAngle = this._runner.carAngle;

    // 获取第一个格子 (0, height-1) 的位置作为参考点
    const firstTileIdx = (this._runner.height - 1) * this._runner.width + 0;
    const firstTile = this._tileNodes[firstTileIdx];
    if (!firstTile) return;

    const firstTilePos = firstTile.getPosition();

    // 计算小车相对于第一个格子的偏移
    // 在逻辑坐标中：第一个格子是 (0, height-1)
    // 小车在 (carX, carY)，相对于第一个格子的偏移是：
    // dx = carX - 0 = carX
    // dy = carY - (height-1) = carY - height + 1
    const dx = carX;
    const dy = carY - (this._runner.height - 1);

    // 在 Layout 坐标中：
    // X 方向：向右增加，与逻辑坐标相同
    // Y 方向：逻辑Y减小时，视觉Y也减小（向下）
    // dy 为负表示小车在 firstTile 下方，所以 +dy 会使 Y 变小
    const carPos = new Vec3(
      firstTilePos.x + dx * this._cellSize,
      firstTilePos.y + dy * this._cellSize,
      0
    );

    // 设置小车位置
    if (this.carNode.parent === this.gridRoot) {
      this.carNode.setPosition(carPos);
    } else {
      // 转换到世界坐标
      const gridUi = this.gridRoot.getComponent(UITransform);
      if (gridUi) {
        const worldPos = gridUi.convertToWorldSpaceAR(carPos);
        this.carNode.setWorldPosition(worldPos);
      }
    }
    this.carNode.angle = carAngle;
  }

  private refreshHud(statusOverride?: string): void {
    if (!this._runner) return;
    if (this.stepsLabel) {
      this.stepsLabel.string = `关卡：${this._levelNumber}  步数：${this._runner.stepsLeft}`;
    }
  }

  private refreshTilesOccupied(): void {
    if (!this._runner) return;
    const w = this._runner.width;
    const h = this._runner.height;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const occ = this._runner.isTileOccupied(x, y);
        if (this._tileOccupiedCache[idx] === occ) continue;
        this._tileOccupiedCache[idx] = occ;
        this.redrawTile(x, y, false);
      }
    }
  }

  // calculateAndApplyScale 已移除，Layout 组件现在处理缩放

  private loadPrefab(bundleName: string, prefabPath: string): Promise<Prefab | null> {
    return new Promise((resolve) => {
      let bundle = assetManager.getBundle(bundleName);

      const loadFromBundle = (b: ReturnType<typeof assetManager.getBundle>) => {
        b!.load(prefabPath, Prefab, (err, prefab) => {
          if (err || !prefab) {
            resolve(null);
            return;
          }
          resolve(prefab);
        });
      };

      if (!bundle) {
        assetManager.loadBundle(bundleName, (err, loadedBundle) => {
          if (err || !loadedBundle) {
            resolve(null);
            return;
          }
          loadFromBundle(loadedBundle);
        });
      } else {
        loadFromBundle(bundle);
      }
    });
  }


}

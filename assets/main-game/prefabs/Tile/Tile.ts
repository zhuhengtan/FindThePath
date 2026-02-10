import {
  _decorator,
  Color,
  Component,
  Enum,
  Graphics,
  Node,
  Sprite,
  SpriteFrame,
  tween,
  Tween,
  UITransform,
} from "cc";
const { ccclass, property } = _decorator;

export type TileType = "I" | "L" | "T" | "X";

export enum TileVisualType {
  I = 0,
  L = 1,
  T = 2,
  X = 3,
}

export interface TileRenderData {
  type: TileType;
  rot: number;
  blocked: boolean;
  isStart: boolean;
  isGoal: boolean;
  isOccupied: boolean;
}

@ccclass('Tile')
export class Tile extends Component {
  @property({ type: Enum(TileVisualType) })
  public tileType: TileVisualType = TileVisualType.I;

  @property({ type: SpriteFrame })
  public spriteFrameI: SpriteFrame | null = null;

  @property({ type: SpriteFrame })
  public spriteFrameL: SpriteFrame | null = null;

  @property({ type: SpriteFrame })
  public spriteFrameT: SpriteFrame | null = null;

  @property({ type: SpriteFrame })
  public spriteFrameX: SpriteFrame | null = null;

  private _cellX: number = 0;
  private _cellY: number = 0;
  private _cellSize: number = 96;
  private _rot: number = 0;

  private _gfx: Graphics | null = null;
  private _sprite: Sprite | null = null;
  private _onClick: ((x: number, y: number) => void) | null = null;

  protected onLoad(): void {
    const ui = this.getComponent(UITransform) ?? this.addComponent(UITransform);
    ui.setContentSize(this._cellSize, this._cellSize);

    this._gfx = this.getComponent(Graphics) ?? this.addComponent(Graphics);
    this._sprite = this.getComponent(Sprite) ?? this.addComponent(Sprite);

    this.node.on(Node.EventType.TOUCH_END, () => {
      this._onClick?.(this._cellX, this._cellY);
    });

    this.applySpriteFrame();
  }

  protected onValidate(): void {
    this.applySpriteFrame();
  }

  public setup(opts: {
    x: number;
    y: number;
    cellSize: number;
    onClick: (x: number, y: number) => void;
  }): void {
    this._cellX = opts.x;
    this._cellY = opts.y;
    this._cellSize = opts.cellSize;
    this._onClick = opts.onClick;

    const ui = this.getComponent(UITransform) ?? this.addComponent(UITransform);
    ui.setContentSize(this._cellSize, this._cellSize);

    this.applySpriteFrame();
  }

  public render(data: TileRenderData): void {
    if (!this._gfx) return;

    const gfx = this._gfx;
    gfx.clear();

    // Draw cell border
    gfx.lineWidth = 2;
    gfx.strokeColor = new Color(90, 90, 90, 255);
    gfx.rect(-this._cellSize / 2, -this._cellSize / 2, this._cellSize, this._cellSize);
    gfx.stroke();

    // Draw cell background
    gfx.fillColor = data.blocked ? new Color(40, 40, 40, 255) : new Color(20, 20, 20, 255);
    gfx.rect(-this._cellSize / 2 + 1, -this._cellSize / 2 + 1, this._cellSize - 2, this._cellSize - 2);
    gfx.fill();

    // Highlight goal/start background removed as per request (they are external now)
    /*
    if (data.isGoal) {
      gfx.fillColor = new Color(60, 180, 60, 200);
      gfx.rect(-this._cellSize / 2 + 1, -this._cellSize / 2 + 1, this._cellSize - 2, this._cellSize - 2);
      gfx.fill();
    }
    if (data.isStart) {
       // ...
    }
    */

    // Handle blocked tiles
    if (data.blocked) {
      this.setRotation(0, false);
      gfx.strokeColor = new Color(120, 120, 120, 255);
      gfx.lineWidth = 6;
      const half = this._cellSize / 2;
      gfx.moveTo(-half + 16, -half + 16);
      gfx.lineTo(half - 16, half - 16);
      gfx.moveTo(-half + 16, half - 16);
      gfx.lineTo(half - 16, -half + 16);
      gfx.stroke();
      return;
    }

    // Apply sprite for road type
    this.applySpriteFrame(data.type);

    // Fallback: draw road lines if no sprite is available
    if (!this._sprite?.spriteFrame) {
      gfx.strokeColor = new Color(230, 230, 230, 255);
      gfx.lineWidth = 10;

      const half = this._cellSize / 2;
      gfx.moveTo(0, 0);
      if (data.type === "I") {
        // Vertical road: Up and Down
        gfx.lineTo(0, half - 10);
        gfx.moveTo(0, 0);
        gfx.lineTo(0, -half + 10);
      } else if (data.type === "L") {
        // L-shape: Up and Right (matching BASE_MASK)
        gfx.lineTo(0, half - 10);
        gfx.moveTo(0, 0);
        gfx.lineTo(half - 10, 0);
      } else if (data.type === "T") {
        // T-shape: Right, Down, Left (matching BASE_MASK and T.png sprite)
        gfx.lineTo(half - 10, 0);
        gfx.moveTo(0, 0);
        gfx.lineTo(0, -half + 10);
        gfx.moveTo(0, 0);
        gfx.lineTo(-half + 10, 0);
      } else {
        // X-shape: All four directions
        gfx.lineTo(0, half - 10);
        gfx.moveTo(0, 0);
        gfx.lineTo(half - 10, 0);
        gfx.moveTo(0, 0);
        gfx.lineTo(0, -half + 10);
        gfx.moveTo(0, 0);
        gfx.lineTo(-half + 10, 0);
      }
      gfx.stroke();
    }
  }

  public setRotation(rot: number, animated: boolean): void {
    const normalized = ((rot % 4) + 4) % 4;
    this._rot = normalized;
    const targetAngle = -normalized * 90;
    if (!animated) {
      Tween.stopAllByTarget(this.node);
      this.node.angle = targetAngle;
      return;
    }
    // Animated rotation (always 90 degrees clockwise for user interaction)
    // We tween to (current - 90) to ensure strict direction, 
    // then reset to the canonical targetAngle (e.g. -360 -> 0) silently.
    Tween.stopAllByTarget(this.node);
    tween(this.node)
      .to(0.1, { angle: this.node.angle - 90 })
      .call(() => {
        this.node.angle = targetAngle;
      })
      .start();
  }

  private applySpriteFrame(type?: TileType): void {
    const sprite = this._sprite ?? (this._sprite = this.getComponent(Sprite) ?? this.addComponent(Sprite));
    if (!sprite) return;

    const resolvedType = type ?? this.visualTypeToString(this.tileType);
    sprite.spriteFrame = this.getSpriteFrameForType(resolvedType);
  }

  private visualTypeToString(t: TileVisualType): TileType {
    switch (t) {
      case TileVisualType.I:
        return "I";
      case TileVisualType.L:
        return "L";
      case TileVisualType.T:
        return "T";
      case TileVisualType.X:
        return "X";
    }
  }

  private getSpriteFrameForType(t: TileType): SpriteFrame | null {
    switch (t) {
      case "I":
        return this.spriteFrameI;
      case "L":
        return this.spriteFrameL;
      case "T":
        return this.spriteFrameT;
      case "X":
        return this.spriteFrameX;
    }
  }
}

import { _decorator, Component, Label, UIOpacity, Color, tween, Vec3, Node } from "cc";
const { ccclass, property } = _decorator;

@ccclass("DamageNumber")
export class DamageNumber extends Component {
  @property(Label)
  public label: Label = null;

  @property
  public duration: number = 0.6;

  @property
  public floatDistance: number = 90;

  @property
  public spawnScale: number = 1.15;

  @property
  public criticalScale: number = 1.4;

  @property(Color)
  public damageColor: Color = new Color(255, 60, 60, 255);

  @property(Color)
  public healColor: Color = new Color(60, 200, 60, 255);

  private _opacity: UIOpacity;

  onLoad() {
    this._opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
    this._opacity.opacity = 255;
  }

  play(value: number, kind: "damage" | "heal" = "damage", critical: boolean = false) {
    if (!this.label) {
      this.label = this.node.getComponent(Label) || (this.node.getComponentsInChildren(Label)[0] || null);
    }
    const sign = kind === "heal" ? "+" : "-";
    if (this.label) {
      this.label.string = `${sign}${Math.floor(Math.max(0, value))}`;
      this.label.color = kind === "heal" ? this.healColor : this.damageColor;
    }
    const s = critical ? this.criticalScale : this.spawnScale;
    this.node.setScale(s, s, 1);
    const start = this.node.position.clone();
    const end = new Vec3(start.x, start.y + this.floatDistance, start.z);
    tween(this.node).to(this.duration, { position: end, scale: new Vec3(1, 1, 1) }).call(() => {
      if (this.node && this.node.isValid) this.node.destroy();
    }).start();
    tween(this._opacity).to(this.duration, { opacity: 0 }).start();
  }
}

export default DamageNumber;

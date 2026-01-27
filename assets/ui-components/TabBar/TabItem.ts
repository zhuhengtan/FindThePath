import { _decorator, Component, Node, Sprite, SpriteFrame, UIOpacity, Label } from "cc";
const { ccclass, property } = _decorator;

@ccclass("TabItem")
export class TabItem extends Component {
  @property(Sprite)
  public icon: Sprite = null;

  @property(Node)
  public bg: Node = null;

  @property(Label)
  public nameLabel: Label = null;

  @property
  key: string = "";

  private _selected: boolean = false;
  private _bgOpacity: UIOpacity | null = null;

  protected onLoad(): void {
    if (this.bg) this._bgOpacity = this.bg.getComponent(UIOpacity) || this.bg.addComponent(UIOpacity);
    if (this._bgOpacity) this._bgOpacity.opacity = this._selected ? 255 : 0;
  }

  public setSelected(selected: boolean): void {
    this._selected = !!selected;
    if (this._bgOpacity) this._bgOpacity.opacity = this._selected ? 255 : 0;
  }

  public onClick(): void {
    this.node.emit("tab-item-click", this);
  }
  public get name(): string { return this.nameLabel?.string || ""; }
}

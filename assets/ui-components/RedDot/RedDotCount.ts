import {
  _decorator,
  Component,
  Node,
  Sprite,
  Label,
  Color,
  UITransform,
  Widget,
} from "cc";

const { ccclass, property } = _decorator;

/**
 * 红点显示组件 - 数量红点样式
 * 
 * 此脚本用于红点 Prefab，处理带数量的红点显示
 */
@ccclass("RedDotCount")
export class RedDotCount extends Component {
  @property(Sprite)
  public bgSprite: Sprite = null;

  @property(Label)
  public countLabel: Label = null;

  protected onLoad(): void {
    // 初始化红点显示
    this._initWidget();
  }

  private _initWidget(): void {
    // 确保有 Widget 组件用于定位到右上角
    let widget = this.node.getComponent(Widget);
    if (!widget) {
      widget = this.node.addComponent(Widget);
    }
    widget.isAlignRight = true;
    widget.isAlignTop = true;
    widget.right = -8;
    widget.top = -8;
  }

  /**
   * 设置显示数量
   */
  public setCount(count: number): void {
    if (this.countLabel) {
      this.countLabel.string = count > 99 ? "99+" : String(count);
    }
  }
}

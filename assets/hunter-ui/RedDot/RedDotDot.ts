import {
  _decorator,
  Component,
  Node,
  Sprite,
  Label,
  Color,
  UITransform,
  Widget,
  SpriteFrame,
} from "cc";

const { ccclass, property } = _decorator;

/**
 * 红点显示组件 - 纯红点样式
 * 
 * 此脚本用于红点 Prefab，处理红点的显示逻辑
 */
@ccclass("RedDotDot")
export class RedDotDot extends Component {
  @property(Sprite)
  public dotSprite: Sprite = null;

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
    widget.right = -5;
    widget.top = -5;
  }
}

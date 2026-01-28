import {
  _decorator,
  Component,
  Sprite,
  Widget,
  tween,
  Tween,
  Vec3,
} from "cc";

const { ccclass, property } = _decorator;

/**
 * 红点显示组件 - 感叹号样式
 * 
 * 此脚本用于红点 Prefab，处理感叹号提示显示
 */
@ccclass("RedDotExcl")
export class RedDotExcl extends Component {
  @property(Sprite)
  public iconSprite: Sprite = null;

  private _breathTween: Tween<any> | null = null;

  protected onLoad(): void {
    // 初始化红点显示
    this._initWidget();
  }

  protected onEnable(): void {
    this._startBreath();
  }

  protected onDisable(): void {
    this._stopBreath();
  }

  protected onDestroy(): void {
    this._stopBreath();
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

  private _startBreath(): void {
    this._stopBreath();
    this.node.setScale(1, 1, 1);
    this._breathTween = tween(this.node)
      .repeatForever(
        tween()
          .to(0.6, { scale: new Vec3(1.12, 1.12, 1) }, { easing: "sineOut" })
          .to(0.6, { scale: new Vec3(1, 1, 1) }, { easing: "sineIn" })
      )
      .start();
  }

  private _stopBreath(): void {
    if (this._breathTween) {
      this._breathTween.stop();
      this._breathTween = null;
    }
    Tween.stopAllByTarget(this.node);
  }
}

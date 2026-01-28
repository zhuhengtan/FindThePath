import {
  _decorator,
  Component,
  Label,
  Node,
  UITransform,
  Button,
  Prefab,
  instantiate,
  CCFloat,
  tween,
  Vec3,
  UIOpacity,
  Layout,
  SpriteFrame,
  Slider,
  Color,
  Sprite,
  BlockInputEvents,
} from "cc";
import { ActionButton } from "./ActionButton";

// Helper to get SoundManager lazily to avoid circular dependency
function getSoundManager(): { instance: { playBtnClick: () => void } } | null {
  return (globalThis as any).SoundManager || null;
}
const { ccclass, property } = _decorator;

export enum ModalActionColor {
  Gray,
  Yellow,
  Red,
  Green,
}

export enum ModalActionTopRightIcon {
  None,
  Ad,
  Lock,
}

export type ModalAction = {
  text: string;
  color?: ModalActionColor;
  topRightIcon?: ModalActionTopRightIcon;
  onClick?: () => void;
  closeOnClick?: boolean;
};

@ccclass("ModalConfirm")
export class ModalConfirm extends Component {
  @property(Layout)
  bgLayout: Layout | null = null;

  @property(Layout)
  contentLayout: Layout | null = null;

  @property(Label)
  titleLabel: Label | null = null;

  @property(Label)
  contentLabel: Label | null = null;

  @property(Node)
  contentContainer: Node | null = null;

  @property(Layout)
  yesOrNoLayout: Layout | null = null;

  @property(Button)
  confirmButton: Button | null = null;

  @property(Button)
  cancelButton: Button | null = null;

  @property(Slider)
  countSlider: Slider | null = null;

  @property(Label)
  countLabel: Label | null = null;

  @property(Label)
  countMinLabel: Label | null = null;

  @property(Label)
  countMaxLabel: Label | null = null;

  @property(Layout)
  actionsLayout: Layout | null = null;

  @property(Prefab)
  actionBtnPrefab: Prefab | null = null;

  @property(SpriteFrame)
  grayBtnSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  yellowBtnSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  redBtnSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  greenBtnSpriteFrame: SpriteFrame | null = null;

  @property(Node)
  mask: Node | null = null;

  @property({ tooltip: "点击遮罩是否可关闭弹窗" })
  maskClosable: boolean = true;

  @property({ type: [CCFloat], tooltip: "内容区域的padding，上右下左" })
  contentPaddingRect: number[] = [20, 20, 20, 20];

  @property(CCFloat)
  maxContentHeight: number = 800; // 内容区域最大高度

  // 生命周期回调
  private beforeShowCallback: (() => void) | null = null;
  private afterShowCallback: ((e: ModalConfirm) => void) | null = null;
  private beforeCloseCallback: (() => void) | null = null;
  private afterCloseCallback: (() => void) | null = null;

  /**
   * 设置弹窗显示前回调
   */
  public setBeforeShowCallback(callback: () => void): void {
    this.beforeShowCallback = callback;
  }

  /**
   * 设置弹窗显示后回调
   */
  public setAfterShowCallback(callback: (e: ModalConfirm) => void): void {
    this.afterShowCallback = callback;
  }

  /**
   * 设置弹窗关闭前回调
   */
  public setBeforeCloseCallback(callback: () => void): void {
    this.beforeCloseCallback = callback;
  }

  /**
   * 设置弹窗关闭后回调
   */
  public setAfterCloseCallback(callback: () => void): void {
    this.afterCloseCallback = callback;
  }

  private onConfirm: (() => void) | null = null;
  private onConfirmWithCount: ((count: number) => void) | null = null;
  private onCancel: (() => void) | null = null;
  private _actionNodes: Node[] = [];
  private _sliderMin: number = 1;
  private _sliderMax: number = 1;
  private _currentCount: number = 1;

  private fixedWidth: number = 602; // 固定的背景宽度
  private fixedHeight: number = 240; // 固定的背景高度

  // 添加一个私有属性来标记是否正在关闭
  private _isClosing: boolean = false;
  private _isShowing: boolean = false;
  private _maskOpacityValue: number = 180; // 默认遮罩透明度

  protected onLoad(): void {
    // 绑定按钮事件
    if (this.confirmButton) {
      this.confirmButton.node.on(
        Button.EventType.CLICK,
        this.handleConfirm,
        this
      );
    }

    if (this.cancelButton) {
      this.cancelButton.node.on(
        Button.EventType.CLICK,
        this.handleCancel,
        this
      );
    }

    // 点击遮罩关闭
    if (this.mask) {
      this.mask.on(
        Node.EventType.TOUCH_END,
        (e) => this.handleCancel(e, true),
        this
      );
    }

    // 绑定滑块事件
    if (this.countSlider) {
      this.countSlider.node.on('slide', this.onSliderChanged, this);
    }
  }

  /**
   * 设置弹窗标题
   */
  public setTitle(title: string): void {
    if (this.titleLabel) {
      this.titleLabel.string = title;
    }
  }

  /**
   * 设置遮罩背景透明度（0-255）
   * @param opacity 透明度值，0为完全透明，255为完全不透明
   */
  public setMaskOpacity(opacity: number): void {
    this._maskOpacityValue = Math.max(0, Math.min(255, opacity));
  }

  /**
   * 设置遮罩背景颜色
   * @param color 颜色值
   */
  public setMaskColor(color: Color): void {
    if (this.mask) {
      const sprite = this.mask.getComponent(Sprite);
      if (sprite) {
        sprite.color = color;
      }
    }
  }

  /**
   * 设置弹窗内容
   */
  public setContent(content: string): void {
    if (!this.contentLabel) {
      return;
    }

    // 设置 Label 的文字内容
    this.contentLabel.string = content;

    // 强制刷新 Label 的渲染数据
    this.contentLabel.updateRenderData(true);
  }

  public setCustomContent(node: Node): void {
    if (!this.contentContainer) {
      return;
    }
    if (this.contentLabel) {
      this.contentLabel.node.active = false;
    }
    console.log(this.contentContainer)
    this.contentContainer.removeAllChildren();
    const bgTransform =
      (this as any).backgroundSprite?.getComponent(UITransform) || null;
    const availableWidth = bgTransform
      ? bgTransform.width -
      (this.contentPaddingRect[1] + this.contentPaddingRect[3])
      : 520;

    const contentUI =
      node.getComponent(UITransform) || node.addComponent(UITransform);
    contentUI.width = availableWidth;

    this.contentContainer.addChild(node);
  }

  /**
   * 设置确认按钮文本
   */
  public setConfirmText(text: string): void {
    if (this.confirmButton) {
      const label = this.confirmButton.getComponentInChildren(Label);
      if (label) {
        label.string = text;
      }
    }
  }

  /**
   * 设置取消按钮文本
   */
  public setCancelText(text: string): void {
    if (this.cancelButton) {
      const label = this.cancelButton.getComponentInChildren(Label);
      if (label) {
        label.string = text;
      }
    }
  }

  /**
   * 设置确认回调
   */
  public setConfirmCallback(callback: () => void): void {
    this.onConfirm = callback;
    this.onConfirmWithCount = null;
  }

  /**
   * 设置带数量的确认回调
   */
  public setConfirmWithCountCallback(callback: (count: number) => void): void {
    this.onConfirmWithCount = callback;
    this.onConfirm = null;
  }

  /**
   * 设置取消回调
   */
  public setCancelCallback(callback: () => void): void {
    this.onCancel = callback;
  }

  public showYesNoLayout(showCancel: boolean): void {
    this.clearActions();
    this.yesOrNoLayout!.node.active = true;
    this.actionsLayout!.node.active = false;
    this.confirmButton!.node.active = true;
    this.cancelButton!.node.active = showCancel;
  }

  private clearActions(): void {
    if (this._actionNodes.length === 0) return;
    this._actionNodes.forEach((n) => {
      if (n && n.isValid) n.destroy();
    });
    this._actionNodes.length = 0;
  }

  public setActions(actions: ModalAction[]): void {
    this.clearActions();

    this.yesOrNoLayout!.node.active = false;
    this.actionsLayout!.node.active = true;
    this.actionsLayout!.node.removeAllChildren();

    // 隐藏滑块和相关标签
    this.hideSlider();

    const layout = this.actionsLayout!;
    const prefab = this.actionBtnPrefab!;

    const pickSpriteFrame = (
      color: ModalActionColor | undefined
    ): SpriteFrame => {
      switch (color) {
        case ModalActionColor.Yellow:
          return this.yellowBtnSpriteFrame!;
        case ModalActionColor.Red:
          return this.redBtnSpriteFrame!;
        case ModalActionColor.Green:
          return this.greenBtnSpriteFrame!;
        case ModalActionColor.Gray:
        default:
          return this.grayBtnSpriteFrame!;
      }
    };

    actions.forEach((action) => {
      const node = instantiate(prefab);
      const btn = node.getComponent(Button)!;
      const actionBtn = node.getComponent(ActionButton)!;

      actionBtn.buttonLabel!.string = action.text;
      actionBtn.buttonSprite!.spriteFrame = pickSpriteFrame(action.color);
      actionBtn.buttonWatchAdSprite!.node.active =
        action.topRightIcon === ModalActionTopRightIcon.Ad;
      actionBtn.buttonLockSprite!.node.active =
        action.topRightIcon === ModalActionTopRightIcon.Lock;

      layout.node.addChild(node);
      this._actionNodes.push(node);

      btn.node.on(
        Button.EventType.CLICK,
        () => {
          getSoundManager()?.instance?.playBtnClick();
          action.onClick?.();
          if (action.closeOnClick !== false) {
            this.close();
          }
        },
        this
      );
    });

    layout.updateLayout();
    this.contentLayout.updateLayout();
    this.bgLayout.updateLayout();
  }

  public adjustButtonsLayout(showCancel: boolean): void {
    const buttonsNode =
      this.confirmButton?.node?.parent || this.cancelButton?.node?.parent;
    const layout = buttonsNode?.getComponent(Layout) || null;
    if (!showCancel) {
      if (layout) layout.enabled = false;
      if (this.confirmButton) {
        const p = this.confirmButton.node.position;
        this.confirmButton.node.setPosition(0, p.y, p.z);
      }
    } else {
      if (layout) {
        layout.enabled = true;
        layout.updateLayout();
      }
    }
  }

  /**
   * 关闭弹窗
   */
  public close(): void {
    if (!this.node.parent || !this.node.isValid) {
      return;
    }

    // 标记节点正在关闭，防止重复调用
    if (this._isClosing) {
      return;
    }

    // 设置关闭标记
    this._isClosing = true;
    // 执行关闭前回调
    if (this.beforeCloseCallback) {
      this.beforeCloseCallback();
    }

    // 获取弹窗内容节点的UIOpacity组件
    const contentNode = this.node;
    if (!contentNode || !contentNode.isValid) return;

    const contentOpacity =
      contentNode.getComponent(UIOpacity) ||
      contentNode.addComponent(UIOpacity);

    // 获取遮罩的UIOpacity组件
    const maskOpacity =
      this.mask?.getComponent(UIOpacity) ||
      (this.mask && this.mask.isValid
        ? this.mask.addComponent(UIOpacity)
        : null);

    // 停止所有可能正在进行的动画
    tween(contentNode).stop();
    if (contentOpacity) tween(contentOpacity).stop();
    if (maskOpacity) tween(maskOpacity).stop();

    // 只对内容节点进行缩放动画，不对整个节点（包括mask）进行缩放
    tween(contentNode)
      .to(0.2, { scale: new Vec3(0.8, 0.8, 1) })
      .start();

    // 内容节点渐隐
    tween(contentOpacity).to(0.3, { opacity: 0 }).start();

    // 遮罩渐隐
    if (maskOpacity) {
      tween(maskOpacity).to(0.3, { opacity: 0 }).start();
    }

    // 使用一次性计时器延迟销毁节点
    const nodeToDestroy = this.node;
    this.unscheduleAllCallbacks(); // 取消所有计时器

    this.scheduleOnce(() => {
      // 执行关闭后回调
      if (this.afterCloseCallback) {
        this.afterCloseCallback();
      }

      // 再次检查节点是否有效，防止重复销毁
      if (nodeToDestroy && nodeToDestroy.isValid) {
        nodeToDestroy.destroy();
      }
    }, 0.3);
  }

  private handleConfirm(): void {
    getSoundManager()?.instance?.playBtnClick();
    if (this.node.isValid) {
      if (this.onConfirmWithCount) {
        this.onConfirmWithCount(this._currentCount);
      } else if (this.onConfirm) {
        this.onConfirm();
      }
    }
    this.close();
  }

  private handleCancel(e, isClickMask = false): void {
    if (isClickMask && !this.maskClosable) {
      return;
    }
    if (!isClickMask) {
      getSoundManager()?.instance?.playBtnClick();
    }
    if (this.onCancel && this.node.isValid) {
      this.onCancel();
    }
    this.close();
  }

  /**
   * 设置滑块范围和初始值
   */
  public setSliderRange(min: number, max: number, initial?: number): void {
    this._sliderMin = Math.max(1, Math.floor(min));
    this._sliderMax = Math.max(this._sliderMin, Math.floor(max));
    this._currentCount = initial !== undefined
      ? Math.max(this._sliderMin, Math.min(this._sliderMax, Math.floor(initial)))
      : this._sliderMin;

    if (this.countSlider) {
      this.countSlider.node.active = true;
      this.countSlider.progress = this._sliderMax > this._sliderMin
        ? (this._currentCount - this._sliderMin) / (this._sliderMax - this._sliderMin)
        : 0;
    }

    this.updateCountLabel();
    this.updateMinMaxLabels();
  }

  /**
   * 隐藏滑块
   */
  public hideSlider(): void {
    if (this.countSlider) {
      this.countSlider.node.active = false;
    }
    if (this.countLabel) {
      this.countLabel.node.active = false;
    }
    if (this.countMinLabel) {
      this.countMinLabel.node.active = false;
    }
    if (this.countMaxLabel) {
      this.countMaxLabel.node.active = false;
    }
  }

  /**
   * 滑块值改变事件
   */
  private onSliderChanged(slider: Slider): void {
    if (!slider) return;

    const progress = slider.progress;
    const range = this._sliderMax - this._sliderMin;
    this._currentCount = Math.round(this._sliderMin + progress * range);
    this._currentCount = Math.max(this._sliderMin, Math.min(this._sliderMax, this._currentCount));

    this.updateCountLabel();
  }

  /**
   * 更新数量标签
   */
  private updateCountLabel(): void {
    if (this.countLabel) {
      this.countLabel.node.active = true;
      this.countLabel.string = `当前：${this._currentCount}`;
    }
  }

  /**
   * 更新最小值和最大值标签
   */
  private updateMinMaxLabels(): void {
    if (this.countMinLabel) {
      this.countMinLabel.node.active = true;
      this.countMinLabel.string = `最少：${this._sliderMin}`;
    }
    if (this.countMaxLabel) {
      this.countMaxLabel.node.active = true;
      this.countMaxLabel.string = `最多：${this._sliderMax}`;
    }
  }

  /**
   * 获取当前选择的数量
   */
  public getCurrentCount(): number {
    return this._currentCount;
  }

  onDestroy() {
    // 取消所有计时器和事件监听
    this.unscheduleAllCallbacks();

    this.clearActions();

    if (this.confirmButton && this.confirmButton.isValid) {
      this.confirmButton.node.off(
        Button.EventType.CLICK,
        this.handleConfirm,
        this
      );
    }

    if (this.cancelButton && this.cancelButton.isValid) {
      this.cancelButton.node.off(
        Button.EventType.CLICK,
        this.handleCancel,
        this
      );
    }

    if (this.mask && this.mask.isValid) {
      this.mask.off(Node.EventType.TOUCH_END, this.handleCancel, this);
    }

    if (this.countSlider && this.countSlider.isValid) {
      this.countSlider.node.off('slide', this.onSliderChanged, this);
    }
  }

  /**
   * 显示弹窗动画
   */
  public show(): void {
    if (this._isShowing) {
      return;
    }

    this._isShowing = true;

    // 执行显示前回调
    if (this.beforeShowCallback) {
      this.beforeShowCallback();
    }

    // 获取弹窗内容节点和遮罩节点
    const contentNode = this.node;
    const maskNode = this.mask;

    // 添加透明度组件
    const contentOpacity =
      contentNode.getComponent(UIOpacity) ||
      contentNode.addComponent(UIOpacity);
    const maskOpacity =
      maskNode?.getComponent(UIOpacity) ||
      (maskNode ? maskNode.addComponent(UIOpacity) : null);

    // 设置初始状态
    contentNode.scale = new Vec3(0.5, 0.5, 1);
    contentOpacity.opacity = 0;

    // 设置遮罩初始透明度，但不缩放遮罩
    if (maskOpacity) {
      maskOpacity.opacity = 0;
    }

    // 内容弹出动画
    tween(contentNode)
      .to(0.2, { scale: new Vec3(1.1, 1.1, 1) })
      .to(0.1, { scale: new Vec3(1, 1, 1) })
      .call(() => {
        // 执行显示后回调
        if (this.afterShowCallback) {
          this.afterShowCallback(this);
        }
        this._isShowing = false;
      })
      .start();

    // 内容透明度动画
    tween(contentOpacity).to(0.2, { opacity: 255 }).start();

    // 遮罩透明度动画，只改变透明度不缩放
    if (maskOpacity) {
      tween(maskOpacity).to(0.3, { opacity: this._maskOpacityValue }).start();
    }
  }
}

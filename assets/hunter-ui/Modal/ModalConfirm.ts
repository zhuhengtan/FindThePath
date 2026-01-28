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
  Layout,
  SpriteFrame,
  Slider,
} from "cc";
import { ActionButton } from "./ActionButton";
import { PopupManager } from "../Popup/PopupManager";

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

  // 遮罩由 PopupManager 管理
  public maskClosable: boolean = true;

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

  // 状态标记
  private _isClosing: boolean = false;

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

    // 遮罩点击事件由 PopupManager 处理

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

  // 遮罩透明度和颜色由 PopupManager 管理，此处不再需要

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
   * 关闭弹窗（由 PopupManager 统一处理动画）
   */
  public close(): void {
    if (!this.node.parent || !this.node.isValid) {
      return;
    }

    if (this._isClosing) {
      return;
    }

    this._isClosing = true;

    if (this.beforeCloseCallback) {
      this.beforeCloseCallback();
    }

    // 使用 PopupManager 关闭，它会处理动画和销毁
    PopupManager.close(this.node);

    if (this.afterCloseCallback) {
      this.afterCloseCallback();
    }
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

    // 遮罩事件由 PopupManager 管理

    if (this.countSlider && this.countSlider.isValid) {
      this.countSlider.node.off('slide', this.onSliderChanged, this);
    }
  }

  /**
   * 显示弹窗（由 ModalConfirmManager 通过 PopupManager 调用，此方法主要用于回调）
   */
  public show(): void {
    if (this.beforeShowCallback) {
      this.beforeShowCallback();
    }

    // 动画由 PopupManager 处理，这里只触发回调
    if (this.afterShowCallback) {
      this.scheduleOnce(() => {
        this.afterShowCallback?.(this);
      }, 0.3);
    }
  }
}

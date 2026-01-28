import {
  _decorator,
  Component,
  Node,
  instantiate,
  Prefab,
  Color,
  director,
} from "cc";
import {
  ModalConfirm,
  ModalAction,
  ModalActionColor,
  ModalActionTopRightIcon,
} from "./ModalConfirm";
const { ccclass, property } = _decorator;

export { ModalActionColor };
export { ModalActionTopRightIcon };

@ccclass("ModalConfirmManager")
export class ModalConfirmManager extends Component {
  private static _instance: ModalConfirmManager | null = null;

  @property(Prefab)
  modalPrefab: Prefab | null = null;

  @property(Node)
  modalContainer: Node | null = null;

  onLoad() {
    if (ModalConfirmManager._instance) {
      this.node.destroy();
      return;
    }

    ModalConfirmManager._instance = this;
    director.getScene()
  }

  public static get instance(): ModalConfirmManager | null {
    return ModalConfirmManager._instance;
  }
  public static getInstance(): ModalConfirmManager | null {
    return ModalConfirmManager._instance;
  }

  public showActions(options: {
    title?: string;
    content?: string;
    customContent?: Node;
    actions: ModalAction[];
    count?: { min: number; max: number; initial?: number } | null;
    maskOpacity?: number;
    maskColor?: Color;
    beforeShow?: () => void;
    afterShow?: (e: ModalConfirm) => void;
    beforeClose?: () => void;
    afterClose?: () => void;
  }) {
    if (!this.modalPrefab || !this.modalContainer) {
      return;
    }

    const modalNode = instantiate(this.modalPrefab);
    const modalComponent = modalNode.getComponent(ModalConfirm);

    if (!modalComponent) {
      return;
    }

    if (options.title) {
      modalComponent.setTitle(options.title);
    }

    if (options.customContent) {
      modalComponent.setCustomContent(options.customContent);
    } else if (options.content) {
      modalComponent.setContent(options.content);
    }

    modalComponent.setActions(options.actions || []);

    // 设置数量选择滑块
    if (options.count) {
      modalComponent.setSliderRange(
        options.count.min,
        options.count.max,
        options.count.initial
      );
    } else {
      modalComponent.hideSlider();
    }

    // 设置遮罩透明度
    if (options.maskOpacity !== undefined) {
      modalComponent.setMaskOpacity(options.maskOpacity);
    }

    // 设置遮罩颜色
    if (options.maskColor) {
      modalComponent.setMaskColor(options.maskColor);
    }

    if (options.beforeShow) {
      modalComponent.setBeforeShowCallback(options.beforeShow);
    }

    if (options.afterShow) {
      modalComponent.setAfterShowCallback(options.afterShow);
    }

    if (options.beforeClose) {
      modalComponent.setBeforeCloseCallback(options.beforeClose);
    }

    if (options.afterClose) {
      modalComponent.setAfterCloseCallback(options.afterClose);
    }

    this.modalContainer.addChild(modalNode);

    modalComponent.show();

    return modalComponent;
  }

  public showModal(options: {
    title?: string;
    content?: string;
    customContent?: Node;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: ((count?: number) => void) | (() => void);
    onCancel?: () => void;
    showCancel?: boolean;
    count?: { min: number; max: number; initial?: number } | null;
    maskOpacity?: number;
    maskColor?: Color;
    beforeShow?: () => void;
    afterShow?: (e: ModalConfirm) => void;
    beforeClose?: () => void;
    afterClose?: () => void;
  }) {
    if (!this.modalPrefab || !this.modalContainer) {
      return;
    }

    const modalNode = instantiate(this.modalPrefab);
    const modalComponent = modalNode.getComponent(ModalConfirm);

    if (!modalComponent) {
      return;
    }

    if (options.title) {
      modalComponent.setTitle(options.title);
    }

    if (options.customContent) {
      modalComponent.setCustomContent(options.customContent);
    } else if (options.content) {
      modalComponent.setContent(options.content);
    }

    if (options.confirmText) {
      modalComponent.setConfirmText(options.confirmText);
    }

    if (options.cancelText) {
      modalComponent.setCancelText(options.cancelText);
    }

    // 设置数量选择滑块
    if (options.count) {
      modalComponent.setSliderRange(
        options.count.min,
        options.count.max,
        options.count.initial
      );
      if (options.onConfirm) {
        modalComponent.setConfirmWithCountCallback(options.onConfirm as (count: number) => void);
      }
    } else {
      modalComponent.hideSlider();
      if (options.onConfirm) {
        modalComponent.setConfirmCallback(options.onConfirm as () => void);
      }
    }

    if (options.onCancel) {
      modalComponent.setCancelCallback(options.onCancel);
    }

    if (options.beforeShow) {
      modalComponent.setBeforeShowCallback(options.beforeShow);
    }

    if (options.afterShow) {
      modalComponent.setAfterShowCallback(options.afterShow);
    }

    if (options.beforeClose) {
      modalComponent.setBeforeCloseCallback(options.beforeClose);
    }

    if (options.afterClose) {
      modalComponent.setAfterCloseCallback(options.afterClose);
    }

    // 设置遮罩透明度
    if (options.maskOpacity !== undefined) {
      modalComponent.setMaskOpacity(options.maskOpacity);
    }

    // 设置遮罩颜色
    if (options.maskColor) {
      modalComponent.setMaskColor(options.maskColor);
    }

    modalComponent.showYesNoLayout(options.showCancel !== false);
    if (modalComponent.cancelButton) {
      modalComponent.cancelButton.node.active = options.showCancel !== false;
    }
    modalComponent.adjustButtonsLayout(options.showCancel !== false);

    this.modalContainer.addChild(modalNode);

    modalComponent.show();

    return modalComponent;
  }

  public confirm(options: {
    content: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    beforeShow?: () => void;
    afterShow?: (e: ModalConfirm) => void;
    beforeClose?: () => void;
    afterClose?: () => void;
  }): void {
    this.showModal({
      title: options.title || "提示",
      content: options.content,
      confirmText: options.confirmText || "确认",
      cancelText: options.cancelText || "取消",
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
      showCancel: true,
      beforeShow: options.beforeShow,
      afterShow: options.afterShow,
      beforeClose: options.beforeClose,
      afterClose: options.afterClose,
    });
  }

  public alert(options: {
    content: string;
    title?: string;
    confirmText?: string;
    onConfirm?: () => void;
    beforeShow?: () => void;
    afterShow?: () => void;
    beforeClose?: () => void;
    afterClose?: () => void;
  }): void {
    this.showModal({
      title: options.title || "提示",
      content: options.content,
      confirmText: options.confirmText || "确认",
      onConfirm: options.onConfirm,
      showCancel: false,
      beforeShow: options.beforeShow,
      afterShow: options.afterShow,
      beforeClose: options.beforeClose,
      afterClose: options.afterClose,
    });
  }
}

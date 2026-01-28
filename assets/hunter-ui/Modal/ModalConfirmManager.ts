import {
  _decorator,
  Node,
  instantiate,
  Prefab,
  assetManager,
} from "cc";
import {
  ModalConfirm,
  ModalAction,
  ModalActionColor,
  ModalActionTopRightIcon,
} from "./ModalConfirm";
import { PopupManager } from "../Popup/PopupManager";

const { ccclass } = _decorator;

export { ModalActionColor };
export { ModalActionTopRightIcon };

/**
 * UI 组件 Bundle 配置
 */
const UI_BUNDLE_NAME = "hunter-ui";
const MODAL_PREFAB_PATH = "Modal/ModalConfirm";

/**
 * ModalConfirm 单例管理器（纯逻辑类，无需挂载到节点）
 *
 * 使用方式：
 * ```typescript
 * import { ModalConfirmManager } from 'db://assets/hunter-ui/Modal/ModalConfirmManager';
 *
 * // 确认弹窗
 * ModalConfirmManager.instance.confirm({
 *   content: '确定删除？',
 *   onConfirm: () => console.log('确认'),
 * });
 *
 * // 提示弹窗
 * ModalConfirmManager.instance.alert({
 *   content: '操作成功',
 * });
 * ```
 */
@ccclass("ModalConfirmManager")
export class ModalConfirmManager {
  private static _instance: ModalConfirmManager | null = null;
  private _modalPrefab: Prefab | null = null;
  private _isInitialized: boolean = false;
  private _initPromise: Promise<void> | null = null;

  private constructor() { }

  public static get instance(): ModalConfirmManager {
    if (!ModalConfirmManager._instance) {
      ModalConfirmManager._instance = new ModalConfirmManager();
    }
    return ModalConfirmManager._instance;
  }

  /**
   * 初始化 ModalConfirmManager
   * 加载 ModalConfirm prefab
   */
  public async init(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this._doInit();
    return this._initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      this._modalPrefab = await this.loadPrefab(UI_BUNDLE_NAME, MODAL_PREFAB_PATH);
      if (!this._modalPrefab) {
        console.error("[ModalConfirmManager] Failed to load ModalConfirm prefab");
        return;
      }

      this._isInitialized = true;
      console.log("[ModalConfirmManager] Initialized successfully");
    } catch (error) {
      console.error("[ModalConfirmManager] Init failed:", error);
      this._initPromise = null;
    }
  }

  private loadPrefab(bundleName: string, prefabPath: string): Promise<Prefab | null> {
    return new Promise((resolve) => {
      let bundle = assetManager.getBundle(bundleName);

      const loadFromBundle = (b: ReturnType<typeof assetManager.getBundle>) => {
        b!.load(prefabPath, Prefab, (err, prefab) => {
          if (err || !prefab) {
            console.error(`[ModalConfirmManager] Failed to load prefab: ${prefabPath}`, err);
            resolve(null);
            return;
          }
          resolve(prefab);
        });
      };

      if (!bundle) {
        assetManager.loadBundle(bundleName, (err, loadedBundle) => {
          if (err || !loadedBundle) {
            console.error(`[ModalConfirmManager] Failed to load bundle: ${bundleName}`, err);
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

  /**
   * 是否已初始化
   */
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public async showActions(options: {
    title?: string;
    content?: string;
    customContent?: Node;
    actions: ModalAction[];
    count?: { min: number; max: number; initial?: number } | null;
    maskOpacity?: number;
    maskClosable?: boolean;
    beforeShow?: () => void;
    afterShow?: (e: ModalConfirm) => void;
    beforeClose?: () => void;
    afterClose?: () => void;
  }): Promise<ModalConfirm | null> {
    await this.init();

    if (!this._modalPrefab) {
      console.warn("[ModalConfirmManager] Not initialized");
      return null;
    }

    const modalNode = instantiate(this._modalPrefab);
    const modalComponent = modalNode.getComponent(ModalConfirm);

    if (!modalComponent) {
      return null;
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

    if (options.count) {
      modalComponent.setSliderRange(
        options.count.min,
        options.count.max,
        options.count.initial
      );
    } else {
      modalComponent.hideSlider();
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

    // 使用 PopupManager 显示
    modalComponent.maskClosable = options.maskClosable ?? true;
    PopupManager.show(modalNode, true, {
      maskClosable: options.maskClosable ?? true,
      maskOpacity: options.maskOpacity ?? 180,
      onMaskClick: () => modalComponent.close(),
      onClose: options.afterClose,
    });

    modalComponent.show();

    return modalComponent;
  }

  public async showModal(options: {
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
    maskClosable?: boolean;
    beforeShow?: () => void;
    afterShow?: (e: ModalConfirm) => void;
    beforeClose?: () => void;
    afterClose?: () => void;
  }): Promise<ModalConfirm | null> {
    await this.init();

    if (!this._modalPrefab) {
      console.warn("[ModalConfirmManager] Not initialized");
      return null;
    }

    const modalNode = instantiate(this._modalPrefab);
    const modalComponent = modalNode.getComponent(ModalConfirm);

    if (!modalComponent) {
      return null;
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

    modalComponent.showYesNoLayout(options.showCancel !== false);
    if (modalComponent.cancelButton) {
      modalComponent.cancelButton.node.active = options.showCancel !== false;
    }
    modalComponent.adjustButtonsLayout(options.showCancel !== false);

    // 使用 PopupManager 显示
    modalComponent.maskClosable = options.maskClosable ?? true;
    PopupManager.show(modalNode, true, {
      maskClosable: options.maskClosable ?? true,
      maskOpacity: options.maskOpacity ?? 180,
      onMaskClick: () => modalComponent.close(),
      onClose: options.afterClose,
    });

    modalComponent.show();

    return modalComponent;
  }

  public async confirm(options: {
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
  }): Promise<void> {
    await this.showModal({
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

  public async alert(options: {
    content: string;
    title?: string;
    confirmText?: string;
    onConfirm?: () => void;
    beforeShow?: () => void;
    afterShow?: () => void;
    beforeClose?: () => void;
    afterClose?: () => void;
  }): Promise<void> {
    await this.showModal({
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

  /**
   * 销毁 ModalConfirmManager
   */
  public destroy(): void {
    this._modalPrefab = null;
    this._isInitialized = false;
    this._initPromise = null;
    ModalConfirmManager._instance = null;
  }
}

// ========== 便捷导出方法 ==========

/**
 * 显示确认弹窗
 */
export async function showConfirm(options: {
  content: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}): Promise<void> {
  return ModalConfirmManager.instance.confirm(options);
}

/**
 * 显示提示弹窗
 */
export async function showAlert(options: {
  content: string;
  title?: string;
  confirmText?: string;
  onConfirm?: () => void;
}): Promise<void> {
  return ModalConfirmManager.instance.alert(options);
}

/**
 * 初始化 ModalConfirmManager（可选，调用 confirm/alert 会自动初始化）
 */
export async function initModalConfirmManager(): Promise<void> {
  return ModalConfirmManager.instance.init();
}

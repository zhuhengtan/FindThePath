import {
  _decorator,
  Node,
  instantiate,
  tween,
  Vec3,
  Prefab,
  UIOpacity,
  assetManager,
} from "cc";
import { Toast } from "./Toast";
import { getPersistUICanvas } from "../ui-utils";

const { ccclass } = _decorator;

/**
 * UI 组件 Bundle 配置
 */
const UI_BUNDLE_NAME = "hunter-ui";
const TOAST_PREFAB_PATH = "Toast/Toast";

/**
 * Toast 单例管理器（纯逻辑类，无需挂载到节点）
 * 
 * 使用方式：
 * ```typescript
 * import { showToast } from 'db://assets/hunter-ui/Toast/ToastManager';
 * 
 * // 显示 Toast
 * showToast('操作成功！');
 * showToast('加载中...', 3);
 * showToast('提交成功', 2, () => console.log('Toast 结束'));
 * ```
 */
@ccclass("ToastManager")
export class ToastManager {
  private static _instance: ToastManager | null = null;
  private _toastPrefab: Prefab | null = null;
  private _containerNode: Node | null = null;
  private _isInitialized: boolean = false;
  private _initPromise: Promise<void> | null = null;

  // Toast 配置
  private readonly flyDistance: number = 100;
  private readonly defaultDuration: number = 2;

  private constructor() { }

  public static get instance(): ToastManager {
    if (!ToastManager._instance) {
      ToastManager._instance = new ToastManager();
    }
    return ToastManager._instance;
  }

  /**
   * 初始化 ToastManager
   * 加载 Toast prefab 并创建容器节点
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
      // 加载 Toast prefab
      this._toastPrefab = await this.loadPrefab(UI_BUNDLE_NAME, TOAST_PREFAB_PATH);
      if (!this._toastPrefab) {
        console.error("[ToastManager] Failed to load Toast prefab");
        return;
      }

      // 创建 Toast 容器节点
      this._containerNode = new Node("ToastContainer");
      const canvas = getPersistUICanvas();
      canvas.node.addChild(this._containerNode);

      this._isInitialized = true;
      console.log("[ToastManager] Initialized successfully");
    } catch (error) {
      console.error("[ToastManager] Init failed:", error);
      this._initPromise = null;
    }
  }

  private loadPrefab(bundleName: string, prefabPath: string): Promise<Prefab | null> {
    return new Promise((resolve) => {
      let bundle = assetManager.getBundle(bundleName);

      const loadFromBundle = (b: ReturnType<typeof assetManager.getBundle>) => {
        b!.load(prefabPath, Prefab, (err, prefab) => {
          if (err || !prefab) {
            console.error(`[ToastManager] Failed to load prefab: ${prefabPath}`, err);
            resolve(null);
            return;
          }
          resolve(prefab);
        });
      };

      if (!bundle) {
        assetManager.loadBundle(bundleName, (err, loadedBundle) => {
          if (err || !loadedBundle) {
            console.error(`[ToastManager] Failed to load bundle: ${bundleName}`, err);
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
   * 显示 Toast
   * @param message 显示的消息
   * @param duration 持续时间（秒），默认 2 秒
   * @param callback 结束后的回调
   */
  public async show(
    message: string,
    duration: number = this.defaultDuration,
    callback?: () => void
  ): Promise<void> {
    await this.init();

    if (!this._toastPrefab || !this._containerNode) {
      console.warn("[ToastManager] Not initialized");
      return;
    }

    const toastNode = instantiate(this._toastPrefab);

    // 确保有 UIOpacity 组件
    let uiOpacity = toastNode.getComponent(UIOpacity);
    if (!uiOpacity) {
      uiOpacity = toastNode.addComponent(UIOpacity);
    }

    // 设置消息
    const toast = toastNode.getComponent(Toast);
    toast?.setMessage(message);

    // 添加到容器
    this._containerNode.addChild(toastNode);
    toastNode.setPosition(new Vec3(0, 0, 0));

    // 飞入动画
    const targetY = toastNode.position.y + this.flyDistance;
    tween(toastNode)
      .to(0.5, { position: new Vec3(0, targetY, 0) })
      .start();

    // 淡出动画
    tween(uiOpacity)
      .delay(duration - 0.5)
      .to(0.5, { opacity: 0 })
      .call(() => {
        toastNode.destroy();
        callback?.();
      })
      .start();
  }

  /**
   * 是否已初始化
   */
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * 销毁 ToastManager
   */
  public destroy(): void {
    if (this._containerNode) {
      this._containerNode.destroy();
      this._containerNode = null;
    }
    this._toastPrefab = null;
    this._isInitialized = false;
    this._initPromise = null;
    ToastManager._instance = null;
  }
}

// ========== 便捷导出方法 ==========

/**
 * 显示 Toast
 * @param message 消息内容
 * @param duration 持续时间（秒），默认 2 秒
 * @param callback 结束回调
 */
export async function showToast(
  message: string,
  duration: number = 2,
  callback?: () => void
): Promise<void> {
  return ToastManager.instance.show(message, duration, callback);
}

/**
 * 初始化 ToastManager（可选，调用 showToast 会自动初始化）
 */
export async function initToastManager(): Promise<void> {
  return ToastManager.instance.init();
}

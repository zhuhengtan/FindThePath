import {
  _decorator,
  Component,
  Node,
  Prefab,
  instantiate,
  assetManager,
  Enum,
  Label,
} from "cc";
import { RedDotManager, RedDotStyle, RedDotState } from "./RedDotManager";

const { ccclass, property } = _decorator;

// 注册枚举给编辑器
Enum(RedDotStyle);

/**
 * UI 组件 Bundle 配置
 */
const UI_BUNDLE_NAME = "hunter-ui";
const PREFAB_PATHS: Record<RedDotStyle, string> = {
  [RedDotStyle.Dot]: "RedDot/RedDotDot",
  [RedDotStyle.Count]: "RedDot/RedDotCount",
  [RedDotStyle.Exclamation]: "RedDot/RedDotExcl",
};

/**
 * 红点 UI 组件
 * 
 * 使用方式：
 * 1. 将此组件挂载到需要显示红点的节点上
 * 2. 在编辑器中设置 path（如 "sign.3days.tab"）和 style
 * 3. 红点会自动响应该 path 及其所有子路径的状态变化
 * 
 * 示例：
 * - path 设置为 "sign.3days.tab"
 * - 当 RedDotManager.setState("sign.3days.tab.day1", true) 被调用时
 * - 该组件会自动显示红点（因为子路径 day1 激活了）
 * 
 * 支持三种样式：
 * - Dot: 纯红点
 * - Count: 带数量的红点（会累计所有子路径的数量）
 * - Exclamation: 感叹号
 */
@ccclass("RedDot")
export class RedDot extends Component {
  @property({ tooltip: "红点路径，使用 . 分隔层级，如 sign.3days.tab" })
  public path: string = "";

  @property({ type: RedDotStyle, tooltip: "红点样式" })
  public style: RedDotStyle = RedDotStyle.Dot;

  @property({ tooltip: "是否在 onLoad 时自动加载红点 Prefab" })
  public autoLoad: boolean = true;

  private _dotNode: Node = null;
  private _countLabel: Label = null;
  private _callback: (state: RedDotState) => void = null;
  private _isLoading: boolean = false;
  private _isLoaded: boolean = false;
  private _manualState: { active: boolean; count?: number } | null = null;

  protected onLoad(): void {
    if (this.autoLoad && this.path) {
      this._loadPrefab();
    }
  }

  protected onEnable(): void {
    // 如果已加载且不是手动模式，重新注册监听
    if (this._isLoaded && this._callback && this._manualState === null) {
      RedDotManager.instance.on(this.path, this._callback);
    }
  }

  protected onDisable(): void {
    // 禁用时取消监听
    if (this._callback) {
      RedDotManager.instance.off(this.path, this._callback);
    }
  }

  protected onDestroy(): void {
    if (this._callback) {
      RedDotManager.instance.off(this.path, this._callback);
      this._callback = null;
    }
    if (this._dotNode && this._dotNode.isValid) {
      this._dotNode.destroy();
      this._dotNode = null;
    }
  }

  /**
   * 手动加载红点（如果 autoLoad 为 false）
   */
  public load(): void {
    if (!this._isLoaded && !this._isLoading && this.path) {
      this._loadPrefab();
    }
  }

  /**
   * 手动刷新红点状态
   */
  public refresh(): void {
    RedDotManager.instance.refresh(this.path);
  }

  /**
   * 设置红点路径（运行时动态切换）
   */
  public setPath(path: string): void {
    if (this.path === path) return;

    // 取消旧的监听
    if (this._callback) {
      RedDotManager.instance.off(this.path, this._callback);
    }

    this.path = path;

    // 注册新的监听
    if (this._callback && this._manualState === null) {
      RedDotManager.instance.on(this.path, this._callback);
    }
  }

  /**
   * 手动设置红点显示状态（不依赖 RedDotManager）
   * 用于需要根据具体实例状态显示红点的场景，如成就列表项
   */
  public setManualActive(active: boolean, count?: number): void {
    // 缓存状态，以便在 prefab 加载完成后应用
    this._manualState = { active, count };

    // 取消自动监听
    if (this._callback) {
      RedDotManager.instance.off(this.path, this._callback);
    }

    if (!this._dotNode || !this._dotNode.isValid) return;

    this._dotNode.active = active;

    if (this._countLabel && count !== undefined) {
      this._countLabel.string = count > 99 ? "99+" : String(count);
    }
  }

  /**
   * 切换回自动模式（使用 RedDotManager 管理状态）
   */
  public setAutoMode(): void {
    if (this._manualState === null) return;

    this._manualState = null;

    if (this._callback && this.path) {
      RedDotManager.instance.on(this.path, this._callback);
    }
  }

  /**
   * 设置红点样式并重新加载
   */
  public setStyle(style: RedDotStyle): void {
    if (this.style === style) return;

    this.style = style;

    // 销毁旧的红点节点
    if (this._dotNode && this._dotNode.isValid) {
      this._dotNode.destroy();
      this._dotNode = null;
    }

    this._isLoaded = false;
    this._countLabel = null;

    // 重新加载
    this._loadPrefab();
  }

  private _loadPrefab(): void {
    if (this._isLoading) return;
    this._isLoading = true;

    const styleAtRequest = this.style;
    const prefabPath = PREFAB_PATHS[styleAtRequest];

    this._loadPrefabFromBundle(UI_BUNDLE_NAME, prefabPath).then((prefab) => {
      this._isLoading = false;

      if (!prefab) {
        console.error(`[RedDot] Failed to load prefab: ${prefabPath}`);
        return;
      }

      if (!this.node || !this.node.isValid) {
        return;
      }

      if (this.style !== styleAtRequest) {
        this._isLoaded = false;
        this._countLabel = null;
        this._loadPrefab();
        return;
      }

      // 实例化并添加到当前节点
      this._dotNode = instantiate(prefab);
      this.node.addChild(this._dotNode);

      // 获取数量 Label（如果是数量样式）
      if (this.style === RedDotStyle.Count) {
        this._countLabel = this._dotNode.getComponentInChildren(Label);
      }

      this._isLoaded = true;

      // 如果有缓存的手动状态，优先应用手动状态
      if (this._manualState !== null) {
        this._dotNode.active = this._manualState.active;
        if (this._countLabel && this._manualState.count !== undefined) {
          this._countLabel.string = this._manualState.count > 99 ? "99+" : String(this._manualState.count);
        }
      } else if (this.path) {
        // 创建回调函数
        this._callback = (state: RedDotState) => {
          this._updateDisplay(state);
        };

        // 注册监听
        RedDotManager.instance.on(this.path, this._callback);
      }
    });
  }

  private _loadPrefabFromBundle(bundleName: string, prefabPath: string): Promise<Prefab | null> {
    return new Promise((resolve) => {
      let bundle = assetManager.getBundle(bundleName);

      const loadFromBundle = (b: ReturnType<typeof assetManager.getBundle>) => {
        b!.load(prefabPath, Prefab, (err, prefab) => {
          if (err || !prefab) {
            console.error(`[RedDot] Failed to load prefab: ${prefabPath}`, err);
            resolve(null);
            return;
          }
          resolve(prefab);
        });
      };

      if (!bundle) {
        assetManager.loadBundle(bundleName, (err, loadedBundle) => {
          if (err || !loadedBundle) {
            console.error(`[RedDot] Failed to load bundle: ${bundleName}`, err);
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

  private _updateDisplay(state: RedDotState): void {
    if (!this._dotNode || !this._dotNode.isValid) return;

    // 设置显示状态
    this._dotNode.active = state.active;

    // 更新数量显示
    if (this._countLabel && state.count !== undefined) {
      this._countLabel.string = state.count > 99 ? "99+" : String(state.count);
    }
  }
}

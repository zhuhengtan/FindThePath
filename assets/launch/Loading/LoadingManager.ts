import {
  _decorator,
  Component,
  director,
} from "cc";
import { Loading } from "./Loading";

const { ccclass, property } = _decorator;

/**
 * Loading 单例管理器
 * 
 * 使用方式：
 * 1. 在 launch-scene 中创建节点，挂载此组件
 * 2. 将 Loading 节点作为子节点，挂载 Loading 组件
 * 3. 此组件会自动设为 persist root node，跨场景保持
 */
@ccclass("LoadingManager")
export class LoadingManager extends Component {
  @property(Loading)
  loading: Loading | null = null;

  private static _instance: LoadingManager | null = null;

  public static get instance(): LoadingManager | null {
    return LoadingManager._instance;
  }

  onLoad() {
    if (LoadingManager._instance && LoadingManager._instance !== this) {
      this.node.destroy();
      return;
    }
    LoadingManager._instance = this;

    // 初始时隐藏 Loading，因为 launch 场景有自己的进度条
    if (this.loading) {
      this.loading.node.active = false;
    }

    // 设为持久节点，跨场景保持
    director.addPersistRootNode(this.node);
  }

  /**
   * 显示加载界面
   * @param showBg 是否显示背景图，默认 true
   */
  public show(showBg: boolean = true): void {
    this.loading?.showLoading(showBg);
  }

  /**
   * 隐藏加载界面
   */
  public hide(): void {
    this.loading?.hideLoading();
  }

  onDestroy() {
    if (LoadingManager._instance === this) {
      LoadingManager._instance = null;
    }
  }
}

/**
 * 便捷方法：显示加载界面
 */
export function showLoading(showBg: boolean = true): void {
  LoadingManager.instance?.show(showBg);
}

/**
 * 便捷方法：隐藏加载界面
 */
export function hideLoading(): void {
  LoadingManager.instance?.hide();
}


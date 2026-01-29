import EventBus from "db://assets/hunter/utils/event-bus";

export enum RedDotEvents {
  RedDotUpdated = "RedDotUpdated",
}

/** 红点样式 */
export enum RedDotStyle {
  /** 纯红点 */
  Dot = "dot",
  /** 数量红点 */
  Count = "count",
  /** 感叹号 */
  Exclamation = "excl",
}

/** 红点状态 */
export interface RedDotState {
  /** 是否激活 */
  active: boolean;
  /** 数量（用于数量红点） */
  count?: number;
}

type RedDotCallback = (state: RedDotState) => void;

/**
 * 红点管理器
 * 
 * 特点：
 * 1. 树形结构：使用 "." 分隔的路径表示层级，如 "sign.3days.tab.day1"
 * 2. 自动聚合：父节点状态由子节点自动计算
 * 3. 事件驱动：状态变化时通知所有监听者（包括监听父路径的组件）
 * 4. 纯字符串路径：无需预定义枚举，直接使用字符串配置
 * 
 * 使用方式：
 * 1. 设置红点状态：RedDotManager.instance.setState("sign.3days.tab.day1", true)
 * 2. 监听红点变化：RedDotManager.instance.on("sign.3days.tab", callback)
 *    - 监听 "sign.3days.tab" 会自动响应所有子路径的变化
 */
export class RedDotManager {
  private static _instance: RedDotManager;

  public static get instance(): RedDotManager {
    if (!this._instance) {
      this._instance = new RedDotManager();
    }
    return this._instance;
  }

  // 红点状态缓存
  private _states: Map<string, RedDotState> = new Map();

  // 注册的回调函数
  private _listeners: Map<string, Set<RedDotCallback>> = new Map();

  // 状态检查函数注册
  private _checkers: Map<string, () => RedDotState | boolean> = new Map();

  /**
   * 注册红点状态检查函数
   * 在调用 refresh 时会自动调用对应的检查函数
   * 
   * @param path 红点路径，如 "sign.daily.normal"
   * @param checker 检查函数，返回 boolean 或 RedDotState
   */
  public registerChecker(path: string, checker: () => RedDotState | boolean): void {
    this._checkers.set(path, checker);
  }

  /**
   * 取消注册检查函数
   */
  public unregisterChecker(path: string): void {
    this._checkers.delete(path);
  }

  /**
   * 获取红点状态
   * 
   * @param path 红点路径
   * @param includeChildren 是否聚合子节点状态（默认 true）
   */
  public getState(path: string, includeChildren: boolean = true): RedDotState {
    if (includeChildren) {
      return this._getAggregatedState(path);
    }
    return this._states.get(path) ?? { active: false };
  }

  /**
   * 是否激活（包含子节点）
   */
  public isActive(path: string): boolean {
    return this.getState(path).active;
  }

  /**
   * 获取数量（包含子节点）
   */
  public getCount(path: string): number {
    return this.getState(path).count ?? 0;
  }

  /**
   * 设置红点状态
   * 
   * @param path 红点路径，如 "sign.3days.tab.day1"
   * @param state 状态（可以是 boolean 或 RedDotState）
   */
  public setState(path: string, state: RedDotState | boolean): void {
    const newState: RedDotState = typeof state === "boolean"
      ? { active: state }
      : state;

    const oldState = this._states.get(path);
    if (oldState?.active === newState.active && oldState?.count === newState.count) {
      return;
    }

    this._states.set(path, newState);

    // 通知当前路径的监听者
    this._notifyListeners(path, newState);

    // 通知所有祖先路径的监听者（它们需要重新聚合状态）
    this._notifyAncestors(path);
  }

  /**
   * 批量设置多个红点状态
   */
  public setStates(states: Record<string, RedDotState | boolean>): void {
    const affectedPaths = new Set<string>();

    for (const [path, state] of Object.entries(states)) {
      const newState: RedDotState = typeof state === "boolean"
        ? { active: state }
        : state;

      const oldState = this._states.get(path);
      if (oldState?.active !== newState.active || oldState?.count !== newState.count) {
        this._states.set(path, newState);
        affectedPaths.add(path);

        // 收集所有需要通知的祖先路径
        let ancestor = this._getParentPath(path);
        while (ancestor) {
          affectedPaths.add(ancestor);
          ancestor = this._getParentPath(ancestor);
        }
      }
    }

    // 批量通知
    affectedPaths.forEach(p => {
      const state = this._getAggregatedState(p);
      this._notifyListeners(p, state);
    });
  }

  /**
   * 清除指定路径的红点状态
   */
  public clearState(path: string): void {
    if (this._states.has(path)) {
      this._states.delete(path);
      this._notifyListeners(path, { active: false });
      this._notifyAncestors(path);
    }
  }

  /**
   * 清除指定路径及其所有子路径的红点状态
   */
  public clearStateWithChildren(path: string): void {
    const prefix = path + ".";
    const pathsToDelete: string[] = [path];

    this._states.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        pathsToDelete.push(key);
      }
    });

    pathsToDelete.forEach(p => {
      this._states.delete(p);
      this._notifyListeners(p, { active: false });
    });

    this._notifyAncestors(path);
  }

  /**
   * 刷新指定红点状态
   * 会调用注册的 checker 函数重新计算状态
   */
  public refresh(path: string): void {
    const checker = this._checkers.get(path);
    if (checker) {
      const result = checker();
      const state: RedDotState = typeof result === "boolean"
        ? { active: result }
        : result;
      this.setState(path, state);
    }

    // 同时刷新所有子节点
    this._refreshChildren(path);
  }

  /**
   * 刷新所有红点
   */
  public refreshAll(): void {
    // 先刷新所有有 checker 的节点
    const affectedPaths = new Set<string>();

    this._checkers.forEach((checker, path) => {
      const result = checker();
      const state: RedDotState = typeof result === "boolean"
        ? { active: result }
        : result;

      const oldState = this._states.get(path);
      if (oldState?.active !== state.active || oldState?.count !== state.count) {
        this._states.set(path, state);
        affectedPaths.add(path);
      }
    });

    // 收集所有需要通知的祖先路径
    const allAncestors = new Set<string>();
    affectedPaths.forEach(path => {
      let ancestor = this._getParentPath(path);
      while (ancestor) {
        allAncestors.add(ancestor);
        ancestor = this._getParentPath(ancestor);
      }
    });

    // 通知所有受影响的路径
    affectedPaths.forEach(path => {
      this._notifyListeners(path, this._states.get(path)!);
    });

    allAncestors.forEach(path => {
      this._notifyListeners(path, this._getAggregatedState(path));
    });
  }

  /**
   * 注册监听
   * 
   * @param path 监听的路径，会自动响应该路径及其所有子路径的变化
   * @param callback 状态变化回调
   */
  public on(path: string, callback: RedDotCallback): void {
    if (!this._listeners.has(path)) {
      this._listeners.set(path, new Set());
    }
    this._listeners.get(path)!.add(callback);

    // 立即通知当前聚合状态
    callback(this._getAggregatedState(path));
  }

  /**
   * 取消监听
   */
  public off(path: string, callback: RedDotCallback): void {
    this._listeners.get(path)?.delete(callback);
  }

  /**
   * 获取所有以指定路径为前缀的子路径
   */
  public getChildPaths(path: string): string[] {
    const prefix = path + ".";
    const children: string[] = [];
    this._states.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        children.push(key);
      }
    });
    return children;
  }

  // === 内部方法 ===

  /**
   * 获取聚合状态（包含自身和所有子节点）
   */
  private _getAggregatedState(path: string): RedDotState {
    const prefix = path + ".";
    let hasActive = false;
    let totalCount = 0;

    // 检查自身状态
    const selfState = this._states.get(path);
    if (selfState?.active) {
      hasActive = true;
      totalCount += selfState.count ?? 1;
    }

    // 聚合所有子节点状态
    this._states.forEach((state, key) => {
      if (key.startsWith(prefix) && state.active) {
        hasActive = true;
        totalCount += state.count ?? 1;
      }
    });

    return {
      active: hasActive,
      count: totalCount > 0 ? totalCount : undefined
    };
  }

  private _notifyListeners(path: string, state: RedDotState): void {
    const listeners = this._listeners.get(path);
    if (listeners) {
      listeners.forEach(cb => cb(state));
    }

    // 同时发送全局事件
    EventBus.emit(RedDotEvents.RedDotUpdated, { path, ...state });
  }

  private _getParentPath(path: string): string | null {
    const lastDotIndex = path.lastIndexOf(".");
    return lastDotIndex > 0 ? path.substring(0, lastDotIndex) : null;
  }

  private _notifyAncestors(path: string): void {
    let ancestor = this._getParentPath(path);
    while (ancestor) {
      const aggregatedState = this._getAggregatedState(ancestor);
      this._notifyListeners(ancestor, aggregatedState);
      ancestor = this._getParentPath(ancestor);
    }
  }

  private _refreshChildren(path: string): void {
    const prefix = path + ".";
    const affectedChildren = new Set<string>();

    this._checkers.forEach((checker, childPath) => {
      if (childPath.startsWith(prefix)) {
        affectedChildren.add(childPath);
        const result = checker();
        const state: RedDotState = typeof result === "boolean"
          ? { active: result }
          : result;

        const oldState = this._states.get(childPath);
        if (oldState?.active !== state.active || oldState?.count !== state.count) {
          this._states.set(childPath, state);
          this._notifyListeners(childPath, state);
        }
      }
    });

    // 通知祖先节点
    if (affectedChildren.size > 0) {
      this._notifyAncestors(path);
    }
  }
}

export default RedDotManager;

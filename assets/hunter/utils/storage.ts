import { _decorator, sys } from "cc";
const { ccclass } = _decorator;

/**
 * 通用本地存储管理器
 * 
 * 使用方式：
 * ```typescript
 * import { StorageManager } from 'db://assets/hunter/utils/storage';
 * 
 * // 静态方法
 * StorageManager.setItem('key', { foo: 'bar' });
 * const data = StorageManager.getItem<{foo: string}>('key');
 * 
 * // 实例方法
 * StorageManager.instance.setItem('key', value);
 * ```
 */
@ccclass("StorageManager")
export class StorageManager {
  private static _instance: StorageManager;

  /** 存储键名前缀，可在子类中覆盖 */
  protected static readonly _prefix: string = "Game_";

  static get instance(): StorageManager {
    if (!this._instance) this._instance = new StorageManager();
    return this._instance;
  }

  // ==================== 基础存储方法 ====================

  /**
   * 设置存储项
   */
  private _setItem<T = any>(key: string, value: T): T {
    try {
      const fullKey = StorageManager._prefix + key;
      const stringValue = JSON.stringify(value);
      sys.localStorage.setItem(fullKey, stringValue);
      return value;
    } catch (error) {
      console.error("[StorageManager] setItem error:", error);
      return value;
    }
  }

  /**
   * 获取存储项
   */
  private _getItem<T>(key: string, defaultValue: T = null): T {
    try {
      const fullKey = StorageManager._prefix + key;
      const value = sys.localStorage.getItem(fullKey);

      if (value === null || value === undefined || value === "") {
        if (defaultValue !== null && defaultValue !== undefined) {
          try {
            sys.localStorage.setItem(fullKey, JSON.stringify(defaultValue));
          } catch { }
        }
        return defaultValue;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error("[StorageManager] getItem error:", error);
      return defaultValue;
    }
  }

  /**
   * 移除存储项
   */
  private _removeItem(key: string): void {
    try {
      const fullKey = StorageManager._prefix + key;
      sys.localStorage.removeItem(fullKey);
    } catch (error) {
      console.error("[StorageManager] removeItem error:", error);
    }
  }

  /**
   * 清除所有带前缀的存储项
   */
  private _clearAll(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sys.localStorage.length; i++) {
        const key = sys.localStorage.key(i);
        if (key?.startsWith(StorageManager._prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        sys.localStorage.removeItem(key);
      });
    } catch (error) {
      console.error("[StorageManager] clearAll error:", error);
    }
  }

  /**
   * 检查存储项是否存在
   */
  private _hasItem(key: string): boolean {
    const fullKey = StorageManager._prefix + key;
    const v = sys.localStorage.getItem(fullKey);
    return v !== null && v !== undefined && v !== "";
  }

  /**
   * 获取所有存储键名（不含前缀）
   */
  private _getAllKeys(): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < sys.localStorage.length; i++) {
        const key = sys.localStorage.key(i);
        if (key?.startsWith(StorageManager._prefix)) {
          keys.push(key.substring(StorageManager._prefix.length));
        }
      }
    } catch (error) {
      console.error("[StorageManager] getAllKeys error:", error);
    }
    return keys;
  }

  // ==================== 静态方法 ====================

  public static setItem<T = any>(key: string, value: T): T {
    return StorageManager.instance._setItem(key, value);
  }

  public static getItem<T>(key: string, defaultValue: T = null): T {
    return StorageManager.instance._getItem<T>(key, defaultValue);
  }

  public static removeItem(key: string): void {
    return StorageManager.instance._removeItem(key);
  }

  public static clearAll(): void {
    return StorageManager.instance._clearAll();
  }

  public static hasItem(key: string): boolean {
    return StorageManager.instance._hasItem(key);
  }

  public static getAllKeys(): string[] {
    return StorageManager.instance._getAllKeys();
  }

  // ==================== 实例方法（便捷访问） ====================

  public setItem<T = any>(key: string, value: T): T {
    return this._setItem<T>(key, value);
  }

  public getItem<T>(key: string, defaultValue: T = null): T {
    return this._getItem<T>(key, defaultValue);
  }

  public removeItem(key: string): void {
    this._removeItem(key);
  }

  public clearAll(): void {
    this._clearAll();
  }

  public hasItem(key: string): boolean {
    return this._hasItem(key);
  }

  public getAllKeys(): string[] {
    return this._getAllKeys();
  }
}

export default StorageManager;

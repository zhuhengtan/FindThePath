/**
 * 通知队列管理器
 * 用于管理任务、成就等通知的显示队列，确保一次只显示一个通知
 */
export class NotificationQueueManager {
  private static _instance: NotificationQueueManager;

  /** 通知队列 */
  private _queue: Array<{
    type: 'quest' | 'achievement';
    data: any;
    callback: (data: any) => void;
  }> = [];

  /** 是否正在显示通知 */
  private _isShowing: boolean = false;

  static get instance(): NotificationQueueManager {
    if (!this._instance) {
      this._instance = new NotificationQueueManager();
    }
    return this._instance;
  }

  /** 当前是否正在显示通知 */
  get isShowing(): boolean {
    return this._isShowing;
  }

  /** 队列中还有多少通知 */
  get queueLength(): number {
    return this._queue.length;
  }

  /**
   * 添加通知到队列
   * @param type 通知类型
   * @param data 通知数据
   * @param callback 显示回调函数，会传入 data
   */
  enqueue(type: 'quest' | 'achievement', data: any, callback: (data: any) => void): void {
    this._queue.push({ type, data, callback });
    console.log(`[NotificationQueue] Enqueued ${type} notification, queue length: ${this._queue.length}`);
    this.tryShowNext();
  }

  /**
   * 尝试显示下一个通知
   */
  private tryShowNext(): void {
    if (this._isShowing || this._queue.length === 0) {
      return;
    }

    const notification = this._queue.shift()!;
    this._isShowing = true;
    console.log(`[NotificationQueue] Showing ${notification.type} notification, remaining: ${this._queue.length}`);
    notification.callback(notification.data);
  }

  /**
   * 通知显示完成，继续显示下一个
   */
  notifyComplete(): void {
    this._isShowing = false;
    console.log(`[NotificationQueue] Notification complete, remaining: ${this._queue.length}`);
    this.tryShowNext();
  }

  /**
   * 清空队列
   */
  clear(): void {
    this._queue = [];
    this._isShowing = false;
  }
}

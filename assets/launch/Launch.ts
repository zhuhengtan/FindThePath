import { _decorator, Component, ProgressBar, director, assetManager, Label } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 启动场景加载器
 * 负责加载核心分包并显示加载进度，加载完成后自动进入 main 场景
 */
@ccclass('Launch')
export class Launch extends Component {
  @property(ProgressBar)
  progressBar: ProgressBar = null;

  @property(Label)
  progressLabel: Label = null;

  @property(Label)
  tipLabel: Label = null;

  // 启动时需要加载的分包列表
  private _bundlesToLoad: string[] = ['hunter-ui', 'main-game'];
  private _loadedCount: number = 0;
  private _totalBundles: number = 0;

  start() {
    this._totalBundles = this._bundlesToLoad.length;
    this.updateProgress(0, '初始化中...');

    // 延迟一帧开始加载，确保 UI 渲染完成
    this.scheduleOnce(() => {
      this.loadBundles();
    }, 0.1);
  }

  /**
   * 加载所有分包
   */
  async loadBundles() {
    try {
      for (let i = 0; i < this._bundlesToLoad.length; i++) {
        const bundleName = this._bundlesToLoad[i];
        this.updateProgress(i / this._totalBundles, `加载 ${bundleName}...`);
        await this.loadBundle(bundleName);
        this._loadedCount++;
      }

      await this.preloadScene('main');

      // 所有分包加载完成
      this.updateProgress(1, '加载完成！');

      // 延迟一小段时间让用户看到完成提示
      this.scheduleOnce(() => {
        this.enterGame();
      }, 0.3);

    } catch (error) {
      console.error('分包加载失败:', error);
      this.updateProgress(this._loadedCount / this._totalBundles, '加载失败，请重试');

      // 可以在这里添加重试逻辑
      this.scheduleOnce(() => {
        this.loadBundles();
      }, 2);
    }
  }

  /**
   * 加载单个分包
   */
  loadBundle(bundleName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      assetManager.loadBundle(bundleName, (err, bundle) => {
        if (err) {
          console.error(`加载分包 ${bundleName} 失败:`, err);
          reject(err);
          return;
        }
        console.log(`分包 ${bundleName} 加载成功`);
        resolve();
      });
    });
  }

  private preloadScene(sceneName: string): Promise<void> {
    return new Promise((resolve) => {
      director.preloadScene(sceneName, undefined, () => {
        resolve();
      });
    });
  }

  /**
   * 更新进度显示
   */
  updateProgress(progress: number, tip: string = '') {
    if (this.progressBar) {
      this.progressBar.progress = progress;
    }

    if (this.progressLabel) {
      this.progressLabel.string = `${Math.floor(progress * 100)}%`;
    }

    if (this.tipLabel && tip) {
      this.tipLabel.string = tip;
    }
  }

  /**
   * 进入游戏
   */
  enterGame() {
    console.log('进入 main 场景');
    director.loadScene('main', (err) => {
      if (err) {
        console.error('加载 main 场景失败:', err);
        this.updateProgress(1, '场景加载失败');
      }
    });
  }
}

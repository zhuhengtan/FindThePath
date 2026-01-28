import {
  _decorator,
  Component,
  director,
  Director,
  Node,
  CCInteger,
  tween,
  Vec3,
  Sprite,
  UITransform,
  view,
} from "cc";

const { ccclass, property } = _decorator;

@ccclass("Loading")
export class Loading extends Component {
  @property(Node)
  loadingBgNode: Node;

  @property([Node])
  dots: Node[] = [];

  @property(CCInteger)
  minLoadTime: number = 500;

  @property(CCInteger)
  dotAnimationDelay: number = 60; // 点动画之间的延迟时间(毫秒)

  @property(CCInteger)
  dotAnimationDuration: number = 300; // 单个点的动画持续时间(毫秒)

  private _loadingTime: number = 0;
  private _isAnimating: boolean = false;
  private _originalPositions: Map<number, Vec3> = new Map(); // 存储每个点的初始位置
  private _showBg: boolean = true;

  onLoad() {
    director.on(
      Director.EVENT_BEFORE_SCENE_LOADING,
      this.beforeSceneLoading,
      this
    );
    director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.afterSceneLaunch, this);

    // 初始时隐藏加载界面
    this.node.active = false;
  }

  beforeSceneLoading(e) {
    // 场景切换时必须显示背景
    this.showLoading(true);
  }

  afterSceneLaunch(e) {
    const current = new Date().valueOf();
    const elapsedTime = current - this._loadingTime;

    if (elapsedTime < this.minLoadTime) {
      // 还需要等待的时间
      const remainingTime = this.minLoadTime - elapsedTime;
      setTimeout(() => {
        this.hideLoading();
      }, remainingTime);
    } else {
      this.hideLoading();
    }
  }

  /**
   * 显示加载界面
   * @param showBg 是否显示背景图，true 显示，false 隐藏
   */
  public showLoading(showBg: boolean = true) {
    this._showBg = showBg;
    this._loadingTime = new Date().valueOf();

    // 先重置所有点的状态
    this.resetDotsState();

    // 控制背景 Sprite 组件
    if (this.loadingBgNode) {
      const sprite = this.loadingBgNode.getComponent(Sprite);
      if (sprite) {
        sprite.enabled = showBg;

        // 如果显示背景，根据图片尺寸调整大小以铺满屏幕
        if (showBg && sprite.spriteFrame) {
          this.adjustBgToFillScreen();
        }
      }
    }

    this.node.active = true;

    // 播放点的动画
    this.playDotsAnimation();
  }

  /**
   * 隐藏加载界面
   */
  public hideLoading() {
    this._loadingTime = 0;
    this.stopDotsAnimation();
    this.node.active = false;
  }

  /**
   * 调整背景大小以铺满屏幕
   * 使用 cover 模式（保持宽高比，完全覆盖屏幕）
   */
  private adjustBgToFillScreen() {
    if (!this.loadingBgNode) return;

    const sprite = this.loadingBgNode.getComponent(Sprite);
    const uiTransform = this.loadingBgNode.getComponent(UITransform);

    if (!sprite || !sprite.spriteFrame || !uiTransform) return;

    // 获取图片原始尺寸
    const originalSize = sprite.spriteFrame.originalSize;
    const imgWidth = originalSize.width;
    const imgHeight = originalSize.height;

    if (imgWidth <= 0 || imgHeight <= 0) return;

    // 获取屏幕尺寸
    const visibleSize = view.getVisibleSize();
    const screenWidth = visibleSize.width;
    const screenHeight = visibleSize.height;

    // 计算 cover 模式的缩放比例（取较大值以覆盖屏幕）
    const scaleX = screenWidth / imgWidth;
    const scaleY = screenHeight / imgHeight;
    const scale = Math.max(scaleX, scaleY);

    // 设置 UITransform 的 contentSize
    uiTransform.setContentSize(imgWidth * scale, imgHeight * scale);
  }

  /**
   * 使用 Tween 动画创建波浪效果
   */
  private playDotsAnimation() {
    // 停止所有可能正在播放的动画
    this.stopDotsAnimation();

    if (this.dots.length === 0) return;

    this._isAnimating = true;

    // 计算完整波浪周期：最后一个点开始的时间 + 动画持续时间
    const waveCycleDuration = (this.dots.length - 1) * this.dotAnimationDelay + this.dotAnimationDuration;

    // 创建波浪动画循环
    const playWaveCycle = () => {
      if (!this._isAnimating || !this.node.active) {
        return;
      }

      // 为每个点创建延迟的缩放动画
      this.dots.forEach((dot, index) => {
        if (!dot) return;

        // 保存初始位置（只在第一次保存）
        if (!this._originalPositions.has(index)) {
          this._originalPositions.set(index, dot.position.clone());
        }

        const delay = index * this.dotAnimationDelay;

        // 延迟后播放缩放和跳动动画
        setTimeout(() => {
          if (!this._isAnimating || !this.node.active) {
            return;
          }

          // 获取初始位置
          const originalPos = this._originalPositions.get(index) || dot.position;

          // 重置缩放和位置
          dot.setScale(new Vec3(1, 1, 1));

          // 创建弹跳效果：同时进行缩放和上下跳动
          tween(dot)
            .to(
              this.dotAnimationDuration / 1000 / 2,
              {
                scale: new Vec3(1.3, 1.3, 1),
                position: new Vec3(originalPos.x, originalPos.y + 15, originalPos.z)
              },
              { easing: 'sineOut' }
            )
            .to(
              this.dotAnimationDuration / 1000 / 2,
              {
                scale: new Vec3(1, 1, 1),
                position: originalPos.clone()
              },
              { easing: 'sineIn' }
            )
            .start();
        }, delay);
      });

      // 在完整波浪周期后重新开始
      setTimeout(() => {
        playWaveCycle();
      }, waveCycleDuration);
    };

    // 开始第一个波浪周期
    playWaveCycle();
  }

  /**
   * 重置所有点的状态到初始位置和缩放
   */
  private resetDotsState() {
    this.dots.forEach((dot, index) => {
      if (dot) {
        // 停止任何正在进行的 Tween
        tween(dot).stop();

        // 重置缩放
        dot.setScale(new Vec3(1, 1, 1));

        // 如果有保存的初始位置，恢复到初始位置
        const originalPos = this._originalPositions.get(index);
        if (originalPos) {
          dot.setPosition(originalPos.clone());
        }
      }
    });
  }

  /**
   * 停止所有点的动画
   */
  private stopDotsAnimation() {
    this._isAnimating = false;

    // 停止所有 Tween 动画并重置缩放和位置
    this.dots.forEach((dot, index) => {
      if (dot) {
        tween(dot).stop();
        dot.setScale(new Vec3(1, 1, 1));

        // 恢复到初始位置
        const originalPos = this._originalPositions.get(index);
        if (originalPos) {
          dot.setPosition(originalPos.clone());
        }
      }
    });
  }

  onDestroy() {
    // 停止动画
    this.stopDotsAnimation();

    // 移除事件监听
    director.off(
      Director.EVENT_BEFORE_SCENE_LOADING,
      this.beforeSceneLoading,
      this
    );
    director.off(
      Director.EVENT_AFTER_SCENE_LAUNCH,
      this.afterSceneLaunch,
      this
    );
  }
}

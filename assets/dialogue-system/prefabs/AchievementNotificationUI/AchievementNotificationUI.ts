import { _decorator, Component, Node, Label, Sprite, UIOpacity, tween, Color, Vec3 } from "cc";
import { AchievementRarity } from "../../type";
import { NotificationQueueManager } from "../../scripts/NotificationQueueManager";
const { ccclass, property } = _decorator;

/** 成就稀有度颜色配置 */
const RARITY_COLORS: Record<string, Color> = {
  common: new Color(200, 200, 200, 255),     // 灰白色 - 普通
  rare: new Color(30, 144, 255, 255),        // 道奇蓝 - 稀有
  epic: new Color(148, 0, 211, 255),         // 紫罗兰 - 史诗
  legendary: new Color(255, 165, 0, 255),    // 橙色 - 传说
};

/** 成就稀有度名称配置 */
const RARITY_NAMES: Record<string, string> = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};

/** 成就稀有度额外显示时间 */
const RARITY_EXTRA_DURATION: Record<string, number> = {
  common: 0,
  rare: 0.5,
  epic: 1,
  legendary: 1.5,
};

@ccclass("AchievementNotificationUI")
export class AchievementNotificationUI extends Component {
  @property(Label)
  public titleLabel: Label = null;

  @property(Label)
  public descriptionLabel: Label = null;

  @property(Label)
  public statusLabel: Label = null;

  @property(Label)
  public rarityLabel: Label = null;

  @property(Label)
  public pointsLabel: Label = null;

  @property(Sprite)
  public iconSprite: Sprite = null;

  @property
  public displayDuration: number = 2;

  @property
  public fadeInDuration: number = 0.3;

  @property
  public fadeOutDuration: number = 0.3;

  @property
  public expandDuration: number = 0.25;

  /** 当前成就的稀有度（用于计算显示时长） */
  private _currentRarity: string = "common";

  /**
   * 显示成就解锁通知（加入共享队列）
   * @param achievement 成就数据
   * @param status 状态类型：unlocked=成就解锁, stage=阶段完成, claimed=奖励领取
   * @param stageInfo 阶段信息（可选，用于阶段型成就）
   */
  public show(
    achievement: any,
    status: "unlocked" | "stage" | "claimed" = "unlocked",
    stageInfo?: { stageName?: string; stageIndex?: number }
  ): void {
    console.log("[AchievementNotificationUI] show:", achievement, status, stageInfo);

    // 先隐藏节点，等待轮到自己时再显示
    this.node.active = false;

    // 加入共享队列
    NotificationQueueManager.instance.enqueue('achievement', { achievement, status, stageInfo, ui: this }, (data) => {
      this.showInternal(data.achievement, data.status, data.stageInfo);
    });
  }

  /**
   * 内部显示方法 - 实际执行动画
   */
  private showInternal(
    achievement: any,
    status: "unlocked" | "stage" | "claimed",
    stageInfo?: { stageName?: string; stageIndex?: number }
  ): void {
    // 设置成就标题
    if (this.titleLabel) {
      const title = `获得成就：${achievement.title || achievement.name}`;
      if (title) {
        this.titleLabel.string = title;
      } else {
        this.titleLabel.node.active = false;
      }
    }

    // 设置成就描述
    if (this.descriptionLabel) {
      if (achievement.description) {
        this.descriptionLabel.string = achievement.description;
      } else {
        this.descriptionLabel.node.active = false;
      }
    }

    // 设置状态文本
    if (this.statusLabel) {
      switch (status) {
        case "unlocked":
          this.statusLabel.string = "🏆 成就解锁";
          break;
        case "stage":
          const stageName = stageInfo?.stageName || `阶段 ${stageInfo?.stageIndex || 1}`;
          this.statusLabel.string = `🎯 ${stageName} 完成`;
          break;
        case "claimed":
          this.statusLabel.string = "🎁 奖励已领取";
          break;
      }
    }

    // 设置稀有度
    const rarity = achievement.rarity || "common";
    this._currentRarity = rarity;
    if (this.rarityLabel) {
      this.rarityLabel.string = RARITY_NAMES[rarity] || "普通";
      this.rarityLabel.color = RARITY_COLORS[rarity] || RARITY_COLORS.common;
    }

    // 设置标题颜色（可选，根据稀有度）
    if (this.titleLabel && RARITY_COLORS[rarity]) {
      this.titleLabel.color = RARITY_COLORS[rarity];
    }

    // 设置成就点数
    if (this.pointsLabel) {
      const points = achievement.points || 0;
      if (points > 0) {
        this.pointsLabel.string = `+${points} 成就点`;
      } else {
        this.pointsLabel.node.active = false;
      }
    }

    // 根据稀有度调整显示时长
    const extraDuration = RARITY_EXTRA_DURATION[rarity] || 0;
    const totalDisplayDuration = this.displayDuration + extraDuration;

    // 设置初始状态 - 使用水平缩放实现展开效果
    const op = this.getOpacity();
    op.opacity = 255;

    // 设置初始缩放为 X=0（水平收起状态）
    this.node.setScale(new Vec3(0, 1, 1));
    this.node.active = true;

    // 横向展开效果：从 scaleX=0 展开到 scaleX=1
    tween(this.node)
      .to(this.expandDuration, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .call(() => {
        this.startDisplayTimer(totalDisplayDuration);
      })
      .start();
  }

  /**
   * 开始显示计时器，显示完成后收起并处理下一个
   */
  private startDisplayTimer(displayDuration: number): void {
    // 等待显示时间后，收起并销毁
    tween(this.node)
      .delay(displayDuration)
      .to(this.expandDuration, { scale: new Vec3(0, 1, 1) }, { easing: 'backIn' })
      .call(() => {
        this.onNotificationComplete();
      })
      .start();
  }

  /**
   * 通知完成，销毁并通知队列管理器
   */
  private onNotificationComplete(): void {
    if (this.node && this.node.isValid) {
      this.node.destroy();
    }

    // 延迟一小段时间后通知队列管理器，让视觉效果更清晰
    setTimeout(() => {
      NotificationQueueManager.instance.notifyComplete();
    }, 100);
  }

  private getOpacity(): UIOpacity {
    let op = this.node.getComponent(UIOpacity);
    if (!op) op = this.node.addComponent(UIOpacity);
    return op;
  }
}

export default AchievementNotificationUI;

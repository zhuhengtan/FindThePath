import { _decorator, Component, Node, Label, UIOpacity, tween, Sprite, Color, Vec3 } from "cc";
import { NotificationQueueManager } from "../../scripts/NotificationQueueManager";
const { ccclass, property } = _decorator;

@ccclass("QuestNotificationUI")
export class QuestNotificationUI extends Component {
  @property(Label)
  public titleLabel: Label = null;

  @property(Label)
  public descriptionLabel: Label = null;

  @property(Label)
  public statusLabel: Label = null;

  @property(Sprite)
  public backgroundSprite: Sprite = null;

  @property
  public displayDuration: number = 2;

  @property
  public fadeInDuration: number = 0.3;

  @property
  public fadeOutDuration: number = 0.3;

  @property
  public expandDuration: number = 0.25;

  /** 任务接受时的背景颜色（金色） */
  @property
  public acceptedColor: Color = new Color(255, 200, 80, 220);

  /** 任务完成时的背景颜色（绿色） */
  @property
  public completedColor: Color = new Color(80, 200, 120, 220);

  /**
   * 显示任务通知
   * 加入共享通知队列，等待轮到自己时显示
   */
  public show(quest: any, status: "accepted" | "completed"): void {
    // 先隐藏节点，等待轮到自己时再显示
    this.node.active = false;

    // 加入共享队列
    NotificationQueueManager.instance.enqueue('quest', { quest, status, ui: this }, (data) => {
      this.showInternal(data.quest, data.status);
    });
  }

  /**
   * 内部显示方法 - 实际执行动画
   */
  private showInternal(quest: any, status: "accepted" | "completed"): void {
    // 设置任务信息
    if (this.titleLabel && (quest.title || quest.name)) {
      this.titleLabel.string = quest.title || quest.name;
    } else if (this.titleLabel) {
      this.titleLabel.node.active = false;
    }

    if (this.descriptionLabel && quest.description) {
      this.descriptionLabel.string = quest.description;
    }

    if (this.statusLabel) {
      this.statusLabel.string = status === "accepted" ? "新任务" : "任务完成";
    }

    // 根据状态设置背景颜色
    if (this.backgroundSprite) {
      this.backgroundSprite.color = status === "accepted"
        ? this.acceptedColor
        : this.completedColor;
    }

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
        this.startDisplayTimer();
      })
      .start();
  }

  /**
   * 开始显示计时器，显示完成后收起并处理下一个
   */
  private startDisplayTimer(): void {
    // 等待显示时间后，收起并销毁
    tween(this.node)
      .delay(this.displayDuration)
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

export default QuestNotificationUI;

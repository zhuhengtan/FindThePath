import EventBus from "db://assets/hunter/utils/event-bus";
import { ConfigLoader } from "db://assets/hunter/utils/config-loader";
import { QuestEvents } from "../type";
import { Quest } from "./entities/Quest";
import { QuestReward, IQuestReward } from "./entities/QuestReward";

export interface IActivityRewardConfig {
  /** 阶段ID */
  id: string;
  /** 所需贡献值点数 */
  requiredPoints: number;
  /** 奖励列表 */
  rewards: IQuestReward[];
  /** 宝箱物品ID（用于获取宝箱图标等配置） */
  chestItemId?: number;
  /** 描述 */
  description?: string;
}

export interface IDailyActivitySaveData {
  /** 当前贡献值点数 */
  currentPoints: number;
  /** 已领取的阶段奖励ID列表 */
  claimedRewards: string[];
  /** 上次重置时间戳 */
  lastResetTime: number;
}

export class DailyActivityManager {
  private static _instance: DailyActivityManager;

  /** 当前贡献值点数 */
  private _currentPoints: number = 0;

  /** 已领取的阶段奖励ID列表 */
  private _claimedRewards: Set<string> = new Set();

  /** 上次重置时间戳 */
  private _lastResetTime: number = 0;

  /** 贡献值阶段奖励配置 */
  private _rewardConfigs: IActivityRewardConfig[] = [];

  /** 是否已初始化 */
  private _initialized: boolean = false;

  static get instance(): DailyActivityManager {
    if (!this._instance) this._instance = new DailyActivityManager();
    return this._instance;
  }

  /** 当前贡献值点数 */
  get currentPoints(): number {
    return this._currentPoints;
  }

  /** 最大贡献值点数（最后一个阶段的所需点数） */
  get maxPoints(): number {
    if (this._rewardConfigs.length === 0) return 100;
    return this._rewardConfigs[this._rewardConfigs.length - 1].requiredPoints;
  }

  /** 贡献值进度百分比 (0-100) */
  get progressPercent(): number {
    if (this.maxPoints === 0) return 100;
    return Math.min(100, Math.floor((this._currentPoints / this.maxPoints) * 100));
  }

  /** 初始化 */
  init(): void {
    if (this._initialized) return;

    this.loadRewardConfigs();
    this.registerEventListeners();
    this._initialized = true;
  }

  /** 加载阶段奖励配置 */
  private loadRewardConfigs(): void {
    const configs = ConfigLoader.instance.getConfigsByTableName("daily_activity_reward") as any[];
    if (!configs) {
      // 使用默认配置
      this._rewardConfigs = this.getDefaultRewardConfigs();
      return;
    }

    // 获取 item 表用于查找宝箱物品的奖励配置
    const itemConfigs = ConfigLoader.instance.getConfigsByTableName("item") as any[];

    this._rewardConfigs = configs.map(config => {
      const chestItemId = config.chestItemId ?? 0;
      let rewards: IQuestReward[] = [];
      let description = "";

      // 从 item 表中获取宝箱的奖励和描述
      if (chestItemId && itemConfigs) {
        const chestItem = itemConfigs.find(item =>
          item.id === chestItemId || item.id === String(chestItemId)
        );
        if (chestItem) {
          description = chestItem.description || "";
          // 从 extra.rewards 中解析奖励
          if (chestItem.extra?.rewards) {
            rewards = QuestReward.parseRewards(chestItem.extra.rewards);
          }
        }
      }

      return {
        id: config.id,
        requiredPoints: config.requiredPoints ?? 0,
        rewards,
        chestItemId,
        description,
      };
    });

    // 按所需点数排序
    this._rewardConfigs.sort((a, b) => a.requiredPoints - b.requiredPoints);
  }

  /** 获取默认阶段奖励配置 */
  private getDefaultRewardConfigs(): IActivityRewardConfig[] {
    return [
      { id: "activity_20", requiredPoints: 20, rewards: [], chestItemId: 1001, description: "贡献值达到20" },
      { id: "activity_40", requiredPoints: 40, rewards: [], chestItemId: 1002, description: "贡献值达到40" },
      { id: "activity_60", requiredPoints: 60, rewards: [], chestItemId: 1003, description: "贡献值达到60" },
      { id: "activity_80", requiredPoints: 80, rewards: [], chestItemId: 1004, description: "贡献值达到80" },
      { id: "activity_100", requiredPoints: 100, rewards: [], chestItemId: 1005, description: "贡献值达到100" },
    ];
  }

  /** 事件处理器引用（用于精确移除监听器） */
  private _onQuestCompletedHandler = (quest: Quest) => {
    this.onQuestCompleted(quest);
  };

  private _onDailyQuestsResetHandler = () => {
    this.reset();
  };

  /** 注册事件监听器 */
  private registerEventListeners(): void {
    // 监听任务完成事件
    EventBus.on(QuestEvents.QuestCompleted, this._onQuestCompletedHandler);

    // 监听每日任务重置事件
    EventBus.on(QuestEvents.DailyQuestsReset, this._onDailyQuestsResetHandler);
  }

  /** 销毁 */
  destroy(): void {
    // 使用 detach 精确移除本管理器的监听器，避免影响其他组件
    EventBus.detach(QuestEvents.QuestCompleted, this._onQuestCompletedHandler);
    EventBus.detach(QuestEvents.DailyQuestsReset, this._onDailyQuestsResetHandler);
    this._initialized = false;
  }

  /** 任务完成时处理 */
  private onQuestCompleted(quest: Quest): void {
    // 只处理每日任务
    if (!quest.isDaily) return;

    // 添加贡献值点数
    if (quest.activityPoints > 0) {
      this.addPoints(quest.activityPoints);
    }
  }

  /** 添加贡献值点数 */
  addPoints(points: number): void {
    if (points <= 0) return;

    const oldPoints = this._currentPoints;
    this._currentPoints += points;

    // 发送贡献值更新事件
    EventBus.emit(QuestEvents.ActivityPointsUpdated, this._currentPoints, oldPoints, points);

    // 检查是否有新的阶段奖励可领取
    this.checkAvailableRewards();
  }

  /** 检查可领取的阶段奖励 */
  private checkAvailableRewards(): void {
    for (const config of this._rewardConfigs) {
      if (this._currentPoints >= config.requiredPoints && !this._claimedRewards.has(config.id)) {
        // 发送阶段奖励可领取事件
        EventBus.emit(QuestEvents.ActivityRewardAvailable, config);
      }
    }
  }

  /** 获取所有阶段奖励配置 */
  getRewardConfigs(): IActivityRewardConfig[] {
    return [...this._rewardConfigs];
  }

  /** 获取指定阶段奖励配置 */
  getRewardConfig(rewardId: string): IActivityRewardConfig | undefined {
    return this._rewardConfigs.find(c => c.id === rewardId);
  }

  /** 检查阶段奖励是否可领取 */
  canClaimReward(rewardId: string): boolean {
    const config = this.getRewardConfig(rewardId);
    if (!config) return false;
    if (this._claimedRewards.has(rewardId)) return false;
    return this._currentPoints >= config.requiredPoints;
  }

  /** 检查阶段奖励是否已领取 */
  isRewardClaimed(rewardId: string): boolean {
    return this._claimedRewards.has(rewardId);
  }

  /** 领取阶段奖励 */
  claimReward(rewardId: string): IQuestReward[] | null {
    if (!this.canClaimReward(rewardId)) return null;

    const config = this.getRewardConfig(rewardId);
    if (!config) return null;

    // 标记为已领取
    this._claimedRewards.add(rewardId);

    // 发送奖励领取事件
    EventBus.emit(QuestEvents.ActivityRewardClaimed, config, config.rewards);

    // 发送通用奖励发放事件
    EventBus.emit(QuestEvents.RewardGranted, config.rewards);

    return config.rewards;
  }

  /** 获取可领取的阶段奖励列表 */
  getClaimableRewards(): IActivityRewardConfig[] {
    return this._rewardConfigs.filter(config =>
      this._currentPoints >= config.requiredPoints && !this._claimedRewards.has(config.id)
    );
  }

  /** 获取已领取的阶段奖励列表 */
  getClaimedRewards(): IActivityRewardConfig[] {
    return this._rewardConfigs.filter(config => this._claimedRewards.has(config.id));
  }

  /** 获取下一个阶段奖励 */
  getNextReward(): IActivityRewardConfig | undefined {
    return this._rewardConfigs.find(config =>
      this._currentPoints < config.requiredPoints
    );
  }

  /** 获取下一个阶段所需的剩余点数 */
  getPointsToNextReward(): number {
    const next = this.getNextReward();
    if (!next) return 0;
    return Math.max(0, next.requiredPoints - this._currentPoints);
  }

  /** 重置贡献值（每日重置） */
  reset(): void {
    this._currentPoints = 0;
    this._claimedRewards.clear();
    this._lastResetTime = Date.now();

    // 发送重置事件
    EventBus.emit(QuestEvents.ActivityReset);
  }

  /** 检查是否需要重置 */
  checkAndReset(): void {
    const now = Date.now();
    const todayReset = this.getTodayResetTime();

    if (this._lastResetTime < todayReset && now >= todayReset) {
      this.reset();
    }
  }

  /** 获取今天0点的时间戳 */
  private getTodayResetTime(): number {
    const now = new Date();
    const reset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return reset.getTime();
  }

  /** 导出存档数据 */
  toSaveData(): IDailyActivitySaveData {
    return {
      currentPoints: this._currentPoints,
      claimedRewards: Array.from(this._claimedRewards),
      lastResetTime: this._lastResetTime,
    };
  }

  /** 从存档数据恢复 */
  loadSaveData(saveData: IDailyActivitySaveData): void {
    if (!saveData) return;

    this._currentPoints = saveData.currentPoints || 0;
    this._claimedRewards = new Set(saveData.claimedRewards || []);
    this._lastResetTime = saveData.lastResetTime || 0;

    // 检查是否需要重置
    this.checkAndReset();
  }

  /** 清空所有数据 */
  clear(): void {
    // 先移除事件监听器，防止重复注册
    this.destroy();

    this._currentPoints = 0;
    this._claimedRewards.clear();
    this._lastResetTime = 0;
  }
}
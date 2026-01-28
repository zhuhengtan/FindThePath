import { QuestState, QuestType, QuestEvents } from "../../type";
import { QuestObjective, IQuestObjective } from "./QuestObjective";
import { QuestReward, IQuestReward } from "./QuestReward";

export interface IQuestData {
  /** 任务唯一ID */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 任务类型 */
  type: QuestType;
  /** 任务目标列表 */
  objectives?: IQuestObjective[];
  /** 任务奖励列表 */
  rewards?: IQuestReward[];
  /** 前置任务ID列表 */
  prerequisiteQuests?: string[];
  /** 后续任务ID列表 */
  followUpQuests?: string[];
  /** 是否自动接受 */
  autoAccept?: boolean;
  /** 是否自动完成（满足条件后自动提交） */
  autoComplete?: boolean;
  /** 是否可重复 */
  repeatable?: boolean;
  /** 最大重复次数（0表示无限） */
  maxRepeatCount?: number;
  /** 解锁等级要求 */
  unlockLevel?: number;
  /** 解锁章节要求 */
  unlockChapter?: string;
  /** 是否隐藏（隐藏任务） */
  hidden?: boolean;
  /** 任务图标 */
  icon?: string;
  /** 任务排序权重 */
  sortOrder?: number;
  /** 任务分组（用于每日任务分类等） */
  group?: string;
  /** 战令经验值（完成后获得的战令经验） */
  battlePassExp?: number;
  /** 贡献值点数（完成后获得的贡献值） */
  activityPoints?: number;
  /** 每日完成次数上限（0表示无限） */
  dailyLimit?: number;
  /** 额外参数 */
  params?: Record<string, any>;
}

export interface IQuestSaveData {
  /** 任务ID */
  id: string;
  /** 任务状态 */
  state: QuestState;
  /** 目标进度 */
  progress: Record<string, number>;
  /** 接受时间戳 */
  acceptedAt?: number;
  /** 完成时间戳 */
  completedAt?: number;
  /** 已重复次数 */
  repeatCount?: number;
  /** 今日已完成次数 */
  dailyCompletedCount?: number;
}

export class Quest {
  // 配置数据
  id: string;
  name: string;
  description: string;
  type: QuestType;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisiteQuests: string[];
  followUpQuests: string[];
  autoAccept: boolean;
  autoAcceptCondition: string;  // 自动接取条件表达式
  autoComplete: boolean;
  repeatable: boolean;
  maxRepeatCount: number;
  unlockLevel: number;
  unlockChapter: string;
  hidden: boolean;
  icon: string;
  sortOrder: number;
  group: string;
  battlePassExp: number;
  activityPoints: number;
  dailyLimit: number;
  params: Record<string, any>;

  // 运行时数据
  state: QuestState;
  progress: Record<string, number>;
  acceptedAt: number;
  completedAt: number;
  repeatCount: number;
  dailyCompletedCount: number;

  constructor(data: IQuestData | any) {
    // 配置数据
    this.id = data.id;
    this.name = data.name;
    this.description = data.description || "";
    this.type = data.type || QuestType.Main;

    // 解析目标
    this.objectives = QuestObjective.parseObjectives(data.objectives, this.id);

    // 解析奖励
    this.rewards = QuestReward.parseRewards(data.rewards);

    // 任务链
    this.prerequisiteQuests = this.parseStringArray(data.prerequisiteQuests);
    this.followUpQuests = this.parseStringArray(data.followUpQuests);

    // 任务属性
    this.autoAccept = !!data.autoAccept;
    this.autoAcceptCondition = data.autoAcceptCondition || "";
    this.autoComplete = !!data.autoComplete;
    this.repeatable = !!data.repeatable;
    this.maxRepeatCount = data.maxRepeatCount ?? 0;
    this.unlockLevel = data.unlockLevel ?? 0;
    this.unlockChapter = data.unlockChapter || "";
    this.hidden = !!data.hidden;
    this.icon = data.icon || "";
    this.sortOrder = data.sortOrder ?? 0;
    this.group = data.group || "";
    this.battlePassExp = data.battlePassExp ?? 0;
    this.activityPoints = data.activityPoints ?? 0;
    this.dailyLimit = data.dailyLimit ?? 0;
    this.params = data.params || {};

    // 运行时数据
    this.state = data.state ?? QuestState.NotAccepted;
    this.progress = data.progress || {};
    this.acceptedAt = data.acceptedAt ?? 0;
    this.completedAt = data.completedAt ?? 0;
    this.repeatCount = data.repeatCount ?? 0;
    this.dailyCompletedCount = data.dailyCompletedCount ?? 0;
  }

  private parseStringArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v));
    if (typeof value === "string") {
      return value.split(",").map(s => s.trim()).filter(s => s);
    }
    return [];
  }

  /** 是否为每日任务 */
  get isDaily(): boolean {
    return this.type === QuestType.Daily;
  }

  /** 是否为每周任务 */
  get isWeekly(): boolean {
    return this.type === QuestType.Weekly;
  }

  /** 是否为每月任务 */
  get isMonthly(): boolean {
    return this.type === QuestType.Monthly;
  }

  /** 是否为周期性任务（每日/每周/每月） */
  get isPeriodic(): boolean {
    return this.isDaily || this.isWeekly || this.isMonthly;
  }

  /** 是否已接受 */
  get isAccepted(): boolean {
    return this.state === QuestState.Accepted || this.state === QuestState.Submittable;
  }

  /** 是否可提交 */
  get isSubmittable(): boolean {
    return this.state === QuestState.Submittable;
  }

  /** 是否已完成 */
  get isCompleted(): boolean {
    return this.state === QuestState.Completed;
  }

  /** 是否已失败 */
  get isFailed(): boolean {
    return this.state === QuestState.Failed;
  }

  /** 是否已过期 */
  get isExpired(): boolean {
    return this.state === QuestState.Expired;
  }

  /** 是否可以重复 */
  get canRepeat(): boolean {
    if (!this.repeatable) return false;
    if (this.maxRepeatCount > 0 && this.repeatCount >= this.maxRepeatCount) return false;
    return true;
  }

  /** 今日是否还可以完成（检查每日次数上限） */
  get canCompleteToday(): boolean {
    if (this.dailyLimit <= 0) return true; // 0表示无限
    return this.dailyCompletedCount < this.dailyLimit;
  }

  /** 今日剩余可完成次数 */
  get remainingDailyCount(): number {
    if (this.dailyLimit <= 0) return -1; // -1表示无限
    return Math.max(0, this.dailyLimit - this.dailyCompletedCount);
  }

  /** 获取目标进度 */
  getObjectiveProgress(objectiveId: string): number {
    return this.progress[objectiveId] || 0;
  }

  /** 设置目标进度 */
  setObjectiveProgress(objectiveId: string, value: number): void {
    this.progress[objectiveId] = value;
  }

  /** 增加目标进度 */
  addObjectiveProgress(objectiveId: string, delta: number = 1): number {
    const current = this.getObjectiveProgress(objectiveId);
    const newValue = current + delta;
    this.setObjectiveProgress(objectiveId, newValue);
    return newValue;
  }

  /** 检查所有目标是否完成 */
  checkAllObjectivesCompleted(): boolean {
    if (!this.objectives || this.objectives.length === 0) return true;

    return this.objectives.every(obj => {
      const current = this.getObjectiveProgress(obj.id);
      return current >= obj.count;
    });
  }

  /** 获取总体进度百分比 (0-100) */
  getTotalProgress(): number {
    if (!this.objectives || this.objectives.length === 0) return 100;

    let totalRequired = 0;
    let totalCurrent = 0;

    for (const obj of this.objectives) {
      totalRequired += obj.count;
      totalCurrent += Math.min(this.getObjectiveProgress(obj.id), obj.count);
    }

    if (totalRequired === 0) return 100;
    return Math.floor((totalCurrent / totalRequired) * 100);
  }

  /** 重置任务（用于周期性任务） */
  reset(): void {
    this.state = QuestState.NotAccepted;
    this.progress = {};
    this.acceptedAt = 0;
    this.completedAt = 0;
    this.dailyCompletedCount = 0;
    // repeatCount 不重置，用于统计总完成次数
  }

  resetForRepeat(): void {
    this.state = QuestState.NotAccepted;
    this.progress = {};
    this.acceptedAt = 0;
  }

  prepareNextRepeat(): void {
    this.state = QuestState.Accepted;
    this.progress = {};
    this.acceptedAt = Date.now();
  }

  /** 接受任务 */
  accept(): boolean {
    if (this.state !== QuestState.NotAccepted && this.state !== QuestState.Locked) {
      return false;
    }
    this.state = QuestState.Accepted;
    this.acceptedAt = Date.now();
    return true;
  }

  /** 尝试提交任务 */
  trySubmit(): boolean {
    if (!this.isAccepted) return false;
    if (!this.checkAllObjectivesCompleted()) return false;

    this.state = QuestState.Submittable;
    return true;
  }

  /** 完成任务 */
  complete(force: boolean = false): boolean {
    // 强制完成模式：跳过状态和目标检查
    if (!force) {
      if (this.state !== QuestState.Submittable && !this.autoComplete) {
        return false;
      }
      if (!this.checkAllObjectivesCompleted()) {
        return false;
      }
      // 检查每日次数上限
      if (!this.canCompleteToday) {
        return false;
      }
    }

    this.state = QuestState.Completed;
    this.completedAt = Date.now();
    this.repeatCount++;
    this.dailyCompletedCount++;
    return true;
  }

  /** 导出存档数据 */
  toSaveData(): IQuestSaveData {
    return {
      id: this.id,
      state: this.state,
      progress: { ...this.progress },
      acceptedAt: this.acceptedAt,
      completedAt: this.completedAt,
      repeatCount: this.repeatCount,
      dailyCompletedCount: this.dailyCompletedCount,
    };
  }

  /** 从存档数据恢复 */
  loadSaveData(saveData: IQuestSaveData): void {
    if (saveData.id !== this.id) return;

    this.state = saveData.state ?? QuestState.NotAccepted;
    this.progress = saveData.progress || {};
    this.acceptedAt = saveData.acceptedAt ?? 0;
    this.completedAt = saveData.completedAt ?? 0;
    this.repeatCount = saveData.repeatCount ?? 0;
    this.dailyCompletedCount = saveData.dailyCompletedCount ?? 0;
  }
}

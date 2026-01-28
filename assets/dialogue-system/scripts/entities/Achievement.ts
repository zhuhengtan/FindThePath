import {
  AchievementType,
  AchievementCategory,
  AchievementRarity,
  AchievementState,
  AchievementRewardType,
} from "../../type";
import { AchievementObjective, IAchievementObjective } from "./AchievementObjective";
import { AchievementReward, IAchievementReward } from "./AchievementReward";
import { AchievementStage, IAchievementStage } from "./AchievementStage";

/** 成就配置数据接口 */
export interface IAchievementData {
  /** 成就唯一ID */
  id: string;
  /** 成就名称 */
  name: string;
  /** 成就描述 */
  description?: string;
  /** 成就类型 */
  type: AchievementType;
  /** 成就分类 */
  category: AchievementCategory;
  /** 成就稀有度 */
  rarity: AchievementRarity;
  /** 成就图标 */
  icon?: string;
  /** 成就目标（一次性/累积型使用） */
  objectives?: IAchievementObjective[];
  /** 成就阶段（阶段型使用） */
  stages?: IAchievementStage[];
  /** 成就奖励（一次性/累积型使用） */
  rewards?: IAchievementReward[];
  /** 前置成就ID列表 */
  prerequisiteAchievements?: string[];
  /** 解锁等级要求 */
  unlockLevel?: number;
  /** 成就点数（用于成就总分统计） */
  points?: number;
  /** 排序权重 */
  sortOrder?: number;
  /** 是否隐藏（隐藏成就在未解锁前不显示详情） */
  hidden?: boolean;
  /** 额外参数 */
  params?: Record<string, any>;
}

/** 成就存档数据接口 */
export interface IAchievementSaveData {
  /** 成就ID */
  id: string;
  /** 成就状态 */
  state: AchievementState;
  /** 目标进度 */
  progress: Record<string, number>;
  /** 当前阶段索引（阶段型成就） */
  currentStageIndex?: number;
  /** 已领取的阶段ID列表（阶段型成就） */
  claimedStages?: string[];
  /** 解锁时间戳 */
  unlockedAt?: number;
  /** 领取时间戳 */
  claimedAt?: number;
}

/**
 * 成就实体类
 * 支持一次性、累积型、阶段型、隐藏成就
 */
export class Achievement {
  // ==================== 配置数据 ====================
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  objectives: AchievementObjective[];
  stages: AchievementStage[];
  rewards: AchievementReward[];
  prerequisiteAchievements: string[];
  unlockLevel: number;
  points: number;
  sortOrder: number;
  hidden: boolean;
  params: Record<string, any>;

  // ==================== 运行时数据 ====================
  state: AchievementState;
  progress: Record<string, number>;
  currentStageIndex: number;
  claimedStages: Set<string>;
  unlockedAt: number;
  claimedAt: number;

  constructor(data: IAchievementData | any) {
    // 配置数据
    this.id = data.id || "";
    this.name = data.name || "";
    this.description = data.description || "";
    this.type = this.parseType(data.type);
    this.category = this.parseCategory(data.category);
    this.rarity = this.parseRarity(data.rarity);
    this.icon = data.icon || "";
    
    // 解析目标
    this.objectives = AchievementObjective.parseObjectives(data.objectives, this.id);
    
    // 解析阶段
    this.stages = AchievementStage.parseStages(data.stages);
    
    // 解析奖励
    this.rewards = AchievementReward.parseRewards(data.rewards);
    
    // 前置成就
    this.prerequisiteAchievements = this.parseStringArray(data.prerequisiteAchievements);
    
    // 其他配置
    this.unlockLevel = data.unlockLevel ?? 0;
    this.points = data.points ?? 0;
    this.sortOrder = data.sortOrder ?? 0;
    this.hidden = !!data.hidden;
    this.params = data.params || {};

    // 运行时数据
    this.state = data.state ?? AchievementState.InProgress;
    this.progress = data.progress || {};
    this.currentStageIndex = data.currentStageIndex ?? 0;
    this.claimedStages = new Set(data.claimedStages || []);
    this.unlockedAt = data.unlockedAt ?? 0;
    this.claimedAt = data.claimedAt ?? 0;
  }

  // ==================== 类型解析方法 ====================

  private parseType(type: any): AchievementType {
    if (!type) return AchievementType.OneTime;
    if (typeof type === "object" && type !== null) {
      return (type as any).key || AchievementType.OneTime;
    }
    return type as AchievementType;
  }

  private parseCategory(category: any): AchievementCategory {
    if (!category) return AchievementCategory.Combat;
    if (typeof category === "object" && category !== null) {
      return (category as any).key || AchievementCategory.Combat;
    }
    return category as AchievementCategory;
  }

  private parseRarity(rarity: any): AchievementRarity {
    if (!rarity) return AchievementRarity.Common;
    if (typeof rarity === "object" && rarity !== null) {
      return (rarity as any).key || AchievementRarity.Common;
    }
    return rarity as AchievementRarity;
  }

  private parseStringArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v));
    if (typeof value === "string") {
      return value.split(",").map(s => s.trim()).filter(s => s);
    }
    return [];
  }

  // ==================== 状态检查方法 ====================

  /** 是否为一次性成就 */
  get isOneTime(): boolean {
    return this.type === AchievementType.OneTime;
  }

  /** 是否为累积型成就 */
  get isCumulative(): boolean {
    return this.type === AchievementType.Cumulative;
  }

  /** 是否为阶段型成就 */
  get isStaged(): boolean {
    return this.type === AchievementType.Staged;
  }

  /** 是否为隐藏成就 */
  get isHidden(): boolean {
    return this.type === AchievementType.Hidden || this.hidden;
  }

  /** 是否已锁定 */
  get isLocked(): boolean {
    return this.state === AchievementState.Locked;
  }

  /** 是否进行中 */
  get isInProgress(): boolean {
    return this.state === AchievementState.InProgress;
  }

  /** 是否已解锁 */
  get isUnlocked(): boolean {
    return this.state === AchievementState.Unlocked || this.state === AchievementState.Claimed;
  }

  /** 是否可领取奖励 */
  get isClaimable(): boolean {
    return this.state === AchievementState.Unlocked;
  }

  /** 是否已领取奖励 */
  get isClaimed(): boolean {
    return this.state === AchievementState.Claimed;
  }

  // ==================== 进度管理方法 ====================

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

  /** 获取主要目标的进度（用于阶段型成就） */
  getMainProgress(): number {
    if (this.objectives.length > 0) {
      return this.getObjectiveProgress(this.objectives[0].id);
    }
    return 0;
  }

  /** 设置主要目标的进度（用于阶段型成就） */
  setMainProgress(value: number): void {
    if (this.objectives.length > 0) {
      this.setObjectiveProgress(this.objectives[0].id, value);
    }
  }

  /** 增加主要目标的进度（用于阶段型成就） */
  addMainProgress(delta: number = 1): number {
    if (this.objectives.length > 0) {
      return this.addObjectiveProgress(this.objectives[0].id, delta);
    }
    return 0;
  }

  // ==================== 解锁条件检查 ====================

  /** 检查所有目标是否完成 */
  checkAllObjectivesCompleted(): boolean {
    if (!this.objectives || this.objectives.length === 0) return true;
    
    return this.objectives.every(obj => {
      const current = this.getObjectiveProgress(obj.id);
      return current >= obj.count;
    });
  }

  /** 检查是否满足解锁条件（用于一次性/累积型成就） */
  checkUnlockCondition(): boolean {
    if (this.isStaged) {
      // 阶段型成就检查是否有新阶段完成
      return this.hasNewStageCompleted();
    }
    return this.checkAllObjectivesCompleted();
  }

  /** 解锁成就 */
  unlock(): boolean {
    if (this.state !== AchievementState.InProgress) return false;
    
    this.state = AchievementState.Unlocked;
    this.unlockedAt = Date.now();
    return true;
  }

  /** 领取奖励 */
  claim(): boolean {
    if (this.state !== AchievementState.Unlocked) return false;
    
    this.state = AchievementState.Claimed;
    this.claimedAt = Date.now();
    return true;
  }

  // ==================== 阶段型成就方法 ====================

  /** 获取当前阶段 */
  getCurrentStage(): AchievementStage | undefined {
    if (!this.isStaged || this.stages.length === 0) return undefined;
    
    if (this.currentStageIndex >= this.stages.length) {
      return this.stages[this.stages.length - 1];
    }
    return this.stages[this.currentStageIndex];
  }

  /** 获取下一阶段 */
  getNextStage(): AchievementStage | undefined {
    if (!this.isStaged || this.stages.length === 0) return undefined;
    
    const nextIndex = this.currentStageIndex + 1;
    if (nextIndex >= this.stages.length) return undefined;
    return this.stages[nextIndex];
  }

  /** 检查阶段是否完成 */
  isStageCompleted(stageIndex: number): boolean {
    if (!this.isStaged || stageIndex >= this.stages.length) return false;
    
    const stage = this.stages[stageIndex];
    const progress = this.getMainProgress();
    return progress >= stage.targetCount;
  }

  /** 检查是否有新阶段完成 */
  hasNewStageCompleted(): boolean {
    if (!this.isStaged) return false;
    
    const progress = this.getMainProgress();
    for (let i = this.currentStageIndex; i < this.stages.length; i++) {
      if (progress >= this.stages[i].targetCount && !this.claimedStages.has(this.stages[i].id)) {
        return true;
      }
    }
    return false;
  }

  /** 获取可领取的阶段列表 */
  getClaimableStages(): AchievementStage[] {
    if (!this.isStaged) return [];
    
    const progress = this.getMainProgress();
    return this.stages.filter(stage => 
      progress >= stage.targetCount && !this.claimedStages.has(stage.id)
    );
  }

  /** 检查阶段奖励是否已领取 */
  isStageClaimed(stageId: string): boolean {
    return this.claimedStages.has(stageId);
  }

  /** 领取阶段奖励 */
  claimStage(stageId: string): AchievementReward[] | null {
    const stage = this.stages.find(s => s.id === stageId);
    if (!stage) return null;
    
    const progress = this.getMainProgress();
    if (progress < stage.targetCount) return null;
    if (this.claimedStages.has(stageId)) return null;
    
    this.claimedStages.add(stageId);
    
    // 更新当前阶段索引
    const stageIndex = this.stages.findIndex(s => s.id === stageId);
    if (stageIndex >= this.currentStageIndex) {
      this.currentStageIndex = stageIndex + 1;
    }
    
    // 如果所有阶段都已领取，标记成就为已完成
    if (this.claimedStages.size >= this.stages.length) {
      this.state = AchievementState.Claimed;
      this.claimedAt = Date.now();
    }
    
    return stage.rewards;
  }

  // ==================== 进度显示方法 ====================

  /** 获取总体进度百分比 (0-100) */
  getTotalProgress(): number {
    if (this.isStaged) {
      // 阶段型成就：基于当前阶段的进度
      const currentStage = this.getCurrentStage();
      if (!currentStage) return 100;
      
      const progress = this.getMainProgress();
      return currentStage.getProgressPercent(progress);
    }
    
    // 一次性/累积型成就
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

  /** 获取显示名称（阶段型成就包含阶段后缀） */
  getDisplayName(): string {
    if (this.isStaged) {
      const currentStage = this.getCurrentStage();
      if (currentStage) {
        return currentStage.getDisplayName(this.name);
      }
    }
    return this.name;
  }

  /** 获取显示描述（隐藏成就未解锁时显示占位符） */
  getDisplayDescription(): string {
    if (this.isHidden && !this.isUnlocked) {
      return "???（隐藏成就，完成后揭晓）";
    }
    return this.description;
  }

  /** 获取当前阶段的目标数量 */
  getCurrentTargetCount(): number {
    if (this.isStaged) {
      const currentStage = this.getCurrentStage();
      if (currentStage) {
        return currentStage.targetCount;
      }
    }
    
    if (this.objectives.length > 0) {
      return this.objectives[0].count;
    }
    
    return 0;
  }

  /** 获取当前奖励列表 */
  getCurrentRewards(): AchievementReward[] {
    if (this.isStaged) {
      const currentStage = this.getCurrentStage();
      if (currentStage) {
        return currentStage.rewards;
      }
    }
    return this.rewards;
  }

  /** 获取成就点数（包括阶段型成就的累计点数） */
  getTotalPoints(): number {
    if (this.isStaged) {
      let total = this.points;
      for (const stage of this.stages) {
        if (this.claimedStages.has(stage.id)) {
          total += stage.points;
        }
      }
      return total;
    }
    return this.points;
  }

  // ==================== 存档方法 ====================

  /** 导出存档数据 */
  toSaveData(): IAchievementSaveData {
    return {
      id: this.id,
      state: this.state,
      progress: { ...this.progress },
      currentStageIndex: this.currentStageIndex,
      claimedStages: Array.from(this.claimedStages),
      unlockedAt: this.unlockedAt,
      claimedAt: this.claimedAt,
    };
  }

  /** 从存档数据恢复 */
  loadSaveData(saveData: IAchievementSaveData): void {
    if (saveData.id !== this.id) return;
    
    this.state = saveData.state ?? AchievementState.InProgress;
    this.progress = saveData.progress || {};
    this.currentStageIndex = saveData.currentStageIndex ?? 0;
    this.claimedStages = new Set(saveData.claimedStages || []);
    this.unlockedAt = saveData.unlockedAt ?? 0;
    this.claimedAt = saveData.claimedAt ?? 0;
  }

  /** 重置成就（用于测试） */
  reset(): void {
    this.state = AchievementState.InProgress;
    this.progress = {};
    this.currentStageIndex = 0;
    this.claimedStages.clear();
    this.unlockedAt = 0;
    this.claimedAt = 0;
  }
}

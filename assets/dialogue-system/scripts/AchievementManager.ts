import EventBus from "db://assets/hunter/utils/event-bus";
import { ConfigLoader } from "db://assets/hunter/utils/config-loader";
import {
  AchievementEvents,
  AchievementCategory,
  AchievementRarity,
  AchievementState,
  AchievementRewardType,
  QuestEvents,
  QuestObjectiveType,
} from "../type";
import { Achievement, IAchievementSaveData } from "./entities/Achievement";
import { AchievementReward } from "./entities/AchievementReward";
import { Quest } from "./entities/Quest";

/** 成就管理器存档数据接口 */
export interface IAchievementManagerSaveData {
  /** 所有成就存档 */
  achievements: IAchievementSaveData[];
  /** 总成就点数 */
  totalPoints: number;
  /** 已解锁的称号ID列表 */
  unlockedTitles: string[];
  /** 当前装备的称号ID */
  equippedTitleId?: string;
}

/**
 * 成就管理器
 * 负责成就的加载、进度追踪、解锁和奖励发放
 */
export class AchievementManager {
  private static _instance: AchievementManager;

  /** 所有成就 */
  private _achievements: Map<string, Achievement> = new Map();

  /** 总成就点数 */
  private _totalPoints: number = 0;

  /** 已解锁的称号 */
  private _unlockedTitles: Set<string> = new Set();

  /** 当前装备的称号 */
  private _equippedTitleId: string | undefined;

  /** 是否已初始化 */
  private _initialized: boolean = false;

  /** 事件处理器映射（用于精确移除监听器） */
  private _eventHandlers: Map<string, Function> = new Map();

  static get instance(): AchievementManager {
    if (!this._instance) this._instance = new AchievementManager();
    return this._instance;
  }

  // ==================== 生命周期 ====================

  /** 初始化 */
  init(): void {
    if (this._initialized) return;

    this.loadAchievements();
    this.registerEventListeners();
    this._initialized = true;
  }

  /** 销毁 */
  destroy(): void {
    this.unregisterEventListeners();
    this._initialized = false;
  }

  /** 加载所有成就配置 */
  private loadAchievements(): void {
    const configs = ConfigLoader.instance.getConfigsByTableName("achievement") as any[];
    console.log(`[AchievementManager] loadAchievements: configs =`, configs, 'count:', configs?.length || 0);
    if (!configs) return;

    for (const config of configs) {
      const achievement = new Achievement(config);
      this._achievements.set(achievement.id, achievement);
    }
    console.log(`[AchievementManager] Total achievements loaded: ${this._achievements.size}`);
  }

  /** 注册事件监听器 */
  private registerEventListeners(): void {
    // 怪物击杀
    const onMonsterKilled = (monsterId: string | number, count: number = 1) => {
      this.onMonsterKilled(monsterId, count);
    };
    this._eventHandlers.set(QuestEvents.MonsterKilled, onMonsterKilled);
    EventBus.on(QuestEvents.MonsterKilled, onMonsterKilled);

    // 物品收集
    const onItemCollected = (itemId: string | number, count: number = 1) => {
      this.onItemCollected(itemId, count);
    };
    this._eventHandlers.set(QuestEvents.ItemCollected, onItemCollected);
    EventBus.on(QuestEvents.ItemCollected, onItemCollected);

    // 战斗胜利
    const onBattleWon = (battleId?: string | number) => {
      this.onBattleWon(battleId);
    };
    this._eventHandlers.set(QuestEvents.BattleWon, onBattleWon);
    EventBus.on(QuestEvents.BattleWon, onBattleWon);

    // 关卡完成
    const onLevelCompleted = (levelId: string | number) => {
      this.onLevelCompleted(levelId);
    };
    this._eventHandlers.set(QuestEvents.LevelCompleted, onLevelCompleted);
    EventBus.on(QuestEvents.LevelCompleted, onLevelCompleted);

    // 对话完成
    const onDialogCompleted = (dialogId: string | number) => {
      this.onDialogCompleted(dialogId);
    };
    this._eventHandlers.set(QuestEvents.DialogCompleted, onDialogCompleted);
    EventBus.on(QuestEvents.DialogCompleted, onDialogCompleted);

    // 技能使用
    const onSkillUsed = (skillId: string | number, count: number = 1) => {
      this.onSkillUsed(skillId, count);
    };
    this._eventHandlers.set(QuestEvents.SkillUsed, onSkillUsed);
    EventBus.on(QuestEvents.SkillUsed, onSkillUsed);

    // 玩家升级
    const onPlayerLevelUp = (newLevel: number) => {
      this.onPlayerLevelUp(newLevel);
    };
    this._eventHandlers.set(QuestEvents.PlayerLevelUp, onPlayerLevelUp);
    EventBus.on(QuestEvents.PlayerLevelUp, onPlayerLevelUp);

    // 装备穿戴
    const onEquipmentEquipped = (equipmentId: string | number) => {
      this.onEquipmentEquipped(equipmentId);
    };
    this._eventHandlers.set(QuestEvents.EquipmentEquipped, onEquipmentEquipped);
    EventBus.on(QuestEvents.EquipmentEquipped, onEquipmentEquipped);

    // 副本完成
    const onInstanceCompleted = (instanceId: string | number) => {
      this.onInstanceCompleted(instanceId);
    };
    this._eventHandlers.set(QuestEvents.InstanceCompleted, onInstanceCompleted);
    EventBus.on(QuestEvents.InstanceCompleted, onInstanceCompleted);

    // 货币消耗
    const onCurrencySpent = (currencyType: string, amount: number) => {
      this.onCurrencySpent(currencyType, amount);
    };
    this._eventHandlers.set(QuestEvents.CurrencySpent, onCurrencySpent);
    EventBus.on(QuestEvents.CurrencySpent, onCurrencySpent);

    // 玩家登录
    const onPlayerLogin = () => {
      this.onPlayerLogin();
    };
    this._eventHandlers.set(QuestEvents.PlayerLogin, onPlayerLogin);
    EventBus.on(QuestEvents.PlayerLogin, onPlayerLogin);

    // PVP切磋
    const onPvpBattleCompleted = () => {
      this.onPvpBattleCompleted();
    };
    this._eventHandlers.set(QuestEvents.PvpBattleCompleted, onPvpBattleCompleted);
    EventBus.on(QuestEvents.PvpBattleCompleted, onPvpBattleCompleted);

    // 分享游戏
    const onGameShared = () => {
      this.onGameShared();
    };
    this._eventHandlers.set(QuestEvents.GameShared, onGameShared);
    EventBus.on(QuestEvents.GameShared, onGameShared);

    // 副本探索
    const onInstanceExplored = (instanceId?: string | number) => {
      this.onInstanceExplored(instanceId);
    };
    this._eventHandlers.set(QuestEvents.InstanceExplored, onInstanceExplored);
    EventBus.on(QuestEvents.InstanceExplored, onInstanceExplored);

    // 任务完成（用于"完成X个任务"类成就）
    const onQuestCompleted = (quest: Quest) => {
      this.onQuestCompleted(quest);
    };
    this._eventHandlers.set(QuestEvents.QuestCompleted, onQuestCompleted);
    EventBus.on(QuestEvents.QuestCompleted, onQuestCompleted);

    // 技能学习
    const onSkillLearned = (skillId: string | number) => {
      this.onSkillLearned(skillId);
    };
    this._eventHandlers.set(QuestEvents.SkillLearned, onSkillLearned);
    EventBus.on(QuestEvents.SkillLearned, onSkillLearned);

    // 技能升级
    const onSkillUpgraded = (skillId: string | number, newLevel: number) => {
      this.onSkillUpgraded(skillId, newLevel);
    };
    this._eventHandlers.set(QuestEvents.SkillUpgraded, onSkillUpgraded);
    EventBus.on(QuestEvents.SkillUpgraded, onSkillUpgraded);

    // 技能达到3级
    const onSkillReachLevel3 = (skillId: string | number) => {
      this.onSkillReachLevel3(skillId);
    };
    this._eventHandlers.set(QuestEvents.SkillReachLevel3, onSkillReachLevel3);
    EventBus.on(QuestEvents.SkillReachLevel3, onSkillReachLevel3);

    // 技能达到5级
    const onSkillReachLevel5 = (skillId: string | number) => {
      this.onSkillReachLevel5(skillId);
    };
    this._eventHandlers.set(QuestEvents.SkillReachLevel5, onSkillReachLevel5);
    EventBus.on(QuestEvents.SkillReachLevel5, onSkillReachLevel5);

    // 爬塔层数达标
    const onTowerFloorReached = (floorNumber: number) => {
      this.onTowerFloorReached(floorNumber);
    };
    this._eventHandlers.set(QuestEvents.TowerFloorReached, onTowerFloorReached);
    EventBus.on(QuestEvents.TowerFloorReached, onTowerFloorReached);
  }

  /** 移除事件监听器 */
  private unregisterEventListeners(): void {
    // 使用 detach 精确移除监听器
    for (const [event, handler] of this._eventHandlers) {
      EventBus.detach(event, handler as any);
    }
    this._eventHandlers.clear();
  }

  // ==================== 事件处理器 ====================

  private onMonsterKilled(monsterId: string | number, count: number = 1): void {
    // 通用击杀怪物
    this.updateProgressByType(QuestObjectiveType.KillMonster, undefined, count);
    // 击杀特定怪物
    this.updateProgressByType(QuestObjectiveType.KillSpecificMonster, monsterId, count);
  }

  private onItemCollected(itemId: string | number, count: number = 1): void {
    this.updateProgressByType(QuestObjectiveType.CollectItem, itemId, count);
  }

  private onBattleWon(battleId?: string | number): void {
    this.updateProgressByType(QuestObjectiveType.WinBattle, battleId, 1);
  }

  private onLevelCompleted(levelId: string | number): void {
    this.updateProgressByType(QuestObjectiveType.CompleteLevel, levelId, 1);
  }

  private onDialogCompleted(dialogId: string | number): void {
    this.updateProgressByType(QuestObjectiveType.CompleteDialog, dialogId, 1);
    this.updateProgressByType(QuestObjectiveType.CompleteSpecificDialog, dialogId, 1);
    this.updateProgressByType(QuestObjectiveType.TalkToNpc, dialogId, 1);
  }

  private onSkillUsed(skillId: string | number, count: number = 1): void {
    this.updateProgressByType(QuestObjectiveType.UseSkill, skillId, count);
  }

  private onPlayerLevelUp(newLevel: number): void {
    this.updateProgressByType(QuestObjectiveType.ReachLevel, undefined, 1, newLevel);
  }

  private onEquipmentEquipped(equipmentId: string | number): void {
    this.updateProgressByType(QuestObjectiveType.EquipItem, equipmentId, 1);
  }

  private onInstanceCompleted(instanceId: string | number): void {
    this.updateProgressByType(QuestObjectiveType.CompleteInstance, undefined, 1);
    this.updateProgressByType(QuestObjectiveType.CompleteSpecificInstance, instanceId, 1);
  }

  private onCurrencySpent(currencyType: string, amount: number): void {
    this.updateProgressByType(QuestObjectiveType.SpendCurrency, currencyType, amount);
  }

  private onPlayerLogin(): void {
    this.updateProgressByType(QuestObjectiveType.Login, undefined, 1);
  }

  private onPvpBattleCompleted(): void {
    this.updateProgressByType(QuestObjectiveType.PvpBattle, undefined, 1);
  }

  private onGameShared(): void {
    this.updateProgressByType(QuestObjectiveType.ShareGame, undefined, 1);
  }

  private onInstanceExplored(instanceId?: string | number): void {
    this.updateProgressByType(QuestObjectiveType.ExploreInstance, instanceId, 1);
  }

  private onQuestCompleted(quest: Quest): void {
    this.updateProgressByType(QuestObjectiveType.CompleteQuest, undefined, 1);
    this.updateProgressByType(QuestObjectiveType.CompleteSpecificQuest, quest.id, 1);
  }

  private onSkillLearned(skillId: string | number): void {
    this.updateProgressByType(QuestObjectiveType.LearnSkill, undefined, 1);
    this.updateProgressByType(QuestObjectiveType.LearnSpecificSkill, skillId, 1);
  }

  private onSkillUpgraded(skillId: string | number, newLevel: number): void {
    // 技能升级事件：每次升级触发一次（用于"第一次技能升级"等成就）
    this.updateProgressByType(QuestObjectiveType.UpgradeSkill, undefined, 1);
  }

  private onSkillReachLevel3(skillId: string | number): void {
    // 技能达到3级事件：统计达到3级的技能数量
    this.updateProgressByType(QuestObjectiveType.SkillReachLevel3, undefined, 1);
  }

  private onSkillReachLevel5(skillId: string | number): void {
    // 技能达到5级事件：统计达到5级的技能数量
    this.updateProgressByType(QuestObjectiveType.SkillReachLevel5, undefined, 1);
  }

  private onTowerFloorReached(floorNumber: number): void {
    // 爬塔层数达标事件：使用绝对值更新进度
    this.updateProgressByType(QuestObjectiveType.ReachTowerFloor, undefined, 1, floorNumber);
  }

  // ==================== 核心方法 ====================

  /** 根据目标类型更新进度 */
  private updateProgressByType(
    objectiveType: QuestObjectiveType,
    targetId: string | number | undefined,
    delta: number,
    absoluteValue?: number
  ): void {
    for (const achievement of this._achievements.values()) {
      // 跳过已完成的成就
      if (achievement.isClaimed && !achievement.isStaged) continue;
      // 跳过锁定的成就
      if (achievement.isLocked) continue;

      for (const objective of achievement.objectives) {
        if (!objective.matches(objectiveType, targetId)) continue;

        // 更新进度
        if (absoluteValue !== undefined) {
          // 使用绝对值（如等级）
          achievement.setObjectiveProgress(objective.id, absoluteValue);
        } else {
          achievement.addObjectiveProgress(objective.id, delta);
        }

        // 发送进度更新事件
        EventBus.emit(
          AchievementEvents.AchievementProgressUpdated,
          achievement,
          objective.id,
          achievement.getObjectiveProgress(objective.id)
        );

        // 检查是否解锁
        this.checkUnlock(achievement);
      }
    }
  }

  /** 检查成就解锁条件 */
  private checkUnlock(achievement: Achievement): void {
    if (achievement.isStaged) {
      // 阶段型成就：检查是否有新阶段完成
      if (achievement.hasNewStageCompleted()) {
        const claimableStages = achievement.getClaimableStages();
        for (const stage of claimableStages) {
          EventBus.emit(AchievementEvents.AchievementStageCompleted, achievement, stage);
        }
      }
    } else {
      // 一次性/累积型成就：检查是否满足解锁条件
      if (achievement.isInProgress && achievement.checkUnlockCondition()) {
        this.unlock(achievement);
      }
    }
  }

  /** 解锁成就 */
  private unlock(achievement: Achievement): void {
    if (!achievement.unlock()) return;

    // 发送解锁事件
    EventBus.emit(AchievementEvents.AchievementUnlocked, achievement);

    console.log(`[AchievementManager] Achievement unlocked: ${achievement.id} - ${achievement.name}`);
  }

  /** 强制解锁成就（用于剧情触发） */
  forceUnlock(achievementId: string): boolean {
    const achievement = this._achievements.get(achievementId);
    if (!achievement) return false;

    if (achievement.isUnlocked) return true;

    // 设置所有目标为完成状态
    for (const objective of achievement.objectives) {
      achievement.setObjectiveProgress(objective.id, objective.count);
    }

    this.unlock(achievement);
    return true;
  }

  /** 领取成就奖励 */
  claimReward(achievementId: string, stageId?: string): boolean {
    const achievement = this._achievements.get(achievementId);
    if (!achievement) return false;

    let rewards: AchievementReward[] | null = null;

    if (achievement.isStaged && stageId) {
      // 阶段型成就：领取特定阶段奖励
      rewards = achievement.claimStage(stageId);
      if (!rewards) return false;

      // 获取阶段的成就点数
      const stage = achievement.stages.find(s => s.id === stageId);
      if (stage && stage.points > 0) {
        this.addPoints(stage.points);
      }

      // 检查阶段是否有称号奖励
      if (stage && stage.titleId) {
        this.unlockTitle(stage.titleId);
      }
    } else {
      // 一次性/累积型成就：领取全部奖励
      if (!achievement.claim()) return false;
      rewards = achievement.rewards;

      // 添加成就点数
      if (achievement.points > 0) {
        this.addPoints(achievement.points);
      }
    }

    // 发放奖励
    if (rewards && rewards.length > 0) {
      this.grantRewards(rewards);
    }

    // 发送奖励领取事件
    EventBus.emit(AchievementEvents.AchievementRewardClaimed, achievement, stageId, rewards);

    return true;
  }

  /** 发放奖励 */
  private grantRewards(rewards: AchievementReward[]): void {
    for (const reward of rewards) {
      switch (reward.type) {
        case AchievementRewardType.Title:
          this.unlockTitle(String(reward.rewardId));
          break;
        case AchievementRewardType.AchievementPoints:
          this.addPoints(reward.count);
          break;
        case AchievementRewardType.BattlePassExp:
          EventBus.emit(QuestEvents.BattlePassExpGained, reward.count, "achievement");
          break;
        default:
          // 其他奖励类型通过事件发放
          EventBus.emit(QuestEvents.RewardGranted, [reward]);
          break;
      }
    }
  }

  /** 添加成就点数 */
  private addPoints(points: number): void {
    const oldPoints = this._totalPoints;
    this._totalPoints += points;
    EventBus.emit(AchievementEvents.AchievementPointsUpdated, this._totalPoints, oldPoints, points);
  }

  // ==================== 查询方法 ====================

  /** 获取成就 */
  getAchievement(id: string): Achievement | undefined {
    return this._achievements.get(id);
  }

  /** 获取所有成就 */
  getAllAchievements(): Achievement[] {
    return Array.from(this._achievements.values());
  }

  /** 按分类获取成就 */
  getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return this.getAllAchievements().filter(a => a.category === category);
  }

  /** 按稀有度获取成就 */
  getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
    return this.getAllAchievements().filter(a => a.rarity === rarity);
  }

  /** 获取已解锁的成就 */
  getUnlockedAchievements(): Achievement[] {
    return this.getAllAchievements().filter(a => a.isUnlocked);
  }

  /** 获取可领取奖励的成就 */
  getClaimableAchievements(): Achievement[] {
    return this.getAllAchievements().filter(a => {
      if (a.isStaged) {
        return a.getClaimableStages().length > 0;
      }
      return a.isClaimable;
    });
  }

  /** 获取进行中的成就 */
  getInProgressAchievements(): Achievement[] {
    return this.getAllAchievements().filter(a => a.isInProgress);
  }

  /** 获取总成就点数 */
  getTotalPoints(): number {
    return this._totalPoints;
  }

  /** 获取成就完成率 */
  getCompletionRate(): number {
    const all = this.getAllAchievements();
    if (all.length === 0) return 0;

    const completed = all.filter(a => a.isClaimed).length;
    return Math.floor((completed / all.length) * 100);
  }

  /** 获取成就统计信息 */
  getStatistics(): {
    total: number;
    unlocked: number;
    claimed: number;
    inProgress: number;
    completionRate: number;
    totalPoints: number;
  } {
    const all = this.getAllAchievements();
    const unlocked = all.filter(a => a.isUnlocked).length;
    const claimed = all.filter(a => a.isClaimed).length;
    const inProgress = all.filter(a => a.isInProgress).length;

    return {
      total: all.length,
      unlocked,
      claimed,
      inProgress,
      completionRate: all.length > 0 ? Math.floor((claimed / all.length) * 100) : 0,
      totalPoints: this._totalPoints,
    };
  }

  // ==================== 称号系统 ====================

  /** 解锁称号 */
  unlockTitle(titleId: string): boolean {
    if (this._unlockedTitles.has(titleId)) return false;

    this._unlockedTitles.add(titleId);
    EventBus.emit(AchievementEvents.TitleUnlocked, titleId);

    console.log(`[AchievementManager] Title unlocked: ${titleId}`);
    return true;
  }

  /** 获取已解锁的称号列表 */
  getUnlockedTitles(): string[] {
    return Array.from(this._unlockedTitles);
  }

  /** 检查称号是否已解锁 */
  isTitleUnlocked(titleId: string): boolean {
    return this._unlockedTitles.has(titleId);
  }

  /** 获取当前装备的称号 */
  getEquippedTitle(): string | undefined {
    return this._equippedTitleId;
  }

  /** 装备称号 */
  equipTitle(titleId: string): boolean {
    if (!this._unlockedTitles.has(titleId)) return false;

    const oldTitleId = this._equippedTitleId;
    this._equippedTitleId = titleId;

    EventBus.emit(AchievementEvents.TitleEquipped, titleId, oldTitleId);
    return true;
  }

  /** 卸下称号 */
  unequipTitle(): void {
    const oldTitleId = this._equippedTitleId;
    this._equippedTitleId = undefined;

    if (oldTitleId) {
      EventBus.emit(AchievementEvents.TitleUnequipped, oldTitleId);
    }
  }

  // ==================== 存档相关 ====================

  /** 导出存档数据 */
  toSaveData(): IAchievementManagerSaveData {
    const achievements: IAchievementSaveData[] = [];
    for (const achievement of this._achievements.values()) {
      achievements.push(achievement.toSaveData());
    }

    return {
      achievements,
      totalPoints: this._totalPoints,
      unlockedTitles: Array.from(this._unlockedTitles),
      equippedTitleId: this._equippedTitleId,
    };
  }

  /** 从存档数据恢复 */
  loadSaveData(saveData: IAchievementManagerSaveData): void {
    if (!saveData) return;

    this._totalPoints = saveData.totalPoints || 0;
    this._unlockedTitles = new Set(saveData.unlockedTitles || []);
    this._equippedTitleId = saveData.equippedTitleId;

    if (saveData.achievements) {
      for (const achievementSave of saveData.achievements) {
        let achievement = this._achievements.get(achievementSave.id);
        if (!achievement) {
          // 从配置加载成就
          const config: any = ConfigLoader.instance.getConfigByTableNameAndKey(
            "achievement",
            achievementSave.id
          );
          if (config) {
            achievement = new Achievement(config);
            this._achievements.set(achievement.id, achievement);
          }
        }
        if (achievement) {
          achievement.loadSaveData(achievementSave);
        }
      }
    }
  }

  /** 从简化的成就 ID 列表恢复解锁状态 */
  loadUnlockedAchievementIds(achievementIds: string[]): void {
    if (!achievementIds || !Array.isArray(achievementIds)) return;

    console.log(`[AchievementManager] Loading unlocked achievements from IDs:`, achievementIds);

    for (const id of achievementIds) {
      const achievement = this._achievements.get(id);
      if (achievement && !achievement.isUnlocked) {
        // 设置所有目标为完成状态
        for (const obj of achievement.objectives) {
          achievement.setObjectiveProgress(obj.id, obj.count);
        }
        // 直接设置解锁状态，不触发事件（因为是从存档恢复）
        achievement.state = AchievementState.Unlocked;
        achievement.unlockedAt = Date.now();
        console.log(`[AchievementManager] Restored unlocked achievement: ${id}`);
      }
    }
  }

  /** 清空所有数据（用于测试或重置） */
  clear(): void {
    // 先移除事件监听器，防止重复注册
    this.unregisterEventListeners();

    this._achievements.clear();
    this._totalPoints = 0;
    this._unlockedTitles.clear();
    this._equippedTitleId = undefined;
    // 重置初始化标志，确保下次 init() 会重新加载成就
    this._initialized = false;
  }
}

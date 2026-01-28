import EventBus from "db://assets/hunter/utils/event-bus";
import { ConfigLoader } from "db://assets/hunter/utils/config-loader";
import { Quest, IQuestSaveData } from "./entities/Quest";
import { QuestEvents, QuestState, QuestType, QuestObjectiveType } from "../type";
import * as ExprEval from "expr-eval";

export interface IQuestManagerSaveData {
  /** 任务存档数据 */
  quests: IQuestSaveData[];
  /** 上次每日重置时间戳 */
  lastDailyResetTime: number;
  /** 上次每周重置时间戳 */
  lastWeeklyResetTime: number;
  /** 上次每月重置时间戳 */
  lastMonthlyResetTime: number;
}

export class QuestManager {
  private static _instance: QuestManager;

  /** 所有已加载的任务（包括配置和运行时状态） */
  private _quests: Map<string, Quest> = new Map();

  private _dailyQuestsLoaded: boolean = false;

  /** 上次每日重置时间 */
  private _lastDailyResetTime: number = 0;

  /** 上次每周重置时间 */
  private _lastWeeklyResetTime: number = 0;

  /** 上次每月重置时间 */
  private _lastMonthlyResetTime: number = 0;

  /** 是否已初始化 */
  private _initialized: boolean = false;

  static get instance(): QuestManager {
    if (!this._instance) this._instance = new QuestManager();
    return this._instance;
  }

  /** 初始化任务管理器 */
  init(): void {
    if (this._initialized) return;

    this.registerEventListeners();
    this._initialized = true;
  }


  /** 事件处理器引用（用于精确移除监听器） */
  private _onMonsterKilledHandler = (monsterId: string | number, count: number = 1) => {
    this.onMonsterKilled(monsterId, count);
  };
  private _onItemCollectedHandler = (itemId: string | number, count: number = 1) => {
    this.onItemCollected(itemId, count);
  };
  private _onBattleWonHandler = (battleId?: string | number) => {
    this.onBattleWon(battleId);
  };
  private _onLevelCompletedHandler = (levelId: string | number) => {
    this.onLevelCompleted(levelId);
  };
  private _onDialogCompletedHandler = (dialogId: string | number) => {
    this.onDialogCompleted(dialogId);
  };
  private _onSkillUsedHandler = (skillId: string | number, count: number = 1) => {
    this.onSkillUsed(skillId, count);
  };
  private _onPlayerLevelUpHandler = (newLevel: number) => {
    this.onPlayerLevelUp(newLevel);
  };
  private _onEquipmentEquippedHandler = (equipmentId: string | number) => {
    this.onEquipmentEquipped(equipmentId);
  };
  private _onInstanceCompletedHandler = (instanceId: string | number) => {
    this.onInstanceCompleted(instanceId);
  };
  private _onCurrencySpentHandler = (currencyType: string, amount: number) => {
    this.onCurrencySpent(currencyType, amount);
  };
  private _onPlayerLoginHandler = () => {
    this.onPlayerLogin();
  };
  private _onPvpBattleCompletedHandler = () => {
    this.onPvpBattleCompleted();
  };
  private _onGameSharedHandler = () => {
    this.onGameShared();
  };
  private _onInstanceExploredHandler = (instanceId?: string | number) => {
    this.onInstanceExplored(instanceId);
  };
  private _onTowerClimbedHandler = () => {
    this.onTowerClimbed();
  };
  private _onTutorialCompletedHandler = (targetId: string) => {
    this.onTutorialCompleted(targetId);
  };

  /** 注册事件监听器 */
  private registerEventListeners(): void {
    // 监听怪物击杀事件
    EventBus.on(QuestEvents.MonsterKilled, this._onMonsterKilledHandler);
    // 监听物品收集事件
    EventBus.on(QuestEvents.ItemCollected, this._onItemCollectedHandler);
    // 监听战斗胜利事件
    EventBus.on(QuestEvents.BattleWon, this._onBattleWonHandler);
    // 监听关卡完成事件
    EventBus.on(QuestEvents.LevelCompleted, this._onLevelCompletedHandler);
    // 监听对话完成事件
    EventBus.on(QuestEvents.DialogCompleted, this._onDialogCompletedHandler);
    // 监听技能使用事件
    EventBus.on(QuestEvents.SkillUsed, this._onSkillUsedHandler);
    // 监听玩家升级事件
    EventBus.on(QuestEvents.PlayerLevelUp, this._onPlayerLevelUpHandler);
    // 监听装备穿戴事件
    EventBus.on(QuestEvents.EquipmentEquipped, this._onEquipmentEquippedHandler);
    // 监听副本完成事件
    EventBus.on(QuestEvents.InstanceCompleted, this._onInstanceCompletedHandler);
    // 监听消费事件
    EventBus.on(QuestEvents.CurrencySpent, this._onCurrencySpentHandler);
    // 监听登录事件
    EventBus.on(QuestEvents.PlayerLogin, this._onPlayerLoginHandler);
    // 监听PVP切磋事件
    EventBus.on(QuestEvents.PvpBattleCompleted, this._onPvpBattleCompletedHandler);
    // 监听分享游戏事件
    EventBus.on(QuestEvents.GameShared, this._onGameSharedHandler);
    // 监听副本探索事件
    EventBus.on(QuestEvents.InstanceExplored, this._onInstanceExploredHandler);
    // 监听爬塔完成事件
    EventBus.on(QuestEvents.TowerClimbed, this._onTowerClimbedHandler);
    // 监听教程完成事件
    EventBus.on(QuestEvents.TutorialCompleted, this._onTutorialCompletedHandler);
  }

  /** 销毁时移除事件监听 */
  destroy(): void {
    // 使用 detach 精确移除本管理器的监听器，避免影响其他组件
    EventBus.detach(QuestEvents.MonsterKilled, this._onMonsterKilledHandler);
    EventBus.detach(QuestEvents.ItemCollected, this._onItemCollectedHandler);
    EventBus.detach(QuestEvents.BattleWon, this._onBattleWonHandler);
    EventBus.detach(QuestEvents.LevelCompleted, this._onLevelCompletedHandler);
    EventBus.detach(QuestEvents.DialogCompleted, this._onDialogCompletedHandler);
    EventBus.detach(QuestEvents.SkillUsed, this._onSkillUsedHandler);
    EventBus.detach(QuestEvents.PlayerLevelUp, this._onPlayerLevelUpHandler);
    EventBus.detach(QuestEvents.EquipmentEquipped, this._onEquipmentEquippedHandler);
    EventBus.detach(QuestEvents.InstanceCompleted, this._onInstanceCompletedHandler);
    EventBus.detach(QuestEvents.CurrencySpent, this._onCurrencySpentHandler);
    EventBus.detach(QuestEvents.PlayerLogin, this._onPlayerLoginHandler);
    EventBus.detach(QuestEvents.PvpBattleCompleted, this._onPvpBattleCompletedHandler);
    EventBus.detach(QuestEvents.GameShared, this._onGameSharedHandler);
    EventBus.detach(QuestEvents.InstanceExplored, this._onInstanceExploredHandler);
    EventBus.detach(QuestEvents.TowerClimbed, this._onTowerClimbedHandler);
    EventBus.detach(QuestEvents.TutorialCompleted, this._onTutorialCompletedHandler);
    this._initialized = false;
  }

  // ==================== 事件处理器 ====================

  private onMonsterKilled(monsterId: string | number, count: number = 1): void {
    this.updateProgressByType(QuestObjectiveType.KillMonster, monsterId, count);
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
    console.log("[QuestManager] onDialogCompleted:", dialogId);
    this.updateProgressByType(QuestObjectiveType.CompleteDialog, dialogId, 1);
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
    this.updateProgressByType(QuestObjectiveType.CompleteInstance, instanceId, 1);
  }

  private onCurrencySpent(currencyType: string, amount: number): void {
    this.updateProgressByType(QuestObjectiveType.SpendCurrency, currencyType, amount);
  }

  private onPlayerLogin(): void {
    // 先检查是否需要重置周期性任务（确保新的一天先重置任务再更新进度）
    this.checkAndResetPeriodicQuests();
    // 然后更新登录进度
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

  private onTowerClimbed(): void {
    this.updateProgressByType(QuestObjectiveType.ClimbTower, undefined, 1);
  }

  private onTutorialCompleted(targetId: string): void {
    if (!targetId) return;
    this.updateProgressByType(QuestObjectiveType.CompleteTutorial, targetId, 1);
  }

  /**
   * 更新 TriggerEvent 类型任务目标的进度
   * 此方法会匹配 targetId 和 extra 字段
   * @param targetId 事件标识符（如 "grade_promotion"）
   * @param extra 额外参数（如目标年级 2）
   */
  public updateTriggerEventProgress(targetId: string, extra?: any): void {
    if (!targetId) return;

    for (const quest of this._quests.values()) {
      if (!quest.isAccepted) continue;

      for (const objective of quest.objectives) {
        if (objective.type !== QuestObjectiveType.TriggerEvent) continue;
        if (String(objective.targetId) !== String(targetId)) continue;

        // 如果目标有 extra 要求，必须匹配
        if (objective.extra !== undefined && objective.extra !== null) {
          if (extra === undefined || extra === null) continue;
          if (String(objective.extra) !== String(extra)) continue;
        }

        // 更新进度
        quest.addObjectiveProgress(objective.id, 1);

        // 发送进度更新事件
        EventBus.emit(QuestEvents.QuestProgressUpdated, quest, objective.id, quest.getObjectiveProgress(objective.id));

        // 检查是否可以完成
        this.tryComplete(quest);
      }
    }
  }

  // ==================== 核心方法 ====================

  /** 根据目标类型更新进度 */
  private updateProgressByType(
    objectiveType: QuestObjectiveType,
    targetId: string | number | undefined,
    delta: number,
    absoluteValue?: number
  ): void {
    const eventHasTargetId =
      targetId !== undefined && targetId !== null && String(targetId) !== "";

    for (const quest of this._quests.values()) {
      if (!quest.isAccepted) continue;

      for (const objective of quest.objectives) {
        if (objective.type !== objectiveType) continue;

        const objectiveHasTargetId =
          objective.targetId !== undefined &&
          objective.targetId !== null &&
          String(objective.targetId) !== "";

        if (objectiveHasTargetId) {
          if (!eventHasTargetId) continue;
          if (String(objective.targetId) !== String(targetId)) continue;
        }

        // 更新进度
        if (absoluteValue !== undefined) {
          // 使用绝对值（如等级）
          quest.setObjectiveProgress(objective.id, absoluteValue);
        } else {
          quest.addObjectiveProgress(objective.id, delta);
        }

        // 发送进度更新事件
        EventBus.emit(QuestEvents.QuestProgressUpdated, quest, objective.id, quest.getObjectiveProgress(objective.id));

        // 检查是否可以完成
        this.tryComplete(quest);
      }
    }
  }

  /** 接受任务 */
  accept(questId: string): Quest | null {
    if (!questId) return null;

    let quest = this._quests.get(questId);
    if (!quest) {
      const config: any = ConfigLoader.instance.getConfigByTableNameAndKey("quest", questId);
      if (!config) return null;
      quest = config instanceof Quest ? config : new Quest(config);
      this._quests.set(questId, quest);
    }

    if (quest.state === QuestState.Completed && !quest.canRepeat) {
      return null;
    }

    // 如果是可重复任务且已完成，先重置
    if (quest.state === QuestState.Completed && quest.canRepeat) {
      if (quest.isDaily) {
        quest.resetForRepeat();
      } else {
        quest.reset();
      }
    }

    if (!quest.accept()) {
      return null;
    }

    EventBus.emit(QuestEvents.QuestAccepted, quest);
    return quest;
  }

  /** 更新任务进度（手动调用） */
  updateProgress(questId: string, objectiveId: string, delta: number = 1): void {
    const quest = this._quests.get(questId);
    if (!quest || !quest.isAccepted) return;

    quest.addObjectiveProgress(objectiveId, delta);
    EventBus.emit(QuestEvents.QuestProgressUpdated, quest, objectiveId, quest.getObjectiveProgress(objectiveId));
    this.tryComplete(quest);
  }

  /** 尝试完成任务 */
  tryComplete(quest: Quest): boolean {
    if (!quest.isAccepted) return false;
    if (!quest.checkAllObjectivesCompleted()) return false;

    quest.trySubmit();
    EventBus.emit(QuestEvents.QuestSubmittable, quest);

    // 如果是自动完成任务，直接完成
    if (quest.autoComplete) {
      return this.complete(quest.id);
    }

    return true;
  }

  /** 完成任务并发放奖励 */
  complete(questId: string, force: boolean = false): boolean {
    const quest = this._quests.get(questId);
    if (!quest) {
      console.warn(`[QuestManager] Quest not found: ${questId}`);
      return false;
    }

    if (!quest.complete(force)) {
      console.warn(`[QuestManager] Quest.complete failed for: ${questId}, state: ${quest.state}`);
      return false;
    }

    const shouldPrepareNextRepeat =
      quest.isDaily &&
      quest.repeatable &&
      quest.dailyLimit > 0 &&
      quest.dailyCompletedCount < quest.dailyLimit;

    if (shouldPrepareNextRepeat) {
      quest.prepareNextRepeat();
    }

    // 发放奖励
    this.grantRewards(quest);

    // 发送完成事件
    EventBus.emit(QuestEvents.QuestCompleted, quest);

    // 如果有战令经验，发送战令经验事件
    if (quest.battlePassExp > 0) {
      EventBus.emit(QuestEvents.BattlePassExpGained, quest.battlePassExp, quest.id);
    }

    // 触发后续任务
    this.triggerFollowUpQuests(quest);

    return true;
  }

  /** 发放任务奖励 */
  private grantRewards(quest: Quest): void {
    if (!quest.rewards || quest.rewards.length === 0) return;

    // 发送奖励事件，由外部系统处理具体的奖励发放
    EventBus.emit(QuestEvents.QuestRewardsGranted, quest, quest.rewards);
  }

  /** 触发后续任务 */
  private triggerFollowUpQuests(quest: Quest): void {
    if (!quest.followUpQuests || quest.followUpQuests.length === 0) return;

    for (const followUpId of quest.followUpQuests) {
      const followUpQuest = this.getOrLoadQuest(followUpId);
      if (followUpQuest && followUpQuest.autoAccept) {
        this.accept(followUpId);
      }
    }
  }

  /** 获取或加载任务 */
  private getOrLoadQuest(questId: string): Quest | null {
    let quest = this._quests.get(questId);
    if (!quest) {
      const config: any = ConfigLoader.instance.getConfigByTableNameAndKey("quest", questId);
      if (!config) return null;
      quest = config instanceof Quest ? config : new Quest(config);
      this._quests.set(questId, quest);
    }
    return quest;
  }

  /** 获取任务 */
  getQuest(questId: string): Quest | undefined {
    return this._quests.get(questId);
  }

  /** 获取所有任务 */
  getAllQuests(): Quest[] {
    return Array.from(this._quests.values());
  }

  /** 获取指定类型的任务 */
  getQuestsByType(type: QuestType): Quest[] {
    return this.getAllQuests().filter(q => q.type === type);
  }

  /** 获取所有每日任务 */
  getDailyQuests(): Quest[] {
    return this.getQuestsByType(QuestType.Daily);
  }

  /** 获取所有已接受的任务 */
  getAcceptedQuests(): Quest[] {
    return this.getAllQuests().filter(q => q.isAccepted);
  }

  /** 获取所有可提交的任务 */
  getSubmittableQuests(): Quest[] {
    return this.getAllQuests().filter(q => q.isSubmittable);
  }

  // ==================== 周期性任务重置 ====================

  /** 检查并重置周期性任务 */
  checkAndResetPeriodicQuests(): void {
    const now = Date.now();

    // 检查每日重置
    if (this.shouldResetDaily(now)) {
      this.resetDailyQuests();
      this._lastDailyResetTime = this.getTodayResetTime();
    }

    // 检查每周重置
    if (this.shouldResetWeekly(now)) {
      this.resetWeeklyQuests();
      this._lastWeeklyResetTime = this.getWeekResetTime();
    }

    // 检查每月重置
    if (this.shouldResetMonthly(now)) {
      this.resetMonthlyQuests();
      this._lastMonthlyResetTime = this.getMonthResetTime();
    }
  }

  /** 是否应该重置每日任务 */
  private shouldResetDaily(now: number): boolean {
    const todayReset = this.getTodayResetTime();
    return this._lastDailyResetTime < todayReset && now >= todayReset;
  }

  /** 是否应该重置每周任务 */
  private shouldResetWeekly(now: number): boolean {
    const weekReset = this.getWeekResetTime();
    return this._lastWeeklyResetTime < weekReset && now >= weekReset;
  }

  /** 是否应该重置每月任务 */
  private shouldResetMonthly(now: number): boolean {
    const monthReset = this.getMonthResetTime();
    return this._lastMonthlyResetTime < monthReset && now >= monthReset;
  }

  /** 获取今天0点的时间戳 */
  private getTodayResetTime(): number {
    const now = new Date();
    const reset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return reset.getTime();
  }

  /** 获取本周一0点的时间戳 */
  private getWeekResetTime(): number {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 周日为0，需要回到上周一
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
    return monday.getTime();
  }

  /** 获取本月1号0点的时间戳 */
  private getMonthResetTime(): number {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return firstDay.getTime();
  }

  /** 重置每日任务 */
  private resetDailyQuests(): void {
    const dailyQuests = this.getDailyQuests();
    for (const quest of dailyQuests) {
      quest.reset();
      // 如果是自动接受的任务，自动接受
      if (quest.autoAccept) {
        quest.accept();
      }
    }
    EventBus.emit(QuestEvents.DailyQuestsReset, dailyQuests);
  }

  /** 重置每周任务 */
  private resetWeeklyQuests(): void {
    const weeklyQuests = this.getQuestsByType(QuestType.Weekly);
    for (const quest of weeklyQuests) {
      quest.reset();
      if (quest.autoAccept) {
        quest.accept();
      }
    }
    EventBus.emit(QuestEvents.WeeklyQuestsReset, weeklyQuests);
  }

  /** 重置每月任务 */
  private resetMonthlyQuests(): void {
    const monthlyQuests = this.getQuestsByType(QuestType.Monthly);
    for (const quest of monthlyQuests) {
      quest.reset();
      if (quest.autoAccept) {
        quest.accept();
      }
    }
    EventBus.emit(QuestEvents.MonthlyQuestsReset, monthlyQuests);
  }

  /** 加载所有每日任务配置 */
  loadDailyQuests(): void {
    if (this._dailyQuestsLoaded) return;
    const allConfigs = ConfigLoader.instance.getConfigsByTableName("quest") as any[];
    if (!allConfigs) return;

    for (const config of allConfigs) {
      if (config.type === QuestType.Daily || config.type === "daily") {
        const questId = String(config.id);
        let quest = this._quests.get(questId);
        if (!quest) {
          quest = new Quest(config);
          this._quests.set(quest.id, quest);
        }
        if (quest.autoAccept && quest.state === QuestState.NotAccepted) quest.accept();
      }
    }
    this._dailyQuestsLoaded = true;
  }

  /** 加载所有主线任务配置 */
  loadMainQuests(): void {
    const allConfigs = ConfigLoader.instance.getConfigsByTableName("quest") as any[];
    if (!allConfigs) return;

    // 获取当前存档上下文，用于条件判断
    const context = this.buildAutoAcceptContext();
    console.log(`[QuestManager] loadMainQuests context:`, JSON.stringify(context));

    // 如果没有选择存档，不自动接受主线任务（只加载配置）
    const hasRecord = context.hasRecord;

    for (const config of allConfigs) {
      if (config.type === QuestType.Main || config.type === "main") {
        const questId = String(config.id);

        // 检查任务是否已存在（从存档恢复）
        let existingQuest = this._quests.get(questId);
        let quest: Quest;

        if (existingQuest) {
          // 任务已从存档加载
          quest = existingQuest;
          // 如果已完成或已接取，跳过
          if (quest.isCompleted || quest.isAccepted) {
            console.log(`[QuestManager] Main quest ${questId} already ${quest.isCompleted ? 'completed' : 'accepted'}, skipping`);
            continue;
          }
          // 如果没有存档，跳过自动接受逻辑
          if (!hasRecord) {
            continue;
          }
          // 任务存在但未接取，检查是否可以自动接取
          if (quest.autoAccept) {
            // 检查前置任务是否完成（与新任务逻辑一致）
            const prereqsMet = quest.prerequisiteQuests.length === 0 || quest.prerequisiteQuests.every(prereqId => {
              const prereqQuest = this._quests.get(prereqId);
              return prereqQuest && prereqQuest.isCompleted;
            });

            if (!prereqsMet) {
              console.log(`[QuestManager] Existing quest ${quest.id} prerequisite not met, skipping auto-accept`);
              continue;
            }

            // 检查 autoAcceptCondition 条件
            const conditionMet = this.checkAutoAcceptCondition(quest.autoAcceptCondition, context);
            console.log(`[QuestManager] Checking existing quest ${quest.id}: autoAccept=${quest.autoAccept}, prereqsMet=${prereqsMet}, condition="${quest.autoAcceptCondition || 'none'}", context.main=${context.main}, conditionMet=${conditionMet}`);
            if (conditionMet) {
              const accepted = quest.accept();
              console.log(`[QuestManager] Auto-accept existing main quest: ${quest.id}, condition: ${quest.autoAcceptCondition || 'none'}, success: ${accepted}`);
              if (accepted) {
                EventBus.emit(QuestEvents.QuestAccepted, quest);
              }
            }
          } else {
            console.log(`[QuestManager] Existing quest ${quest.id} has autoAccept=false, skipping`);
          }
        } else {
          // 任务不存在，从配置创建
          quest = new Quest(config);
          this._quests.set(quest.id, quest);

          // 调试：打印完整的config对象
          console.log(`[QuestManager] New quest config keys for ${quest.id}:`, Object.keys(config).join(', '));

          // 如果没有存档，跳过自动接受逻辑
          if (!hasRecord) {
            continue;
          }

          // 自动接受的主线任务且满足前置条件
          if (quest.autoAccept && quest.state === QuestState.NotAccepted) {
            // 检查前置任务是否完成
            const prereqsMet = quest.prerequisiteQuests.every(prereqId => {
              const prereqQuest = this._quests.get(prereqId);
              return prereqQuest && prereqQuest.isCompleted;
            });

            // 检查 autoAcceptCondition 条件 - 内联调试
            let conditionMet = true;
            const conditionStr = quest.autoAcceptCondition;
            console.log(`[QuestManager] DEBUG: conditionStr="${conditionStr}", typeof=${typeof conditionStr}, length=${conditionStr?.length}`);
            if (conditionStr && conditionStr.trim()) {
              try {
                const parser = new (ExprEval as any).default.Parser();
                console.log(`[QuestManager] DEBUG: About to parse condition: "${conditionStr}"`);
                const expr = parser.parse(conditionStr);
                console.log(`[QuestManager] DEBUG: Parsed expression, about to evaluate with context.main=${context.main}`);
                const result = expr.evaluate(context);
                console.log(`[QuestManager] DEBUG: result=${result}, typeof=${typeof result}`);
                conditionMet = Boolean(result);
              } catch (e) {
                console.warn(`[QuestManager] DEBUG: Failed to evaluate condition "${conditionStr}"`, e);
                conditionMet = true;
              }
            }

            console.log(`[QuestManager] Checking new quest ${quest.id}: autoAccept=${quest.autoAccept}, prereqsMet=${prereqsMet}, prereqsLength=${quest.prerequisiteQuests.length}, condition="${quest.autoAcceptCondition || 'none'}", context.main=${context.main}, conditionMet=${conditionMet}`);

            if ((prereqsMet || quest.prerequisiteQuests.length === 0) && conditionMet) {
              const accepted = quest.accept();
              console.log(`[QuestManager] Auto-accept main quest: ${quest.id}, success: ${accepted}`);
              if (accepted) {
                EventBus.emit(QuestEvents.QuestAccepted, quest);
              }
            }
          }
        }
      }
    }
  }

  /** 构建自动接受条件的上下文 */
  private buildAutoAcceptContext(): Record<string, any> {
    // 获取存档数据
    let content: any = {};
    let hasRecord = false;
    try {
      // 尝试从 tools.storage 获取当前存档
      const storageModule = (globalThis as any).tools?.storage;
      if (storageModule?.currentRecord?.content) {
        content = storageModule.currentRecord.content;
        hasRecord = true;
      }
    } catch { }

    // 统计已完成的主线任务数量
    let completedMainQuests = 0;
    this._quests.forEach(quest => {
      if (quest.type === QuestType.Main && quest.isCompleted) {
        completedMainQuests++;
      }
    });

    return {
      // 是否已选择存档
      hasRecord,
      // 主线进度
      main: content.main || 0,
      mainNodeId: content.mainNodeId || "",
      // 已完成的主线任务数量
      completedMainQuests,
      // 玩家等级
      playerLevel: content.level || 1,
      // 版本信息（可用于版本更新判断）
      version: (globalThis as any).GAME_VERSION || "1.0.0",
      // 时间相关变量
      daysSinceQuestCompleted: (questId: string) => this.getDaysSinceQuestCompleted(questId),
      hoursSinceQuestCompleted: (questId: string) => this.getHoursSinceQuestCompleted(questId),
      currentDay: this.getCurrentDay(),
    };
  }

  /** 获取任务完成后经过的天数 */
  private getDaysSinceQuestCompleted(questId: string): number {
    const quest = this._quests.get(questId);
    if (!quest || !quest.isCompleted || !quest.completedAt) {
      return -1; // 任务未完成，返回 -1
    }
    const completedDate = new Date(quest.completedAt);
    const today = new Date();
    // 计算天数差（使用日期比较，不是精确24小时）
    const completedDay = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
    const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = currentDay.getTime() - completedDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /** 获取任务完成后经过的小时数 */
  private getHoursSinceQuestCompleted(questId: string): number {
    const quest = this._quests.get(questId);
    if (!quest || !quest.isCompleted || !quest.completedAt) {
      return -1; // 任务未完成，返回 -1
    }
    const completedDate = new Date(quest.completedAt);
    const now = new Date();
    const diffTime = now.getTime() - completedDate.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    return diffHours;
  }

  /** 获取当天日期字符串 */
  private getCurrentDay(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /** 检查 autoAcceptCondition 条件 */
  private checkAutoAcceptCondition(condition: string | undefined, context: Record<string, any>): boolean {
    // 如果没有条件，默认满足
    if (!condition || !condition.trim()) {
      console.log(`[QuestManager] checkAutoAcceptCondition: no condition, returning true`);
      return true;
    }

    try {
      // 使用 expr-eval 解析条件表达式
      const parser = new (ExprEval as any).default.Parser();
      const expr = parser.parse(condition);
      const result = expr.evaluate(context);
      console.log(`[QuestManager] checkAutoAcceptCondition: condition="${condition}", result=${result}, type=${typeof result}`);
      return Boolean(result);
    } catch (e) {
      console.warn(`[QuestManager] Failed to evaluate autoAcceptCondition: ${condition}`, e);
      return true; // 解析失败时默认满足条件
    }
  }

  // ==================== 存档相关 ====================

  /** 导出存档数据 */
  toSaveData(): IQuestManagerSaveData {
    const quests: IQuestSaveData[] = [];
    for (const quest of this._quests.values()) {
      quests.push(quest.toSaveData());
    }

    return {
      quests,
      lastDailyResetTime: this._lastDailyResetTime,
      lastWeeklyResetTime: this._lastWeeklyResetTime,
      lastMonthlyResetTime: this._lastMonthlyResetTime,
    };
  }

  /** 从存档数据恢复 */
  loadSaveData(saveData: IQuestManagerSaveData): void {
    if (!saveData) return;

    this._lastDailyResetTime = saveData.lastDailyResetTime || 0;
    this._lastWeeklyResetTime = saveData.lastWeeklyResetTime || 0;
    this._lastMonthlyResetTime = saveData.lastMonthlyResetTime || 0;

    if (saveData.quests) {
      for (const questSave of saveData.quests) {
        let quest = this._quests.get(questSave.id);
        if (!quest) {
          // 从配置加载任务
          const config: any = ConfigLoader.instance.getConfigByTableNameAndKey("quest", questSave.id);
          if (config) {
            quest = config instanceof Quest ? config : new Quest(config);
            this._quests.set(quest.id, quest);
          }
        }
        if (quest) {
          quest.loadSaveData(questSave);
        }
      }
    }

    // 检查是否需要重置周期性任务
    this.checkAndResetPeriodicQuests();
  }

  /** 清空所有数据（用于测试或重置） */
  clear(): void {
    // 先移除事件监听器，防止重复注册
    this.destroy();

    this._quests.clear();
    this._dailyQuestsLoaded = false;
    this._lastDailyResetTime = 0;
    this._lastWeeklyResetTime = 0;
    this._lastMonthlyResetTime = 0;
    // _initialized 已在 destroy() 中被置为 false
  }
}

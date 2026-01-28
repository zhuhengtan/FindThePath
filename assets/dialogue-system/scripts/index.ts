// 管理器
import { DialogueManager } from "./DialogueManager";
import { DialogueUIManager, initDialogueUIManager } from "./DialogueUIManager";
import { QuestManager, IQuestManagerSaveData } from "./QuestManager";
import { AchievementManager, IAchievementManagerSaveData } from "./AchievementManager";
import { DailyActivityManager, IDailyActivitySaveData } from "./DailyActivityManager";


// 实体类导出
export { Dialogue, DialogueType } from "./entities/Dialogue";
export { DialogueNode } from "./entities/DialogueNode";
export { Actor } from "./entities/Actor";
export { Quest } from "./entities/Quest";
export type { IQuestData, IQuestSaveData } from "./entities/Quest";
export { QuestObjective } from "./entities/QuestObjective";
export type { IQuestObjective } from "./entities/QuestObjective";
export { QuestReward } from "./entities/QuestReward";
export type { IQuestReward } from "./entities/QuestReward";
export { Achievement } from "./entities/Achievement";
export type { IAchievementData, IAchievementSaveData } from "./entities/Achievement";
export { AchievementObjective } from "./entities/AchievementObjective";
export type { IAchievementObjective } from "./entities/AchievementObjective";
export { AchievementReward } from "./entities/AchievementReward";
export type { IAchievementReward } from "./entities/AchievementReward";
export { AchievementStage } from "./entities/AchievementStage";
export type { IAchievementStage } from "./entities/AchievementStage";
export { Title } from "./entities/Title";
export type { ITitleData, ITitleEffect } from "./entities/Title";

// 管理器类导出
export { DialogueManager } from "./DialogueManager";
export type { IDialogueProgressData } from "./DialogueManager";
export { DialogueUIManager, initDialogueUIManager } from "./DialogueUIManager";
export { QuestManager } from "./QuestManager";
export type { IQuestManagerSaveData } from "./QuestManager";
export { AchievementManager } from "./AchievementManager";
export type { IAchievementManagerSaveData } from "./AchievementManager";
export { DailyActivityManager } from "./DailyActivityManager";
export type { IActivityRewardConfig, IDailyActivitySaveData } from "./DailyActivityManager";

// 管理器单例
export const dialogueManager = DialogueManager.instance;
export const dialogueUIManager = DialogueUIManager.instance;
export const questManager = QuestManager.instance;
export const achievementManager = AchievementManager.instance;
export const dailyActivityManager = DailyActivityManager.instance;

// ==================== 统一初始化接口 ====================

let _initialized = false;

/**
 * 对话系统存档数据格式
 */
export interface IDialogSystemSaveData {
  /** 任务存档数据 */
  quests?: IQuestManagerSaveData;
  /** 成就存档数据 */
  achievement?: IAchievementManagerSaveData;
  /** 每日活动存档数据 */
  dailyActivity?: IDailyActivitySaveData;
}

/**
 * 初始化并加载对话系统（统一入口）
 * 
 * 调用顺序：
 * 1. 初始化管理器
 * 2. 从存档加载数据（确保已有任务/成就状态恢复）
 * 3. 加载任务配置（会跳过已存在的任务）
 * 
 * @param saveData 存档数据（可选）
 */
export function initAndLoadDialogSystem(saveData?: IDialogSystemSaveData): void {
  // 防止重复初始化
  if (_initialized) {
    if (saveData) {
      loadDialogSystemSaveData(saveData);
    }
    return;
  }
  _initialized = true;

  console.log("[DialogSystem] Initializing...");

  // 1. 初始化管理器
  questManager.init();
  achievementManager.init();
  dailyActivityManager.init();

  // 2. 从存档加载数据
  if (saveData) {
    loadDialogSystemSaveData(saveData);
  }

  // 注意：任务配置的加载（loadDailyQuests/loadMainQuests）应由业务层调用
  console.log("[DialogSystem] Initialized successfully");
}

/**
 * 重置初始化状态（用于测试或切换存档）
 */
export function resetDialogSystem(): void {
  _initialized = false;
  questManager.clear();
  achievementManager.clear();
  dailyActivityManager.clear();
  console.log("[DialogSystem] Reset");
}

/**
 * 检查是否已初始化
 */
export function isDialogSystemInitialized(): boolean {
  return _initialized;
}

/**
 * 初始化对话系统（仅初始化管理器，不加载数据）
 * @deprecated 请使用 initAndLoadDialogSystem
 */
export function initDialogSystem(): void {
  questManager.init();
  achievementManager.init();
  dailyActivityManager.init();
}

/**
 * 销毁对话系统
 * 移除所有事件监听器
 */
export function destroyDialogSystem(): void {
  _initialized = false;
  questManager.destroy();
  achievementManager.destroy();
  dailyActivityManager.destroy();
}

/**
 * 获取所有系统的存档数据
 */
export function getDialogSystemSaveData(): IDialogSystemSaveData {
  return {
    quests: questManager.toSaveData(),
    achievement: achievementManager.toSaveData(),
    dailyActivity: dailyActivityManager.toSaveData(),
  };
}

/**
 * 从存档数据恢复所有系统（内部使用，不加载配置）
 */
function loadDialogSystemSaveData(saveData: IDialogSystemSaveData): void {
  console.log("[DialogSystem] Loading save data...", saveData);

  // 加载任务数据（新格式：IQuestManagerSaveData）
  if (saveData.quests && Array.isArray(saveData.quests.quests)) {
    console.log("[DialogSystem] Loading quests:", saveData.quests.quests.length, "quests");
    console.log("[DialogSystem] Quest states:", saveData.quests.quests.map((q: any) => `${q.id}: ${q.state}`));
    questManager.loadSaveData(saveData.quests);
  } else {
    console.warn("[DialogSystem] No valid quests data found in saveData");
  }

  // 加载成就数据
  if (saveData.achievement) {
    console.log("[DialogSystem] Loading achievements:", saveData.achievement.achievements?.length || 0, "achievements");
    achievementManager.loadSaveData(saveData.achievement);
  } else {
    console.warn("[DialogSystem] No achievement data found in saveData");
  }

  // 加载贡献值数据
  if (saveData.dailyActivity) {
    dailyActivityManager.loadSaveData(saveData.dailyActivity);
  }

  console.log("[DialogSystem] Save data loaded");
}

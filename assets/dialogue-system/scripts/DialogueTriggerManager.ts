import { ConfigLoader } from "db://assets/hunter/utils/config-loader";
import { Dialogue } from "./entities/Dialogue";
import * as Parser from "expr-eval";
import { dialogueManager, questManager, achievementManager } from "./index";

/**
 * 剧情触发管理器
 * 负责根据触发场景、时机以及玩家当前状态，判断是否触发某段剧情
 */
export class DialogueTriggerManager {
  private static _instance: DialogueTriggerManager;
  private _parser: any;
  private _viewedDialogs: Set<number> = new Set();

  static get instance(): DialogueTriggerManager {
    if (!this._instance) this._instance = new DialogueTriggerManager();
    return this._instance;
  }

  constructor() {
    this._parser = new (Parser as any).default.Parser();
  }

  /**
   * 标记对话已观看（用于支线对话判重）
   */
  public markDialogViewed(dialogId: number): void {
    this._viewedDialogs.add(dialogId);
  }

  /**
   * 检查对话是否已观看
   */
  public isDialogViewed(dialogId: number): boolean {
    return this._viewedDialogs.has(dialogId);
  }

  /**
   * 加载已观看对话列表（从存档恢复）
   */
  public loadViewedDialogs(viewedDialogs: number[]): void {
    this._viewedDialogs = new Set(viewedDialogs || []);
  }

  /**
   * 导出已观看对话列表（用于存档）
   */
  public getViewedDialogs(): number[] {
    return Array.from(this._viewedDialogs);
  }

  /**
   * 判断是否应该触发某段剧情
   * @param scene 触发场景 (e.g. "Main", "Battle", "Instance")
   * @param timing 触发时机 (e.g. "OnEnter", "OnWin", "OnLevelUp")
   * @param trigger 额外触发上下文
   * @returns 满足条件的第一个 Dialog 对象，如果没有则返回 null
   */
  public shouldTriggerDialogue(
    scene: string,
    timing: string,
    trigger?: Record<string, any>
  ): Dialogue | null {
    // 0. 如果对话正在等待战斗结果，不触发新对话
    if (dialogueManager?.isWaitingForBattle) {
      return null;
    }

    // 1. 获取所有配置的 Dialog
    const allDialogs = ConfigLoader.instance.getConfigsByTableName("dialogue") as Dialogue[];
    if (!allDialogs) return null;

    // 2. 遍历所有 Dialog
    for (const dialog of allDialogs) {
      // 2.1 检查支线是否已观看
      if (dialog.type === "sub" && this._viewedDialogs.has(dialog.id)) {
        continue;
      }

      // 2.2 检查条件
      const condition = dialog.condition;
      if (!condition || !condition.trim()) {
        // 如果没有条件，直接触发
        this.startDialog(dialog);
        return new Dialogue(dialog);
      }

      // 2.3 解析表达式
      if (this.checkCondition(condition, scene, timing, trigger)) {
        this.startDialog(dialog);
        return new Dialogue(dialog);
      }
    }

    return null;
  }

  /**
   * 启动对话
   */
  private startDialog(dialog: Dialogue): void {
    (dialogueManager as any)?.start(dialog.id);
  }

  /**
   * 检查条件是否满足
   */
  private checkCondition(
    expression: string,
    scene: string,
    timing: string,
    trigger?: Record<string, any>
  ): boolean {
    try {
      const context = this.buildContext(scene, timing, trigger);
      const expr = this._parser.parse(expression);
      return !!expr.evaluate(context);
    } catch (e) {
      console.warn("[DialogueTriggerManager] Failed to evaluate condition:", expression, e);
      return false;
    }
  }

  /**
   * 构建表达式上下文
   */
  private buildContext(
    scene: string,
    timing: string,
    trigger?: Record<string, any>
  ): any {
    return {
      // 任务系统 - 直接从 questManager 读取
      quest: {
        // 检查任务是否正在进行中
        isActive: (id: string | number) => {
          const quest = questManager.getQuest(String(id));
          return quest?.isAccepted ?? false;
        },
        // 检查任务是否已完成
        isCompleted: (id: string | number) => {
          const quest = questManager.getQuest(String(id));
          return quest?.isCompleted ?? false;
        },
        // 检查任务是否可提交
        isSubmittable: (id: string | number) => {
          const quest = questManager.getQuest(String(id));
          return quest?.isSubmittable ?? false;
        },
        // 获取任务进度
        getProgress: (questId: string | number, objectiveId: string) => {
          const quest = questManager.getQuest(String(questId));
          return quest?.getObjectiveProgress(objectiveId) ?? 0;
        },
      },

      // 成就系统 - 直接从 achievementManager 读取
      achievement: {
        has: (id: string | number) => {
          const achievement = achievementManager.getAchievement(String(id));
          return achievement?.isUnlocked ?? false;
        },
        isClaimed: (id: string | number) => {
          const achievement = achievementManager.getAchievement(String(id));
          return achievement?.isClaimed ?? false;
        },
      },

      // 辅助函数
      Math: Math,
      scene,
      timing,

      // trigger 对象展开
      ...(trigger || {}),
      trigger: trigger || {},
    };
  }

  /**
   * 清空状态
   */
  public clear(): void {
    this._viewedDialogs.clear();
  }
}

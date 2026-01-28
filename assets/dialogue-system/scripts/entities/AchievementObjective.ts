import { QuestObjectiveType } from "../../type";

/** 成就目标配置接口 */
export interface IAchievementObjective {
  /** 目标唯一ID */
  id: string;
  /** 所属成就ID */
  achievementId?: string;
  /** 目标类型（复用 QuestObjectiveType） */
  type: QuestObjectiveType;
  /** 目标描述 */
  description?: string;
  /** 目标数量 */
  targetCount: number;
  /** 目标参数（如特定怪物ID、物品ID等） */
  targetId?: string | number;
  /** 额外参数 */
  params?: Record<string, any>;
  /** 排序顺序 */
  sortOrder?: number;
}

/**
 * 成就目标类
 * 复用任务系统的目标类型，用于定义成就的完成条件
 */
export class AchievementObjective implements IAchievementObjective {
  id: string;
  achievementId: string;
  type: QuestObjectiveType;
  description: string;
  targetCount: number;
  targetId: string | number;
  params: Record<string, any>;
  sortOrder: number;

  constructor(data: IAchievementObjective | any) {
    this.id = data.id || "";
    this.achievementId = data.achievementId || "";
    
    // 处理枚举类型，可能是字符串或枚举对象
    if (typeof data.type === "object" && data.type !== null) {
      this.type = (data.type as any).key || QuestObjectiveType.KillMonster;
    } else {
      this.type = data.type || QuestObjectiveType.KillMonster;
    }
    
    this.description = data.description || "";
    // 支持 targetCount 或 count 字段
    this.targetCount = data.targetCount ?? data.count ?? 1;
    this.targetId = data.targetId ?? "";
    this.params = data.params || {};
    this.sortOrder = data.sortOrder ?? 0;
  }

  /** count 别名，方便访问 */
  get count(): number {
    return this.targetCount;
  }

  set count(value: number) {
    this.targetCount = value;
  }

  /**
   * 从配置数组解析目标列表
   * 支持格式:
   * - 对象数组: [{id, type, targetCount, ...}, ...]
   * - 简化数组: [["id", "type", targetCount, "targetId"], ...]
   */
  static parseObjectives(objectives: any, achievementId?: string): AchievementObjective[] {
    if (!objectives) return [];
    if (!Array.isArray(objectives)) return [];
    
    return objectives.map((obj, index) => {
      if (Array.isArray(obj)) {
        // 简化数组格式: [id, type, targetCount, targetId]
        return new AchievementObjective({
          id: obj[0] || `obj_${index}`,
          type: obj[1] || QuestObjectiveType.KillMonster,
          targetCount: obj[2] ?? 1,
          targetId: obj[3] ?? "",
          description: obj[4] || "",
          achievementId: achievementId,
        });
      } else {
        // 对象格式
        return new AchievementObjective({
          ...obj,
          achievementId: achievementId || obj.achievementId,
        });
      }
    });
  }

  /**
   * 检查目标是否匹配给定的事件参数
   * @param objectiveType 目标类型
   * @param targetId 目标ID（可选）
   * @returns 是否匹配
   */
  matches(objectiveType: QuestObjectiveType, targetId?: string | number): boolean {
    if (this.type !== objectiveType) return false;
    
    // 如果目标有特定ID要求，检查是否匹配
    if (this.targetId && targetId !== undefined) {
      return String(this.targetId) === String(targetId);
    }
    
    // 没有特定ID要求，或者事件没有提供ID，则匹配
    return true;
  }
}

import { QuestObjectiveType } from "../../type";

export interface IQuestObjective {
  /** 目标唯一ID */
  id: string;
  /** 所属任务ID */
  questId?: string;
  /** 目标类型 */
  type: QuestObjectiveType;
  /** 目标描述 */
  description: string;
  /** 目标数量 */
  targetCount: number;
  /** 目标参数（如特定怪物ID、物品ID等） */
  targetId?: string | number;
  /** 额外参数 */
  params?: Record<string, any>;
  /** 是否可选目标 */
  optional?: boolean;
  /** 排序顺序 */
  sortOrder?: number;
  /** 简单的额外数据 */
  extra?: any;
}

export class QuestObjective implements IQuestObjective {
  id: string;
  questId: string;
  type: QuestObjectiveType;
  description: string;
  targetCount: number;
  targetId: string | number;
  params: Record<string, any>;
  optional: boolean;
  sortOrder: number;
  extra: any;

  constructor(data: IQuestObjective | any) {
    this.id = data.id;
    this.questId = data.questId || "";
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
    this.optional = data.optional ?? false;
    this.sortOrder = data.sortOrder ?? 0;
    this.extra = data.extra;
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
   * - 简化数组: [[id, type, targetCount, targetId, description|extra], ...]
   */
  static parseObjectives(objectives: any, questId?: string): QuestObjective[] {
    if (!objectives) return [];
    if (!Array.isArray(objectives)) return [];

    return objectives.map((obj, index) => {
      if (Array.isArray(obj)) {
        // 简化数组格式: [id, type, targetCount, targetId, description|extra]
        // 第5个参数如果不是字符串，则认为是 extra 数据而不是 description
        let description = "";
        let extra = undefined;

        if (obj[4] !== undefined) {
          if (typeof obj[4] === 'string') {
            description = obj[4];
          } else {
            extra = obj[4];
          }
        }

        return new QuestObjective({
          id: obj[0] || `obj_${index}`,
          type: obj[1] || QuestObjectiveType.KillMonster,
          targetCount: obj[2] ?? 1,
          targetId: obj[3] ?? "",
          description: description,
          extra: extra,
          questId: questId,
        });
      } else {
        // 对象格式
        return new QuestObjective({
          ...obj,
          questId: questId || obj.questId,
        });
      }
    });
  }
}
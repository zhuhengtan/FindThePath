import { AchievementReward, IAchievementReward } from "./AchievementReward";

/** 成就阶段配置接口 */
export interface IAchievementStage {
  /** 阶段ID */
  id: string;
  /** 阶段序号（1, 2, 3...） */
  stageIndex: number;
  /** 阶段名称后缀（如 I, II, III） */
  stageSuffix: string;
  /** 该阶段的目标数量 */
  targetCount: number;
  /** 该阶段的奖励 */
  rewards: IAchievementReward[];
  /** 该阶段解锁的称号ID（可选） */
  titleId?: string;
  /** 该阶段的成就点数（可选） */
  points?: number;
}

/**
 * 成就阶段类
 * 用于阶段型成就，每个阶段有独立的目标数量和奖励
 */
export class AchievementStage implements IAchievementStage {
  id: string;
  stageIndex: number;
  stageSuffix: string;
  targetCount: number;
  rewards: AchievementReward[];
  titleId: string;
  points: number;

  constructor(data: IAchievementStage | any) {
    this.id = data.id || "";
    this.stageIndex = data.stageIndex ?? 1;
    this.stageSuffix = data.stageSuffix || this.getDefaultSuffix(this.stageIndex);
    this.targetCount = data.targetCount ?? 1;
    this.rewards = AchievementReward.parseRewards(data.rewards);
    this.titleId = data.titleId || "";
    this.points = data.points ?? 0;
  }

  /**
   * 获取默认的阶段后缀（罗马数字）
   */
  private getDefaultSuffix(index: number): string {
    const suffixes = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    if (index >= 1 && index <= 10) {
      return suffixes[index - 1];
    }
    return String(index);
  }

  /**
   * 检查阶段是否完成
   * @param currentProgress 当前进度
   */
  isCompleted(currentProgress: number): boolean {
    return currentProgress >= this.targetCount;
  }

  /**
   * 获取阶段进度百分比
   * @param currentProgress 当前进度
   */
  getProgressPercent(currentProgress: number): number {
    if (this.targetCount <= 0) return 100;
    return Math.min(100, Math.floor((currentProgress / this.targetCount) * 100));
  }

  /**
   * 从配置数组解析阶段列表
   * 支持格式:
   * - 对象数组: [{id, stageIndex, stageSuffix, targetCount, rewards, titleId}, ...]
   */
  static parseStages(stages: any): AchievementStage[] {
    if (!stages) return [];
    if (!Array.isArray(stages)) return [];
    
    return stages
      .map(s => new AchievementStage(s))
      .sort((a, b) => a.stageIndex - b.stageIndex);
  }

  /**
   * 获取阶段的显示名称
   * @param baseName 成就基础名称
   */
  getDisplayName(baseName: string): string {
    return `${baseName} ${this.stageSuffix}`;
  }
}

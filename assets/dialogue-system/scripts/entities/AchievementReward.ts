import { AchievementRewardType } from "../../type";

/** 成就奖励配置接口 */
export interface IAchievementReward {
  /** 奖励类型 */
  type: AchievementRewardType;
  /** 奖励ID（物品ID、称号ID等） */
  rewardId?: string | number;
  /** 奖励数量 */
  count: number;
  /** 额外参数 */
  params?: Record<string, any>;
}

/**
 * 成就奖励类
 * 支持多种奖励类型：物品、经验、战令积分、称号、头像框、成就点数
 */
export class AchievementReward implements IAchievementReward {
  type: AchievementRewardType;
  rewardId: string | number;
  count: number;
  params: Record<string, any>;

  constructor(data: IAchievementReward | any[] | any) {
    // 支持数组格式 [type, rewardId, count] 或对象格式
    if (Array.isArray(data)) {
      this.type = this.parseRewardType(data[0]) || AchievementRewardType.Item;
      this.rewardId = data[1] ?? "";
      this.count = data[2] ?? 1;
      this.params = {};
    } else {
      this.type = this.parseRewardType(data.type) || AchievementRewardType.Item;
      this.rewardId = data.rewardId ?? "";
      this.count = data.count ?? 1;
      this.params = data.params || {};
    }
  }

  /**
   * 解析奖励类型
   * 支持字符串和枚举对象
   */
  private parseRewardType(type: any): AchievementRewardType {
    if (!type) return AchievementRewardType.Item;
    
    if (typeof type === "object" && type !== null) {
      return (type as any).key || AchievementRewardType.Item;
    }
    
    // 字符串类型，尝试匹配枚举值
    const typeStr = String(type).toLowerCase();
    switch (typeStr) {
      case "item":
        return AchievementRewardType.Item;
      case "exp":
        return AchievementRewardType.Exp;
      case "battlepassexp":
        return AchievementRewardType.BattlePassExp;
      case "title":
        return AchievementRewardType.Title;
      case "avatarframe":
        return AchievementRewardType.AvatarFrame;
      case "achievementpoints":
        return AchievementRewardType.AchievementPoints;
      default:
        return type as AchievementRewardType;
    }
  }

  /**
   * 从配置数组解析奖励列表
   * 支持格式:
   * - 数组格式: [["type", id, count], ["type", id, count], ...]
   * - 对象格式: [{type, rewardId, count}, ...]
   */
  static parseRewards(rewards: any): AchievementReward[] {
    if (!rewards) return [];
    if (!Array.isArray(rewards)) return [];
    
    return rewards.map(r => new AchievementReward(r));
  }

  /**
   * 获取奖励的显示名称
   * 需要配合 ConfigLoader 使用
   */
  getDisplayName(): string {
    switch (this.type) {
      case AchievementRewardType.Item:
        return `物品 x${this.count}`;
      case AchievementRewardType.Exp:
        return `经验 x${this.count}`;
      case AchievementRewardType.BattlePassExp:
        return `战令经验 x${this.count}`;
      case AchievementRewardType.Title:
        return `称号`;
      case AchievementRewardType.AvatarFrame:
        return `头像框`;
      case AchievementRewardType.AchievementPoints:
        return `成就点数 x${this.count}`;
      default:
        return `奖励 x${this.count}`;
    }
  }

  /**
   * 检查是否为称号奖励
   */
  isTitle(): boolean {
    return this.type === AchievementRewardType.Title;
  }

  /**
   * 检查是否为成就点数奖励
   */
  isAchievementPoints(): boolean {
    return this.type === AchievementRewardType.AchievementPoints;
  }
}

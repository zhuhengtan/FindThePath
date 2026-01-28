import { QuestRewardType } from "../../type";

export interface IQuestReward {
  /** 奖励类型 */
  type: QuestRewardType;
  /** 奖励ID（物品ID、技能ID等） */
  rewardId?: string | number;
  /** 奖励数量 */
  count: number;
  /** 额外参数 */
  params?: Record<string, any>;
}

export class QuestReward implements IQuestReward {
  type: QuestRewardType;
  rewardId: string | number;
  count: number;
  params: Record<string, any>;

  constructor(data: IQuestReward | any[] | any) {
    // 支持数组格式 [type, rewardId, count] 或对象格式
    if (Array.isArray(data)) {
      this.type = data[0] as QuestRewardType || QuestRewardType.Item;
      this.rewardId = data[1] ?? "";
      this.count = data[2] ?? 1;
      this.params = {};
    } else {
      this.type = data.type || QuestRewardType.Item;
      this.rewardId = data.rewardId ?? "";
      this.count = data.count ?? 1;
      this.params = data.params || {};
    }
  }

  /** 
   * 从配置数组解析奖励列表
   * 支持格式: [[type, id, count], [type, id, count], ...]
   */
  static parseRewards(rewards: any): QuestReward[] {
    if (!rewards) return [];
    if (!Array.isArray(rewards)) return [];
    
    return rewards.map(r => new QuestReward(r));
  }
}
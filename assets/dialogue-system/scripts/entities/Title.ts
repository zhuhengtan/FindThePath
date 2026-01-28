import { AchievementRarity } from "../../type";

/** 称号效果接口 */
export interface ITitleEffect {
  /** 攻击力加成 */
  attack?: number;
  /** 防御力加成 */
  defense?: number;
  /** 生命值加成 */
  hp?: number;
  /** 速度加成 */
  speed?: number;
}

/** 称号配置数据接口 */
export interface ITitleData {
  /** 称号唯一ID */
  id: string;
  /** 称号名称 */
  name: string;
  /** 称号描述（获取方式说明） */
  description?: string;
  /** 图标路径 */
  icon?: string;
  /** 稀有度 */
  rarity?: AchievementRarity;
  /** 称号效果（可选，用于有属性加成的称号） */
  effect?: ITitleEffect;
}

/**
 * 称号实体类
 * 玩家可获得和装备的称号，通常通过成就解锁
 */
export class Title implements ITitleData {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  effect: ITitleEffect;

  constructor(data: ITitleData | any) {
    this.id = data.id || "";
    this.name = data.name || "";
    this.description = data.description || "";
    this.icon = data.icon || "";
    this.rarity = this.parseRarity(data.rarity);
    this.effect = this.parseEffect(data.effect);
  }

  /**
   * 解析稀有度
   */
  private parseRarity(rarity: any): AchievementRarity {
    if (!rarity) return AchievementRarity.Common;
    if (typeof rarity === "object" && rarity !== null) {
      return (rarity as any).key || AchievementRarity.Common;
    }
    return rarity as AchievementRarity;
  }

  /**
   * 解析效果
   */
  private parseEffect(effect: any): ITitleEffect {
    if (!effect) return {};
    if (typeof effect === "string") {
      try {
        return JSON.parse(effect);
      } catch {
        return {};
      }
    }
    return effect;
  }

  /**
   * 检查是否有属性加成
   */
  hasEffect(): boolean {
    return !!(this.effect.attack || this.effect.defense || this.effect.hp || this.effect.speed);
  }

  /**
   * 获取攻击力加成
   */
  getAttackBonus(): number {
    return this.effect.attack || 0;
  }

  /**
   * 获取防御力加成
   */
  getDefenseBonus(): number {
    return this.effect.defense || 0;
  }

  /**
   * 获取生命值加成
   */
  getHpBonus(): number {
    return this.effect.hp || 0;
  }

  /**
   * 获取速度加成
   */
  getSpeedBonus(): number {
    return this.effect.speed || 0;
  }

  /**
   * 获取效果描述文本
   */
  getEffectDescription(): string {
    const parts: string[] = [];
    if (this.effect.attack) parts.push(`攻击力+${this.effect.attack}`);
    if (this.effect.defense) parts.push(`防御力+${this.effect.defense}`);
    if (this.effect.hp) parts.push(`生命值+${this.effect.hp}`);
    if (this.effect.speed) parts.push(`速度+${this.effect.speed}`);
    return parts.join("，");
  }
}

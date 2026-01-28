import { DialogChoice, DialogNodeContent, DialogNodeNextType, DialogNodeType } from "../../type";
import { Achievement } from "./Achievement";
import { Actor } from "./Actor";
import { Quest } from "./Quest";

export class DialogNode {
  id: string;
  dialogId: number;
  type: DialogNodeType;
  actor?: Actor;
  content?: DialogNodeContent;
  choices?: {
    layout: 'horizontal' | 'vertical'
    choices: DialogChoice[]
  };
  nextNode?: DialogNode;
  quests?: Quest[]
  achievements?: Achievement[]
  items?: any[]
  record?: Record<string, number | string>
  nextType?: DialogNodeNextType
  autoDuration?: number
  enemy?: any

  constructor(data: any) {
    this.id = String(data.id);
    this.dialogId = Number(data.dialogId) as any;
    this.type = data.type as DialogNodeType;
    this.actor = data.actor as Actor | undefined;
    this.content = data.content as DialogNodeContent | undefined;
    if (data.choices && Array.isArray(data.choices.choices)) {
      this.choices = {
        layout: (data.choices.layout as 'horizontal' | 'vertical') || 'vertical',
        choices: data.choices.choices as DialogChoice[],
      };
    }
    if (data.nextNode) {
      // 如果 nextNode 已经是 DialogNode 实例（由 ConfigLoader 的 convertAllToInstances 创建），直接使用
      // 避免在配置加载阶段重复递归创建导致栈溢出
      if (data.nextNode instanceof DialogNode) {
        this.nextNode = data.nextNode;
      } else {
        this.nextNode = new DialogNode(data.nextNode);
      }
    }
    this.quests = (data.quests as Quest[]) || undefined;
    this.achievements = (data.achievements as Achievement[]) || undefined;
    this.items = data.items || undefined;
    this.record = data.record || undefined;
    this.nextType = data.nextType || DialogNodeNextType.Auto;
    this.autoDuration = data.autoDuration || 0;
    this.enemy = data.enemy || undefined;
  }
}

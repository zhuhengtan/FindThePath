import { DialogueChoice, DialogueNodeContent, DialogueNodeNextType, DialogueNodeType } from "../../type";
import { Achievement } from "./Achievement";
import { Actor } from "./Actor";
import { Quest } from "./Quest";

export class DialogueNode {
  id: string;
  dialogId: number;
  type: DialogueNodeType;
  actor?: Actor;
  content?: DialogueNodeContent;
  choices?: {
    layout: 'horizontal' | 'vertical'
    choices: DialogueChoice[]
  };
  nextNode?: DialogueNode;
  quests?: Quest[]
  achievements?: Achievement[]
  items?: any[]
  record?: Record<string, number | string>
  nextType?: DialogueNodeNextType
  autoDuration?: number
  enemy?: any

  constructor(data: any) {
    this.id = String(data.id);
    this.dialogId = Number(data.dialogId) as any;
    this.type = data.type as DialogueNodeType;
    this.actor = data.actor as Actor | undefined;
    this.content = data.content as DialogueNodeContent | undefined;
    if (data.choices && Array.isArray(data.choices.choices)) {
      this.choices = {
        layout: (data.choices.layout as 'horizontal' | 'vertical') || 'vertical',
        choices: data.choices.choices as DialogueChoice[],
      };
    }
    if (data.nextNode) {
      // 如果 nextNode 已经是 DialogueNode 实例（由 ConfigLoader 的 convertAllToInstances 创建），直接使用
      // 避免在配置加载阶段重复递归创建导致栈溢出
      if (data.nextNode instanceof DialogueNode) {
        this.nextNode = data.nextNode;
      } else {
        this.nextNode = new DialogueNode(data.nextNode);
      }
    }
    this.quests = (data.quests as Quest[]) || undefined;
    this.achievements = (data.achievements as Achievement[]) || undefined;
    this.items = data.items || undefined;
    this.record = data.record || undefined;
    this.nextType = data.nextType || DialogueNodeNextType.Auto;
    this.autoDuration = data.autoDuration || 0;
    this.enemy = data.enemy || undefined;
  }
}

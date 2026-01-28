import { Actor } from "./Actor";
import { DialogueNode } from "./DialogueNode";
import { Quest } from "./Quest";

export enum DialogueType {
  /** 主线剧情 */
  Main = 'main',
  /** 支线剧情 */
  Sub = 'sub'
}

export class Dialogue {
  id: number;
  title: string;
  entryNode: DialogueNode;
  actors: Actor[];
  type: DialogueType
  condition: string;
  constructor(data: any) {
    this.id = Number(data.id);
    this.title = data.title;
    this.entryNode = data.entryNode as DialogueNode;
    this.actors = Array.isArray(data.actors) ? data.actors : [];
    this.type = data.type as DialogueType;
    this.condition = data.condition || "";
  }
}
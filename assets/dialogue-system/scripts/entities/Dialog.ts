import { Actor } from "./Actor";
import { DialogNode } from "./DialogNode";
import { Quest } from "./Quest";

export enum DialogType {
  /** 主线剧情 */
  Main = 'main',
  /** 支线剧情 */
  Sub = 'sub'
}

export class Dialog {
  id: number;
  title: string;
  entryNode: DialogNode;
  actors: Actor[];
  type: DialogType
  condition: string;
  constructor(data: any) {
    this.id = Number(data.id);
    this.title = data.title;
    this.entryNode = data.entryNode as DialogNode;
    this.actors = Array.isArray(data.actors) ? data.actors : [];
    this.type = data.type as DialogType;
    this.condition = data.condition || "";
  }
}
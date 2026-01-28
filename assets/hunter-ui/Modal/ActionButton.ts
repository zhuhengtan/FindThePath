import { _decorator, Component, Label, Node, Sprite } from "cc";
const { ccclass, property } = _decorator;

@ccclass("ActionButton")
export class ActionButton extends Component {
  @property(Sprite)
  buttonSprite: Sprite | null = null;

  @property(Label)
  buttonLabel: Label | null = null;

  @property(Sprite)
  buttonWatchAdSprite: Sprite | null = null;

  @property(Sprite)
  buttonLockSprite: Sprite | null = null;
}

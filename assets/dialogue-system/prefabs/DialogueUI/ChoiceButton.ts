import { _decorator, Component, Node, Label, Sprite, SpriteFrame, resources, UITransform } from "cc";
import { DialogueChoice } from "../../type";
const { ccclass, property } = _decorator;

@ccclass("ChoiceButton")
export class ChoiceButton extends Component {
  @property(Sprite)
  public choiceSprite: Sprite = null;

  @property(Node)
  public chiceTextContainer: Node = null;

  @property(Label)
  public choiceTextLabel: Label = null;

  private _choice: DialogueChoice | null = null;
  private _onClick: ((choice: DialogueChoice) => void) | null = null;

  onLoad() {
    this.node.on(Node.EventType.TOUCH_END, this.onClicked, this);
  }

  onDestroy() {
    this.node.off(Node.EventType.TOUCH_END, this.onClicked, this);
  }

  public setChoice(choice: DialogueChoice, onClick?: (choice: DialogueChoice) => void): void {
    this._choice = choice;
    this._onClick = onClick || null;
    const text = choice?.text || "";
    if (this.chiceTextContainer && this.choiceTextLabel) {
      this.chiceTextContainer.active = !!text;
      this.choiceTextLabel.string = text;
      this.choiceTextLabel.node.active = !!text;
    }
    const img = choice?.image;
    if (this.choiceSprite) {
      if (img && Array.isArray(img)) {
        const [path, w, h] = img;
        resources.load(path, SpriteFrame, (err, sf) => {
          if (err || !sf) {
            this.choiceSprite.node.active = false;
            return;
          }
          this.choiceSprite.spriteFrame = sf;
          this.choiceSprite.node.active = true;
          const ut = this.choiceSprite.node.getComponent(UITransform);
          if (ut && typeof w === "number" && typeof h === "number" && (sf.width || sf.height)) {
            this.choiceSprite.node.setScale(w / (sf.width || 1), h / (sf.height || 1));
          }
        });
      } else {
        this.choiceSprite.node.active = false;
      }
    }
  }

  private onClicked(event?: any): void {
    // 阻止事件冒泡，避免点击被系统背景监听到导致跳过当前节点
    try { if (event) event.propagationStopped = true; } catch {}
    const c = this._choice;
    if (!c) return;
    if (this._onClick) this._onClick(c);
  }
}

export default ChoiceButton;

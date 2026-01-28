import {
  _decorator,
  Component,
  Node,
  Label,
  Prefab,
  instantiate,
  Sprite,
  UIOpacity,
  UITransform,
  tween,
  SpriteFrame,
  Layout,
  assetManager,
} from "cc";
import { Dialogue } from "../../scripts/entities/Dialogue";
import { DialogueNode } from "../../scripts/entities/DialogueNode";

import { ChoiceButton } from "./ChoiceButton";
import { Actor } from "../../scripts/entities/Actor";
import { ConfigLoader } from "db://assets/hunter/utils/config-loader";
import {
  AnimationType,
  ButtonClickType,
  DialogueChoice,
  DialogueEvents,
} from "../../type";
import EventBus from "db://assets/hunter/utils/event-bus";
const { ccclass, property } = _decorator;

@ccclass("DialogueUI")
export class DialogueUI extends Component {
  @property({ type: Node })
  public skipButton: Node = null;

  @property({ type: Prefab })
  public choiceButtonPrefab: Prefab = null;

  @property({ type: Node, group: "普通NPC说话" })
  public talkPannel: Node = null;

  @property({ type: Sprite, group: "普通NPC说话" })
  public talkBg: Sprite = null;

  @property({ type: Node, group: "普通NPC说话" })
  public actorPortraitContainer: Node = null;

  @property({ type: Sprite, group: "普通NPC说话" })
  public actorPortrait: Sprite = null;

  @property({ type: Label, group: "普通NPC说话" })
  public actorNameLabel: Label = null;

  @property({ type: Label, group: "普通NPC说话" })
  public identityLabel: Label = null;

  @property({ type: Label, group: "普通NPC说话" })
  public contentLabel: Label = null;

  @property({ type: Node, group: "普通NPC说话" })
  public choicesContainer: Node = null;

  @property({ type: Node, group: "系统黑色背景" })
  public systemBlack: Node = null;

  @property({ type: Sprite, group: "系统黑色背景" })
  public systemBlackBg: Sprite = null;

  @property({ type: Label, group: "系统黑色背景" })
  public systemBlackContent: Label = null;

  @property({ type: Sprite, group: "系统黑色背景" })
  public systemBlackImage: Sprite = null;

  @property({ type: Node, group: "系统黑色背景" })
  public systemBlackChoices: Node = null;

  @property({ type: Node, group: "系统半透明背景" })
  public systemTransparent: Node = null;

  @property({ type: Sprite, group: "系统半透明背景" })
  public systemTransparentBg: Sprite = null;

  @property({ type: Label, group: "系统半透明背景" })
  public systemTransparentContent: Label = null;

  @property({ type: Sprite, group: "系统半透明背景" })
  public systemTransparentImage: Sprite = null;

  @property({ type: Node, group: "系统半透明背景" })
  public systemTransparentChoices: Node = null;

  @property
  public fadeDuration: number = 0.3;

  @property
  public typewriterEnabled: boolean = false;

  @property
  public typewriterSpeed: number = 0.05; // seconds per character

  private _currentDialog: Dialogue | null = null;
  private _currentNode: DialogueNode | null = null;
  private _isTyping: boolean = false;
  private _portraitCache: Map<string, SpriteFrame> = new Map();
  private _currentPortraitKey: string = "";

  private _currentPanel: "talk" | "systemBlack" | "systemTransparent" | null =
    null;
  private _typewriterCallback: (() => void) | null = null;
  private _typewriterLabel: Label | null = null;
  private _typewriterText: string = "";
  private _typewriterIndex: number = 0;

  onLoad() {
    this.node.active = false;
    if (this.talkPannel) {
      this.talkPannel.on(
        Node.EventType.TOUCH_END,
        this.onTalkPanelClicked,
        this
      );
    }
    if (this.systemBlack) this.systemBlack.active = false;
    if (this.systemTransparent) this.systemTransparent.active = false;
    if (this.systemBlack)
      this.systemBlack.on(
        Node.EventType.TOUCH_END,
        this.onSystemBackgroundClicked,
        this
      );
    if (this.systemTransparent)
      this.systemTransparent.on(
        Node.EventType.TOUCH_END,
        this.onSystemBackgroundClicked,
        this
      );
  }

  onDestroy() {
    if (this.talkPannel && this.talkPannel.isValid) {
      this.talkPannel.off(
        Node.EventType.TOUCH_END,
        this.onTalkPanelClicked,
        this
      );
    }
    if (this.systemBlack && this.systemBlack.isValid)
      this.systemBlack.off(
        Node.EventType.TOUCH_END,
        this.onSystemBackgroundClicked,
        this
      );
    if (this.systemTransparent && this.systemTransparent.isValid)
      this.systemTransparent.off(
        Node.EventType.TOUCH_END,
        this.onSystemBackgroundClicked,
        this
      );
  }

  public renderLineWithActor(
    actor: Actor | null,
    content: string | undefined
  ): void {
    this._currentNode = null;
    this.showTalkPanel();
    // Show actor name
    if (this.actorNameLabel) {
      this.actorNameLabel.string = actor?.displayName || actor?.name || "系统";
    }
    // Show actor identity
    if (this.identityLabel) {
      this.identityLabel.string = (actor as any)?.identity || "";
      this.identityLabel.node.active = !!(actor as any)?.identity;
    }
    // Update portrait
    this.setActorPortrait(actor);
    // Show content
    if (this.contentLabel) {
      const text = content || "";
      if (this.typewriterEnabled) {
        this.showTextWithTypewriter(text);
      } else {
        this.contentLabel.string = text;
      }
    }
    this.hideChoices();
  }

  public renderLine(actorId: string, content: string): void {
    this.renderLineWithActor(null, content);
    if (this.actorNameLabel) {
      this.actorNameLabel.string = actorId || "系统";
    }
    // Hide identity when using actorId string directly
    if (this.identityLabel) {
      this.identityLabel.string = "";
      this.identityLabel.node.active = false;
    }
  }

  public show(): void {
    const op = this.getOpacity(this.node);
    op.opacity = 0;
    this.node.active = true;
    tween(op).to(this.fadeDuration, { opacity: 255 }).start();
  }

  public hide(): void {
    const op = this.getOpacity(this.node);
    tween(op)
      .to(this.fadeDuration, { opacity: 0 })
      .call(() => {
        this.node.active = false;
        op.opacity = 255;
      })
      .start();
  }

  public renderChoices(
    prompt: string,
    choices: DialogueChoice[],
    layout: "horizontal" | "vertical" = "vertical"
  ): void {
    this.showTalkPanel();

    // Show prompt
    if (this.contentLabel && prompt) {
      this.contentLabel.string = prompt;
    }
    // Hide actor name and identity for choices
    if (this.actorNameLabel) {
      this.actorNameLabel.string = "";
    }
    if (this.identityLabel) {
      this.identityLabel.string = "";
      this.identityLabel.node.active = false;
    }
    // Hide portrait in choice stage
    if (this.actorPortrait) {
      this.actorPortrait.node.active = false;
      this._currentPortraitKey = "";
    }
    // Show choices
    this.showChoices(choices || []);
    const lay = this.choicesContainer?.getComponent(Layout);
    if (lay)
      lay.type =
        layout === "horizontal" ? Layout.Type.HORIZONTAL : Layout.Type.VERTICAL;
  }

  public applyScreenEffect(effect: string): void {
    if (effect === "black") {
      if (this._currentPanel !== "systemBlack") {
        this.hideAllPanels();
        if (this.systemBlack) {
          const op = this.getOpacity(this.systemBlack);
          op.opacity = 0;
          this.systemBlack.active = true;
          tween(op).to(this.fadeDuration, { opacity: 255 }).start();
        }
        this._currentPanel = "systemBlack";
      } else {
        if (this.systemBlack) this.systemBlack.active = true;
      }
    } else if (effect === "clear") {
      this.hideAllPanels();
      this._currentPanel = null;
    }
  }

  private stopTypewriter(): void {
    if (this._typewriterCallback) {
      this.unschedule(this._typewriterCallback);
      this._typewriterCallback = null;
    }
    // 停止时显示完整文本
    if (this._typewriterLabel && this._typewriterText) {
      this._typewriterLabel.string = this._typewriterText;
    }
    this._typewriterLabel = null;
    this._typewriterText = "";
    this._typewriterIndex = 0;
    this._isTyping = false;
  }
  private startTypewriter(label: Label | null, text: string): void {
    if (!label) return;
    this.stopTypewriter();
    this._isTyping = true;
    this._typewriterLabel = label;
    this._typewriterText = text || "";
    this._typewriterIndex = 0;
    label.string = "";
    this._typewriterCallback = () => {
      if (!this._isTyping || !this._typewriterLabel) {
        this.stopTypewriter();
        return;
      }
      if (this._typewriterIndex < this._typewriterText.length) {
        this._typewriterLabel.string +=
          this._typewriterText[this._typewriterIndex];
        this._typewriterIndex++;
      } else {
        this.stopTypewriter();
      }
    };
    this.schedule(this._typewriterCallback, this.typewriterSpeed);
  }
  private showTextWithTypewriter(text: string): void {
    this.startTypewriter(this.contentLabel, text);
  }
  private showTextOnLabelWithTypewriter(label: Label, text: string): void {
    this.startTypewriter(label, text);
  }

  private showChoices(choices: DialogueChoice[]): void {
    if (!this.choicesContainer || !this.choiceButtonPrefab) return;

    // Clear existing choices
    this.choicesContainer.removeAllChildren();

    // Create choice buttons
    for (const choice of choices) {
      const btnNode = instantiate(this.choiceButtonPrefab);
      btnNode.setParent(this.choicesContainer);

      const btn = btnNode.getComponent(ChoiceButton);
      if (btn) btn.setChoice(choice, (c) => this.onChoiceClicked(c));
    }

    this.choicesContainer.active = true;
  }

  private hideChoices(): void {
    if (this.choicesContainer) {
      this.choicesContainer.active = false;
    }
  }

  private showTalkPanel(): void {
    if (this.systemBlack) this.systemBlack.active = false;
    if (this.systemTransparent) this.systemTransparent.active = false;
    if (this.talkPannel) {
      // 只在面板未激活时设置 opacity，避免闪烁
      if (!this.talkPannel.active) {
        const op = this.getOpacity(this.talkPannel);
        op.opacity = 255;
      }
      this.talkPannel.active = true;
    }
    if (this.talkBg) this.talkBg.node.active = true;
    this._currentPanel = "talk";
  }

  private onTalkPanelClicked(): void {
    // Skip typewriter if still typing
    if (this._isTyping) {
      this.stopTypewriter();
      return;
    }
    const hasChoices = !!(
      this._currentNode?.choices &&
      (this._currentNode.choices.choices || []).length
    );

    if (hasChoices) return;
    EventBus.emit(DialogueEvents.DialogueNextRequested);
  }

  public onSkipClicked(): void {
    this.stopTypewriter();
    const hasChoices = !!(
      this._currentNode?.choices &&
      (this._currentNode.choices.choices || []).length
    );
    if (hasChoices) return;
    EventBus.emit(DialogueEvents.DialogueSkipRequested);
  }

  public updateActor(
    actor: Actor | null,
    skipAnimation: boolean = false
  ): void {
    if (this.actorNameLabel) {
      this.actorNameLabel.string = actor?.displayName || actor?.name || "系统";
    }
    if (this.identityLabel) {
      this.identityLabel.string = (actor as any)?.identity || "";
      this.identityLabel.node.active = !!(actor as any)?.identity;
    }
    this.setActorPortrait(actor, skipAnimation);
  }

  private setActorPortrait(
    actor: Actor | null,
    skipAnimation: boolean = false
  ): void {
    if (!this.actorPortrait) return;
    if (!actor || !Array.isArray(actor.portrait)) {
      this.actorPortrait.node.active = false;
      this._currentPortraitKey = "";
      return;
    }
    const [path, w, h] = actor.portrait as [string, number, number];
    if (!path) {
      this.actorPortrait.node.active = false;
      this._currentPortraitKey = "";
      return;
    }

    const applyPortraitSize = () => {
      if (!(typeof w === "number" && typeof h === "number")) return;

      let spriteWidth = w;
      let spriteHeight = h;
      let containerWidth = w;
      let containerHeight = h;

      // 如果是 FILLED 类型，计算可见区域
      if (this.actorPortrait.type === Sprite.Type.FILLED) {
        const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

        const startRaw = Number(this.actorPortrait.fillStart) || 0;
        const rangeRaw = Number(this.actorPortrait.fillRange) || 1;
        const start = rangeRaw >= 0 ? clamp01(startRaw) : clamp01(startRaw + rangeRaw);
        const end = rangeRaw >= 0 ? clamp01(startRaw + rangeRaw) : clamp01(startRaw);
        const visibleRange = Math.max(0.0001, end - start);

        if (this.actorPortrait.fillType === Sprite.FillType.VERTICAL) {
          // VERTICAL fill: 0 = 底部, 1 = 顶部
          // 例如 start=0.4, range=0.6 表示显示 0.4 到 1.0 的部分（上面 60%）
          // 容器高度 = 可见部分高度
          containerHeight = h * visibleRange;
          // Sprite 高度 = 原图高度（Widget top=0 会自动贴顶）
          spriteHeight = h;
        } else if (this.actorPortrait.fillType === Sprite.FillType.HORIZONTAL) {
          containerWidth = w * visibleRange;
          spriteWidth = w;
        }
      }

      // 设置容器尺寸（如果有容器）
      if (this.actorPortraitContainer) {
        const containerUI =
          this.actorPortraitContainer.getComponent(UITransform) ||
          this.actorPortraitContainer.addComponent(UITransform);
        containerUI.setContentSize(containerWidth, containerHeight);
        this.actorPortraitContainer.active = true;
      }

      // 设置 Sprite 尺寸
      this.actorPortrait.sizeMode = Sprite.SizeMode.CUSTOM;
      const spriteUI =
        this.actorPortrait.node.getComponent(UITransform) ||
        this.actorPortrait.node.addComponent(UITransform);
      spriteUI.setContentSize(spriteWidth, spriteHeight);
      this.actorPortrait.node.setScale(1, 1, 1);

      // 更新父级 Layout（如果有）
      const parentLayout = this.actorPortraitContainer?.parent?.getComponent(Layout);
      if (parentLayout) parentLayout.updateLayout();
    };

    if (this._currentPortraitKey === path) {
      this.actorPortrait.node.active = true;
      applyPortraitSize();
      return;
    }
    const applySprite = (sf: SpriteFrame) => {
      this.actorPortrait.spriteFrame = sf;
      this.actorPortrait.sizeMode = Sprite.SizeMode.CUSTOM;

      // 如果是 FILLED 类型，设置 spriteFrame 后需要重新设置 fillStart/fillRange
      // 来强制 Sprite 刷新 FILLED 渲染效果
      if (this.actorPortrait.type === Sprite.Type.FILLED) {
        const savedFillStart = this.actorPortrait.fillStart;
        const savedFillRange = this.actorPortrait.fillRange;
        // 先设置一个不同的值，再设置回来，强制刷新
        this.actorPortrait.fillStart = 0;
        this.actorPortrait.fillRange = 1;
        this.actorPortrait.fillStart = savedFillStart;
        this.actorPortrait.fillRange = savedFillRange;
      }

      this.actorPortrait.node.active = true;
      this.actorPortrait.node.setScale(1, 1, 1);

      // 根据参数决定是否播放淡入动画
      if (skipAnimation) {
        const op = this.getOpacity(this.actorPortrait.node);
        op.opacity = 255;
      } else {
        const op = this.getOpacity(this.actorPortrait.node);
        op.opacity = 0;
        tween(op).to(this.fadeDuration, { opacity: 255 }).start();
      }

      applyPortraitSize();

      this._currentPortraitKey = path;
      // 保持预制体中的层级顺序，避免影响父 Layout 的排列位置
    };
    const cached = this._portraitCache.get(path);
    if (cached) {
      applySprite(cached);
      return;
    }
    const bundle = assetManager.getBundle("story");
    if (!bundle) {
      this.actorPortrait.node.active = false;
      this._currentPortraitKey = "";
      return;
    }
    bundle.load(`${path}/spriteFrame`, SpriteFrame, (err, sf) => {
      if (err || !sf) {
        this.actorPortrait.node.active = false;
        this._currentPortraitKey = "";
        return;
      }
      this._portraitCache.set(path, sf);
      applySprite(sf);
    });
  }

  public setContent(
    content: {
      text?: string;
      image?: [string, number, number];
      textAnimation?: string;
      imageAnimation?: string;
    } | null
  ): void {
    // 先停止之前的打字机动画，防止冲突
    this.stopTypewriter();

    if (!content) {
      this.contentLabel && (this.contentLabel.string = "");
      return;
    }
    if (this.contentLabel) {
      const text = content.text || "";
      if (content.textAnimation === "typeWriter") {
        this.typewriterEnabled = true;
        this.showTextWithTypewriter(text);
      } else {
        this.typewriterEnabled = false;
        this.contentLabel.string = text;
      }
    }
    // 普通对话不再展示内容图片，图片由 system 面板负责
  }

  public showSystemBlackContent(content?: {
    text?: string;
    image?: [string, number, number];
    textAnimation?: AnimationType;
    imageAnimation?: AnimationType;
  }): void {
    this.stopTypewriter();
    // 只在面板未激活时切换，避免闪烁
    if (!this.systemBlack?.active) {
      this.hideAllPanels();
      if (this.systemBlack) this.systemBlack.active = true;
      this._currentPanel = "systemBlack";
    }
    if (this.systemBlackContent) {
      const text = content?.text || "";
      if (content?.textAnimation === AnimationType.TypeWriter) {
        this.showTextOnLabelWithTypewriter(this.systemBlackContent, text);
      } else {
        this.systemBlackContent.string = text;
      }
      this.systemBlackContent.node.active = true;
    }
    if (content?.image && this.systemBlackImage) {
      this.setSprite(this.systemBlackImage, content.image, true);
    } else if (this.systemBlackImage) {
      this.systemBlackImage.node.active = false;
    }
  }

  public showSystemTransparentContent(content?: {
    text?: string;
    image?: [string, number, number];
    textAnimation?: AnimationType;
    imageAnimation?: AnimationType;
  }): void {
    this.stopTypewriter();
    // 只在面板未激活时切换，避免闪烁
    if (!this.systemTransparent?.active) {
      this.hideAllPanels();
      if (this.systemTransparent) this.systemTransparent.active = true;
      this._currentPanel = "systemTransparent";
    }
    if (this.systemTransparentContent) {
      const text = content?.text || "";
      if (content?.textAnimation === AnimationType.TypeWriter) {
        this.showTextOnLabelWithTypewriter(this.systemTransparentContent, text);
      } else {
        this.systemTransparentContent.string = text;
      }
      this.systemTransparentContent.node.active = true;
    }
    if (content?.image && this.systemTransparentImage) {
      this.setSprite(this.systemTransparentImage, content.image, true);
    } else if (this.systemTransparentImage) {
      this.systemTransparentImage.node.active = false;
    }
  }

  public renderSystemChoices(
    effect: "black" | "transparent",
    prompt: string,
    choices: DialogueChoice[],
    layout: "horizontal" | "vertical" = "vertical"
  ): void {
    this.stopTypewriter();
    const container =
      effect === "black"
        ? this.systemBlackChoices
        : this.systemTransparentChoices;
    const contentLabel =
      effect === "black"
        ? this.systemBlackContent
        : this.systemTransparentContent;
    const panelNode =
      effect === "black" ? this.systemBlack : this.systemTransparent;
    if (panelNode) panelNode.active = true;
    if (contentLabel) contentLabel.string = prompt || "";
    if (!container || !this.choiceButtonPrefab) return;
    container.removeAllChildren();
    for (const c of choices || []) {
      const btnNode = instantiate(this.choiceButtonPrefab);
      btnNode.setParent(container);
      const btn = btnNode.getComponent(ChoiceButton);
      if (btn) btn.setChoice(c, (choice) => this.onChoiceClicked(choice));
    }
    const lay = container.getComponent(Layout);
    if (lay)
      lay.type =
        layout === "horizontal" ? Layout.Type.HORIZONTAL : Layout.Type.VERTICAL;
    if (layout === "horizontal") {
      lay.spacingX = 80;
    } else {
      lay.spacingY = 80;
    }
    lay.updateLayout();
    container.active = true;
  }

  public updateSystemBlackContent(content?: {
    text?: string;
    image?: [string, number, number];
    textAnimation?: AnimationType;
    imageAnimation?: AnimationType;
  }): void {
    if (this.systemBlackContent) {
      const text = content?.text || "";
      if (content?.textAnimation === AnimationType.TypeWriter) {
        this.showTextOnLabelWithTypewriter(this.systemBlackContent, text);
      } else {
        this.systemBlackContent.string = text;
      }
      this.systemBlackContent.node.active = true;
    }
    if (content?.image && this.systemBlackImage) {
      this.setSprite(this.systemBlackImage, content.image, true); // 跳过淡入动画，避免闪烁
    } else if (this.systemBlackImage) {
      this.systemBlackImage.node.active = false;
    }
    if (this.systemBlack) this.systemBlack.active = true;
  }

  public updateSystemTransparentContent(content?: {
    text?: string;
    image?: [string, number, number];
    textAnimation?: AnimationType;
    imageAnimation?: AnimationType;
  }): void {
    if (this.systemTransparentContent) {
      const text = content?.text || "";
      if (content?.textAnimation === AnimationType.TypeWriter) {
        this.showTextOnLabelWithTypewriter(this.systemTransparentContent, text);
      } else {
        this.systemTransparentContent.string = text;
      }
      this.systemTransparentContent.node.active = true;
    }
    if (content?.image && this.systemTransparentImage) {
      this.setSprite(this.systemTransparentImage, content.image, true); // 跳过淡入动画，避免闪烁
    } else if (this.systemTransparentImage) {
      this.systemTransparentImage.node.active = false;
    }
    if (this.systemTransparent) this.systemTransparent.active = true;
  }

  public hideSystemChoices(effect: "black" | "transparent"): void {
    const container =
      effect === "black"
        ? this.systemBlackChoices
        : this.systemTransparentChoices;
    if (container) container.active = false;
  }

  private onChoiceClicked(c: DialogueChoice): void {
    if (!c) return;
    switch (c.type) {
      case ButtonClickType.Default:
        EventBus.emit(DialogueEvents.DialogueNextRequested);
        break;
      case ButtonClickType.Node:
        if (c.data?.node != null) {
          // 节点 ID 可以是字符串或数字，直接传递
          EventBus.emit(DialogueEvents.DialogueJumpToNodeRequested, c.data.node)
        }
        break;
      case ButtonClickType.Scene:
        if (c.data?.scene) {
          EventBus.emit(DialogueEvents.NeedLoadScene, c.data.scene);
        }
        break;
      case ButtonClickType.Toast:
        if (c.data?.toast) {
          EventBus.emit(DialogueEvents.NeedShowToast, c.data.toast);
        }
        break;
      case ButtonClickType.Image:
        // reserved for future system image preview
        break;
      default:
        EventBus.emit(DialogueEvents.DialogueNextRequested);
    }
  }

  public setCurrentNode(node: DialogueNode | null): void {
    this._currentNode = node || null;
    const hasChoices = !!(
      node?.choices &&
      (node.choices.choices || []).length
    );
    this.skipButton.active = !!node && !hasChoices;
  }

  private onSystemBackgroundClicked(): void {
    if (this._isTyping) {
      this.stopTypewriter();
      return;
    }
    const hasChoices = !!(
      this._currentNode?.choices &&
      (this._currentNode.choices.choices || []).length
    );

    if (!hasChoices) EventBus.emit(DialogueEvents.DialogueNextRequested);
  }

  private setSprite(
    target: Sprite,
    image: [string, number, number],
    skipFade: boolean = false
  ): void {
    const [path, w, h] = image;
    assetManager.getBundle("story").load(`${path}/spriteFrame`, SpriteFrame, (err, sf) => {
      if (err || !sf) {
        target.node.active = false;
        return;
      }
      target.spriteFrame = sf;
      target.node.active = true;
      if (!skipFade) {
        const op = this.getOpacity(target.node);
        op.opacity = 0;
        tween(op).to(this.fadeDuration, { opacity: 255 }).start();
      }
      if (
        typeof w === "number" &&
        typeof h === "number" &&
        (sf.width || sf.height)
      ) {
        target.node.setScale(w / (sf.width || 1), h / (sf.height || 1));
      }
    });
  }

  private getOpacity(target: Node): UIOpacity {
    let op = target.getComponent(UIOpacity);
    if (!op) op = target.addComponent(UIOpacity);
    return op;
  }

  private hideAllPanels(): void {
    if (this.talkPannel) this.talkPannel.active = false;
    if (this.talkBg) this.talkBg.node.active = false;
    if (this.systemBlack) this.systemBlack.active = false;
    if (this.systemTransparent) this.systemTransparent.active = false;
    this.hideChoices();
    if (this.systemBlackChoices) this.systemBlackChoices.active = false;
    if (this.systemTransparentChoices)
      this.systemTransparentChoices.active = false;
  }
}

export default DialogueUI;

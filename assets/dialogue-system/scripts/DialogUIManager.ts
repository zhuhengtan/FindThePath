import {
  _decorator,
  Component,
  Node,
  Prefab,
  instantiate,
  director,
  assetManager,
} from "cc";
import EventBus from "db://assets/hunter/utils/event-bus";
import { DialogEvents, DialogNodeType, AnimationType, DialogNodeNextType, QuestEvents, AchievementEvents } from "../type";
import { Dialog } from "./entities/Dialog";
import { DialogNode } from "./entities/DialogNode";
// 注意：避免静态导入 DialogUI 以打破循环依赖
import { QuestNotificationUI } from "../prefabs/QuestNotificationUI/QuestNotificationUI";
import { AchievementNotificationUI } from "../prefabs/AchievementNotificationUI/AchievementNotificationUI";
import { Actor } from "./entities/Actor";
import DialogUI from "../prefabs/DialogUI/DialogUI";
const { ccclass, property } = _decorator;

@ccclass("DialogUIManager")
export class DialogUIManager extends Component {
  private static _instance: DialogUIManager | null = null;

  @property(Prefab)
  public dialogUIPrefab: Prefab = null;

  @property(Prefab)
  public questNotificationPrefab: Prefab = null;

  @property(Prefab)
  public achievementNotificationPrefab: Prefab = null;

  @property(Node)
  public uiRoot: Node = null;

  private _dialogUIInstance: DialogUI | null = null;
  private _loadingDialogUI = false;
  private _lastNode: DialogNode | null = null;
  private _autoAdvanceCallback: (() => void) | null = null;
  private _registered: boolean = false;

  private loadPrefabFromMainBundle(path: string, cb: (prefab: Prefab) => void): void {
    const loadFromBundle = (bundle: any) => {
      bundle.load(path, Prefab, (err: any, prefab: Prefab) => {
        if (err || !prefab) {
          console.warn("[DialogUIManager] prefab load failed:", path, err);
          return;
        }
        cb(prefab);
      });
    };
    const existing = assetManager.getBundle("main");
    if (existing) {
      loadFromBundle(existing);
      return;
    }
    assetManager.loadBundle("main", (err, bundle) => {
      if (err || !bundle) {
        console.warn("[DialogUIManager] main bundle missing", err);
        return;
      }
      loadFromBundle(bundle);
    });
  }

  public static getInstance(): DialogUIManager | null {
    if (DialogUIManager._instance) return DialogUIManager._instance;
    const scene = director.getScene();
    if (!scene) return null;
    const stack: Node[] = [scene];
    while (stack.length) {
      const n = stack.pop();
      const comp = n.getComponent(DialogUIManager);
      if (comp) {
        DialogUIManager._instance = comp;
        return comp;
      }
      if (n.children && n.children.length) stack.push(...n.children);
    }
    return null;
  }

  onLoad() {
    DialogUIManager._instance = this;

    // Use self node as UI root if not specified
    if (!this.uiRoot) {
      this.uiRoot = this.node;
    }

    this.registerEventListeners();
  }

  onDestroy() {
    if (DialogUIManager._instance === this) {
      DialogUIManager._instance = null;
    }
    this.unregisterEventListeners();
  }

  private registerEventListeners(): void {
    if (this._registered) return;
    EventBus.on(QuestEvents.QuestAccepted, this.onQuestAccepted.bind(this));
    EventBus.on(QuestEvents.QuestCompleted, this.onQuestCompleted.bind(this));
    EventBus.on(
      AchievementEvents.AchievementUnlocked,
      this.onAchievementUnlocked.bind(this)
    );
    EventBus.on(DialogEvents.DialogStart, (dialog: Dialog) => {
      this.startDialog(dialog);
    });
    EventBus.on(DialogEvents.DialogNodeEnter, (dialog: Dialog, node: DialogNode) => {
      this.renderNode(dialog, node);
    });
    EventBus.on(DialogEvents.DialogEnd, (dialog: Dialog) => {
      this.endDialog(dialog);
    });
    // 监听对话暂停事件（进入战斗时），隐藏对话 UI
    EventBus.on(DialogEvents.DialogPaused, (dialog: Dialog) => {
      this.endDialog(dialog);
    });
    this._registered = true;
  }

  private unregisterEventListeners(): void {
    if (!this._registered) return;
    EventBus.detach(QuestEvents.QuestAccepted, this.onQuestAccepted.bind(this));
    EventBus.detach(QuestEvents.QuestCompleted, this.onQuestCompleted.bind(this));
    EventBus.detach(
      AchievementEvents.AchievementUnlocked,
      this.onAchievementUnlocked.bind(this)
    );
    EventBus.off(DialogEvents.DialogStart);
    EventBus.off(DialogEvents.DialogNodeEnter);
    EventBus.off(DialogEvents.DialogEnd);
    EventBus.off(DialogEvents.DialogPaused);
    this._registered = false;
  }

  public startDialog(dialog: Dialog): void {
    if (!this.dialogUIPrefab) {
      return;
    }
    this.ensureDialogUI();
  }

  public endDialog(dialog: Dialog): void {
    if (this._dialogUIInstance) {
      this._dialogUIInstance.hide();
    }
  }

  public showLine(actor: Actor | null, content: string): void {
    this._dialogUIInstance?.renderLineWithActor(actor || null, content);
  }

  public showChoice(dialog: Dialog, node: DialogNode): void {
    const prompt = node.content?.text || "";
    const list = node.choices?.choices || [];
    const layout = node.choices?.layout || "vertical";
    (this._dialogUIInstance as any)?.renderChoices(prompt, list, layout);
  }

  public showSystemChoice(
    effect: "black" | "transparent",
    node: DialogNode
  ): void {
    const prompt = node.content?.text || "";
    const list = node.choices?.choices || [];
    const layout = node.choices?.layout || "vertical";
    (this._dialogUIInstance as any)?.renderSystemChoices(
      effect,
      prompt,
      list,
      layout
    );
  }

  public applyScreenEffect(effect: "black" | "clear"): void {
    this._dialogUIInstance?.applyScreenEffect(effect);
  }

  public renderNode(dialog: Dialog, node: DialogNode): void {
    if (!this.dialogUIPrefab) {
      return;
    }
    this.ensureDialogUI();
    const prev = this._lastNode;
    this._dialogUIInstance?.setCurrentNode(node);
    try {
      this.renderNodeInternal(dialog, node, prev || null);
    } catch (e) { }
    this._lastNode = node;
  }

  private ensureDialogUI(): void {
    if (!this._dialogUIInstance && this.dialogUIPrefab) {
      const node = instantiate(this.dialogUIPrefab);
      node.setParent(this.uiRoot);
      node.setSiblingIndex(this.uiRoot.children.length - 1);
      const comps = node.getComponents(Component) as any[];
      this._dialogUIInstance =
        comps.find((c) => typeof c.renderLineWithActor === "function") ||
        null;
      this._dialogUIInstance?.show();
      return;
    }
    if (this._dialogUIInstance && !this._dialogUIInstance.node.active) {
      this._dialogUIInstance.node.active = true;
      this._dialogUIInstance.node.setSiblingIndex(this.uiRoot.children.length - 1);
    }
  }

  private renderNodeInternal(
    dialog: Dialog,
    node: DialogNode,
    prev?: DialogNode | null
  ): void {
    if (!this._dialogUIInstance || !node) return;


    if (node.type === DialogNodeType.SystemBlack) {

      const prevSameType = !!prev && prev.type === DialogNodeType.SystemBlack;
      if (prevSameType) {
        // 相同类型：只更新内容，避免 applyScreenEffect 导致的渐隐渐显
        (this._dialogUIInstance as any)?.updateSystemBlackContent(node.content);
      } else {
        // 不同类型：需要切换面板
        (this._dialogUIInstance as any)?.applyScreenEffect("black");
        (this._dialogUIInstance as any)?.showSystemBlackContent(node.content);
      }
      EventBus.emit(DialogEvents.DialogScreenChange, "black");
      const choices = node.choices?.choices || [];
      if (choices.length) {
        this.showSystemChoice("black", node);
        EventBus.emit(DialogEvents.DialogChoiceRequired, dialog, node);
      } else {
        const dUI2 = this._dialogUIInstance as any;
        dUI2?.hideSystemChoices && dUI2.hideSystemChoices("black");
        this.maybeScheduleAutoAdvance(node);
      }
      return;
    }
    if (node.type === DialogNodeType.SystemTransparent) {

      const prevSameType =
        !!prev && prev.type === DialogNodeType.SystemTransparent;
      if (prevSameType) {
        // 相同类型：只更新内容
        (this._dialogUIInstance as any)?.updateSystemTransparentContent(
          node.content
        );
      } else {
        // 不同类型：需要显示面板
        (this._dialogUIInstance as any)?.showSystemTransparentContent(
          node.content
        );
      }
      const choices = node.choices?.choices || [];
      if (choices.length) {
        this.showSystemChoice("transparent", node);
        EventBus.emit(DialogEvents.DialogChoiceRequired, dialog, node);
      } else {
        const dUI2 = this._dialogUIInstance as any;
        dUI2?.hideSystemChoices && dUI2.hideSystemChoices("transparent");
        this.maybeScheduleAutoAdvance(node);
      }
      return;
    }
    if (node.type === DialogNodeType.Talk) {
      const content = node.content || ({} as any);
      const text = content?.text || "";
      const dUI = this._dialogUIInstance as any
      const prevSameType = !!prev && prev.type === DialogNodeType.Talk;
      if (prevSameType) {
        // 修复 actor 比较逻辑：防止将两个 null 误判为同一 actor
        const prevActorId = prev?.actor
          ? prev.actor.id ?? prev.actor.name
          : null;
        const currActorId = node?.actor
          ? node.actor.id ?? node.actor.name
          : null;
        const isSameActor =
          prevActorId !== null &&
          currActorId !== null &&
          prevActorId === currActorId;

        if (isSameActor) {
          // 同一 actor：只更新内容
          dUI?.setContent({
            text,
            image: content?.image,
            textAnimation:
              content?.textAnimation === AnimationType.TypeWriter
                ? "typeWriter"
                : undefined,
            imageAnimation:
              content?.imageAnimation === AnimationType.FadeInOut
                ? "fadeInOut"
                : undefined,
          });
        } else {
          // 不同 actor：先更新 actor，再更新内容
          if (dUI?.showTalkPanel) dUI.showTalkPanel();
          dUI?.updateActor(node.actor || null, true); // 跳过动画以加快切换
          dUI?.setContent({
            text,
            image: content?.image,
            textAnimation:
              content?.textAnimation === AnimationType.TypeWriter
                ? "typeWriter"
                : undefined,
            imageAnimation:
              content?.imageAnimation === AnimationType.FadeInOut
                ? "fadeInOut"
                : undefined,
          });
        }

        // 处理 choices (无论是否同一 actor 都需要处理)
        const choices = node.choices?.choices || [];
        if (choices.length) {
          this.showChoice(dialog, node);
          EventBus.emit(DialogEvents.DialogChoiceRequired, dialog, node);
        } else {
          if (dUI?.hideChoices) dUI.hideChoices();
          this.maybeScheduleAutoAdvance(node);
        }
      } else {
        // 不是同一类型：使用完整渲染流程
        this.showLine(node.actor || null, text);
        const choices = node.choices?.choices || [];
        if (choices.length) {
          this.showChoice(dialog, node);
          EventBus.emit(DialogEvents.DialogChoiceRequired, dialog, node);
        } else {
          const dUI2 = this._dialogUIInstance as any;
          if (dUI2?.hideChoices) dUI2.hideChoices();
          this.maybeScheduleAutoAdvance(node);
        }
      }
      EventBus.emit(DialogEvents.ActorSpoken, node.actor?.id, text);
      return;
    }

  }

  private maybeScheduleAutoAdvance(node: DialogNode): void {
    try {
      if (!node) return;
      const choicesLen = (node.choices?.choices || []).length;
      if (choicesLen > 0) return;
      // 仅在明确标记为 auto 时才自动前进
      if (node.nextType !== DialogNodeNextType.Auto) return;
      if (this._autoAdvanceCallback) {
        this.unschedule(this._autoAdvanceCallback as any);
        this._autoAdvanceCallback = null;
      }
      const ui: any = this._dialogUIInstance;
      const typewriterSpeed: number = Number(ui?.typewriterSpeed) || 0.05;
      const text: string = String(node.content?.text || "");
      const hasTypewriter = !!(
        node.content?.textAnimation === AnimationType.TypeWriter
      );
      let delay = 0;
      if (node.autoDuration && node.autoDuration > 0) {
        delay = node.autoDuration;
      } else if (hasTypewriter) {
        delay = Math.max(0, text.length * typewriterSpeed) + 0.05;
      } else {
        delay = 0.1;
      }
      this._autoAdvanceCallback = () => {
        EventBus.emit(DialogEvents.DialogNextRequested);
      };
      this.scheduleOnce(this._autoAdvanceCallback as any, delay);
    } catch { }
  }

  private onQuestAccepted(quest: any): void {
    this.showQuestNotification(quest, "accepted");
  }

  private onQuestCompleted(quest: any): void {
    this.showQuestNotification(quest, "completed");
  }

  private showQuestNotification(
    quest: any,
    status: "accepted" | "completed"
  ): void {

    const spawn = (prefab: Prefab) => {
      const node = instantiate(prefab);
      node.setParent(this.uiRoot);
      const ui = node.getComponent(QuestNotificationUI);
      ui?.show(quest, status);
    };
    if (!this.questNotificationPrefab) {
      this.loadPrefabFromMainBundle(
        "dialogue-system/prefabs/QuestNotificationUI/QuestNotificationUI",
        (prefab) => {
          this.questNotificationPrefab = prefab;
          spawn(prefab);
        }
      );
      return;
    }
    spawn(this.questNotificationPrefab);
  }

  private onAchievementUnlocked(achievement: any): void {
    const spawn = (prefab: Prefab) => {
      const node = instantiate(prefab);
      node.setParent(this.uiRoot);
      const ui = node.getComponent(AchievementNotificationUI);
      ui?.show(achievement);
    };
    if (!this.achievementNotificationPrefab) {
      this.loadPrefabFromMainBundle(
        "dialogue-system/prefabs/AchievementNotificationUI/AchievementNotificationUI",
        (prefab) => {
          this.achievementNotificationPrefab = prefab;
          spawn(prefab);
        }
      );
      return;
    }
    spawn(this.achievementNotificationPrefab);
  }

  public get dialogUI(): any | null {
    return this._dialogUIInstance;
  }
}

export default DialogUIManager;

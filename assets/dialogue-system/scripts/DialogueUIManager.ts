import {
  _decorator,
  Node,
  Prefab,
  instantiate,
  assetManager,
  Component,
} from "cc";
import EventBus from "db://assets/hunter/utils/event-bus";
import { getPersistUICanvas } from "db://assets/hunter-ui/ui-utils";
import {
  DialogueEvents,
  DialogueNodeType,
  AnimationType,
  DialogueNodeNextType,
  QuestEvents,
  AchievementEvents,
} from "../type";
import { Dialogue } from "./entities/Dialogue";
import { DialogueNode } from "./entities/DialogueNode";
import { Actor } from "./entities/Actor";

const { ccclass } = _decorator;

/**
 * Bundle 和 Prefab 路径配置
 */
const DIALOGUE_BUNDLE_NAME = "dialogue-system";
const DIALOGUE_UI_PREFAB_PATH = "prefabs/DialogueUI/DialogueUI";
const QUEST_NOTIFICATION_PREFAB_PATH = "prefabs/QuestNotificationUI/QuestNotificationUI";
const ACHIEVEMENT_NOTIFICATION_PREFAB_PATH = "prefabs/AchievementNotificationUI/AchievementNotificationUI";

/**
 * DialogueUIManager（纯逻辑类，无需挂载到节点）
 * 
 * 使用方式：
 * ```typescript
 * import { initDialogueUIManager } from 'db://assets/dialogue-system/scripts/DialogueUIManager';
 * 
 * // 初始化（通常在 Loading 场景中调用）
 * await initDialogueUIManager();
 * ```
 */
@ccclass("DialogueUIManager")
export class DialogueUIManager {
  private static _instance: DialogueUIManager | null = null;

  private _dialogUIPrefab: Prefab | null = null;
  private _questNotificationPrefab: Prefab | null = null;
  private _achievementNotificationPrefab: Prefab | null = null;
  private _containerNode: Node | null = null;
  private _dialogUIInstance: any | null = null;
  private _isInitialized: boolean = false;
  private _initPromise: Promise<void> | null = null;
  private _registered: boolean = false;
  private _lastNode: DialogueNode | null = null;
  private _scheduler: Component | null = null;
  private _autoAdvanceCallback: (() => void) | null = null;

  private constructor() { }

  public static get instance(): DialogueUIManager {
    if (!DialogueUIManager._instance) {
      DialogueUIManager._instance = new DialogueUIManager();
    }
    return DialogueUIManager._instance;
  }

  /**
   * 初始化 DialogueUIManager
   * 加载所有需要的 prefab 并创建容器节点
   */
  public async init(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this._doInit();
    return this._initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      // 并行加载所有 prefab
      const [dialoguePrefab, questPrefab, achievementPrefab] = await Promise.all([
        this.loadPrefab(DIALOGUE_BUNDLE_NAME, DIALOGUE_UI_PREFAB_PATH),
        this.loadPrefab(DIALOGUE_BUNDLE_NAME, QUEST_NOTIFICATION_PREFAB_PATH),
        this.loadPrefab(DIALOGUE_BUNDLE_NAME, ACHIEVEMENT_NOTIFICATION_PREFAB_PATH),
      ]);

      this._dialogUIPrefab = dialoguePrefab;
      this._questNotificationPrefab = questPrefab;
      this._achievementNotificationPrefab = achievementPrefab;

      if (!this._dialogUIPrefab) {
        console.error("[DialogueUIManager] Failed to load DialogueUI prefab");
        return;
      }

      // 创建容器节点
      this._containerNode = new Node("DialogueUIContainer");
      const canvas = getPersistUICanvas();
      canvas.node.addChild(this._containerNode);

      // 创建一个辅助组件用于 schedule
      this._scheduler = this._containerNode.addComponent(Component);

      // 注册事件监听
      this.registerEventListeners();

      this._isInitialized = true;
      console.log("[DialogueUIManager] Initialized successfully");
    } catch (error) {
      console.error("[DialogueUIManager] Init failed:", error);
      this._initPromise = null;
    }
  }

  private loadPrefab(bundleName: string, prefabPath: string): Promise<Prefab | null> {
    return new Promise((resolve) => {
      let bundle = assetManager.getBundle(bundleName);

      const loadFromBundle = (b: ReturnType<typeof assetManager.getBundle>) => {
        b!.load(prefabPath, Prefab, (err, prefab) => {
          if (err || !prefab) {
            console.error(`[DialogueUIManager] Failed to load prefab: ${prefabPath}`, err);
            resolve(null);
            return;
          }
          resolve(prefab);
        });
      };

      if (!bundle) {
        assetManager.loadBundle(bundleName, (err, loadedBundle) => {
          if (err || !loadedBundle) {
            console.error(`[DialogueUIManager] Failed to load bundle: ${bundleName}`, err);
            resolve(null);
            return;
          }
          loadFromBundle(loadedBundle);
        });
      } else {
        loadFromBundle(bundle);
      }
    });
  }

  private registerEventListeners(): void {
    if (this._registered) return;
    console.log("[DialogueUIManager] Registering event listeners");

    EventBus.on(QuestEvents.QuestAccepted, this.onQuestAccepted.bind(this));
    EventBus.on(QuestEvents.QuestCompleted, this.onQuestCompleted.bind(this));
    EventBus.on(AchievementEvents.AchievementUnlocked, this.onAchievementUnlocked.bind(this));
    EventBus.on(DialogueEvents.DialogueStart, this.onDialogueStart.bind(this));
    EventBus.on(DialogueEvents.DialogueNodeEnter, this.onDialogueNodeEnter.bind(this));
    EventBus.on(DialogueEvents.DialogueEnd, this.onDialogueEnd.bind(this));
    EventBus.on(DialogueEvents.DialoguePaused, this.onDialogueEnd.bind(this));

    this._registered = true;
    console.log("[DialogueUIManager] Event listeners registered");
  }

  private unregisterEventListeners(): void {
    if (!this._registered) return;

    EventBus.off(QuestEvents.QuestAccepted);
    EventBus.off(QuestEvents.QuestCompleted);
    EventBus.off(AchievementEvents.AchievementUnlocked);
    EventBus.off(DialogueEvents.DialogueStart);
    EventBus.off(DialogueEvents.DialogueNodeEnter);
    EventBus.off(DialogueEvents.DialogueEnd);
    EventBus.off(DialogueEvents.DialoguePaused);

    this._registered = false;
  }

  // ==================== 对话 UI ====================

  private onDialogueStart(dialog: Dialogue): void {
    console.log("[DialogueUIManager] onDialogueStart received, dialog:", dialog);
    this.ensureDialogueUI();
  }

  private onDialogueEnd(dialog: Dialogue): void {
    if (this._dialogUIInstance) {
      this._dialogUIInstance.hide();
    }
  }

  private onDialogueNodeEnter(dialog: Dialogue, node: DialogueNode): void {
    console.log("[DialogueUIManager] onDialogueNodeEnter received, node:", node);
    this.ensureDialogueUI();
    const prev = this._lastNode;
    this._dialogUIInstance?.setCurrentNode(node);
    try {
      this.renderNodeInternal(dialog, node, prev || null);
    } catch (e) {
      console.error("[DialogueUIManager] renderNodeInternal error:", e);
    }
    this._lastNode = node;
  }

  private ensureDialogueUI(): void {
    console.log("[DialogueUIManager] ensureDialogueUI called");
    console.log("[DialogueUIManager] _dialogUIInstance:", this._dialogUIInstance);
    console.log("[DialogueUIManager] _dialogUIPrefab:", this._dialogUIPrefab);
    console.log("[DialogueUIManager] _containerNode:", this._containerNode);

    if (!this._dialogUIInstance && this._dialogUIPrefab && this._containerNode) {
      console.log("[DialogueUIManager] Creating new DialogueUI instance");
      const node = instantiate(this._dialogUIPrefab);
      node.setParent(this._containerNode);
      const comps = (node.getComponents(Component) as any[]).filter(c => c != null);
      console.log("[DialogueUIManager] Components found:", comps.map(c => c.constructor?.name));
      this._dialogUIInstance = comps.find((c) => typeof c.renderLineWithActor === "function") || null;
      console.log("[DialogueUIManager] DialogueUI instance:", this._dialogUIInstance);
      this._dialogUIInstance?.show();
      return;
    }
    if (this._dialogUIInstance && !this._dialogUIInstance.node.active) {
      console.log("[DialogueUIManager] Reactivating existing DialogueUI instance");
      this._dialogUIInstance.node.active = true;
    }
  }

  private renderNodeInternal(dialog: Dialogue, node: DialogueNode, prev?: DialogueNode | null): void {
    if (!this._dialogUIInstance || !node) return;

    if (node.type === DialogueNodeType.SystemBlack) {
      const prevSameType = !!prev && prev.type === DialogueNodeType.SystemBlack;
      if (prevSameType) {
        (this._dialogUIInstance as any)?.updateSystemBlackContent(node.content);
      } else {
        (this._dialogUIInstance as any)?.applyScreenEffect("black");
        (this._dialogUIInstance as any)?.showSystemBlackContent(node.content);
      }
      EventBus.emit(DialogueEvents.DialogueScreenChange, "black");
      const choices = node.choices?.choices || [];
      if (choices.length) {
        this.showSystemChoice("black", node);
        EventBus.emit(DialogueEvents.DialogueChoiceRequired, dialog, node);
      } else {
        (this._dialogUIInstance as any)?.hideSystemChoices?.("black");
        this.maybeScheduleAutoAdvance(node);
      }
      return;
    }

    if (node.type === DialogueNodeType.SystemTransparent) {
      const prevSameType = !!prev && prev.type === DialogueNodeType.SystemTransparent;
      if (prevSameType) {
        (this._dialogUIInstance as any)?.updateSystemTransparentContent(node.content);
      } else {
        (this._dialogUIInstance as any)?.showSystemTransparentContent(node.content);
      }
      const choices = node.choices?.choices || [];
      if (choices.length) {
        this.showSystemChoice("transparent", node);
        EventBus.emit(DialogueEvents.DialogueChoiceRequired, dialog, node);
      } else {
        (this._dialogUIInstance as any)?.hideSystemChoices?.("transparent");
        this.maybeScheduleAutoAdvance(node);
      }
      return;
    }

    if (node.type === DialogueNodeType.Talk) {
      const content = node.content || ({} as any);
      const text = content?.text || "";
      const dUI = this._dialogUIInstance as any;
      const prevSameType = !!prev && prev.type === DialogueNodeType.Talk;

      if (prevSameType) {
        const prevActorId = prev?.actor ? prev.actor.id ?? prev.actor.name : null;
        const currActorId = node?.actor ? node.actor.id ?? node.actor.name : null;
        const isSameActor = prevActorId !== null && currActorId !== null && prevActorId === currActorId;

        if (isSameActor) {
          dUI?.setContent({
            text,
            image: content?.image,
            textAnimation: content?.textAnimation === AnimationType.TypeWriter ? "typeWriter" : undefined,
            imageAnimation: content?.imageAnimation === AnimationType.FadeInOut ? "fadeInOut" : undefined,
          });
        } else {
          dUI?.showTalkPanel?.();
          dUI?.updateActor(node.actor || null, true);
          dUI?.setContent({
            text,
            image: content?.image,
            textAnimation: content?.textAnimation === AnimationType.TypeWriter ? "typeWriter" : undefined,
            imageAnimation: content?.imageAnimation === AnimationType.FadeInOut ? "fadeInOut" : undefined,
          });
        }
      } else {
        this.showLine(node.actor || null, text);
      }

      const choices = node.choices?.choices || [];
      if (choices.length) {
        this.showChoice(dialog, node);
        EventBus.emit(DialogueEvents.DialogueChoiceRequired, dialog, node);
      } else {
        (this._dialogUIInstance as any)?.hideChoices?.();
        this.maybeScheduleAutoAdvance(node);
      }
      EventBus.emit(DialogueEvents.ActorSpoken, node.actor?.id, text);
      return;
    }
  }

  public showLine(actor: Actor | null, content: string): void {
    this._dialogUIInstance?.renderLineWithActor(actor || null, content);
  }

  public showChoice(dialog: Dialogue, node: DialogueNode): void {
    const prompt = node.content?.text || "";
    const list = node.choices?.choices || [];
    const layout = node.choices?.layout || "vertical";
    (this._dialogUIInstance as any)?.renderChoices(prompt, list, layout);
  }

  public showSystemChoice(effect: "black" | "transparent", node: DialogueNode): void {
    const prompt = node.content?.text || "";
    const list = node.choices?.choices || [];
    const layout = node.choices?.layout || "vertical";
    (this._dialogUIInstance as any)?.renderSystemChoices(effect, prompt, list, layout);
  }

  private maybeScheduleAutoAdvance(node: DialogueNode): void {
    if (!node || !this._scheduler) return;
    const choicesLen = (node.choices?.choices || []).length;
    if (choicesLen > 0) return;
    if (node.nextType !== DialogueNodeNextType.Auto) return;

    if (this._autoAdvanceCallback) {
      this._scheduler.unschedule(this._autoAdvanceCallback as any);
      this._autoAdvanceCallback = null;
    }

    const ui: any = this._dialogUIInstance;
    const typewriterSpeed: number = Number(ui?.typewriterSpeed) || 0.05;
    const text: string = String(node.content?.text || "");
    const hasTypewriter = node.content?.textAnimation === AnimationType.TypeWriter;
    let delay = 0;

    if (node.autoDuration && node.autoDuration > 0) {
      delay = node.autoDuration;
    } else if (hasTypewriter) {
      delay = Math.max(0, text.length * typewriterSpeed) + 0.05;
    } else {
      delay = 0.1;
    }

    this._autoAdvanceCallback = () => {
      EventBus.emit(DialogueEvents.DialogueNextRequested);
    };
    this._scheduler.scheduleOnce(this._autoAdvanceCallback as any, delay);
  }

  // ==================== 任务通知 ====================

  private onQuestAccepted(quest: any): void {
    this.showQuestNotification(quest, "accepted");
  }

  private onQuestCompleted(quest: any): void {
    this.showQuestNotification(quest, "completed");
  }

  private showQuestNotification(quest: any, status: "accepted" | "completed"): void {
    if (!this._questNotificationPrefab || !this._containerNode) {
      console.warn("[DialogueUIManager] Quest notification prefab not loaded");
      return;
    }

    const node = instantiate(this._questNotificationPrefab);
    node.setParent(this._containerNode);
    const ui = node.getComponents(Component).find((c: any) => typeof c.show === "function") as any;
    ui?.show(quest, status);
  }

  // ==================== 成就通知 ====================

  private onAchievementUnlocked(achievement: any): void {
    if (!this._achievementNotificationPrefab || !this._containerNode) {
      console.warn("[DialogueUIManager] Achievement notification prefab not loaded");
      return;
    }

    const node = instantiate(this._achievementNotificationPrefab);
    node.setParent(this._containerNode);
    const ui = node.getComponents(Component).find((c: any) => typeof c.show === "function") as any;
    ui?.show(achievement);
  }

  // ==================== 公共属性和方法 ====================

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get dialogUI(): any | null {
    return this._dialogUIInstance;
  }

  public destroy(): void {
    this.unregisterEventListeners();
    if (this._containerNode) {
      this._containerNode.destroy();
      this._containerNode = null;
    }
    this._dialogUIPrefab = null;
    this._questNotificationPrefab = null;
    this._achievementNotificationPrefab = null;
    this._dialogUIInstance = null;
    this._isInitialized = false;
    this._initPromise = null;
    DialogueUIManager._instance = null;
  }
}

// ========== 便捷导出方法 ==========

/**
 * 初始化 DialogueUIManager
 */
export async function initDialogueUIManager(): Promise<void> {
  return DialogueUIManager.instance.init();
}

export default DialogueUIManager;
